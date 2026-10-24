// health.js: the Health page. Everything about how you are that isn't an activity:
// the main scores on top (mood, motivation, productivity, energy, sleep), then folders.
//
// The list itself lives in HEALTH_LIST below for now. Later it moves into edit mode
// (in the full menu), so it can be changed without touching code.
//
// Each answer is saved as its own item for that day:
//   { id: "health-2026-10-24-body/pain/headache", kind: "health", day: "2026-10-24",
//     key: "body/pain/headache", value: 2 }
// Scores are numbers (0 = nothing picked); tags and feelings are true or false.
// One item per answer, so answers made on two phones merge cleanly.

const SCALES = {
  mood: ['', 'awful', 'bad', 'neutral', 'content', 'happy'],
  quality: ['', 'poor', 'fine', 'good'],
  symptom: ['', 'present', 'distressing', 'debilitating'],
};

const FEELINGS = ['calm', 'hopeful', 'grateful', 'proud', 'loved', 'relieved', 'excited', 'tired', 'bored',
  'restless', 'anxious', 'overwhelmed', 'irritable', 'frustrated', 'sad', 'lonely', 'numb', 'ashamed'];

// The main items: always there, never folded.
const HEALTH_MAIN = [
  { key: 'mood', name: 'Mood', scale: 'mood' },
  { key: 'motivation', name: 'Motivation', scale: 'quality' },
  { key: 'productivity', name: 'Productivity', scale: 'quality' },
  { key: 'energy', name: 'Energy', scale: 'quality' },
  { key: 'sleep', name: 'Sleep', scale: 'quality' },
];

// The folders. A folder holds scores (symptom scale unless it says otherwise),
// smaller folders, and one group of yes/no tags.
const HEALTH_LIST = [
  {
    name: 'Body',
    items: [
      { name: 'Pain', items: [{ name: 'Headache' }, { name: 'Joint pain' }, { name: 'Back pain' }, { name: 'Cramps' }] },
      { name: 'Stomach', items: [{ name: 'Nausea' }, { name: 'Bloating' }, { name: 'No appetite' }] },
      { name: 'Fatigue' },
      { name: 'Dizziness' },
    ],
    tags: ['period', 'nap', 'painkiller', 'flare-up', 'fever'],
  },
  {
    name: 'Mind',
    items: [{ name: 'Brain fog' }, { name: 'Anxiety' }, { name: 'Low mood' }, { name: 'Irritability' }],
    tags: ['panic attack', 'cried', 'shut down', 'overstimulated'],
  },
  {
    name: 'Day',
    items: [],
    tags: ['went outside', 'saw someone', 'showered', 'cooked', 'tidied', 'rested', 'screen-free hour'],
  },
];

const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

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
function moodRow() {
  const picked = FEELINGS.filter((f) => healthAnswers.get(`feel/${slug(f)}`) === true);
  const rest = FEELINGS.filter((f) => !picked.includes(f));
  return `<li class="mood">
    <ul class="rows">${rateRow('mood', 'Mood', 'mood').replace('class="row"', 'class="row no-rule"')}</ul>
    <details class="feels"${feelingsOpen ? ' open' : ''}>
      <summary>${picked.map((f) => chip(`feel/${slug(f)}`, f)).join('')}<span class="more"><span class="more-word">${picked.length ? 'more' : 'feelings'}</span>${chevron}</span></summary>
      <div class="chips">${rest.map((f) => chip(`feel/${slug(f)}`, f)).join('')}</div>
    </details>
  </li>`;
}

// How much is noted in a folder: scores above nothing, and tags that are on.
function countNoted(path, folder) {
  let n = 0;
  for (const item of folder.items || []) {
    const key = `${path}/${slug(item.name)}`;
    if (item.items) n += countNoted(key, item);
    else if (healthAnswers.get(key)) n++;
  }
  for (const tag of folder.tags || []) if (healthAnswers.get(`${path}/tag/${slug(tag)}`) === true) n++;
  return n;
}

function isFolderFolded(path) {
  try { return localStorage.getItem(`keystone-folded-health/${path}`) === '1'; } catch { return false; }
}

function folderBody(path, folder) {
  const rows = (folder.items || []).map((item) => {
    const key = `${path}/${slug(item.name)}`;
    return item.items ? subFolder(key, item) : rateRow(key, item.name, item.scale || 'symptom');
  });
  if (folder.tags && folder.tags.length) {
    rows.push(`<li class="tags">${folder.tags.map((t) => chip(`${path}/tag/${slug(t)}`, t)).join('')}</li>`);
  }
  return rows.join('');
}

function countText(path, folder) {
  const n = countNoted(path, folder);
  if (!(folder.items || []).length) return `${n} of ${folder.tags.length}`;
  return n ? `${n} noted` : '';
}

function subFolder(path, folder) {
  return `<li><details class="subfolder" data-fold="${path}"${isFolderFolded(path) ? '' : ' open'}>
    <summary><span class="sub-name">${escapeHtml(folder.name)}</span>${chevron}</summary>
    <ul class="rows sub-rows">${folderBody(path, folder)}</ul>
  </details></li>`;
}

function topFolder(folder) {
  const path = slug(folder.name);
  return `<details class="part folder" data-fold="${path}"${isFolderFolded(path) ? '' : ' open'}>
    <summary><span class="part-name">${escapeHtml(folder.name)}</span><span class="part-count">${countText(path, folder)}</span>${chevron}</summary>
    <ul class="rows">${folderBody(path, folder)}</ul>
  </details>`;
}

async function showHealth() {
  const date = new Date(`${healthDay}T12:00:00`);
  const month = date.toLocaleDateString('en-GB', { month: 'long' });
  $('health-date-line').textContent = `${month} ${ordinal(date.getDate())} · week ${weekNumber(date)}`;
  $('health-weekday').textContent = date.toLocaleDateString('en-GB', { weekday: 'long' });
  $('health-next').style.visibility = healthDay >= todayKey() ? 'hidden' : '';

  healthAnswers = await getHealthDay(healthDay);
  $('health-list').innerHTML =
    `<ul class="rows main-rows">${moodRow()}${HEALTH_MAIN.slice(1).map((m) => rateRow(m.key, m.name, m.scale)).join('')}</ul>` +
    HEALTH_LIST.map(topFolder).join('');

  for (const details of $('health-list').querySelectorAll('details[data-fold]')) {
    details.addEventListener('toggle', () => {
      try { localStorage.setItem(`keystone-folded-health/${details.dataset.fold}`, details.open ? '0' : '1'); } catch { /* not important */ }
    });
  }
  $('health-list').querySelector('details.feels').addEventListener('toggle', (event) => { feelingsOpen = event.target.open; });
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
  const health = location.hash === '#health';
  $('front').hidden = health;
  $('health').hidden = !health;
  for (const button of $('bar-buttons').children) {
    const here = health ? button.dataset.view === 'health' : button.dataset.view === 'home';
    if (here) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  if (health) {
    healthDay = todayKey();
    showHealth();
  }
  window.scrollTo(0, 0);
}

function goHealth() {
  if (location.hash !== '#health') location.hash = 'health';
}
function goHome() {
  if (location.hash === '#health') history.back();
  else window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.addEventListener('hashchange', showView);
if (location.hash === '#health') history.replaceState(null, '', location.pathname);
