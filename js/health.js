// health.js: the Health page. How you are, day by day:
//   - today's feelings, as a field of emotion colours at the top (the face button adds them);
//   - the morning and evening check-ins, written out in words;
//   - four tabs (Mental, Physical, Behavioural, Factors) holding folders and
//     single items, each with its own colour.
//
// The list itself (what's on the page) is saved as one item, changed on the edit
// page (health-edit.js):
//   { id: "health-list", kind: "health-list", day: "", list: {
//       version: 2,
//       checkins: { morning: [item], evening: [item] },
//       feelings: [{ family, words: [...] }],
//       tabs: [{ id, name, entries: [folder or item] }] } }
//   item:   { id, name, scale, colour }                 a single thing to rate
//   folder: { id, name, icon, colour, items: [item], tags: [{ id, name }] }
//
// Each answer is saved as its own item for that day, under the id of what it answers:
//   { id: "health-2026-10-24-pain/headache", kind: "health", day: "2026-10-24",
//     key: "pain/headache", value: 2 }
// Scores are numbers (0 = nothing picked); tags and feelings (key "feel/<word>")
// are true or false; notes are kept under "<id>/note"; the time a check-in was
// filled in under "checkin/morning" or "checkin/evening".
// One item per answer, so answers made on two phones merge cleanly. Renaming
// something keeps its id, so its past answers stay with it.

const SCALES = {
  mood: ['', 'awful', 'bad', 'neutral', 'content', 'happy'],
  quality: ['', 'poor', 'fine', 'good'],
  symptom: ['', 'present', 'distressing', 'debilitating'],
  amount: ['', 'a little', 'some', 'a lot'],
  approach: ['', 'approached', 'avoided'],
};
const SCALE_NAMES = {
  symptom: 'Symptom', quality: 'Quality', mood: 'Mood', amount: 'Amount', approach: 'Approach or avoid',
};

const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// The starting list: generic examples, to be changed on the edit page.
function startingHealthList() {
  const items = (folderId, names, scale = 'symptom') => names.map((name) => ({ id: `${folderId}/${slug(name)}`, name, scale }));
  const tags = (folderId, names) => names.map((name) => ({ id: `${folderId}/tag/${slug(name)}`, name }));
  const folder = (id, name, icon, colour, itemNames, tagNames = [], scale = 'symptom') =>
    ({ id, name, icon, colour, items: items(id, itemNames, scale), tags: tags(id, tagNames) });
  return {
    version: 2,
    checkins: {
      morning: [
        { id: 'sleep', name: 'Sleep', scale: 'quality', colour: '#7F92AB' },
        { id: 'morning/mood', name: 'Mood', scale: 'mood', colour: '#EDBE68' },
        { id: 'morning/motivation', name: 'Motivation', scale: 'quality', colour: '#7E9D84' },
      ],
      evening: [
        { id: 'mood', name: 'Mood', scale: 'mood', colour: '#EDBE68' },
        { id: 'motivation', name: 'Motivation', scale: 'quality', colour: '#7E9D84' },
        { id: 'productivity', name: 'Productivity', scale: 'quality', colour: '#E2A174' },
        { id: 'energy', name: 'Energy', scale: 'quality', colour: '#A98AA6' },
      ],
    },
    feelings: EMOTION_FAMILIES.map(([family, words]) => ({ family, words: [...words] })),
    tabs: [
      { id: 'mental', name: 'Mental', entries: [
        folder('thinking', 'Thinking', 'mind', '#5C6D86', ['Brain fog', 'Racing thoughts', 'Rumination'], ['spaced out', 'overthinking']),
        folder('feelings', 'Feelings', 'heart', '#7FA39C', ['Anxiety', 'Low mood', 'Irritability'], ['panic attack', 'cried', 'shut down']),
        { id: 'stress', name: 'Stress', scale: 'symptom', colour: '#A98AA6' },
      ] },
      { id: 'physical', name: 'Physical', entries: [
        folder('pain', 'Pain', 'pain', '#B8646E', ['Headache', 'Muscle tension', 'Joint pain'], ['cramps', 'pain flare', 'stiff neck']),
        folder('injury', 'Injury', 'injury', '#C9993F', ['Sprain', 'Bruise']),
        folder('body', 'Body', 'body', '#7D6283', ['Fatigue', 'Nausea', 'Dizziness'], ['period', 'cold', 'hot flush']),
      ] },
      { id: 'behavioural', name: 'Behavioural', entries: [
        folder('avoidance', 'Avoidance', 'door', '#7FA39C', ['Social', 'Chores', 'Appointments', 'Messages'], [], 'approach'),
        folder('eating', 'Eating', 'bowl', '#5E7A66', ['Emotional eating', 'Skipped meals'], ['cravings', 'snacking']),
      ] },
      { id: 'factors', name: 'Factors', entries: [
        folder('day', 'Day', 'sun', '#EDBE68', [], ['went outside', 'saw someone', 'showered', 'cooked', 'rested', 'screen-free hour']),
        { id: 'caffeine', name: 'Caffeine', scale: 'amount', colour: '#8F7B6A' },
        { id: 'screen-time', name: 'Screen time', scale: 'amount', colour: '#4F5B70' },
      ] },
    ],
  };
}

// The first version of the page had main scores and folders with smaller folders inside.
// This keeps everything from it (same ids, so past answers stay) in the new shape.
function upgradeHealthList(old) {
  const list = startingHealthList();
  const known = new Set(list.tabs.flatMap((t) => t.entries.map((e) => e.id)));
  const tabFor = { body: 'physical', mind: 'mental', day: 'factors' };
  let colourIndex = 6;
  const nextColour = () => PALETTE[colourIndex++ % PALETTE.length];
  const flatten = (folder, into, prefix = '') => {
    const own = folder.items.filter((i) => !i.items);
    const entry = { id: folder.id, name: prefix + folder.name, icon: 'dot', colour: nextColour(), items: own.map((i) => ({ id: i.id, name: i.name, scale: i.scale })), tags: folder.tags || [] };
    const same = into.find((e) => e.id === entry.id) || list.tabs.flatMap((t) => t.entries).find((e) => e.id === entry.id && e.items);
    if (same) {
      // Already in the new list: add whatever the old one had that the new one doesn't.
      for (const i of entry.items) if (!same.items.some((x) => x.id === i.id)) same.items.push(i);
      for (const t of entry.tags) if (!same.tags.some((x) => x.id === t.id)) same.tags.push(t);
    } else if (!known.has(entry.id) && (entry.items.length || entry.tags.length)) into.push(entry);
    for (const sub of folder.items.filter((i) => i.items)) flatten(sub, into, `${folder.name} · `);
  };
  for (const folder of old.folders || []) {
    const tab = list.tabs.find((t) => t.id === (tabFor[folder.id] || 'mental'));
    flatten(folder, tab.entries);
  }
  return list;
}

async function getHealthList() {
  const saved = (await getItemsForDay('')).find((item) => item.id === 'health-list');
  if (!saved) return startingHealthList();
  return saved.list.version === 2 ? saved.list : upgradeHealthList(saved.list);
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

// Every rateable thing in the list, with its colour (a folder's items take the folder's colour).
function allHealthItems(list) {
  const out = [];
  for (const part of ['morning', 'evening']) {
    for (const item of list.checkins[part]) {
      // Morning and evening can both ask about mood, so the morning ones say so.
      const twice = part === 'morning' && list.checkins.evening.some((e) => e.name === item.name);
      out.push({ ...item, name: twice ? `${item.name} (morning)` : item.name, group: 'Check-in' });
    }
  }
  for (const tab of list.tabs) {
    for (const entry of tab.entries) {
      if (entry.items) for (const item of entry.items) out.push({ ...item, colour: entry.colour, group: entry.name, tab: tab.id, folder: entry.id });
      else out.push({ ...entry, group: tab.name, tab: tab.id });
    }
  }
  return out;
}

// --- The page ---

let healthDay = todayKey();
let healthAnswers = new Map();
let healthList = startingHealthList();
const CHECKIN_TAB = 'checkins';
let healthTab = 'physical';
try { healthTab = localStorage.getItem('keystone-health-tab') || 'physical'; } catch { /* first tab */ }

// Steps for a scale: one small bar per level, growing taller; filled ones take the colour from pale to deep.
function stepsFor(key, scale, colour) {
  const words = SCALES[scale];
  const value = healthAnswers.get(key) || 0;
  if (scale === 'approach') {
    return `<span class="pair" role="radiogroup">${[1, 2].map((v) => {
      const on = value === v;
      const fill = v === 1 ? shade(colour, 0.25) : shade(colour, 0.85);
      return `<button type="button" class="pair-choice" role="radio" aria-checked="${on}" data-rate="${key}" data-value="${v}" style="${on ? `background: ${fill}; color: ${textOn(fill)}; border-color: transparent` : ''}">${words[v]}</button>`;
    }).join('')}</span>`;
  }
  const n = words.length - 1;
  return `<span class="steps" role="radiogroup">${words.slice(1).map((word, i) => {
    const on = i < value;
    const h = 11 + i * (n > 3 ? 3 : 5);
    return `<button type="button" class="step${on ? ' on' : ''}" role="radio" aria-checked="${i + 1 === value}" aria-label="${word}" data-rate="${key}" data-value="${i + 1}"><span style="height: ${h}px;${on ? ` background: ${shade(colour, n === 1 ? 0.6 : 0.2 + (i / (n - 1)) * 0.75)}` : ''}"></span></button>`;
  }).join('')}</span>`;
}

function rateRow(item, colour) {
  const note = healthAnswers.get(`${item.id}/note`);
  const value = healthAnswers.get(item.id) || 0;
  return `<li class="row">
    <div class="row-main">
      <button type="button" class="row-name" data-note="${item.id}" aria-label="${escapeHtml(item.name)}: add a note">${escapeHtml(item.name)}</button>
      ${stepsFor(item.id, item.scale, colour)}
    </div>
    ${note ? `<div class="row-note">${pencilIcon.replace('width="16" height="16"', 'width="11" height="11"')}${escapeHtml(note)}</div>` : ''}
  </li>`;
}

function chip(key, word, colour) {
  const on = healthAnswers.get(key) === true;
  return `<button type="button" class="chip" aria-pressed="${on}" data-tag="${key}"${on ? ` style="background: ${colour}; color: ${textOn(colour)}"` : ''}>${escapeHtml(word)}</button>`;
}

function countText(folder) {
  const noted = folder.items.filter((i) => healthAnswers.get(i.id)).length + folder.tags.filter((t) => healthAnswers.get(t.id) === true).length;
  return `${noted} of ${folder.items.length + folder.tags.length}`;
}

function folderBlock(folder) {
  return `<details class="folder" data-fold="${folder.id}"${isFolded(`health/${folder.id}`) ? '' : ' open'}>
    <summary>${icon(folder.icon, folder.colour, 19, 1.8)}<span class="folder-name">${escapeHtml(folder.name)}</span><span class="count">${countText(folder)}</span>${chevron}</summary>
    <ul class="rows">${folder.items.map((item) => rateRow(item, folder.colour)).join('')}</ul>
    ${folder.tags.length ? `<div class="tag-list">${folder.tags.map((t) => chip(t.id, t.name, folder.colour)).join('')}</div>` : ''}
  </details>`;
}

// A single item, outside any folder: its own coloured dot and its own colour.
function loneBlock(item) {
  return `<ul class="rows lone">${rateRow(item, item.colour).replace('<div class="row-main">', `<div class="row-main"><span class="lone-dot" style="background: ${item.colour}"></span>`)}</ul>`;
}

// --- Check-ins, written out as a sentence ---

const QUALITY_PHRASES = {
  sleep: ['', 'Slept poorly', 'Slept fine', 'Slept well'],
  motivation: ['', 'low on motivation', 'some motivation', 'plenty of motivation'],
  productivity: ['', 'not much done', 'a fair day’s work', 'a productive day'],
  energy: ['', 'low energy', 'some energy', 'good energy'],
};
const MOOD_PHRASES = ['', 'felt awful', 'felt bad', 'felt neutral', 'felt content', 'felt happy'];

function checkinSentence(items) {
  const parts = [];
  for (const item of items) {
    const v = healthAnswers.get(item.id);
    if (!v) continue;
    const base = item.id.split('/').pop();
    if (item.scale === 'mood') parts.push(MOOD_PHRASES[v]);
    else if (QUALITY_PHRASES[base]) parts.push(QUALITY_PHRASES[base][v]);
    else parts.push(`${item.name.toLowerCase()} ${SCALES[item.scale][v]}`);
  }
  if (!parts.length) return '';
  const text = parts.join(', ');
  return text[0].toUpperCase() + text.slice(1) + '.';
}

// A check-in on the morning and evening tab: what you answered, or a button to start.
function checkinLine(part) {
  const words = checkinSentence(healthList.checkins[part]);
  const time = healthAnswers.get(`checkin/${part}`) || '';
  const title = part === 'morning' ? 'Morning' : 'Evening';
  return `<button type="button" class="checkin" data-checkin="${part}">
    <span class="checkin-icon">${icon(part === 'morning' ? 'sun' : 'moon', INK, 20, 1.4)}</span>
    <span class="checkin-body">
      <span class="checkin-top"><b>${title}</b><span>${escapeHtml(time)}</span></span>
      <span class="checkin-words${words ? '' : ' muted'}">${escapeHtml(words || `${title} check-in`)}</span>
    </span>
    ${words ? '' : `<span class="checkin-start">${part === 'evening' ? 'Good night' : 'Start'}</span>`}
  </button>`;
}

function openCheckin(part) {
  const items = healthList.checkins[part];
  const html = items.map((item) => {
    const words = SCALES[item.scale];
    const value = healthAnswers.get(item.id) || 0;
    return `<fieldset class="field"><legend>${escapeHtml(item.name)}</legend><div class="choices">${words.slice(1).map((w, i) =>
      `<label><input type="radio" name="${item.id}" value="${i + 1}"${value === i + 1 ? ' checked' : ''}><span>${w}</span></label>`).join('')}</div></fieldset>`;
  }).join('');
  openSheet(part === 'morning' ? 'Good morning' : 'Evening check-in', html, async (form) => {
    for (const item of items) {
      const picked = form.querySelector(`input[name="${CSS.escape(item.id)}"]:checked`);
      if (picked) await setHealthAnswer(healthDay, item.id, Number(picked.value));
    }
    const now = new Date();
    await setHealthAnswer(healthDay, `checkin/${part}`, `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`);
    showHealth();
    showBackupInfo();
  }, part === 'evening' ? 'Good night' : 'Save');
}

// --- Feelings ---

function openFeelings() {
  const html = healthList.feelings.map(({ family, words }) => `<div class="family">
    <div class="family-name"><span class="swatch" style="background: ${EMOTION_COLOURS[family] || INK}"></span>${family}</div>
    <div class="tag-list">${words.map((w) => {
      const on = healthAnswers.get(`feel/${w}`) === true;
      return `<button type="button" class="chip" aria-pressed="${on}" data-feel="${escapeHtml(w)}" data-colour-on="${EMOTION_COLOURS[family]}"${on ? ` style="background: ${EMOTION_COLOURS[family]}; color: ${textOn(EMOTION_COLOURS[family])}"` : ''}>${escapeHtml(w)}</button>`;
    }).join('')}</div></div>`).join('');
  openSheet('How do you feel?', `<p class="muted">Pick as many as fit. Tap again to take one away.</p>${html}`, async (form) => {
    for (const button of form.querySelectorAll('[data-feel]')) {
      const key = `feel/${button.dataset.feel}`;
      const on = button.getAttribute('aria-pressed') === 'true';
      if (on !== (healthAnswers.get(key) === true)) await setHealthAnswer(healthDay, key, on);
    }
    showHealth();
    showBackupInfo();
  }, 'Done');
}
sheetForm.addEventListener('click', (event) => {
  const feel = event.target.closest('[data-feel]');
  if (!feel) return;
  const on = feel.getAttribute('aria-pressed') !== 'true';
  feel.setAttribute('aria-pressed', on);
  feel.style.background = on ? feel.dataset.colourOn : '';
  feel.style.color = on ? textOn(feel.dataset.colourOn) : '';
});

// --- Notes on a single item ---

function openNote(id) {
  const item = allHealthItems(healthList).find((i) => i.id === id);
  if (!item) return;
  const note = healthAnswers.get(`${id}/note`) || '';
  openSheet(escapeHtml(item.name), `<label class="field"><span>A small note for this day</span><input type="text" name="note" value="${escapeHtml(note)}" autocomplete="off" placeholder="where, how long, what helped"></label>`, async (form) => {
    await setHealthAnswer(healthDay, `${id}/note`, form.elements.note.value.trim());
    showHealth();
  });
}

// --- Drawing the page ---

async function showHealth() {
  const date = new Date(`${healthDay}T12:00:00`);
  $('health-date').textContent = healthDay === todayKey() ? 'Today' : date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  $('health-next').style.visibility = healthDay >= todayKey() ? 'hidden' : '';

  healthList = await getHealthList();
  healthAnswers = await getHealthDay(healthDay);
  if (healthTab !== CHECKIN_TAB && !healthList.tabs.some((t) => t.id === healthTab)) healthTab = healthList.tabs[0].id;

  const picks = await getFeelings(healthDay);
  showField($('health-field'), picks);
  const family = strongestFamily(picks);
  $('feel-button').innerHTML = faceIcon(family, 'currentColor', 26);
  $('feel-button').setAttribute('aria-label', picks.length ? `Add feelings. Today feels ${family === 'Mixed' ? 'mixed' : family.toLowerCase()}.` : 'Add feelings');
  $('health-words').innerHTML = picks.length
    ? escapeHtml(picks.map(([, w]) => w).join(', '))
    : '<span class="hint">How do you feel? Tap the face to add feelings.</span>';

  // The first tab, marked with a sun and a moon, holds the morning and evening check-ins.
  $('health-tabs').innerHTML = `<button type="button" class="tab tab-icons" role="tab" aria-selected="${healthTab === CHECKIN_TAB}" data-tab="${CHECKIN_TAB}" aria-label="Morning and evening">${icon('sun', 'currentColor', 18, 1.5)}${icon('moon', 'currentColor', 16, 1.5)}</button>`
    + healthList.tabs.map((t) => (t.id === 'factors'
      // Factors is marked with a plus, like the check-in tab is marked with its icons.
      ? `<button type="button" class="tab tab-icons" role="tab" aria-selected="${t.id === healthTab}" data-tab="${t.id}" aria-label="${escapeHtml(t.name)}"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>`
      : `<button type="button" class="tab" role="tab" aria-selected="${t.id === healthTab}" data-tab="${t.id}">${escapeHtml(t.name)}</button>`)).join('');
  const tab = healthList.tabs.find((t) => t.id === healthTab);
  $('health-folders').innerHTML = healthTab === CHECKIN_TAB ? checkinLine('morning') + checkinLine('evening')
    : tab.entries.map((e) => (e.items ? folderBlock(e) : loneBlock(e))).join('')
    || '<p class="muted">Nothing here yet. Add folders and items on the edit page (menu > Edit the Health page).</p>';

  for (const details of $('health-folders').querySelectorAll('details[data-fold]')) {
    details.addEventListener('toggle', () => rememberFolded(`health/${details.dataset.fold}`, !details.open));
  }
}

function stepHealthDay(days) {
  const date = new Date(`${healthDay}T12:00:00`);
  date.setDate(date.getDate() + days);
  healthDay = todayKey(date);
  showHealth();
}
$('health-prev').addEventListener('click', () => stepHealthDay(-1));
$('health-next').addEventListener('click', () => stepHealthDay(1));
$('feel-button').addEventListener('click', openFeelings);

$('health-tabs').addEventListener('click', (event) => {
  const tab = event.target.closest('[data-tab]');
  if (!tab) return;
  healthTab = tab.dataset.tab;
  try { localStorage.setItem('keystone-health-tab', healthTab); } catch { /* not important */ }
  showHealth();
});

$('health-folders').addEventListener('click', async (event) => {
  const line = event.target.closest('[data-checkin]');
  if (line) return openCheckin(line.dataset.checkin);
  const rate = event.target.closest('[data-rate]');
  const tag = event.target.closest('[data-tag]');
  const note = event.target.closest('[data-note]');
  if (note) {
    openNote(note.dataset.note);
    return;
  }
  if (!rate && !tag) return;
  event.preventDefault();
  if (navigator.vibrate) navigator.vibrate(8);
  if (rate) {
    const value = Number(rate.dataset.value);
    // Tapping the picked step again clears the score.
    await setHealthAnswer(healthDay, rate.dataset.rate, healthAnswers.get(rate.dataset.rate) === value ? 0 : value);
  } else {
    await setHealthAnswer(healthDay, tag.dataset.tag, healthAnswers.get(tag.dataset.tag) !== true);
  }
  showHealth();
  showBackupInfo();
});
