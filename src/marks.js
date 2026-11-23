// ---------- day dots (Stone, 2026-11-23) ----------
// Every calendar marks a day with one round dot in full colour: large = the day is complete, small = not complete.
// Five colours are set in edit mode > Calendars: normal days, bad days, training, meal plan followed and not followed.
const DOT_COLS = [['plan', 'Normal days', 'var(--ink)'], ['bad', 'Bad days', '#94938E'], ['train', 'Training', '#6B8A66'], ['fed', 'Meal plan followed', '#6B8A66'], ['broke', 'Meal plan not followed', '#A8645A']];
const dotCol = (k) => ((M.settings || {}).dotCols || {})[k] || (DOT_COLS.find((x) => x[0] === k) || DOT_COLS[0])[2];
const DOT_SM = 5, DOT_LG = 14;
const dayDotHtml = (k, big) => `<i class="dd" style="width:${big ? DOT_LG : DOT_SM}px;height:${big ? DOT_LG : DOT_SM}px;background:${dotCol(k)}"></i>`;

// ---------- calendar settings (2026-11-06): one menu in edit mode for every calendar ----------
// Each calendar picks which dots and condition lines it shows.
const CAL_LIST = [['plan', 'Today'], ['sched', 'Schedule'], ['train', 'Training'], ['food', 'Meal plan']];
const CAL_DOTS = [['appts', 'Plans', 'Coming days, in the category colour'], ['dl', 'Study deadlines', 'Coming days'], ['study', 'Studies', 'Days I studied, one dot per subject'], ['home', 'Home', 'Chores, homemaking and cooking done, or one-offs planned'], ['train', 'Training', 'Done, or planned on coming days'], ['extras', 'Meal-plan extras', 'Days with an extra switched on']];
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
  return out.slice(0, 6); } // up to six: rows of three beside the date (2026-11-20)
// dot size, one setting for every calendar (2026-11-20)
const CAL_DOTSZ = [[3, 'Tiny'], [4, 'Small'], [5, 'Normal']];
const calDotSz = () => (M.settings || {}).calDot || 5;
const calDotsHtml = (k, d) => { const c = calDots(k, d); return c.length ? `<span class="cdots n${c.length}" style="--cd:${calDotSz()}px" aria-hidden="true">${c.map((x) => `<i style="background:${x}"></i>`).join('')}</span>` : ''; };
function calsSheet() {
  const col = ([k, l]) => `<button class="tg" data-a="colopen" data-ref="dot:${k}" aria-label="Colour for ${l.toLowerCase()}"><span class="l">${l}</span><i class="dd" style="position:static;transform:none;border-radius:50%;width:${DOT_LG}px;height:${DOT_LG}px;background:${dotCol(k)}"></i></button>`;
  const row = (k, f, l, sub) => `<div class="tg"><span class="l">${l}<small>${sub}</small></span><button class="swt" role="switch" aria-checked="${calOn(k, f)}" data-a="caltog" data-ref="${k}" data-v="${f}" aria-label="${l} on ${k}"></button></div>`;
  return `<div class="fld calset"><span class="mono">Day dots</span>${DOT_COLS.map(col).join('')}</div><div class="fld calset"><span class="mono">Dot size</span><div class="chips">${CAL_DOTSZ.map(([v, l]) => `<button class="chip" data-a="caldot" data-v="${v}" aria-pressed="${calDotSz() === v}">${l}</button>`).join('')}</div></div>` + CAL_LIST.map(([k, name]) => {
    return `<div class="fld calset"><span class="mono">${name}</span>
      <span class="calsub">Dots</span>${CAL_DOTS.map(([f, l, s]) => row(k, f, l, s)).join('')}
      ${expOn() ? `<span class="calsub">Expeditions</span>${row(k, 'away', 'Away days', 'Covers the days I am away')}${k === 'train' ? row(k, 'count', 'Countdown', 'Days to the next expedition, under the calendar') : ''}` : ''}
      <span class="calsub">Condition lines</span>${condTags().map((t) => `<div class="tg"><span class="l"><i class="ctl" style="background:${t.color}"></i>${esc(t.name)}</span><button class="swt" role="switch" aria-checked="${ctOn(k, t.id)}" data-a="caltog" data-ref="${k}" data-v="ct:${t.id}" aria-label="${esc(t.name)} lines on ${name}"></button></div>`).join('')}
      <div class="tg"><span class="l"><i class="ctl" style="background:${CT_NONE}"></i>No tag</span><button class="swt" role="switch" aria-checked="${ctOn(k, 'none')}" data-a="caltog" data-ref="${k}" data-v="ct:none" aria-label="Untagged lines on ${name}"></button></div></div>`; }).join('') + ctagRows();
}
const calEdit = () => S.edit ? `<div class="starcolw"><button class="starcol" data-a="calsopen" aria-label="Calendar settings">${icon('calendar-cog', 16)}<span>Calendars</span></button></div>` : '';
function calAction(act, a, ref, v) {
  switch (act) {
    case 'calsopen': openSheet({ kind: 'cals', title: 'Calendars' }); return true;
    case 'caldot': change(() => { M.settings.calDot = +v; }); return true;
    case 'caltog': { const now = v.startsWith('ct:') ? ctOn(ref, v.slice(3)) : calOn(ref, v); change(() => { M.settings.calShow = M.settings.calShow || {}; M.settings.calShow[ref] = Object.assign({}, M.settings.calShow[ref], { [v]: !now }); }); return true; }
  }
  return false;
}
