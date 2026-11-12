// ===================== Verdict pages: Study and Home (2026-11-03) =====================
// One shared page system for both areas, big to small: a verdict card, a strip of smaller cards (rooms or subjects,
// most urgent first; first tap picks and filters, second tap opens), then the list of what needs you most.
// Home: Homemaking (things to tend), Chores (rooms like Tend), Cooking (planned prep). Study: subjects with task groups
// and deadlines, the study timer and Study support. Items are ordinary items, so one item can also sit in a day block.

// Runs inside migrate(), also while the file is still loading: only literals and helpers defined above may be used here.
function vMigrate(m) {
  if (!m.areas || !m.groups || !m.items) return;
  m.settings = m.settings || {};
  // example data: one study task well past its estimate, so the red lap shows (2026-11-04)
  if (m.example && m.settings.vb1 && !m.settings.vb2 && m.items['s-src']) { m.settings.vb2 = true; m.study = m.study || {}; const d = addDays(T0, -5); m.study[d] = (m.study[d] || []).concat([{ id: 's-src', min: 105 }]); m.log = m.log || {}; m.log[d] = m.log[d] || {}; }
  if (m.areas.study && m.areas.study.name === 'Study' && !m.settings.studies1) { m.settings.studies1 = true; m.areas.study.name = 'Studies'; }
  // sample repeating study tasks, so the repeat urgency line shows (2026-11-04)
  if (m.example && m.settings.vb1 && !m.settings.vb3) { m.settings.vb3 = true; if (m.items['s-form']) m.items['s-form'].when = { mode: 'every', n: 7 }; if (m.items['s-ch5']) m.items['s-ch5'].when = { mode: 'every', n: 14 }; }
  if (m.settings.vb1) return; m.settings.vb1 = true; m.settings.vb2 = true;
  m.areas.home = Object.assign(m.areas.home || { name: 'Home', icon: 'house', color: '#EDBB3A' }, { pages: [], nav: 'verdict' });
  m.areas.study = Object.assign(m.areas.study || { name: 'Study', icon: 'graduation-cap', color: '#3FAFA6' }, { pages: [], nav: 'verdict' });
  m.pages.homemaking = m.pages.homemaking || { name: 'Homemaking', color: '#7DBE9A' };
  m.pages.chores = m.pages.chores || { name: 'Chores', color: '#EDBB3A' };
  m.pages.cooking = m.pages.cooking || { name: 'Cooking', color: '#F08A3E' };
  const ex = !!m.example; m.log = m.log || {};
  const it = (id, o) => { if (!m.items[id]) m.items[id] = Object.assign({ type: 'task', made: addDays(T0, -40), tags: [], insight: true, kind: 'behaviour', dur: 20 }, o); return id; };
  const done = (id, ...ago) => ago.forEach((k) => { const d = addDays(T0, -k); (m.log[d] = m.log[d] || {})[id] = 'done'; });
  const every = (n) => ({ mode: 'every', n });
  const job = (id, name, n, ago) => { it(id, { name, when: every(n) }); if (ex && ago != null) done(id, ago); return id; };
  const R = [['rm-kitchen', 'Kitchen'], ['rm-bath', 'Bathroom'], ['rm-bed', 'Bedroom'], ['rm-laundry', 'Laundry'], ['rm-living', 'Living room']];
  const jobs = ex ? {
    'rm-kitchen': [job('j-hob', 'Clean the hob', 4, 3), 't-wipe', job('j-mop', 'Mop the floor', 7, 6), job('j-fridge', 'Clean the fridge', 30, 44)],
    'rm-bath': [job('j-sink', 'Clean the sink', 7, 6), job('j-toilet', 'Clean the toilet', 7, 2), job('j-screen', 'Shower screen', 14, 3)],
    'rm-bed': [job('j-hoover', 'Hoover', 7, 6), job('j-bedding', 'Change the bedding', 14, 5)],
    'rm-laundry': ['t-wash', job('j-fold', 'Fold and put away', 3, 1)],
    'rm-living': [job('j-dust', 'Dust the shelves', 14, 4), job('j-hoover2', 'Hoover', 7, 2)] } : {};
  m.groups['g-rooms'] = m.groups['g-rooms'] || { name: 'Rooms', holds: 'rooms', kids: [] };
  R.forEach(([id, name]) => { if (!m.groups[id]) { m.groups[id] = { name, style: 'room', holds: 'task', color: '#EDBB3A', kids: (jobs[id] || []).filter((k) => m.items[k]) }; m.groups['g-rooms'].kids.push(id); } });
  m.groups['g-oneoff'] = m.groups['g-oneoff'] || { name: 'One-off', style: 'vlist', holds: 'task', color: '#EDBB3A', kids: ex ? [it('o-car', { name: 'Vacuum the car', when: { mode: 'once', date: addDays(T0, -1) }, insight: false }), it('o-oven', { name: 'Clean the oven', when: { mode: 'once', date: null }, insight: false })] : [] };
  m.groups['g-tend'] = m.groups['g-tend'] || { name: 'Tending', style: 'vlist', holds: 'task', color: '#7DBE9A', kids: ex ? [job('h-plants', 'Water the plants', 3, 1), job('h-micro', 'Tend the microgreens', 1, 1), job('h-dough', 'Feed the sourdough', 7, 1)] : [] };
  if (ex) { it('p-thaw', { name: 'Thaw the mince', when: { mode: 'once', date: addDays(T0, 2) }, note: 'Into the fridge the night before', insight: false, icon: 'cooking-pot', color: '#F08A3E' });
    if (m.groups['b-evening'] && !m.groups['b-evening'].kids.includes('p-thaw')) m.groups['b-evening'].kids.unshift('p-thaw'); }
  m.groups['g-prep'] = m.groups['g-prep'] || { name: 'Planned prep', style: 'vlist', holds: 'task', color: '#F08A3E', kids: ex ? ['t-brine', 'p-thaw'].filter((k) => m.items[k]) : [] };
  // Study: subjects > task groups (optional deadline) > study tasks (optional estimate in hours)
  m.groups['g-subjects'] = m.groups['g-subjects'] || { name: 'Subjects', holds: 'subjects', kids: [] };
  if (ex) {
    const task = (id, name, est, made) => it(id, { name, when: { mode: 'once', date: null }, est, insight: false, made: addDays(T0, -(made || 20)), dur: 60 });
    const sg = (id, name, color, deadline, kids) => { m.groups[id] = { name, style: 'sgroup', holds: 'task', color, deadline, kids }; return id; };
    const subj = (id, name, color, kids) => { if (m.groups[id]) return; m.groups[id] = { name, style: 'subject', holds: 'sgroups', color, kids }; m.groups['g-subjects'].kids.push(id); };
    subj('sb-psy', 'Psychology', '#3FAFA6', [sg('sg-exam', 'Exam', '#3FAFA6', addDays(T0, 10), [task('s-rev', 'Exam revision', 20), task('s-past', 'Past paper 2023', 2), task('s-flash', 'Flashcards: chapters 1 to 4', 3)]), sg('sg-read', 'Reading', '#3FAFA6', null, [task('s-ch5', 'Read chapter 5', 0, 9)])]);
    subj('sb-aw', 'Academic writing', '#6F9BD6', [sg('sg-essay', 'Essay', '#6F9BD6', addDays(T0, 3), [task('s-src', 'Find three sources', 1), task('s-draft', 'Essay draft', 4)])]);
    subj('sb-stat', 'Statistics', '#A877C4', [sg('sg-prac', 'Practice', '#A877C4', null, [task('s-form', 'Formula practice', 0, 29)])]);
    m.study = m.study || {}; const st = (k, rows) => { const d = addDays(T0, -k); m.study[d] = rows; m.log[d] = m.log[d] || {}; };
    st(1, [{ id: 's-rev', min: 95 }]); st(2, [{ id: 's-src', min: 40 }]); st(5, [{ id: 's-src', min: 105 }]); st(4, [{ id: 's-past', min: 140 }, { id: 's-rev', min: 60 }]); st(6, [{ id: 's-rev', min: 45 }]);
    m.support = m.support || {}; const d3 = addDays(T0, -3); m.support[d3] = { text: '', min: 30, ms: 1800000 }; m.log[d3] = m.log[d3] || {};
  }
  // Slots: a Today task that opens an area to pick the actual thing (2026-10-27). Study session, Daily chore.
  it('sl-study', { name: 'Study session', type: 'slot', opens: 'study', when: { mode: 'every', n: 1 }, icon: 'graduation-cap', color: '#3FAFA6', dur: 60, made: T0 });
  it('sl-chore', { name: 'Daily chore', type: 'slot', opens: 'chores', when: { mode: 'every', n: 1 }, icon: 'spray-can', color: '#EDBB3A', dur: 20, made: T0 });
  m.groups['g-slots'] = m.groups['g-slots'] || { name: 'Slots', holds: 'slot', kids: ['sl-study', 'sl-chore'] };
  if (ex) { const b = (k, id) => { if (m.groups[k] && !m.groups[k].kids.includes(id)) m.groups[k].kids.unshift(id); }; b('b-study', 'sl-study'); b('b-evening', 'sl-chore'); }
  m.settings.studyLen = m.settings.studyLen || 30;
}

const SEG0 = '#E3DDD2', SEGOK = '#A9B5A3', SEGSOFT = '#CFD5C8', SEGDUE = '#C8843A', SEGLATE = '#B5623E';
const VDOT = ['#9DB09A', '#AEB5A2', '#C8843A', '#B5623E'];
const VTONE = ['#A3BFA2', '#BFC59B', '#E7BB72', '#DE9580'];
const CHORE_W = ['Fresh', 'Tidy', 'Due a clean', 'Needs care'];
const TEND_W = ['All tended', 'Mostly tended', 'Due soon', 'Needs tending'];
const VGROUPS = ['g-rooms', 'g-oneoff', 'g-tend', 'g-prep', 'g-subjects', 'g-slots'];
const HOME_PAGES = ['chores', 'homemaking', 'cooking', 'shopping'];
const LONGWD = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ---------- model ----------
const roomIds = () => (G('g-rooms') ? G('g-rooms').kids.filter(G) : []);
const kidsOf = (gid) => (G(gid) ? G(gid).kids.filter((k) => I(k)) : []);
const everDone = (id) => Object.keys(M.log).some((d) => val(d, id));
// study tasks (2026-11-10): a one-off is finished once ticked and goes to the Archive; a repeat never finishes, a tick just starts the count to the next one
const sFinished = (k) => !repeatable(I(k)) && !keeps(k) && everDone(k);
const sLastDone = (k) => isDone(k, T0) ? T0 : lastDoneBefore(k, T0);
// how many days a repeat lasts before it's due again
function period(it) { const w = (it && it.when) || {}; const n = Math.max(1, w.n || 1);
  if (w.mode === 'every') return n; if (w.mode === 'days') return Math.max(1, Math.round(7 * n / Math.max(1, (w.days || []).length)));
  if (w.mode === 'month') return 30 * n; if (w.mode === 'year') return 365 * n; return 0; }
// Freshness, like Tend: full when done, fading toward the due date. Never done counts as due today.
function freshOf(id, place) { const n = period(I(id)) || 7; const last = isDone(id, T0) ? T0 : lastDoneBefore(id, T0);
  const since = last ? diff(last, T0) : n; const left = n - since;
  return { id, place, n, last, since, left, fresh: Math.max(0, Math.min(1, left / n)), urg: since / n }; }
// a job with no frequency still belongs to its room: it needs doing until it has been done once
const jobsIn = (gid) => kidsOf(gid).filter((k) => period(I(k)) || (!repeatable(I(k)) && (keeps(k) || !lastDoneBefore(k, T0) || isDone(k, T0)))).map((k) => freshOf(k, gid));
const allJobs = () => roomIds().flatMap(jobsIn);
function verdict(jobs, W) { if (!jobs.length) return { lvl: 0, word: W[0] };
  const avg = jobs.reduce((a, j) => a + j.fresh, 0) / jobs.length; let lvl = avg >= 0.75 ? 0 : avg >= 0.5 ? 1 : avg >= 0.25 ? 2 : 3;
  if (jobs.some((j) => j.left < 0)) lvl = Math.max(lvl, 2); return { lvl, word: W[lvl] }; }
const jobInk = (j) => j.left < 0 ? SEGLATE : j.fresh < 0.34 ? SEGDUE : SEGOK;
const roomRank = (r) => { const J = jobsIn(r); return verdict(J, CHORE_W).lvl * 100 + Math.max(0, ...J.map((j) => j.urg)); };
const choreIds = () => roomIds().flatMap(kidsOf).concat(kidsOf('g-oneoff'));
const prepsOpen = () => kidsOf('g-prep').filter((k) => !everDone(k)).sort((a, b) => ((I(a).when || {}).date || '9999').localeCompare((I(b).when || {}).date || '9999') || (I(a).time || '').localeCompare(I(b).time || ''));

// study
const subjIds = () => (G('g-subjects') ? G('g-subjects').kids.filter(G) : []);
const sgroupsOf = (s) => (G(s) ? G(s).kids.filter(G) : []);
const sIds = (s) => sgroupsOf(s).flatMap(kidsOf);
const studyRows = (d) => ((M.study || {})[d] || []);
const minOn = (ids, d) => studyRows(d).filter((x) => !ids || ids.includes(x.id)).reduce((a, x) => a + x.min, 0);
const taskMin = (id) => Object.keys(M.study || {}).reduce((a, d) => a + minOn([id], d), 0);
const supMin = (d) => (((M.support || {})[d] || {}).min || 0);
const sessLen = () => M.settings.studyLen || 30;
function lastStudied(ids) { const ks = Object.keys(M.study || {}).filter((d) => d <= T0 && minOn(ids, d) > 0).sort(); return ks[ks.length - 1] || null; }
const hrs = (min) => Math.round(min / 6) / 10;
// estimates are kept in hours; they show and are typed as hours and minutes, like 1h 30m or 30m (2026-11-04)
function estHM(h) { const m = Math.max(0, Math.round((+h || 0) * 60)); const a = Math.floor(m / 60), b = m % 60; return a && b ? a + 'h ' + b + 'm' : a ? a + 'h' : b + 'm'; }
function parseHM(s) { s = String(s || '').trim().toLowerCase().replace(',', '.'); if (!s) return 0;
  const h = s.match(/(\d+(?:\.\d+)?)\s*h/), m = s.match(/(\d+)\s*m/); if (h || m) return (h ? +h[1] : 0) + (m ? +m[1] / 60 : 0);
  const n = parseFloat(s); return isNaN(n) ? 0 : n; }
function tInfo(k, s, g) { const it = I(k); const dl = it.due || G(g).deadline || null; const l1 = lastStudied([k]), l2 = sLastDone(k); const last = l1 && l2 ? (l1 > l2 ? l1 : l2) : l1 || l2;
  return { id: k, subj: s, g, dl, due: dl ? diff(T0, dl) : undefined, done: hrs(taskMin(k)), est: +it.est || 0, since: last ? diff(last, T0) : Math.max(0, diff(it.made || T0, T0)) }; }
function sTasks(s) { return sgroupsOf(s).flatMap((g) => kidsOf(g).filter((k) => !sFinished(k)).map((k) => tInfo(k, s, g))); }
const dayBar = (ids) => Array.from({ length: 7 }, (_, i) => { const d = addDays(T0, i - 6); return minOn(ids, d) > 0 ? SEGOK : !ids && supMin(d) > 0 ? SEGSOFT : SEG0; });
const lowDay = (d) => { const r = relDay(d); return r === fmtDate(d) ? r : r.toLowerCase(); };
function revGaps(t) { const it = I(t.id); const n = period(it) || SDEF; const from = addDays(T0, -Math.min(180, n * 10)); const start = it.made && it.made > from ? it.made : from;
  const days = Object.keys(M.study || {}).filter((d) => d >= start && d <= T0 && minOn([t.id], d) > 0).concat(Object.keys(M.log || {}).filter((d) => d >= start && d <= T0 && isDone(t.id, d))).filter((d, i, a) => a.indexOf(d) === i).sort();
  const pts = (it.made && it.made >= start ? [it.made] : []).concat(days); const gaps = []; for (let i = 1; i < pts.length; i++) gaps.push(diff(pts[i - 1], pts[i]));
  gaps.push(t.since); const last = gaps.slice(-4); return { now: t.since / n, avg: last.reduce((a, b) => a + b, 0) / last.length / n }; }
const VLVL = { 'On track': 0, 'Review due': 1, 'Slipping': 2, 'Deadline close': 3, 'All done, review due': 1, 'All done, but slipping': 1, 'On track, deadline close': 2, 'All done, deadline close': 3, 'Deadline overdue': 3 };
function subjVerdict(s) {
  const T = sTasks(s); const ids = sIds(s); const last = lastStudied(ids);
  const close = T.filter((t) => t.due !== undefined && t.due <= 3 && (!t.est || t.done < t.est));
  // deadlines and review are told apart (2026-11-10): tasks with a deadline are On track or Deadline close; tasks without one come back
  // on their own rhythm (their repeat, else every 7 days): past it = Review due, past twice it = Slipping
  // Slipping looks at the AVERAGE gap between reviews (2026-11-10: one review after three weeks isn't on track): the last 4 gaps,
  // the open one since the last review included; an average over 1.5 times the rhythm = Slipping, the open gap past the rhythm = Review due
  const rev = T.filter((t) => t.due === undefined).map(revGaps);
  const over = close.filter((t) => t.due < 0); // a deadline that has passed with work left (2026-11-10)
  const word = over.length ? 'Deadline overdue' : close.length ? 'Deadline close' : rev.some((r) => r.avg > 1.5) ? 'Slipping' : rev.some((r) => r.now > 1) ? 'Review due' : 'On track';
  const next = T.filter((t) => t.due !== undefined).sort((a, b) => a.due - b.due)[0];
  const wk = Array.from({ length: 7 }, (_, i) => minOn(ids, addDays(T0, -i))).reduce((a, b) => a + b, 0);
  const sub = next ? 'Next deadline: ' + G(next.g).name.toLowerCase() + ', ' + (next.due === 0 ? 'today' : next.due < 0 ? 'overdue' : lowDay(next.dl)) + '.' : 'No deadlines coming up.';
  const revS = rev.some((r) => r.avg > 1.5) ? 'slip' : rev.some((r) => r.now > 1) ? 'due' : '';
  return { word, close: !!close.length, over: !!over.length, revS, lvl: VLVL[word] || 0, sub, tasks: T, segs: taskSegs(T), foot: taskFoot(T), wk };
}
function studyVerdict() {
  const V = subjIds().map(subjVerdict); const T = V.flatMap((v) => v.tasks); const b = dayBar(null);
  const sd = b.filter((c) => c === SEGOK).length, ud = b.filter((c) => c === SEGSOFT).length;
  const wk = Array.from({ length: 7 }, (_, i) => minOn(null, addDays(T0, -i))).reduce((a, c) => a + c, 0);
  const next = T.filter((t) => t.due !== undefined && t.due >= 0).sort((a, c) => a.due - c.due)[0];
  // Study support counts as showing up (2026-10-28): never framed as missed study
  // the main card tells deadlines and review apart (2026-11-10): deadlines decide the first part, review adds "but slipping" or "review due"
  const rs = V.some((v) => v.revS === 'slip') ? 'slip' : V.some((v) => v.revS === 'due') ? 'due' : '';
  // main verdict (2026-11-10): the first word is review (On track = nothing slipping or due, All done = tasks done but a review
  // is due or slipping in at least one subject), the second is a deadline coming up. Best to worst: On track, All done (review due / but slipping),
  // On track, deadline close, All done, deadline close
  const dl = V.some((v) => v.close); const head = rs ? 'All done' : 'On track';
  const word = !subjIds().length ? 'No subjects yet' : V.some((v) => v.over) ? 'Deadline overdue' : dl ? head + ', deadline close' : rs === 'slip' ? 'All done, but slipping' : rs === 'due' ? 'All done, review due' : 'On track';
  return { word, lvl: VLVL[word] || 0,
    // just the next deadline (2026-11-06)
    sub: next ? 'Next deadline: ' + G(next.g).name.toLowerCase() + ', ' + lowDay(next.dl) + '.' : 'No deadlines coming up.',
    segs: taskSegs(T), foot: taskFoot(T), week: sd + (sd === 1 ? ' study day, ' : ' study days, ') + ud + (ud === 1 ? ' support day, ' : ' support days, ') + (wk ? dur(wk) : '0 min') + ' studied.' };
}
const subjRank = (s) => { const v = subjVerdict(s); return v.lvl * 1000 + Math.max(0, ...v.tasks.map((t) => t.due !== undefined ? 100 - t.due : t.since)); };

// slots: done when their area was used that day
function slotDone(it, d) {
  if (it.opens === 'study') return minOn(null, d) >= sessLen() || supMin(d) >= sessLen();
  if (it.opens === 'chores') return choreIds().some((k) => val(d, k));
  if (it.opens === 'training') return typeof trainedOn === 'function' && trainedOn(d).length > 0;
  if (it.opens === 'hobbies') return typeof hobIds === 'function' && hobIds().some((h) => hobActs(h).some((k) => val(d, k)) || hobProjs(h).some((p) => (G(p).worked || []).includes(d) || projTasks(p).some((k) => val(d, k))));
  return false; }
function slotSub(it) { if (it.opens === 'study') { const m = minOn(null, T0), s = supMin(T0); return s >= sessLen() ? 'Study support done' : ''; } // no 'Opens …', the arrow says it (2026-11-04)
  if (it.opens === 'training' || it.opens === 'hobbies') return '';
  const n = choreIds().filter((k) => val(T0, k)).length; return n ? n + ' done today' : ''; }
function slotGo(id) { const it = I(id); S.sheet = null; S.fromSlot = id; S.room = null; S.subj = null; S.pick = null; S.stv = null;
  if (it.opens === 'study') { S.area = 'study'; S.page = null; } else if (it.opens === 'training') { S.area = 'health'; S.page = 'training'; } else if (it.opens === 'hobbies') { S.area = 'hobbies'; S.page = null; S.proj = null; } else { S.area = 'home'; S.page = 'chores'; }
  render(); $('#main').scrollTop = 0; }

// ---------- blocks ----------
const segBar = (cols, cls = '') => `<span class="vseg ${cls}" aria-hidden="true">${cols.map((c) => `<i style="background:${c}"></i>`).join('')}</span>`;
function vCard(o) {
  const t = VTONE[o.lvl || 0]; const bg = darkOn ? `radial-gradient(130% 110% at 100% 0%,${mix(t, '#33302C', 0.5)} 0%,${mix(t, '#2E2B28', 0.8)} 55%,${mix(t, '#2A2825', 0.9)} 100%)` : `radial-gradient(125% 100% at 100% 0%,${mix(t, TH.card, 0.1)} 0%,${mix(t, TH.card, 0.7)} 58%,${mix(t, TH.card, 0.84)} 100%)`; // dark: the card glows warmer as it needs care
  const tag = o.go ? 'button' : 'div';
  return `<${tag} class="vcard" ${o.go || ''} style="background:${bg};border-color:${mix(t, TH.line, 0.55)}"><span class="mono">${esc(o.eyebrow)}</span>${o.go && !o.nochev ? '<span class="vchev" aria-hidden="true">›</span>' : ''}<span class="vword">${esc(o.word)}</span>${o.sub ? `<span class="vsub">${esc(o.sub)}</span>` : ''}${segBar(o.segs)}<span class="mono vfoot">${esc(o.foot)}</span></${tag}>`;
}
function choreCard(eyebrow, J, W, go, nochev) { const v = verdict(J, W); const late = J.filter((j) => j.left < 0).length; const soon = J.filter((j) => j.left >= 0 && j.left <= 7).length;
  return vCard({ eyebrow, word: J.length ? v.word : 'Nothing yet', lvl: v.lvl, go, nochev, sub: J.length ? (late ? late + ' overdue, ' : '') + soon + ' coming up this week.' : 'Add the jobs that keep coming back.',
    segs: J.length ? J.slice().sort((a, b) => b.fresh - a.fresh).map(jobInk) : [SEG0],
    foot: J.filter((j) => j.fresh >= 0.34).length + ' fresh · ' + J.filter((j) => j.fresh < 0.34 && j.left >= 0).length + ' coming due · ' + late + ' overdue' }); }
function cookCard(go) { const P = prepsOpen(); const nx = P[0] && I(P[0]); const nd = nx && (nx.when || {}).date;
  return vCard({ eyebrow: 'Cooking', go, lvl: 0, word: P.length ? P.length + (P.length === 1 ? ' prep planned' : ' preps planned') : 'Nothing planned',
    sub: nx ? 'Next: ' + nx.name.toLowerCase() + ', ' + (nd ? lowDay(nd) : 'no date yet') + (nx.time ? ' ' + nx.time : '') + '.' : 'No prep waiting.',
    segs: Array.from({ length: 7 }, (_, i) => { const d = addDays(T0, i); return P.some((k) => (I(k).when || {}).date === d) ? (i === 0 ? SEGOK : SEGSOFT) : SEG0; }), foot: 'This week · one bar per day' }); }
// a picked card is outlined in its own verdict colour (2026-11-10)
const stripCard = (id, name, lvl, word, segs, on) => `<button class="vroom ${on ? 'on' : ''}" data-a="vpick" data-ref="${id}" aria-pressed="${on}"${on ? ` style="border-color:${VDOT[lvl]}"` : ''}><b>${esc(name)}</b><span class="vv"><i style="background:${VDOT[lvl]}"></i>${esc(word)}</span>${segBar(segs, 'sm')}</button>`;
function jobRow(j, place, plain) { const it = I(j.id); const late = j.left < 0; const filled = late ? 7 : Math.max(1, 7 - Math.round(j.fresh * 7));
  if (!plain) { const on = isDone(j.id, T0); const c = late ? SEGLATE : SEGDUE; // tick circle like Study (2026-11-04)
    return `<div class="vjob vtk" data-ref="${j.id}"><button class="tickbtn" data-a="vtick" data-ref="${j.id}" aria-label="Tick ${esc(it.name)} as done today" aria-pressed="${on}"><span class="circ ${on ? 'done vcol' : ''}" style="--c:${c}">${on ? '✓' : ''}</span></button>${jobRow(j, place, true).replace('<button class="vjob" data-a="vjob"', '<button class="vjin" data-a="sched"')}</div>`; }
  const unit = late ? (j.left === -1 ? 'day overdue' : 'days overdue') : j.left === 1 ? 'day left' : 'days left';
  return `<button class="vjob" data-a="vjob" data-ref="${j.id}"><span class="vjh"><span class="vjt"><b>${esc(it.name)}</b></span><span class="vbig"><em ${late ? 'class="late"' : ''}>${Math.abs(j.left)}</em> ${unit}</span></span><span class="mono vjm">${esc(place)}</span>${segBar(Array.from({ length: 7 }, (_, i) => i < filled ? (late ? SEGLATE : SEGDUE) : SEG0))}</button>`; }
// tick: the subject page's version, with a circle on the left in the urgency bar's colour; the rest of the card opens the timer (2026-11-04)
function taskRow(t, tick) { const it = I(t.id);
  if (tick) { const u = studyUrg(t); const c = u ? u[0] : '#ABA59C'; const on = !!val(T0, t.id);
    return `<div class="vjob vtk" data-ref="${t.id}"><span class="vtc"><button class="vtim" data-a="vtimer" data-ref="${t.id}" aria-label="Study ${esc(it.name)} with the timer">${icon('timer', 30.375, 1.383)}</button><button class="tickbtn" data-a="vtick" data-ref="${t.id}" aria-label="Tick ${esc(it.name)} as finished" aria-pressed="${on}"><span class="circ ${on ? 'done vcol' : ''}" style="--c:${c}">${on ? '✓' : ''}</span></button></span>${taskRow(t).replace('<button class="vjob" data-a="vtimer"', '<button class="vjin" data-a="sched"')}</div>`; }
  return `<button class="vjob" data-a="vtimer" data-ref="${t.id}"><span class="vjh"><span class="vjt"><b>${esc(it.name)}</b></span><span class="vbig"><em ${t.due !== undefined && t.due < 0 ? 'class="late"' : ''}>${t.due !== undefined ? Math.abs(t.due) : t.since}</em> ${t.due !== undefined ? (t.due < 0 ? (t.due === -1 ? 'day overdue' : 'days overdue') : t.due === 1 ? 'day to deadline' : 'days to deadline') : t.since === 1 ? 'day since' : 'days since'}</span></span><span class="mono vjm">${esc(G(t.subj).name)}${t.est ? ` · <span class="nw">${estHM(taskMin(t.id) / 60)} of ${estHM(t.est)}</span>` : ''}</span>${studyUrg(t) ? segBar(studyUrg(t)) : ''}${progLine(t.done, t.est)}</button>`; }
// Study tasks get the same urgency bar as Home (only with a deadline, 2026-11-04) (2026-11-04): it fills toward the deadline, from when the task was made,
// and turns red once the deadline has passed. Without a deadline, only a repeating task has the bar: it fills like Home freshness from the last time I studied it (2026-11-04).
// every task has an urgency line (2026-11-06): a task with no deadline and no repeat fills over a week since I last studied it
const SDEF = 7;
// a task's colour for the subject cards, like a job's for the room cards
function taskInk(t) { const it = I(t.id); let f;
  if (t.due !== undefined) { if (t.due < 0) return SEGLATE; f = 1 - t.due / Math.max(1, diff(it.made || T0, t.dl)); }
  else { const n = period(it) || SDEF; if (t.since > n) return SEGLATE; f = t.since / n; }
  return f > 0.66 ? SEGDUE : SEGOK; }
// the verdict line, like Chores (2026-11-06): one segment per open task in its urgency colour, calm first, overdue last; the foot counts them
const INKR = (c) => c === SEGLATE ? 2 : c === SEGDUE ? 1 : 0;
const taskSegs = (T) => T.length ? T.map(taskInk).sort((a, b) => INKR(a) - INKR(b)) : [SEG0];
const taskFoot = (T) => { const c = T.map(taskInk); return c.filter((x) => INKR(x) === 0).length + ' on track · ' + c.filter((x) => INKR(x) === 1).length + ' coming due · ' + c.filter((x) => INKR(x) === 2).length + ' overdue'; };
function studyUrg(t) { const it = I(t.id); let filled, late = false;
  if (t.due !== undefined) { late = t.due < 0; const total = Math.max(1, diff(it.made || T0, t.dl)); filled = late ? 7 : Math.max(1, Math.min(7, Math.round((1 - t.due / total) * 7))); }
  else { const n = period(it) || SDEF; late = t.since > n; filled = late ? 7 : Math.max(1, Math.min(7, Math.round(t.since / n * 7))); }
  return Array.from({ length: 7 }, (_, i) => i < filled ? (late ? SEGLATE : SEGDUE) : SEG0); }
const crumbs = (parts) => `<nav class="crumbs" aria-label="Where I am">${parts.map(([l, v], i) => i < parts.length - 1 ? `<button data-a="vcrumb" data-v="${v}">${esc(l)}</button><span aria-hidden="true">›</span>` : `<span aria-current="page">${esc(l)}</span>`).join('')}</nav>`;
const vlab = (t, extra = '') => `<div class="vlab"><span class="mono">${esc(t)}</span>${extra}</div>`;
const addRow = (act, v, label) => `<button class="addrow" data-a="${act}" data-v="${v}"><span class="plus">+</span>${esc(label)}</button>`;
// edit mode: the same lists as rows you can rename, recolour, drag, open (⚙) and remove
function eRow(id, list, sub) { const x = I(id) || G(id); const c = colorOf(id);
  return `<div class="row" data-ref="${id}">${grip()}<span class="circ" style="--c:${c}" data-col="${id}" role="button" aria-label="Change colour"></span><span class="lbl">${nm(id, x.name)}${sub ? `<span class="sub">${esc(sub)}</span>` : ''}</span>${tail(id, list)}</div>`; }
const eList = (gid, ids, label, act, subOf) => `<div class="card vecard"><div class="list" data-list="${gid}">${ids.map((k) => eRow(k, gid, subOf ? subOf(k) : '')).join('')}</div>${addRow(act, gid, label)}</div>`;
function tickRow(k, sub) { const it = I(k); const on = !!val(T0, k);
  return `<div class="row" data-ref="${k}"><button class="tickbtn" data-a="vtick" data-ref="${k}" aria-label="Tick ${esc(it.name)}"><span class="circ ${on ? 'done' : halfOf(k) ? 'half' : ''}" style="--c:${colorOf(k)}">${on ? '✓' : ''}</span></button><button class="lbl" data-a="sched" data-ref="${k}" style="text-align:left">${esc(it.name)}${sub ? `<span class="sub">${esc(sub)}</span>` : ''}</button></div>`; }
function onceSub(k) { const it = I(k); const d = (it.when || {}).date; const t = d ? (d < T0 ? 'Overdue · ' + relDay(d) : relDay(d)) : ''; return [t + (it.time ? ' ' + it.time : ''), it.note || ''].filter((x) => x.trim()).join(' · '); }
// The default simple list: a white card with its mono heading inside, like Today's blocks (2026-11-05).
// key = collapse key (null = always open); inner = the rows (and an add row, if any).
// the fold arrow: a chevron that turns up when its card is open (2026-11-08)
const fold = (open) => `<span class="chev fold ${open ? 'up' : ''}" aria-hidden="true">${icon('chevron-down', 18)}</span>`;
let foldTap = null;
document.addEventListener('click', (e) => { const a = e.target.closest && e.target.closest('[data-a]'); if (!a || !a.querySelector('.fold')) return; const sel = `[data-a="${a.dataset.a}"]` + (a.dataset.ref ? `[data-ref="${a.dataset.ref}"]` : '') + (a.dataset.v ? `[data-v="${a.dataset.v}"]` : '');
  requestAnimationFrame(() => { const f = document.querySelector(sel + ' .fold'); if (f) f.classList.add('turn'); }); }, true);
function lcard(key, title, count, inner) { const open = !key || S.edit || S.open[key] !== false;
  const hd = key ? `<button data-a="secopen" data-ref="${key}" aria-expanded="${open}" style="display:flex;align-items:center;gap:8px;width:100%;min-height:44px"><span class="nm mono" style="flex:1;text-align:left">${esc(title)}</span><span class="cnt">${esc(String(count || ''))}</span>${fold(open)}</button>`
    : `<span class="nm mono" style="flex:1">${esc(title)}</span><span class="cnt">${esc(String(count || ''))}</span>`;
  return `<section class="card lcard"><div class="bhead">${hd}</div>${open ? `<div class="list">${inner}</div>` : ''}</section>`; }
function sect(key, title, count, body) { const open = S.open[key] !== false;
  return `<button class="sechd vsec" data-a="secopen" data-ref="${key}" aria-expanded="${open}"><span class="mono">${esc(title)}</span><span class="cnt">${esc(count)}</span>${fold(open)}</button>${open ? body : ''}`; }

// ---------- pages ----------
function renderVerdict() {
  if (S.area === 'home') return !S.page ? homeLanding() : S.page === 'chores' ? (S.room && G(S.room) ? roomPage(S.room) : choresPage()) : S.page === 'homemaking' ? tendPage() : S.page === 'shopping' ? shopPage() : cookPage();
  if (S.stv === 'timer') return timerPage();
  return S.subj && G(S.subj) ? subjPage(S.subj) : studyLanding();
}
function homeLanding() {
  return choreCard('Chores', allJobs(), CHORE_W, 'data-a="vgo" data-v="chores"') + choreCard('Homemaking', jobsIn('g-tend'), TEND_W, 'data-a="vgo" data-v="homemaking"') + cookCard('data-a="vgo" data-v="cooking"') + shopBtn();
}
// edit mode on a Home page or Studies: which day block new tasks from here go in, and the icon they get by default (2026-11-11)
// the daily study minimum, set in Studies edit mode (2026-11-11)
function vMinCard() { return lcard(null, 'Study minimum', '', `<div class="inrow" style="justify-content:center;gap:18px;padding:4px 0 2px"><button class="btn" data-a="vsesslen" data-v="-5" aria-label="5 minutes less">−</button><b style="font-size:22px;font-family:var(--serif);font-weight:400">${sessLen()} min</b><button class="btn" data-a="vsesslen" data-v="5" aria-label="5 minutes more">+</button></div>`); }
function vDefaults(k, what) { const cur = defBlock(k);
  return lcard(null, 'New ' + what, '', `<div class="vdef"><span class="mono">Day block</span><div class="chips">${blockIds().map((b) => `<button class="chip" data-a="vdefblk" data-ref="${k}" data-v="${b}" aria-pressed="${cur === b}">${esc(G(b).name)}</button>`).join('')}</div><span class="mono" style="display:block;margin-top:14px">Default icon</span><div><button class="btn" data-a="iconfor" data-v="ui:def-${k}" style="display:inline-flex;gap:8px;align-items:center;margin-top:6px">${icon(uiIc('def-' + k, DEFIC[k]), 18)} Change icon</button></div></div>`); }
function choresPage() {
  const J = allJobs(); let h = crumbs([['Home', ''], ['Chores']]) + choreCard('Chores', J, CHORE_W, S.edit ? '' : 'data-a="vunpick" aria-label="Show what needs care in every room"', true);
  if (S.edit) h += vlab('Rooms') + eList('g-rooms', roomIds(), 'Add room', 'vaddroom', (r) => kidsOf(r).length + (kidsOf(r).length === 1 ? ' job' : ' jobs'));
  else {
    const pick = S.pick && roomIds().includes(S.pick) ? S.pick : null;
    h += vlab('Rooms') + `<div class="vstrip">${roomIds().slice().sort((a, b) => roomRank(b) - roomRank(a)).map((r) => { const Jr = jobsIn(r); const v = verdict(Jr, CHORE_W); return stripCard(r, G(r).name, v.lvl, Jr.length ? v.word : 'No jobs yet', Jr.length ? Jr.map(jobInk) : [SEG0], pick === r); }).join('')}</div>`;
    const listed = (pick ? J.filter((j) => j.place === pick) : J.filter((j) => j.fresh < 0.5)).sort((a, b) => b.urg - a.urg);
    h += vlab(pick ? G(pick).name : 'Needs care') + (listed.length ? listed.map((j) => jobRow(j, G(j.place).name)).join('') : `<p class="empty">${pick ? 'No jobs in this room yet.' : 'Nothing needs care right now.'}</p>`);
    // no Open button for a picked room; tapping its card again opens it (2026-11-10)
  }
  const oo = kidsOf('g-oneoff').filter((k) => keeps(k) || !everDone(k) || val(T0, k)).sort((a, b) => ((I(a).when || {}).date || '9999').localeCompare((I(b).when || {}).date || '9999'));
  h += S.edit ? vlab('One-off') + eList('g-oneoff', kidsOf('g-oneoff'), 'Add chore', 'vadd', (k) => onceSub(k)) + vDefaults('chores', 'chores')
    : lcard('v:oneoff', 'One-off', oo.length || '', (oo.map((k) => tickRow(k, onceSub(k))).join('') || '<p class="empty">No chores.</p>'));
  return h;
}
const SUGGEST = [[/kitchen/i, [['Wipe counters', 3], ['Clean the hob', 7], ['Mop the floor', 7], ['Clean the fridge', 30], ['Take out the bins', 3]]],
  [/bath|toilet|shower/i, [['Clean the sink', 7], ['Clean the toilet', 7], ['Shower screen', 14], ['Wash the bath mat', 14]]],
  [/bed/i, [['Change the bedding', 14], ['Hoover', 7], ['Dust', 14], ['Tidy the wardrobe', 30]]],
  [/laundry|utility/i, [['Wash a load', 3], ['Fold and put away', 3], ['Clean the filter', 30]]],
  [/living|lounge|sitting/i, [['Hoover', 7], ['Dust the shelves', 14], ['Plump the cushions', 7]]],
  [/.*/, [['Hoover', 7], ['Dust', 14], ['Tidy up', 3]]]];
function roomPage(r) {
  const J = jobsIn(r); let h = crumbs([['Home', ''], ['Chores', 'chores'], [G(r).name]]) + choreCard(G(r).name, J, CHORE_W);
  if (S.edit) { h += vlab('Jobs') + eList(r, kidsOf(r), 'Add job', 'vadd', (k) => whenText(I(k))); if (!kidsOf(r).length) { const sg0 = SUGGEST.find(([re]) => re.test(G(r).name))[1]; h += `<div class="chips" style="margin:8px 0">${sg0.map(([n, d]) => `<button class="chip" data-a="vsugg" data-ref="${r}" data-v="${esc(n)}|${d}">+ ${esc(n)}</button>`).join('')}</div>`; } return h; }
  h += vlab('Jobs') + J.sort((a, b) => b.urg - a.urg).map((j) => jobRow(j, whenText(I(j.id)))).join('');
  if (!J.length) { const sg = SUGGEST.find(([re]) => re.test(G(r).name))[1];
    h += `<p class="empty">No jobs yet.</p>`; }
  return h;
}
function tendPage() {
  const J = jobsIn('g-tend'); let h = crumbs([['Home', ''], ['Homemaking']]) + choreCard('Homemaking', J, TEND_W);
  if (S.edit) return h + vlab('Tending') + eList('g-tend', kidsOf('g-tend'), 'Add something to tend', 'vadd', (k) => whenText(I(k))) + vDefaults('tend', 'homemaking tasks');
  return h + sect('v:tend', 'Tending', J.length + (J.length === 1 ? ' item' : ' items'), J.sort((a, b) => b.urg - a.urg).map((j) => jobRow(j, whenText(I(j.id)))).join(''));
}
function cookPage() {
  let h = crumbs([['Home', ''], ['Cooking']]) + cookCard();
  if (S.edit) return h + vlab('Planned prep') + eList('g-prep', kidsOf('g-prep'), 'Add prep', 'vadd', (k) => onceSub(k)) + vDefaults('prep', 'prep');
  const P = kidsOf('g-prep').filter((k) => keeps(k) || !everDone(k) || val(T0, k)).sort((a, b) => ((I(a).when || {}).date || '9999').localeCompare((I(b).when || {}).date || '9999'));
  // a prep with sub-tasks shows them under it, indented, each with its own tick (2026-11-06: Pizza › Dough)
  const subs = (k) => (I(k).steps || []).filter(I).map((sid) => { const on = everDone(sid); return `<div class="row substep" data-ref="${sid}"><button class="tickbtn" data-a="psub" data-ref="${sid}" aria-label="Tick ${esc(I(sid).name)}"><span class="circ ${on ? 'done' : ''}" style="--c:${colorOf(k)}">${on ? '✓' : ''}</span></button><span class="lbl">${esc(I(sid).name)}</span></div>`; }).join('');
  const subCount = (k) => { const st = (I(k).steps || []).filter(I); return st.length ? ` · ${st.filter(everDone).length} of ${st.length} done` : ''; };
  return h + `<div style="margin-top:14px">` + lcard(null, 'Planned prep', P.length || '', (P.map((k) => tickRow(k, onceSub(k) + subCount(k)) + subs(k)).join('') || '<p class="empty">Nothing planned. Brining, thawing or batch cooking go here.</p>') + (S.edit ? addRow('vadd', 'g-prep', 'Add prep') : '')) + '</div>';
}
function studyLanding() {
  const V = studyVerdict(); let h = vCard({ eyebrow: studyName(), word: V.word, lvl: V.lvl, sub: V.sub, segs: V.segs, foot: V.foot, go: S.edit ? '' : 'data-a="vunpick" aria-label="Show what needs me most in every subject"', nochev: true });
  if (S.edit) return h + vlab('Subjects') + eList('g-subjects', subjIds(), 'Add subject', 'vaddsubj', (s) => sgroupsOf(s).length + (sgroupsOf(s).length === 1 ? ' group' : ' groups')) + vMinCard() + vDefaults('study', 'study tasks');
  if (!subjIds().length) return h;
  const pick = S.pick && subjIds().includes(S.pick) ? S.pick : null;
  h += vlab('Subjects') + `<div class="vstrip">${subjIds().slice().sort((a, b) => subjRank(b) - subjRank(a)).map((s) => { const v = subjVerdict(s); return stripCard(s, G(s).name, v.lvl, v.word, v.tasks.length ? v.tasks.map(taskInk) : [SEG0], pick === s); }).join('')}</div>`;
  // one order for deadlines and repeats: how full the urgency line is, overdue first; tasks with no line last (2026-11-04)
  const urg = (t) => { const it = I(t.id);
    if (t.due !== undefined) { const total = Math.max(1, diff(it.made || T0, t.dl)); return t.due < 0 ? 10 - t.due / total : 1 - t.due / total; }
    const n = period(it); if (n) return t.since > n ? 10 + (t.since - n) / n : t.since / n;
    return t.since > SDEF ? 10 + (t.since - SDEF) / SDEF : t.since / SDEF; };
  // order picker on the right of the heading (2026-11-04); the choice is remembered
  const ord = ['urg', 'dl', 'since'].includes(M.settings.studySort) ? M.settings.studySort : 'urg';
  const by = { urg: (a, b) => urg(b) - urg(a), dl: (a, b) => (a.due === undefined) - (b.due === undefined) || (a.due || 0) - (b.due || 0) || urg(b) - urg(a), since: (a, b) => b.since - a.since };
  // Show filter in the same menu (2026-11-06): all tasks, or only the ones scheduled for today (their day or a session today)
  const todayOnly = M.settings.studyShow === 'today';
  const T = subjIds().filter((s) => !pick || s === pick).flatMap(sTasks).filter((t) => !todayOnly || schedToday(t.id))
    // a repeat only needs me once its review is 2 days off or less (2026-11-10); a picked subject still lists everything
    .filter((t) => pick || t.due !== undefined || !repeatable(I(t.id)) || (period(I(t.id)) || SDEF) - t.since <= 2).sort(by[ord] || by.urg);
  const ORD = [['urg', 'Most urgent'], ['dl', 'Soonest deadline'], ['since', 'Longest since studied']];
  const ob = `<span class="vsortw"><button class="fbtn" data-a="vsortopen" aria-label="Order" aria-haspopup="menu" aria-expanded="${!!S.vsortOpen}" aria-pressed="${ord !== 'urg' || !!S.vsortOpen}">${icon('arrow-down-wide-narrow', 18)}</button>${S.vsortOpen ? `<span class="vsortx" data-a="vsortopen"></span><span class="vdrop vsortm" role="menu"><span class="mono">Order</span>${ORD.map(([k, l]) => `<button role="menuitemradio" data-a="vsort" data-v="${k}" aria-checked="${ord === k}" aria-current="${ord === k}">${l}${ord === k ? icon('check', 16, 2) : ''}</button>`).join('')}<span class="mono">Show</span>${[['all', 'All tasks'], ['today', 'Scheduled today']].map(([k, l]) => { const on = (todayOnly ? 'today' : 'all') === k; return `<button role="menuitemradio" data-a="vshow" data-v="${k}" aria-checked="${on}" aria-current="${on}">${l}${on ? icon('check', 16, 2) : ''}</button>`; }).join('')}</span>` : ''}</span>`;
  h += vlab(pick ? G(pick).name : 'Needs me most', ob) + (T.length ? T.map((t) => taskRow(t, true)).join('') : `<p class="empty">${todayOnly ? 'Nothing scheduled for today.' : pick ? 'No open study tasks.' : 'Nothing needs me right now.'}</p>`);
  // no Open button for a picked subject; tapping its card again opens it (2026-11-10)
  return h;
}
// example study sessions so the Schedule shows planned study (2026-11-06). Example data only, once (flag studysess1).
function sSessMigrate(m) { m.settings = m.settings || {};
  // day blocks have icons, not colours (2026-11-06)
  if (!m.settings.blkicon1) { m.settings.blkicon1 = true; const BI = { 'b-morning': 'sunrise', 'b-study': 'book-open', 'b-evening': 'moon' }; Object.entries(m.groups || {}).forEach(([k, g]) => { if (g.style === 'dayblock' && !g.icon) g.icon = BI[k] || 'clock'; }); }
  if (m.settings.studysess1) return; m.settings.studysess1 = true; if (!m.example || !m.groups['b-study']) return;
  const blk = m.groups['b-study'];
  const col = { 's-rev': '#3FAFA6', 's-past': '#3FAFA6', 's-flash': '#3FAFA6', 's-draft': '#6F9BD6', 's-src': '#6F9BD6' };
  const plan = [['s-draft', 0, 60], ['s-rev', 1, 90], ['s-draft', 2, 90], ['s-src', 3, 30], ['s-rev', 4, 60], ['s-past', 5, 120], ['s-rev', 7, 60]];
  plan.forEach(([t, k, min], i) => { const it = m.items[t]; if (!it) return; const pid = 'p-ex' + i;
    m.items[pid] = { type: 'task', kind: 'behaviour', tags: [], insight: false, made: T0, name: it.name, part: t, when: { mode: 'once', date: addDays(T0, k) }, dur: min, icon: it.icon || 'book-open', color: col[t] || '#3FAFA6', sample: true };
    it.parts = (it.parts || []).concat(pid); if (!blk.kids.includes(pid)) blk.kids.push(pid); });
  // one study task simply dated tomorrow, in the Study block
  const f = m.items['s-flash']; if (f) { f.when = { mode: 'once', date: addDays(T0, 1) }; f.dur = 30; f.icon = f.icon || 'book-open'; if (!blk.kids.includes('s-flash')) blk.kids.push('s-flash'); } }
// a study task is scheduled today when its own date or repeat falls today, or one of its sessions is today
const schedToday = (id) => { const it = I(id); if (!it) return false; return (typeof onDay === 'function' && onDay(id, T0)) || ((it.when || {}).mode === 'once' && it.when.date === T0) || (it.parts || []).some((p) => I(p) && (I(p).when || {}).date === T0); };
function subjPage(s) {
  const V = subjVerdict(s); let h = crumbs([[studyName(), ''], [G(s).name]]) + vCard({ eyebrow: G(s).name, word: V.word, lvl: V.lvl, sub: V.sub, segs: V.segs, foot: V.foot });
  const dlText = (g) => G(g).deadline ? 'due ' + fmtDate(G(g).deadline) : 'no deadline';
  if (S.edit) return h + `<div class="list" data-list="${s}">${sgroupsOf(s).map((g) => `<div data-ref="${g}" class="vsg"><div class="row vsgh">${grip()}<span class="lbl"><span class="mono">${nm(g, G(g).name)}</span><span class="sub">${esc(dlText(g))} · ⚙ to set the deadline</span></span>${tail(g, s)}</div>${eList(g, kidsOf(g), 'Add task', 'vadd', (k) => I(k).est ? estHM(I(k).est) + ' estimated' : 'No estimate')}</div>`).join('')}</div>` + addRow('vaddsg', s, 'Add task group');
  // groups with a deadline first, soonest first (2026-10-27); tasks keep their own order
  const gs = sgroupsOf(s).slice().sort((a, b) => (G(a).deadline || '9999').localeCompare(G(b).deadline || '9999'));
  gs.forEach((g, gi) => { const T = kidsOf(g).filter((k) => (!sFinished(k) || val(T0, k)) && (M.settings.studyShow !== 'today' || schedToday(k)));
    h += sect('sg:' + g, G(g).name, dlText(g) + ' · ' + T.length + (T.length === 1 ? ' task' : ' tasks'), (T.map((k) => taskRow(tInfo(k, s, g), true)).join('') || '<p class="empty">No open tasks.</p>')); });
  // new tasks and task groups come from the top bar + (2026-11-10)
  return h;
}

// ---------- timer and Study support ----------
function tElapsed() { const t = M.timer; if (!t) return 0; return (t.acc || 0) + (t.start ? Date.now() - t.start : 0); }
const fmtClock = (ms) => { const s = Math.floor(ms / 1000); return pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s / 60) % 60) + ':' + pad(s % 60); };
const tPct = () => Math.min(100, Math.round((minOn(null, T0) + tElapsed() / 60000) / sessLen() * 100));
const T_C = 2 * Math.PI * 104;
const tRule = () => { const m = Math.floor(minOn(null, T0) + tElapsed() / 60000); return m >= sessLen() ? dur(m) + ' today · session done' : m + ' of ' + sessLen() + ' min today'; };
// the timer (polished, 2026-11-10): what I'm working on, the clock inside a ring that fills up to one study session, one line of progress, the buttons
function timerPage() {
  const t = M.timer || {}; const id = t.id && I(t.id) ? t.id : null; const run = !!t.start, any = tElapsed() > 0; const col = M.areas.study.color;
  const sub = id ? (() => { const s = subjIds().find((x) => sIds(x).includes(id)); return s ? G(s).name : ''; })() : '';
  return (S.studyMode ? '' : crumbs([[studyName(), ''], ['Timer']])) + `<div class="vtimer">
    <button class="vtt" data-a="vtpick" aria-label="Change what I'm working on">${esc(id ? I(id).name : 'Study session')} <span class="chev" aria-hidden="true">⌄</span></button><span class="mono vtsub">${esc(sub)}</span>
    <div class="vring"><svg viewBox="0 0 224 224" aria-hidden="true"><circle cx="112" cy="112" r="104" fill="none" stroke="var(--soft)" stroke-width="8"/><circle id="tring" cx="112" cy="112" r="104" fill="none" stroke="${col}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${T_C}" stroke-dashoffset="${T_C * (1 - tPct() / 100)}" transform="rotate(-90 112 112)"/></svg><div class="vclock ${run ? '' : 'idle'}" id="tclock" role="timer">${fmtClock(tElapsed())}</div></div>
    <span class="mono" id="trule">${tRule()}</span>
    <div class="btns" style="justify-content:center"><button class="btn dark vtgo" data-a="${run ? 'tpause' : 'tstart'}">${run ? 'Pause' : any ? 'Carry on' : 'Start'}</button>${run || any ? '<button class="btn" data-a="tstop">Stop and save</button>' : ''}</div></div>`;
}
// Study support is a normal journal page with the tag 'Study support' (2026-11-10): today's one opens, or a new one starts
const SUP_TAG = 'Study support';
const supEntry = (e) => !!e && (e.tags || []).includes(SUP_TAG);
const supOn = () => S.area === 'notebook' && S.nbView === 'jpage' && (supEntry(jCurrent()) || (S.jEntry === 'new' && (S.jNewTags || []).includes(SUP_TAG)));
function supOpen() { const cur = S.nbView === 'jpage' && S.area === 'notebook'; if (cur) { jSync(); jDropEmpty(); save(); }
  const e = (M.journal || []).filter((x) => x.d === T0 && supEntry(x)).pop(); S.sheet = null; S.menu = false; S.stv = null; S.jFrom = 'study'; S.area = 'notebook'; S.insOn = false; S.jBack = 'home';
  S.jMenu = false; S.jTagOpen = false; S.jRe = null; S.jSel = null; S.jCaret = null; S.nbView = 'jpage'; S.jEntry = e ? e.id : 'new'; S.jNewTags = e ? null : [SUP_TAG];
  render(); if (typeof jGrow === 'function') jGrow(); $('#main').scrollTop = 0; }
function saveTimer(msg) { const t = M.timer; if (!t) return; const min = Math.round(tElapsed() / 60000); const id = t.id && I(t.id) ? t.id : null; const before = minOn(null, T0);
  M.timer = null; if (min < 1) { save(); render(); flash('Under a minute, not saved'); return; }
  change(() => { M.study = M.study || {}; (M.study[T0] = M.study[T0] || []).push({ id, min }); L(T0); }, msg || ('Saved ' + dur(min) + (before < sessLen() && before + min >= sessLen() ? ' · study session done' : '')), false); }
let supT = 0;
setInterval(() => {
  const c = document.getElementById('tclock'); if (c && M.timer && M.timer.start) { c.textContent = fmtClock(tElapsed()); const b = document.getElementById('tring'); if (b) b.setAttribute('stroke-dashoffset', T_C * (1 - tPct() / 100)); const r = document.getElementById('trule'); if (r) r.textContent = tRule(); }
  // Study support time runs only while writing (typed in the last 20 seconds), and pauses when you stop
  if (supOn() && S.supLast && Date.now() - S.supLast < 20000) {
    M.support = M.support || {}; const sp = M.support[T0] = M.support[T0] || { text: '', ms: 0, min: 0 }; const was = sp.min >= sessLen();
    sp.ms = (sp.ms || 0) + 1000; sp.min = Math.floor(sp.ms / 60000); L(T0);
    if (!was && sp.min >= sessLen()) save();
    if (++supT % 10 === 0) save(); }
}, 1000);
['input', 'beforeinput'].forEach((ev) => document.addEventListener(ev, (e) => { const fl = e.target.closest && e.target.closest('.jflow'); if (fl && supOn()) S.supLast = Date.now(); }, true));

// ---------- title, dropdown, study mode bar, menu ----------
function vTitle() {
  const btn = (label) => `<button class="vttl" data-a="vdrop" aria-haspopup="menu" aria-expanded="${!!S.vdrop}">${esc(label)} <span aria-hidden="true">▾</span></button>`;
  if (S.area === 'home') return S.page ? btn(S.room && G(S.room) ? G(S.room).name : M.pages[S.page].name) : esc(M.areas.home.name);
  if (S.stv) return 'Timer';
  return S.subj && G(S.subj) ? btn(G(S.subj).name) : esc(M.areas.study.name);
}
function vLayer() {
  if (!S.vdrop) return '';
  let rows;
  if (S.area === 'home' && S.room) rows = roomIds().map((r) => { const J = jobsIn(r); const v = verdict(J, CHORE_W); return [r, G(r).name, J.length ? v.word : 'No jobs yet', v.lvl, J.length ? J.map(jobInk) : [SEG0], r === S.room, 'room']; });
  else if (S.area === 'home') rows = HOME_PAGES.map((p) => { if (p === 'shopping') return [p, M.pages[p].name, shopOpen().length + ' to get', 0, [SEG0], p === S.page, 'page']; const J = p === 'chores' ? allJobs() : p === 'homemaking' ? jobsIn('g-tend') : null; const v = J ? verdict(J, p === 'chores' ? CHORE_W : TEND_W) : { lvl: 0, word: prepsOpen().length + ' planned' };
    return [p, M.pages[p].name, v.word, v.lvl, J ? (J.length ? J.slice().sort((a, b) => b.fresh - a.fresh).map(jobInk) : [SEG0]) : Array.from({ length: 7 }, (_, i) => prepsOpen().some((k) => (I(k).when || {}).date === addDays(T0, i)) ? SEGSOFT : SEG0), p === S.page, 'page']; });
  else rows = subjIds().map((s) => { const v = subjVerdict(s); return [s, G(s).name, v.word, v.lvl, v.segs, s === S.subj, 'subj']; });
  return `<div class="scrim" style="background:transparent" data-a="vdrop"></div><div class="vdrop" role="menu">${rows.map(([k, n, w, l, segs, on, kind]) => `<button role="menuitem" data-a="vdpick" data-v="${k}" data-k="${kind}" aria-current="${on}"><span class="vdr"><b>${esc(n)}</b><span class="vv"><i style="background:${VDOT[l]}"></i>${esc(w)}</span></span>${segBar(segs, 'sm')}</button>`).join('')}</div>`;
}
// the two study mode buttons; in edit mode a tap changes the icon (2026-11-10)
const studyBar = () => [['timer', 'Timer', 'timer'], ['support', 'Study support', 'heart-handshake']].map(([v, l, ic]) => { const on = v === 'timer' ? S.stv === 'timer' && S.area === 'study' : supOn();
  return `<button ${S.edit ? `data-a="iconfor" data-v="ui:sm-${v}"` : `data-a="vstv" data-v="${v}"`} aria-label="${S.edit ? 'Change the icon for ' + l : l}" ${on ? 'aria-current="page"' : ''} style="color:${on ? M.areas.study.color : '#857E73'}"><span class="pill" style="background:${on ? M.areas.study.color + '38' : 'transparent'};${S.edit ? 'outline:1.5px dashed var(--faint);outline-offset:2px' : ''}">${icon(uiIc('sm-' + v, ic), 24, on ? 2 : 1.6)}</span></button>`; }).join('');
function vMenu() {
  let h = '';
  // no 'This page' group in the menu any more (2026-11-06), except a project's On hold / Finished (2026-11-08)
  if (S.area === 'hobbies' && S.proj && G(S.proj) && !S.insOn) { const x = G(S.proj); h += `<span class="mono">Project</span><button role="menuitem" data-a="projhold" data-ref="${S.proj}">${x.hold ? mi('unhold', 'play') : mi('hold', 'pause')} ${x.hold ? 'Take off hold' : 'Put on hold'}</button><button role="menuitem" data-a="projdone" data-ref="${S.proj}">${mi('finished', 'check')} Finished</button>`; }
  // modes are switches (2026-11-06)
  h += `<span class="mono">Modes</span><button role="menuitemcheckbox" data-a="studymode" aria-checked="${!!S.studyMode}">${mi('studymode', 'graduation-cap')} <span style="flex:1;text-align:left">Study mode</span><span class="swt" aria-hidden="true" aria-checked="${!!S.studyMode}"></span></button>`;
  h += `<button role="menuitemcheckbox" data-a="badmode" aria-checked="${isBad(T0)}">${mi('badday', 'cloud')} <span style="flex:1;text-align:left">Bad day</span><span class="swt" aria-hidden="true" aria-checked="${isBad(T0)}"></span></button>`;
  h += `<button role="menuitemcheckbox" data-a="darkmode" aria-checked="${darkOn}">${mi('dark', 'moon')} <span style="flex:1;text-align:left">Dark mode</span><span class="swt" aria-hidden="true" aria-checked="${darkOn}"></span></button>`;
  // Expeditions can be hidden: the folder and Expedition training go (2026-11-06)
  h += `<button role="menuitemcheckbox" data-a="expmode" aria-checked="${expOn()}">${mi('exps', 'mountain')} <span style="flex:1;text-align:left">Expeditions</span><span class="swt" aria-hidden="true" aria-checked="${expOn()}"></span></button>`;
  return h;
}

// ---------- sheets ----------
function vSheet(s) {
  if (s.kind === 'vwhen') { const it = I(s.ref); const f = freshOf(s.ref); const dn = isDone(s.ref, T0);
    return `<p class="note" style="font-size:14px;margin-top:-6px">${esc(whenText(it))}${f.last ? ' · last done ' + lowDay(f.last) : ' · not done yet'}</p>
      ${whenDidI()}
      <div class="btns">${dn ? '<button class="btn" data-a="vunlog">Untick today</button>' : ''}<button class="btn" data-a="open" data-ref="${s.ref}">Edit</button></div>`; }
  if (s.kind === 'vsess') return `<div class="inrow" style="justify-content:center;gap:18px"><button class="btn" data-a="vsesslen" data-v="-5" aria-label="5 minutes less">−</button><b style="font-size:22px;font-family:var(--serif);font-weight:400">${sessLen()} min</b><button class="btn" data-a="vsesslen" data-v="5" aria-label="5 minutes more">+</button></div>`;
  if (s.kind === 'vtpick') { const cur = (M.timer || {}).id || null;
    return `<button class="ttrow" data-a="vtset" data-v="" aria-pressed="${!cur}"><b>Just studying</b><span aria-hidden="true">›</span></button>` + subjIds().map((x) => { const T = sTasks(x); return T.length ? `<div class="fld"><span class="mono">${esc(G(x).name)}</span><div class="stack" style="gap:6px">${T.map((t) => `<button class="ttrow" data-a="vtset" data-v="${t.id}" aria-pressed="${cur === t.id}"><b>${esc(I(t.id).name)}</b><small>${esc(G(t.g).name)}${t.est ? ' · ' + estHM(taskMin(t.id) / 60) + ' of ' + estHM(t.est) : ''}</small><span aria-hidden="true">›</span></button>`).join('')}</div></div>` : ''; }).join(''); }
  return '';
}
function vNew(gid) { const g = G(gid); if (!g) return; const st = g.style;
  const D = { name: '', type: 'task', kind: 'behaviour', tags: [], made: T0, dur: 20, insight: true };
  // every new item starts with no frequency (2026-11-11)
  if (st === 'room' || gid === 'g-tend') D.when = { mode: 'once', date: null };
  else if (st === 'tcat') Object.assign(D, { when: { mode: 'once', date: null }, dur: 45 });
  else if (st === 'sgroup') Object.assign(D, { when: { mode: 'once', date: null }, est: 1, dur: 60, insight: false });
  else Object.assign(D, { when: { mode: 'once', date: gid === 'g-prep' ? T0 : null }, insight: false }, {});
  const title = st === 'tcat' ? 'New session · ' + g.name : st === 'room' ? 'New job · ' + g.name : gid === 'g-tend' ? 'New thing to tend' : gid === 'g-prep' ? 'New prep' : gid === 'g-oneoff' ? 'New chore' : 'New study task';
  // prep goes on Today (Evening) so it isn't forgotten; the rest live only on their page unless you pick a day block
  // a new study task starts in the Study block, everything else in Evening (2026-11-06)
  openSheet({ kind: 'item', isNew: true, title, draft: D, block: st === 'sgroup' ? studyBlock() : defBlock(st === 'room' || gid === 'g-oneoff' ? 'chores' : gid === 'g-tend' ? 'tend' : gid === 'g-prep' ? 'prep' : ''), home: gid, steps: [] });
}
function vNewGroup(parent, o, msg) { const id = uid('g'); change(() => { M.groups[id] = Object.assign({ kids: [] }, o); G(parent).kids.push(id); }, msg, false);
  openSheet({ kind: 'group', ref: id, title: o.style === 'room' ? 'Room' : o.style === 'subject' ? 'Subject' : 'Task group', isNew: true }); }
function logDone(id, d) { const it = I(id); const back = S.fromSlot && I(S.fromSlot) && I(S.fromSlot).opens === 'chores' && d === T0 && choreIds().includes(id);
  S.sheet = null; if (d === T0 && twoTick(id)) return; change(() => { L(d)[id] = 'done'; }, it.name + ' done ' + (d === T0 ? 'today' : lowDay(d)));
  if (back) { S.fromSlot = null; S.area = 'plan'; S.page = 'today'; S.day = T0; render(); } }
function verdictAction(act, a, ref, v) {
  switch (act) {
    case 'vgo': S.page = v; S.room = null; S.pick = null; render(); $('#main').scrollTop = 0; return true;
    case 'vcrumb': if (S.area === 'home' && v === 'chores') S.room = null; else { S.page = null; S.room = null; S.subj = null; S.stv = null; } S.pick = null; render(); $('#main').scrollTop = 0; return true;
    case 'vdrop': S.vdrop = !S.vdrop; render(); return true;
    case 'vdpick': S.vdrop = false; if (a.dataset.k === 'page') { S.page = v; S.room = null; } else if (a.dataset.k === 'room') S.room = v; else S.subj = v; S.pick = null; render(); $('#main').scrollTop = 0; return true;
    case 'vpick': if (S.edit) { openSheet({ kind: 'group', ref, title: G(ref).style === 'room' ? 'Room' : 'Subject' }); return true; }
      if (S.pick === ref) { if (S.area === 'home') S.room = ref; else S.subj = ref; S.pick = null; $('#main').scrollTop = 0; } else S.pick = ref; render(); return true;
    case 'vunpick': S.pick = null; render(); return true;
    case 'vopen': if (S.area === 'home') S.room = ref; else S.subj = ref; S.pick = null; render(); $('#main').scrollTop = 0; return true;
    case 'vjob': if (S.edit) { openItem(ref); return true; } openSheet({ kind: 'vwhen', ref, title: I(ref).name }); return true;
    case 'vlog': logDone(S.sheet.ref, addDays(T0, -(+v))); return true;
    case 'vlogd': { const d = $('#vdate').value; if (!d || d > T0) { flash('Pick a day up to today'); return true; } logDone(S.sheet.ref, d); return true; }
    case 'vunlog': { const id = S.sheet.ref; S.sheet = null; change(() => { delete L(T0)[id]; }, 'Unticked ' + I(id).name); return true; }
    case 'psub': { const it = I(ref); if (!it) return true; const days = Object.keys(M.log).filter((d) => val(d, ref)); if (days.length) { change(() => { days.forEach((d) => { delete L(d)[ref]; }); }, 'Unticked ' + it.name); return true; } logDone(ref, T0); return true; }
    case 'vtick': { const was = !!val(T0, ref); if (was) { change(() => { delete L(T0)[ref]; }, 'Unticked ' + I(ref).name); return true; } logDone(ref, T0); return true; }
    case 'vadd': vNew(v); return true;
    case 'vsortopen': S.vsortOpen = !S.vsortOpen; render(); return true;
    case 'vshow': M.settings.studyShow = v === 'today' ? 'today' : 'all'; S.vsortOpen = false; save(); render(); return true;
    case 'vsort': M.settings.studySort = v; S.vsortOpen = false; save(); render(); return true;
    case 'vsugg': { const [n, d] = v.split('|'); const id = uid('i'); change(() => { M.items[id] = { name: n, type: 'task', when: { mode: 'every', n: +d }, kind: 'behaviour', tags: [], insight: true, made: T0, dur: 20 }; G(ref).kids.push(id); }, 'Added ' + n); return true; }
    case 'vaddroom': vNewGroup('g-rooms', { name: 'New room', style: 'room', holds: 'task' }, 'Added a room'); return true;
    case 'vaddsubj': vNewGroup('g-subjects', { name: 'New subject', style: 'subject', holds: 'sgroups' }, 'Added a subject'); return true;
    case 'vaddsg': vNewGroup(v, { name: 'New group', style: 'sgroup', holds: 'task', deadline: null }, 'Added a task group'); return true;
    case 'vtimer': { if (S.edit) { openItem(ref); return true; } const t = M.timer; if (t && tElapsed() > 0 && t.id !== ref) saveTimer('Saved ' + dur(Math.max(1, Math.round(tElapsed() / 60000))) + ' on ' + ((t.id && I(t.id)) ? I(t.id).name : 'study'));
      if (!M.timer) M.timer = { id: ref, start: null, acc: 0 }; S.stv = 'timer'; save(); render(); $('#main').scrollTop = 0; return true; }
    case 'vtpick': openSheet({ kind: 'vtpick', title: 'Working on' }); return true;
    case 'vtset': { const t = M.timer; if (t && tElapsed() > 0 && (t.id || '') !== v) saveTimer(); M.timer = Object.assign(M.timer || { start: null, acc: 0 }, { id: v || null }); S.sheet = null; save(); render(); return true; }
    case 'tstart': M.timer = Object.assign(M.timer || { id: null, acc: 0 }, { start: Date.now() }); save(); render(); return true;
    case 'tpause': { const t = M.timer; if (t && t.start) { t.acc = (t.acc || 0) + Date.now() - t.start; t.start = null; } save(); render(); return true; }
    case 'tstop': saveTimer(); return true;
    case 'gochores': S.sheet = null; S.area = 'home'; S.page = 'chores'; S.room = null; S.pick = null; render(); $('#main').scrollTop = 0; return true;
    case 'vstv': if (v === 'support') { supOpen(); return true; } if (S.area !== 'study') { S.area = 'study'; S.page = null; } S.menu = false; S.sheet = null; S.stv = S.stv === v && S.studyMode ? null : v; if (!S.studyMode && S.stv === v) S.area = 'study'; render(); $('#main').scrollTop = 0; return true;
    case 'studymode': S.menu = false; S.studyMode = !S.studyMode; if (S.studyMode) { S.area = 'study'; S.page = null; S.edit = false; S.nbView = 'home'; } else S.stv = null; render(); return true;
    case 'vsess': openSheet({ kind: 'vsess', title: 'Study session length' }); return true;
    case 'vsesslen': M.settings.studyLen = Math.max(5, Math.min(240, sessLen() + (+v))); save(); if (S.sheet) renderLayer(); else render(); return true;
    case 'slot': slotGo(ref); return true;
  }
  return false;
}

// an item that lives on a Study or Home page (a room, Tending, prep, one-off chores, a task group) doesn't need a day block
function vHomed(s) { if (s.home && G(s.home)) return true; return !!s.ref && placements(s.ref).some((p) => G(p) && ['room', 'vlist', 'sgroup', 'tcat'].includes(G(p).style)); }

// where a Home item lives, as shown in the Planner's task list ('Kitchen', 'One-off chore', 'Homemaking', 'Cooking'), or '' if it isn't one
function homeItem(id) { if (!id) return ''; const pl = placements(id); const r = pl.find((p) => G(p) && G(p).style === 'room'); if (r) return G(r).name;
  if (pl.includes('g-oneoff')) return 'Chore'; if (pl.includes('g-tend')) return 'Homemaking'; if (pl.includes('g-prep')) return 'Cooking'; return ''; }

// Thin progress line under a study task (2026-11-04): light sage for hours done of the estimate. Past the estimate
// the line is full and a darker sage grows over it from the left, like a second lap (full again at twice the estimate).
function progLine(done, est) { if (!est) return '';
  // laps: first lap soft grey up to the estimate, second lap orange over it from the left, third lap red.
  // Drawn as crisp-edged SVG so every line comes out the same thickness on the phone screen (2026-11-04).
  const laps = ['#ABA59C', '#E0913E', '#D6473A']; const r = done / est; const k = r <= 1 ? 0 : Math.min(2, Math.floor(r)); const part = r <= 1 ? r : r >= 3 ? 1 : r - k;
  const bar = (w, c) => `<rect x="0" y="0" width="${(w * 100).toFixed(1)}%" height="100%" fill="${c}"/>`;
  return `<svg class="vprog" width="100%" shape-rendering="crispEdges" aria-hidden="true">${bar(1, '#E3DDD2')}${k ? bar(1, laps[k - 1]) : ''}${bar(part, laps[k])}</svg>`; }
// a 2px line covers a whole number of screen pixels (about 2.8 per px on the phone), so every line is equally thick
try { const d = window.devicePixelRatio || 1; document.documentElement.style.setProperty('--px2', (Math.max(1, Math.round(2 * d)) / d) + 'px'); } catch (e) {}

// Swipe a task from right to left to show Delete (2026-11-04). Works on every task row and card, outside edit mode.
// Delete goes through the usual 'rm' action, so it still asks first and offers Undo.
let tsw = null, tswOpen = null;
function swClose() { if (!tswOpen) return; const o = tswOpen; tswOpen = null; o.el.style.transform = ''; setTimeout(() => { o.btn.remove(); o.el.classList.remove('swon'); }, 180); }
function swTarget(t) { if (S.edit || S.sheet) return null; if (S.area === 'plan' && S.page === 'today' && S.day === T0) return null; // on Today the swipe offers Miss instead (2026-11-10)
  if (S.area === 'hobbies') return null; // in Hobbies the left swipe is Too much (2026-11-11)
  return t.closest('#main .vtk') || t.closest('#main .vjob, #main .row'); }
function swRef(el) { return el.dataset.ref || (el.parentElement && el.parentElement.dataset.ref) || ''; }
function swList(el, ref) { const l = el.closest('[data-list]'); if (l && !l.dataset.list.startsWith('s:') && G(l.dataset.list)) return l.dataset.list;
  return placements(ref).find((p) => G(p) && G(p).style !== 'dayblock' && p !== 'g-slots') || placements(ref)[0] || ''; }
document.addEventListener('pointerdown', (e) => { if (e.button > 0) return; if (tswOpen && !document.contains(tswOpen.el)) tswOpen = null; if (tswOpen && !e.target.closest('.swdel')) { if (!tswOpen.el.contains(e.target)) { swClose(); return; } }
  if (e.target.closest('.swdel, .grip')) return; const el = swTarget(e.target); if (!el) return; const ref = swRef(el); const it = I(ref);
  if (!it || !['task', 'routine'].includes(it.type) || homeItem(ref) && S.area === 'plan') return;
  tsw = { el, ref, x: e.clientX, y: e.clientY, dx: 0, on: false, open: tswOpen && tswOpen.el === el }; });
document.addEventListener('pointermove', (e) => { if (!tsw || drag) return; const dx = e.clientX - tsw.x, dy = e.clientY - tsw.y;
  if (!tsw.on) { if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { tsw = null; return; } if (Math.abs(dx) < 10) return; tsw.on = true; if (typeof lp !== 'undefined' && lp) { clearTimeout(lp.t); lp = null; }
    if (!tsw.open) { swClose(); const b = document.createElement('button'); b.className = 'swdel'; b.textContent = 'Delete'; b.dataset.a = 'rm'; b.dataset.ref = tsw.ref; b.dataset.in = swList(tsw.el, tsw.ref);
      const r = tsw.el.getBoundingClientRect(), pr = tsw.el.offsetParent ? tsw.el.offsetParent.getBoundingClientRect() : r;
      Object.assign(b.style, { top: (tsw.el.offsetTop) + 'px', height: r.height + 'px', left: (tsw.el.offsetLeft + r.width - 92) + 'px' }); tsw.el.parentElement.insertBefore(b, tsw.el); tsw.btn = b; } else tsw.btn = tswOpen.btn;
    tsw.el.classList.add('swiping', 'swon'); }
  const base = tsw.open ? -100 : 0; const x = Math.max(-140, Math.min(0, base + dx)); tsw.dx = x; tsw.el.style.transform = `translateX(${x}px)`; });
document.addEventListener('pointerup', () => { if (!tsw) return; const s = tsw; tsw = null; if (!s.on) return; s.el.classList.remove('swiping'); suppress = true; setTimeout(() => { suppress = false; }, 300);
  if (s.dx < -50) { s.el.style.transform = 'translateX(-100px)'; tswOpen = { el: s.el, btn: s.btn }; } else { tswOpen = { el: s.el, btn: s.btn }; swClose(); } });
document.addEventListener('pointercancel', () => { if (tsw && tsw.on) { tsw.el.classList.remove('swiping'); tswOpen = { el: tsw.el, btn: tsw.btn }; swClose(); } tsw = null; });

// study deadlines on a day (a task group's deadline, or a task's own due date), as terracotta dots for the Today calendar (2026-11-04)
function deadlinesOn(d) { const out = [];
  subjIds().forEach((s) => sgroupsOf(s).forEach((g) => { const open = kidsOf(g).filter((k) => !sFinished(k));
    if (G(g).deadline === d && open.length) out.push({ color: '#E0644E' });
    open.forEach((k) => { if (I(k).due === d && I(k).due !== G(g).deadline) out.push({ color: '#E0644E' }); }); }));
  return out; }

// the detailed logging block: when did I do it (2026-11-04). Used by Home items and at the bottom of every task's Schedule pop-up.
function whenDidI() { return `<div class="fld"><span class="mono">When did I do it?</span><div class="qd">${['Today', 'Yesterday', '2 days ago'].map((l, i) => `<button data-a="vlog" data-v="${i}"><span>${l}</span><small>${fmtDate(addDays(T0, -i))}</small></button>`).join('')}</div>
      <div class="inrow"><input class="inp" type="date" id="vdate" max="${T0}" value="${addDays(T0, -3)}" aria-label="Pick a date"><button class="btn" data-a="vlogd">Log that day</button></div></div>`; }

// a Home or Studies item, named by where it lives (for the Schedule pop-up), or ''
function areaItem(id) { const h = homeItem(id); if (h) return h; const hb = id && typeof hobArea === 'function' && hobArea(id); if (hb) return hb; const tc = id && typeof trainCat === 'function' && trainCat(id); if (tc) return G(tc).name; const s = id && subjIds().find((x) => sIds(x).includes(id)); return s ? G(s).name : ''; }
const studyName = () => (M.areas.study && M.areas.study.name) || 'Studies';
