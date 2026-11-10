// ---------- Training (2026-11-04: "Let's work on training") ----------
// Ported from the old Daybook Fitness page: a calendar of only training, a week verdict card, sessions by category
// (tick circle, card opens the Schedule pop-up), injuries and weaknesses, aches and pains per body area.
// Expeditions get their own folder: Planned, Wishlist, Done. The planning part waits for the owner's answer.
function tMigrate(m) {
  // (the lists live in here: migration runs while the page is still loading)
  const TCATS = [['tc-move', 'General movement', '#7DBE9A', 'footprints'], ['tc-work', 'Workouts', '#3FAFA6', 'dumbbell'], ['tc-exp', 'Expedition training', '#6FA24A', 'mountain']];
  const ACHES = ['Knees', 'Calves', 'Hips', 'Lower back', 'Shoulders', 'Feet'];
  if (!m.areas || !m.areas.health || !m.groups || !m.items) return; m.settings = m.settings || {};
  // sample conditions for the example data (2026-11-05): two that ended, one ongoing
  if (!m.settings.conds1) { m.settings.conds1 = true; if (m.example) { m.conds = m.conds || []; const td = iso(new Date()); const ago = (n) => { const x = new Date(); x.setDate(x.getDate() - n); return iso(x); };
    [['cs-cold', 'Cold', 41, 35], ['cs-shin', 'Shin splints', 27, 13, 1], ['cs-knee', 'Sore left knee', 4, null, 1]].forEach(([id, name, a, b, f]) => { if (!m.conds.some((x) => x.id === id)) m.conds.push(Object.assign({ id, name, start: ago(a), sample: true }, b === null ? {} : { end: ago(b) }, f ? { fit: true } : {})); }); } }
  if (!m.settings.conds3) { m.settings.conds3 = true; if (m.example) { m.conds = m.conds || []; const ago = (n) => { const x = new Date(); x.setDate(x.getDate() - n); return iso(x); };
    [['cs-mig', 'Migraine week', 22, 17], ['cs-iron', 'Low iron, tired', 9, null], ['cs-hip', 'Tight hip flexor', 52, 44, 1]].forEach(([id, name, a, b, f]) => { if (!m.conds.some((x) => x.id === id)) m.conds.push(Object.assign({ id, name, start: ago(a), sample: true }, b === null ? {} : { end: ago(b) }, f ? { fit: true } : {})); }); } }
  if (!m.settings.conds2) { m.settings.conds2 = true; (m.conds || []).forEach((x) => { if (x.id === 'cs-shin' || x.id === 'cs-knee') x.fit = true; }); }
  if (m.settings.train1) return; m.settings.train1 = true; const ex = !!m.example; m.log = m.log || {};
  m.groups['g-train'] = m.groups['g-train'] || { name: 'Training', holds: 'tcats', kids: [] };
  TCATS.forEach(([id, name, color, ic]) => { if (!m.groups[id]) { m.groups[id] = { name, style: 'tcat', holds: 'task', color, icon: ic, kids: [] }; m.groups['g-train'].kids.push(id); } });
  const it = (id, cat, o, ago) => { if (m.items[id]) return; m.items[id] = Object.assign({ type: 'task', made: addDays(T0, -60), tags: [], insight: true, kind: 'behaviour', dur: 45 }, o); m.groups[cat].kids.push(id);
    (ago || []).forEach((k) => { const d = addDays(T0, -k); (m.log[d] = m.log[d] || {})[id] = 'done'; }); };
  if (ex) {
    it('tr-walk', 'tc-move', { name: 'Walk', when: { mode: 'every', n: 2 }, icon: 'footprints' }, [1, 3, 5, 8]);
    it('tr-dance', 'tc-move', { name: 'Dance', when: { mode: 'every', n: 7 }, icon: 'music' }, [2, 9]);
    it('tr-yoga', 'tc-move', { name: 'Yoga', when: { mode: 'days', days: [2, 5], n: 1 }, icon: 'flower-2' }, [3, 6]);
    it('tr-str', 'tc-work', { name: 'Strength workout', when: { mode: 'days', days: [0, 3], n: 1 }, icon: 'dumbbell' }, [2, 5, 9]);
    it('tr-mob', 'tc-work', { name: 'Mobility', when: { mode: 'every', n: 3 }, icon: 'stretch-horizontal' }, [4, 12]);
    it('tr-load', 'tc-exp', { name: 'Loaded hike', when: { mode: 'days', days: [5], n: 1 }, icon: 'backpack', dur: 180 }, [4, 11]);
    it('tr-stairs', 'tc-exp', { name: 'Stair climbing', when: { mode: 'every', n: 7 }, icon: 'trending-up' }, [6]);
  }
  // aches and pains: one 1-3 tracker per body area (the same symptom scale as Health)
  if (!m.groups['hg-aches']) { m.groups['hg-aches'] = { name: 'Aches and pains', style: 'hgroup', holds: 'tracker', color: '#E0644E', kids: [] };
    ACHES.forEach((n, i) => { const id = 'ac-' + i; m.items[id] = m.items[id] || { name: n, type: 'tracker', scale: 'symptom3', kind: 'experience', tags: [], insight: true }; m.groups['hg-aches'].kids.push(id); });
    if (ex) { const d = addDays(T0, -1); (m.log[d] = m.log[d] || {})['ac-0'] = 1; } }
  m.trips = m.trips || (ex ? [
    { id: 'x1', name: 'Sarek traverse', kind: 'expedition', status: 'planned', date: addDays(T0, 7 * 34), len: 9, note: '' },
    { id: 'x2', name: 'Rondane weekend', kind: 'hike', status: 'planned', date: addDays(T0, 7 * 20), len: 2, note: '' },
    { id: 'x3', name: 'Kungsleden', kind: 'expedition', status: 'wish', date: null, len: 12, note: '' },
    { id: 'x4', name: 'Hardangervidda', kind: 'expedition', status: 'done', date: addDays(T0, -70), len: 6, note: '' }] : []);
  m.pages.expeds = m.pages.expeds || { name: 'Expeditions', color: '#6FA24A' };
  const pg = m.areas.health.pages; if (!pg.includes('expeds') && !(m.settings || {}).noExp) pg.splice(Math.max(0, pg.indexOf('training')) + 1, 0, 'expeds');
}
// Colours that belong to no group: conditions (own colour, falls back to Health's Other) and expedition kinds (2026-11-05)
// Training's own list: injuries and weaknesses (conds with fit: true), own colour (2026-11-05)
const condCol = () => (M.settings || {}).fitCondCol || '#F08A3E';
const TRIPK = [['expedition', 'Expedition', '#6FA24A'], ['hike', 'Hike', '#7DBE9A']];
const tripCol = (k) => ((M.settings || {}).tripCols || {})[k] || (TRIPK.find((x) => x[0] === k) || TRIPK[0])[2];
const expOn = () => !(M.settings || {}).noExp;
const trainCats = () => (G('g-train') ? G('g-train').kids.filter((k) => G(k) && (expOn() || k !== 'tc-exp')) : []);
const trainCat = (id) => trainCats().find((c) => G(c).kids.includes(id));
const trainedOn = (d) => trainCats().filter((c) => kidsOf(c).some((k) => isDone(k, d)));
const plannedOn = (d) => trainCats().filter((c) => kidsOf(c).some((k) => onDay(k, d)));
const trips = () => (M.trips = M.trips || []);
const nextTrip = () => trips().filter((t) => t.status === 'planned' && t.date && t.date >= T0).sort((a, b) => a.date.localeCompare(b.date))[0];
const weeksTo = (d) => Math.max(0, Math.ceil(diff(T0, d) / 7));
const tripWhen = (t) => (t.kind === 'hike' ? 'Hike' : 'Expedition') + (t.len ? ' · ' + t.len + (t.len === 1 ? ' day' : ' days') : '') + (t.date ? ' · ' + fmtDate(t.date) + (t.status === 'planned' && t.date >= T0 ? ' · ' + weeksTo(t.date) + (weeksTo(t.date) === 1 ? ' week to go' : ' weeks to go') : '') : '');
// the Training calendar: the same calendar as Today, its dots only for training (done on past days, planned on coming days)
// Star on the Training calendar: a past day where every session planned that day got done (2026-11-05)
function trainStar(d) { if (d >= T0) return false; const ks = trainCats().flatMap(kidsOf).filter((k) => onDay(k, d)); return ks.length > 0 && ks.every((k) => isDone(k, d)); }
// sample history for the stars: some past days get every planned session ticked (example data only, once)
function trainSampleStars() { if (!M.example || (M.settings || {}).trstars1) return; M.settings.trstars1 = true;
  [24, 22, 19, 17, 15, 13, 10, 8, 7, 3, 2].forEach((n) => { const d = addDays(T0, -n); trainCats().flatMap(kidsOf).forEach((k) => { if (onDay(k, d)) (M.log[d] = M.log[d] || {})[k] = 'done'; }); }); save(); }
function trainDots(d) { return (d <= T0 ? trainedOn(d) : plannedOn(d)).map((c) => G(c)).slice(0, 3); }
function trainCard() {
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(T0, i - 6)); const n = last7.filter((d) => trainedOn(d).length).length;
  const [word, lvl] = n >= 5 ? ['Strong week', 0] : n >= 3 ? ['Steady', 1] : n >= 1 ? ['Light week', 2] : ['Resting', 2];
  const aches = kidsOf('hg-aches').filter((k) => typeof val(T0, k) === 'number').map((k) => I(k).name.toLowerCase() + ' ' + SCALES.symptom3[val(T0, k) - 1]);
  const nx = nextTrip(); const cond = (M.conds || []).filter((x) => x.start <= T0 && !x.end);
  const sub = n + (n === 1 ? ' day' : ' days') + ' trained in the last 7.' + (aches.length ? ' Aches: ' + aches.join(', ') + '.' : '') + (cond.length ? ' Looking after ' + cond.map((x) => x.name.toLowerCase()).join(', ') + '.' : '') + (nx ? ' ' + nx.name + ' in ' + weeksTo(nx.date) + ' weeks.' : '');
  const segs = last7.map((d) => { const c = trainedOn(d)[0]; return c ? G(c).color : SEG0; });
  const foot = trainCats().map((c) => last7.filter((d) => kidsOf(c).some((k) => isDone(k, d))).length + ' ' + G(c).name.split(' ')[0]).join(' · ');
  return vCard({ eyebrow: 'Training · last 7 days', word, lvl, sub, segs, foot });
}
const lastText = (id) => { const l = isDone(id, T0) ? T0 : lastDoneBefore(id, T0); return !l ? 'Not done yet' : l === T0 ? 'Done today' : 'Last done ' + (diff(l, T0) === 1 ? 'yesterday' : diff(l, T0) + ' days ago'); };
// Conditions on the Training calendar (2026-11-05): a thin band along the bottom of each day a condition was
// ongoing, joined across neighbouring days, rounded where it starts and ends; never drawn on coming days.
// fit = injuries and weaknesses (Training); fit false = general conditions (Health). Training draws only fit; Today draws both,
// the general line just above the fit one (2026-11-05)
const condsOn = (d) => d > T0 ? [] : (M.conds || []).filter((x) => x.start <= d && (!x.end || x.end > d)); // the end day doesn't count
const genCondCol = () => (G('ht-conds') || {}).color || (G('hg-other') || {}).color || '#6F9BD6';
function condBar(d, fit = true, solo = false) { const on = condsOn(d, fit); if (!on.length) return '';
  const prev = condsOn(addDays(d, -1), fit).length, next = d < T0 && condsOn(addDays(d, 1), fit).length;
  return `<span class="condbar ${fit || solo ? '' : 'gen'} ${prev ? '' : 'st'} ${next ? '' : 'en'}" style="--cc:${fit ? condCol() : genCondCol()}" title="${esc(on.map((x) => x.name).join(', '))}"></span>`; }
// Thin lines land on part-pixels on phone screens, so each row drew them 2 or 3 device pixels thick (2026-11-05).
// Snap every condition line's top and height to whole device pixels so they all look the same.
function snapBars() { const dpr = window.devicePixelRatio || 1;
  // condition line stacks: every line and every gap the same whole number of device pixels, then the stack's bottom on a pixel
  document.querySelectorAll('.condlines').forEach((c) => { const kids = [...c.children]; c.style.transform = ''; c.style.gap = ''; kids.forEach((x) => { x.style.height = ''; });
    const r = kids[0] && kids[0].getBoundingClientRect(); if (!r || !r.height) return; const sc = r.height / 2; const H = Math.max(1, Math.round(2 * sc * dpr)) / dpr / sc;
    kids.forEach((x) => { x.style.height = H + 'px'; }); c.style.gap = H + 'px';
    const b = c.getBoundingClientRect().bottom; c.style.transform = `translateY(${(Math.round(b * dpr) / dpr - b) / sc}px)`; });
  document.querySelectorAll('.condbar').forEach((b) => { b.style.transform = ''; b.style.height = '';
    const r = b.getBoundingClientRect(); if (!r.height) return; const sc = r.height / 2;
    b.style.height = (Math.max(1, Math.round(r.height * dpr)) / dpr / sc) + 'px'; // the line sits on its bottom edge, so measure again
    const t = b.getBoundingClientRect().top; b.style.transform = `translateY(${(Math.round(t * dpr) / dpr - t) / sc}px)`; }); }
// snap again whenever the layout can move under the lines: fonts arriving late, size changes, scrolling (v153)
let snapQ = false; const snapSoon = () => { if (snapQ) return; snapQ = true; requestAnimationFrame(() => { snapQ = false; snapBars(); }); };
addEventListener('resize', snapSoon);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(snapSoon);
if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', snapSoon);
setTimeout(() => { const v = document.getElementById('view'), mn = document.getElementById('main');
  if (window.ResizeObserver && v) new ResizeObserver(snapSoon).observe(v);
  if (mn) mn.addEventListener('scroll', snapSoon, { passive: true }); }, 0);
function renderTraining() {
  trainSampleStars();
  let h = renderCal('f') + calEdit();
  // the expedition countdown can sit under the Training calendar (Calendars › Training › Countdown) (2026-11-06)
  if (expOn() && calOn('train', 'count') && (S.fday || T0) === T0) h += `<div style="margin:14px 0 -4px">${xCounts()}</div>`;
  const d = S.fday || T0;
  if (d !== T0) { const ids = trainCats().flatMap(kidsOf).filter((k) => d < T0 ? isDone(k, d) : onDay(k, d));
    h += `<div style="margin-top:14px">` + lcard(null, fmtDate(d), '', (ids.map((k) => `<div class="row"><span class="circ ${isDone(k, d) ? 'done' : ''}" style="--c:${G(trainCat(k)).color}">${isDone(k, d) ? '✓' : ''}</span><button class="lbl" data-a="sched" data-ref="${k}" style="text-align:left">${esc(I(k).name)}<span class="sub">${esc(G(trainCat(k)).name)}${d > T0 ? ' · planned' : ''}</span></button></div>`).join('') || `<p class="empty">${d < T0 ? 'No training that day.' : 'Nothing planned that day.'}</p>`) + condsOn(d).map((x) => `<p class="condday">${ctagMarks(x)}${esc(x.name + ', day ' + (diff(x.start, d) + 1))}</p>`).join('')) + '</div>'; }
  // another day picked: only that day's list, none of today's logging (2026-11-05); edit mode keeps the structure
  if (d !== T0 && !S.edit) return h;
  // no verdict card on Training (2026-11-04)
  // Sessions as Planner rows, one card per category like Today's blocks; adding only in edit mode (2026-11-04)
  h += `<div class="stack" ${S.edit ? 'data-list="g-train"' : ''} style="margin-top:14px">` + trainCats().map((c) => { const g = G(c); const ks = kidsOf(c); const open = S.edit || S.open['b:' + c] !== false;
    const left = ks.filter((k) => onDay(k, T0) && !isDone(k, T0)).length;
    return `<section class="card" data-ref="${c}"><div class="bhead">${grip()}${S.edit ? `<span class="circ" style="--c:${g.color};width:14px;height:14px;background:${g.color}" data-col="${c}" role="button" aria-label="Change colour"></span><span class="nm mono" style="font-size:11px;flex:1">${nm(c, g.name)}</span>${tail(c, 'g-train')}`
      : `<button data-a="bopen" data-ref="${c}" aria-expanded="${open}" style="display:flex;align-items:center;gap:8px;width:100%;min-height:44px"><span class="nm mono" style="flex:1">${esc(g.name)}</span><span class="cnt">${left ? left + ' today' : ''}</span>${fold(open)}</button>`}</div>
      ${open ? `<div class="list" data-list="${c}">${ks.map((k) => itemRow(k, c, T0)).join('') || (S.edit ? '' : '<p class="empty">No sessions yet.</p>')}${S.edit ? `<button class="addrow" data-a="vadd" data-v="${c}"><span class="plus">+</span>Add session</button>` : ''}</div>` : ''}</section>`; }).join('') + '</div>';
  if (S.edit) h += `<div style="margin-top:10px"><button class="addcard" data-a="taddcat">+ Add category</button></div>`;
  if (G('hg-aches')) h += `<div style="margin-top:14px">${hGroup('hg-aches', T0)}</div>`;
  // Conditions: the same component as Health › Other › Conditions, same data (M.conds), so entries show in both places
  { const c = condCol(); const open = S.edit || S.open['h:t-conds'] === true; // closed by default on Training (2026-11-06)
    h += `<div style="margin-top:14px"><section class="hsec ${open ? '' : 'shut'}"><button class="hhead" data-a="hopen" data-ref="t-conds" aria-expanded="${open}"><span class="hdot" style="background:${c}" ${S.edit ? 'data-col="cc:fit" role="button" aria-label="Change colour"' : ''}></span><span class="mono" style="flex:1;text-align:left">Conditions</span>${fold(open)}</button>${open ? tabBody('ht-conds', T0, c, { fit: true }) : ''}</section></div>`; }
  return h;
}
// Expeditions: planned, wishlist, done
function renderExpeds() {
  const nx = nextTrip(); const P = trips().filter((t) => t.status === 'planned').sort((a, b) => (a.date || '9').localeCompare(b.date || '9'));
  const W = trips().filter((t) => t.status === 'wish'), Dn = trips().filter((t) => t.status === 'done').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  // no verdict card (2026-11-06): a countdown to the next trip over a month calendar with every trip drawn on it
  // one card: the month calendar with the countdown along its foot (2026-11-06)
  // the usual calendar, then the countdown as its own card (2026-11-06)
  let h = renderCal('x') + `<div style="margin:14px 0 12px">${xCounts()}</div>`;
  if (S.edit) h += lcard(null, 'Kinds', '', TRIPK.map(([k, l]) => `<div class="row"><span class="circ" style="--c:${tripCol(k)};background:${tripCol(k)}" data-col="tk:${k}" role="button" aria-label="Change the ${l.toLowerCase()} colour"></span><span class="lbl">${l}</span></div>`).join(''));
  const row = (t) => `<div class="row"><span class="circ ${t.status === 'done' ? 'done' : ''}" style="--c:${tripCol(t.kind === 'hike' ? 'hike' : 'expedition')}">${t.status === 'done' ? '✓' : ''}</span><button class="lbl" data-a="tripopen" data-ref="${t.id}" style="text-align:left">${esc(t.name)}<span class="sub">${esc(tripWhen(t))}</span></button></div>`;
  // done trips live in the Archive (2026-11-06)
  [['x:planned', 'Planned', P, 'Nothing planned yet.'], ['x:wish', 'Wishlist', W, 'No wishes yet.']].forEach(([k, t, list, e]) => {
    h += lcard(k, t, list.length || '', (list.map(row).join('') || `<p class="empty">${e}</p>`) + addRow('tripnew', k.slice(2), 'Add ' + (k === 'x:wish' ? 'to the wishlist' : 'an expedition or hike'))); });
  return h;
}
// the countdown slides sideways through every planned trip, soonest first, with dots under it (2026-11-06)
function xCounts() { const L = trips().filter((t) => t.status === 'planned' && t.date && t.date >= T0).sort((a, b) => a.date.localeCompare(b.date));
  if (L.length < 2) return xCount(L[0]);
  // the page dots sit inside each card, top left (2026-11-06)
  return `<div class="xslide" data-xs>${L.map((t, i) => `<div class="xsl">${xCount(t, `<span class="xdots" aria-hidden="true">${L.map((_, k) => `<i ${k === i ? 'class="on"' : ''}></i>`).join('')}</span>`)}</div>`).join('')}</div>`; }
function xCount(nx, dots = '') { if (!nx) return `<div class="card xcount"><span class="xl"><span class="mono">Next expedition</span><small>Nothing planned yet</small></span></div>`;
  const n = diff(T0, nx.date); return `<button class="card xcount" data-a="tripopen" data-ref="${nx.id}"><span class="xl">${dots}<span class="mono">${esc(nx.name)}</span><small>${esc(fmtDate(nx.date))}${nx.len ? ' · ' + nx.len + (nx.len === 1 ? ' day' : ' days') : ''}</small></span><span class="xn"><span><b>${n === 0 ? 'Today' : n}</b>${n === 0 ? '' : n === 1 ? ' day to go' : ' days to go'}</span>${n > 0 ? `<small>${xWeeks(n)}</small>` : ''}</span></button>`; }
// weeks left under the days: exact, or > / < whole weeks (2026-11-06)
function xWeeks(n) { const w = Math.floor(n / 7), r = n % 7; if (!w) return '&lt; 1 week'; const u = w === 1 ? ' week' : ' weeks'; return r ? '&gt; ' + w + u : w + u; }
// trips on a date (planned and done; wishes have no date)
const tripsOn = (d) => trips().filter((t) => t.date && t.status !== 'wish' && t.date <= d && d < addDays(t.date, t.len || 1));
// away days (2026-11-06): I won't use the app on an expedition, so calendars can cover those days with one soft band
function awayOf(k, d) { if (!expOn() || !calOn(k, 'away')) return null; return tripsOn(d)[0] || null; }
function awayCls(t, d) { if (!t) return ''; const last = addDays(t.date, (t.len || 1) - 1); return ` away ${t.date === d || wd(d) === 0 ? 'ast' : ''} ${last === d || wd(d) === 6 ? 'aen' : ''}" style="--aw:${tripCol(t.kind === 'hike' ? 'hike' : 'expedition')}`; }
function xCal() { const mo = S.xmonthOf || T0.slice(0, 7); const [y, m] = mo.split('-').map(Number); let w = weekStart(iso(new Date(y, m - 1, 1))); const weeks = [];
  while (w.slice(0, 7) <= mo) { weeks.push(w); w = addDays(w, 7); }
  const cell = (d) => { const on = tripsOn(d); const t = on[0];
    // a wash of colour over the trip's whole dates, like the away band on the other calendars (2026-11-06)
    return `<button class="day fday ${d === T0 ? 'today' : ''} ${d.slice(0, 7) === mo ? '' : 'out'}${awayCls(t, d)}" ${t ? `data-a="tripopen" data-ref="${t.id}"` : 'tabindex="-1"'} aria-label="${fmtDate(d)}${t ? ', ' + esc(t.name) : ''}"><span class="n">${parse(d).getDate()}</span></button>`; };
  return `<div class="stack" style="gap:6px"><div class="calnav"><button data-a="xmonth" data-v="-1" aria-label="Previous month">‹</button><span>${MONTHS[m - 1]} ${y}</span><button data-a="xmonth" data-v="1" aria-label="Next month">›</button></div>
    <div><div class="wk wkh"><span style="text-align:left">W</span>${WD.map((x) => `<span>${x.toUpperCase()}</span>`).join('')}</div>${weeks.map((w) => `<div class="wk wkr"><span class="wkn">${isoWeek(w)}</span>${[0, 1, 2, 3, 4, 5, 6].map((i) => cell(addDays(w, i))).join('')}</div>`).join('')}</div></div>`; }
function tripSheet(s) { const D = s.draft;
  const chip = (act, v, l, on) => `<button class="chip" data-a="${act}" data-v="${v}" aria-pressed="${on}">${l}</button>`;
  return `<div class="fld"><span class="mono">Name</span><input class="inp" id="tname" value="${esc(D.name)}" placeholder="e.g. Sarek traverse" data-autofocus></div>
    <div class="fld"><span class="mono">Kind</span><div class="chips">${chip('tripk', 'expedition', 'Expedition', D.kind !== 'hike')}${chip('tripk', 'hike', 'Hike', D.kind === 'hike')}</div></div>
    <div class="fld"><span class="mono">Where it stands</span><div class="chips">${[['planned', 'Planned'], ['wish', 'Wishlist'], ['done', 'Done']].map(([v, l]) => chip('trips', v, l, D.status === v)).join('')}</div></div>
    <div class="fld"><span class="mono">Starts</span><input class="inp" type="date" id="tdate" value="${esc(D.date || '')}"></div>
    <div class="fld"><span class="mono">Days</span><input class="inp" type="number" min="1" id="tlen" value="${esc(D.len || '')}" inputmode="numeric"></div>
    <div class="fld"><span class="mono">Note</span><input class="inp" id="tnote" value="${esc(D.note || '')}" placeholder="Route, who's coming, what to train for"></div>
    ${s.isNew ? '' : `<button class="btn danger" style="width:100%;margin-top:8px" data-a="tripdel" data-ref="${s.ref}">Delete</button>`}`; }
function tripCapture() { const D = S.sheet.draft; const g = (id) => ($('#' + id) || {}).value; D.name = (g('tname') || '').trim(); D.date = g('tdate') || null; D.len = Number(g('tlen')) || null; D.note = (g('tnote') || '').trim(); }
function trainingAction(act, a, ref, v) {
  switch (act) {
    case 'xmonth': { const [y, m] = (S.xmonthOf || T0.slice(0, 7)).split('-').map(Number); S.xmonthOf = iso(new Date(y, m - 1 + (+v), 1)).slice(0, 7); render(); return true; }
    case 'expmode': { const off = expOn(); change(() => { M.settings.noExp = off; const pg = M.areas.health.pages; if (off) M.areas.health.pages = pg.filter((p) => p !== 'expeds'); else if (!pg.includes('expeds')) pg.splice(Math.max(0, pg.indexOf('training')) + 1, 0, 'expeds'); }); if (off && S.page === 'expeds') { S.page = 'training'; render(); } S.menu = true; renderLayer(); return true; }
    case 'tripnew': openSheet({ kind: 'trip', isNew: true, title: v === 'wish' ? 'New wish' : 'New expedition', draft: { name: '', kind: 'expedition', status: v, date: null, len: null, note: '' } }); return true;
    case 'tripopen': { const t = trips().find((x) => x.id === ref); if (t) openSheet({ kind: 'trip', ref, title: t.name, draft: Object.assign({}, t) }); return true; }
    case 'tripk': tripCapture(); S.sheet.draft.kind = v; renderLayer(); return true;
    case 'trips': tripCapture(); S.sheet.draft.status = v; renderLayer(); return true;
    case 'tripsave': { tripCapture(); const D = S.sheet.draft; if (!D.name) { flash('Name it first'); return true; } const s = S.sheet;
      change(() => { if (s.isNew) trips().push(Object.assign({ id: uid('x') }, D)); else Object.assign(trips().find((x) => x.id === s.ref), D); }, s.isNew ? 'Added ' + D.name : 'Saved'); S.sheet = null; render(); return true; }
    case 'tripdel': { const t = trips().find((x) => x.id === ref); S.sheet = null; change(() => { M.trips = trips().filter((x) => x.id !== ref); }, 'Deleted ' + (t ? t.name : '')); return true; }
    case 'taddcat': vNewGroup('g-train', { name: 'New category', style: 'tcat', holds: 'task', color: '#6FA24A', icon: 'activity' }, 'Added a category'); return true;
  }
  return false;
}

