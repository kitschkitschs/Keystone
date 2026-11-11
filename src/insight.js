// ---------- Insight (2026-11-04: "Add the insight pages back") ----------
// The old Daybook Insight pages (landing tiles, Lifestyle circles, Health, Symptoms, What goes together, Avoidance,
// Experiments), now read from v3's items. Circles come from tags and from the Home and Studies categories.
// Only repeatable items with Show in Insight on get their own ring and page; everything else in a circle
// (one-off tasks, items with Show in Insight off) counts in that circle's Other ring.
const INS_N = 365;
let insCache = null;
const insHash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const insRand = (a, b) => (insHash(a + '|' + b) % 100000) / 100000;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const iavg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const ITICK = ['task', 'step', 'routine'];
// trackers a circle can count (2026-11-08: Insight gathers items from tags, so a Sleep tag brings Sleep quality and the sleep tags too)
const insTrkOk = (k) => { const it = I(k); return !!it && it.type === 'tracker' && (SCALES[it.scale] || ['yesno', 'avoid'].includes(it.scale)); };
const insCountable = (k) => !!I(k) && !I(k).brk && (ITICK.includes(I(k).type) || insTrkOk(k));
const insTagged = (tags) => Object.keys(M.items).filter((k) => (I(k).tags || []).some((t) => (tags || []).includes(t)));
// how often an item is meant to happen: num0 times in den0 days (Loop's frequency)
function insFreq(id) { const it = I(id); let w = it.when;
  if (it.type === 'step') { const r = Object.keys(M.items).find((k) => I(k).type === 'routine' && (I(k).steps || []).includes(id)); w = r ? I(r).when : { mode: 'every', n: 1 }; }
  w = w || {}; const n = Math.max(1, w.n || 1);
  if (w.mode === 'days') return [Math.max(1, (w.days || []).length), 7 * n];
  if (w.mode === 'month') return [1, 30 * n]; if (w.mode === 'year') return [1, 365 * n];
  if (w.mode === 'every') return [1, n]; return [1, 7]; }
const detailed = (id) => { const it = I(id); return it && (it.type === 'step' || repeatable(it)); };

// Example history for Insight only (never saved, never shown outside Insight), while the example items are in.
// Tick items get it only before my first real log day, so my own ticks stay honest; health answers fill the days I didn't log.
let insG = null; // the example mood curve, so sample feelings follow the same good and bad days
function insSample(days) {
  const S0 = {}; insG = null; if (!M.example) return S0;
  const from = days.length - 150;
  let g = 0.55; const G0 = days.map((d, k) => { g = clamp01(g * 0.6 + 0.4 * (0.25 + 0.6 * insRand('g', d))); return g; }); insG = G0;
  const ids = Object.keys(M.items);
  days.forEach((d, k) => { if (k < from || d >= T0) return; const o = S0[d] = {}; const gd = G0[k], gy = k ? G0[k - 1] : gd;
    ids.forEach((id) => { const it = I(id); const r = insRand(id, d);
      if (it.type === 'tracker') { const sc = it.scale;
        if (SCALES[sc] && sc !== 'symptom3') { if (r < 0.12) return; const n = SCALES[sc].length; const base = /sleep/i.test(it.name) ? gd : 0.6 * gd + 0.4 * gy;
          o[id] = 1 + Math.round((n - 1) * clamp01(base + (insRand(id + 'n', d) - 0.5) * 0.5)); }
        else if (sc === 'symptom3') { if (r < (1 - gd) * 0.55) o[id] = 1 + Math.min(2, Math.floor((1 - gd) * 3 * insRand(id + 's', d) + (1 - gd))); }
        else if (sc === 'avoid') { if (r < 0.85) o[id] = insRand(id + 'a', d) < 0.3 + 0.5 * gd ? 'faced' : 'avoided'; }
        else if (sc === 'yesno') { if (r < 0.22) o[id] = 'yes'; }
        return; }
      if (!ITICK.includes(it.type) || d >= addDays(T0, -7) || (M.log[d] || {})[id] !== undefined) return;
      if (it.type !== 'step' && !repeatable(it)) return;
      if (it.type === 'routine') return; // a routine is done when its steps are
      const [a, b] = insFreq(id); const p = Math.min(0.95, (a / b) * (0.55 + 0.6 * gd));
      if (r < p) { const q = insRand(id + 'm', d); o[id] = !it.overdo ? 'done' : q < (1 - gd) * 0.35 ? 'much:inert' : q > 1 - gd * 0.2 ? 'much:hyper' : 'done'; } });
  });
  subjIds().forEach((sj) => sIds(sj).forEach((id) => days.forEach((d, k) => { if (k < from || d >= addDays(T0, -7) || !S0[d]) return; if (insRand(id + 'st', d) < 0.12 + 0.12 * G0[k]) S0[d][id] = S0[d][id] || 'done'; })));
  return S0;
}
const insVal = (D, d, id) => { const v = (M.log[d] || {})[id]; return v !== undefined ? v : (D.sample[d] || {})[id]; };
function insDone(D, id, d) { const it = I(id); if (!it) return false;
  if (it.type === 'routine') return (it.steps || []).length ? it.steps.every((s) => insVal(D, d, s)) : !!insVal(D, d, id);
  if (it.type === 'slot') return isDone(id, d);
  if (minOn([id], d) > 0) return true; return !!insVal(D, d, id); }

function insCircles() {
  const C = []; const add = (key, name, color, ids, mine) => { ids = [...new Set(ids)].filter(insCountable); if (ids.length || mine) C.push({ key, name, color, ids, mine }); };
  // the owner, 2026-11-11: only Chores and Studies get a circle by themselves; every tag gets one, with every item that carries it
  add('home:chores', 'Chores', '#EDBB3A', (typeof roomIds === 'function' ? roomIds().flatMap(kidsOf) : []).concat(kidsOf('g-oneoff')));
  add('study', studyName(), (M.areas.study || {}).color || '#3FAFA6', subjIds().flatMap(sIds)); if (C.length && C[C.length - 1].key === 'study') C[C.length - 1].subjects = subjIds().filter((sj) => sIds(sj).length);
  Object.entries(M.tags || {}).forEach(([t, n]) => { const ids = insTagged([t]).filter(insCountable); if (ids.length) add('tag:' + t, n, colorOf(ids[0]), ids); });
  // the built-in circles can be set up too (2026-11-08): my own name and my own pick of things
  const E = M.settings.insEdit || {}; C.forEach((c) => { const e = E[c.key]; if (!e) return; if (e.name) c.name = e.name;
    if (e.ids || e.tags) { c.ids = [...new Set((e.ids || []).concat(insTagged(e.tags)))].filter(insCountable); c.set = true; delete c.subjects; } });
  // circles I make and set up myself (2026-11-08)
  insMine().forEach((u) => add('u:' + u.id, u.name, u.color || '#9A9387', (u.ids || []).concat(insTagged(u.tags)), true));
  const oc = M.settings.insCols || {}; C.forEach((c) => { if (oc['c:' + c.key]) c.color = oc['c:' + c.key]; });
  return C;
}

function insightData() {
  const key = JSON.stringify([T0, Object.keys(M.log).length, (M.settings.exps || []).length, M.example, M.settings.insCols || {}, insMine(), M.settings.insEdit || {}, M.settings.insHealth || null, M.tags || {}]) + insHash(JSON.stringify(M.log) + JSON.stringify(M.study || {}) + JSON.stringify(M.feel || {}) + JSON.stringify(M.items));
  if (insCache && insCache.key === key) return insCache.D;
  const days = Array.from({ length: INS_N }, (_, k) => addDays(T0, k - INS_N + 1));
  const D = { days, N: INS_N, last: INS_N - 1 }; D.sample = insSample(days);
  const anyData = days.map((d) => !!((M.log[d] && Object.keys(M.log[d]).length) || (D.sample[d] && Object.keys(D.sample[d]).length) || studyRows(d).length));
  const first = anyData.indexOf(true); D.first = first;
  const trackers = Object.keys(M.items).filter((k) => I(k).type === 'tracker');
  // feelings: my words per day; while the example items are in, Insight alone adds sample words on days I didn't pick any (never saved)
  D.fams = feelSet().filter(([f]) => !['Dysregulation', 'Symptomatic', 'Dysregulated'].includes(f)).map(([f, c, ws]) => ({ f, c: feelCol(f, c), ws })); // Dysregulation is a symptom, not a feeling (2026-11-08)
  D.feel = days.map((d, k) => { const w = M.feel[d] || []; if (w.length || !insG || k < days.length - 150 || d >= T0 || insRand('fd', d) < 0.3) return w;
    const up = clamp01((insG[k] - 0.3) / 0.5);
    const out = []; for (let i = 0, nW = 1 + Math.floor(insRand('fn', d) * 3); i < nW; i++) { const pool = insRand('fp' + i, d) < up ? ['Joyful', 'Peaceful', 'Powerful'] : ['Sad', 'Scared', 'Mad']; const fam = D.fams.find((x) => x.f === pool[Math.floor(insRand('ff' + i, d) * pool.length)]) || D.fams[0];
      const w2 = fam.ws[Math.floor(insRand('fw' + i, d) * fam.ws.length)]; if (!out.includes(w2)) out.push(w2); } return out; });
  // a health day = any tracker answered that day, or any feeling picked
  D.logged = days.map((d, k) => trackers.some((t) => insVal(D, d, t) !== undefined) || !!D.feel[k].length);
  // habits: Loop Habit Tracker's score, streaks as in the old Daybook (a skipped day breaks a streak)
  const habit = (id, statesIn) => { const it = I(id); const [num0, den0] = statesIn ? [1, 7] : insFreq(id);
    const made = it.made || days[0]; const k0 = statesIn ? Math.max(0, first) : Math.max(0, first, days.indexOf(made) >= 0 ? days.indexOf(made) : 0);
    const states = statesIn || days.map((d, k) => k < k0 || first < 0 || d > T0 ? 'skip' : insDone(D, id, d) ? 'done' : 'miss');
    const daily = num0 / den0 >= 1; const num = daily ? num0 : num0 * 2, den = daily ? den0 : den0 * 2; // Loop doubles both only when less than daily
    const m = Math.pow(0.5, Math.sqrt(Math.min(1, num0 / den0)) / 13);
    let s = 0, sum = 0; const strength = states.map((x, k) => { if (k < k0 || first < 0) return 0;
      if (x === 'done') sum++; if (k - den >= k0 && states[k - den] === 'done') sum--;
      if (x !== 'skip') s = s * m + (1 - m) * Math.min(1, sum / num); return s; });
    const covered = states.map((x) => x === 'done');
    if (den0 > 1) { const ks = states.map((x, k) => x === 'done' ? k : -1).filter((k) => k >= 0);
      ks.forEach((k, j) => { const e = ks[j + num0 - 1]; if (e !== undefined && e - k < den0) for (let q = k; q < Math.min(days.length, k + den0); q++) covered[q] = true; }); }
    const streaks = []; let run = null;
    states.forEach((x, k) => { if (k < k0 || first < 0) return;
      if (covered[k] && x !== 'skip') { if (!run) run = { from: days[k], to: days[k], length: 0 }; run.to = days[k]; run.length++; }
      else { if (run) streaks.push(run); run = null; } });
    if (run) streaks.push(run);
    // today not ticked yet doesn't end the streak I'm on
    const prev = streaks[streaks.length - 1]; const current = run ? run.length : states[days.length - 1] === 'miss' && prev && prev.to === days[days.length - 2] ? prev.length : 0;
    return { id, name: it.name, states, strength, streaks, current, k0, freq: [num0, den0] }; };
  // On time (the owner, 2026-11-11): chores and studies score on being done on time. A thing with a rhythm of n days is on time on a day
  // when it was last done n days ago or less (a new one gets n days first); a deadline is on time until it passes with the task not done.
  const kStart = (id) => { const made = I(id).made || days[0]; return Math.max(0, first, days.indexOf(made) >= 0 ? days.indexOf(made) : 0); };
  const onTime = (id, n) => { const k0 = kStart(id); let lk = null; return days.map((d, k) => { if (first < 0 || k < k0 || d > T0) return null; if (insDone(D, id, d)) lk = k; return (lk == null ? k - k0 : k - lk) <= n ? 1 : 0; }); };
  const byDeadline = (id, dl) => { const k0 = kStart(id); let dn = false; return days.map((d, k) => { if (first < 0 || k < k0 || d > T0) return null; if (insDone(D, id, d)) dn = true; return d > dl && !dn ? 0 : 1; }); };
  const smooth = (vals) => { let v = 0, seen = false; const m = Math.pow(0.5, 1 / 13); return vals.map((x) => { if (x == null) return v; v = seen ? v * m + (1 - m) * x : x; seen = true; return v; }); };
  D.habits = {}; D.circles = insCircles().map((c) => { const tick = c.ids.filter((k) => ITICK.includes(I(k).type)); c.trkIds = c.ids.filter(insTrkOk); const every = c.key.startsWith('tag:') || c.mine || c.set; const det = tick.filter((k) => every || detailed(k)); const rest = tick.filter((k) => !every && !detailed(k));
    det.forEach((k) => { if (!D.habits[k]) D.habits[k] = habit(k); });
    if (c.key === 'home:chores' && !c.set) det.forEach((k) => { const n = period(I(k)); if (n && !D.habits[k].timely) { D.habits[k].strength = smooth(onTime(k, n)); D.habits[k].timely = true; } });
    let hs = det.map((k) => D.habits[k]);
    // Studies: one ring per subject, any of its tasks studied or ticked counts (aim: once a week)
    if (c.subjects) { hs = c.subjects.map((sj) => { const ids = sIds(sj); const st = days.map((d, k) => k < Math.max(0, first) || first < 0 || d > T0 ? 'skip' : ids.some((r) => insDone(D, r, d)) ? 'done' : 'miss');
      const hb = habit(ids[0], st); hb.name = G(sj).name; hb.id = ''; hb.color = G(sj).color; hb.subj = true;
      // its strength: how on time its open tasks are, reviews on their own rhythm and deadlines by their date
      const open = sgroupsOf(sj).flatMap((g) => kidsOf(g).filter((k) => I(k) && !sFinished(k)).map((k) => { const dl = I(k).due || G(g).deadline || null; return smooth(dl ? byDeadline(k, dl) : onTime(k, period(I(k)) || SDEF)); }));
      if (open.length) hb.strength = days.map((_, k) => iavg(open.map((o) => o[k]))); return hb; }); rest.length = 0; }
    let other = null;
    if (rest.length) { const st = days.map((d, k) => k < Math.max(0, first) || first < 0 || d > T0 ? 'skip' : rest.some((r) => insDone(D, r, d)) ? 'done' : 'miss');
      other = habit(rest[0], st); other.name = 'Other'; other.id = ''; other.other = true; other.n = rest.length; }
    const all = hs.concat(other ? [other] : []);
    if (c.key === 'home:chores' && !c.set) c.tileRings = roomIds().map((r) => { const js = kidsOf(r).filter((k) => D.habits[k]); return js.length ? { label: G(r).name, v: iavg(js.map((k) => D.habits[k].strength[D.last])) } : null; }).filter(Boolean).concat(other ? [{ label: 'Other', v: other.strength[D.last] }] : []);
    return Object.assign(c, { habits: hs, other, all, strength: days.map((_, k) => iavg(all.map((h) => h.strength[k]))) }); });
  // health items: true averages on their own scale
  const inGroups = (gs) => gs.flatMap((g) => G(g) ? G(g).kids : []).filter((k) => I(k) && I(k).type === 'tracker');
  const ciIds = inGroups(['hg-sleep', 'hc-morning', 'hc-evening']).concat(inGroups(['hg-ci']));
  D.measures = [...new Set(ciIds)].filter((k) => SCALES[I(k).scale] && I(k).scale !== 'symptom3');
  if (M.settings.insHealth) D.measures = M.settings.insHealth.filter((k) => I(k) && I(k).type === 'tracker' && SCALES[I(k).scale] && I(k).scale !== 'symptom3');
  if (!M.settings.insHealth) D.measures.sort((a, b) => (/^morning /i.test(I(a).name) ? 1 : 0) - (/^morning /i.test(I(b).name) ? 1 : 0)); // the morning twins go last, so a small tile keeps the main ones
  D.raw = {}; D.info = {};
  trackers.forEach((t) => { const sc = I(t).scale; if (!SCALES[sc] || sc === 'symptom3') return;
    D.raw[t] = days.map((d) => { const v = insVal(D, d, t); return typeof v === 'number' ? v : null; });
    D.info[t] = { lo: 1, hi: SCALES[sc].length, words: SCALES[sc] }; });
  D.symptoms = trackers.filter((t) => I(t).scale === 'symptom3');
  D.sym = {}; D.symptoms.forEach((t) => { D.sym[t] = days.map((d, k) => { const v = insVal(D, d, t); return typeof v === 'number' ? v : D.logged[k] ? 0 : null; }); });
  // the load of a set of symptoms on a day: the worst one, or 4 when three or more are distressing with one debilitating
  D.loadFor = (ids, k) => { if (!D.logged[k]) return null; const vs = ids.map((s0) => (D.sym[s0] ? D.sym[s0][k] : 0) || 0); const mx = Math.max(0, ...vs); return mx === 3 && vs.filter((v) => v >= 2).length >= 3 ? 4 : mx; };
  D.areas = trackers.filter((t) => I(t).scale === 'avoid');
  D.av = {}; D.areas.forEach((t) => { D.av[t] = days.map((d) => { const v = insVal(D, d, t); return v === 'faced' ? 1 : v === 'avoided' ? 0 : null; }); });
  // trackers in a circle: a ring each, its value = the average over the last 30 logged days (scales between their ends,
  // yes/no and showed up as the share of days; symptoms as the share of days present, left out of the circle's %)
  D.circles.forEach((c) => { c.trk = c.trkIds.map((id) => { const it = I(id), sc = it.scale;
      const vals = days.map((d, k) => { if (d > T0) return null; const v = insVal(D, d, id);
        if (sc === 'yesno') return v === 'yes' ? 1 : D.logged[k] ? 0 : null; if (sc === 'avoid') return v === 'faced' ? 1 : v === 'avoided' ? 0 : null;
        if (sc === 'symptom3') return typeof v === 'number' ? 1 : D.logged[k] ? 0 : null; const n = SCALES[sc].length; return typeof v === 'number' ? (v - 1) / (n - 1) : null; });
      const k0 = vals.findIndex((v) => v != null); if (k0 < 0) return null;
      return { id, name: it.name, trk: true, sym: sc === 'symptom3', vals, k0, strength: avRoll([vals]), states: vals.map((v) => v == null ? 'skip' : v > 0 ? 'done' : 'miss') }; }).filter(Boolean);
    // I track many symptoms (2026-11-11): in a circle's rings they are one line, the average load of all its symptoms
    { const sy = c.trk.filter((t) => t.sym).map((t) => t.id); const lv = sy.length ? days.map((d, k) => { if (d > T0) return null; const v = D.loadFor(sy, k); return v == null ? null : v / 4; }) : null;
      c.trkR = c.trk.filter((t) => !t.sym).concat(lv && lv.some((v) => v != null) ? [{ name: 'Symptom load', strength: avRoll([lv]) }] : []); }
    // yes/no tags can be good or bad, so the circle's % leans on ticks and scales; tags only when there's nothing else
    const sc = c.trk.filter((t) => !t.sym && ['avoid'].concat(Object.keys(SCALES)).includes(I(t.id).scale)); let parts = c.all.concat(sc); if (!parts.length) parts = c.trk.filter((t) => !t.sym); if (c.trk.length) c.strength = days.map((_, k) => iavg(parts.map((h) => h.strength[k]))); });
  // everything that can go together, one value per day (null = not known that day)
  D.vars = []; const addVar = (id, name, group, vals, src) => { if (vals.filter((v) => v != null).length >= 7) D.vars.push({ id, name, group, vals, src: src || id }); };
  trackers.forEach((t) => { const it = I(t); const sc = it.scale;
    const g = sc === 'symptom3' ? 'Symptoms' : sc === 'avoid' ? 'Avoidance' : D.measures.includes(t) ? 'Health' : 'Other';
    addVar(t, it.name, g, days.map((d, k) => { const v = insVal(D, d, t);
      if (sc === 'symptom3') return typeof v === 'number' ? v : D.logged[k] ? 0 : null;
      if (sc === 'avoid') return v === 'faced' ? 1 : v === 'avoided' ? 0 : null;
      if (sc === 'yesno') return v === 'yes' ? 1 : D.logged[k] ? 0 : null;
      if (sc === 'choices') return Array.isArray(v) ? v.length : D.logged[k] ? 0 : null;
      return typeof v === 'number' ? v : null; })); });
  D.fams.forEach(({ f, ws }) => addVar('f:' + f, 'Feeling ' + f.toLowerCase(), 'Feelings', D.feel.map((w) => w.length ? (w.some((x) => ws.includes(x)) ? 1 : 0) : null)));
  // TOO MUCH (2026-11-08): items that can be overdone; per day '' (not too much), 'hyper', 'inert' or 'much' (no kind picked)
  D.over = Object.keys(M.items).filter((k) => I(k).overdo && ITICK.includes(I(k).type));
  D.much = {}; D.over.forEach((id) => { D.much[id] = days.map((d, k) => { if (d > T0 || k < Math.max(0, first)) return null; const v = insVal(D, d, id);
    return typeof v === 'string' && v.startsWith('much') ? (v.slice(5) || 'much') : insDone(D, id, d) ? '' : null; }); });
  D.muchDay = days.map((d, k) => { if (!anyData[k] || d > T0) return null; const ks = D.over.map((id) => D.much[id][k]).filter((x) => x); return { hyper: ks.includes('hyper'), inert: ks.includes('inert'), any: ks.length > 0 }; });
  // hyperfixation and inertia are two separate behaviours per item (2026-11-08); never compared with each other or with the item itself
  D.over.forEach((id) => [['hyper', 'hyperfixation'], ['inert', 'inertia']].forEach(([t, w]) => addVar('m:' + t + ':' + id, I(id).name + ' ' + w, 'Too much', D.much[id].map((x) => x == null ? null : x === t ? 1 : 0), id)));
  Object.values(D.habits).forEach((h) => addVar(h.id, h.name, 'Lifestyle', h.states.map((x) => x === 'done' ? 1 : x === 'miss' ? 0 : null)));
  insCache = { key, D }; return D;
}

// What goes together: Spearman rank correlation, n >= 14, some spread, p from Student's t, Benjamini-Hochberg 10%, |r| >= 0.15.
// Days aren't independent (a bad week is many bad days in a row), so the p-value uses an effective number of days:
// n_eff = n (1 - r1x r1y) / (1 + r1x r1y), with r1 each series' correlation with itself one day later (Bartlett), and n_eff must be 10 or more.
function rankOf(a) { const ix = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]); const r = new Array(a.length);
  for (let i = 0; i < ix.length;) { let j = i; while (j + 1 < ix.length && ix[j + 1][0] === ix[i][0]) j++; const m = (i + j) / 2 + 1; for (let q = i; q <= j; q++) r[ix[q][1]] = m; i = j + 1; } return r; }
function pearson(x, y) { const n = x.length, mx = iavg(x), my = iavg(y); let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { const dx = x[i] - mx, dy = y[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; } return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null; }
function betacf(a, b, x) { let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap; if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d; let h = d;
  for (let m = 1; m <= 200; m++) { const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2)); d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d;
    const del = d * c; h *= del; if (Math.abs(del - 1) < 3e-12) break; } return h; }
function lgamma(z) { const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let x = z, y = z, t = x + 5.5; t -= (x + 0.5) * Math.log(t); let s = 1.000000000190015; for (let j = 0; j < 6; j++) s += g[j] / ++y; return -t + Math.log(2.5066282746310005 * s / x); }
function ibeta(a, b, x) { if (x <= 0) return 0; if (x >= 1) return 1; const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b; }
const pOfR = (r, n) => { if (Math.abs(r) >= 1) return 0; const df = n - 2, t = r * Math.sqrt(df / (1 - r * r)); return ibeta(df / 2, 0.5, df / (df + t * t)); };
// lag may be a list (2026-11-08: all three days at once): every day tested, one chance filter over all of them,
// then each thing shown once, on the day it goes together most surely
function goesTogether(D, pid, lag) {
  const P = D.vars.find((v) => v.id === pid); if (!P) return { rows: [], tested: 0 }; const out = [];
  [].concat(lag).forEach((lag) => D.vars.forEach((V) => { if (V === P || V.src === P.src) return; const x = [], y = [];
    const ks = []; for (let k = Math.max(0, -lag); k + lag < D.N; k++) { const a = P.vals[k], b = V.vals[k + lag]; if (a != null && b != null) { x.push(a); y.push(b); ks.push(k); } }
    const n = x.length; if (n < 14 || new Set(x).size < 2 || new Set(y).size < 2) return;
    const spread = (a) => { const c = {}; a.forEach((v) => { c[v] = (c[v] || 0) + 1; }); return n - Math.max(...Object.values(c)) >= 3; };
    if (!spread(x) || !spread(y)) return; const rx = rankOf(x), ry = rankOf(y); const r = pearson(rx, ry); if (r == null) return;
    const ac = (a) => { const u = [], w = []; for (let i = 0; i + 1 < n; i++) if (ks[i + 1] === ks[i] + 1) { u.push(a[i]); w.push(a[i + 1]); } return u.length >= 10 ? pearson(u, w) || 0 : 0; };
    const q = Math.max(0, ac(rx) * ac(ry)); const ne = n * (1 - q) / (1 + q); if (ne < 10) return;
    out.push({ name: V.name, group: V.group, r, n, ne, lag, p: pOfR(r, ne) }); }));
  const m = out.length; out.sort((a, b) => a.p - b.p); let cut = -1; out.forEach((o, i) => { if (o.p <= ((i + 1) / m) * 0.1) cut = i; });
  out.forEach((o, i) => { o.sig = i <= cut && Math.abs(o.r) >= 0.15; });
  const seen = new Set(); const rows = out.filter((o) => o.sig && !seen.has(o.name) && seen.add(o.name)); // out is sorted by p, so each keeps its surest day
  return { rows: rows.sort((a, b) => Math.abs(b.r) - Math.abs(a.r)), tested: new Set(out.map((o) => o.name)).size };
}
// Avoidance score = a true average (2026-11-08: "averages should be average"): the share of logged days I showed up
// over the last 30 days, all areas pooled; a stretch with nothing logged keeps the last share
function avRoll(arrs, n = 30) { let sum = 0, cnt = 0, cur = null; const len = arrs.length ? arrs[0].length : 0;
  const out = Array.from({ length: len }, (_, k) => { arrs.forEach((a) => { const v = a[k]; if (v != null) { sum += v; cnt++; } const o = k >= n ? a[k - n] : null; if (o != null) { sum -= o; cnt--; } });
    if (cnt) cur = sum / cnt; return cur; });
  const f = out.find((x) => x != null); const res = out.map((x) => x == null ? (f == null ? 0 : f) : x); res.none = f == null; return res; }
// Experiments: change one thing for a while; compare with the same number of days just before
const expList = () => (M.settings.exps = M.settings.exps || []);
function expSeries(D, id) { if (D.raw[id]) { const f = D.info[id]; return D.raw[id].map((v) => v == null ? null : (v - f.lo) / (f.hi - f.lo)); }
  if (D.sym[id]) return D.sym[id].map((v) => v == null ? null : v / 3); return null; }
function expResult(D, e) {
  const endD = e.end || (addDays(e.start, e.len - 1) < T0 ? addDays(e.start, e.len - 1) : T0);
  const k1 = D.days.indexOf(e.start), k2 = D.days.indexOf(endD); const len = k1 < 0 || k2 < 0 ? 0 : k2 - k1 + 1;
  const av = (a) => a.length ? iavg(a) : null;
  // only the days I ticked the experiment's task count as days I really did it
  const didIt = (k) => !e.task || !I(e.task) || isDone(e.task, D.days[k]);
  const did = len ? D.days.slice(k1, k2 + 1).filter((_, i) => didIt(k1 + i)).length : 0;
  const rows = (e.watch || []).filter((w) => I(w)).map((w) => { const s = expSeries(D, w); const nm = I(w).name; if (!s || !len) return [nm, 0, 0, 'no data'];
    const dur = av(s.slice(k1, k2 + 1).filter((v, i) => v != null && didIt(k1 + i))), bef = av(s.slice(Math.max(0, k1 - len), k1).filter((v) => v != null));
    if (dur == null || bef == null) return [nm, dur || 0, bef || 0, 'not enough logged'];
    const df = dur - bef; const sym = !!D.sym[w];
    return [nm, dur, bef, Math.abs(df) < 0.05 ? 'same' : sym ? (df > 0 ? 'more' : 'less') : df > 0 ? 'higher' : 'lower']; });
  const logged = len ? D.logged.slice(k1, k2 + 1).filter(Boolean).length : 0;
  return { rows, len, logged, did, endD, done: !!e.end || addDays(e.start, e.len - 1) < T0 };
}

// ---------- drawing ----------
const INK = TH.ink; let SUN = '#E6BC74', SHADOW = '#A9B4C4';
// every Insight colour can be changed in edit mode (2026-11-08); my picks live in settings.insCols
const INS_DEF = { sun: '#E6BC74', shadow: '#A9B4C4', health: '#EDBB3A', much: '#B5838D', hyper: '#E08A5E', inert: '#8C9EBF' };
const insCol = (k) => ((M.settings || {}).insCols || {})[k] || INS_DEF[k];
function insColOf(k) { if (k.startsWith('c:')) { const c = insightData().circles.find((x) => x.key === k.slice(2)); return c ? c.color : undefined; } return insCol(k); }
function insSetCol(k, v) { const o = M.settings.insCols = M.settings.insCols || {}; if (v) o[k] = v; else delete o[k]; }
function insApplyCols() { SUN = insCol('sun'); SHADOW = insCol('shadow'); CI_Y = insCol('health'); MUCH_C = insCol('much'); HYPER_C = insCol('hyper'); INERT_C = insCol('inert'); }
const tint = (c, t) => mix(c, TH.card, t);
const ipct = (v) => Math.round(v * 100) + '%';
const isigned = (v) => (v >= 0 ? '+' : '−') + Math.round(Math.abs(v) * 100) + '%';
const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ifmt = (d) => Number(d.slice(8)) + ' ' + MON3[Number(d.slice(5, 7)) - 1];
const ilab = (t, right) => `<div class="ilab"><span class="mono">${esc(t)}</span>${right ? `<span>${esc(right)}</span>` : ''}</div>`;
const istats = (cells) => `<div class="istats" style="grid-template-columns:repeat(${cells.length},minmax(0,1fr))">${cells.map(([b, s]) => `<div><b>${esc(b)}</b><span>${esc(s)}</span></div>`).join('')}</div>`;
const inote = (t) => `<p class="note inote">${esc(t)}</p>`;
const arcD = (v, r) => { const C = 2 * Math.PI * r; return (clamp01(v) * C).toFixed(1) + ' ' + C.toFixed(1); };
// rings: SVG arcs with rounded ends from the top, names to the left of each ring's start, no grey track
function iringSet(rings, big, small, size = 230, w = 9, gap = 14, lab = 10) {
  const c = size / 2; const room = c * 0.62; if (rings.length * gap > room) { gap = room / rings.length; w = Math.max(2.5, Math.min(w, gap - 2)); lab = Math.max(8, Math.min(lab, gap + 1)); }
  return `<div class="irings" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><g transform="rotate(-90 ${c} ${c})">${rings.map((r, k) => { const rad = c - k * gap - w / 2;
    return r.v > 0.002 ? `<circle cx="${c}" cy="${c}" r="${rad.toFixed(1)}" fill="none" stroke="${r.c}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${arcD(r.v, rad)}"/>` : ''; }).join('')}</g></svg>
    ${rings.map((r, k) => r.label ? `<span class="irl" style="top:${k * gap - 1}px;font-size:${lab}px;line-height:${lab + 1}px">${esc(r.label)}</span>` : '').join('')}
    <div class="irc"><b>${esc(big)}</b><span>${esc(small)}</span></div></div>`;
}
const imini = (v, c) => `<svg class="imini" width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><g transform="rotate(-90 11 11)"><circle cx="11" cy="11" r="9" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round" stroke-dasharray="${arcD(Math.max(0.03, v), 9)}"/></g></svg>`;
// beads: done = a dot that grows with how much; not done = small grey; skipped = tiny; nothing = empty
const ibead = (st, t, c) => { const [s, col] = st === 'done' ? [4 + 7 * (t == null ? 1 : t), c] : st === 'avoid' ? [11, SHADOW] : st === 'miss' ? [4, '#CEC6B8'] : st === 'skip' ? [2, '#9A9387'] : [0, 'transparent'];
  return `<i style="width:${s.toFixed(1)}px;height:${s.toFixed(1)}px;background:${col}"></i>`; };
const ibeads = (list) => `<span class="ibeads">${list.join('')}</span>`;
const ikey = (items) => `<div class="ikey">${items.map(([b, t]) => `<span>${b}${esc(t)}</span>`).join('')}</div>`;
function ical(D, cells, weeks = 26) { const lastWd = wd(D.days[D.last]); const n = weeks * 7 - (6 - lastWd); const tail = cells.slice(-n);
  return `<div class="ical" style="grid-template-columns:repeat(${weeks},1fr)">${tail.map((c) => `<span>${ibead(c.state, c.t, c.c)}</span>`).join('')}</div>`; }
function icols(vals, labels, acc) { const max = Math.max(1e-9, ...vals);
  return `<div class="icols">${vals.map((v, k) => `<div><span>${esc(labels[k])}</span><i style="height:${Math.round(4 + (v / max) * 86)}px;background:${acc}"></i></div>`).join('')}</div>`; }
function iline(vals, xl, acc) { const h = 110; const pts = vals.map((v, k) => [(k / Math.max(1, vals.length - 1)) * 350, h - 6 - v * (h - 12)]);
  const d = pts.map(([x, y], k) => (k ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)).join(' ');
  return `<svg class="iline" viewBox="0 0 350 ${h}" preserveAspectRatio="none" style="height:${h}px" aria-hidden="true"><path d="${d} L350 ${h} L0 ${h} Z" fill="${tint(acc, 0.8)}"/><path d="${d}" fill="none" stroke="${acc}" stroke-width="2" vector-effect="non-scaling-stroke"/></svg><div class="ixl">${xl.map((t) => `<span>${esc(t)}</span>`).join('')}</div>`; }
function ilineFrom(D, vals, k0, acc) { k0 = Math.min(Math.max(D.N - 182, k0), D.last - 1); const mid = Math.round((k0 + D.last) / 2);
  return { html: iline(vals.slice(k0), [ifmt(D.days[k0]), ifmt(D.days[mid]), 'now'], acc), span: k0 <= D.N - 182 ? '6 months' : 'since ' + ifmt(D.days[k0]) }; }
const ihbars = (rows, acc) => `<div class="ihbars">${rows.map((r) => `<${r.go ? `button data-a="ins" data-v="${r.go}"` : 'div'} class="ihb"><span class="n">${esc(r.name)}</span><span class="t"><span class="tr"><i style="width:${Math.max(3, Math.round(r.v * 100))}%;background:${r.c || acc}"></i></span>${r.w2 != null ? `<span class="tr"><i class="b" style="width:${Math.max(3, Math.round(r.w2 * 100))}%"></i></span>` : ''}</span><span class="v">${esc(r.num)}</span></${r.go ? 'button' : 'div'}>`).join('')}</div>`;
// Keystone's flower: one rounded petal per thing, longer, fatter and deeper for more; names around it
function iflower(vals, names, acc, size = 190, w = 350) { names = names || WD; const cx = w / 2, c = size / 2, L = size / 2 - 52, R = size / 2 - 22, n = vals.length;
  return `<div class="iflower" style="height:${size}px"><svg width="100%" height="${size}" viewBox="0 0 ${w} ${size}" aria-hidden="true">${vals.map((v, k) => { const a = (k / n) * 360, len = 12 + L * v;
    return `<ellipse cx="${cx}" cy="${(c - len / 2 - 5).toFixed(2)}" rx="${(6 + 4 * v).toFixed(2)}" ry="${(len / 2).toFixed(2)}" transform="rotate(${a.toFixed(1)} ${cx} ${c})" fill="${tint(acc, (1 - v) * 0.62)}"/>`; }).join('')}<circle cx="${cx}" cy="${c}" r="11" fill="${mix(acc, INK, 0.25)}"/></svg>
    ${vals.map((v, k) => { const rad = ((k / n) * 360 - 90) * Math.PI / 180, x = R * Math.cos(rad); const tx = Math.abs(x) < 12 ? 'translateX(-50%)' : x < 0 ? 'translateX(-100%)' : 'none';
      return `<span style="left:calc(50% + ${x.toFixed(1)}px);top:${(c + R * Math.sin(rad) - 7).toFixed(1)}px;transform:${tx}">${esc(names[k])}</span>`; }).join('')}</div>`; }
function ihorizon(share, h, R, none) { const hy = h / 2, cy = hy + R - share * 2 * R; if (none) return `<div class="ihz" style="height:${h}px"><b style="top:${hy}px"></b></div>`; // nothing answered yet: only the horizon
  return `<div class="ihz" style="height:${h}px"><div class="ihz-top" style="height:${hy}px"><i style="width:${2 * R}px;height:${2 * R}px;left:calc(50% - ${R}px);top:${cy - R}px;background:${SUN}"></i></div><div class="ihz-bot" style="top:${hy}px;height:${hy}px"><i style="width:${2 * R}px;height:${2 * R}px;left:calc(50% - ${R}px);top:${cy - R - hy}px;background:${SHADOW}"></i></div><b style="top:${hy}px"></b></div>`; }
const iminiHz = (s, none) => { if (none) return `<span class="ihzm"><b></b></span>`; const cy = 7 + 6 - s * 12; return `<span class="ihzm"><span class="t"><i style="top:${(cy - 6).toFixed(1)}px;background:${SUN}"></i></span><span class="b"><i style="top:${(cy - 6 - 7).toFixed(1)}px;background:${SHADOW}"></i></span><b></b></span>`; };
// a navigation row: mini ring, name, beads, number, chevron
const irow = (o) => `<${o.go ? `button data-a="ins" data-v="${esc(o.go)}"` : 'div'} class="irow ${o.sub ? 'sub' : ''}">${o.lead || ''}<span class="nm">${esc(o.label)}</span>${o.mid || ''}${o.muted ? `<span class="mu">${esc(o.muted)}</span>` : ''}${o.num ? `<span class="nu">${esc(o.num)}</span>` : ''}${o.go ? '<span class="chev" aria-hidden="true">›</span>' : o.nochev ? '<span class="chev" aria-hidden="true" style="visibility:hidden">›</span>' : ''}</${o.go ? 'button' : 'div'}>`;
const ichips = (k, opts, cur) => `<div class="chips ichips">${opts.map((o) => `<button class="chip sm" data-a="insz" data-ref="${k}" data-v="${o}" aria-pressed="${o === cur}">${o}</button>`).join('')}</div>`;
const RAMP = ['#ECE8E0', tint('#E0644E', 0.72), tint('#E0644E', 0.5), tint('#E0644E', 0.24), '#E0644E'];
const heatStyle = (lv) => lv < 0 ? 'background:transparent' : `background:${RAMP[lv]};color:${lv >= 3 ? TH.card : INK}`;

// ---------- pages ----------
let CI_Y = '#EDBB3A';
let MUCH_C = '#B5838D', HYPER_C = '#E08A5E', INERT_C = '#8C9EBF'; // too much: hyperfixation warm, inertia dusty blue
function insCrumbs(parts) { return `<nav class="crumbs" aria-label="Where I am">${parts.map(([l, p], i) => i < parts.length - 1 ? `<button data-a="ins" data-v="${p}">${esc(l)}</button><span aria-hidden="true">›</span>` : `<span aria-current="page">${esc(l)}</span>`).join('')}</nav>`; }
function renderInsight() {
  insApplyCols(); const D = insightData(); const N = D.N, last = D.last, days = D.days;
  const root = 'home';
  const page = S.ins || root; const ci = page.indexOf(':'); const kind = ci < 0 ? page : page.slice(0, ci), name = ci < 0 ? '' : page.slice(ci + 1);
  const Z = S.insZoom = S.insZoom || {};
  const circle = (k) => D.circles.find((c) => c.key === k);
  const mAvgRaw = (id, n = 30) => { const v = (D.raw[id] || []).slice(-n).filter((x) => x != null); return v.length ? iavg(v) : null; };
  const mAvg = (id, n) => { const f = D.info[id], a = mAvgRaw(id, n); return f && a != null ? (a - f.lo) / (f.hi - f.lo) : 0; };
  const avgWord = (id, n) => { const f = D.info[id], a = mAvgRaw(id, n); return !f || a == null ? '' : f.words[Math.round(a) - f.lo]; };
  const ciCol = (k) => tint(CI_Y, Math.min(0.75, k * 0.11));
  const loadOf = (k) => { if (!D.logged[k]) return null; const vs = D.symptoms.map((s) => D.sym[s][k] || 0); const mx = Math.max(0, ...vs); return mx === 3 && vs.filter((v) => v >= 2).length >= 3 ? 4 : mx; };
  const loads = days.map((_, k) => loadOf(k)); const lvl = (v) => v == null ? -1 : v;
  const sOf = (vals) => avRoll([vals]);
  // feelings: the share of days with any feeling picked that had this family in them
  const fShare = (x, n = 30) => { let a = 0, b = 0; for (let k = N - n; k < N; k++) { const w = D.feel[k]; if (w.length) { b++; if (w.some((y) => x.ws.includes(y))) a++; } } return b ? a / b : 0; };
  const fDays = (n = 30) => D.feel.slice(-n).filter((w) => w.length).length;
  // too much: share of the days I did an item that it tipped into too much
  const mShare = (id, n = 90) => { const a = D.much[id].slice(-n).filter((x) => x != null); return a.length ? a.filter(Boolean).length / a.length : 0; };
  const mDays = (key, n = 30) => D.muchDay.slice(-n).filter((x) => x && x[key]).length;
  const crumbsFor = { home: [], habits: [['Insight', 'home']], cat: [['Insight', 'home']], habit: [], health: [['Insight', 'home']], item: [], symptoms: [], links: [], avoid: [['Insight', 'home']], feel: [['Insight', 'home']], much: [['Insight', 'home']], area: [['Insight', 'home'], ['Avoidance', 'avoid']], exp: [['Insight', 'home']], expNew: [['Insight', 'home'], ['Experiments', 'exp']] };
  const hRoot = [['Insight', 'home'], ['Health', 'health']];
  let title = '', sub = '', h = '', cr = crumbsFor[kind] || [];
  const habitRow = (hb, c) => irow({ sub: true, label: hb.name, lead: imini(hb.strength[last], c), mid: ibeads(hb.states.slice(-7).map((x) => ibead(x, 1, c))), num: ipct(hb.strength[last]), go: hb.id ? 'habit:' + hb.id : '', nochev: !hb.id });
  const shades = (c, list) => list.map((x, k) => Object.assign({}, x, { c: tint(c.color, Math.min(0.66, k * 0.22)) }));

  if (kind === 'home' || kind === 'habits') {
    // the front page: every circle as its own tile (2026-11-04), from the ⋯ menu and from Health's Insight folder alike
    title = '';
    const ms = D.measures; const healthV = iavg(ms.filter((m) => mAvgRaw(m) != null).map((m) => mAvg(m)));
    const avoidS = avRoll(D.areas.map((a) => D.av[a])); const avoidV = avoidS[last];
    // in edit mode a tile can be dragged, recoloured, hidden, and my own circles set up (2026-11-08)
    const T = {}; const ed = S.edit;
    const dots = (refs) => ed ? `<span class="itdots">${refs.map(([r, c, l]) => `<span class="hdot" style="background:${c}" data-col="${r}" role="button" aria-label="Change the ${esc(l)} colour"></span>`).join('')}</span>` : '';
    const wrap = (key, t, inner, right, cols, mine) => ed
      ? `<div class="itile ed" data-ref="T:${key}"><span class="ithd">${grip()}<span class="mono">${esc(t)}</span>${mine ? `<button class="hb" data-a="inscedit" data-ref="${key}" aria-label="Set up ${esc(t)}">${icon('settings', 16)}</button>` : ''}<button class="hb" data-a="inshide" data-v="${key}" aria-label="Hide ${esc(t)}">${icon('eye-off', 16)}</button></span>${inner}${dots(cols)}</div>`
      : `<button class="itile" data-a="ins" data-v="${key}"><span class="mono">${esc(t)}</span>${right ? `<em>${esc(right)}</em>` : ''}${inner}</button>`;
    const tile = (t, rings, big, small, go, right, cols, mine) => { T[go] = wrap(go, t, iringSet(rings, big, small, 132, 7, 11, 9), right, cols || [], mine); };
    if (D.areas.length) T.avoid = wrap('avoid', 'Avoidance', ihorizon(avoidV, 132, 30, avoidS.none), ipct(avoidV), [['ic:sun', SUN, 'showed up'], ['ic:shadow', SHADOW, 'avoided']]);
    if (ms.length) tile('Health', ms.slice(0, 5).map((m, k) => ({ label: I(m).name, v: mAvg(m), c: ciCol(k) })), ipct(healthV), '30 days', 'health', '', [['ic:health', CI_Y, 'Health']], true);
    if (D.feel.some((w) => w.length)) tile('Feelings', D.fams.map((x) => ({ label: x.f, v: fShare(x), c: x.c })), fDays() + '/30', 'days', 'feel', '', D.fams.map((x) => ['fc:' + x.f, x.c, x.f]));
    if (D.symptoms.length) { const SY = '#E0644E'; const ld = loads.slice(-30).filter((x) => x != null);
      // one load line per symptom group (Mental, Physical, Behavioural): its average load over the last 30 logged days
      const grp = {}; D.symptoms.forEach((id) => { const g = Object.keys(M.groups).find((k) => G(k).kids.includes(id)); const key = g && G(g).style === 'htab' ? g : 'all'; (grp[key] = grp[key] || []).push(id); });
      const gAvg = (ids) => { const v = []; for (let k = N - 30; k < N; k++) { const x = D.loadFor(ids, k); if (x != null) v.push(x); } return v.length ? iavg(v) / 4 : 0; };
      tile('Symptoms', Object.entries(grp).slice(0, 5).map(([g, ids], k) => ({ label: g === 'all' ? 'Symptoms' : G(g).name, v: gAvg(ids), c: tint(SY, Math.min(0.66, k * 0.2)) })), ld.length ? (Math.round(iavg(ld) * 10) / 10).toFixed(1) : '0', 'load, 30 days', 'symptoms'); }
    if (D.over.length) tile('Too much', D.over.slice(0, 5).map((id) => ({ label: I(id).name, v: mShare(id), c: MUCH_C })).map((r, k) => Object.assign(r, { c: tint(MUCH_C, Math.min(0.66, k * 0.16)) })), String(mDays('any')), 'days, 30', 'much', '', [['ic:much', MUCH_C, 'Too much'], ['ic:hyper', HYPER_C, 'hyperfixation'], ['ic:inert', INERT_C, 'inertia']]);
    D.circles.forEach((c) => { const rs = (c.tileRings || c.all.map((hb) => ({ label: hb.name, v: hb.strength[last] }))).concat(c.trkR.map((t) => ({ label: t.name, v: t.strength[last] }))).slice(0, 5); tile(c.name, shades(c, rs), ipct(c.strength[last]), c.ids.length === 1 ? '1 item' : c.ids.length + ' items', 'cat:' + c.key, '', [['ic:c:' + c.key, c.color, c.name]], true); });
    { const run = expList().filter((e) => !expResult(D, e).done).length; // Experiments at the top (2026-11-08)
      h += `<div class="ilist iexp">${irow({ label: 'Experiments', muted: run ? run + ' running' : expList().length ? 'none running' : 'none yet', go: 'exp' })}</div>`; }
    const order = insOrder(Object.keys(T)); const hid = M.settings.insHidden || [];
    h += `<div class="itiles" ${ed ? 'data-list="ins:tiles"' : ''}>${order.filter((k) => !hid.includes(k.slice(2))).map((k) => T[k.slice(2)]).join('')}${ed ? `<button class="itile itnew" data-a="inscnew">${icon('plus', 22)}<span>New circle</span></button>` : ''}</div>`;
    const hidden = order.map((k) => k.slice(2)).filter((k) => hid.includes(k));
    if (ed && hidden.length) h += ilab('Hidden') + `<div class="chips">${hidden.map((k) => `<button class="chip" data-a="insshow" data-v="${k}">${icon('eye', 14)} ${esc(insName(D, k))}</button>`).join('')}</div>`;
  } else if (kind === 'cat') {
    const c = circle(name) || D.circles[0]; if (!c) { S.ins = 'home'; return renderInsight(); }
    const acc = c.color; title = c.name; const hs = c.all; const series = c.strength;
    const share = days.map((_, k) => { const sts = hs.map((hb) => hb.states[k]); const dn = sts.filter((x) => x === 'done').length;
      if (dn) return { state: 'done', t: dn / sts.length, c: acc }; return { state: sts.every((x) => x === 'skip') ? 'skip' : 'miss' }; });
    const full = share.slice(-30).filter((x) => x.state === 'done' && x.t === 1).length;
    const perWeek = Array.from({ length: 16 }, (_, w) => iavg(share.slice(N - (16 - w) * 7, N - (15 - w) * 7).filter((x) => x.state !== 'skip').map((x) => x.state === 'done' ? x.t : 0)));
    h += iringSet([{ label: 'All', v: series[last], c: acc }].concat(shades(c, (c.tileRings || hs.map((hb) => ({ label: hb.name, v: hb.strength[last] }))).concat(c.trkR.map((t) => ({ label: t.name, v: t.strength[last] }))).slice(0, 9)).map((r, k) => Object.assign(r, { c: tint(acc, Math.min(0.66, 0.12 + k * 0.16)) }))), ipct(series[last]), c.ids.length === 1 ? '1 item' : c.ids.length + ' items');
    h += istats([[ipct(series[last]), hs.length ? 'strength' : 'average'], [isigned(series[last] - series[last - 30]), 'this month'], [isigned(series[last] - series[0]), 'this year']].concat(hs.length ? [[String(full), 'full days, 30']] : []));
    if (hs.length) h += ilab('How much got done', '26 weeks') + ical(D, share) + ikey([[ibead('done', 1, acc), 'all done'], [ibead('done', 0.2, acc), 'some'], [ibead('miss'), 'none done'], [ibead('skip'), 'skipped']]);
    if (hs.length) h += ilab('Share done per week', '16 weeks') + icols(perWeek, perWeek.map((v) => Math.round(v * 100)), acc);
    if (hs.length || c.trk.length) { const L0 = ilineFrom(D, series, Math.min(...hs.concat(c.trk).map((hb) => hb.k0)), acc); h += ilab(hs.length ? 'Strength' : 'Average', L0.span) + L0.html; }
    if (c.trk.length) h += ilab('Tracked', '30 days') + `<div class="ilist">${c.trk.map((t, k) => irow({ label: t.name, lead: imini(t.strength[last], tint(acc, Math.min(0.66, k * 0.16))), mid: ibeads(t.vals.slice(-7).map((v) => v == null ? ibead('none') : v > 0 ? ibead('done', v, acc) : ibead('miss'))), num: ipct(t.strength[last]), go: D.raw[t.id] ? 'item:' + t.id : '', nochev: !D.raw[t.id] })).join('')}</div>`;
    if (hs.length) h += ilab('What carries it', '12 weeks') + ihbars(hs.map((hb) => { const st = hb.states.slice(-84).filter((x) => x !== 'skip'); const n = st.filter((x) => x === 'done').length; return { name: hb.name, v: st.length ? n / st.length : 0, num: n + ' of ' + st.length, go: hb.id ? 'habit:' + hb.id : '' }; }), acc);
  } else if (kind === 'habit') {
    const hb = D.habits[name]; if (!hb) { S.ins = 'home'; return renderInsight(); }
    const c = D.circles.find((x) => x.ids.includes(name)) || { color: colorOf(name), name: '' }; const acc = c.color || colorOf(name);
    title = hb.name; sub = whenText(I(name)) || ''; cr = [['Insight', 'home']].concat(c.key ? [[c.name, 'cat:' + c.key]] : []);
    const z = Z.score || 'Month'; const step = { Day: 1, Week: 7, Month: 30, Quarter: 91, Year: 365 }[z];
    const pts = z === 'Day' ? hb.strength.slice(Math.max(N - 60, Math.min(hb.k0, last - 1))) : (() => { const n = Math.max(2, Math.min(26, Math.floor((N - hb.k0) / step) + 1)); return Array.from({ length: n }, (_, k) => hb.strength[Math.max(0, last - (n - 1 - k) * step)]); })();
    const hz = Z.history || 'Month'; const hstep = { Week: 7, Month: 30, Quarter: 91, Year: 365 }[hz]; const hn = Math.min(12, Math.floor(N / hstep));
    const counts = Array.from({ length: hn }, (_, k) => hb.states.slice(N - (hn - k) * hstep, N - (hn - 1 - k) * hstep).filter((x) => x === 'done').length);
    const best = hb.streaks.slice().sort((a, b) => b.length - a.length).slice(0, 5); const bestMax = Math.max(1, ...best.map((s) => s.length));
    const byWd = WD.map((_, w) => { const cc = days.map((d, k) => [d, hb.states[k]]).filter(([d, x]) => x !== 'skip' && wd(d) === w).slice(-12); return iavg(cc.map(([, x]) => x === 'done' ? 1 : 0)); });
    const months = Array.from({ length: 12 }, (_, k) => { const a = parse(T0); return iso(new Date(a.getFullYear(), a.getMonth() - 11 + k, 1)).slice(0, 7); });
    const grid = WD.map((_, w) => months.map((m) => days.filter((d, k) => hb.states[k] === 'done' && wd(d) === w && d.startsWith(m)).length)); const gmax = Math.max(1, ...grid.flat());
    h += iringSet([{ label: '', v: hb.strength[last], c: acc }], ipct(hb.strength[last]), 'strength', 180);
    h += istats([[ipct(hb.strength[last]), 'strength'], [isigned(hb.strength[last] - hb.strength[last - 30]), 'this month'], [isigned(hb.strength[last] - hb.strength[0]), 'this year'], [String(hb.states.filter((x) => x === 'done').length), 'times']]);
    h += ilab('Strength') + ichips('score', ['Day', 'Week', 'Month', 'Quarter', 'Year'], z) + iline(pts, [z === 'Day' ? pts.length + ' days ago' : '', 'now'], acc);
    h += ilab('History', 'times done') + ichips('history', ['Week', 'Month', 'Quarter', 'Year'], hz) + icols(counts, counts, acc);
    h += ilab('Calendar', '26 weeks') + ical(D, hb.states.map((x) => ({ state: x, t: 1, c: acc }))) + ikey([[ibead('done', 1, acc), 'done'], [ibead('miss'), 'not done'], [ibead('skip'), 'skipped']]);
    h += ilab('Best streaks', hb.current ? 'now: ' + hb.current + (hb.current === 1 ? ' day' : ' days') : '') + (best.length ? ihbars(best.map((s) => ({ name: ifmt(s.from) + ' to ' + ifmt(s.to), v: s.length / bestMax, num: String(s.length) })), acc) : inote('No streaks yet.'));
    h += ilab('Which days') + iflower(byWd, WD, acc);
    if (D.much[name]) { const a = D.much[name].slice(-90).filter((x) => x != null); const q = (t) => a.filter((x) => x === t).length;
      h += ilab('Too much', 'of ' + a.length + ' days done, 90 days') + ihbars([['Hyperfixation', q('hyper'), HYPER_C], ['Inertia', q('inert'), INERT_C], ['Just too much', q('much'), MUCH_C]].filter((r, i) => i < 2 || r[1]).map(([n, c, cc]) => ({ name: n, v: a.length ? c / a.length : 0, num: String(c), c: cc })), acc); }
    h += ilab('Frequency') + `<div class="imatrix"><span></span>${months.map((m) => `<span class="h">${MON3[Number(m.slice(5)) - 1][0]}</span>`).join('')}${grid.map((r, w) => `<span class="w">${WD[w]}</span>${r.map((n) => `<span><i style="width:${n ? (3 + (n / gmax) * 9).toFixed(1) : 2}px;height:${n ? (3 + (n / gmax) * 9).toFixed(1) : 2}px;background:${n ? acc : TH.line}"></i></span>`).join('')}`).join('')}</div>`;
    h += `<button class="btn ibtn" data-a="insopt" data-ref="${name}">Item settings</button>`;
  } else if (kind === 'health') {
    title = 'Health'; const MS = D.measures;
    h += iringSet(MS.map((m, k) => ({ label: I(m).name, v: mAvg(m), c: ciCol(k) })), '30 days', 'average');
    h += ilab('Last 14 days', 'average') + `<div class="ilist">${MS.map((m, k) => { const vals = D.raw[m].slice(-14); const f = D.info[m];
      return irow({ label: I(m).name, mid: ibeads(vals.map((v) => v ? ibead('done', (v - f.lo) / (f.hi - f.lo), ciCol(k)) : ibead('none'))), num: avgWord(m, 14), go: 'item:' + m }); }).join('')}</div>`;
    h += `<div class="ilist" style="margin-top:14px">${D.symptoms.length ? irow({ label: 'Symptom load', mid: `<span class="ibeads">${loads.slice(-14).map((v) => `<i style="width:8px;height:8px;${heatStyle(lvl(v))}"></i>`).join('')}</span>`, num: 'today', go: 'symptoms' }) : ''}${irow({ label: 'What goes together', muted: 'everything against my health', go: 'links' })}</div>`;
    if (!MS.length) h += inote('No health items to show yet.');
  } else if (kind === 'item') {
    const id = name; const it = I(id); if (!it || !D.raw[id]) { S.ins = root; return renderInsight(); }
    const acc = ciCol(Math.max(0, D.measures.indexOf(id))); const f = D.info[id]; const vals = D.raw[id]; const n = f.hi - f.lo;
    title = it.name; cr = hRoot;
    const cal = vals.map((v, k) => v ? { state: 'done', t: (v - f.lo) / n, c: CI_Y } : { state: D.logged[k] ? 'miss' : 'none' });
    const counts = f.words.map((_, i) => vals.slice(-91).filter((v) => v === i + f.lo).length); const total = Math.max(1, counts.reduce((a, b) => a + b, 0));
    const byWd = WD.map((_, w) => iavg(vals.map((v, k) => [v, k]).filter(([v, k]) => v && wd(days[k]) === w).slice(-13).map(([v]) => (v - f.lo) / n)));
    const nLog = (q) => vals.slice(-q).filter((x) => x != null).length;
    h += istats([[avgWord(id, 30) || '–', '30-day average'], [avgWord(id, 91) || '–', '13-week average'], [String(nLog(91)), 'days logged, 13 weeks']]);
    h += ilab('13 weeks') + ical(D, cal, 13) + ikey([[ibead('done', 1, CI_Y), f.words[n]], [ibead('done', 0, CI_Y), f.words[0]], [ibead('miss'), 'nothing logged']]);
    h += ilab('How the days spread', '13 weeks') + `<div class="ispread">${counts.map((q, i) => q ? `<i style="flex-grow:${q / total};background:${tint(CI_Y, (n - i) * (0.68 / Math.max(1, n)))}"></i>` : '').join('')}</div><div class="ispreadt">${counts.map((q, i) => `<span>${q} ${esc(f.words[i])}</span>`).join('')}</div>`;
    h += ilab('By weekday', 'average') + iflower(byWd, WD, CI_Y);
  } else if (kind === 'symptoms') {
    title = 'Symptoms'; cr = hRoot;
    const back = S.insMon || 0; const a0 = parse(T0); const mD = new Date(a0.getFullYear(), a0.getMonth() - back, 1); const mKey = iso(mD).slice(0, 7);
    const mLen = new Date(mD.getFullYear(), mD.getMonth() + 1, 0).getDate(); const off = (mD.getDay() + 6) % 7;
    let cells = ''; for (let i = 0; i < off; i++) cells += '<span></span>';
    for (let dn = 1; dn <= mLen; dn++) { const dk = mKey + '-' + pad(dn); const k = days.indexOf(dk); const fut = k < 0 || dk > T0; const lv = fut ? -1 : lvl(loads[k]);
      cells += `<button data-a="insday" data-v="${dk}" ${fut ? 'disabled' : ''} class="${S.insDay === dk ? 'on' : dk === T0 ? 'td' : ''}" style="${heatStyle(lv)};${lv < 0 ? 'color:#B3AC9F' : ''}">${dn}</button>`; }
    h += `<div class="ihm"><div class="ihmh"><button data-a="insmon" data-v="1" ${back >= 11 ? 'disabled' : ''} aria-label="Previous month">‹</button><b>${MONTHS[mD.getMonth()]} ${mD.getFullYear()}</b><button data-a="insmon" data-v="-1" ${back <= 0 ? 'disabled' : ''} aria-label="Next month">›</button></div><div class="ihmg">${WD.map((w) => `<span class="w">${w[0]}</span>`).join('')}${cells}</div></div>`;
    h += `<div class="ikey">${RAMP.map((c, i) => `<span><i class="sq" style="background:${c}"></i>${['none', 'present', 'distressing', 'debilitating', 'several bad'][i]}</span>`).join('')}</div>`;
    if (S.insDay) { const k = days.indexOf(S.insDay); const list = D.symptoms.map((s) => [I(s).name, D.sym[s][k]]).filter(([, v]) => v);
      h += `<div class="iday"><b>${esc(fmtDate(S.insDay))}</b>${D.logged[k] ? (list.length ? list.map(([nm, v]) => `<div><span>${esc(nm)}</span><span>${SCALES.symptom3[v - 1]}</span></div>`).join('') : '<div><span>No symptoms</span></div>') : '<div><span>Nothing logged that day</span></div>'}</div>`; }
    const yRows = Array.from({ length: 12 }, (_, r) => { const dt = new Date(a0.getFullYear(), a0.getMonth() - 11 + r, 1); const mk = iso(dt).slice(0, 7); const len = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
      return `<span class="m">${MON3[dt.getMonth()]}</span>${Array.from({ length: 31 }, (_, i) => { if (i >= len) return '<i></i>'; const k = days.indexOf(mk + '-' + pad(i + 1)); return `<i style="${k < 0 ? '' : heatStyle(lvl(loads[k]))}"></i>`; }).join('')}`; }).join('');
    h += ilab('The year') + `<div class="iyear">${yRows}<span></span><span class="t" style="grid-column:span 9">1</span><span class="t" style="grid-column:span 10">10</span><span class="t" style="grid-column:span 9">20</span><span class="t" style="grid-column:span 3;text-align:right">31</span></div>`;
    const weekSums = D.symptoms.map((s) => Array.from({ length: 16 }, (_, w) => { const vs = D.sym[s].slice(N - (16 - w) * 7, N - (15 - w) * 7).filter((v) => v != null); return vs.length ? iavg(vs) : null; }));
    const order = D.symptoms.map((s, i) => [s, weekSums[i]]).sort((a, b) => iavg(b[1].filter((v) => v != null)) - iavg(a[1].filter((v) => v != null)));
    const wk0 = addDays(T0, -16 * 7 + 1);
    h += ilab('Each symptom by week', 'average severity, 16 weeks') + `<div class="istrips">${order.map(([s, sums]) => `<span class="n">${esc(I(s).name)}</span><span class="c">${sums.map((v) => `<i style="${heatStyle(v == null ? -1 : v === 0 ? 0 : Math.min(4, 1 + Math.floor(v / 0.75)))}"></i>`).join('')}</span>`).join('')}<span></span><span class="t"><span>${ifmt(wk0)}</span><span>now</span></span></div>`;
    h += ilab('How often, how bad', '90 days') + ihbars(order.map(([s]) => { const all = D.sym[s].slice(-90).filter((v) => v != null), vs = all.filter(Boolean); return { name: I(s).name, v: all.length ? vs.length / all.length : 0, num: vs.length + ' of ' + all.length + ' days' + (vs.length ? ' · ' + SCALES.symptom3[Math.round(iavg(vs)) - 1] : '') }; }), '#E0644E');
  } else if (kind === 'links') {
    const acc = '#6F9BD6'; title = 'What goes together'; sub = 'the last year'; cr = name === 'f' ? [['Insight', 'home'], ['Feelings', 'feel']] : name === 'm' ? [['Insight', 'home'], ['Too much', 'much']] : hRoot;
    const GR = name === 'f' ? ['Feelings'] : name === 'm' ? ['Too much'] : ['Health', 'Symptoms']; // only the section I'm in (2026-11-08)
    const PIV = D.vars.filter((v) => GR.includes(v.group));
    const pivot = PIV.some((v) => v.id === S.insPiv) ? S.insPiv : ((name === 'f' ? PIV.find((v) => v.group === 'Feelings') : name === 'm' ? PIV.find((v) => v.group === 'Too much') : null) || PIV.find((v) => /sleep/i.test(v.name)) || PIV[0] || {}).id;
    const pv = PIV.find((v) => v.id === pivot); const lag = [-1, 0, 1].includes(S.insLag) ? S.insLag : 'all'; /* all three days, or the day before, the same day, the day after (2026-11-08) */ const fo = !!S.insPivOpen;
    // the filter icon opens a drop-down menu like Plan's (2026-11-04)
    const opt = (act, v, l, on) => `<button role="menuitemradio" data-a="${act}" data-v="${v}" aria-checked="${on}" aria-current="${on}">${esc(l)}${on ? icon('check', 16, 2) : ''}</button>`;
    const menu = fo ? `<span class="vsortx" data-a="inspivo"></span><span class="vdrop vsortm ipivm" role="menu">${GR.map((g) => { const vs = PIV.filter((x) => x.group === g); return vs.length ? `<span class="mono">${g}</span>` + vs.map((x) => opt('inspiv', x.id, x.name, x.id === pivot)).join('') : ''; }).join('')}</span>` : '';
    h += `<div class="ipick"><div><span class="mono">Compared with</span><b>${esc(pv ? pv.name : 'Nothing logged yet')}</b></div><span class="vsortw"><button class="fbtn" data-a="inspivo" aria-label="Pick what to compare" aria-haspopup="menu" aria-expanded="${fo}" aria-pressed="${fo}">${icon('sliders-horizontal', 18)}</button>${menu}</span></div>`;
    // when: tabs, not a filter (2026-11-08)
    h += `<div class="htabs itabs" role="tablist">${[['all', 'All'], [-1, 'Day before'], [0, 'Same day'], [1, 'Day after']].map(([v, l]) => `<button role="tab" data-a="inslag" data-v="${v}" aria-selected="${lag === v}" style="--c:${acc}">${l}</button>`).join('')}</div>`;
    const res = pivot ? goesTogether(D, pivot, lag === 'all' ? [-1, 0, 1] : lag) : { rows: [], tested: 0 };
    const word = (r) => Math.abs(r) >= 0.5 ? 'strong' : Math.abs(r) >= 0.3 ? 'moderate' : 'weak'; const when = lag === 1 ? 'the day after' : lag === -1 ? 'the day before' : lag === 'all' ? 'with' : 'on days with';
    const dayW = (o) => lag !== 'all' ? o.n + ' days' : o.lag === -1 ? 'day before' : o.lag === 1 ? 'day after' : 'same day';
    if (res.rows.length) { const ring = res.rows.slice(0, 8); const maxR = Math.max(...ring.map((o) => Math.abs(o.r)));
      h += iflower(ring.map((o) => Math.abs(o.r) / maxR), ring.map((o) => o.name), acc, 250);
      h += ikey([[`<i class="sq" style="background:${tint(acc, 0.72)}"></i>`, 'weak'], [`<i class="sq" style="background:${tint(acc, 0.4)}"></i>`, ''], [`<i class="sq" style="background:${acc}"></i>`, 'strong']]);
      const pos = res.rows.filter((o) => o.r > 0), neg = res.rows.filter((o) => o.r < 0); const pn = (pv.name || '').toLowerCase();
      if (pos.length) h += ilab('More ' + when + ' more ' + pn, String(pos.length)) + ihbars(pos.map((o) => ({ name: o.name, v: Math.abs(o.r), num: word(o.r) + ' · ' + dayW(o) })), acc);
      if (neg.length) h += ilab('Less ' + when + ' more ' + pn, String(neg.length)) + ihbars(neg.map((o) => ({ name: o.name, v: Math.abs(o.r), num: word(o.r) + ' · ' + dayW(o) })), acc);
    } else h += inote(res.tested ? 'Nothing stands out yet.' : 'Not enough days yet.');
  } else if (kind === 'much') {
    title = 'Too much'; const O = D.over; const col = (k) => tint(MUCH_C, Math.min(0.66, k * 0.16));
    const kindCol = (x) => x === 'hyper' ? HYPER_C : x === 'inert' ? INERT_C : MUCH_C;
    h += iringSet(O.map((id, k) => ({ label: I(id).name, v: mShare(id), c: col(k) })), String(mDays('any')), 'days, 30');
    h += istats([[String(mDays('any')), 'days, 30'], [String(mDays('hyper')), 'hyperfixation'], [String(mDays('inert')), 'inertia'], [String(mDays('any', 60) - mDays('any')), 'the 30 before']]);
    h += ilab('Last 14 days', 'too much of done, 90 days') + `<div class="ilist">${O.map((id, k) => { const a = D.much[id].slice(-90).filter((x) => x != null);
      return irow({ label: I(id).name, lead: imini(mShare(id), col(k)), mid: ibeads(D.much[id].slice(-14).map((x) => x == null ? ibead('none') : x ? ibead('done', 1, kindCol(x)) : ibead('miss'))), num: a.filter(Boolean).length + ' of ' + a.length, go: D.habits[id] ? 'habit:' + id : '' }); }).join('')}</div>`
      + ikey([[ibead('done', 0.3, HYPER_C), 'hyperfixation'], [ibead('done', 0.3, INERT_C), 'inertia'], [ibead('miss'), 'done, not too much']]);
    h += ilab('When', '26 weeks') + ical(D, D.muchDay.map((x) => !x ? { state: 'none' } : x.hyper && x.inert ? { state: 'done', t: 1, c: MUCH_C } : x.hyper ? { state: 'done', t: 1, c: HYPER_C } : x.inert ? { state: 'done', t: 1, c: INERT_C } : x.any ? { state: 'done', t: 1, c: MUCH_C } : { state: 'miss' }))
      + ikey([[ibead('done', 0.3, HYPER_C), 'hyperfixation'], [ibead('done', 0.3, INERT_C), 'inertia'], [ibead('done', 0.3, MUCH_C), 'both or unsaid']]);
    const perWeek = Array.from({ length: 16 }, (_, w) => D.muchDay.slice(N - (16 - w) * 7, N - (15 - w) * 7).filter((x) => x && x.any).length);
    h += ilab('Days per week', '16 weeks') + icols(perWeek, perWeek, MUCH_C);
    const byWd = WD.map((_, w) => { const vs = D.muchDay.filter((x, k) => x && wd(days[k]) === w).slice(-13); return vs.length ? vs.filter((x) => x.any).length / vs.length : 0; });
    h += ilab('Which days') + iflower(byWd, WD, MUCH_C);
    h += `<div class="ilist" style="margin-top:14px">${irow({ label: 'What goes together', muted: 'everything against too much', go: 'links:m' })}</div>`;
  } else if (kind === 'feel') {
    title = 'Feelings'; const F = D.fams, fd = D.feel; const n30 = fDays();
    const top = F.map((x) => [x, fShare(x)]).sort((a, b) => b[1] - a[1])[0]; const wpd = n30 ? fd.slice(-30).reduce((a, w) => a + w.length, 0) / n30 : 0;
    h += iringSet(F.map((x) => ({ label: x.f, v: fShare(x), c: x.c })), n30 + '/30', 'days');
    h += istats([[String(n30), 'days, 30'], [top && top[1] ? top[0].f : '–', 'most often'], [wpd ? wpd.toFixed(1) : '–', 'words a day']]);
    h += ilab('Last 14 days', '30 days') + `<div class="ilist">${F.map((x) => irow({ label: x.f, lead: imini(fShare(x), x.c), mid: ibeads(fd.slice(-14).map((w) => !w.length ? ibead('none') : w.some((y) => x.ws.includes(y)) ? ibead('done', 1, x.c) : ibead('miss'))), num: ipct(fShare(x)) })).join('')}</div>`;
    // each day in the colour of the family I picked most words from
    const domOf = (w) => { const c = F.map((x) => w.filter((y) => x.ws.includes(y)).length); const m = Math.max(0, ...c); return m ? F[c.indexOf(m)] : null; };
    h += ilab('Mostly felt', '26 weeks') + ical(D, fd.map((w) => { const x = w.length ? domOf(w) : null; return x ? { state: 'done', t: 1, c: x.c } : { state: w.length ? 'miss' : 'none' }; })) + ikey(F.map((x) => [ibead('done', 0.3, x.c), x.f]));
    const wk0 = addDays(T0, -16 * 7 + 1);
    h += ilab('Each by week', 'share of days, 16 weeks') + `<div class="istrips">${F.map((x) => `<span class="n">${esc(x.f)}</span><span class="c">${Array.from({ length: 16 }, (_, w) => { const ws = fd.slice(N - (16 - w) * 7, N - (15 - w) * 7).filter((y) => y.length); if (!ws.length) return '<i style="background:transparent"></i>'; const v = ws.filter((y) => y.some((z) => x.ws.includes(z))).length / ws.length; return `<i style="background:${v ? tint(x.c, 0.8 * (1 - v)) : TH.line}"></i>`; }).join('')}</span>`).join('')}<span></span><span class="t"><span>${ifmt(wk0)}</span><span>now</span></span></div>`;
    const cnt = {}; fd.slice(-90).forEach((w) => w.forEach((y) => { cnt[y] = (cnt[y] || 0) + 1; })); const n90 = fDays(90);
    const words = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (words.length) h += ilab('Picked most', '90 days') + ihbars(words.map(([y, q]) => { const x = F.find((z) => z.ws.includes(y)); return { name: cap1(y), v: q / Math.max(1, n90), num: q + (q === 1 ? ' day' : ' days'), c: x ? x.c : '#9A9387' }; }), '#9A9387');
    h += `<div class="ilist" style="margin-top:14px">${irow({ label: 'What goes together', muted: 'everything against my feelings', go: 'links:f' })}</div>`;
    if (!fd.some((w) => w.length)) h += inote('No feelings picked yet.');
  } else if (kind === 'avoid' || kind === 'area') {
    const acc = SUN; const series = D.areas.map((a) => sOf(D.av[a])); const pooled = avRoll(D.areas.map((a) => D.av[a]));
    // change since then, measured from the first full 30 days when I started later than that
    const since = (s, vals, k) => { const f = vals.findIndex((v) => v != null); return isigned(s[last] - s[f < 0 ? k : Math.max(k, Math.min(last, f + 29))]); };
    const allDays = days.map((_, k) => D.areas.some((a) => D.av[a][k] != null) ? 1 : null);
    const avKey = ikey([[`<i style="width:11px;height:11px;background:${SUN}"></i>`, 'showed up'], [`<i style="width:11px;height:11px;background:${SHADOW}"></i>`, 'avoided'], [ibead('miss'), 'skipped']]);
    if (kind === 'avoid') { title = 'Avoidance';
      const s = pooled; const allV = D.areas.flatMap((a) => D.av[a]);
      h += `<div class="ibig"><b>${ipct(s[last])}</b><span>showed up, 30 days</span></div>` + ihorizon(s[last], 188, 44, s.none);
      h += istats([[since(s, allDays, last - 30), 'this month'], [since(s, allDays, 0), 'this year'], [String(allV.filter((v) => v === 1).length), 'showed up'], [String(allV.filter((v) => v === 0).length), 'avoided']]);
      h += ilab('Areas', 'last 7 days') + `<div class="ilist">${D.areas.map((a, i) => irow({ label: I(a).name, lead: iminiHz(series[i][last], series[i].none), mid: ibeads(D.av[a].slice(-7).map((v) => v == null ? ibead('miss') : v ? ibead('done', 1, SUN) : ibead('avoid'))), num: ipct(series[i][last]), go: 'area:' + a })).join('')}</div>` + avKey;
      if (!D.areas.length) h += inote('No avoidance areas yet.');
    } else { const id = name; if (!D.av[id]) { S.ins = 'avoid'; return renderInsight(); } title = I(id).name; const vals = D.av[id]; const s = sOf(vals);
      const runs = []; let run = null; vals.forEach((v, k) => { if (v === 1) { if (!run) run = { from: days[k], to: days[k], length: 0 }; run.to = days[k]; run.length++; } else if (v === 0) { if (run) runs.push(run); run = null; } }); if (run) runs.push(run);
      const best = runs.sort((a, b) => b.length - a.length).slice(0, 4); const bestMax = Math.max(1, ...best.map((r) => r.length));
      const byWd = (want) => WD.map((_, w) => { const vs = vals.filter((v, k) => v != null && wd(days[k]) === w).slice(-12); return vs.length ? iavg(vs.map((v) => v === want ? 1 : 0)) : 0; });
      const weeks = Array.from({ length: 12 }, (_, w) => vals.slice(N - (12 - w) * 7, N - (11 - w) * 7).filter((v) => v != null));
      h += `<div class="ibig"><b>${ipct(s[last])}</b><span>showed up, 30 days</span></div>` + ihorizon(s[last], 172, 40, s.none);
      h += istats([[since(s, vals, last - 30), 'this month'], [since(s, vals, 0), 'this year'], [String(vals.filter((v) => v === 1).length), 'showed up'], [String(vals.filter((v) => v === 0).length), 'avoided']]);
      { const L0 = ilineFrom(D, s, Math.max(0, vals.findIndex((v) => v != null)), acc); h += ilab('Score', L0.span) + L0.html; }
      h += ilab('Days', '13 weeks') + ical(D, vals.map((v) => v == null ? { state: 'miss' } : v ? { state: 'done', t: 1, c: SUN } : { state: 'avoid' }), 13) + avKey;
      h += ilab('Sun path', '12 weeks') + `<div class="isuns">${weeks.map((vs) => { const sh = vs.length ? iavg(vs) : 0.5; const R = 9; const top = 22 + R - sh * 2 * R - R;
        return `<div><span class="sky"><i style="top:${top}px;background:${SUN}"></i></span><span class="gr"><i style="top:${top - 22}px;background:${SHADOW}"></i></span><em>${vs.filter((v) => v).length}/${vs.length}</em></div>`; }).join('')}</div>`;
      h += ilab('Longest runs of showing up') + (best.length ? ihbars(best.map((r) => ({ name: ifmt(r.from) + ' to ' + ifmt(r.to), v: r.length / bestMax, num: String(r.length) })), acc) : inote('No runs yet.'));
      const WD2 = WD.map((w) => w.slice(0, 2));
      h += ilab('Which days') + `<div class="ipair"><div>${iflower(byWd(1), WD2, SUN, 150, 170)}<span class="cap">Showed up</span></div><div>${iflower(byWd(0), WD2, SHADOW, 150, 170)}<span class="cap">Avoided</span></div></div>`;
    }
  } else if (kind === 'exp') {
    const EXPS = expList(); const fmtLen = (e) => e.len % 7 === 0 && e.len >= 28 ? (e.len / 7) + ' weeks' : e.len + ' days';
    if (!name) { title = 'Experiments';
      const R = EXPS.map((e) => [e, expResult(D, e)]); const run = R.filter(([, r]) => !r.done), fin = R.filter(([, r]) => r.done);
      const verdictOf = (r) => { const ch = r.rows.filter((x) => !['same', 'no data', 'not enough logged'].includes(x[3])); return ch.length ? ch.map((x) => x[0].toLowerCase() + ' ' + x[3]).slice(0, 2).join(', ') : 'no clear change'; };
      if (run.length) h += ilab('Running') + `<div class="ilist">${run.map(([e, r]) => irow({ label: e.name, muted: 'day ' + r.len + ' of ' + e.len, go: 'exp:' + e.id })).join('')}</div>`;
      if (fin.length) h += ilab('Finished') + `<div class="ilist">${fin.slice().reverse().map(([e, r]) => irow({ label: e.name, muted: verdictOf(r), go: 'exp:' + e.id })).join('')}</div>`;
      if (!EXPS.length) h += inote('No experiments yet.');
      h += `<button class="btn ibtn" data-a="ins" data-v="expNew">+ New experiment</button>`;
    } else { const e = EXPS.find((x) => x.id === name); cr = [['Insight', 'home'], ['Experiments', 'exp']];
      if (!e) { title = 'Experiments'; h += inote('This experiment was removed.'); } else { const r = expResult(D, e); title = e.name;
        sub = r.done ? 'Finished · ' + r.len + ' days from ' + ifmt(e.start) : 'Day ' + r.len + ' of ' + e.len + ' · started ' + ifmt(e.start);
        const top = r.rows.find((x) => x[3] !== 'no data' && x[3] !== 'not enough logged');
        h += `<div class="ibig"><b>${esc(top ? (top[3] === 'same' ? 'No clear change' : cap1(top[3])) : 'Too early')}</b><span>${esc(top ? top[0].toLowerCase() + (r.done ? '' : ' so far') : 'log a few more days')}</span></div>`;
        h += istats([[r.len + '/' + e.len, 'days'], [String(r.did), 'did it'], [String(r.logged), 'logged'], [String((e.watch || []).length), 'watched']]);
        if (e.task && I(e.task)) h += `<div class="ilist">${irow({ label: I(e.task).name, muted: whenText(I(e.task)) || 'task', lead: `<span class="imini">${icon('circle-check', 18)}</span>` })}</div><button class="btn ibtn" data-a="insexptask" data-ref="${e.task}">Task settings</button>`;
        h += ilab('What it watched', r.done ? 'during vs before' : 'so far vs before') + ihbars(r.rows.map(([n, a, b, t]) => ({ name: n, v: a, w2: b, num: t })), '#7DBE9A');
        h += r.done ? `<button class="btn ibtn" data-a="insexpagain" data-ref="${e.id}">Run it again</button>` : `<button class="btn ibtn" data-a="insexpend" data-ref="${e.id}">End early</button>`;
        h += `<button class="btn ibtn" data-a="insexpdel" data-ref="${e.id}">Delete experiment</button>`; } }
  } else if (kind === 'expNew') {
    title = 'New experiment'; const W = S.insExp = S.insExp || {};
    const watchAll = D.measures.concat(D.symptoms); const watch = (W.watch || watchAll.slice(0, 1)).filter((w) => watchAll.includes(w)); const len = W.len || '14 days';
    h += ilab('1 · What will I change?') + `<input class="inp" id="insexpname" placeholder="e.g. Weighted blanket" value="${esc(W.name || '')}">`;
    h += ilab('2 · What should it watch?', 'pick any') + `<div class="chips ichips">${watchAll.map((o) => `<button class="chip sm" data-a="insexpw" data-v="${o}" aria-pressed="${watch.includes(o)}">${esc(I(o).name)}</button>`).join('')}</div>`;
    h += ilab('3 · How long?') + `<div class="chips ichips">${['7 days', '14 days', '30 days'].map((o) => `<button class="chip sm" data-a="insexpl" data-v="${o}" aria-pressed="${o === len}">${o}</button>`).join('')}</div>`;
    h += `<button class="btn ibtn" data-a="insexpstart">Start experiment</button>`;
  }
  // the page title is the dropdown above (2026-11-04), so a section page shows no second big title
  const secPage = ['health', 'avoid', 'cat', 'feel', 'much'].includes(kind) || (kind === 'exp' && !name);
  const head = title && !secPage ? `<h1 class="ih1">${esc(title)}</h1>${sub ? `<p class="isub">${esc(sub)}</p>` : ''}` : sub ? `<p class="isub" style="margin:0">${esc(sub)}</p>` : '';
  return `<div class="ins">${cr.length ? insCrumbs(cr.concat([[title || 'Insight', page]])) : ''}${head}${h}</div>`;
}
const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
function insightAction(act, a, ref, v) {
  const go = () => { render(); $('#main').scrollTop = 0; };
  switch (act) {
    case 'insdrop': S.insDrop = !S.insDrop; render(); return true;
    case 'inshide': change(() => { const h = M.settings.insHidden = M.settings.insHidden || []; if (!h.includes(v)) h.push(v); }, 'Hidden'); return true;
    case 'insshow': change(() => { M.settings.insHidden = (M.settings.insHidden || []).filter((x) => x !== v); }, 'Shown again'); return true;
    case 'inscnew': openSheet({ kind: 'insc', target: 'mine', isNew: true, ref: uid('ic'), title: 'New circle', draft: { name: '', color: '#7DBE9A', ids: [], tags: [] } }); return true;
    case 'inscedit': { const D = insightData();
      if (ref === 'health') { openSheet({ kind: 'insc', target: 'health', ref, title: 'Health', draft: { color: insCol('health'), ids: D.measures.slice() } }); return true; }
      const c = D.circles.find((x) => 'cat:' + x.key === ref); if (!c) return true;
      if (c.mine) { const u = insMine().find((x) => 'u:' + x.id === c.key); if (u) openSheet({ kind: 'insc', target: 'mine', ref: u.id, title: u.name, draft: JSON.parse(JSON.stringify(u)) }); return true; }
      const e = (M.settings.insEdit || {})[c.key]; openSheet({ kind: 'insc', target: 'built', ref: c.key, title: c.name, draft: { name: c.name, color: c.color, ids: e ? (e.ids || []).slice() : c.ids.slice(), tags: e ? (e.tags || []).slice() : c.key.startsWith('tag:') ? [c.key.slice(4)] : [] } }); return true; }
    case 'inscreset': { const s = S.sheet; S.sheet = null; change(() => { if (s.target === 'health') { delete M.settings.insHealth; delete (M.settings.insCols || {}).health; } else { delete (M.settings.insEdit || {})[s.ref]; delete (M.settings.insCols || {})['c:' + s.ref]; } }, 'Put back'); return true; }
    case 'insctag': { inscCapture(); const D0 = S.sheet.draft; D0.tags = D0.tags || []; D0.tags = D0.tags.includes(v) ? D0.tags.filter((x) => x !== v) : D0.tags.concat(v); renderLayer(); return true; }
    case 'inscpick': { inscCapture(); const D0 = S.sheet.draft; D0.ids = D0.ids.includes(v) ? D0.ids.filter((x) => x !== v) : D0.ids.concat(v); renderLayer(); return true; }
    case 'inscsave': { inscCapture(); const s = S.sheet, D0 = s.draft; if (!D0.name && s.target !== 'health') { flash('Name it first'); return true; }
      change(() => { if (s.target === 'health') { M.settings.insHealth = D0.ids.slice(); insSetCol('health', D0.color); return; }
        if (s.target === 'built') { (M.settings.insEdit = M.settings.insEdit || {})[s.ref] = { name: D0.name, ids: D0.ids.slice(), tags: (D0.tags || []).slice() }; insSetCol('c:' + s.ref, D0.color); return; }
        const L = M.settings.insCircles = M.settings.insCircles || []; const x = L.find((u) => u.id === s.ref); if (x) Object.assign(x, D0); else L.push(Object.assign({}, D0, { id: s.ref })); }, s.isNew ? 'Circle added' : 'Saved'); S.sheet = null; render(); return true; }
    case 'inscdel': { const x = insMine().find((u) => u.id === ref); S.sheet = null; change(() => { M.settings.insCircles = insMine().filter((u) => u.id !== ref); }, 'Deleted ' + (x ? x.name : '')); return true; }
    case 'insopen': S.insDrop = false; S.menu = false; S.insOn = true; S.ins = 'home'; S.edit = false; go(); return true;
    case 'ins': S.insDrop = false; if (S.ins === 'expNew') { const el = $('#insexpname'); if (el) (S.insExp = S.insExp || {}).name = el.value; } S.ins = v; if (v === 'expNew') S.insExp = S.insExp && S.insExp.again ? S.insExp : {}; if (S.insExp) delete S.insExp.again; S.insDay = null; go(); return true;
    case 'insz': (S.insZoom = S.insZoom || {})[ref] = v; render(); return true;
    case 'insmon': S.insMon = Math.max(0, Math.min(11, (S.insMon || 0) + Number(v))); S.insDay = null; render(); return true;
    case 'insday': S.insDay = S.insDay === v ? null : v; render(); return true;
    case 'inspivo': S.insPivOpen = !S.insPivOpen; render(); return true;
    case 'inspiv': S.insPiv = v; S.insPivOpen = false; render(); return true;
    case 'inslag': S.insLag = Number(v); render(); return true;
    case 'insopt': openItem(ref); return true;
    case 'insexpw': case 'insexpl': { const W = S.insExp = S.insExp || {}; const el = $('#insexpname'); if (el) W.name = el.value;
      if (act === 'insexpl') W.len = v; else { const D = insightData(); const all = D.measures.concat(D.symptoms); const cur = (W.watch || all.slice(0, 1)).filter((w) => all.includes(w)); W.watch = cur.includes(v) ? cur.filter((x) => x !== v) : cur.concat([v]); }
      render(); return true; }
    case 'insexpstart': { const W = S.insExp = S.insExp || {}; const el = $('#insexpname'); const nmv = (el ? el.value : W.name || '').trim(); const D = insightData(); const all = D.measures.concat(D.symptoms);
      const watch = (W.watch || all.slice(0, 1)).filter((w) => all.includes(w)); if (!nmv) { flash('Name the change first'); return true; } if (!watch.length) { flash('Pick at least one thing to watch'); return true; }
      const len = parseInt(W.len || '14', 10);
      // a task to tick on the days I really did it (2026-11-08); it can get steps and a schedule like any task, and stops with the experiment
      change(() => { const xid = uid('x'), tid = uid('i'); M.items[tid] = { name: nmv, type: 'task', when: { mode: 'every', n: 1 }, kind: 'behaviour', tags: [], made: T0, end: addDays(T0, len - 1), dur: 15, exp: xid };
        const b = blockIds()[0]; if (b) G(b).kids.push(tid); expList().push({ id: xid, name: nmv, start: T0, len, watch, task: tid }); }, 'Experiment started · its task is on Today', false); S.insExp = {}; S.ins = 'exp'; go(); return true; }
    case 'insexpend': { const e = expList().find((x) => x.id === ref); if (e) change(() => { e.end = T0; if (e.task && I(e.task)) I(e.task).end = T0; }, 'Experiment ended · result saved'); return true; }
    case 'insexptask': openItem(ref); return true;
    case 'insexpagain': { const e = expList().find((x) => x.id === ref); if (e) { S.insExp = { name: e.name, watch: (e.watch || []).slice(), len: e.len + ' days', again: true }; S.ins = 'expNew'; go(); } return true; }
    case 'insexpdel': change(() => { M.settings.exps = expList().filter((x) => x.id !== ref); }, 'Experiment deleted'); S.ins = 'exp'; go(); return true;
  }
  return false;
}

// Title dropdown (2026-11-04): like Home and Studies, the title names the section I'm in and lists the others
function insSections() { insApplyCols(); const D = insightData(); const out = [];
  if (D.areas.length) { const v = avRoll(D.areas.map((a) => D.av[a]))[D.last]; out.push(['avoid', 'Avoidance', v, iminiHz(v, !D.areas.some((a) => D.av[a].some((x) => x != null)))]); }
  if (D.measures.length) { const v = iavg(D.measures.map((m) => { const f = D.info[m]; const a = D.raw[m].slice(-30).filter((x) => x != null); return a.length ? (iavg(a) - f.lo) / (f.hi - f.lo) : null; }).filter((x) => x != null)); out.push(['health', 'Health', v, imini(v, CI_Y)]); }
  if (D.feel.some((w) => w.length)) { const cnt = D.fams.map((x) => D.feel.slice(-30).filter((w) => w.some((y) => x.ws.includes(y))).length); const i = cnt.indexOf(Math.max(...cnt)); const nd = D.feel.slice(-30).filter((w) => w.length).length;
    out.push(['feel', 'Feelings', null, imini(nd ? cnt[i] / nd : 0, D.fams[i].c)]); }
  if (D.over.length) { const n = D.muchDay.slice(-30).filter((x) => x && x.any).length; out.push(['much', 'Too much', null, imini(n / 30, MUCH_C)]); }
  D.circles.forEach((c) => out.push(['cat:' + c.key, c.name, c.strength[D.last], imini(c.strength[D.last], c.color)]));
  const ord = insOrder(out.map((r) => r[0].replace(/^cat:/, 'cat:'))); const hid = M.settings.insHidden || [];
  const sorted = out.filter((r) => !hid.includes(r[0])).sort((a, b) => ord.indexOf('T:' + a[0]) - ord.indexOf('T:' + b[0]));
  sorted.push(['exp', 'Experiments', null, `<span class="imini">${icon('flask-conical', 18)}</span>`]);
  return sorted; }
// the landing order, kept in settings.insOrder as T:<key>; new tiles go at the end
function insOrder(keys) { const want = keys.map((k) => 'T:' + k); const cur = (M.settings.insOrder || []).filter((k) => want.includes(k)); want.forEach((k) => { if (!cur.includes(k)) cur.push(k); });
  M.settings.insOrder = cur.concat((M.settings.insOrder || []).filter((k) => !want.includes(k))); return cur; }
const insMine = () => (M.settings && M.settings.insCircles) || [];
function insName(D, k) { return { avoid: 'Avoidance', health: 'Health', feel: 'Feelings', much: 'Too much', symptoms: 'Symptoms' }[k] || ((D.circles.find((c) => 'cat:' + c.key === k) || {}).name) || k; }
// setting up my own circle: name, colour, and the things it counts
function inscSheet(s) { const D0 = s.draft; const Dd = insightData(); let groups;
  if (s.target === 'health') { const hs = Object.keys(M.items).filter((k) => I(k).type === 'tracker' && SCALES[I(k).scale] && I(k).scale !== 'symptom3'); groups = [['Health items', D0.ids.filter((k) => hs.includes(k)).concat(hs.filter((k) => !D0.ids.includes(k)))]]; }
  else { const own = (c) => { const ids = Object.keys(M.items).filter((k) => ITICK.includes(I(k).type) && !I(k).brk); const t = c.key; // the circle's own starting set, before my picks
      if (t.startsWith('r:')) return [t.slice(2)].concat(I(t.slice(2)) ? I(t.slice(2)).steps || [] : []).filter((k) => ids.includes(k)); return c.ids; };
    groups = Dd.circles.filter((c) => !c.mine).map((c) => [c.name, own(c)]); const seen = new Set(groups.flatMap((g) => g[1]));
    const rest = Object.keys(M.items).filter((k) => ITICK.includes(I(k).type) && !I(k).brk && !seen.has(k)); if (rest.length) groups.push(['Other', rest]);
    const trk = Object.keys(M.items).filter(insTrkOk); if (trk.length) groups.push(['Health', trk]); }
  return `${s.target === 'health' ? '' : `<div class="fld"><span class="mono">Name</span><input class="inp" id="iscname" value="${esc(D0.name)}" placeholder="e.g. Self-care" data-autofocus></div>`}
    <div class="fld"><span class="mono">Colour</span>${colorField('draft', D0.color)}</div>
    ${s.target === 'health' ? '' : `<div class="fld"><span class="mono">Tags</span><div class="chips">${Object.entries(M.tags || {}).map(([t, n]) => `<button class="chip" data-a="insctag" data-v="${t}" aria-pressed="${(D0.tags || []).includes(t)}">${esc(n)}</button>`).join('')}</div></div><span class="mono" style="display:block;margin:6px 0 2px">And these</span>`}
    ${groups.map(([n, ids]) => `<div class="fld"><span class="mono">${esc(n)}</span><div class="chips">${ids.map((id) => `<button class="chip" data-a="inscpick" data-v="${id}" aria-pressed="${D0.ids.includes(id)}">${esc(I(id).name)}</button>`).join('')}</div></div>`).join('')}
    ${s.target === 'mine' && !s.isNew ? `<button class="btn danger" style="width:100%;margin-top:8px" data-a="inscdel" data-ref="${s.ref}">Delete circle</button>` : ''}
    ${s.target === 'built' || s.target === 'health' ? `<button class="btn" style="width:100%;margin-top:8px" data-a="inscreset">Put back as it was</button>` : ''}`; }
const inscCapture = () => { const el = $('#iscname'); if (el && S.sheet && S.sheet.kind === 'insc') S.sheet.draft.name = el.value.trim(); };
function insSection() { const p = S.ins || 'home'; const k = p.split(':')[0];
  if (p === 'links:f' || k === 'feel') return 'feel'; if (p === 'links:m' || k === 'much') return 'much'; if (['health', 'item', 'symptoms', 'links'].includes(k)) return 'health'; if (k === 'avoid' || k === 'area') return 'avoid'; if (k === 'exp' || k === 'expNew') return 'exp';
  if (k === 'cat') return p; if (k === 'habit') { const D = insightData(); const c = D.circles.find((x) => x.ids.includes(p.slice(6))); return c ? 'cat:' + c.key : 'home'; } return 'home'; }
function insTitle() { const sec = insSection(); if (sec === 'home') return 'Insight'; const row = insSections().find((r) => r[0] === sec);
  return `<button class="vttl" data-a="insdrop" aria-haspopup="menu" aria-expanded="${!!S.insDrop}">${esc(row ? row[1] : 'Insight')} <span aria-hidden="true">▾</span></button>`; }
function insLayer() { if (!S.insDrop || !(S.insOn || S.page === 'insight')) return ''; const sec = insSection();
  return `<div class="scrim" style="background:transparent" data-a="insdrop"></div><div class="vdrop idrop" role="menu">${insSections().map(([k, n, v, lead]) => `<button role="menuitem" data-a="ins" data-v="${k}" aria-current="${k === sec}">${lead}<b>${esc(n)}</b>${v != null ? `<span>${ipct(v)}</span>` : ''}</button>`).join('')}</div>`; }
