// ---------- Workouts (2026-11-24): my own exercises, sets and reps, followed in the app while the watch records Strength ----------
// Data: M.exercises = [{ id, name, cue, side, timed, nosug }] (one shared list).
// A workout is a training session item with it.wo = { follow: 'list' | 'one', ex: [{ x, sets, n }] } (n = reps, or seconds when timed),
// so it plans and ticks like any other session. M.wlog = [{ d, item, sets: { x: [n per set] }, tg: { x: n }, ps: { x: sets }, note }].
// Aches and pains items carry exs = [exercise ids]: which exercises touch that body area (for the suggestions).
// M.wrun = the workout I'm in the middle of (survives a reload; Training shows Resume).
// Nothing in a workout runs on a clock except a hold I start myself, and that never moves me on: I tap Done.
const exList = () => (M.exercises = M.exercises || []);
const exOf = (x) => exList().find((e) => e.id === x);
const wlog = () => (M.wlog = M.wlog || []);
const woItems = () => trainCats().flatMap(kidsOf).filter((k) => I(k).wo);
const woCol = () => secCol('training');
const woSets = (w) => w.ex.reduce((a, e) => a + e.sets, 0);
const woUnit = (x, n) => { const e = exOf(x) || {}; return e.timed ? n + ' s' : n + (n === 1 ? ' rep' : ' reps'); };
const woSide = (x) => ((exOf(x) || {}).side ? ' each side' : '');
const acheItems = () => kidsOf('hg-aches').filter((k) => I(k).type === 'tracker');
const acheOf = (x) => acheItems().filter((k) => (I(k).exs || []).includes(x));
// every set in the order I do them: set 1 of everything, then set 2 (2026-11-24: "ordered by set, not exercise")
function woFlat(w) { const out = []; const m = Math.max(0, ...w.ex.map((e) => e.sets)); for (let s = 0; s < m; s++) w.ex.forEach((e, i) => { if (s < e.sets && exOf(e.x)) out.push([i, s]); }); return out; }
const woK = (i, s) => i + '-' + s;

// ---------- Training page: Workouts and Exercises ----------
// one Workouts list: the Workouts category's sessions, with Start (2026-11-24). Outside edit mode a tap schedules it;
// in edit mode a tap opens the workout (its exercises) and exercises can be made and changed (the owner, 2026-11-24)
function woSection() {
  const R = M.wrun; const ed = S.edit;
  if (woHome()) save();
  const ks = (woCat() ? kidsOf(woCat()) : []).filter((k) => I(k).type === 'task' || I(k).type === 'routine');
  const rows = ks.map((k) => { const w = I(k).wo || { ex: [] }; const n = w.ex.filter((e) => exOf(e.x)).length; const live = R && R.item === k; const wt = whenText(I(k));
    const sub = [n ? n + (n === 1 ? ' exercise' : ' exercises') + ' · ' + woSets(w) + ' sets' : 'No exercises yet', ed ? '' : wt, isDone(k, T0) ? 'done today' : ''].filter(Boolean).join(' · ');
    return `<div class="row wrow" data-ref="${k}"><button class="lbl" data-a="${ed ? 'woedit' : 'sched'}" data-ref="${k}" style="text-align:left">${inm(k)}<span class="sub">${esc(sub)}</span></button>${ed ? tail(k, woCat()) : `<button class="wgo" data-a="wostart" data-ref="${k}" ${n ? '' : 'disabled'}>${live ? 'Resume' : 'Start'}</button>`}</div>`; }).join('');
  const ex = exList().slice().sort((a, b) => a.name.localeCompare(b.name));
  const exRows = ex.map((e) => { const a = acheOf(e.id).map((k) => I(k).name.toLowerCase()); const bits = [e.side ? 'two sides' : '', e.timed ? 'timed' : '', a.length ? 'touches ' + a.join(', ') : ''].filter(Boolean);
    const inner = `<span class="lbl">${xnm(e)}${bits.length ? `<span class="sub">${esc(bits.join(' · '))}</span>` : ''}</span>`;
    return ed ? `<button class="row" data-a="wxedit" data-ref="${e.id}" style="width:100%;text-align:left">${inner}</button>` : `<div class="row">${inner}</div>`; }).join('');
  return `<div style="margin-top:14px">${lcard('t:wo', woCat() ? G(woCat()).name : 'Workouts', ks.length || '', (rows || '<p class="empty">No workouts yet.</p>') + (ed ? `<button class="addrow" data-a="wonew"><span class="plus">+</span>New workout</button>` : ''))}</div>
    <div style="margin-top:14px">${lcard('t:wx', 'Exercises', ex.length || '', (exRows || `<p class="empty">No exercises yet.${ed ? ' Each one is made once and used in any workout.' : ''}</p>`) + (ed ? `<button class="addrow" data-a="wxnew"><span class="plus">+</span>New exercise</button>` : ''))}</div>`;
}

// ---------- the workout pop-up: name, how I follow it, its exercises ----------
function woSheet(s) { const it = I(s.ref); if (!it || !it.wo) return ''; const w = it.wo;
  const st = (i, f, v) => `<span class="stp wstp"><button data-a="wostep" data-ref="${i}" data-v="${f}|-1" aria-label="Less">−</button><b>${v}</b><button data-a="wostep" data-ref="${i}" data-v="${f}|1" aria-label="More">+</button></span>`;
  const rows = w.ex.map((e, i) => { const x = exOf(e.x); if (!x) return '';
    return `<div class="wxrow"><div class="wxtop"><button class="lbl" data-a="wxedit" data-ref="${x.id}" style="text-align:left">${xnm(x)}<span class="sub">${esc((x.side ? 'Two sides' : 'One side') + (x.timed ? ' · timed' : ''))}</span></button>
      <button class="rm" data-a="womove" data-ref="${i}" data-v="-1" aria-label="Move up" ${i ? '' : 'disabled'}>${icon('chevron-up', 16)}</button><button class="rm" data-a="womove" data-ref="${i}" data-v="1" aria-label="Move down" ${i < w.ex.length - 1 ? '' : 'disabled'}>${icon('chevron-down', 16)}</button><button class="rm" data-a="worm" data-ref="${i}" aria-label="Take ${esc(x.name)} out">${icon('x', 15)}</button></div>
      <div class="wxnums">${st(i, 'sets', e.sets + (e.sets === 1 ? ' set' : ' sets'))}${st(i, 'n', x.timed ? e.n + ' s' : e.n + ' reps')}</div></div>`; }).join('');
  const left = exList().filter((x) => !w.ex.some((e) => e.x === x.id)).sort((a, b) => a.name.localeCompare(b.name));
  return `<div class="fld"><span class="mono">Name</span><input class="inp" id="woname" data-woname="${s.ref}" value="${esc(it.name)}"></div>
    <div class="fld"><span class="mono">Follow it as</span><div class="chips">${[['list', 'List'], ['one', 'One at a time']].map(([v, l]) => `<button class="chip" data-a="wofollow" data-ref="${s.ref}" data-v="${v}" aria-pressed="${(w.follow || 'list') === v}">${l}</button>`).join('')}</div></div>
    <div class="tg"><span class="l">Stands in for generic items<span class="sub" style="display:block;font-size:12.5px;color:var(--quiet)">Off for an extra one, like a recovery workout: Movement and Workout stay on my day beside it</span></span><button class="swt" role="switch" aria-checked="${!it.nogen}" data-a="wonogen" data-ref="${s.ref}" aria-label="Stands in for generic items"></button></div>
    <div class="fld"><span class="mono">Exercises · done set by set</span>${rows || '<p class="empty" style="padding:4px 0">No exercises yet.</p>'}
      <select class="inp" data-woadd="${s.ref}" aria-label="Add an exercise"><option value="">+ Add an exercise</option>${left.map((x) => `<option value="${x.id}">${esc(xtn(x))}</option>`).join('')}<option value="__new">New exercise…</option></select></div>
    <div class="btns" style="margin-top:14px"><button class="btn" data-a="open" data-ref="${s.ref}">Schedule, block and more</button><button class="btn danger" data-a="wodel" data-ref="${s.ref}">Take the exercises off this session</button></div>`; }

// an exercise's details sit beside its name everywhere, like a hobby activity's (the owner, 2026-11-24)
const xtn = (x) => (x.name || '') + (x.extra ? ' · ' + x.extra : ''); const xnm = (x) => esc(x.name || '') + (x.extra ? `<span class="mono hxt">${esc(x.extra)}</span>` : '');
// ---------- the exercise pop-up ----------
function wxSheet(s) { const D = s.draft; const ch = (a, v, on, l) => `<button class="chip" data-a="${a}" data-v="${v}" aria-pressed="${!!on}">${esc(l)}</button>`;
  const ac = acheItems();
  return `<div class="fld"><span class="mono">Name</span><input class="inp" id="wxname" value="${esc(D.name)}" placeholder="Like split squat" ${s.isNew ? 'data-autofocus' : ''}></div>
    <div class="fld"><span class="mono">Details</span><input class="inp" id="wxextra" value="${esc(D.extra || '')}" maxlength="40" placeholder="Like band or slow"></div>
    <div class="fld"><span class="mono">Count</span><div class="chips">${ch('wxset', 'reps', !D.timed, 'Reps')}${ch('wxset', 'timed', D.timed, 'Seconds (a hold or stretch)')}</div></div>
    <div class="tg"><span class="l">Two sides<span class="sub" style="display:block;font-size:12.5px;color:var(--quiet)">Left and right, one after the other</span></span><button class="swt" role="switch" aria-checked="${!!D.side}" data-a="wxset" data-v="side" aria-label="Two sides"></button></div>
    <div class="tg"><span class="l">Suggest changes<span class="sub" style="display:block;font-size:12.5px;color:var(--quiet)">Next-time suggestions from my weekly volume and aches</span></span><button class="swt" role="switch" aria-checked="${!D.nosug}" data-a="wxset" data-v="nosug" aria-label="Suggest changes"></button></div>
    <div class="fld"><span class="mono">Aches and pains it touches</span>${ac.length ? `<div class="chips">${ac.map((k) => ch('wxache', k, (D.aches || []).includes(k), I(k).name)).join('')}</div>` : '<p class="empty" style="padding:0">No aches and pains items yet.</p>'}</div>
    <div class="fld"><span class="mono">My cue</span><input class="inp" id="wxcue" value="${esc(D.cue || '')}" placeholder="Like front knee over the toes"></div>
    ${s.isNew ? '' : `<div class="btns" style="margin-top:8px"><button class="btn danger" data-a="wxdel" data-ref="${s.ref}">Delete</button></div>`}`; }
function wxCapture() { const s = S.sheet; if (!s || s.kind !== 'wx') return; const n = document.getElementById('wxname'), c = document.getElementById('wxcue'), xt = document.getElementById('wxextra'); if (n) s.draft.name = n.value.trim(); if (xt) s.draft.extra = xt.value.trim(); if (c) s.draft.cue = c.value.trim(); }
// in an Aches and pains item's own pop-up: the exercises that touch it (the same link as above, from the other side)
function acheExField(D) { if (!exList().length) return '';
  return `<div class="fld"><span class="mono">Exercises that touch it</span><div class="chips">${exList().map((x) => `<button class="chip" data-a="wacx" data-v="${x.id}" aria-pressed="${(D.exs || []).includes(x.id)}">${esc(xtn(x))}</button>`).join('')}</div></div>`; }

// ---------- volume and the next-time suggestions ----------
// volume = reps (or seconds) of one exercise in a week; each side counts once. Weeks end today, oldest first.
const WEEKS = [5, 4, 3, 2, 1, 0];
function wkRange(w) { return [addDays(T0, -7 * w - 6), addDays(T0, -7 * w)]; }
function exVol(x, extra = 0) { return WEEKS.map((w) => { const [a, b] = wkRange(w); return wlog().filter((e) => e.d >= a && e.d <= b).reduce((s, e) => s + (e.sets[x] || []).reduce((p, n) => p + n, 0), 0) + (w === 0 ? extra : 0); }); }
function exAche(x, extra = 0) { const ids = acheOf(x); return WEEKS.map((w) => { let m = 0; for (let i = 0; i < 7; i++) { const d = addDays(T0, -7 * w - i); ids.forEach((k) => { const v = val(d, k); if (typeof v === 'number') m = Math.max(m, v); }); } return w === 0 ? Math.max(m, extra) : m; }); }
function exMissed(x, w, today) { const [a, b] = wkRange(w); const ent = wlog().filter((e) => e.d >= a && e.d <= b && e.sets[x]); if (w === 0 && today) ent.push(today);
  return ent.some((e) => (e.sets[x] || []).length < (e.ps[x] || 0) || (e.sets[x] || []).some((n) => n < (e.tg[x] || 0))); }
function woShape(per, sets, ex, up) { const t = ex.timed, ceil = t ? 60 : 15; const rd = (v) => t ? (up ? Math.ceil(v / 5) * 5 : Math.round(v / 5) * 5) : (up ? Math.ceil(v) : Math.round(v));
  let s = sets, r = rd(per / s); if (r > ceil) { s = sets + 1; r = rd(per / s); } return [s, Math.max(t ? 5 : 1, r)]; }
// one exercise's suggestion (each workout grows or shrinks by the same share as the weekly volume should): today's sets are counted in this week before they're saved
function woSuggest(e, R) { const x = exOf(e.x); const cur = `${e.sets} × ${x.timed ? e.n + ' s' : e.n}`; const sameAs = { kind: 'keep', to: cur };
  if (x.nosug) return Object.assign(sameAs, { why: 'No suggestions for this one' });
  const today = woToday(R); const add = (today.sets[e.x] || []).reduce((a, n) => a + n, 0);
  const fin = Math.max(0, ...acheOf(e.x).map((k) => R.f.ache[k] || 0));
  const v = exVol(e.x, add), a = exAche(e.x, fin); const now = v[5], prev = v[4], unit = x.timed ? 'seconds' : 'reps', area = acheOf(e.x).map((k) => I(k).name.toLowerCase()).join(' or ') || 'nothing linked';
  if (!now || !prev) return Object.assign(sameAs, { why: 'Needs two weeks of workouts to compare' });
  if (a[5] >= 3 || (a[5] > a[4] && a[4] > a[3] && now > v[3])) { const [s, r] = woShape(e.sets * e.n * 0.8, e.sets, x, false);
    return { kind: 'down', to: `${cur} → ${s} × ${x.timed ? r + ' s' : r}`, s, r, why: a[5] >= 3 ? `My ${area} ached a lot this week, so about 20% less` : `My ${area} ached more each week while the volume rose` }; }
  if (a[5] >= 2) return Object.assign(sameAs, { kind: 'hold', why: `My ${area} ached this week, so I keep ${now} ${unit} a week` });
  if (now > prev * 1.1) return Object.assign(sameAs, { kind: 'hold', why: `Went up from ${prev} to ${now} ${unit} this week, so I let it settle` });
  if (exMissed(e.x, 0, today) || exMissed(e.x, 1)) return Object.assign(sameAs, { why: 'Missed some reps in the last two weeks, so no change yet' });
  const tgt = Math.round(now * 1.1); const [s, r] = woShape(e.sets * e.n * 1.1, e.sets, x, true);
  if (s === e.sets && r === e.n) return Object.assign(sameAs, { why: 'Already close to the next step' });
  return { kind: 'up', to: `${cur} → ${s} × ${x.timed ? r + ' s' : r}`, s, r, why: `${now} → about ${tgt} ${unit} a week, ${area === 'nothing linked' ? 'no aches linked' : 'my ' + area + ' fine'}` }; }
// what today's run has done so far, shaped like a log entry
function woToday(R) { const w = I(R.item).wo; const o = { d: T0, item: R.item, sets: {}, tg: {}, ps: {} };
  w.ex.forEach((e, i) => { if (!exOf(e.x)) return; o.tg[e.x] = e.n; o.ps[e.x] = e.sets; const got = []; for (let s = 0; s < e.sets; s++) { const k = woK(i, s); if (R.done[k]) got.push(R.act[k] != null ? R.act[k] : e.n); } if (got.length) o.sets[e.x] = got; });
  return o; }
function woBars(x, R) { const add = R ? (woToday(R).sets[x] || []).reduce((a, n) => a + n, 0) : 0; const fin = R ? Math.max(0, ...acheOf(x).map((k) => R.f.ache[k] || 0)) : 0;
  const v = exVol(x, add), a = exAche(x, fin); const pos = v.filter((n) => n > 0), mx = Math.max(1, ...v), lo = pos.length > 1 ? Math.min(...pos) * 0.6 : 0;
  return `<span class="wbars" aria-label="Volume per week, last six weeks">${v.map((n, i) => `<span><i style="height:${n ? Math.max(2, (n - lo) / (mx - lo || 1) * 22) : 1}px"></i><em class="a${a[i]}"></em></span>`).join('')}</span>`; }

// ---------- workout mode (full screen) ----------
function woRunStart(k) { const it = I(k); if (!it || !it.wo) return;
  if (!M.wrun || M.wrun.item !== k) M.wrun = { item: k, phase: 'start', done: {}, act: {}, half: {}, tm: null, i: 0, watch: false, stop: false, f: { ache: {}, acc: {} } };
  save(); openSheet({ kind: 'wrun', title: it.name }); woWake(); }
let woLock = null;
function woWake() { try { if (navigator.wakeLock && !woLock) navigator.wakeLock.request('screen').then((l) => { woLock = l; l.addEventListener('release', () => { woLock = null; }); }).catch(() => {}); } catch (_) {} }
function woSleep() { try { if (woLock) woLock.release(); } catch (_) {} woLock = null; }
document.addEventListener('visibilitychange', () => { if (!document.hidden && S.sheet && S.sheet.kind === 'wrun') woWake(); });
function woNext(R) { const w = I(R.item).wo; return (woFlat(w).find(([i, s]) => !R.done[woK(i, s)]) || []).join('-') || null; }
const tLeft = (R) => Math.max(0, Math.ceil((R.tm.end - Date.now()) / 1000));
function woLayer() { const R = M.wrun; if (!R || !I(R.item)) return ''; const it = I(R.item), w = it.wo;
  const head = (lab) => `<header><div class="cititle"><span class="mono">${lab}</span><h2>${esc(it.name)}</h2></div><button class="hb" data-a="wquit" aria-label="Close">${icon('x', 22)}</button></header>`;
  const F = woFlat(w), dc = F.filter(([i, s]) => R.done[woK(i, s)]).length;
  let h = '';
  if (R.phase === 'start') {
    const last = wlog().filter((e) => e.item === R.item && e.note).pop();
    h = head('Workout · ' + F.length + ' sets') + `<div class="sb">
      <div class="wsh"><b>Before I start</b></div>
      <div class="row"><span class="lbl">Start Strength on my watch</span><button class="wtk ${R.watch ? 'on' : ''}" data-a="wwatch" data-v="watch" aria-label="Done" aria-pressed="${!!R.watch}"></button></div>
      <div class="wsh"><b>Today</b></div>
      ${w.ex.filter((e) => exOf(e.x)).map((e) => `<div class="row"><span class="lbl">${xnm(exOf(e.x))}</span><span class="mono wsm">${e.sets} × ${exOf(e.x).timed ? e.n + ' s' : e.n}${exOf(e.x).side ? ' each' : ''}</span></div>`).join('')}
      ${last ? `<p class="wlast">Last time I wrote: “${esc(last.note)}”</p>` : ''}
    </div><div class="wfoot"><button class="wbig fill" data-a="wrgo">Go</button></div>`;
  } else if (R.phase === 'fin') h = woFinish(R, head, dc, F.length);
  else if ((w.follow || 'list') === 'one') h = woOne(R, w, F, head, dc);
  else h = woList(R, w, F, head, dc);
  return `<div class="cifull wfull" role="dialog" aria-label="${esc(it.name)}" style="--tc:${woCol()}">${h}</div>`; }
// the controls for one set: ticks, or Start for a hold (greyed until it's that set's turn)
function woCtl(R, e, k, turn, big) { const x = exOf(e.x); const tm = R.tm && R.tm.k === k ? R.tm : null; const hf = R.half[k];
  if (!x.timed) { if (!x.side) return big ? `<button class="wbig fill" data-a="wdone" data-ref="${k}">Done</button>` : `<button class="wtk" data-a="wdone" data-ref="${k}" aria-label="Tick"></button>`;
    if (big) return `<button class="wbig fill" data-a="${hf ? 'wdone' : 'whalf'}" data-ref="${k}">${hf ? 'Done right side' : 'Done left side'}</button>`;
    return `<span class="wlr"><button class="wtk ${hf ? 'on' : ''}" data-a="whalf" data-ref="${k}" aria-label="Left side done" aria-pressed="${!!hf}"></button><small>L</small><button class="wtk" data-a="wdone" data-ref="${k}" aria-label="Right side done" ${hf ? '' : 'disabled'}></button><small>R</small></span>`; }
  const lab = !tm ? (x.side ? 'Start left side' : 'Start') : tm.state === 'gap' ? 'Start right side' : '';
  const cls = big ? 'wbig fill' : 'wst';
  if (!tm || tm.state === 'gap') return `<button class="${cls}" data-a="wtstart" data-ref="${k}" ${turn ? '' : 'disabled'}>${big ? lab : lab.replace(' side', '')}</button>${big ? '' : `<button class="wtk" data-a="wdone" data-ref="${k}" aria-label="Tick without timing"></button>`}`;
  if (tm.state === 'run') return `<button class="${big ? 'wbig' : 'wst'}" data-a="wtstop" data-ref="${k}">Stop</button>`;
  return big ? `<button class="wbig fill" data-a="wdone" data-ref="${k}">Done</button>` : `<button class="wtk" data-a="wdone" data-ref="${k}" aria-label="Tick"></button>`; }
function woAmt(R, e, k) { const x = exOf(e.x); const n = R.act[k] != null ? R.act[k] : e.n; const tm = R.tm && R.tm.k === k ? R.tm : null;
  if (tm && tm.state === 'run') return `<span class="wamt"><b class="wcd">${tLeft(R)}</b> s <i>${x.side ? (tm.side ? 'right' : 'left') : ''}</i></span>`;
  if (tm && tm.state === 'gap') return `<span class="wamt"><i>left side done</i></span>`;
  if (tm && tm.state === 'over') return `<span class="wamt"><i>time's up</i></span>`;
  if (R.edit === k) return `<span class="stp wstp"><button data-a="wst" data-v="-1" aria-label="Less">−</button><b>${n}</b><button data-a="wst" data-v="1" aria-label="More">+</button></span>`;
  return `<button class="wamt" data-a="wamt" data-ref="${k}">${woUnit(e.x, n)}${woSide(e.x)}</button>`; }
function woList(R, w, F, head, dc) { const nx = woNext(R); const m = Math.max(...w.ex.map((e) => e.sets));
  let h = head(dc + ' of ' + F.length + ' sets') + `<div class="wprog"><i style="width:${F.length ? dc / F.length * 100 : 0}%"></i></div><div class="sb">`;
  for (let s = 0; s < m; s++) { const here = w.ex.map((e, i) => [e, i]).filter(([e]) => s < e.sets && exOf(e.x)); if (!here.length) continue;
    h += `<div class="wsh"><b>Set ${s + 1}</b><span>· ${here.length}</span></div>`;
    here.forEach(([e, i]) => { const k = woK(i, s), d = R.done[k], x = exOf(e.x);
      h += `<div class="row wrr ${d ? 'dn' : ''} ${k === nx ? 'nx' : ''}"><span class="wmk"></span><span class="lbl">${xnm(x)}${s === 0 && !d && x.cue ? `<span class="wcue">${esc(x.cue)}</span>` : ''}</span>${d ? `<button class="wamt" data-a="wundo" data-ref="${k}">${woUnit(e.x, R.act[k] != null ? R.act[k] : e.n)}</button><button class="wtk on" data-a="wundo" data-ref="${k}" aria-label="Untick"></button>` : woAmt(R, e, k) + woCtl(R, e, k, k === nx, false)}</div>`; }); }
  return h + `</div><div class="wfoot"><button class="wbig" data-a="wfin">Finish</button></div>`; }
function woOne(R, w, F, head, dc) { if (!F.length) return head('') + '<div class="sb"><p class="empty">No exercises.</p></div>';
  let j = F.findIndex(([i, s]) => !R.done[woK(i, s)]); if (R.i != null && R.i >= 0 && R.i < F.length && !R.done[woK(...F[R.i])]) j = R.i; if (j < 0) j = F.length - 1; R.i = j;
  const [i, s] = F[j], e = w.ex[i], x = exOf(e.x), k = woK(i, s), tm = R.tm && R.tm.k === k ? R.tm : null; const n = tm && tm.state === 'run' ? tLeft(R) : (R.act[k] != null ? R.act[k] : e.n);
  const nxt = F.slice(j + 1).find(([a, b]) => !R.done[woK(a, b)]); const hf = R.half[k];
  const unit = !x.timed ? 'reps' + woSide(e.x) + (x.side ? ' · ' + (hf ? 'right' : 'left') : '') : !tm ? 'seconds' + woSide(e.x) : tm.state === 'run' ? 'seconds · ' + (x.side ? (tm.side ? 'right side' : 'left side') : 'holding') : tm.state === 'gap' ? 'left side done · the right when I’m ready' : 'time’s up · Done when I’m ready';
  return head(dc + ' of ' + F.length + ' sets') + `<div class="wsegs">${F.map(([a, b], q) => `<i class="${R.done[woK(a, b)] ? 'on' : ''} ${q === j ? 'cur' : ''}"></i>`).join('')}</div>
    <div class="sb wone"><span class="mono">Set ${s + 1} of ${e.sets}</span><h3>${xnm(x)}</h3>
      <div class="wnum"><button data-a="wbig" data-ref="${k}" data-v="-1" aria-label="Less">−</button><span class="${tm && tm.state === 'run' ? 'wcd' : ''}">${n}</span><button data-a="wbig" data-ref="${k}" data-v="1" aria-label="More">+</button></div>
      <p class="wunit">${unit}</p>${x.cue ? `<p class="wcue1">${esc(x.cue)}</p>` : ''}
      <p class="wnext">${nxt ? `Next · set ${nxt[1] + 1}<b>${esc(xtn(exOf(w.ex[nxt[0]].x)))} · ${woUnit(w.ex[nxt[0]].x, w.ex[nxt[0]].n)}${woSide(w.ex[nxt[0]].x)}</b>` : 'Last set<b>Then I finish</b>'}</p></div>
    <div class="wfoot wrowf"><button class="wback" data-a="wprev" aria-label="Previous set" ${j ? '' : 'disabled'}>${icon('chevron-left', 18)}</button>${woCtl(R, e, k, true, true)}${x.timed && (!tm || tm.state === 'gap') ? `<button class="wback wsk" data-a="wdone" data-ref="${k}">Done</button>` : ''}</div>
    <div class="wfoot2"><button data-a="wfin">Finish now</button></div>`; }
function woFinish(R, head, dc, all) { const it = I(R.item), w = it.wo; const lab = { up: 'Go up', down: 'Ease off', hold: 'Hold', keep: 'Keep' };
  let ac = [...new Set(w.ex.flatMap((e) => acheOf(e.x)))]; if (!ac.length) ac = acheItems();
  const acheRow = (k) => { const sc = SCALES[I(k).scale] || SCALES.symptom3; const cur = R.f.ache[k] != null ? R.f.ache[k] : val(T0, k);
    return `<div class="row"><span class="lbl">${esc(I(k).name)}</span><span class="wsc">${sc.map((l, q) => `<button data-a="wache" data-ref="${k}" data-v="${q + 1}" aria-pressed="${cur === q + 1}">${esc(l)}</button>`).join('')}</span></div>`; };
  const sug = w.ex.map((e, i) => { if (!exOf(e.x)) return ''; const g = woSuggest(e, R); const can = g.kind === 'up' || g.kind === 'down';
    return `<div class="row wsug"><span class="lbl">${xnm(exOf(e.x))} <span class="mono wsm">${lab[g.kind]} · ${esc(g.to)}</span><span class="sub">${esc(g.why)}</span></span>${woBars(e.x, R)}${can ? `<button class="wtk ${R.f.acc[i] ? 'on' : ''}" data-a="wacc" data-ref="${i}" aria-label="Use next time" aria-pressed="${!!R.f.acc[i]}"></button>` : '<span class="wtkgap"></span>'}</div>`; }).join('');
  return head('Done · ' + dc + ' of ' + all + ' sets') + `<div class="sb">
    <div class="wsh"><b>Before I save</b></div>
    <div class="row"><span class="lbl">Stop and save Strength on my watch</span><button class="wtk ${R.stop ? 'on' : ''}" data-a="wwatch" data-v="stop" aria-label="Done" aria-pressed="${!!R.stop}"></button></div>
    <div class="wsh"><b>Aches and pains</b></div>${ac.map(acheRow).join('') || '<p class="empty">No aches and pains items.</p>'}
    <div class="wsh"><b>Next time</b></div>${sug}
    <p class="wlast">Bars: my volume per week for six weeks, with a mark under weeks that area ached. Only ticked suggestions change the workout.</p>
    <div class="wsh"><b>Note</b></div><textarea class="inp" id="wnote" data-wnote="1" rows="2" placeholder="Anything to remember?">${esc(R.note || '')}</textarea>
    <div class="btns" style="margin-top:18px"><button class="btn" data-a="wback">Back to the sets</button><button class="btn danger" data-a="wdrop">Throw it away</button></div>
  </div><div class="wfoot"><button class="wbig fill" data-a="wrsave">Save</button></div>`; }
function woTStop(R) { const x = exOf(I(R.item).wo.ex[+R.tm.k.split('-')[0]].x) || {}; R.tm.state = x.side && !R.tm.side ? 'gap' : 'over'; }
// a hold that runs out only says so (and buzzes once); it never moves me on
setInterval(() => { const R = M && M.wrun; if (!R || !R.tm || R.tm.state !== 'run' || !S.sheet || S.sheet.kind !== 'wrun') return;
  if (Date.now() >= R.tm.end) { woTStop(R); try { navigator.vibrate && navigator.vibrate(300); } catch (_) {} save(); renderLayer(); return; }
  document.querySelectorAll('#layer .wcd').forEach((el) => { el.textContent = tLeft(R); }); }, 250);

// ---------- actions ----------
// workouts live only in the Workouts category, never in my other training categories (the owner, 2026-11-24)
function woCat(make) { const tc = trainCats(); let c = tc.includes('tc-work') ? 'tc-work' : tcatNamed(/workout|strength/i); if (c || !make || !G('g-train')) return c || null;
  c = G('tc-work') ? uid('tc') : 'tc-work'; M.groups[c] = { name: 'Workouts', style: 'tcat', holds: 'task', color: '#3FAFA6', icon: 'dumbbell', kids: [] }; G('g-train').kids.push(c); return c; }
// a workout found in another training category moves to Workouts
function woHome() { const c = woCat(woItems().length > 0); if (!c) return false; let moved = false;
  woItems().forEach((k) => { if (woBlock(k)) moved = true; }); woItems().forEach((k) => trainCats().forEach((t) => { if (t === c || !kidsOf(t).includes(k)) return; G(t).kids = G(t).kids.filter((x) => x !== k); if (!G(c).kids.includes(k)) G(c).kids.push(k); moved = true; }));
  return moved; }
function woNewItem(name) { const cat = woCat(true); if (!cat) return null; const id = uid('wo');
  M.items[id] = { name, type: 'task', kind: 'behaviour', tags: [], made: T0, dur: 45, insight: true, when: { mode: 'once', date: null }, persist: true, wo: { follow: 'list', ex: [] } }; G(cat).kids.push(id); woBlock(id); return id; }
// a workout sits in a day block like any session, so once it has a day it shows on Today, the Schedule and the calendars (2026-11-24)
function woBlock(k) { if (placements(k).some((p) => G(p) && G(p).style === 'dayblock')) return false; const b = defBlock('training'); if (!b || !G(b)) return false; G(b).kids.push(k); return true; }
function woRemoveEx(x) { Object.values(M.items).forEach((it) => { if (it.wo) it.wo.ex = it.wo.ex.filter((e) => e.x !== x); if (it.exs) it.exs = it.exs.filter((k) => k !== x); }); M.exercises = exList().filter((e) => e.id !== x); }
function workoutAction(act, a, ref, v) {
  const R = M.wrun;
  switch (act) {
    case 'wonew': { let id; change(() => { id = woNewItem('New workout'); }); if (id) openSheet({ kind: 'wo', ref: id, title: 'Workout' }); else flash('Make a training category first'); return true; }
    case 'woedit': if (I(ref) && !I(ref).wo) change(() => { I(ref).wo = { follow: 'list', ex: [] }; }); openSheet({ kind: 'wo', ref, title: 'Workout' }); return true;
    case 'wonogen': change(() => { const it = I(ref); if (it.nogen) delete it.nogen; else it.nogen = true; }); return true; // an extra workout leaves the generic items alone (the owner, 2026-11-24)
    case 'wofollow': change(() => { I(ref).wo.follow = v; }); return true;
    case 'wostep': { const [f, d] = v.split('|'); const e = I(S.sheet.ref).wo.ex[+ref]; const x = exOf(e.x) || {}; const step = f === 'n' && x.timed ? 5 : 1;
      change(() => { e[f] = Math.max(f === 'n' && x.timed ? 5 : 1, e[f] + step * (+d)); }); return true; }
    case 'womove': { const ex = I(S.sheet.ref).wo.ex, i = +ref, j = i + (+v); if (j < 0 || j >= ex.length) return true; change(() => { [ex[i], ex[j]] = [ex[j], ex[i]]; }); return true; }
    case 'worm': change(() => { I(S.sheet.ref).wo.ex.splice(+ref, 1); }); return true;
    case 'wodel': S.sheet = null; change(() => { delete I(ref).wo; if (M.wrun && M.wrun.item === ref) delete M.wrun; }, 'Took the exercises off ' + I(ref).name); return true;
    case 'wxnew': openSheet({ kind: 'wx', isNew: true, ref: uid('ex'), title: 'New exercise', draft: { name: '', cue: '', side: 0, timed: 0, nosug: 0, aches: [] }, back: S.sheet && S.sheet.kind === 'wo' ? S.sheet : null, addTo: S.sheet && S.sheet.kind === 'wo' ? S.sheet.ref : null }); return true;
    case 'wxedit': { const x = exOf(ref); if (x) openSheet({ kind: 'wx', ref, title: 'Exercise', draft: Object.assign({}, x, { aches: acheOf(ref) }), back: S.sheet && S.sheet.kind === 'wo' ? S.sheet : null }); return true; }
    case 'wxset': { wxCapture(); const D = S.sheet.draft; if (v === 'reps') D.timed = 0; else if (v === 'timed') D.timed = 1; else D[v] = D[v] ? 0 : 1; renderLayer(); return true; }
    case 'wxache': { wxCapture(); const D = S.sheet.draft; D.aches = (D.aches || []).includes(v) ? D.aches.filter((k) => k !== v) : (D.aches || []).concat(v); renderLayer(); return true; }
    case 'wxsave': { wxCapture(); const s = S.sheet, D = s.draft; if (!D.name) { flash('Give it a name first'); return true; }
      change(() => { const o = { id: s.ref, name: D.name, extra: D.extra || '', cue: D.cue || '', side: D.side ? 1 : 0, timed: D.timed ? 1 : 0, nosug: D.nosug ? 1 : 0 };
        const old = exOf(s.ref); if (old) { if (!!old.timed !== !!o.timed) Object.values(M.items).forEach((it) => (it.wo ? it.wo.ex : []).forEach((e) => { if (e.x === o.id) e.n = o.timed ? 30 : 10; })); Object.assign(old, o); } else exList().push(o);
        acheItems().forEach((k) => { const it = I(k); const on = (D.aches || []).includes(k); const L0 = (it.exs || []).filter((x) => x !== o.id); if (on) L0.push(o.id); if (L0.length) it.exs = L0; else delete it.exs; });
        if (s.addTo && I(s.addTo) && I(s.addTo).wo) I(s.addTo).wo.ex.push({ x: o.id, sets: 3, n: o.timed ? 30 : 10 }); }, (s.isNew ? 'Added ' : 'Saved ') + D.name);
      S.sheet = s.back || null; render(); return true; }
    case 'wxdel': { const x = exOf(ref); S.sheet = S.sheet.back || null; change(() => woRemoveEx(ref), 'Deleted ' + (x ? x.name : '')); return true; }
    case 'wacx': { tcapture(); const D = S.sheet.draft; D.exs = (D.exs || []).includes(v) ? D.exs.filter((x) => x !== v) : (D.exs || []).concat(v); if (!D.exs.length) delete D.exs; renderLayer(); return true; }
    case 'wostart': woRunStart(ref); return true;
  }
  if (!R || !S.sheet || S.sheet.kind !== 'wrun') return false;
  const w = I(R.item) && I(R.item).wo; if (!w) return false;
  const entry = (k) => w.ex[+String(k).split('-')[0]];
  const keep = () => { save(); renderLayer(); };
  switch (act) {
    case 'wquit': if (R.phase === 'start') delete M.wrun; save(); woSleep(); closeSheet(); return true; // once started it stays, so Training can Resume it
    case 'wdrop': delete M.wrun; save(); woSleep(); closeSheet(); flash('Workout thrown away'); return true;
    case 'wwatch': R[v] = !R[v]; keep(); return true;
    case 'wrgo': R.phase = 'go'; keep(); return true;
    case 'wamt': R.edit = R.edit === ref ? null : ref; keep(); return true;
    case 'wst': { const k = R.edit; const e = entry(k); const x = exOf(e.x); R.act[k] = Math.max(0, (R.act[k] != null ? R.act[k] : e.n) + (+v) * (x.timed ? 5 : 1)); keep(); return true; }
    case 'wbig': { const e = entry(ref); const x = exOf(e.x); if (R.tm && R.tm.k === ref && R.tm.state === 'run') { R.tm.end += (+v) * 5000; } else R.act[ref] = Math.max(0, (R.act[ref] != null ? R.act[ref] : e.n) + (+v) * (x.timed ? 5 : 1)); keep(); return true; }
    case 'whalf': R.half[ref] = !R.half[ref]; keep(); return true;
    case 'wdone': { R.done[ref] = 1; delete R.half[ref]; if (R.tm && R.tm.k === ref) R.tm = null; R.edit = null;
      if ((w.follow || 'list') === 'one') { const F = woFlat(w); const j = F.findIndex(([i, s]) => woK(i, s) === ref); const nx = F.slice(j + 1).findIndex(([i, s]) => !R.done[woK(i, s)]); if (nx < 0 && F.every(([i, s]) => R.done[woK(i, s)])) R.phase = 'fin'; else R.i = nx < 0 ? null : j + 1 + nx; }
      keep(); return true; }
    case 'wundo': delete R.done[ref]; keep(); return true;
    case 'wprev': { const F = woFlat(w); const j = R.i || 0; if (j > 0) { R.i = j - 1; delete R.done[woK(...F[j - 1])]; } R.tm = null; keep(); return true; }
    case 'wtstart': { const e = entry(ref); const dur = R.act[ref] != null ? R.act[ref] : e.n; const side = R.tm && R.tm.k === ref && R.tm.state === 'gap' ? 1 : 0; R.tm = { k: ref, side, end: Date.now() + dur * 1000, state: 'run' }; woWake(); keep(); return true; }
    case 'wtstop': woTStop(R); keep(); return true;
    case 'wfin': R.phase = 'fin'; R.tm = null; keep(); return true;
    case 'wback': R.phase = 'go'; keep(); return true;
    case 'wache': { const n = +v; R.f.ache[ref] = R.f.ache[ref] === n ? 0 : n; keep(); return true; }
    case 'wacc': R.f.acc[ref] = !R.f.acc[ref]; keep(); return true;
    case 'wrsave': { const nt = document.getElementById('wnote'); const note = nt ? nt.value.trim() : ''; const today = woToday(R); const sug = w.ex.map((e) => (exOf(e.x) ? woSuggest(e, R) : null)); const name = I(R.item).name;
      change(() => { L(T0)[R.item] = 'done';
        Object.entries(R.f.ache).forEach(([k, n]) => { if (n) L(T0)[k] = n; else delete L(T0)[k]; });
        if (Object.keys(today.sets).length) { if (note) today.note = note; wlog().push(today); }
        w.ex.forEach((e, i) => { const g = sug[i]; if (R.f.acc[i] && g && g.s) { e.sets = g.s; e.n = g.r; } });
        delete M.wrun; }, 'Saved ' + name);
      woSleep(); S.sheet = null; render(); return true; }
  }
  return false;
}
// typing a workout's name, giving a session exercises, adding an exercise from the list
document.addEventListener('change', (e) => { const ds = e.target.dataset || {};
  if (ds.wnote && M.wrun) { M.wrun.note = e.target.value; save(); return; }
  if (ds.woname) { const v = e.target.value.trim(), k = ds.woname; if (v && I(k)) setTimeout(() => change(() => { I(k).name = v; }), 0); return; } // after the click that blurred it has drawn
  if (ds.wogive) { const k = e.target.value; if (k && I(k)) { change(() => { I(k).wo = { follow: 'list', ex: [] }; }); openSheet({ kind: 'wo', ref: k, title: 'Workout' }); } return; }
  if (ds.woadd) { const x = e.target.value; const it = I(ds.woadd); if (!x || !it) return; if (x === '__new') { workoutAction('wxnew'); return; }
    const ex = exOf(x); change(() => { it.wo.ex.push({ x, sets: 3, n: ex && ex.timed ? 30 : 10 }); }); } });
