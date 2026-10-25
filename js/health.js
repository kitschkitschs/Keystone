// health.js: what the Health page tracked, kept so the Insight page can read it.
// (The Health page itself was taken out on 25 October 2026, to be redone with the
// room in mind. Its saved answers are all still here.)
//
// The list itself (what's on the page) is saved as one item, like this:
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
