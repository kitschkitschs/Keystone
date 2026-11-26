// ---------- Training streaks and recovery days (the owner, 2026-11-26) ----------
// Under the Training calendar: one row of the last 14 days per tracker, like Loop Habit Tracker, read from the sessions I tick.
//  Movement: needed every day; a day with a workout counts as kept; a recovery day is done in the recovery colour.
//  Workouts: n a week (Mon-Sun); once n is hit the rest of the week is kept; a recovery day is kept and the week needs one less.
//  Expedition training: n a week like Workouts, only while Expedition mode is on.
// Marks: done = a ticked tick box (as on Today), kept = faded square, skipped = dotted grey frame, missed = grey dot.
// Today shows the dotted frame until it's done, unless the streak already covers it. Skipped and missed days both break a streak;
// the number is the current streak in days.
// recovery days have their own colour but no list of their own: any Movement item counts (the owner, 2026-11-26)
const recCol = () => (M.settings || {}).recCol || '#A877C4';
const expCat = () => { const c = G('tc-exp') ? 'tc-exp' : tcatNamed(/expedition/i); return c && trainCats().includes(c) ? c : null; };
const mvCat = () => { const tc = typeof trainCats === 'function' ? trainCats() : []; const w = typeof woCat === 'function' ? woCat() : null;
  return (tc.includes('tc-move') ? 'tc-move' : null) || tc.find((c) => c !== w && c !== 'tc-exp') || null; };
const recs = () => (M.recov = M.recov || {});
const recOf = (d) => (M.recov || {})[d] || null;
// the generic Movement item: a generic training item that isn't the Workout one
const mvGen = () => Object.keys(M.items).find((k) => { const it = I(k); return it.type === 'slot' && (it.opens === 'training' || it.opens === 'move') && !(it.tcat && it.tcat === woCat()) && placements(k).some((p) => G(p) && G(p).style === 'dayblock'); }) || null;
const stSet = () => Object.assign({ wo: 3, ex: 2 }, (M.settings || {}).streak || {});
const catDone = (c, d) => !!c && kidsOf(c).some((k) => isDone(k, d));
const mvDone = (d) => trainCats().filter((c) => c !== woCat()).some((c) => catDone(c, d));
const srCol = (c, f) => (c && G(c) && G(c).color) || f;
const SR_FADE = (c) => `color-mix(in oklab, ${c} 55%, var(--page))`;
// the first day I logged any training: days before it show nothing
function srFirst() { if (WKC.has('_srfirst')) return WKC.get('_srfirst'); const ks = new Set(trainCats().flatMap(kidsOf));
  const f = Object.keys(M.log || {}).filter((d) => /^\d{4}-\d\d-\d\d$/.test(d)).sort().find((d) => Object.keys(M.log[d] || {}).some((k) => ks.has(k) && isDone(k, d))) || T0;
  WKC.set('_srfirst', f); return f; }
function srMove(d, f, C) { if (d < f) return { s: 'none' };
  if (mvDone(d)) return { s: 'done', c: recOf(d) ? C.rec : C.mv };
  if (catDone(woCat(), d)) return { s: 'kept', c: C.wo };
  return d === T0 ? { s: 'wait' } : { s: 'miss' }; }
function srNeed(n, d, wo) { if (!wo) return n; const m = weekStart(d); let r = 0; for (let i = 0; i < 7; i++) if (recOf(addDays(m, i))) r++; return Math.max(0, n - r); }
function srCount(c, m, upto) { let k = 0; for (let i = 0; i < 7; i++) { const x = addDays(m, i); if (upto && x >= upto) break; if (catDone(c, x)) k++; } return k; }
function srFreq(c, n, d, f, wo, col, C) { if (d < f) return { s: 'none' };
  if (wo && recOf(d)) return { s: 'kept', c: C.rec };
  if (catDone(c, d)) return { s: 'done', c: col };
  const m = weekStart(d), need = srNeed(n, d, wo);
  if (srCount(c, m, d) >= need) return { s: 'kept', c: col };
  if (d === T0) return { s: 'wait' };
  if (addDays(m, 6) < T0 && srCount(c, m) < need) return { s: 'miss' };
  return { s: 'skip' }; }
function srStreak(fn, f) { let n = 0, d = T0; if (fn(d).s === 'wait') d = addDays(d, -1);
  while (d >= f && n < 3660) { const s = fn(d).s; if (s !== 'done' && s !== 'kept') break; n++; d = addDays(d, -1); } return n; }
function srTrackers() { const C = { mv: srCol(mvCat(), '#7DBE9A'), wo: srCol(woCat(), '#3FAFA6'), rec: recCol(), ex: srCol(expCat(), '#6FA24A') }; const f = srFirst(), S2 = stSet(); const out = [];
  if (mvCat()) out.push({ id: 'mv', cat: mvCat(), name: 'Movement', col: C.mv, fn: (d) => srMove(d, f, C) });
  if (woCat()) out.push({ id: 'wo', cat: woCat(), name: 'Workouts', col: C.wo, n: S2.wo, wo: true, fn: (d) => srFreq(woCat(), S2.wo, d, f, true, C.wo, C) });
  if (expOn() && expCat()) out.push({ id: 'ex', cat: expCat(), name: 'Expedition', col: C.ex, n: S2.ex, fn: (d) => srFreq(expCat(), S2.ex, d, f, false, C.ex, C) });
  return { list: out, f, C }; }
const srShort = (d) => { const x = parse(d); return x.getDate() + ' ' + MONTHS[x.getMonth()].slice(0, 3); };
function streakRows() {
  if (!G('g-train') || !trainCats().length) return '';
  const { list, f, C } = srTrackers(); if (!list.length) return '';
  const start = addDays(T0, -13);
  let h = '<div class="srs">';
  list.forEach((t) => { const n = srStreak(t.fn, f); let wk = '';
    if (t.n == null) { const m = weekStart(T0); let c = 0; for (let x = m; x <= T0; x = addDays(x, 1)) { const st = t.fn(x).s; if (st === 'done' || st === 'kept') c++; } wk = `${c} of 7`; }
    if (t.n != null) { const m = weekStart(T0), need = srNeed(t.n, T0, t.wo), c = srCount(t.cat, m); wk = c >= need ? `${c} of ${need} · kept` : `${c} of ${need}`; }
    h += `<div class="sr" style="--c:${t.col}"><div class="srh"><span class="srsq"></span><span class="srn">${esc(t.name)}</span><span class="srw">${wk}</span><span class="srnum">${n}<small>${n === 1 ? 'day' : 'days'}</small></span></div><div class="srg" role="img" aria-label="${esc(t.name)}, last 14 days, streak ${n} ${n === 1 ? 'day' : 'days'}">`;
    for (let i = 0; i < 14; i++) { const d = addDays(start, i), x = t.fn(d); h += `<span class="srm ${x.s}${i === 6 ? ' srwk' : ''}"${x.c ? ` style="--c:${x.c};--cf:${SR_FADE(x.c)}"` : ''}><i></i></span>`; }
    h += '</div></div>'; });
  h += `<div class="srax"><span>${srShort(start)}</span><span>Today</span></div>`;
  const r = recOf(T0); if (r) h += `<button class="srrec" data-a="recopen" style="--c:${C.rec}"><span class="srsq"></span><span>Recovery day${r.woName ? ' · instead of ' + esc(r.woName) : ''}</span><span class="srch">Change</span></button>`;
  return h + '</div>'; }
// edit mode: the tracker colours (their categories' colours, the same on Today, the Schedule and the calendar) and the weekly numbers
function streakEdit() {
  const cats = [[mvCat(), 'Movement'], [woCat(), 'Workouts'], ['rc:rec', 'Recovery'], [expOn() ? expCat() : null, 'Expedition training']].filter((x) => x[0]);
  const step = (k, l) => `<div class="srstep"><span class="l">${l}</span><button class="btn" data-a="srn" data-ref="${k}" data-v="-1" aria-label="One less">−</button><span class="srv">${stSet()[k]}</span><button class="btn" data-a="srn" data-ref="${k}" data-v="1" aria-label="One more">+</button></div>`;
  return `<div style="margin-top:14px">${lcard(null, 'Streaks', '', cats.map(([c, l]) => `<button class="srcol" data-col="${c}" aria-label="Change the ${esc(l)} colour"><span class="srsq" style="--c:${c === 'rc:rec' ? recCol() : G(c).color || grpCol(c)}"></span><span class="l">${esc(l)}</span><span class="srch">Colour</span></button>`).join('') + step('wo', 'Workouts a week') + (expOn() && expCat() ? step('ex', 'Expedition training a week') : ''))}</div>`; }

// RECOVERY DAY: on a day with a workout, if something hurts, the workout comes off and a recovery session takes its place
const recWoToday = () => [...woIds()].filter((k) => onDay(k, T0) && !isDone(k, T0));
const woGenOn = (id) => { const it = I(id); return !!it && it.type === 'slot' && !!it.tcat && it.tcat === woCat(); };
function recBtn(id, d) { if (S.edit || d !== T0 || recOf(T0) || isBad(T0) || isDone(id, d)) return '';
  if (!(woIds().has(id) || woGenOn(id)) || !onDay(id, T0)) return ''; return `<button class="wgo wgot wrec" data-a="recopen" data-ref="${id}">Recovery</button>`; }
// Today: the workout is already off the day (see woSim); the generic Workout item gives way to the generic Movement item, so the day asks for movement
function recSwap(out, d) { if (!recOf(d)) return; const rid = mvGen();
  let put = !rid || out.some((x) => x.items.includes(rid));
  out.forEach((x) => { x.items = x.items.flatMap((id) => { if (!woGenOn(id) && !(woIds().has(id) && !isDone(id, d))) return [id]; if (put) return []; put = true; return [rid]; }); });
  if (put) return;
  // the workout sat in a day block itself: the Movement item takes its spot there
  const w = [...woIds()].find((k) => onDayBase(k, d)); const wb = w ? placements(w).find((p) => G(p) && G(p).style === 'dayblock') : null; const x = wb && out.find((z) => z.b === wb);
  if (x) { const ord = G(wb).kids; const at = x.items.findIndex((k) => ord.indexOf(k) > ord.indexOf(w)); if (at < 0) x.items.push(rid); else x.items.splice(at, 0, rid); return; }
  const y = out.find((z) => G(rid) ? false : placements(rid).includes(z.b)) || out[0]; if (y) y.items.push(rid); }
function recSheet(s) { const D = s.draft; const chip = (act, v, l, on, c) => `<button class="chip" data-a="${act}" data-v="${v}" aria-pressed="${!!on}">${c ? `<span class="srdot" style="background:${c}"></span>` : ''}${esc(l)}</button>`;
  const aches = G('hg-aches') ? kidsOf('hg-aches') : []; const conds = typeof condsOn === 'function' ? condsOn(T0) : [];
  return `<p class="sub" style="margin:0 0 4px">${D.woName ? esc(D.woName) + ' comes off today. ' : ''}Any movement counts instead, and my workout streak holds.</p>
    <div class="fld"><span class="mono">What hurts</span><div class="chips">${aches.map((k) => chip('rechurt', k, I(k).name, D.hurt.includes(k), grpCol('hg-aches'))).join('')}${conds.map((x) => chip('rechurt', 'c:' + x.id, x.name + ' · day ' + (diff(x.start, T0) + 1), D.hurt.includes('c:' + x.id), condCol())).join('')}</div></div>
    <div class="fld"><span class="mono">The workout</span><div class="chips">${chip('recmode', 'drop', 'Let it go this week', D.drop)}${chip('recmode', 'move', 'Move it to tomorrow', !D.drop)}</div>
      <span class="sub">${D.drop ? `This week needs ${Math.max(0, stSet().wo - 1)} instead of ${stSet().wo}.` : 'It comes back tomorrow, first in line.'}</span></div>
    <div class="srbtns"><button class="btn" data-a="${s.isNew ? 'closesheet' : 'recundo'}">${s.isNew ? 'Cancel' : 'Back to the workout'}</button><button class="btn dark" data-a="recsave">${s.isNew ? 'Make it a recovery day' : 'Save'}</button></div>`; }
function streakAction(act, a, ref, v) {
  switch (act) {
    case 'recopen': { const r = recOf(T0); const ws = recWoToday(); const nm = r ? r.woName : ws.length ? ws.map((k) => I(k).name).join(', ') : (I(ref) && I(ref).name) || '';
      openSheet({ kind: 'recov', isNew: !r, title: 'Recovery day', draft: r ? Object.assign({ hurt: [] }, JSON.parse(JSON.stringify(r))) : { woName: nm, hurt: [], drop: true } }); return true; }
    case 'rechurt': { const D = S.sheet.draft; D.hurt = D.hurt.includes(v) ? D.hurt.filter((x) => x !== v) : D.hurt.concat(v); renderLayer(); return true; }
    case 'recmode': S.sheet.draft.drop = v === 'drop'; renderLayer(); return true;
    case 'recsave': { const D = S.sheet.draft; S.sheet = null; change(() => { recs()[T0] = { woName: D.woName || '', hurt: D.hurt, drop: !!D.drop }; }, 'Recovery day'); render(); return true; }
    case 'recundo': { S.sheet = null; change(() => { delete recs()[T0]; }, 'Back to the workout'); render(); return true; }
    case 'srn': { change(() => { M.settings.streak = Object.assign(stSet(), { [ref]: Math.max(1, Math.min(7, stSet()[ref] + Number(v))) }); }); render(); return true; }
  }
  return false; }
