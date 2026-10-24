// health.js: the Health page. Everything about how you are that isn't an activity:
// the main scores on top (mood, motivation, productivity, energy, sleep), then folders.
//
// The list itself (what's on the page) is saved as one item, changed on the edit
// page (health-edit.js, opened from the full menu):
//   { id: "health-list", kind: "health-list", day: "", list: { main, feelings, folders } }
//     main:     [{ id, name, scale }]                 always shown, never folded
//     feelings: [{ id, name }]                        tags under the mood score
//     folders:  [{ id, name, items, tags }]           items are scores { id, name, scale }
//                                                     or smaller folders { id, name, items, tags }
//     tags:     [{ id, name }]                        yes/no tags
// Before anything is edited, the starting list below is used.
//
// Each answer is saved as its own item for that day, under the id of what it answers:
//   { id: "health-2026-10-24-body/pain/headache", kind: "health", day: "2026-10-24",
//     key: "body/pain/headache", value: 2 }
// Scores are numbers (0 = nothing picked); tags and feelings are true or false.
// One item per answer, so answers made on two phones merge cleanly. Renaming
// something keeps its id, so its past answers stay with it.

const SCALES = {
  mood: ['', 'awful', 'bad', 'neutral', 'content', 'happy'],
  quality: ['', 'poor', 'fine', 'good'],
  symptom: ['', 'present', 'distressing', 'debilitating'],
};

const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// The starting list. Its ids are made from the names, as the first version of the page did.
function startingHealthList() {
  const feelings = ['calm', 'hopeful', 'grateful', 'proud', 'loved', 'relieved', 'excited', 'tired', 'bored',
    'restless', 'anxious', 'overwhelmed', 'irritable', 'frustrated', 'sad', 'lonely', 'numb', 'ashamed'];
  const folder = (path, name, items, tags = []) => {
    const id = path ? `${path}/${slug(name)}` : slug(name);
    return {
      id,
      name,
      items: items.map((item) => (typeof item === 'string'
        ? { id: `${id}/${slug(item)}`, name: item, scale: 'symptom' }
        : folder(id, item.name, item.items, item.tags))),
      tags: tags.map((tag) => ({ id: `${id}/tag/${slug(tag)}`, name: tag })),
    };
  };
  return {
    main: [
      { id: 'mood', name: 'Mood', scale: 'mood' },
      { id: 'motivation', name: 'Motivation', scale: 'quality' },
      { id: 'productivity', name: 'Productivity', scale: 'quality' },
      { id: 'energy', name: 'Energy', scale: 'quality' },
      { id: 'sleep', name: 'Sleep', scale: 'quality' },
    ],
    feelings: feelings.map((f) => ({ id: `feel/${slug(f)}`, name: f })),
    folders: [
      folder('', 'Body', [
        { name: 'Pain', items: ['Headache', 'Joint pain', 'Back pain', 'Cramps'] },
        { name: 'Stomach', items: ['Nausea', 'Bloating', 'No appetite'] },
        'Fatigue', 'Dizziness',
      ], ['period', 'nap', 'painkiller', 'flare-up', 'fever']),
      folder('', 'Mind', ['Brain fog', 'Anxiety', 'Low mood', 'Irritability'], ['panic attack', 'cried', 'shut down', 'overstimulated']),
      folder('', 'Day', [], ['went outside', 'saw someone', 'showered', 'cooked', 'tidied', 'rested', 'screen-free hour']),
    ],
  };
}

async function getHealthList() {
  const saved = (await getItemsForDay('')).find((item) => item.id === 'health-list');
  return saved ? saved.list : startingHealthList();
}

function saveHealthList(list) {
  return putItem({ id: 'health-list', kind: 'health-list', day: '', list });
}

// All of one day's answers, as a Map from key to value.
async function getHealthDay(day) {
  const answers = new Map();
  for (const item of await getItemsForDay(day)) {
    if (item.kind === 'health') answers.set(item.key, item.value);
  }
  return answers;
}

function setHealthAnswer(day, key, value) {
  return putItem({ id: `health-${day}-${key}`, kind: 'health', day, key, value });
}

// --- The page ---

let healthDay = todayKey();
let healthAnswers = new Map();
let healthList = startingHealthList();
let feelingsOpen = false;

// A hand-inked dot for a score: filled when picked, a faint ring when not.
let dotCount = 0;
function inkDot(on) {
  const k = dotCount++ % 3;
  return on
    ? `<svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true"><circle cx="7.5" cy="7.5" r="5.9" fill="currentColor" filter="url(#inkdot${k})" transform="rotate(${(dotCount * 47) % 360} 7.5 7.5)"/></svg>`
    : '<svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true"><circle cx="7.5" cy="7.5" r="5.3" fill="none" stroke="currentColor" stroke-opacity="0.4" stroke-width="1.1"/></svg>';
}

function rateRow(key, name, scale) {
  const words = SCALES[scale];
  const value = healthAnswers.get(key) || 0;
  const dots = words.slice(1).map((word, i) => `<button type="button" class="dot${words.length > 4 ? ' narrow' : ''}" role="radio" aria-checked="${i + 1 === value}" aria-label="${word}" data-rate="${key}" data-value="${i + 1}">${inkDot(i < value)}</button>`).join('');
  return `<li class="row">
    <span class="row-name">${escapeHtml(name)}</span>
    <span class="rate-word">${value ? words[value] : ''}</span>
    <span class="dots" role="radiogroup" aria-label="${escapeHtml(name)}">${dots}</span>
  </li>`;
}

function chip(key, word) {
  const on = healthAnswers.get(key) === true;
  return `<button type="button" class="chip" aria-pressed="${on}" data-tag="${key}">${escapeHtml(word)}</button>`;
}

// Mood: the score, then feelings. Folded, only the picked feelings show.
function moodRow(item) {
  const picked = healthList.feelings.filter((f) => healthAnswers.get(f.id) === true);
  const rest = healthList.feelings.filter((f) => !picked.includes(f));
  return `<li class="mood">
    <ul class="rows">${rateRow(item.id, item.name, item.scale).replace('class="row"', 'class="row no-rule"')}</ul>
    <details class="feels"${feelingsOpen ? ' open' : ''}>
      <summary>${picked.map((f) => chip(f.id, f.name)).join('')}<span class="more"><span class="more-word">${picked.length ? 'more' : 'feelings'}</span>${chevron}</span></summary>
      <div class="chips">${rest.map((f) => chip(f.id, f.name)).join('')}</div>
    </details>
  </li>`;
}

// How much is noted in a folder: scores above nothing, and tags that are on.
function countNoted(folder) {
  let n = 0;
  for (const item of folder.items) {
    if (item.items) n += countNoted(item);
    else if (healthAnswers.get(item.id)) n++;
  }
  for (const tag of folder.tags) if (healthAnswers.get(tag.id) === true) n++;
  return n;
}

function isFolderFolded(id) {
  try { return localStorage.getItem(`keystone-folded-health/${id}`) === '1'; } catch { return false; }
}

function folderBody(folder) {
  const rows = folder.items.map((item) => (item.items ? subFolder(item) : rateRow(item.id, item.name, item.scale)));
  if (folder.tags.length) rows.push(`<li class="tags">${folder.tags.map((t) => chip(t.id, t.name)).join('')}</li>`);
  return rows.join('');
}

function countText(folder) {
  const n = countNoted(folder);
  if (!folder.items.length) return folder.tags.length ? `${n} of ${folder.tags.length}` : '';
  return n ? `${n} noted` : '';
}

function subFolder(folder) {
  return `<li><details class="subfolder" data-fold="${folder.id}"${isFolderFolded(folder.id) ? '' : ' open'}>
    <summary><span class="sub-name">${escapeHtml(folder.name)}</span>${chevron}</summary>
    <ul class="rows sub-rows">${folderBody(folder)}</ul>
  </details></li>`;
}

function topFolder(folder) {
  return `<details class="part folder" data-fold="${folder.id}"${isFolderFolded(folder.id) ? '' : ' open'}>
    <summary><span class="part-name">${escapeHtml(folder.name)}</span><span class="part-count">${countText(folder)}</span>${chevron}</summary>
    <ul class="rows">${folderBody(folder)}</ul>
  </details>`;
}

async function showHealth() {
  const date = new Date(`${healthDay}T12:00:00`);
  const month = date.toLocaleDateString('en-GB', { month: 'long' });
  $('health-date-line').textContent = `${month} ${ordinal(date.getDate())} · week ${weekNumber(date)}`;
  $('health-weekday').textContent = date.toLocaleDateString('en-GB', { weekday: 'long' });
  $('health-next').style.visibility = healthDay >= todayKey() ? 'hidden' : '';

  healthList = await getHealthList();
  healthAnswers = await getHealthDay(healthDay);
  // The feelings hang under the first main item that uses the mood scale.
  const moodItem = healthList.main.find((m) => m.scale === 'mood');
  $('health-list').innerHTML =
    `<ul class="rows main-rows">${healthList.main.map((m) => (m === moodItem ? moodRow(m) : rateRow(m.id, m.name, m.scale))).join('')}</ul>` +
    healthList.folders.map(topFolder).join('') +
    '<p class="edit-hint">Change this list from the full menu</p>';

  for (const details of $('health-list').querySelectorAll('details[data-fold]')) {
    details.addEventListener('toggle', () => {
      try { localStorage.setItem(`keystone-folded-health/${details.dataset.fold}`, details.open ? '0' : '1'); } catch { /* not important */ }
    });
  }
  const feels = $('health-list').querySelector('details.feels');
  if (feels) feels.addEventListener('toggle', () => { feelingsOpen = feels.open; });
}

function stepHealthDay(days) {
  const date = new Date(`${healthDay}T12:00:00`);
  date.setDate(date.getDate() + days);
  healthDay = todayKey(date);
  showHealth();
}
$('health-prev').addEventListener('click', () => stepHealthDay(-1));
$('health-next').addEventListener('click', () => stepHealthDay(1));

$('health-list').addEventListener('click', async (event) => {
  const rate = event.target.closest('[data-rate]');
  const tag = event.target.closest('[data-tag]');
  if (!rate && !tag) return;
  // A tag inside the folded feelings line shouldn't open or close it.
  event.preventDefault();
  if (navigator.vibrate) navigator.vibrate(8);
  if (rate) {
    const value = Number(rate.dataset.value);
    // Tapping the picked dot again clears the score.
    await setHealthAnswer(healthDay, rate.dataset.rate, healthAnswers.get(rate.dataset.rate) === value ? 0 : value);
  } else {
    await setHealthAnswer(healthDay, tag.dataset.tag, healthAnswers.get(tag.dataset.tag) !== true);
  }
  showHealth();
  showBackupInfo();
});

// --- Moving between the front page and the Health page ---
// The Health page has its own place in the phone's history, so the back button returns home.

function showView() {
  const view = { '#health': 'health', '#health-edit': 'health-edit' }[location.hash] || 'home';
  $('front').hidden = view !== 'home';
  $('health').hidden = view !== 'health';
  $('health-edit').hidden = view !== 'health-edit';
  for (const button of $('bar-buttons').children) {
    const here = button.dataset.view === (view === 'health-edit' ? 'health' : view);
    if (here) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  if (view === 'health') {
    healthDay = todayKey();
    showHealth();
  }
  if (view === 'health-edit') showHealthEdit();
  window.scrollTo(0, 0);
}

function goHealth() {
  if (location.hash !== '#health') location.hash = 'health';
}
function goHome() {
  if (location.hash === '#health') history.back();
  else if (location.hash) location.replace('#');
  else window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.addEventListener('hashchange', showView);
if (location.hash) history.replaceState(null, '', location.pathname);
