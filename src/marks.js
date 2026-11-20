// ---------- completed-day marks (2026-11-05) ----------
// Every calendar marks a day with a stamp. Each kind of day (plan = Today + Schedule, train, food, bad, unfinished...)
// picks its own shape, look (filled, outline, soft) and size; the colour is settings.starCols[kind].
const MK_ROUND = 'stroke-linejoin="round" stroke-linecap="round"';
// 2026-11-20: the owner picked these ten stamps from every shape and sketch; each is drawn in one colour.
// Flower centres are cut out with a shared mask (#mkhole-*, in page.html) so they stay one colour.
const mkRot = (n, step, el) => Array.from({ length: n }, (_, i) => el.replace('ROT', `rotate(${i * step} 12 12)`)).join('');
const mkHole = (id, body) => `<g mask="url(#mkhole-${id})">${body}</g>`;
const MK_SHAPES = [
  ['star', 'Star', '<path d="M12 4.2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z"/>', 3.2],
  ['circle', 'Circle', '<circle cx="12" cy="12" r="8.6"/>', 0],
  ['cloud', 'Cloud', '<path d="M7.2 18.6h9.9a4.1 4.1 0 0 0 .4-8.2 5.6 5.6 0 0 0-10.7-.7 4.5 4.5 0 0 0 .4 8.9z"/>', 1.2],
  ['flower', 'Flower', mkHole('a', mkRot(5, 72, '<circle cx="12" cy="6.9" r="4.2" transform="ROT"/>')), 0],
  ['petals4', 'Four petals', mkHole('b', mkRot(4, 90, '<circle cx="12" cy="7" r="4.4" transform="ROT"/>')), 0],
  ['petals5', 'Oval petals', mkHole('c', mkRot(5, 72, '<ellipse cx="12" cy="6.4" rx="3.6" ry="4.6" transform="ROT"/>')), 0],
  ['wisps', 'Wisps', '<rect x="5" y="7.6" width="11" height="3.2" rx="1.6"/><rect x="8" y="12" width="12" height="3.2" rx="1.6"/><rect x="4" y="16.4" width="10" height="3.2" rx="1.6"/>', 0],
  ['pine', 'Pine', '<path d="M12 2.6l4.6 6.2h-2.4l4 5.4h-2.6l3.8 5H4.6l3.8-5H5.8l4-5.4H7.4z"/><rect x="11" y="18.6" width="2" height="3" rx=".6"/>', 1.2],
  ['mountain', 'Mountains', '<path d="M2.6 19.4l6.6-11.6 3.6 6.2 2.4-3.8 6.2 9.2z"/>', 1.4],
  ['sprout', 'Sprout', '<path d="M12 12.4C11.6 8.2 8.6 5.6 4.2 5.8c.2 4.4 3.4 7 7.8 6.6zM12 11c.4-4 3.4-6.6 7.8-6.4-.2 4.2-3.4 6.8-7.8 6.4z"/><rect x="11.1" y="10.6" width="1.8" height="10.4" rx=".9"/>', 0.6],
];
const MK_SIZES = [['s', 'Small', 20], ['m', 'Medium', 24], ['l', 'Large', 28]];
const MK_LOOKS = [['fill', 'Filled'], ['soft', 'Soft'], ['line', 'Outline']];
const MK_CALS = { plan: 'Today and Schedule', bad: 'Bad days', train: 'Training', food: 'Meal plan and diary' };
const MK_DEF = { plan: { shape: 'star', size: 'l', look: 'fill' }, bad: { shape: 'cloud', size: 'l', look: 'fill' }, food: { shape: 'star', size: 'l', look: 'fill' }, train: { shape: 'flower', size: 'm', look: 'fill' }, over: { shape: 'circle', size: 'l', look: 'fill' }, broke: { shape: 'circle', size: 'l', look: 'soft' }, part: { shape: 'star', size: 'l', look: 'line' }, bpart: { shape: 'cloud', size: 'l', look: 'line' }, bempty: { shape: 'circle', size: 's', look: 'soft' } }; // part, bpart, bempty: unfinished day, unfinished bad day, bad day with nothing in it (2026-11-20)
const MK_MORE = { part: 'Unfinished days', bpart: 'Unfinished bad days', bempty: 'Bad days with nothing in them' }; // broke: a broken food diary day (2026-11-11) // over: overeating days on the food calendar, coloured by level (2026-11-10)
const markOf = (k) => { const d = MK_DEF[k] || MK_DEF.plan; const m = Object.assign({}, d, ((M.settings || {}).marks || {})[k]); if (!MK_SHAPES.some((x) => x[0] === m.shape)) m.shape = d.shape; return m; }; // a shape that was left out falls back to the default
// draw a mark: sz overrides the chosen size (small icons); shape/look can be forced for the picker tiles
function markSvg(k, sz, cls = '', o = {}) {
  const m = Object.assign(markOf(k), o); const sh = MK_SHAPES.find((x) => x[0] === m.shape) || MK_SHAPES[0]; const col = o.col || (k === 'over' ? overCol(3) : starCol(k));
  const px = sz || (MK_SIZES.find((x) => x[0] === m.size) || MK_SIZES[2])[2];
  const paint = m.look === 'line' ? `fill="none" stroke="${col}" stroke-width="1.6" ${MK_ROUND}`
    : m.look === 'soft' ? `fill="${col}" fill-opacity=".45" stroke="${col}" stroke-width="1.3" ${MK_ROUND}`
    : sh[3] ? `fill="${col}" stroke="${col}" stroke-width="${sh[3]}" ${MK_ROUND}` : `fill="${col}"`;
  return `<svg class="${cls}" width="${px}" height="${px}" viewBox="0 0 24 24" aria-hidden="true"><g ${paint}>${sh[2]}</g></svg>`;
}
const setMark = (k, part) => change(() => { M.settings.marks = M.settings.marks || {}; M.settings.marks[k] = Object.assign(markOf(k), part); });
function markSheet(s) { const k = s.ref; const m = markOf(k);
  const chip = (act, v, l, on) => `<button class="chip" data-a="${act}" data-ref="${k}" data-v="${v}" aria-pressed="${on}">${l}</button>`;
  return `<div class="mkprev">${['out', '', 'today'].map((c, i) => `<span class="day fday ${c}"><span class="n">${[11, 12, 13][i]}</span>${markSvg(k, null, 'star')}</span>`).join('')}</div>
    <div class="fld"><span class="mono">Shape</span><div class="mkgrid">${MK_SHAPES.map(([v, l]) => `<button class="mktile" data-a="mkshape" data-ref="${k}" data-v="${v}" aria-pressed="${m.shape === v}" aria-label="${l}">${markSvg(k, 30, '', { shape: v })}<small>${l}</small></button>`).join('')}</div></div>
    <div class="fld"><span class="mono">Look</span><div class="chips">${MK_LOOKS.map(([v, l]) => chip('mklook', v, l, m.look === v)).join('')}</div></div>
    <div class="fld"><span class="mono">Size</span><div class="chips">${MK_SIZES.map(([v, l]) => chip('mksize', v, l, m.size === v)).join('')}</div></div>
    ${k === 'over' ? '' : `<div class="fld"><span class="mono">Colour</span>${colorField('star:' + k, starCol(k))}</div>
    ${k === 'broke' || MK_MORE[k] ? '' : `<button class="btn soft" style="width:100%;margin-top:6px" data-a="mkall" data-ref="${k}">Use this mark on every calendar</button>`}`}`; }
const markEdit = (k) => S.edit ? `<div class="starcolw"><button class="starcol" data-a="mkopen" data-ref="${k}" aria-label="Change how completed days look">${markSvg(k, 20)}<span>Completed day mark</span></button></div>` : '';
function markAction(act, a, ref, v) {
  switch (act) {
    case 'mkopen': { const back = S.sheet && S.sheet.kind === 'cals' ? S.sheet : null; openSheet({ kind: 'mark', ref, title: ref === 'over' ? 'Overeating days' : ref === 'broke' ? 'Broken food days' : MK_MORE[ref] ? MK_MORE[ref] : 'Completed days · ' + MK_CALS[ref] }); if (back && S.sheet) { S.sheet.back = back; } return true; }
    case 'mkshape': setMark(ref, { shape: v }); return true;
    case 'mklook': setMark(ref, { look: v }); return true;
    case 'mksize': setMark(ref, { size: v }); return true;
    case 'mkall': { const m = markOf(ref), c = starCol(ref); change(() => { M.settings.marks = M.settings.marks || {}; M.settings.starCols = M.settings.starCols || {};
      Object.keys(MK_CALS).forEach((x) => { M.settings.marks[x] = Object.assign({}, m); M.settings.starCols[x] = c; }); }, 'Every calendar uses this mark'); return true; }
  }
  return false;
}

// ---------- calendar settings (2026-11-06): one menu in edit mode for every calendar ----------
// Each calendar picks which dots and condition lines it shows. Schedule uses Today's completed-day mark.
const CAL_LIST = [['plan', 'Today'], ['sched', 'Schedule'], ['train', 'Training'], ['food', 'Meal plan']];
const CAL_DOTS = [['appts', 'Appointments', 'Coming days, in the category colour'], ['dl', 'Study deadlines', 'Coming days'], ['study', 'Studies', 'Days I studied, one dot per subject'], ['home', 'Home', 'Chores, homemaking and cooking done, or one-offs planned'], ['train', 'Training', 'Done, or planned on coming days'], ['extras', 'Meal-plan extras', 'Days with an extra switched on']];
const CAL_DEF = { plan: { appts: 1, dl: 1, gen: 1, fit: 1, away: 1 }, sched: { appts: 1, dl: 1, away: 1 }, train: { train: 1, fit: 1, away: 1 }, food: { extras: 1, away: 1 } };
const calOn = (k, f) => { const o = ((M.settings || {}).calShow || {})[k] || {}; return f in o ? !!o[f] : !!(CAL_DEF[k] || {})[f]; };
function calDots(k, d) { const out = [];
  if (calOn(k, 'appts') && d > T0) [...new Set(apptsOn(d).map((id) => catOf(id)))].forEach((c) => G(c) && out.push(G(c).color));
  if (calOn(k, 'dl') && d >= T0 && typeof deadlinesOn === 'function') deadlinesOn(d).forEach((x) => out.push(x.color));
  if (calOn(k, 'study') && d <= T0) subjIds().forEach((sj) => { const ks = new Set(sgroupsOf(sj).flatMap(kidsOf)); if (((M.study || {})[d] || []).some((e) => ks.has(e.id)) || [...ks].some((x) => isDone(x, d))) out.push(G(sj).color || M.areas.study.color); });
  if (calOn(k, 'home')) { const hc = (M.areas.home || {}).color || '#EDBB3A'; const sec = [[roomIds().flatMap(kidsOf).concat(kidsOf('g-oneoff')), hc], [kidsOf('g-tend'), (G('g-tend') || {}).color || hc], [kidsOf('g-prep'), (G('g-prep') || {}).color || hc]];
    sec.forEach(([ks, col]) => { if (d <= T0 ? ks.some((x) => isDone(x, d)) : ks.some((x) => ((I(x) || {}).when || {}).mode === 'once' && I(x).when.date === d && !everDone(x))) out.push(col); }); }
  if (calOn(k, 'train')) trainDots(d).forEach((g) => out.push(g.color));
  if (calOn(k, 'extras')) dayExtras(d).forEach((x) => out.push(xcol(x)));
  return out.slice(0, 4); }
const calDotsHtml = (k, d) => { const c = calDots(k, d); return c.length ? `<span class="cdots" aria-hidden="true">${c.map((x) => `<i style="background:${x}"></i>`).join('')}</span>` : ''; };
function calsSheet() {
  const row = (k, f, l, sub) => `<div class="tg"><span class="l">${l}<small>${sub}</small></span><button class="swt" role="switch" aria-checked="${calOn(k, f)}" data-a="caltog" data-ref="${k}" data-v="${f}" aria-label="${l} on ${k}"></button></div>`;
  return CAL_LIST.map(([k, name]) => { const mk = k === 'sched' ? 'plan' : k;
    return `<div class="fld calset"><span class="mono">${name}</span>
      <button class="tg calmk" data-a="mkopen" data-ref="${mk}"><span class="l">Completed days<small>${k === 'sched' ? 'The same mark as Today' : 'Shape, look, size and colour'}</small></span>${markSvg(mk, 26)}<span class="chev" aria-hidden="true">›</span></button>
      ${k === 'plan' ? [['part', 'Unfinished days', 'Days I did some but not all of'], ['bad', 'Bad days', 'All done on a bad day'], ['bpart', 'Unfinished bad days', 'Not all done on a bad day'], ['bempty', 'Empty bad days', 'Bad days with nothing in them']].map(([r, l, sub]) => `<button class="tg calmk" data-a="mkopen" data-ref="${r}"><span class="l">${l}<small>${sub}</small></span>${markSvg(r, 26)}<span class="chev" aria-hidden="true">›</span></button>`).join('') : ''}
      ${k === 'food' ? `<button class="tg calmk" data-a="mkopen" data-ref="over"><span class="l">Overeating days<small>Shape, look and size. Its colour follows the level</small></span>${markSvg('over', 26)}<span class="chev" aria-hidden="true">›</span></button>` : ''}
      <span class="calsub">Dots</span>${CAL_DOTS.map(([f, l, s]) => row(k, f, l, s)).join('')}
      ${expOn() ? `<span class="calsub">Expeditions</span>${row(k, 'away', 'Away days', 'Covers the days I am away')}${k === 'train' ? row(k, 'count', 'Countdown', 'Days to the next expedition, under the calendar') : ''}` : ''}
      <span class="calsub">Condition lines</span>${condTags().map((t) => `<div class="tg"><span class="l"><i class="ctl" style="background:${t.color}"></i>${esc(t.name)}</span><button class="swt" role="switch" aria-checked="${ctOn(k, t.id)}" data-a="caltog" data-ref="${k}" data-v="ct:${t.id}" aria-label="${esc(t.name)} lines on ${name}"></button></div>`).join('')}
      <div class="tg"><span class="l"><i class="ctl" style="background:${CT_NONE}"></i>No tag</span><button class="swt" role="switch" aria-checked="${ctOn(k, 'none')}" data-a="caltog" data-ref="${k}" data-v="ct:none" aria-label="Untagged lines on ${name}"></button></div></div>`; }).join('') + ctagRows();
}
const calEdit = () => S.edit ? `<div class="starcolw"><button class="starcol" data-a="calsopen" aria-label="Calendar settings">${icon('calendar-cog', 16)}<span>Calendars</span></button></div>` : '';
function calAction(act, a, ref, v) {
  switch (act) {
    case 'calsopen': openSheet({ kind: 'cals', title: 'Calendars' }); return true;
    case 'caltog': { const now = v.startsWith('ct:') ? ctOn(ref, v.slice(3)) : calOn(ref, v); change(() => { M.settings.calShow = M.settings.calShow || {}; M.settings.calShow[ref] = Object.assign({}, M.settings.calShow[ref], { [v]: !now }); }); return true; }
  }
  return false;
}
