// ---------- completed-day marks (2026-11-05) ----------
// Every calendar marks a completed day with a shape. Each calendar kind (plan = Today + Schedule, train, food)
// picks its own shape, look (filled, outline, soft) and size; the colour is settings.starCols[kind].
const MK_ROUND = 'stroke-linejoin="round" stroke-linecap="round"';
const MK_SHAPES = [
  ['star', 'Star', '<path d="M12 4.2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z"/>', 3.2],
  ['flower', 'Flower', [0, 72, 144, 216, 288].map((a) => `<ellipse cx="12" cy="6.3" rx="2.9" ry="5" transform="rotate(${a} 12 12)"/>`).join(''), 0],
  ['blossom', 'Blossom', [0, 90, 180, 270].map((a) => `<circle cx="12" cy="7.2" r="4.3" transform="rotate(${a} 12 12)"/>`).join(''), 0],
  ['heart', 'Heart', '<path d="M12 20.3s-7.8-4.7-7.8-10.3A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.8 2.4c0 5.6-7.8 10.3-7.8 10.3z"/>', 1.4],
  ['circle', 'Circle', '<circle cx="12" cy="12" r="8.6"/>', 0],
  ['sparkle', 'Sparkle', '<path d="M12 2.6C12.9 8.4 15.6 11.1 21.4 12 15.6 12.9 12.9 15.6 12 21.4 11.1 15.6 8.4 12.9 2.6 12 8.4 11.1 11.1 8.4 12 2.6z"/>', 0.8],
  ['sun', 'Sun', '<circle cx="12" cy="12" r="5.6"/>' + [0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<rect x="11.1" y="1.4" width="1.8" height="3.6" rx=".9" transform="rotate(${a} 12 12)"/>`).join(''), 0],
  ['leaf', 'Leaf', '<path d="M4.8 19.2C4.8 10.4 10.2 4.8 19.2 4.8c0 9-5.6 14.4-14.4 14.4z"/>', 1.2],
  ['moon', 'Moon', '<path d="M15.6 3.6a8.6 8.6 0 1 0 4.9 15.3A7.2 7.2 0 0 1 15.6 3.6z"/>', 1.2],
  ['drop', 'Drop', '<path d="M12 2.8s6.6 7.3 6.6 11.7a6.6 6.6 0 0 1-13.2 0C5.4 10.1 12 2.8 12 2.8z"/>', 1],
  ['cloud', 'Cloud', '<path d="M7.2 18.6h9.9a4.1 4.1 0 0 0 .4-8.2 5.6 5.6 0 0 0-10.7-.7 4.5 4.5 0 0 0 .4 8.9z"/>', 1.2],
];
// new shapes (2026-11-09: "draw up more calendar marks"); which ones show in the picker is my choice (settings.mkKeep)
const MK_NEW = [
  ['diamond', 'Diamond', '<path d="M12 3.2l7.6 8.8-7.6 8.8-7.6-8.8z"/>', 1.6],
  ['hexagon', 'Hexagon', '<path d="M12 3.4l7.5 4.3v8.6L12 20.6l-7.5-4.3V7.7z"/>', 1.6],
  ['clover', 'Clover', '<circle cx="12" cy="7.6" r="3.9"/><circle cx="7.7" cy="13.3" r="3.9"/><circle cx="16.3" cy="13.3" r="3.9"/><rect x="11.2" y="13" width="1.6" height="8.2" rx=".8"/>', 0],
  ['tulip', 'Tulip', '<path d="M6.6 5.4l2.9 2.4L12 4.2l2.5 3.6 2.9-2.4v5.4a5.4 5.4 0 0 1-10.8 0z"/><rect x="11.2" y="14" width="1.6" height="7.2" rx=".8"/><path d="M12 20.4c-.6-2.4-2.6-4-5-4.2.5 2.5 2.5 4.2 5 4.2zM12 20.4c.6-2.4 2.6-4 5-4.2-.5 2.5-2.5 4.2-5 4.2z"/>', 0.6],
  ['daisy', 'Daisy', [0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<ellipse cx="12" cy="5.6" rx="1.9" ry="4" transform="rotate(${a} 12 12)"/>`).join('') + '<circle cx="12" cy="12" r="3"/>', 0],
  ['mushroom', 'Mushroom', '<path d="M3.6 12.2C3.6 7.3 7.4 4 12 4s8.4 3.3 8.4 8.2z"/><path d="M9.4 13.4h5.2l.7 5.6a1.8 1.8 0 0 1-1.8 2h-3a1.8 1.8 0 0 1-1.8-2z"/>', 1],
  ['shell', 'Shell', '<path d="M12 20.4L4.2 9.6C5.6 6 8.6 3.8 12 3.8s6.4 2.2 7.8 5.8z"/><path d="M12 19V5.4M12 19L8 6.4M12 19l4-12.6M12 19L5.6 9M12 19l6.4-10" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".9"/>', 1.6],
  ['snowflake', 'Snowflake', [0, 60, 120].map((a) => `<rect x="11.1" y="2.6" width="1.8" height="18.8" rx=".9" transform="rotate(${a} 12 12)"/>`).join('') + [0, 60, 120, 180, 240, 300].map((a) => `<path d="M9.6 4.6L12 7l2.4-2.4" fill="none" stroke-width="1.7" transform="rotate(${a} 12 12)"/>`).join(''), 0.4],
  ['crown', 'Crown', '<path d="M4 17.6L3.4 7.8l4.7 3.8L12 5l3.9 6.6 4.7-3.8-.6 9.8z"/><rect x="4" y="18.6" width="16" height="2" rx="1"/>', 1.2],
  ['bolt', 'Bolt', '<path d="M13.4 2.8L5.6 13.4h5.6l-1.2 7.8 8-10.8h-5.6z"/>', 1.2],
  ['butterfly', 'Butterfly', '<ellipse cx="7.6" cy="8.6" rx="4.4" ry="4.6" transform="rotate(-20 7.6 8.6)"/><ellipse cx="16.4" cy="8.6" rx="4.4" ry="4.6" transform="rotate(20 16.4 8.6)"/><ellipse cx="8.4" cy="15.6" rx="3" ry="3.4" transform="rotate(25 8.4 15.6)"/><ellipse cx="15.6" cy="15.6" rx="3" ry="3.4" transform="rotate(-25 15.6 15.6)"/>', 0],
  ['paw', 'Paw', '<ellipse cx="12" cy="16" rx="4.6" ry="3.9"/><ellipse cx="6" cy="10.6" rx="1.9" ry="2.4"/><ellipse cx="9.6" cy="6.6" rx="2" ry="2.6"/><ellipse cx="14.4" cy="6.6" rx="2" ry="2.6"/><ellipse cx="18" cy="10.6" rx="1.9" ry="2.4"/>', 0],
  ['cherry', 'Cherries', '<circle cx="7.4" cy="16.4" r="4"/><circle cx="16.6" cy="16.4" r="4"/><path d="M7.4 12.6C8.4 8.6 10.6 5.6 14.2 3.6M16.6 12.6c-.4-3.4-1-6.6-2.4-9" fill="none" stroke-width="1.6"/>', 0.4],
  ['pebble', 'Pebble', '<path d="M5 13.4c-.6-4.6 2.6-8.4 7.4-8.6 4.6-.2 7.4 2.6 7 7.2-.4 4.6-3.6 7.4-7.6 7.4S5.4 17.6 5 13.4z"/>', 0],
  ['acorn', 'Acorn', '<path d="M4.6 10.2C4.6 7 7.8 4.8 12 4.8s7.4 2.2 7.4 5.4z"/><path d="M6.2 11.4h11.6c0 5.2-2.6 9-5.8 9.6-3.2-.6-5.8-4.4-5.8-9.6z"/><rect x="11.2" y="2.2" width="1.6" height="3.2" rx=".8"/>', 0.6],
  ['bow', 'Bow', '<path d="M12 12L4.2 6.8c-1 1.8-1 8.6 0 10.4zM12 12l7.8-5.2c1 1.8 1 8.6 0 10.4z"/><circle cx="12" cy="12" r="2.4"/>', 1.4],
];
MK_SHAPES.push(...MK_NEW);
// nature shapes (2026-11-09: "more nature themed ones")
const MK_NAT = [
  ['tree', 'Tree', '<circle cx="12" cy="9.4" r="6.6"/><rect x="11" y="13" width="2" height="8.4" rx="1"/>', 0.4],
  ['pine', 'Pine', '<path d="M12 2.6l4.6 6.2h-2.4l4 5.4h-2.6l3.8 5H4.6l3.8-5H5.8l4-5.4H7.4z"/><rect x="11" y="18.6" width="2" height="3" rx=".6"/>', 1.2],
  ['mountain', 'Mountains', '<path d="M2.6 19.4l6.6-11.6 3.6 6.2 2.4-3.8 6.2 9.2z"/>', 1.4],
  ['wave', 'Wave', '<path d="M3 15.6c2.2 0 2.6-2.4 4.6-2.4s2.4 2.4 4.4 2.4 2.4-2.4 4.4-2.4 2.4 2.4 4.6 2.4v4.4H3z"/><path d="M3 10.4c2.2 0 2.6-2.4 4.6-2.4s2.4 2.4 4.4 2.4 2.4-2.4 4.4-2.4 2.4 2.4 4.6 2.4" fill="none" stroke-width="1.8"/>', 0.4],
  ['feather', 'Feather', '<path d="M19.6 4.4C12.6 4 6.8 8.8 6.6 16.4l2.6.2C14.4 14.8 18.6 10.8 19.6 4.4z"/><path d="M19 5L4.6 19.6" fill="none" stroke-width="1.4"/>', 0.4],
  ['sprout', 'Sprout', '<path d="M12 12.4C11.6 8.2 8.6 5.6 4.2 5.8c.2 4.4 3.4 7 7.8 6.6zM12 11c.4-4 3.4-6.6 7.8-6.4-.2 4.2-3.4 6.8-7.8 6.4z"/><rect x="11.1" y="10.6" width="1.8" height="10.4" rx=".9"/>', 0.6],
  ['maple', 'Maple leaf', '<path d="M12 2.8l1.6 3.6 2.2-1-.6 4.4 3-2.2-.4 2.6 3 .6-2.4 2.6 1.2 1.4-4.6.6.6 2.2-3.6-1.2-.2 4.8h-1.6l-.2-4.8-3.6 1.2.6-2.2-4.6-.6 1.2-1.4L1.8 10.8l3-.6-.4-2.6 3 2.2-.6-4.4 2.2 1z"/>', 0.8],
  ['ginkgo', 'Ginkgo', '<path d="M12 15.6L4 6.6c2.2-2.4 5-3.4 8-3.4s5.8 1 8 3.4l-8 9z"/><path d="M12 15.2v6.2" fill="none" stroke-width="1.8"/>', 1.2],
  ['fern', 'Fern', '<path d="M12 21.4V3.4" fill="none" stroke-width="1.6"/>' + [17.6, 14, 10.4, 6.8, 4].map((y, i) => { const w = [8, 7.4, 6.2, 4.6, 2.6][i]; return `<ellipse cx="${12 - w / 2}" cy="${y}" rx="${w / 2}" ry="1.2" transform="rotate(32 12 ${y})"/><ellipse cx="${12 + w / 2}" cy="${y}" rx="${w / 2}" ry="1.2" transform="rotate(-32 12 ${y})"/>`; }).join(''), 0.4],
  ['rose', 'Rose', '<circle cx="12" cy="10.4" r="6.6"/><path d="M12 6.2a4.2 4.2 0 1 0 4 5.4M12 8.4a2.2 2.2 0 1 0 2 2.8" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.2"/><path d="M12 17v4.4M12 19.6c1.4-1.4 3-1.8 4.4-1.6" fill="none" stroke-width="1.6"/>', 0.4],
  ['bird', 'Bird', '<path d="M3.6 12.4c2.8.2 4.8-1 6.2-3.4 1.2-2 3-3 5-2.6l1.4-1.4 1 2.4 3.4.8-3.2 1.4c-.2 5.4-4 8.8-9.4 8.6-1.8 0-3.4-.6-4.4-1.6 1.6-.2 2.8-.8 3.4-1.8-1.6.2-2.8-.6-3.4-2.4z"/>', 0.8],
  ['fish', 'Fish', '<path d="M2.8 12c2.6-4 6-6 9.8-6s6.4 2.4 7.6 6c-1.2 3.6-3.8 6-7.6 6S5.4 16 2.8 12z"/><path d="M19.4 12l2.4-3.6v7.2z"/>', 1.2],
  ['snail', 'Snail', '<circle cx="13.4" cy="11" r="6"/><path d="M13.4 8.2a2.8 2.8 0 1 1-2.6 3.8" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.3"/><path d="M2.6 18.6h16.6c1.4 0 2.4-.8 2.4-2.2v-.6H5.4c-1.6 0-2.6 1.2-2.8 2.8zM4.4 15.8L3 11.6M5.8 15.6l.4-4" fill="none" stroke-width="1.4"/>', 0.6],
  ['strawberry', 'Strawberry', '<path d="M12 21.4c-4.4-1.6-7.6-6.4-7.4-10 .2-2.4 2.2-3.4 4.2-2.8 1.2.4 2.2.4 3.2.4s2-.2 3.2-.6c2-.6 4 .4 4.2 2.8.2 3.6-3 8.6-7.4 10.2z"/><path d="M8.2 6.4c1.2.2 2.4.4 3.8-1.6 1.4 2 2.6 1.8 3.8 1.6M12 4.8V2.6" fill="none" stroke-width="1.6"/>', 0.6],
  ['apple', 'Apple', '<path d="M12 7.8c-1.4-1-4.4-1.6-6.4.6-2.2 2.6-1.2 7.6 1.4 10.4 1.4 1.6 3 2.2 5 1.4 2 .8 3.6.2 5-1.4 2.6-2.8 3.6-7.8 1.4-10.4-2-2.2-5-1.6-6.4-.6z"/><path d="M12 7.6c0-2 .6-3.6 2-4.6" fill="none" stroke-width="1.6"/><path d="M12.8 5.4c.4-1.8 2-2.8 3.8-2.6-.4 1.8-2 2.8-3.8 2.6z"/>', 0.4],
  ['cactus', 'Cactus', '<rect x="9.4" y="3" width="5.2" height="18.4" rx="2.6"/><path d="M9.6 14.2H7a2.4 2.4 0 0 1-2.4-2.4V8.6a1.3 1.3 0 0 1 2.6 0v3h2.4zM14.4 11.8H17a2.4 2.4 0 0 0 2.4-2.4V6.8a1.3 1.3 0 0 0-2.6 0v2.4h-2.4z"/>', 0.4],
  ['rainbow', 'Rainbow', '<path d="M2.6 17.6a9.4 9.4 0 0 1 18.8 0h-2.6a6.8 6.8 0 0 0-13.6 0z"/><path d="M7.4 17.6a4.6 4.6 0 0 1 9.2 0h-2.4a2.2 2.2 0 0 0-4.4 0z"/>', 0.6],
  ['pinecone', 'Pinecone', '<ellipse cx="12" cy="13.2" rx="5.2" ry="7.6"/><path d="M7.4 10.4l4.6 3 4.6-3M7 14.6l5 3.2 5-3.2M8.4 7l3.6 2.6L15.6 7" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.1"/><rect x="11.2" y="2.4" width="1.6" height="3.4" rx=".8"/>', 0.4],
];
MK_SHAPES.push(...MK_NAT);
const MK_OLD = ['star', 'flower', 'blossom', 'heart', 'circle', 'sparkle', 'sun', 'leaf', 'moon', 'drop', 'cloud'];
const mkKept = () => ((M.settings || {}).mkKeep || MK_OLD);
const MK_SIZES = [['s', 'Small', 32], ['m', 'Medium', 38], ['l', 'Large', 44]];
const MK_LOOKS = [['fill', 'Filled'], ['soft', 'Soft'], ['line', 'Outline']];
const MK_CALS = { plan: 'Today and Schedule', bad: 'Bad days', train: 'Training', food: 'Meal plan and diary' };
const MK_DEF = { plan: { shape: 'star', size: 'l', look: 'fill' }, bad: { shape: 'cloud', size: 'l', look: 'fill' }, food: { shape: 'star', size: 'l', look: 'fill' }, train: { shape: 'flower', size: 'm', look: 'fill' }, over: { shape: 'circle', size: 'l', look: 'fill' }, broke: { shape: 'circle', size: 'l', look: 'soft' } }; // broke: a broken food diary day (2026-11-11) // over: overeating days on the food calendar, coloured by level (2026-11-10)
const markOf = (k) => Object.assign({}, MK_DEF[k] || MK_DEF.plan, ((M.settings || {}).marks || {})[k]);
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
  return `<div class="mkprev">${['out', '', 'today'].map((c, i) => `<span class="day ${c}"><span class="n">${markSvg(k, null, 'star')}${[11, 12, 13][i]}</span></span>`).join('')}</div>
    <div class="fld"><span class="mono">Shape</span><div class="mkgrid">${MK_SHAPES.filter(([v]) => mkKept().includes(v) || m.shape === v).map(([v, l]) => `<button class="mktile" data-a="mkshape" data-ref="${k}" data-v="${v}" aria-pressed="${m.shape === v}" aria-label="${l}">${markSvg(k, 30, '', { shape: v })}<small>${l}</small></button>`).join('')}<button class="mktile mkmore" data-a="mkpickopen" data-ref="${k}" aria-label="Choose which shapes I keep">${icon('shapes', 24)}<small>All shapes</small></button></div></div>
    <div class="fld"><span class="mono">Look</span><div class="chips">${MK_LOOKS.map(([v, l]) => chip('mklook', v, l, m.look === v)).join('')}</div></div>
    <div class="fld"><span class="mono">Size</span><div class="chips">${MK_SIZES.map(([v, l]) => chip('mksize', v, l, m.size === v)).join('')}</div></div>
    ${k === 'over' ? '' : `<div class="fld"><span class="mono">Colour</span>${colorField('star:' + k, starCol(k))}</div>
    ${k === 'broke' ? '' : `<button class="btn soft" style="width:100%;margin-top:6px" data-a="mkall" data-ref="${k}">Use this mark on every calendar</button>`}`}`; }
// every shape, old and new: tap to keep it in the picker or leave it out (2026-11-09)
function mkPickSheet(s) { const k = s.ref; const K = mkKept(); const tile = ([v, l]) => `<button class="mktile mkkeep" data-a="mkkeep" data-v="${v}" aria-pressed="${K.includes(v)}" aria-label="${l}">${markSvg(k, 30, '', { shape: v })}<small>${l}</small></button>`;
  return `<p class="note" style="margin-top:0">${K.length} kept. Tap a shape to keep it or leave it out.</p><div class="fld"><span class="mono">The ones I had</span><div class="mkgrid">${MK_SHAPES.filter(([v]) => MK_OLD.includes(v)).map(tile).join('')}</div></div>
    <div class="fld"><span class="mono">New</span><div class="mkgrid">${MK_NEW.map(tile).join('')}</div></div>
    <div class="fld"><span class="mono">Nature</span><div class="mkgrid">${MK_NAT.map(tile).join('')}</div></div>`; }
const markEdit = (k) => S.edit ? `<div class="starcolw"><button class="starcol" data-a="mkopen" data-ref="${k}" aria-label="Change how completed days look">${markSvg(k, 20)}<span>Completed day mark</span></button></div>` : '';
function markAction(act, a, ref, v) {
  switch (act) {
    case 'mkopen': { const back = S.sheet && S.sheet.kind === 'cals' ? S.sheet : null; openSheet({ kind: 'mark', ref, title: ref === 'over' ? 'Overeating days' : ref === 'broke' ? 'Broken food days' : 'Completed days · ' + MK_CALS[ref] }); if (back && S.sheet) { S.sheet.back = back; } return true; }
    case 'mkshape': setMark(ref, { shape: v }); return true;
    case 'mkpickopen': openSheet({ kind: 'mkpick', ref, title: 'Which shapes I keep', back: S.sheet }); return true;
    case 'mkkeep': { const K = mkKept().slice(); const i = K.indexOf(v); if (i >= 0) { if (K.length === 1) { flash('Keep at least one shape'); return true; } K.splice(i, 1); } else K.push(v); change(() => { M.settings.mkKeep = MK_SHAPES.map((x) => x[0]).filter((x) => K.includes(x)); }); return true; }
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
      ${k === 'plan' ? `<button class="tg calmk" data-a="mkopen" data-ref="bad"><span class="l">Bad days<small>Done: this mark. Not all done: a small dot in its colour</small></span>${markSvg('bad', 26)}<span class="chev" aria-hidden="true">›</span></button>` : ''}
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
