// sync.js: saving a backup file and loading one back in.
//
// Save: builds a .txt file. On the phone it opens Android's share menu, so you
// can send it to Proton Drive; on a computer it's an ordinary download. Chrome blocks sharing .json files, so the file is .txt,
// even though what's inside is JSON. Each file is named by date and time,
// so every save doubles as a backup.
//
// Save game only: the same, with just the room game in it (pieces, the room and
// what's in it, the pets and their breeds). Loading it merges like any backup,
// so game changes made on the computer carry over to the phone.
//
// Load: reads a file you picked (for example from Downloads) and merges it
// into this device, item by item. The newer copy of each item wins, so an
// older file can never wipe newer data.

const FILE_FORMAT = 'keystone-backup';
const FILE_FORMAT_VERSION = 1;
const GAME_KINDS = ['piece', 'placed', 'room', 'cat', 'duck', 'breed', 'crop', 'good', 'recipe', 'plot', 'garden', 'pantry', 'kitchen'];

// "keystone-2026-10-23-1415.txt", or "keystone-game-2026-10-23-1415.txt"
function backupFileName(gameOnly, date = new Date()) {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `keystone-${gameOnly ? 'game-' : ''}${todayKey(date)}-${hh}${mm}.txt`;
}

async function buildBackupText(gameOnly) {
  const items = await getAllItems();
  const backup = {
    format: FILE_FORMAT,
    version: FILE_FORMAT_VERSION,
    savedAt: new Date().toISOString(),
    ...(gameOnly ? { part: 'game' } : {}),
    items: gameOnly ? items.filter((item) => GAME_KINDS.includes(item.kind)) : items,
  };
  return JSON.stringify(backup, null, 1);
}

// A phone or tablet, where the share menu is the way to send a file on. Computers
// can have a share menu too (Windows does), but there a plain download is better.
function onPhone() {
  if (navigator.userAgentData) return navigator.userAgentData.mobile;
  return /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
}

// Returns true if the file was shared or downloaded, false if you cancelled.
async function saveBackup(gameOnly = false) {
  const text = await buildBackupText(gameOnly);
  const name = backupFileName(gameOnly);
  const file = new File([text], name, { type: 'text/plain' });

  if (onPhone() && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
    } catch (error) {
      if (error.name === 'AbortError') return false; // share menu closed
      throw error;
    }
  } else {
    // On a computer (or with no share menu): download the file.
    const link = document.createElement('a');
    link.href = URL.createObjectURL(file);
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 10000);
  }

  // Only a whole backup counts for the "last saved" reminder.
  if (!gameOnly) await setMeta('lastSavedAt', Date.now());
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
