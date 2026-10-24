// insight.js: the Insight pages. What your days add up to, drawn from what you log:
//   Habits    every-day tasks from the front page, grouped into categories,
//             with Loop Habit Tracker's numbers: strength, history, calendar,
//             best streaks and how often by weekday and month.
//   Health    the check-ins, feelings and symptoms from the Health page.
//   Avoidance the areas in the Health page's Avoidance folder (approached or avoided).
//
// A habit's settings are saved as their own item:
//   { id: "habit-<task id>", kind: "habit", day: "", taskId, colour, category,
//     freq: { type: "daily" | "week" | "month" | "every", n },
//     streak: { skipsKeep: true, grace: 0 } }
// A category's colour, which its habits take unless they have their own:
//   { id: "habit-cat-<name>", kind: "habit-cat", day: "", name, colour }
//
// Pages are reached by the address after #, so the back button works:
//   #insight, #insight/health, #insight/avoid, #insight/cat/<name>, #insight/habit/<task id>,
//   #insight/item/<health item id>, #insight/symptoms, #insight/links, #insight/area/<item id>

const DAYS_BACK = 365;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

let insight = null; // everything loaded for the Insight pages, see loadInsight()

// --- Days ---

function dayList(n = DAYS_BACK) {
  const out = [];
  const d = new Date();
  d.setDate(d.getDate() - (n - 1));
  for (let k = 0; k < n; k++) {
    out.push(todayKey(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}
const weekdayOf = (day) => (new Date(`${day}T12:00:00`).getDay() + 6) % 7;
const fmtShort = (day) => new Date(`${day}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const monthOf = (day) => new Date(`${day}T12:00:00`).toLocaleDateString('en-GB', { month: 'short' });
const pct = (v) => `${Math.round(v * 100)}%`;
const signed = (v) => `${v >= 0 ? '+' : '−'}${Math.round(Math.abs(v) * 100)}%`;
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

// Loop's strength: rises a little on every good day, sinks a little on every bad one,
// so one missed day barely moves it but a habit kept for weeks climbs steadily.
// Days with nothing to count (null) leave it where it was.
function strengthSeries(values, freq = 1) {
  const keep = 0.5 ** (Math.sqrt(freq) / 13);
  let s = 0;
  return values.map((v) => {
    if (v != null) s = s * keep + (1 - keep) * v;
    return s;
  });
}

// --- Loading ---

async function loadInsight() {
  const items = (await getAllItems()).filter((i) => !i.deleted);
  const days = dayList();
  const health = new Map(days.map((d) => [d, new Map()]));
  const ticks = new Map();
  const habitOpts = new Map();
  const catColours = new Map();
  for (const item of items) {
    if (item.kind === 'health' && health.has(item.day)) health.get(item.day).set(item.key, item.value);
    if (item.kind === 'tick') ticks.set(`${item.taskId}|${item.day}`, item);
    if (item.kind === 'habit') habitOpts.set(item.taskId, item);
    if (item.kind === 'habit-cat') catColours.set(item.name, item.colour);
  }
  const list = await getHealthList();
  const healthItems = allHealthItems(list);
  const tasks = items.filter((i) => i.kind === 'task' && i.day === '' && !(i.list || '')).sort((a, b) => a.createdAt - b.createdAt);
  const partName = Object.fromEntries(PARTS.map((p) => [p.key, `${p.name} routine`]));
  let colourIndex = 0;
  const habits = tasks.map((task) => {
    const opts = habitOpts.get(task.id) || {};
    const category = opts.category || partName[task.part] || 'Habits';
    if (!catColours.has(category)) catColours.set(category, PALETTE[colourIndex++ % 6]);
    return {
      id: task.id, name: task.text, since: task.since, task, category,
      ownColour: opts.colour || '',
      freq: opts.freq || { type: 'daily', n: 1 },
      streak: { skipsKeep: true, grace: 0, ...(opts.streak || {}) },
    };
  });
  for (const h of habits) h.colour = h.ownColour || catColours.get(h.category);
  insight = { days, health, ticks, habits, catColours, list, healthItems };
  for (const h of habits) Object.assign(h, habitData(h));
}

// --- Habits: Loop's numbers ---

function freqPerDay(freq) {
  if (freq.type === 'week') return freq.n / 7;
  if (freq.type === 'month') return freq.n / 30;
  if (freq.type === 'every') return 1 / freq.n;
  return 1;
}
function freqWords(freq) {
  if (freq.type === 'week') return `${freq.n} times a week`;
  if (freq.type === 'month') return `${freq.n} times a month`;
  if (freq.type === 'every') return `every ${freq.n} days`;
  return 'every day';
}

function habitData(h) {
  const { days, ticks } = insight;
  const states = days.map((day) => {
    if (day < h.since) return null;
    const tick = ticks.get(`${h.id}|${day}`);
    if (tick && tick.done) return 'done';
    if (tick && tick.skip) return 'skip';
    return 'miss';
  });
  // A day is "kept" when the habit's goal is met around it: every day for daily habits,
  // or n times in the last week, month or n days for the others.
  const window = { daily: 1, week: 7, month: 30, every: h.freq.n }[h.freq.type] || 1;
  const need = h.freq.type === 'every' ? 1 : h.freq.type === 'daily' ? 1 : h.freq.n;
  const kept = states.map((s, k) => {
    if (s == null) return null;
    if (s === 'skip') return 'skip';
    let n = 0;
    for (let j = Math.max(0, k - window + 1); j <= k; j++) if (states[j] === 'done') n++;
    return n >= need;
  });
  const values = kept.map((v) => (v === 'skip' || v == null ? null : v ? 1 : 0));
  const strength = strengthSeries(values, freqPerDay(h.freq));
  // Streaks: kept days in a row. Skips keep a streak going (if chosen) without adding to it;
  // "grace" lets that many missed days in a row pass without breaking it.
  const streaks = [];
  let run = null;
  let misses = 0;
  kept.forEach((v, k) => {
    if (v == null) return;
    if (v === true || (v === 'skip' && h.streak.skipsKeep)) {
      misses = 0;
      if (!run) run = { from: days[k], to: days[k], length: 0 };
      run.to = days[k];
      if (v === true) run.length++;
    } else if (run && misses < h.streak.grace) {
      misses++;
    } else {
      if (run && run.length) streaks.push(run);
      run = null;
      misses = 0;
    }
  });
  if (run && run.length) streaks.push(run);
  const last = strength.length - 1;
  const doneCount = states.filter((s) => s === 'done').length;
  const current = run && run.to === days[last] ? run.length : 0;
  return { states, kept, strength, streaks, now: strength[last], month: strength[last] - strength[Math.max(0, last - 30)], year: strength[last] - strength[0], doneCount, current };
}

function catHabits(name) {
  return insight.habits.filter((h) => h.category === name);
}
function categories() {
  return [...new Set(insight.habits.map((h) => h.category))];
}
function catStrength(name) {
  const hs = catHabits(name);
  return insight.days.map((_, k) => avg(hs.map((h) => h.strength[k])));
}

// --- Page pieces ---

const head = (big, extra = '') => `<header class="page-head"><div><h1 class="big">${escapeHtml(big)}</h1>${extra}</div></header>`;
// The path to this page, like folders on a computer: tap any step to jump straight there.
// trail: [[address, name], ...] from the top down; the last name is this page.
const crumbs = (trail, here) => `<nav class="crumbs" aria-label="Where you are">${trail.map(([to, words]) =>
  `<button type="button" data-go="${to}">${escapeHtml(words)}</button><span class="crumb-sep" aria-hidden="true">${chevronRight}</span>`).join('')}<span aria-current="page">${escapeHtml(here)}</span></nav>`;
const labelRow = (left, right = '') => `<div class="label-row"><span class="label">${escapeHtml(left)}</span>${right ? `<span class="muted">${escapeHtml(right)}</span>` : ''}</div>`;
const stat = (big, small) => `<div class="stat"><b>${escapeHtml(big)}</b><span>${escapeHtml(small)}</span></div>`;
const stats = (cells) => `<div class="stats">${cells.join('')}</div>`;
const zoomRow = (name, options, current) => `<div class="zoom" role="group">${options.map((o) => `<button type="button" data-zoom="${name}" data-value="${o}" aria-pressed="${o === current}">${o}</button>`).join('')}</div>`;
const empty = (words) => `<p class="note">${escapeHtml(words)}</p>`;

// Remembered zoom levels, per chart.
const zooms = { score: 'Month', history: 'Month', catScore: 'Month' };

// --- Bucketing by week, month, quarter or year ---

function bucketKey(day, size) {
  const d = new Date(`${day}T12:00:00`);
  if (size === 'Day') return day;
  if (size === 'Week') {
    const monday = new Date(d);
    monday.setDate(d.getDate() - weekdayOf(day));
    return todayKey(monday);
  }
  if (size === 'Month') return day.slice(0, 7);
  if (size === 'Quarter') return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
  return String(d.getFullYear());
}
function bucketLabel(key, size) {
  if (size === 'Week' || size === 'Day') return fmtShort(key);
  if (size === 'Month') return new Date(`${key}-15T12:00:00`).toLocaleDateString('en-GB', { month: 'short' });
  if (size === 'Quarter') return key.slice(5);
  return key;
}
const BUCKETS = { Day: 60, Week: 26, Month: 12, Quarter: 8, Year: 5 };

function buckets(size) {
  const keys = [];
  for (const day of insight.days) {
    const key = bucketKey(day, size);
    if (keys[keys.length - 1] !== key) keys.push(key);
  }
  return keys.slice(-BUCKETS[size]);
}

// --- Habits: front page ---

function habitsFront() {
  const cats = categories();
  if (!cats.length) {
    return `<div class="side">${empty('Habits are the every-day tasks on the front page. Tick "Every day" when you add a task, and it shows here.')}</div>`;
  }
  const last = insight.days.length - 1;
  const rings = cats.map((c) => ({ label: c, v: catStrength(c)[last], colour: insight.catColours.get(c) }));
  const all = avg(insight.habits.map((h) => h.now));
  const rows = cats.map((c) => {
    const hs = catHabits(c);
    const open = !isFolded(`insight/${c}`);
    const v = catStrength(c)[last];
    return `<button type="button" class="list-row" data-go="insight/cat/${encodeURIComponent(c)}">${miniRing(v, insight.catColours.get(c))}<span class="grow">${escapeHtml(c)}</span><span class="muted">${hs.length} habit${hs.length === 1 ? '' : 's'}</span><span class="num">${pct(v)}</span>${chevronRight}</button>
      ${open ? hs.map((h) => `<button type="button" class="list-row sub" data-go="insight/habit/${h.id}">${miniRing(h.now, h.colour, 22)}<span class="grow">${escapeHtml(h.name)}</span>${beadRow(lastDays(h, 7), h.colour, 70)}<span class="num">${pct(h.now)}</span></button>`).join('') : ''}`;
  }).join('');
  return `<div class="side">
    <div style="padding-top: 14px">${ringSet(rings, pct(all), 'all habits')}</div>
    ${labelRow('Categories', 'a category = the average of its habits')}${rows}
    <div class="key"><span>${beadRow([{ state: 'done', t: 1 }], INK, 12)} done</span><span>${beadRow([{ state: 'miss' }], INK, 12)} not done</span><span>${beadRow([{ state: 'skip' }], INK, 12)} skipped</span></div>
  </div>`;
}

function lastDays(h, n) {
  return h.states.slice(-n).map((s) => ({ state: s, t: 1 }));
}

// --- Habits: one category ---

function categoryPage(name) {
  const hs = catHabits(name);
  if (!hs.length) return habitsFront();
  const colour = insight.catColours.get(name);
  const series = catStrength(name);
  const last = series.length - 1;
  const days = insight.days;
  const share = days.map((_, k) => {
    const states = hs.map((h) => h.states[k]).filter((s) => s);
    if (!states.length) return { state: null };
    const done = states.filter((s) => s === 'done').length;
    if (done) return { state: 'done', t: done / states.length };
    return { state: states.every((s) => s === 'skip') ? 'skip' : 'miss' };
  });
  const fullDays = share.slice(-30).filter((d) => d.state === 'done' && d.t === 1).length;
  // Share done per week, the last 16 weeks.
  const weeks = buckets('Week').slice(-16);
  const perWeek = weeks.map((w) => {
    const ds = share.filter((_, k) => bucketKey(days[k], 'Week') === w && share[k].state);
    return ds.length ? avg(ds.map((d) => (d.state === 'done' ? d.t : 0))) : 0;
  });
  const carry = hs.map((h) => [h, h.states.slice(-84).filter((s) => s === 'done').length]);
  return `${crumbs([['insight', 'Habits']], name)}${head(name)}<div class="side">
    <div style="padding-top: 10px">${ringSet([{ label: 'All', v: series[last], colour }, ...hs.map((h) => ({ label: h.name, v: h.now, colour: h.colour }))], pct(series[last]), `${hs.length} habits`)}</div>
    ${stats([stat(pct(series[last]), 'strength'), stat(signed(series[last] - series[Math.max(0, last - 30)]), 'this month'), stat(signed(series[last] - series[0]), 'this year'), stat(String(fullDays), 'full days, 30')])}
    ${labelRow('How much got done', '26 weeks')}${beadCalendar(days.map((d, k) => ({ day: d, ...share[k] })), colour, 'How much got done each day')}
    <div class="key"><span>${beadRow([{ state: 'done', t: 1 }], colour, 12)} all done</span><span>${beadRow([{ state: 'done', t: 0.2 }], colour, 12)} some</span><span>${beadRow([{ state: 'miss' }], colour, 12)} none done</span><span>${beadRow([{ state: 'skip' }], colour, 12)} skipped</span></div>
    ${labelRow('Share done per week', '16 weeks')}${columns(perWeek, perWeek.map((v) => Math.round(v * 100)), colour, 'Share done per week')}
    ${labelRow('Strength', '6 months')}${lineChart(series.slice(-182), 'Category strength', [monthOf(days[days.length - 182]), monthOf(days[days.length - 91]), monthOf(days[last])])}
    ${labelRow('Which habits carry it', '12 weeks')}${carry.map(([h, n]) => `<div class="bar-row"><span>${escapeHtml(h.name)}</span>${hbar(n / 84, h.colour)}<span class="num">${n} of 84</span></div>`).join('')}
    <div class="pills">${hs.map((h) => `<button type="button" class="chip" data-go="insight/habit/${h.id}">${escapeHtml(h.name)}</button>`).join('')}</div>
    <p class="options-button"><button type="button" class="ink-button" data-cat-colour="${escapeHtml(name)}">Category colour</button></p>
  </div>`;
}

// --- Habits: one habit, everything Loop shows ---

function habitPage(id) {
  const h = insight.habits.find((x) => x.id === id);
  if (!h) return habitsFront();
  const days = insight.days;
  const last = days.length - 1;
  // Strength chart, at the chosen zoom: the strength at the end of each bucket.
  const scoreKeys = buckets(zooms.score);
  const scoreVals = scoreKeys.map((key) => {
    let k = last;
    while (k > 0 && bucketKey(days[k], zooms.score) > key) k--;
    return h.strength[k];
  });
  // History: times done per bucket.
  const histKeys = buckets(zooms.history);
  const counts = histKeys.map((key) => days.filter((d, k) => h.states[k] === 'done' && bucketKey(d, zooms.history) === key).length);
  const maxCount = Math.max(1, ...counts);
  const best = [...h.streaks].sort((a, b) => b.length - a.length).slice(0, 5);
  const bestMax = Math.max(1, ...best.map((s) => s.length));
  // Frequency: done per weekday and month, the last 12 months.
  const months = buckets('Month');
  const grid = WEEKDAYS.map((_, wd) => months.map((m) => days.filter((d, k) => h.states[k] === 'done' && weekdayOf(d) === wd && d.startsWith(m)).length));
  const byWeekday = WEEKDAYS.map((_, wd) => {
    const counted = days.map((d, k) => [d, h.states[k]]).filter(([d, s]) => s && s !== 'skip' && weekdayOf(d) === wd).slice(-12);
    return counted.length ? counted.filter(([, s]) => s === 'done').length / counted.length : 0;
  });
  const cal = days.map((d, k) => ({ day: d, state: h.states[k], t: 1 }));
  return `${crumbs([['insight', 'Habits'], [`insight/cat/${encodeURIComponent(h.category)}`, h.category]], h.name)}${head(h.name, `<div class="muted">${freqWords(h.freq)}</div>`)}<div class="side">
    <div style="padding-top: 8px">${ringSet([{ label: '', v: h.now, colour: h.colour }], pct(h.now), 'strength', 180)}</div>
    ${stats([stat(pct(h.now), 'strength'), stat(signed(h.month), 'this month'), stat(signed(h.year), 'this year'), stat(String(h.doneCount), 'times')])}
    ${labelRow('Strength', 'rises slowly when you keep it up')}${zoomRow('score', ['Day', 'Week', 'Month', 'Quarter', 'Year'], zooms.score)}
    ${lineChart(scoreVals, 'Strength over time', [bucketLabel(scoreKeys[0], zooms.score), bucketLabel(scoreKeys[scoreKeys.length - 1], zooms.score)])}
    ${labelRow('History', 'times done')}${zoomRow('history', ['Week', 'Month', 'Quarter', 'Year'], zooms.history)}
    ${columns(counts.map((c) => c / maxCount), counts, h.colour, 'Times done')}
    <div class="key">${histKeys.length <= 12 ? histKeys.map((k) => `<span style="flex: 1; justify-content: center">${bucketLabel(k, zooms.history)}</span>`).join('') : `<span>${bucketLabel(histKeys[0], zooms.history)}</span><span class="spacer"></span><span>${bucketLabel(histKeys[histKeys.length - 1], zooms.history)}</span>`}</div>
    ${labelRow('Calendar', '26 weeks')}${beadCalendar(cal, h.colour, 'Calendar of days done')}
    <div class="key"><span>${beadRow([{ state: 'done', t: 1 }], h.colour, 12)} done</span><span>${beadRow([{ state: 'miss' }], h.colour, 12)} not done</span><span>${beadRow([{ state: 'skip' }], h.colour, 12)} skipped</span></div>
    ${labelRow('Best streaks', h.current ? `now: ${h.current} day${h.current === 1 ? '' : 's'}` : '')}
    ${best.length ? best.map((s) => `<div class="bar-row"><span>${fmtShort(s.from)} to ${fmtShort(s.to)}</span>${hbar(s.length / bestMax, h.colour)}<span class="num">${s.length}</span></div>`).join('') : empty('No streaks yet.')}
    ${labelRow('Which days', 'share done, last 12 of each weekday')}${flower(byWeekday, WEEKDAYS, h.colour, 'Share done by weekday')}
    ${labelRow('Frequency', 'times done by weekday and month')}${dotMatrix(grid, WEEKDAYS, months.map((m) => bucketLabel(m, 'Month')[0]), h.colour, 'Times done by weekday and month')}
    <p class="options-button"><button type="button" class="ink-button" data-habit-options="${h.id}">Habit options</button></p>
    <p class="note">Strength works like Loop Habit Tracker's score: it rises slowly when you keep a habit and sinks slowly when you don't, so one missed day barely moves it. Skipped days leave it where it was.</p>
  </div>`;
}

function openHabitOptions(id) {
  const h = insight.habits.find((x) => x.id === id);
  const types = [['daily', 'Every day'], ['week', 'Times a week'], ['month', 'Times a month'], ['every', 'Every few days']];
  const html = `<label class="field"><span>Category</span><input type="text" name="category" value="${escapeHtml(h.category)}" autocomplete="off" list="cat-names"><datalist id="cat-names">${categories().map((c) => `<option value="${escapeHtml(c)}">`).join('')}</datalist></label>
    <fieldset class="field"><legend>How often</legend><div class="choices">${types.map(([v, n]) => `<label><input type="radio" name="freq" value="${v}"${h.freq.type === v ? ' checked' : ''}><span>${n}</span></label>`).join('')}</div></fieldset>
    <label class="field"><span>How many (for times a week or month, or every how many days)</span><input type="number" name="n" min="1" max="30" value="${h.freq.n || 1}"></label>
    <h3>Streaks</h3>
    <label class="check"><input type="checkbox" name="skipsKeep"${h.streak.skipsKeep ? ' checked' : ''}><span>Skipped days keep a streak going</span></label>
    <fieldset class="field"><legend>Missed days a streak can survive</legend><div class="choices">${[0, 1, 2].map((g) => `<label><input type="radio" name="grace" value="${g}"${h.streak.grace === g ? ' checked' : ''}><span>${g === 0 ? 'none' : g}</span></label>`).join('')}</div></fieldset>
    <h3>Colour</h3><label class="check"><input type="checkbox" name="useOwn"${h.ownColour ? ' checked' : ''}><span>Its own colour, instead of its category's</span></label>
    ${colourPicker(h.colour)}`;
  openSheet(escapeHtml(h.name), html, async (form) => {
    await putItem({
      id: `habit-${h.id}`, kind: 'habit', day: '', taskId: h.id,
      category: form.elements.category.value.trim() || h.category,
      colour: form.elements.useOwn.checked ? form.elements.colour.value.toUpperCase() : '',
      freq: { type: form.elements.freq.value, n: Math.max(1, Number(form.elements.n.value) || 1) },
      streak: { skipsKeep: form.elements.skipsKeep.checked, grace: Number(form.elements.grace.value) || 0 },
    });
    showInsight(location.hash.slice(1));
    showBackupInfo();
  });
}

function openCategoryColour(name) {
  openSheet(`${escapeHtml(name)} colour`, `<p class="muted">Its habits take this colour, unless they have their own.</p>${colourPicker(insight.catColours.get(name))}`, async (form) => {
    await putItem({ id: `habit-cat-${slug(name)}`, kind: 'habit-cat', day: '', name, colour: form.elements.colour.value.toUpperCase() });
    showInsight(location.hash.slice(1));
  });
}

// --- Health ---

// How good a day was for an item, 0..1 (higher is better), or null if nothing was logged.
// For symptoms and avoidance, higher means worse, so "load" is used instead.
function itemValues(item) {
  const top = SCALES[item.scale].length - 1;
  return insight.days.map((d) => {
    const v = insight.health.get(d).get(item.id);
    return v ? v / top : null;
  });
}
const loggedDay = (day) => [...insight.health.get(day).keys()].length > 0;

function measureRows(items, n = 14) {
  const days = insight.days.slice(-n);
  return items.map((item) => {
    const top = SCALES[item.scale].length - 1;
    const vals = days.map((d) => insight.health.get(d).get(item.id) || 0);
    const beads = vals.map((v, k) => (v ? { state: 'done', t: v / top } : { state: loggedDay(days[k]) ? 'miss' : 'none' }));
    const lastV = [...vals].reverse().find((v) => v);
    return `<button type="button" class="list-row" data-go="insight/item/${encodeURIComponent(item.id)}"><span class="grow">${escapeHtml(item.name)}</span>${beadRow(beads, item.colour, 120)}<span class="num">${lastV ? SCALES[item.scale][lastV] : ''}</span>${chevronRight}</button>`;
  }).join('');
}

function symptomItems() {
  return insight.healthItems.filter((i) => i.scale === 'symptom');
}
function symptomLoad(day) {
  const answers = insight.health.get(day);
  return symptomItems().reduce((sum, i) => sum + (answers.get(i.id) || 0), 0);
}

// Each day's symptom load as a heat map cell, scaled so the heaviest day shown is the most.
function loadCells(days) {
  const loads = days.map((d) => symptomLoad(d));
  const max = Math.max(1, ...loads);
  return days.map((d, k) => (loads[k] ? { t: loads[k] / max } : loggedDay(d) ? { t: 0 } : null));
}

function healthFront() {
  const evening = insight.list.checkins.evening;
  const morning = insight.list.checkins.morning;
  const measures = [...evening, ...morning.filter((m) => m.scale !== 'mood' && !evening.some((e) => e.name === m.name))];
  const recent = insight.days.slice(-30);
  const rings = measures.map((m) => {
    const vals = recent.map((d) => insight.health.get(d).get(m.id)).filter(Boolean);
    return { label: m.name, v: vals.length ? avg(vals) / (SCALES[m.scale].length - 1) : 0, colour: m.colour };
  });
  return `<div class="side">
    <div style="padding-top: 14px">${ringSet(rings, '30 days', 'average, full ring = best')}</div>
    ${labelRow('Last 14 days', 'bigger, deeper = better / more')}${measureRows(measures)}
    <button type="button" class="list-row" data-go="insight/symptoms"><span class="grow">Symptom load</span>${heatRow(loadCells(insight.days.slice(-14)), 120)}<span class="num">today</span>${chevronRight}</button>
    <button type="button" class="list-row" data-go="insight/links"><span class="grow">What goes together</span><span class="muted">after a poor night, and more</span>${chevronRight}</button>
  </div>`;
}

// One item over time: calendar, spread across its levels, weekdays, and (for mood) feelings.
function itemPage(id) {
  const item = insight.healthItems.find((i) => i.id === id);
  if (!item) return healthFront();
  const top = SCALES[item.scale].length - 1;
  const days = insight.days;
  const vals = days.map((d) => insight.health.get(d).get(item.id) || 0);
  const cal = days.map((d, k) => ({ day: d, ...(vals[k] ? { state: 'done', t: vals[k] / top } : { state: loggedDay(d) ? 'miss' : 'none' }) })).slice(-91);
  const counts = SCALES[item.scale].slice(1).map((_, i) => vals.slice(-91).filter((v) => v === i + 1).length);
  const total = Math.max(1, counts.reduce((a, b) => a + b, 0));
  const byWeekday = WEEKDAYS.map((_, wd) => {
    const vs = days.map((d, k) => [d, vals[k]]).filter(([d, v]) => v && weekdayOf(d) === wd).slice(-13).map(([, v]) => v);
    return vs.length ? avg(vs) / top : 0;
  });
  const isSymptom = item.scale === 'symptom';
  let extra = '';
  if (item.scale === 'mood') {
    const tally = new Map();
    for (const d of days.slice(-91)) for (const [k, v] of insight.health.get(d)) if (k.startsWith('feel/') && v === true) tally.set(k.slice(5), (tally.get(k.slice(5)) || 0) + 1);
    const familyOf = new Map(EMOTION_FAMILIES.flatMap(([f, ws]) => ws.map((w) => [w, f])));
    const topFeel = [...tally].sort((a, b) => b[1] - a[1]).slice(0, 6);
    const maxFeel = Math.max(1, ...topFeel.map(([, n]) => n));
    extra = `${labelRow('Feelings you picked most', '13 weeks')}${topFeel.map(([w, n]) => `<div class="bar-row"><span>${escapeHtml(w)}</span>${hbar(n / maxFeel, EMOTION_COLOURS[familyOf.get(w)] || item.colour)}<span class="num">${n}</span></div>`).join('') || empty('No feelings picked yet.')}`;
  }
  return `${crumbs([['insight/health', 'Health'], ...(isSymptom ? [['insight/symptoms', 'Symptoms']] : [])], item.name)}${head(item.name, item.group ? `<div class="muted">${escapeHtml(item.group)}</div>` : '')}<div class="side">
    ${labelRow('13 weeks', isSymptom ? 'bigger, deeper = worse' : 'bigger, deeper = better')}${beadCalendar(cal, item.colour, `${item.name} calendar`, 13)}
    <div class="key"><span>${beadRow([{ state: 'miss' }], item.colour, 12)} ${isSymptom ? 'none' : 'not logged'}</span><span>${beadRow([{ state: 'none' }], item.colour, 12)} nothing logged that day</span></div>
    ${labelRow('How the days spread', 'days at each level')}
    <div style="display: flex; gap: 4px; align-items: center">${counts.map((n, i) => (n ? `<span style="flex: ${n / total}; height: 14px; border-radius: 7px; background: ${shade(item.colour, 0.2 + (0.8 * i) / Math.max(1, top - 1))}"></span>` : '')).join('')}</div>
    <div class="key">${counts.map((n, i) => `<span>${n} ${SCALES[item.scale][i + 1]}</span>`).join('')}</div>
    ${labelRow('By weekday', 'average')}${flower(byWeekday, WEEKDAYS, item.colour, 'Average by weekday')}
    ${extra}
  </div>`;
}

function symptomsPage() {
  const days = insight.days;
  const items = symptomItems();
  const cal = days.slice(-182);
  const calCells = loadCells(cal);
  // Each symptom by week: how heavy it was that week, the heaviest week of any symptom = the most.
  const weeks = buckets('Week').slice(-16);
  const weekDays = weeks.map((w) => days.filter((d) => bucketKey(d, 'Week') === w));
  const shown = items.map((i) => [i, weekDays.map((ds) => ds.reduce((s, d) => s + (insight.health.get(d).get(i.id) || 0), 0))])
    .filter(([, sums]) => sums.some(Boolean)).sort((a, b) => b[1].reduce((x, y) => x + y, 0) - a[1].reduce((x, y) => x + y, 0));
  const maxWeek = Math.max(1, ...shown.flatMap(([, sums]) => sums));
  const loggedWeek = weekDays.map((ds) => ds.some(loggedDay));
  const grid = shown.map(([, sums]) => sums.map((v, c) => (v ? { t: v / maxWeek } : loggedWeek[c] ? { t: 0 } : null)));
  // Each month named over its first Monday.
  const weekNames = weeks.map((w) => (Number(w.slice(8)) <= 7 ? bucketLabel(w.slice(0, 7), 'Month') : ''));
  const recent = days.slice(-90);
  const rows = items.map((i) => {
    const vs = recent.map((d) => insight.health.get(d).get(i.id) || 0).filter(Boolean);
    const common = vs.length ? SCALES.symptom[Math.round(avg(vs))] : '';
    return [i, vs.length, common];
  }).filter(([, n]) => n).sort((a, b) => b[1] - a[1]);
  return `${crumbs([['insight/health', 'Health']], 'Symptoms')}${head('Symptoms')}<div class="side">
    ${labelRow('Symptom load', '26 weeks')}${heatCalendar(cal.map((day, k) => ({ day, cell: calCells[k] })), 'Symptom load heat map, a square per day')}
    ${heatKey()}
    ${labelRow('Each symptom by week', '16 weeks')}${shown.length ? heatGrid(grid, shown.map(([i]) => i.name), weekNames, 'Each symptom by week') : empty('No symptoms logged in the last 16 weeks.')}
    ${labelRow('How often, how bad', '90 days')}
    ${rows.length ? rows.map(([i, n, common]) => `<button type="button" class="list-row" data-go="insight/item/${encodeURIComponent(i.id)}"><span class="grow">${escapeHtml(i.name)}</span><span style="width: 90px; display: grid">${hbar(n / 90, i.colour)}</span><span class="num" style="min-width: 110px">${n} days · ${common}</span></button>`).join('') : empty('No symptoms logged in the last 90 days.')}
  </div>`;
}

// What goes together: on days after X, how much of each thing showed up, compared with other days.
// These show things that move together, not what causes what.
function linksPage() {
  const sleep = insight.healthItems.find((i) => i.id === 'sleep') || insight.list.checkins.morning[0];
  const pivots = [['poor-sleep', 'Sleep'], ...insight.healthItems.filter((i) => i.scale === 'symptom').slice(0, 3).map((i) => [i.id, i.name])];
  const pivot = zooms.links || 'poor-sleep';
  const days = insight.days.slice(-182);
  const isPivot = (d) => {
    const a = insight.health.get(d);
    return pivot === 'poor-sleep' ? a.get(sleep.id) === 1 : (a.get(pivot) || 0) >= 2;
  };
  const isCalm = (d) => {
    const a = insight.health.get(d);
    return pivot === 'poor-sleep' ? a.get(sleep.id) === 3 : !(a.get(pivot) || 0);
  };
  const nextOf = (d) => {
    const k = insight.days.indexOf(d);
    return insight.days[k + 1];
  };
  const after = days.filter(isPivot).map(nextOf).filter(Boolean);
  const otherwise = days.filter(isCalm).map(nextOf).filter(Boolean);
  const targets = insight.healthItems.filter((i) => i.id !== pivot && i.id !== sleep.id && (i.scale === 'symptom' || i.group === 'Check-in')).slice(0, 12);
  const score = (i, set) => avg(set.map((d) => (insight.health.get(d).get(i.id) || 0) / (SCALES[i.scale].length - 1)));
  const rows = targets.map((i) => [i, score(i, after), score(i, otherwise)]).sort((a, b) => Math.abs(b[1] - b[2]) - Math.abs(a[1] - a[2])).slice(0, 7);
  const pivotWords = pivot === 'poor-sleep' ? 'a poor night' : `a bad day of ${insight.healthItems.find((i) => i.id === pivot).name.toLowerCase()}`;
  return `${crumbs([['insight/health', 'Health']], 'What goes together')}${head('What goes together', '<div class="muted">the last 6 months</div>')}<div class="side">
    <div class="pills">${pivots.map(([id, n]) => `<button type="button" class="chip" aria-pressed="${id === pivot}" data-links="${id}"${id === pivot ? ` style="background: ${INK}"` : ''}>${escapeHtml(n)}</button>`).join('')}</div>
    ${labelRow(`The day after ${pivotWords}`, `${after.length} times`)}
    ${rows.map(([i, a, b]) => `<div class="bar-row"><span>${escapeHtml(i.name)}</span><span style="display: grid; gap: 3px">${hbar(a, i.colour)}${hbar(b, COLOURS.compare)}</span><span class="num">${a > b + 0.05 ? 'more' : a < b - 0.05 ? 'less' : 'same'}</span></div>`).join('') || empty('Not enough days logged yet.')}
    <div class="key"><span>coloured: the day after ${escapeHtml(pivotWords)}</span><span>grey: after a ${pivot === 'poor-sleep' ? 'good night' : 'day without it'}</span></div>
    <p class="note">These show things that move together, not what causes what.</p>
  </div>`;
}

// --- Avoidance ---

function areas() {
  return insight.healthItems.filter((i) => i.scale === 'approach');
}
// 1 = approached, 0 = avoided, null = nothing logged.
function areaValues(id) {
  return insight.days.map((d) => {
    const v = insight.health.get(d).get(id);
    return v === 1 ? 1 : v === 2 ? 0 : null;
  });
}
function showingUp(ids) {
  const series = ids.map((id) => strengthSeries(areaValues(id), 0.6));
  return insight.days.map((_, k) => avg(series.map((s) => s[k])));
}

function avoidFront() {
  const list = areas();
  if (!list.length) return `<div class="side">${empty('Add areas to an Avoidance folder on the Health page (scale: approach or avoid), and they show here.')}</div>`;
  const colour = list[0].colour;
  const deep = COLOURS.hiding;
  const s = showingUp(list.map((a) => a.id));
  const last = s.length - 1;
  const all = list.flatMap((a) => areaValues(a.id));
  return `<div class="side">
    <div style="display: flex; align-items: baseline; gap: 8px; padding-top: 12px"><b style="font-family: Lora, serif; font-size: 28px; font-weight: 500">${pct(s[last])}</b><span class="muted">showing-up score</span></div>
    ${horizon(s[last], COLOURS.showingUp, deep, 'Showing up, above the line; hiding, below')}
    ${stats([stat(signed(s[last] - s[Math.max(0, last - 30)]), 'this month'), stat(signed(s[last] - s[0]), 'this year'), stat(String(all.filter((v) => v === 1).length), 'approached'), stat(String(all.filter((v) => v === 0).length), 'avoided')])}
    ${labelRow('Areas', 'last 7 days')}
    ${list.map((a) => {
      const sa = strengthSeries(areaValues(a.id), 0.6);
      const week = areaValues(a.id).slice(-7).map((v) => (v == null ? { state: 'none' } : { state: 'done', t: 1, colour: v ? COLOURS.showingUp : deep }));
      return `<button type="button" class="list-row" data-go="insight/area/${encodeURIComponent(a.id)}">${miniSun(sa[last], COLOURS.showingUp, deep)}<span class="grow">${escapeHtml(a.name)}</span>${beadRow(week, colour, 80)}<span class="num">${pct(sa[last])}</span>${chevronRight}</button>`;
    }).join('')}
    <p class="note">The score works like Loop's strength: it rises slowly when you show up and sinks slowly when you hide. Days you logged nothing leave it where it was.</p>
  </div>`;
}

function areaPage(id) {
  const a = areas().find((x) => x.id === id);
  if (!a) return avoidFront();
  const deep = COLOURS.hiding;
  const vals = areaValues(a.id);
  const s = strengthSeries(vals, 0.6);
  const last = s.length - 1;
  const days = insight.days;
  const cal = days.map((d, k) => ({ day: d, ...(vals[k] == null ? { state: 'none' } : { state: 'done', t: 1, colour: vals[k] ? COLOURS.showingUp : deep }) })).slice(-91);
  const weeks = buckets('Week').slice(-12);
  const weekShares = weeks.map((w) => {
    const vs = vals.filter((v, k) => v != null && bucketKey(days[k], 'Week') === w);
    return vs.length ? avg(vs) : null;
  });
  const weekLabels = weeks.map((w) => {
    const vs = vals.filter((v, k) => v != null && bucketKey(days[k], 'Week') === w);
    return `${vs.filter((v) => v).length}/${vs.length}`;
  });
  // Longest runs of showing up (approached days in a row; days with nothing logged don't break a run).
  const runs = [];
  let run = null;
  vals.forEach((v, k) => {
    if (v === 1) {
      if (!run) run = { from: days[k], to: days[k], length: 0 };
      run.to = days[k];
      run.length++;
    } else if (v === 0) {
      if (run) runs.push(run);
      run = null;
    }
  });
  if (run) runs.push(run);
  const best = runs.sort((x, y) => y.length - x.length).slice(0, 4);
  const bestMax = Math.max(1, ...best.map((r) => r.length));
  const loggedByWeekday = WEEKDAYS.map((_, wd) => vals.filter((v, k) => v != null && weekdayOf(days[k]) === wd).slice(-12));
  const avoidedByWeekday = loggedByWeekday.map((vs) => (vs.length ? 1 - avg(vs) : 0));
  const byWeekday = WEEKDAYS.map((_, wd) => {
    const vs = loggedByWeekday[wd];
    return vs.length ? avg(vs) : 0;
  });
  const months = buckets('Month').slice(-4);
  return `${crumbs([['insight/avoid', 'Avoidance']], a.name)}${head(a.name)}<div class="side">
    <div style="display: flex; align-items: baseline; gap: 8px; padding-top: 12px"><b style="font-family: Lora, serif; font-size: 28px; font-weight: 500">${pct(s[last])}</b><span class="muted">score</span></div>
    ${horizon(s[last], COLOURS.showingUp, deep, `${a.name}: showing up`, 120, 40)}
    ${stats([stat(signed(s[last] - s[Math.max(0, last - 30)]), 'this month'), stat(signed(s[last] - s[0]), 'this year'), stat(String(vals.filter((v) => v === 1).length), 'approached'), stat(String(vals.filter((v) => v === 0).length), 'avoided')])}
    ${labelRow('Score', '6 months')}${lineChart(s.slice(-182), 'Score over time', [monthOf(days[days.length - 182]), monthOf(days[last])])}
    ${labelRow('Days', '13 weeks')}${beadCalendar(cal, a.colour, 'Days approached or avoided', 13)}
    <div class="key"><span>${beadRow([{ state: 'done', t: 1, colour: COLOURS.showingUp }], a.colour, 12)} approached</span><span>${beadRow([{ state: 'done', t: 1, colour: deep }], a.colour, 12)} avoided</span><span>${beadRow([{ state: 'none' }], a.colour, 12)} nothing logged</span></div>
    ${labelRow('Sun path', '12 weeks · showed up / logged')}${sunPath(weekShares, weekLabels, COLOURS.showingUp, deep, 'Each week, above the line when you mostly showed up')}
    ${labelRow('Longest runs of showing up')}${best.map((r) => `<div class="bar-row"><span>${fmtShort(r.from)} to ${fmtShort(r.to)}</span>${hbar(r.length / bestMax, COLOURS.showingUp)}<span class="num">${r.length}</span></div>`).join('') || empty('No runs yet.')}
    ${labelRow('Which days you showed up', 'last 12 of each weekday')}${flower(byWeekday, WEEKDAYS, COLOURS.showingUp, 'Showing up by weekday')}
    ${labelRow('Which days you avoided', 'last 12 of each weekday')}${flower(avoidedByWeekday, WEEKDAYS, deep, 'Avoiding by weekday')}
    ${labelRow('Months')}<div style="display: grid; grid-template-columns: repeat(4, 1fr); text-align: center">${months.map((m) => {
      const vs = vals.filter((v, k) => v != null && days[k].startsWith(m));
      const share = vs.length ? avg(vs) : 0.5;
      return `<div>${miniSun(share, COLOURS.showingUp, deep, 44)}<div style="font-size: 12px">${bucketLabel(m, 'Month')}</div><div class="muted" style="font-size: 11px">${vs.length ? `${pct(share)} approached` : 'nothing logged'}</div></div>`;
    }).join('')}</div>
  </div>`;
}

// --- Drawing ---

async function showInsight(route) {
  await loadInsight();
  const parts = route.split('/');
  const [, page, arg] = parts;
  const id = arg ? decodeURIComponent(parts.slice(2).join('/')) : '';
  let html;
  if (page === 'health') html = healthFront();
  else if (page === 'avoid') html = avoidFront();
  else if (page === 'cat') html = categoryPage(id);
  else if (page === 'habit') html = habitPage(id);
  else if (page === 'item') html = itemPage(id);
  else if (page === 'symptoms') html = symptomsPage();
  else if (page === 'links') html = linksPage();
  else if (page === 'area') html = areaPage(id);
  else html = habitsFront();
  $('insight-page').innerHTML = html;
  const section = page === 'avoid' || page === 'area' ? 'Avoidance' : ['health', 'item', 'symptoms', 'links'].includes(page) ? 'Health' : 'Habits';
  $('insight-section-name').textContent = section;
  for (const b of $('insight-sections').children) b.setAttribute('aria-current', b.textContent === section ? 'page' : 'false');
  $('insight-sections').hidden = true;
  $('insight-section').setAttribute('aria-expanded', 'false');
  showBackupInfo();
}

// The Habits / Health / Avoidance menu, top left.
$('insight-section').addEventListener('click', () => {
  const open = $('insight-sections').hidden;
  $('insight-sections').hidden = !open;
  $('insight-section').setAttribute('aria-expanded', String(open));
});
$('insight-sections').addEventListener('click', (event) => {
  const go = event.target.closest('[data-go]');
  if (go) location.hash = go.dataset.go;
  $('insight-sections').hidden = true;
});

$('insight-page').addEventListener('click', (event) => {
  const go = event.target.closest('[data-go]');
  const zoom = event.target.closest('[data-zoom]');
  const options = event.target.closest('[data-habit-options]');
  const catColour = event.target.closest('[data-cat-colour]');
  const links = event.target.closest('[data-links]');
  if (go) {
    location.hash = go.dataset.go;
  } else if (zoom) {
    zooms[zoom.dataset.zoom] = zoom.dataset.value;
    showInsight(location.hash.slice(1));
  } else if (options) {
    openHabitOptions(options.dataset.habitOptions);
  } else if (catColour) {
    openCategoryColour(catColour.dataset.catColour);
  } else if (links) {
    zooms.links = links.dataset.links;
    showInsight(location.hash.slice(1));
  }
});
