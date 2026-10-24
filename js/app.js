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
function isFolded(part) {
  try { return localStorage.getItem(`keystone-folded-${part}`) === '1'; } catch { return false; }
}
function rememberFolded(part, folded) {
  try { localStorage.setItem(`keystone-folded-${part}`, folded ? '1' : '0'); } catch { /* not important */ }
}

// --- The page's fixed pieces: bookmark and bottom bar ---

$('bookmark').innerHTML = stamp(SHAPE_BOOKMARK, { size: 190, done: 1, seed: 88 });

// Words for now; the centre is a round stamp frame. Home and Health work so far.
const BAR = ['Health', 'Calendar', 'Home', 'Hobby', 'Journal'];
$('bar-buttons').innerHTML = BAR.map((name) => name === 'Home'
  ? `<button type="button" class="bar-home" aria-label="Home" aria-current="page" data-view="home">${stamp(frameShape('circle'), { size: 40, done: 1, seed: 61 })}</button>`
  : name === 'Health'
    ? '<button type="button" class="bar-word" data-view="health">Health</button>'
    : `<button type="button" class="bar-word" aria-label="${name} (coming later)">${name}</button>`
).join('');
$('bar-buttons').addEventListener('click', (event) => {
  const view = event.target.closest('[data-view]');
  if (view && view.dataset.view === 'home') goHome();
  if (view && view.dataset.view === 'health') goHealth();
});

// --- Date and today's stamp ---

function showDate(date) {
  const month = date.toLocaleDateString('en-GB', { month: 'long' });
  $('date-line').textContent = `${month} ${ordinal(date.getDate())} · week ${weekNumber(date)}`;
  $('weekday').textContent = date.toLocaleDateString('en-GB', { weekday: 'long' });
}

// Each day gets its own frame and tilt, picked from the date, so it stays the same all day.
// The more of the day's plan is ticked off, the more of the stamp presses down; the rest is a pale ghost.
async function showDayStamp(day, tasks) {
  const done = tasks.filter((t) => t.done).length;
  const stamped = await countStampedDays();
  const box = $('day-stamp');
  if (done === 0) {
    box.innerHTML = '';
    $('fig-number').textContent = `fig. ${stamped + 1}`;
    return;
  }
  const frame = FRAME_NAMES[Math.floor(steadyRandom(day) * FRAME_NAMES.length)];
  const flower = FLOWER_NAMES[Math.floor(steadyRandom(day + 'flower') * FLOWER_NAMES.length)];
  const share = done / tasks.length;
  box.innerHTML = stamp(frameShape(frame, flower), {
    size: 92,
    done: 0.43 + 0.57 * share,
    press: share,
    from: Math.floor(steadyRandom(day + 'from') * 360),
    seed: 1 + Math.floor(steadyRandom(day + 'seed') * 900),
    rot: Math.round((steadyRandom(day + 'tilt') - 0.5) * 8),
    label: `Today's stamp, ${done} of ${tasks.length} done`,
  });
  $('fig-number').textContent = `fig. ${stamped}`;
}

// --- The day's plan ---

let currentDay = todayKey();
let budDay = false; // a bud day shows its own list, in black and white
let justPressed = null; // the task whose stamp should land with a little press

const chevron = '<svg class="chev" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 5l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const plus = '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';

// The inky line through a ticked task. Each task gets its own wobble.
function strikeLine(task) {
  const r = (k) => Math.floor(steadyRandom(task.id + k) * 6);
  const k = r('ink') % 3;
  return `<svg class="strike" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">` +
    `<path d="M-1 ${52 + r('a')} C20 ${44 + r('b')} 45 ${58 - r('c')} 70 ${49 + r('d')} S95 ${50 + r('e')} 102 ${47 + r('f')}" ` +
    `fill="none" stroke="currentColor" stroke-width="${(2.7 + steadyRandom(task.id) * 0.5).toFixed(2)}" stroke-linecap="round" ` +
    `vector-effect="non-scaling-stroke" filter="url(#inkline${k})" opacity="0.92" style="color: var(--ink)"/></svg>`;
}

// The tick stamp: tilted and inked a little differently every time.
function tickStamp(task, day) {
  const r = (k) => steadyRandom(task.id + day + k);
  const nudge = (k) => ((r(k) - 0.5) * 4).toFixed(1);
  return `<span class="tick-stamp${justPressed === task.id ? ' pressed' : ''}" style="left: ${nudge('x')}px; top: ${nudge('y')}px">` +
    stamp(SHAPE_TICK, { size: 34, done: 0.62 + 0.38 * r('ink'), rot: Math.round((r('rot') - 0.5) * 50), seed: 100 + Math.floor(r('seed') * 900) }) +
    '</span>';
}

function taskRow(task, day) {
  return `<li class="task${task.done ? ' done' : ''}">
    <button class="task-words" type="button" data-edit="${task.id}" aria-label="Change: ${escapeHtml(task.text)}">
      <span class="task-text">${escapeHtml(task.text)}${task.done ? strikeLine(task) : ''}</span>
      ${task.note ? `<span class="task-note">${escapeHtml(task.note)}</span>` : ''}
    </button>
    <button class="tick" type="button" role="checkbox" aria-checked="${task.done}" aria-label="Done: ${escapeHtml(task.text)}" data-tick="${task.id}">
      <span class="tick-box">${task.done ? tickStamp(task, day) : ''}</span>
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

  $('plan').innerHTML = PARTS.map((part) => {
    const tasks = planTasks.filter((t) => t.part === part.key);
    const done = tasks.filter((t) => t.done).length;
    return `<details class="part" data-part="${part.key}"${isFolded(part.key) ? '' : ' open'}>
      <summary>
        <span class="part-name">${part.name}</span>
        <span class="part-count">${tasks.length ? `${done} of ${tasks.length}` : ''}</span>
        ${chevron}
      </summary>
      <ul class="tasks">${tasks.map((t) => taskRow(t, day)).join('')}</ul>
      <button class="add-line" type="button" data-add="${part.key}">${plus}<span>add a task</span></button>
    </details>`;
  }).join('');

  for (const details of $('plan').querySelectorAll('details')) {
    details.addEventListener('toggle', () => rememberFolded(details.dataset.part, !details.open));
  }
  justPressed = null;
  await showDayStamp(day, planTasks);
}

$('plan').addEventListener('click', async (event) => {
  const tick = event.target.closest('[data-tick]');
  const edit = event.target.closest('[data-edit]');
  const add = event.target.closest('[data-add]');
  if (tick) {
    const task = planTasks.find((t) => t.id === tick.dataset.tick);
    if (!task) return;
    if (!task.done) justPressed = task.id;
    if (navigator.vibrate) navigator.vibrate(task.done ? 5 : 12);
    await setTicked(task, currentDay, !task.done);
    showPlan();
    showBackupInfo();
  } else if (edit) {
    openTaskSheet(planTasks.find((t) => t.id === edit.dataset.edit));
  } else if (add) {
    openTaskSheet(null, add.dataset.add);
  }
});

// --- Bud mode ---
// Tapping the bookmark makes today a bud day: a separate, gentler list, and the
// whole page in black and white. Tapping it again goes back to the usual list.

function showBudLook() {
  document.documentElement.classList.toggle('bud', budDay);
  $('bookmark-button').setAttribute('aria-pressed', budDay);
  if (typeof showThemeColour === 'function') showThemeColour(); // from colours.js, which loads after this file
}

$('bookmark-button').addEventListener('click', async () => {
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
$('menu-button').addEventListener('click', openMenu);
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
  showPlan();
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
  $('menu-dot').hidden = !due;
}

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

showPlan();
showBackupInfo();
showReminders();
updateReminderSender();
askForPersistentStorage();

// When you come back to the app, refresh in case the day has changed.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    showPlan();
    showBackupInfo();
  }
});
