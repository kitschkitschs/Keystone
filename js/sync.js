// sync.js: saving a backup file and loading one back in.
//
// Save: builds a .txt file and opens Android's share menu, so you can send it
// to Proton Drive. Chrome blocks sharing .json files, so the file is .txt,
// even though what's inside is JSON. Each file is named by date and time,
// so every save doubles as a backup.
//
// Load: reads a file you picked (for example from Downloads) and merges it
// into this device, item by item. The newer copy of each item wins, so an
// older file can never wipe newer data.

const FILE_FORMAT = 'keystone-backup';
const FILE_FORMAT_VERSION = 1;

// "keystone-2026-10-23-1415.txt"
function backupFileName(date = new Date()) {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `keystone-${todayKey(date)}-${hh}${mm}.txt`;
}

async function buildBackupText() {
  const backup = {
    format: FILE_FORMAT,
    version: FILE_FORMAT_VERSION,
    savedAt: new Date().toISOString(),
    items: await getAllItems(),
  };
  return JSON.stringify(backup, null, 1);
}

// Returns true if the file was shared or downloaded, false if you cancelled.
async function saveBackup() {
  const text = await buildBackupText();
  const name = backupFileName();
  const file = new File([text], name, { type: 'text/plain' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
    } catch (error) {
      if (error.name === 'AbortError') return false; // share menu closed
      throw error;
    }
  } else {
    // No share menu (for example on the PC): download the file instead.
    const link = document.createElement('a');
    link.href = URL.createObjectURL(file);
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 10000);
  }

  await setMeta('lastSavedAt', Date.now());
  return true;
}

// Reads a backup file and merges it. Returns how many items changed.
async function loadBackup(file) {
  const text = await file.text();

  let backup;
  try {
    backup = JSON.parse(text);
  } catch {
    throw new Error("This file isn't a Keystone backup.");
  }
  if (!backup || backup.format !== FILE_FORMAT || !Array.isArray(backup.items)) {
    throw new Error("This file isn't a Keystone backup.");
  }
  if (backup.version > FILE_FORMAT_VERSION) {
    throw new Error('This backup was made by a newer version of Keystone. Update the app first.');
  }

  const valid = backup.items.filter((item) =>
    item && typeof item.id === 'string' && typeof item.day === 'string' &&
    typeof item.updatedAt === 'number');

  return mergeItems(valid);
}
