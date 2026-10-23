// app.js: the screen itself. Connects the buttons to db.js and sync.js.

// How long after the last save the backup reminder appears.
const BACKUP_REMINDER_DAYS = 7;

const noteForm = document.getElementById('note-form');
const noteInput = document.getElementById('note-input');
const noteList = document.getElementById('note-list');
const todayHeading = document.getElementById('today-heading');
const saveButton = document.getElementById('save-button');
const loadInput = document.getElementById('load-input');
const syncStatus = document.getElementById('sync-status');
const lastSaved = document.getElementById('last-saved');
const storageStatus = document.getElementById('storage-status');
const backupReminder = document.getElementById('backup-reminder');

// --- Today's test notes ---

async function showNotes() {
  const day = todayKey();
  todayHeading.textContent = `Today, ${day}`;
  const notes = await getItemsForDay(day);
  notes.sort((a, b) => a.createdAt - b.createdAt);

  noteList.replaceChildren();
  for (const note of notes) {
    const li = document.createElement('li');
    li.textContent = note.text + ' ';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Delete';
    remove.addEventListener('click', async () => {
      await deleteItem(note.id);
      showNotes();
    });
    li.append(remove);
    noteList.append(li);
  }
}

noteForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const text = noteInput.value.trim();
  if (!text) return;
  await putItem({ id: newId('note'), kind: 'note', day: todayKey(), text, createdAt: Date.now() });
  noteInput.value = '';
  showNotes();
  showBackupInfo();
});

// --- Save and load ---

saveButton.addEventListener('click', async () => {
  syncStatus.textContent = '';
  try {
    const saved = await saveBackup();
    syncStatus.textContent = saved ? 'Saved.' : 'Not saved.';
  } catch (error) {
    syncStatus.textContent = `Couldn't save: ${error.message}`;
  }
  showBackupInfo();
});

loadInput.addEventListener('change', async () => {
  const file = loadInput.files[0];
  if (!file) return;
  syncStatus.textContent = '';
  try {
    const changed = await loadBackup(file);
    syncStatus.textContent = `Loaded ${file.name}. ${changed} item(s) added or updated.`;
  } catch (error) {
    syncStatus.textContent = `Couldn't load: ${error.message}`;
  }
  loadInput.value = ''; // so the same file can be picked again
  showNotes();
});

// --- Backup reminder ---

async function showBackupInfo() {
  const savedAt = await getMeta('lastSavedAt');
  lastSaved.textContent = savedAt
    ? `Last saved: ${new Date(savedAt).toLocaleString()}`
    : 'Not saved yet.';

  const hasData = (await getAllItems()).length > 0;
  const daysSince = savedAt ? (Date.now() - savedAt) / 86400000 : Infinity;
  if (hasData && daysSince >= BACKUP_REMINDER_DAYS) {
    backupReminder.textContent = savedAt
      ? `It's been ${Math.floor(daysSince)} days since your last backup.`
      : "You haven't saved a backup yet.";
    backupReminder.hidden = false;
  } else {
    backupReminder.hidden = true;
  }
}

// --- Keeping data safe ---

// Asks Chrome not to clear this app's storage when the phone runs low on space.
// Chrome decides by itself; installing the app to the home screen helps.
async function askForPersistentStorage() {
  if (!navigator.storage || !navigator.storage.persist) {
    storageStatus.textContent = 'Storage protection: not available in this browser.';
    return;
  }
  const persisted = (await navigator.storage.persisted()) || (await navigator.storage.persist());
  storageStatus.textContent = persisted
    ? 'Storage protection: on.'
    : 'Storage protection: not granted yet, so keep saving backups.';
}

// --- Offline ---

// The service worker (sw.js) keeps a copy of the app so it opens offline.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}

// --- Start ---

showNotes();
showBackupInfo();
askForPersistentStorage();

// When you come back to the app, refresh in case the day has changed.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    showNotes();
    showBackupInfo();
  }
});
