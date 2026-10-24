// app.js: the screen itself. Draws the front page and connects the buttons
// to db.js (saving), plan.js (the day's tasks), sync.js and reminders.js.

// How long after the last save the backup reminder appears.
const BACKUP_REMINDER_DAYS = 7;

const $ = (id) => document.getElementById(id);

// --- Small helpers ---

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function ordinal(n) {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return n + ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
}

// Week number, counted the usual European way (weeks start on Monday).
function weekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
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
$('health-edit-button').innerHTML = pencilIcon;
document.addEventListener('click', (event) => {
  if (event.target.closest('.open-menu')) openMenu();
});

// Words for now, until the real icons are drawn.
const BAR = [['Health', 'health'], ['Insight', 'insight'], ['Home', 'home'], ['Hobby', ''], ['Journal', '']];
$('bar-buttons').innerHTML = BAR.map(([name, view]) =>
  `<button type="button" class="bar-word"${view ? ` data-view="${view}"` : ` aria-label="${name} (coming later)"`}>${name}</button>`).join('');
$('bar-buttons').addEventListener('click', (event) => {
  const button = event.target.closest('[data-view]');
  if (button) goTo(button.dataset.view);
});

// --- Today's feelings, shared by the front page and the Health page ---

// The feelings picked on a day, as [family, word] pairs, in the order they were picked.
async function getFeelings(day) {
  const words = new Map();
  for (const [family, list] of EMOTION_FAMILIES) for (const word of list) words.set(word, family);
  return (await getItemsForDay(day))
    .filter((item) => item.kind === 'health' && item.key.startsWith('feel/') && item.value === true)
    .sort((a, b) => a.updatedAt - b.updatedAt)
    .map((item) => [words.get(item.key.slice(5)), item.key.slice(5)])
    .filter(([family]) => family);
}

// Paints the field; with no feelings yet it stays a quiet grey with ink text.
function showField(canvas, picks) {
  canvas.closest('.field-head').classList.toggle('quiet', picks.length === 0);
  drawEmotionField(canvas, picks);
}

// --- Date and the day's ring ---

function showDate(date) {
  const month = date.toLocaleDateString('en-GB', { month: 'long' });
  $('date-line').textContent = `${month} ${ordinal(date.getDate())} · week ${weekNumber(date)}`;
  $('weekday').textContent = date.toLocaleDateString('en-GB', { weekday: 'long' });
}

// A ring that fills as the day's plan gets done.
function showDayRing(tasks) {
  const done = tasks.filter((t) => t.done).length;
  const share = tasks.length ? done / tasks.length : 0;
  const r = 24;
  const length = 2 * Math.PI * r;
  $('day-ring').innerHTML = `<svg width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="${done} of ${tasks.length} done">
    <circle cx="32" cy="32" r="${r}" fill="none" stroke="currentColor" stroke-opacity="0.3" stroke-width="5"/>
    <circle cx="32" cy="32" r="${r}" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"
      stroke-dasharray="${(share * length).toFixed(1)} ${length.toFixed(1)}" transform="rotate(-90 32 32)"${share ? '' : ' stroke-opacity="0"'}/>
    <text x="32" y="36.5" text-anchor="middle" font-family="Lora, serif" font-size="14" fill="currentColor">${done}/${tasks.length}</text></svg>`;
}

// --- The day's plan ---

let currentDay = todayKey();
let budDay = false; // a bud day shows its own list, in black and white

const tickIcon = '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7.4l2.6 2.6L11 4.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function taskRow(task) {
  const habit = task.day === '';
  const state = task.done ? 'done' : task.skipped ? 'skip' : '';
  const word = { done: 'done', skip: 'skipped', '': 'not done' }[state];
  return `<li class="task${task.done ? ' done' : ''}${task.skipped ? ' skipped' : ''}">
    <button class="task-words" type="button" data-edit="${task.id}" aria-label="Change: ${escapeHtml(task.text)}">
      <span class="task-text">${escapeHtml(task.text)}</span>
      ${task.note ? `<span class="task-note">${escapeHtml(task.note)}</span>` : ''}
      ${task.skipped ? '<span class="task-habit">skipped today</span>' : ''}
    </button>
    <button class="tick" type="button" role="checkbox" aria-checked="${task.done}" data-state="${state}"
      aria-label="${escapeHtml(task.text)}: ${word}${habit ? '. Tap again to skip.' : ''}" data-tick="${task.id}">
      <span class="tick-mark">${task.done ? tickIcon : ''}</span>
    </button>
  </li>`;
}

let planTasks = [];

async function showPlan() {
  const day = todayKey();
  currentDay = day;
  showDate(new Date());
  budDay = await isBudDay(day);
  showBudLook();
  planTasks = await getPlan(day, budDay ? 'bud' : '');
  showField($('front-field'), await getFeelings(day));
  showDayRing(planTasks);

  $('plan').innerHTML = PARTS.map((part) => {
    const tasks = planTasks.filter((t) => t.part === part.key);
    const done = tasks.filter((t) => t.done).length;
    return `<details class="part" data-part="${part.key}"${isFolded(part.key) ? '' : ' open'}>
      <summary>
        <span class="part-name">${part.name}</span>
        <span class="part-count">${tasks.length ? `${done} of ${tasks.length}` : ''}</span>
        ${chevron}
      </summary>
      <ul class="tasks">${tasks.map(taskRow).join('')}</ul>
      <button class="add-line" type="button" data-add="${part.key}">${plus}<span>add a task</span></button>
    </details>`;
  }).join('');

  for (const details of $('plan').querySelectorAll('details')) {
    details.addEventListener('toggle', () => rememberFolded(details.dataset.part, !details.open));
  }
}

$('plan').addEventListener('click', async (event) => {
  const tick = event.target.closest('[data-tick]');
  const edit = event.target.closest('[data-edit]');
  const add = event.target.closest('[data-add]');
  if (tick) {
    const task = planTasks.find((t) => t.id === tick.dataset.tick);
    if (!task) return;
    // A one-off task is done or not. A habit goes: not done, done, skipped, not done.
    const next = task.done ? (task.day === '' ? 'skip' : '') : task.skipped ? '' : 'done';
    if (navigator.vibrate) navigator.vibrate(next === 'done' ? 12 : 5);
    await setTicked(task, currentDay, next);
    showPlan();
    showBackupInfo();
  } else if (edit) {
    openTaskSheet(planTasks.find((t) => t.id === edit.dataset.edit));
  } else if (add) {
    openTaskSheet(null, add.dataset.add);
  }
});

// --- Bud mode ---
// The bud button makes today a bud day: a separate, gentler list, and the
// whole page in black and white. Tapping it again goes back to the usual list.

const budIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21v-8"/><path d="M12 13c-3.2 0-5-2.4-5-5.6C9.4 7.4 11 8.6 12 10c1-1.4 2.6-2.6 5-2.6 0 3.2-1.8 5.6-5 5.6z"/><path d="M12 10c-.6-2.2-.2-4.4 1.6-6.4"/><path d="M12 17.5c-1.6-1.6-3.6-2-5.4-1.6"/></svg>';
$('bud-button').innerHTML = budIcon;

function showBudLook() {
  document.documentElement.classList.toggle('bud', budDay);
  $('bud-button').setAttribute('aria-pressed', budDay);
  document.querySelector('meta[name="theme-color"]').content = budDay ? '#121212' : COLOURS.paper;
}

$('bud-button').addEventListener('click', async () => {
  if (navigator.vibrate) navigator.vibrate(12);
  await setBudDay(currentDay, !budDay);
  showPlan();
  showBackupInfo();
});

// --- Adding, changing and deleting a task ---

const taskDialog = $('task-dialog');
const taskForm = $('task-form');
let editingTask = null;

function openTaskSheet(task, part = 'morning') {
  editingTask = task;
  $('task-dialog-title').textContent = task ? 'Change task' : 'New task';
  $('task-text').value = task ? task.text : '';
  $('task-note').value = task ? task.note || '' : '';
  const chosen = task ? task.part : part;
  for (const radio of taskForm.elements.part) radio.checked = radio.value === chosen;
  $('task-every-day').checked = task ? task.day === '' : false;
  $('task-delete').hidden = !task;
  taskDialog.showModal();
  if (!task) $('task-text').focus();
}

taskForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const text = $('task-text').value.trim();
  if (!text) return;
  const fields = {
    part: taskForm.elements.part.value || 'morning',
    text,
    note: $('task-note').value.trim(),
    everyDay: $('task-every-day').checked,
  };
  if (editingTask) await updateTask(editingTask, fields, currentDay);
  else await addTask(fields, currentDay, budDay ? 'bud' : '');
  taskDialog.close();
  showPlan();
  showBackupInfo();
});

$('task-cancel').addEventListener('click', () => taskDialog.close());

$('task-delete').addEventListener('click', async () => {
  if (!editingTask) return;
  const question = editingTask.day === ''
    ? `Delete "${editingTask.text}"? It's an every-day task, so it goes from every day.`
    : `Delete "${editingTask.text}"?`;
  if (!confirm(question)) return;
  await deleteItem(editingTask.id);
  taskDialog.close();
  showPlan();
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
  sheet.showModal();
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
  return ['health', 'health-edit', 'colours'].includes(hash) ? hash : 'home';
}

function showView() {
  const view = currentView();
  $('front').hidden = view !== 'home';
  $('health').hidden = view !== 'health';
  $('health-edit').hidden = view !== 'health-edit';
  $('insight').hidden = view !== 'insight';
  $('colours').hidden = view !== 'colours';
  const barView = view === 'health-edit' ? 'health' : view;
  for (const button of $('bar-buttons').children) {
    if (button.dataset.view === barView) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  if (view === 'home') showPlan();
  if (view === 'health') showHealth();
  if (view === 'health-edit') showHealthEdit();
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
$('sample-banner').hidden = !sampleMode;
$('sample-button').addEventListener('click', () => {
  try { localStorage.setItem('keystone-sample', sampleMode ? '0' : '1'); } catch { return; }
  location.hash = '';
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
  if (document.visibilityState === 'visible' && currentView() === 'home') {
    showPlan();
    showBackupInfo();
  }
});
