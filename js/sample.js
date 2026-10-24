// sample.js: a made-up year of days, so every page can be seen filled in.
// Switched on in the full menu ("Show sample data"); see sampleMode in db.js.
// Nothing here is real, and none of it is saved: your own data isn't touched.
// The numbers are seeded, so the sample looks the same every time.

function makeSampleItems() {
  let seed = 11;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const items = [];
  const add = (item) => items.push({ updatedAt: Date.now() - 1e9 + items.length, ...item });

  const N = 365;
  const days = [];
  const d = new Date();
  d.setDate(d.getDate() - (N - 1));
  for (let k = 0; k < N; k++) {
    days.push(todayKey(d));
    d.setDate(d.getDate() + 1);
  }
  const today = days[N - 1];

  // A year with a few harder stretches: "load" is how heavy each day was, 0 to 1.
  const flares = [[40, 9, 0.55], [105, 14, 0.7], [150, 6, 0.4], [210, 10, 0.5], [262, 7, 0.45], [318, 12, 0.6], [352, 5, 0.4]];
  const load = days.map((_, i) => {
    let v = 0.18 + 0.1 * Math.cos((i / N) * Math.PI * 2 + 0.6);
    for (const [c, w, a] of flares) v += a * Math.exp(-((i - c) ** 2) / (2 * w * w));
    return clamp(v + (rnd() - 0.5) * 0.22, 0.02, 0.98);
  });
  const unlogged = days.map((_, i) => i < N - 1 && rnd() < 0.07);

  // --- Habits (every-day tasks) and their ticks ---
  const habits = [
    ['Take meds', 'morning', 'Morning routine', 0.95],
    ['Freshen up', 'morning', 'Morning routine', 0.8],
    ['Get something to drink', 'morning', 'Morning routine', 0.86],
    ['Brush teeth', 'evening', 'Evening routine', 0.9],
    ['Wind down', 'evening', 'Evening routine', 0.6],
    ['Feed Mymlen', 'day', 'Home and Mymlen', 0.97],
    ['Tend sprouts', 'day', 'Home and Mymlen', 0.62],
    ['Chore', 'day', 'Home and Mymlen', 0.35],
    ['Walk', 'day', 'Movement', 0.55, { type: 'week', n: 3 }],
    ['Study', 'day', 'Learning', 0.42, { type: 'week', n: 4 }],
  ];
  habits.forEach(([text, part, category, p, freq], h) => {
    const id = `task-sample-${h}`;
    add({ id, kind: 'task', list: '', part, text, note: '', day: '', since: days[0], createdAt: h });
    add({ id: `habit-${id}`, kind: 'habit', day: '', taskId: id, category, colour: '', freq: freq || { type: 'daily', n: 1 }, streak: { skipsKeep: true, grace: 0 } });
    days.forEach((day, i) => {
      if (unlogged[i] || (day === today && part !== 'morning')) return;
      const r = rnd();
      const done = r < clamp(p - 0.35 * (load[i] - 0.25));
      const skip = !done && r > 0.94;
      if (done || skip) add({ id: `tick-${id}-${day}`, kind: 'tick', day, taskId: id, done, skip });
    });
  });
  [['Morning routine', '#EDBE68'], ['Evening routine', '#7F92AB'], ['Home and Mymlen', '#5E7A66'], ['Movement', '#E2A174'], ['Learning', '#A98AA6']]
    .forEach(([name, colour]) => add({ id: `habit-cat-${slug(name)}`, kind: 'habit-cat', day: '', name, colour }));
  // A few one-off tasks for today.
  [['Call the pharmacy', 'day'], ['Post the parcel', 'day'], ['Read a chapter', 'evening']].forEach(([text, part], k) =>
    add({ id: `task-sample-today-${k}`, kind: 'task', list: '', part, text, note: '', day: today, since: today, createdAt: 100 + k }));

  // --- Health ---
  const answer = (day, key, value) => add({ id: `health-${day}-${key}`, kind: 'health', day, key, value });
  const level = (v, top) => clamp(Math.round(v * top + (rnd() - 0.5) * 1.2), 1, top);
  const symptom = (v) => clamp(Math.round(v * 3.4 - 0.7 + (rnd() - 0.5) * 0.9), 0, 3);
  const list = startingHealthList();
  const symptomIds = list.tabs.flatMap((t) => t.entries.flatMap((e) => (e.items ? e.items : [e]))).filter((i) => i.scale === 'symptom').map((i) => i.id);
  const tagIds = list.tabs.flatMap((t) => t.entries.flatMap((e) => (e.tags || []).map((tag) => tag.id)));
  const areaIds = list.tabs.flatMap((t) => t.entries.flatMap((e) => (e.items || []).filter((i) => i.scale === 'approach').map((i) => i.id)));
  const heavy = { Fear: 0.8, Sadness: 0.9, Anger: 0.6, Disgust: 0.5, Surprise: 0.3, Happiness: 0 };
  // How much each symptom follows the day's load (some barely do).
  const follows = Object.fromEntries(symptomIds.map((id) => [id, 0.25 + rnd() * 0.75]));

  days.forEach((day, i) => {
    if (unlogged[i]) return;
    const v = load[i];
    const prev = load[Math.max(0, i - 1)];
    const good = 1 - v;
    const isToday = day === today;
    // Morning check-in.
    const sleep = level(1 - (0.6 * prev + 0.4 * rnd()), 3);
    answer(day, 'sleep', sleep);
    answer(day, 'morning/mood', level(good * 0.8 + 0.1, 5));
    answer(day, 'morning/motivation', level(good * 0.85, 3));
    answer(day, 'checkin/morning', `${7 + Math.floor(rnd() * 2)}:${String(Math.floor(rnd() * 60)).padStart(2, '0')}`);
    // Evening check-in (not yet today).
    if (!isToday) {
      answer(day, 'mood', level(good * 0.85 + 0.08, 5));
      answer(day, 'motivation', level(good * 0.8, 3));
      answer(day, 'productivity', level(good * 0.75 + 0.1, 3));
      answer(day, 'energy', level(good * 0.7 - (sleep === 1 ? 0.2 : 0), 3));
      answer(day, 'checkin/evening', `${21 + Math.floor(rnd() * 2)}:${String(Math.floor(rnd() * 60)).padStart(2, '0')}`);
    }
    // Feelings: heavier days lean to the heavier families.
    const picks = new Set();
    const n = isToday ? 0 : 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < n; k++) {
      const fams = EMOTION_FAMILIES.filter(([f]) => (rnd() < 0.5 ? heavy[f] <= v + 0.2 : heavy[f] >= v - 0.2));
      const [, words] = fams.length ? pick(fams) : pick(EMOTION_FAMILIES);
      picks.add(pick(words));
    }
    if (isToday) ['anxious', 'confused', 'curious', 'frustrated', 'satisfied', 'lonely', 'peaceful'].forEach((w) => picks.add(w));
    for (const w of picks) answer(day, `feel/${w}`, true);
    // Symptoms, tags, avoidance and amounts.
    for (const id of symptomIds) {
      const s = symptom(v * follows[id] + (sleep === 1 && /fatigue|brain-fog|headache/.test(id) ? 0.2 : 0));
      if (s) answer(day, id, s);
    }
    for (const id of tagIds) if (rnd() < (/went-outside|showered|saw-someone/.test(id) ? 0.6 - 0.4 * v : 0.12 + 0.2 * v)) answer(day, id, true);
    for (const id of areaIds) if (rnd() < 0.55) answer(day, id, rnd() < 0.75 - 0.6 * v ? 1 : 2);
    if (rnd() < 0.8) answer(day, 'caffeine', clamp(Math.round(1 + rnd() * 2 + v), 1, 3));
    if (rnd() < 0.7) answer(day, 'screen-time', clamp(Math.round(1 + 2 * v + rnd()), 1, 3));
  });
  answer(today, 'pain/muscle-tension/note', 'upper back, left shoulder');
  return items;
}
