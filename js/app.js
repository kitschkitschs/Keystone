// app.js: the screen itself. Moves between pages, and connects the menu's
// buttons to db.js (saving), sync.js and reminders.js.

// How long after the last save the backup reminder appears.
const BACKUP_REMINDER_DAYS = 7;

const $ = (id) => document.getElementById(id);

// --- Small helpers ---

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// Folded sections are remembered on this phone only.
function isFolded(key) {
  try { return localStorage.getItem(`keystone-folded-${key}`) === '1'; } catch { return false; }
}
function rememberFolded(key, folded) {
  try { localStorage.setItem(`keystone-folded-${key}`, folded ? '1' : '0'); } catch { /* not important */ }
}

// --- The page's fixed pieces: menu buttons and bottom bar ---

for (const button of document.querySelectorAll('.open-menu')) button.innerHTML = menuIcon + '<span class="menu-dot" hidden></span>';
document.addEventListener('click', (event) => {
  if (event.target.closest('.open-menu')) openMenu();
});

// Words for now, until the real icons are drawn.
const BAR = [['Room', 'home'], ['Insight', 'insight']];
$('bar-buttons').innerHTML = BAR.map(([name, view]) =>
  `<button type="button" class="bar-word"${view ? ` data-view="${view}"` : ` aria-label="${name} (coming later)"`}>${name}</button>`).join('');
$('bar-buttons').addEventListener('click', (event) => {
  const button = event.target.closest('[data-view]');
  if (button) goTo(button.dataset.view);
});

// --- The shared sheet, for small forms opened by any page ---
// open(title, html, onSubmit): onSubmit gets the form; return false to keep the sheet open.

const sheet = $('sheet');
const sheetForm = $('sheet-form');
let sheetSubmit = null;
function openSheet(title, html, onSubmit, saveWord = 'Save') {
  sheetForm.innerHTML = `<h2 tabindex="-1" autofocus>${title}</h2>${html}
    <div class="sheet-buttons"><span class="spacer"></span>
      <button class="text-button" type="button" data-close>Cancel</button>
      <button class="ink-button" type="submit">${saveWord}</button></div>`;
  sheetSubmit = onSubmit;
  // Sheets opened from the room look like the game's windows.
  sheet.classList.toggle('game-window', currentView() === 'home');
  // A sheet can open the next one straight from its own Save.
  if (!sheet.open) sheet.showModal();
}
sheetForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (sheetSubmit && (await sheetSubmit(sheetForm, event.submitter)) === false) return;
  sheet.close();
});
sheetForm.addEventListener('click', (event) => {
  if (event.target.closest('[data-close]')) sheet.close();
});

// A colour picker for a sheet: the palette's swatches plus "your own colour".
function colourPicker(current) {
  return `<div class="swatches" role="radiogroup" aria-label="Colour">${PALETTE.map((c) => `<button type="button" data-colour="${c}" style="background: ${c}" aria-pressed="${c === current}" aria-label="${c}"></button>`).join('')}</div>
    <label class="own-colour"><input type="color" name="colour" value="${current || PALETTE[0]}"> or pick your own colour</label>`;
}
sheetForm.addEventListener('click', (event) => {
  const swatch = event.target.closest('[data-colour]');
  if (!swatch) return;
  sheetForm.elements.colour.value = swatch.dataset.colour.toLowerCase();
  for (const b of sheetForm.querySelectorAll('[data-colour]')) b.setAttribute('aria-pressed', b === swatch);
});
sheetForm.addEventListener('input', (event) => {
  if (event.target.name === 'colour') for (const b of sheetForm.querySelectorAll('[data-colour]')) b.setAttribute('aria-pressed', 'false');
});

// --- Moving between pages ---
// Each page has its own place in the phone's history (#health, #insight...), so the back button works.

function currentView() {
  const hash = location.hash.slice(1);
  if (hash.startsWith('insight')) return 'insight';
  return ['room-add', 'pieces', 'draw', 'cat', 'colours'].includes(hash) ? hash : 'home';
}

function showView() {
  const view = currentView();
  $('room').hidden = view !== 'home';
  $('room-add').hidden = view !== 'room-add';
  $('pieces').hidden = view !== 'pieces';
  $('draw').hidden = view !== 'draw';
  $('cat').hidden = view !== 'cat';
  $('insight').hidden = view !== 'insight';
  $('colours').hidden = view !== 'colours';
  const barView = ['room-add', 'pieces', 'draw', 'cat'].includes(view) ? 'home' : view;
  for (const button of $('bar-buttons').children) {
    if (button.dataset.view === barView) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  if (view === 'home') showRoom();
  if (view === 'room-add') showRoomAdd();
  if (view === 'pieces') showPieces();
  if (view === 'draw') showDraw();
  if (view === 'cat') showCatSetup();
  if (view === 'insight') showInsight(location.hash.slice(1));
  if (view === 'colours') showColours();
  window.scrollTo(0, 0);
}

function goTo(view) {
  if (view === 'home') {
    if (location.hash) location.hash = '';
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (currentView() !== view || location.hash !== `#${view}`) {
    location.hash = view;
  }
}

window.addEventListener('hashchange', showView);

// --- Full menu ---

function openMenu() {
  $('menu').hidden = false;
  document.body.style.overflow = 'hidden';
  // So the phone's back button closes the menu instead of leaving the app.
  history.pushState({ menu: true }, '');
}
function closeMenu() {
  $('menu').hidden = true;
  document.body.style.overflow = '';
}
$('menu-close').addEventListener('click', () => history.back());
window.addEventListener('popstate', closeMenu);

// --- Notice (reminders) ---

const reminderForm = $('reminder-form');
const reminderText = $('reminder-text');
const reminderTime = $('reminder-time');
const reminderList = $('reminder-list');
const remindersOnButton = $('reminders-on-button');
const reminderStatus = $('reminder-status');

async function showReminders() {
  reminderList.replaceChildren();
  for (const reminder of await getReminders()) {
    const li = document.createElement('li');
    const words = document.createElement('span');
    words.textContent = `${reminder.time}  ${reminder.text}`;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'text-button danger';
    remove.textContent = 'Delete';
    remove.addEventListener('click', async () => {
      await deleteItem(reminder.id);
      showReminders();
      updateReminderSender();
    });
    li.append(words, remove);
    reminderList.append(li);
  }
}

// Sends the current list of times to the reminder sender, and says how it went.
async function updateReminderSender() {
  if (!REMINDER_SENDER_URL) {
    reminderStatus.textContent = "Notice's sender isn't set up yet.";
    remindersOnButton.hidden = true;
    return;
  }
  if (!remindersSupported()) {
    reminderStatus.textContent = "This browser can't show Notice.";
    remindersOnButton.hidden = true;
    return;
  }
  try {
    const on = await sendSchedule();
    reminderStatus.textContent = on
      ? 'Notice is on for this phone.'
      : 'Notice is off for this phone.';
    remindersOnButton.hidden = on;
  } catch (error) {
    reminderStatus.textContent = `Couldn't reach Notice's sender: ${error.message}`;
  }
}

reminderForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const text = reminderText.value.trim();
  if (!text || !reminderTime.value) return;
  await addReminder(text, reminderTime.value);
  reminderText.value = '';
  reminderTime.value = '';
  showReminders();
  updateReminderSender();
});

remindersOnButton.addEventListener('click', async () => {
  reminderStatus.textContent = '';
  try {
    await turnOnReminders();
  } catch (error) {
    reminderStatus.textContent = `Couldn't turn on Notice: ${error.message}`;
    return;
  }
  updateReminderSender();
});

// --- Save and load ---

const syncStatus = $('sync-status');
const loadInput = $('load-input');

$('save-button').addEventListener('click', async () => {
  syncStatus.textContent = '';
  if (sampleMode) {
    syncStatus.textContent = 'Turn sample data off first, so your backup holds your own days.';
    return;
  }
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
  if (sampleMode) {
    syncStatus.textContent = 'Turn sample data off first, so the file loads into your own days.';
    loadInput.value = '';
    return;
  }
  try {
    const changed = await loadBackup(file);
    syncStatus.textContent = `Loaded ${file.name}. ${changed} item(s) added or updated.`;
    await movePaletteColours();
  } catch (error) {
    syncStatus.textContent = `Couldn't load: ${error.message}`;
  }
  loadInput.value = ''; // so the same file can be picked again
  showView();
  showReminders();
  updateReminderSender();
});

// --- Backup reminder ---

async function showBackupInfo() {
  const savedAt = await getMeta('lastSavedAt');
  $('last-saved').textContent = savedAt
    ? `Last saved: ${new Date(savedAt).toLocaleString()}`
    : 'Not saved yet.';

  const hasData = (await getAllItems()).length > 0;
  const daysSince = savedAt ? (Date.now() - savedAt) / 86400000 : Infinity;
  const due = hasData && daysSince >= BACKUP_REMINDER_DAYS;
  const reminder = $('backup-reminder');
  reminder.textContent = savedAt
    ? `It's been ${Math.floor(daysSince)} days since your last backup.`
    : "You haven't saved a backup yet.";
  reminder.hidden = !due;
  // A small dot on the menu button, so the reminder doesn't crowd the front page.
  for (const dot of document.querySelectorAll('.menu-dot')) dot.hidden = !due;
}

// --- Sample data ---

$('sample-button').textContent = sampleMode ? 'Back to my own data' : 'Show sample data';
$('sample-button').addEventListener('click', () => {
  try { localStorage.setItem('keystone-sample', sampleMode ? '0' : '1'); } catch { return; }
  location.hash = '';
  location.reload();
});

// --- Dark mode (see look.js) ---

$('dark-button').textContent = darkMode ? 'Turn dark mode off' : 'Turn dark mode on';
$('dark-button').addEventListener('click', () => {
  try { localStorage.setItem('keystone-dark', darkMode ? '0' : '1'); } catch { return; }
  location.reload();
});

// --- Keeping data safe ---

// Asks Chrome not to clear this app's storage when the phone runs low on space.
// Chrome decides by itself; installing the app to the home screen helps.
async function askForPersistentStorage() {
  const status = $('storage-status');
  if (!navigator.storage || !navigator.storage.persist) {
    status.textContent = 'Storage protection: not available in this browser.';
    return;
  }
  const persisted = (await navigator.storage.persisted()) || (await navigator.storage.persist());
  status.textContent = persisted
    ? 'Storage protection: on.'
    : 'Storage protection: not granted yet, so keep saving backups.';
}

// --- Offline ---

// The service worker (sw.js) keeps a copy of the app so it opens offline.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}

// --- Start ---
// Waits until every script has loaded, since the pages live in their own files.

document.addEventListener('DOMContentLoaded', async () => {
  await movePaletteColours();
  showView();
  showBackupInfo();
  showReminders();
  updateReminderSender();
  askForPersistentStorage();
});

// When you come back to the app, refresh in case the day has changed.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && currentView() === 'home') showBackupInfo();
});
