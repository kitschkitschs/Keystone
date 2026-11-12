// ---------- Notebook boards (2026-11-06): moodboards (photos, text, notes and colours placed freely) and mind maps (tidy automatic layout) ----------
// M.boards = [{ id, kind: 'mood' | 'mind', title, upd, items: [...], bg, pat, snap, layout }]
// mood items: { id, t: 'photo' | 'text' | 'note' | 'swatch', x, y, w, h, fs, z, r, lock, ... } with x, y, w, h, fs as fractions of the board width,
//   so a board looks the same on the phone and the PC. photo: asset | src, ar, frame. text/note: text, font, ink, fill, al, b, i. swatch: col, text.
// mind items: { id, text, parent, fold, col, done, side } (the first one, parent null, is the centre)
const boards = () => { M.boards = M.boards || []; M.boards.forEach(bUnify); M.boards.forEach(bLsToList); return M.boards; };
// lists only come from picking words now (2026-11-07): an older word-wide list style becomes a list of its loose branches going down
function bLsToList(b) { (b.items || []).forEach((x) => { if (x.t || !x.ls) return; const ks = b.items.filter((i) => i.parent === x.id && !i.g && !i.free);
  if (ks.length) { const id = uid('mg'); (b.groups = b.groups || []).push({ id, parent: x.id, ls: x.ls, dir: 'd' }); ks.forEach((k) => { k.g = id; }); } delete x.ls; }); }
// one kind of board (2026-11-06: merge the moodboard and mind map makers): mind maps sit on the board next to photos, text and notes.
// a map is its nodes in b.items (no t); each centre (no parent) carries where the map sits (x, y as fractions of the board width), its size k, layout and theme
const isNode = (i) => !i.t;
const mapRoots = (b) => b.items.filter((i) => !i.t && !i.parent);
function rootOf(b, id) { let x = b.items.find((i) => i.id === id); while (x && x.parent) x = b.items.find((i) => i.id === x.parent); return x; }
function bUnify(b) { if (b.kind !== 'mind') return; let y = 0.12;
  mapRoots(b).forEach((r) => { r.layout = r.layout || b.layout; r.theme = r.theme || b.theme; delete r.ox; delete r.oy; const Lo = mindLayout(b, r); r.k = 1; r.x = 0.5;
    r.y = y + (Lo.P[r.id].cy - Lo.y0) / 360; y = r.y + (Lo.H - (Lo.P[r.id].cy - Lo.y0)) / 360 + 0.08; });
  b.title = b.title || (b.items[0] || {}).text || ''; b.kind = 'mood'; delete b.layout; delete b.theme; }
const boardOf = (id) => boards().find((b) => b.id === id);
const curBoard = () => boardOf(S.board);
const selItem = () => { const b = curBoard(); return b && b.items.find((i) => i.id === S.bSel); };
const BCOLS = ['#6F9BD6', '#EC8FA8', '#7DBE9A', '#EDBB3A', '#A877C4', '#3FAFA6', '#F08A3E', '#6FA24A'];
// mind map colour themes (2026-11-06): branch colours and a soft page tint
const MM_THEMES = {
  ink: { n: 'Ink', c: ['#6E685F'], g: ['#F0A23B', '#E8457F'] },
  bright: { n: 'Bright', c: BCOLS },
  autumn: { n: 'Autumn', c: ['#C2643A', '#D49A3A', '#8A8F4A', '#A0533A', '#C9A35E', '#7A5A3E', '#B97A4B', '#6E7A45'], bg: '#F3ECE2' },
  spring: { n: 'Spring', c: ['#8FC1A9', '#F0A3B6', '#EFC56F', '#98B4E3', '#C3A4DE', '#7CC2BD', '#F2B386', '#A6C97C'], bg: '#F7F4EF' },
  ocean: { n: 'Ocean', c: ['#3E7CA6', '#4FA3A5', '#6CB4D8', '#2F5D7C', '#7FC0B9', '#5A8FB8', '#3C9C8C', '#86A9C9'], bg: '#ECF1F2' },
  forest: { n: 'Forest', c: ['#4F7A4A', '#7DA36A', '#2F5A47', '#A0B46A', '#6B8F71', '#8A9A5B', '#3F6B5C', '#B3A469'], bg: '#EDF0E7' },
  berry: { n: 'Berry', c: ['#A3456B', '#C76B98', '#7B3F6E', '#D9879F', '#8E5C9E', '#B04A5A', '#C98AB8', '#6E4A7E'], bg: '#F5EDF0' },
  stone: { n: 'Stone', c: ['#4A453E', '#7D766C', '#9A9387', '#5F5A52', '#B3AC9F', '#6E685F', '#8A8378', '#A39C90'] } };
const mmTheme = (b) => MM_THEMES[b.theme] || MM_THEMES.ink;
const mmGrad = (t) => t.g || [t.c[0], t.c[1] || t.c[0]];
const MB_INK = ['#23211E', '#6E685F', '#FAF8F4', '#B5623E', '#C98A2E', '#5F8A5A', '#4F78A8', '#8A62A6'];
const MB_FILL = ['', '#FAF8F4', '#F6E7A6', '#F6D5CF', '#D9E8D3', '#D6E3F0', '#E6DCF0', '#23211E'];
const MB_SW = ['#E8D9C4', '#C9A27E', '#8C6A4F', '#F2C6B4', '#D9826B', '#A8443A', '#F4E3A1', '#E0B44C', '#B5C99A', '#6E8F5E', '#3F5E45', '#BFD5E3', '#6F94B5', '#2F4A66', '#D8C8E3', '#8B6FA3', '#F2EFEA', '#9A9387', '#4A453E', '#23211E'];
const MB_BG = { paper: '#FAF8F4', white: '#FFFFFF', linen: '#EFE8DC', sage: '#E4EADF', blush: '#F3E4DF', sky: '#E1E9F0', dusk: '#2B2825' };
const MB_FONTS = { serif: ['Serif', 'var(--serif)'], sans: ['Sans', 'var(--sans)'], hand: ['Hand', "'Caveat',cursive"], mono: ['Mono', 'var(--mono)'] };
const bSrc = (x) => x.asset ? blobUrl(x.asset) : x.src;
function bTouch(b) { b.upd = Date.now(); }
const bBg = (b) => MB_BG[b.bg] || b.bg || MB_BG.paper;
const bDark = (b) => { if (b.bg === 'dusk') return true; const c = bBg(b); if (!/^#[0-9a-f]{6}$/i.test(c)) return false; const n = parseInt(c.slice(1), 16); return ((n >> 16) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) < 110; };
// the board palette: its own list, edited in the same colour picker as the rest of the app
const BOARD_PAL = ['#23211E', '#6E685F', '#9A9387', '#FAF8F4', '#FFFFFF', '#EFE8DC', '#F6E7A6', '#F6D5CF', '#D9E8D3', '#D6E3F0', '#E6DCF0', '#B5623E', '#C98A2E', '#5F8A5A', '#4F78A8', '#8A62A6', '#E8457F', '#2B2825'];
const bCF = (lab, key, cur, inh) => `<div class="prow wrap bcf"><span class="mono plab">${lab}</span>${colorField('bd:' + key, cur, inh ? { inherit: true, inhLabel: inh } : {})}</div>`;
function bTargets(b) { return (S.bMulti ? S.bMulti : S.bSel ? [S.bSel] : []).map((id) => b.items.find((i) => i.id === id)).filter(Boolean); }
function bGetCol(k) { const b = curBoard(); if (!b) return ''; if (k === 'lp') return (S.bLnPaint || {}).col || ''; const x = (S.bTool === 'bub' && !S.bMulti && !S.bSel ? S.bPaint : bTargets(b)[0]) || {};
  if (k === 'ln') { const k0 = (S.bLines || [])[0]; const o = k0 && bLnObj(JSON.parse(JSON.stringify(b)), k0); return (o && o.col) || ''; } if (k === 'bg') return bBg(b); if (k === 'lk') { const l = (b.links || []).find((q) => q.id === S.bLk); return (l && l.col) || '#B5623E'; }
  if (k.startsWith('st')) return (x.st || {})[k.slice(2)]; return x[{ ink: 'ink', fill: 'fill', sw: 'col', mcol: 'col' }[k]]; }
function bSetCol(k, v) { if (k === 'lp') { S.bLnPaint = Object.assign({}, S.bLnPaint, { col: v || undefined }); bToolsOnly(); return; }
  if (S.bTool === 'bub' && !S.bMulti && !S.bSel && k.startsWith('st')) { const P0 = S.bPaint = S.bPaint || {}; const st = Object.assign({}, P0.st); if (v) st[k.slice(2)] = v; else delete st[k.slice(2)]; if (Object.keys(st).length) P0.st = st; else delete P0.st; bToolsOnly(); return; }
  bMut((bb) => { if (k === 'ln') { (S.bLines || []).forEach((key) => { const o = bLnObj(bb, key); if (o) o.col = v || undefined; }); bLnClean(bb); return; } if (k === 'bg') { bb.bg = v || undefined; return; } if (k === 'lk') { const l = (bb.links || []).find((q) => q.id === S.bLk); if (l) l.col = v || undefined; return; }
  bTargets(bb).forEach((x) => { if (k.startsWith('st')) { const st = Object.assign({}, x.st); if (v) st[k.slice(2)] = v; else delete st[k.slice(2)]; if (Object.keys(st).length) x.st = st; else delete x.st; return; }
    const f = { ink: 'ink', fill: 'fill', sw: 'col', mcol: 'col' }[k]; if (v) x[f] = v; else if (k !== 'sw') delete x[f]; }); }); }

// ----- undo and redo, per board, for this visit -----
const bHist = {};
const bState = (b) => JSON.stringify({ items: b.items, links: b.links, groups: b.groups, title: b.title, bg: b.bg, pat: b.pat, layout: b.layout, theme: b.theme });
const hOf = (b) => bHist[b.id] || (bHist[b.id] = { u: [], r: [] });
function bPush(b, s) { const h = hOf(b); if (s === bState(b)) return; h.u.push(s); if (h.u.length > 80) h.u.shift(); h.r = []; }
function bRestore(b, s) { const o = JSON.parse(s); b.items = o.items; b.links = o.links; b.groups = o.groups; b.title = o.title; b.bg = o.bg; b.pat = o.pat; b.layout = o.layout; b.theme = o.theme; }
function bUndo(redo) { const b = curBoard(); if (!b) return; const h = hOf(b); const from = redo ? h.r : h.u, to = redo ? h.u : h.r; if (!from.length) return;
  to.push(bState(b)); bRestore(b, from.pop()); if (S.bSel && !b.items.some((i) => i.id === S.bSel)) S.bSel = null; bTouch(b); save(); render(); }
// every board change goes through here, so it can be undone
function bMut(fn) { const b = curBoard(); if (!b) return; const before = bState(b); fn(b, b.items.find((i) => i.id === S.bSel)); bPush(b, before); bTouch(b); save(); render(); }

// ----- landing row and See all -----
function bNewMenu() { return ''; }
const bHead = () => `<div class="nbhead"><button class="nbt" data-a="nbgo" data-v="boards"><span class="mono">Boards</span><span class="chev" aria-hidden="true">›</span></button><button class="nbpen" data-a="bnew" aria-label="New board">${icon('pen-line', 20)}</button></div>`;
function bCard(b, i = 0) {
  return `<button class="bcard" data-a="bdopen" data-ref="${b.id}" style="transform:rotate(${TILTS[(i + 5) % TILTS.length]}deg)"><span class="bprev" style="background:${bBg(b)}">${moodHtml(b, true)}</span><span class="bname">${esc(boardTitle(b))}</span></button>`; }
const bSorted = () => boards().filter((b) => !b.proj).slice().sort((a, b) => (b.upd || 0) - (a.upd || 0));
function bRow() { const B = bSorted(); return bHead() + (B.length ? `<div class="hscroll brow">${B.map(bCard).join('')}</div>` : '<p class="empty">No boards yet.</p>'); }
function renderBoardsAll() { const B = bSorted();
  return nbCrumbs([['Notebook', 'home'], ['Boards']], `<button class="fbtn" data-a="bnew" aria-label="New board">${icon('pen-line', 18)}</button>`) + ''
    + (B.length ? `<div class="bgrid">${B.map(bCard).join('')}</div>` : '<p class="empty">No boards yet.</p>'); }
const boardTitle = (b) => b.title || ((mapRoots(b)[0] || {}).text) || 'Board';

// ----- the board page: no top or bottom bar, like the journal -----
const chk = (on) => `<span class="bchk">${on ? icon('check', 16) : ''}</span>`;
function bMenuHtml(b) {
  const mi = (a, v, label, on) => `<button role="menuitem" data-a="${a}" ${v ? `data-v="${v}"` : ''}>${label}${on === undefined ? '' : chk(on)}</button>`;
  const rows = `<span class="mono bmlab">Board</span><span class="bmdots">${colorField('bd:bg', bBg(b))}</span><span class="bmdots">${[['none', 'Plain'], ['dots', 'Dots'], ['grid', 'Grid'], ['lines', 'Lines']].map(([k, l]) => pB('bpat', k, l, (b.pat || 'none') === k)).join('')}</span><span class="bmsep"></span>${mi('bsnap', '', 'Snap to guides', b.snap !== false)}${mi('btidy', '', 'Tidy into a grid')}`;
  return `<span class="vsortx" data-a="bmenu"></span><span class="vdrop vsortm jdrop bmenum" role="menu">${rows}<span class="bmsep"></span>${mi('bpng', '', 'Save as PNG')}${mi('bdupboard', '', 'Duplicate board')}<button role="menuitem" class="ndel" data-a="bdel">Delete board</button></span>`; }
function renderBoard() { const b = curBoard(); if (!b) { S.nbView = S.bBack || 'home'; return renderNotebook(); }
  const h = hOf(b);
  const head = `<div class="bhd"><button class="fbtn" data-a="bback" aria-label="Back">${icon('chevron-left', 20)}</button><input class="btitle" id="btitle" value="${esc(b.title || '')}" aria-label="Board name" placeholder="Board"><span class="btools"><button class="fbtn ${S.bVw ? 'on' : ''}" data-a="bvw" aria-label="${S.bVw ? 'Viewing' : 'Working'}" title="${S.bVw ? 'Viewing' : 'Working'}">${icon(S.bVw ? 'eye' : 'pencil', 19)}</button><button class="fbtn" data-a="bundo" aria-label="Undo" title="Undo" ${h.u.length ? '' : 'disabled'}>${icon('undo-2', 19)}</button><button class="fbtn" data-a="bredo" aria-label="Redo" title="Redo" ${h.r.length ? '' : 'disabled'}>${icon('redo-2', 19)}</button><span class="vsortw"><button class="fbtn" data-a="bmenu" aria-label="More" aria-haspopup="menu" aria-expanded="${!!S.bMenu}">${icon('ellipsis', 19)}</button>${S.bMenu ? bMenuHtml(b) : ''}</span></span></div>`;
  return head + `<div class="mbwrap" id="mbwrap" style="--z:${S.bZoom || 1}">${moodHtml(b)}</div>` + bDock(b); }

// ----- the tool dock at the bottom: what I can add, or what I can do with the picked thing -----
const dB = (a, v, ic, lab, cls = '') => `<button class="bdb ${cls}" data-a="${a}" ${v !== '' ? `data-v="${v}"` : ''} aria-label="${lab}" title="${lab}">${icon(ic, 19)}<span>${lab}</span></button>`;
const pB = (a, v, lab, on, cls = '') => `<button class="bopt ${on ? 'on' : ''} ${cls}" data-a="${a}" data-v="${v}">${lab}</button>`;
const dot = (a, v, col, on, extra = '') => `<button class="bdot ${v === '' ? 'none' : ''} ${on ? 'on' : ''}" data-a="${a}" data-v="${v}" style="${v ? 'background:' + col : ''}" aria-label="${v || 'None'}" ${extra}></button>`;
const pickDot = (kind) => `<label class="bdot pick" aria-label="Pick any colour"><input type="color" data-bcol="${kind}"></label>`;
// the pop-up above the dock folds away so I can see the board while I pick things to style (2026-11-08)
const bPanW = (pan) => !pan ? '<div class="bdpan"></div>' : `<div class="bdpan ${S.bPanMin ? 'min' : ''}"><button class="bdmin" data-a="bpanmin" aria-label="${S.bPanMin ? 'Show the options' : 'Fold the options away'}" aria-expanded="${!S.bPanMin}">${icon(S.bPanMin ? 'chevron-up' : 'chevron-down', 18)}</button>${S.bPanMin ? '' : pan}</div>`;
function bDock(b) { const x = b.items.find((i) => i.id === S.bSel); const P = S.bPanel; const on = (p) => P === p ? 'on' : '';
  let row = '', pan = '';
  const lk = S.bLk && (b.links || []).find((l) => l.id === S.bLk);
  if (S.bMulti) { const n = S.bMulti.length; const nm = b.items.filter((i) => !i.t && S.bMulti.includes(i.id)).length; const dd = S.bGdir || '';
    row = dB('mgrp', 'list', 'list-tree', 'List', nm ? '' : 'off') + dB('mgrp', 'row', 'git-fork', 'Row', nm ? '' : 'off') + dB('bpanel', 'mstyle', 'palette', 'Style', (nm ? '' : 'off ') + on('mstyle')) + dB('mdelmany', '', 'trash', 'Delete', n ? 'dang' : 'dang off') + (S.bTool === 'bub' && S.bPaint ? dB('mpaint', '', 'paintbrush', 'Give style', nm ? '' : 'off') : '') + dB('mmulti', '', 'check', 'Done');
    pan = P === 'mstyle' && nm ? mmStylePanel(b, S.bMulti.map((id) => b.items.find((i) => i.id === id)).filter((i) => i && !i.t))
      : `<div class="prow"><span class="mono plab">Pick</span>${[['one', 'One'], ['branch', 'Branch'], ['list', 'List'], ['map', 'Map']].map(([k, l]) => pB('mselmode', k, l, (S.bSelMode || 'one') === k)).join('')}${pB('mselmode', 'all', 'All')}${pB('lnall', '', 'Lines')}</div><div class="prow"><span class="mono plab">Grow</span>${pB('mgdir', '', 'Auto', !dd)}${pB('mgrp', 'tree', 'Out of lists', false, n ? '' : 'off')}<span class="mono plab bselct">${n}</span></div>`;
    return `<div class="bdock" id="bdock">${bPanW(pan)}<div class="bdrow">${row}</div></div>`; }
  // lines: Style holds every look, Functions holds what the line does (the owner, 2026-11-12)
  if (S.bLines && S.bLines.length) { const L = S.bLines; const o0 = bLnObj(JSON.parse(JSON.stringify(b)), L[0]) || {}; const one = L.length === 1, isG = one && L[0].startsWith('g:'); const LP = P || (isG ? 'lnlist' : one ? 'lnfn' : 'lnsty'); const lon = (k) => LP === k ? 'on' : '';
    const LGg = isG && (b.groups || []).find((q) => 'g:' + q.id === L[0]);
    row = (LGg ? dB('bpanel', 'lnlist', LGg.ls === 'row' ? 'git-fork' : 'list-tree', LGg.ls === 'row' ? 'Row' : 'List', lon('lnlist')) : '') + dB('bpanel', 'lnsty', 'palette', 'Style', lon('lnsty')) + dB('bpanel', 'lnfn', 'sliders-horizontal', 'Functions', lon('lnfn')) + (one && !isG ? dB('lndel', '', 'trash', 'Delete', 'dang') : '') + dB('lnall', '', 'list-checks', 'All lines') + dB('lndone', '', 'check', 'Done');
    if (S.bLnMove) pan = `<div class="prow"><span class="mono plab">Move</span><span class="note" style="margin:0">Tap the bubble it should come from</span>${pB('lnmove', '', 'Cancel')}</div>`;
    else if (LP === 'lnlist' && LGg) { const cur = LGg.lst || ''; const opts = LGg.ls === 'row' ? [['', 'Line'], ['curve', 'Curved'], ['dots', 'Timeline']] : [['', 'Line'], ['curve', 'Curved'], ['dots', 'Timeline'], ['bullet', 'Bullets'], ['num', 'Numbers']];
      const Lo = mindLayout(b, rootOf(b, LGg.parent)); const jp = Lo && Lo.P['g:' + LGg.id]; const io = !jp ? null : LGg.ls === 'list' && !jp.fan ? [['l', 'Left'], ['r', 'Right']] : LGg.ls === 'row' && jp.fan ? [['u', 'Above'], ['d', 'Below']] : null; const isd = LGg.iside || (io && io[1][0]);
      pan = (io ? `<div class="prow"><span class="mono plab">Items</span>${io.map(([k, l]) => pB('lstset', 'iside:' + k, l, isd === k)).join('')}</div>` : '') + `<div class="prow"><span class="mono plab">Kind</span>${pB('lstset', 'ls:list', 'List', LGg.ls === 'list')}${pB('lstset', 'ls:row', 'Row', LGg.ls === 'row')}</div><div class="prow"><span class="mono plab">Look</span>${opts.map(([k, l]) => pB('lstset', 'lst:' + k, l, cur === k)).join('')}</div>`; }
    else if (LP === 'lnsty') pan = `<div class="prow">${L.length > 1 ? `<span class="mono plab">${L.length}</span>` : ''}<span class="mono plab">Line</span>${[['', 'Solid'], ['dash', 'Dashed'], ['dot', 'Dotted']].map(([k, l]) => pB('lnset', 'dash:' + k, l, (o0.dash || '') === k)).join('')}</div>`
      + `<div class="prow"><span class="mono plab">Width</span>${[['', 'Thin'], ['2.4', 'Medium'], ['3.6', 'Thick']].map(([k, l]) => pB('lnset', 'w:' + k, l, String(o0.w || '') === k)).join('')}</div>`
      + bCF('Colour', 'ln', o0.col, 'Auto');
    else { const T = one && bSnapTarget(b);
      pan = (T ? `<div class="prow"><span class="mono plab">Point</span>${bPtArrows('lnpt')}${pB('lnat', '', 'Auto')}</div>` : '')
        + (one && !isG ? `<div class="prow"><span class="mono plab">Move</span>${pB('lnmove', '', icon('move', 18), false, 'ico')}</div>` : '')
        + `<div class="prow">${L.length > 1 ? `<span class="mono plab">${L.length}</span>` : ''}<span class="mono plab">Arrows</span>${[['', 'None'], ['end', icon('move-right', 17)], ['start', icon('move-left', 17)], ['both', icon('move-horizontal', 17)]].map(([k, l]) => pB('lnset', 'arrow:' + k, l, (o0.arrow || '') === k, k ? 'ico' : '')).join('')}</div>`
        + `<div class="prow"><span class="mono plab">Logic</span>${pB('lnset', 'brk:' + (o0.brk ? '' : '1'), 'Break', !!o0.brk)}${pB('lnset', 'q:' + (o0.q ? '' : '1'), 'Question', !!o0.q)}</div>`; }
    return `<div class="bdock" id="bdock">${bPanW(pan)}<div class="bdrow">${row}</div></div>`; }
  if (lk) { const LP = P === 'lkfn' || P === 'lktext' ? P : 'lksty'; const lon = (k) => LP === k ? 'on' : '';
    row = dB('bpanel', 'lksty', 'palette', 'Style', lon('lksty')) + dB('bpanel', 'lkfn', 'sliders-horizontal', 'Functions', lon('lkfn')) + dB('bpanel', 'lktext', 'type', 'Text', lon('lktext')) + dB('lkdel', lk.id, 'trash', 'Delete', 'dang');
    if (LP === 'lksty') pan = `<div class="prow"><span class="mono plab">Line</span>${[['', 'Solid'], ['dash', 'Dashed'], ['dot', 'Dotted']].map(([k, l]) => pB('lkset', 'dash:' + k, l, (lk.dash || '') === k)).join('')}</div>`
      + `<div class="prow"><span class="mono plab">Width</span>${[['', 'Thin'], ['2.4', 'Medium'], ['3.6', 'Thick']].map(([k, l]) => pB('lkset', 'w:' + k, l, String(lk.w || '') === k)).join('')}</div>`
      + `<div class="prow"><span class="mono plab">Bend</span>${pB('lkbend', 'curve', 'Curve', !lk.str && !lk.c1)}${pB('lkbend', 'straight', 'Straight', !!lk.str)}${lk.c1 ? pB('lkbend', 'curve', 'My bend', true) : ''}</div>`
      + bCF('Colour', 'lk', lk.col, 'Auto');
    if (LP === 'lkfn') pan = `<div class="prow"><span class="mono plab">Arrows</span>${[['', 'None'], ['end', icon('move-right', 17)], ['start', icon('move-left', 17)], ['both', icon('move-horizontal', 17)]].map(([k, l]) => pB('lkset', 'arrow:' + k, l, (lk.arrow || '') === k, k ? 'ico' : '')).join('')}${pB('lkflip', '', 'Turn')}</div>`
      + `<div class="prow"><span class="mono plab">Logic</span>${pB('lkbrk', '', 'Break', !!lk.brk)}${pB('lkset', 'q:' + (lk.q ? '' : '1'), 'Question', !!lk.q)}</div>`;
    if (LP === 'lktext') pan = `<div class="prow"><span class="mono plab">Text</span><input class="lkin" data-lk="${lk.id}" value="${esc(lk.label || '')}" aria-label="Text on the line" maxlength="60"></div>`;
    return `<div class="bdock" id="bdock">${bPanW(pan)}<div class="bdrow">${row}</div></div>`; }
  if (!x || x.t) {
    // Bubble right of Colour; Map only once there's a bubble; Select works on everything (2026-11-08)
    if (!x) { row = dB('badd', 'text', 'type', 'Text') + `<label class="bdb" aria-label="Add photos" title="Add photos">${icon('image-plus', 19)}<span>Photo</span><input type="file" accept="image/*" multiple id="boardphoto" data-ref="${b.id}" hidden></label>` + dB('badd', 'swatch', 'swatch-book', 'Colour') + dB('mbubble', '', 'circle-dot', 'Bubble') + dB('mmulti', 'go', 'square-dashed-mouse-pointer', 'Select') + (b.items.some(isNode) ? dB('mmapgo', '', 'network', 'Map') : ''); // Map right of Select (2026-11-10)
      if (S.bMap) { const tb = (k, ic, l) => dB('mtool', k, ic, l, S.bTool === k ? 'on' : ''); // the map's tools: pick one, then tap what it should work on
        row = dB('mbubble', '', 'circle-dot', 'Bubble') + tb('link', 'spline', 'Link') + tb('line', 'route', 'Lines') + tb('bub', 'paintbrush', 'Styles') + dB('mmulti', 'go', 'square-dashed-mouse-pointer', 'Select') + dB('mmapx', '', 'check', 'Done');
        const lp = S.bLnPaint || {};
        const lnRows = `<div class="prow"><span class="mono plab">Line</span>${[['', 'Solid'], ['dash', 'Dashed'], ['dot', 'Dotted']].map(([k, l]) => pB('lpset', 'dash:' + k, l, (lp.dash || '') === k)).join('')}</div>`
          + `<div class="prow"><span class="mono plab">Width</span>${[['', 'Thin'], ['2.4', 'Medium'], ['3.6', 'Thick']].map(([k, l]) => pB('lpset', 'w:' + k, l, String(lp.w || '') === k)).join('')}</div>`
          + `<div class="prow"><span class="mono plab">Arrows</span>${[['', 'None'], ['end', icon('move-right', 17)], ['start', icon('move-left', 17)], ['both', icon('move-horizontal', 17)]].map(([k, l]) => pB('lpset', 'arrow:' + k, l, (lp.arrow || '') === k, k ? 'ico' : '')).join('')}</div>`;
        const LT = S.bLtab || 'look'; const lnPan = `<div class="prow">${pB('lptab', 'look', 'Look', LT === 'look')}${pB('lptab', 'col', 'Colour', LT === 'col')}${pB('lpall', '', 'All lines')}</div><div class="bstb">${LT === 'look' ? lnRows : bCF('', 'lp', lp.col, 'Auto')}</div>`;
        if (S.bTool === 'bub') { const sec = S.bStSec || 'bub'; const P0 = S.bPaint || (S.bPaint = {});
          pan = `<div class="prow">${pB('mstsec', 'bub', 'Bubbles', sec === 'bub')}${pB('mstsec', 'line', 'Lines', sec === 'line')}<span class="bspv">${sec === 'bub' ? bBubPrev(P0.st) : bLinePrev(lp)}</span></div>` + (sec === 'bub' ? mmStylePanel(b, [P0]) : lnPan); } }
    }
    else if (x.lock) row = dB('block', '', 'lock-open', 'Unlock') + dB('bdup', '', 'copy', 'Copy') + dB('bdelitem', '', 'trash', 'Delete', 'dang');
    else {
      const txt = x.t === 'text' || x.t === 'note';
      row = (txt ? dB('bpanel', 'font', 'case-sensitive', 'Font', on('font')) + dB('bpanel', 'style', 'text-align-start', 'Style', on('style')) + dB('bpanel', 'col', 'palette', 'Colour', on('col')) : '')
        + (x.t === 'photo' ? dB('bpanel', 'frame', 'frame', 'Frame', on('frame')) : '') + (x.t === 'swatch' ? dB('bpanel', 'col', 'palette', 'Colour', on('col')) : '')
        + dB('bpanel', 'arr', 'layers-2', 'Arrange', on('arr')) + dB('bdup', '', 'copy', 'Copy') + dB('block', '', 'lock', 'Lock') + dB('bdelitem', '', 'trash', 'Delete', 'dang');
      if (P === 'font' && txt) pan = `<div class="prow">${Object.keys(MB_FONTS).map((k) => pB('bfont', k, `<b style="font-family:${MB_FONTS[k][1]}">Aa</b> ${MB_FONTS[k][0]}`, (x.font || (x.t === 'note' ? 'hand' : 'serif')) === k)).join('')}</div>`;
      if (P === 'style' && txt) pan = `<div class="prow"><span class="mono plab">Turn into</span>${pB('bturn', 'bubble', icon('circle-dot', 16) + 'Bubble')}${x.t === 'note' ? pB('bturn', 'text', icon('type', 16) + 'Text') : ''}</div><div class="prow">${[['l', 'text-align-start'], ['c', 'text-align-center'], ['r', 'text-align-end']].map(([k, ic]) => pB('balign', k, icon(ic, 17), (x.al || 'l') === k, 'ico')).join('')}${pB('bbold', '1', '<b>B</b>', !!x.b, 'ico')}${pB('bital', '1', icon('italic', 17), !!x.i, 'ico')}<span class="pgap"></span>${pB('bsize', 'dn', icon('minus', 17), false, 'ico')}${pB('bsize', 'up', icon('plus', 17), false, 'ico')}</div>`;
      if (P === 'col' && txt) pan = bCF('Text', 'ink', x.ink, 'Auto') + bCF('Fill', 'fill', x.fill, 'None');
      if (P === 'col' && x.t === 'swatch') pan = bCF('Colour', 'sw', x.col);
      if (P === 'frame' && x.t === 'photo') pan = `<div class="prow">${[['plain', 'Plain'], ['border', 'Border'], ['polaroid', 'Polaroid'], ['mat', 'Mat'], ['tape', 'Tape'], ['stamp', 'Stamp'], ['corners', 'Corners'], ['round', 'Rounded'], ['circle', 'Circle']].map(([k, l]) => pB('bframe', k, `<i class="fprev f-${k}"></i>${l}`, (x.frame || 'plain') === k)).join('')}</div>`;
      if (P === 'arr') pan = `<div class="prow">${pB('barr', 'front', icon('bring-to-front', 17) + 'Front')}${pB('barr', 'fwd', icon('arrow-up', 17) + 'Up')}${pB('barr', 'bwd', icon('arrow-down', 17) + 'Down')}${pB('barr', 'back', icon('send-to-back', 17) + 'Back')}${x.r ? pB('barr', 'flat', icon('rotate-ccw', 17) + 'Straight') : ''}</div>`; }
  } else {
    { const kids = b.items.some((i) => i.parent === x.id);
      const linked = (b.links || []).filter((l) => l.a === x.id || l.b === x.id);
      row = !x.parent ? dB('bpanel', 'mmap', 'network', 'Map', on('mmap')) + dB('bpanel', 'mdir', 'corner-down-right', 'Branch', on('mdir')) + dB('mlinkgo', '', 'spline', 'Link', S.bLink ? 'on' : '') + dB('bpanel', 'mstyle', 'palette', 'Style', on('mstyle')) + dB('bpanel', 'mmove', 'move', 'Move', on('mmove')) + dB('bdelitem', '', 'trash', 'Delete', 'dang')
        : dB('bpanel', 'mdir', 'corner-down-right', 'Branch', on('mdir')) + dB('mlinkgo', '', 'spline', 'Link', S.bLink ? 'on' : '') + dB('bpanel', 'mstyle', 'palette', 'Style', on('mstyle')) + dB('bpanel', 'mmove', 'move', 'Move', on('mmove')) + dB('bdelitem', '', 'trash', 'Delete', 'dang');
      if (P === 'mlink' && linked.length) pan = `<div class="prow wrap">${linked.map((l) => { const o = b.items.find((i) => i.id === (l.a === x.id ? l.b : l.a)); return o ? pB('mlinkdel', l.id, esc(o.text || '…') + icon('x', 14)) : ''; }).join('')}</div>`;
      if (P === 'mstyle') pan = mmStylePanel(b, [x]);
      if (P === 'msel') pan = `<div class="prow">${pB('mselect', 'some', icon('mouse-pointer-click', 16) + 'Several')}${kids ? pB('mselect', 'branch', icon('git-branch', 16) + 'Branch') : ''}${x.g ? pB('mselect', 'list', icon('list', 16) + 'List') : ''}${pB('mselect', 'map', icon('network', 16) + 'Whole map')}</div>`;
      if (P === 'mcol' && x.parent) pan = bCF('Line', 'mcol', x.col, 'Auto');
      const turn = `<div class="prow"><span class="mono plab">Turn into</span>${pB('bturn', 'text', icon('type', 16) + 'Text', false, kids ? 'off' : '')}</div>`;
      if (P === 'mmove' && !x.parent) pan = `<div class="prow">${pB('mmulti', 'go', icon('list-plus', 17) + 'New list')}</div>` + turn;
      if (P === 'mmove' && x.parent) { const L = mmLevel(b, x); const Lo = mindLayout(b); const pp = Lo.P[x.id] || {}; const hz = pp.dir !== 'u' && pp.dir !== 'd';
        pan = `<div class="prow">${pB('mmove', 'up', icon(hz ? 'arrow-up' : 'arrow-left', 17) + (hz ? 'Up' : 'Left'))}${pB('mmove', 'down', icon(hz ? 'arrow-down' : 'arrow-right', 17) + (hz ? 'Down' : 'Right'))}${L > 1 ? pB('mmove', 'out', icon('corner-left-up', 17) + 'Level up') : ''}</div>`
          + mmGrpRow(b, x) + `<div class="prow"><span class="mono plab">Place</span>${pB('mplace', 'tree', 'In layout', !x.free)}${pB('mplace', 'free', 'Free', !!x.free)}${pB('mplace', 'own', 'Own map')}</div>`
          + (kids ? `<div class="prow"><span class="mono plab">Fold</span>${pB('mfold', '', x.fold ? 'Open' : 'Fold', false)}</div>` : '')
          + turn; }
      }
      if (P === 'mmap' && !x.parent) { const lay = x.layout || 'both', th = x.theme || 'ink';
        pan = `<div class="prow"><span class="mono plab">Spread</span>${[['both', 'Sides'], ['all', 'Four ways'], ['circle', 'Circle'], ['fan', 'Fan'], ['spiral', 'Spiral'], ['bloom', 'Bloom'], ['right', 'Right']].map(([k, l]) => pB('mlayout', k, l, lay === k)).join('')}${pB('mspread', '', 'Even')}</div>`
          + `<div class="prow"><span class="mono plab">Theme</span>${Object.keys(MM_THEMES).map((k) => pB('mtheme', k, `<span class="mthd">${(k === 'ink' ? [...MM_THEMES.ink.g, '#6E685F'] : MM_THEMES[k].c.slice(0, 5)).map((c) => `<i style="background:${c}"></i>`).join('')}</span>${MM_THEMES[k].n}`, th === k)).join('')}</div>`
          + `<div class="prow"><span class="mono plab">Size</span>${pB('mzoom', 'out', icon('zoom-out', 17), false, 'ico')}${pB('mzoom', 'in', icon('zoom-in', 17), false, 'ico')}${pB('mzoom', 'fit', 'Fit the board')}${pB('mfoldall', 'open', 'Open all')}${pB('mfoldall', 'shut', 'Fold all')}</div>`; }
  if (x && !x.t && P === 'mdir') pan = `<div class="prow"><span class="mono plab">Grow</span>${pB('mgrow', 'branch', 'Branch', S.bGrow !== 'list')}${pB('mgrow', 'list', 'List', S.bGrow === 'list')}${pB(x.parent ? 'mchild' : 'mroot', '', 'Auto')}</div>` + `<div class="prow"><span class="mono plab">Point</span>${bPtArrows('mpt')}${pB('mptgo', '', 'Branch here', false, S.bNewPt && S.bNewPt.on === x.id ? '' : 'off')}</div>`;  }
  return `<div class="bdock" id="bdock">${pan ? '' : `<div class="bzm"><button data-a="bzoom" data-v="in" aria-label="Zoom in">${icon('plus', 16)}</button><button class="bzp" data-a="bzoom" data-v="1" aria-label="Back to 100%">${Math.round((S.bZoom || 1) * 100)}%</button><button data-a="bzoom" data-v="out" aria-label="Zoom out">${icon('minus', 16)}</button></div>`}${pan ? `${bPanW(pan)}` : ''}${S.bVw ? '' : `<div class="bdrow">${row}</div>`}</div>`; }

// the style panel for one or several bubbles: Shape, Colours, Text, Saved
const MM_FILLS = ['', '#FFFFFF', '#FAF8F4', '#F6E7A6', '#F6D5CF', '#D9E8D3', '#D6E3F0', '#E6DCF0', '#F3E1C7', '#23211E'];
const MM_INKS = ['', '#23211E', '#6E685F', '#B5623E', '#C98A2E', '#5F8A5A', '#4F78A8', '#8A62A6', '#E8457F', '#FAF8F4'];
function mmStylePanel(b, xs) { const x = xs[0] || {}; const st = x.st || {}; const T = S.bStab || 'shape'; const tab = (k, l) => pB('mstab', k, l, T === k);
  const dots = (k, list) => list.map((c) => dot('mst', k + ':' + c, c || 'transparent', (st[k] || '') === c, c ? '' : 'none')).join('');
  const dfPill = !!x.id && !x.parent && x.pill && !st.shape && !mmBox(st); // a first bubble is a pill until I style it
  let body = '';
  if (T === 'shape') body = `<div class="prow"><span class="mono plab">Shape</span>${[['none', 'None'], ['pill', 'Pill'], ['round', 'Rounded'], ['square', 'Square'], ['circle', 'Circle']].map(([k, l]) => pB('mst', 'shape:' + k, `<i class="shp s-${k}"></i>${l}`, (st.shape || (mmBox(st) ? 'round' : dfPill ? 'pill' : 'none')) === k)).join('')}</div>`
    + `<div class="prow"><span class="mono plab">Border</span>${[['0', 'None'], ['1', 'Thin'], ['2', 'Medium'], ['3.5', 'Thick']].map(([k, l]) => pB('mst', 'bw:' + k, l, String(st.bw == null ? (mmBox(st) ? '1.5' : '0') : st.bw) === k && !(dfPill && st.bw == null && k === '0') || (k === '1' && st.bw == null && (mmBox(st) || dfPill)))).join('')}</div>`;
  if (T === 'col') { const CL = [['stfill', 'Fill', st.fill, 'None'], ['stbc', 'Border', st.bc, 'Auto'], ['stink', 'Text', st.ink, 'Auto']].concat(xs.some((q) => q.parent) ? [['mcol', 'Line', x.col, 'Auto']] : []); const ck = CL.find((c) => c[0] === S.bStCol) || CL[0];
    body = `<div class="prow">${CL.map((c) => pB('mstcol', c[0], c[1], c === ck)).join('')}</div>` + bCF('', ck[0], ck[2], ck[3]); }
  if (T === 'text') body = `<div class="prow">${Object.keys(MM_FCSS).map((k) => pB('mst', 'font:' + k, `<b style="font-family:${MM_FCSS[k]}">Aa</b> ${{ sans: 'Sans', serif: 'Serif', hand: 'Hand', mono: 'Mono' }[k]}`, (st.font || 'sans') === k)).join('')}</div>`
    + `<div class="prow"><span class="mono plab">Size</span>${pB('mst', 'fs:-', icon('minus', 16), false, 'ico')}<span class="mono plab">${Math.round(st.fs || 0) || 'Auto'}</span>${pB('mst', 'fs:+', icon('plus', 16), false, 'ico')}${pB('mst', 'b:1', '<b>B</b>', !!st.b, 'ico')}${pB('mst', 'i:1', icon('italic', 17), !!st.i, 'ico')}</div>`;
  if (T === 'saved') { const L = M.bubbleStyles || []; body = `<div class="prow wrap">${L.map((q) => `<span class="bssv"><button class="bssw" data-a="mstuse" data-v="${q.id}" style="${mmStyleCss(Object.assign({ shape: 'round' }, q.st), 1).slice(1)}">Aa</button><button class="bssx" data-a="mstdel" data-v="${q.id}" aria-label="Delete this style">${icon('x', 12)}</button></span>`).join('')}${pB('mstsave', '', icon('plus', 16) + 'Save this look', false, x.st ? '' : 'off')}</div>`; }
  return `<div class="prow">${tab('shape', 'Shape')}${tab('col', 'Colours')}${tab('text', 'Text')}${tab('saved', 'Saved')}${pB('mst', 'reset', 'Plain')}</div><div class="bstb">${body}</div>`; }
const mmGrpRow = (b, x) => { const g = x.g && (b.groups || []).find((q) => q.id === x.g && q.parent === x.parent);
  return (g ? `<div class="prow"><span class="mono plab">In list</span>${g ? pB('mgset', 'ls:list', 'List', g.ls !== 'row') + pB('mgset', 'ls:row', 'Row', g.ls === 'row') + ['l', 'u', 'd', 'r'].map((k) => pB('mgset', 'dir:' + k, icon({ l: 'arrow-left', u: 'arrow-up', d: 'arrow-down', r: 'arrow-right' }[k], 17), g.dir === k, 'ico')).join('') + pB('mgset', 'out', 'Leave') : ''}</div>` : '') + `<div class="prow">${pB('mmulti', 'go', icon('list-plus', 17) + 'New list')}</div>`; };
const mmLsRow = (x) => `<div class="prow"><span class="mono plab">Lists</span>${[['', 'Curves'], ['list', 'List'], ['row', 'Row']].map(([k, l]) => pB('mls', k, l, (x.ls || '') === k)).join('')}</div>`;
function mmDirRow(act, cur) { return pB(act, '', 'Auto', act === 'mgrow' && !cur) + ['l', 'u', 'd', 'r'].map((k) => pB(act, k, icon({ l: 'arrow-left', u: 'arrow-up', d: 'arrow-down', r: 'arrow-right' }[k], 17), cur === k, 'ico')).join(''); }

// ----- moodboard -----
function itemH(x) { return x.t === 'text' || x.t === 'note' ? (x.h || x.fs * 1.6) : x.t === 'swatch' ? x.h + x.w * 0.2 : x.h; }
function moodHeight(b) { return Math.max(1.6, ...b.items.filter((x) => x.t).map((x) => x.y + itemH(x) + 0.5), ...mapRoots(b).map((r) => { const Lo = mindLayout(b, r); return (r.y || 0) + (Lo.H - (Lo.P[r.id].cy - Lo.y0)) * (r.k || 1) / 360 + 0.3; })); }
// a map is drawn at its own size in pixels, then scaled to the board: k = 1 means it looks as it would on a phone 360 wide
function mapHtml(b, r, thumb, L0) { const Lo = L0 || mindLayout(b, r); if (!Lo) return ''; const p = Lo.P[r.id];
  return `<div class="mbmap" data-root="${r.id}" data-x="${r.x == null ? 0.5 : r.x}" data-y="${r.y == null ? 0.2 : r.y}" data-k="${r.k || 1}" data-rx="${p.cx - Lo.x0}" data-ry="${p.cy - Lo.y0}" data-w="${Lo.W}" data-h="${Lo.H}" style="z-index:${r.z || 1}">${mindSvg(b, thumb, r, Lo)}</div>`; }
function bMaps() { bRowsMore(); const bw = $('#mbwrap'); const cv = bw && bw.querySelector('.mbcanvas'), mn = $('#main'), hd = document.querySelector('.bhd'); if (cv && mn) cv.style.minHeight = Math.max(200, mn.clientHeight - (hd ? hd.offsetHeight : 0)) + 'px'; if (bw && !bw.dataset.sl) { bw.dataset.sl = 1; bw.scrollLeft = S.bSL || 0; }
  // when the board grows to the left or top, keep everything where it was on screen
  if (bw && cv) { const ol = parseFloat(cv.style.getPropertyValue('--ol')) || 0, ot = parseFloat(cv.style.getPropertyValue('--ot')) || 0, k = bw.clientWidth * (S.bZoom || 1), key = S.board;
    if (S.bOff && S.bOff.b === key) { if (ol !== S.bOff.l) { bw.scrollLeft += (ol - S.bOff.l) * k; S.bSL = bw.scrollLeft; } if (ot !== S.bOff.t && mn) mn.scrollTop += (ot - S.bOff.t) * k; }
    S.bOff = { b: key, l: ol, t: ot }; }
  document.querySelectorAll('.mbmap').forEach((m) => { const bd = m.closest('.mboard'); if (!bd) return; const W = bd.clientWidth; const d = m.dataset; const s = W * d.k / 360;
  m.style.left = (d.x * W - d.rx * s) + 'px'; m.style.top = (d.y * W - d.ry * s) + 'px'; m.style.width = d.w * s + 'px'; m.style.height = d.h * s + 'px'; m.dataset.s = s;
  const mp = m.querySelector('.mmap'); if (mp) mp.style.transform = `scale(${s})`; });
  // text is laid out as it is at 100% and then scaled with the zoom, so it grows and shrinks with the board instead of wrapping differently (the owner, 2026-11-12);
  // tiny text is drawn at a readable size and shrunk to fit, the way the maps are, since phones won't draw letters below a minimum size
  const zz = S.bZoom || 1;
  document.querySelectorAll('.mboard .mbi[data-fs]').forEach((n) => { const bd = n.closest('.mboard'); const tx = n.querySelector('.mbtx'); if (!bd || !tx) return; const W = bd.clientWidth, z = bd.closest('.mbwrap') ? zz : 1, px = W * n.dataset.fs, MIN = 14;
    const draw = Math.max(px / z, MIN), r = px / draw;
    if (Math.abs(r - 1) < 0.002) { if (n.dataset.sm) { n.style.fontSize = `calc(100cqw * ${n.dataset.fs})`; tx.style.width = tx.style.transform = tx.style.marginBottom = tx.style.right = ''; delete n.dataset.sm; } return; }
    n.dataset.sm = 1; n.style.fontSize = draw + 'px'; Object.assign(tx.style, { width: 100 / r + '%', transform: `scale(${r})`, transformOrigin: '0 0', right: 'auto', marginBottom: '0px' }); if (!n.classList.contains('mbs')) tx.style.marginBottom = -tx.offsetHeight * (1 - r) + 'px'; });
  // my own connections, drawn across maps on the board
  document.querySelectorAll('.mboard .mblinks').forEach((sv) => { const bd = sv.closest('.mboard'); const b = boardOf(bd.dataset.bid); if (!b) return; const B = bd.getBoundingClientRect();
    const box = (id) => { const n = bd.querySelector(`.mmn[data-id="${id}"]`); if (!n) return null; const r = n.getBoundingClientRect(); return { cx: r.left - B.left + r.width / 2, cy: r.top - B.top + r.height / 2, w: r.width, h: r.height, c: n.style.getPropertyValue('--bc'), shp: n.dataset.shp }; };
    const bg = getComputedStyle(bd.closest('.mbcanvas') || bd).backgroundColor;
    const W = bd.clientWidth; bLkGeo = {}; let defs = '';
    const body = (b.links || []).map((l) => { const p = box(l.a), q = box(l.b); if (!p || !q) return ''; const c = l.col || '#B5623E'; const on = S.bLk === l.id;
      const dx = q.cx - p.cx, dy = q.cy - p.cy; let C1, C2;
      if (l.c1 && l.c2) { C1 = [p.cx + l.c1[0] * W, p.cy + l.c1[1] * W]; C2 = [q.cx + l.c2[0] * W, q.cy + l.c2[1] * W]; }
      else if (l.str) { C1 = [p.cx + dx / 3, p.cy + dy / 3]; C2 = [p.cx + dx * 2 / 3, p.cy + dy * 2 / 3]; }
      else { const ln = Math.hypot(dx, dy) || 1, bw = Math.max(ln * 0.16, 22); const nx = -dy / ln * bw, ny = dx / ln * bw; C1 = [p.cx + dx / 3 + nx, p.cy + dy / 3 + ny]; C2 = [p.cx + dx * 2 / 3 + nx, p.cy + dy * 2 / 3 + ny]; }
      const [ax, ay] = l.pa ? [p.cx + l.pa[0] * p.w / 2, p.cy + l.pa[1] * p.h / 2] : mmEdgeS(p, C1[0], C1[1]), [bx, by] = l.pb ? [q.cx + l.pb[0] * q.w / 2, q.cy + l.pb[1] * q.h / 2] : mmEdgeS(q, C2[0], C2[1]); const [c1x, c1y] = C1, [c2x, c2y] = C2;
      const d = `M${ax} ${ay}C${c1x} ${c1y} ${c2x} ${c2y} ${bx} ${by}`; const mx = (ax + 3 * c1x + 3 * c2x + bx) / 8, my = (ay + 3 * c1y + 3 * c2y + by) / 8;
      bLkGeo[l.id] = { p, q, C1, C2, W, mx, my };
      const sw = (+l.w || 1.4) * W / 360; const dash = l.dash === 'dash' ? ` stroke-dasharray="${sw * 4 + 2} ${sw * 3 + 2}"` : l.dash === 'dot' ? ` stroke-dasharray="0.1 ${sw * 2.5 + 2}"` : '';
      const head = (x, y, tx, ty) => mmHead(x, y, Math.atan2(y - ty, x - tx), sw);
      let out = on ? `<path d="${d}" fill="none" stroke="${c}" stroke-width="${sw + 7}" stroke-linecap="round" opacity="0.16"/>` : '';
      out += `<path d="${d}" fill="none" stroke="${c}" stroke-width="${l.dash === 'dot' ? sw + 0.8 : sw}" stroke-linecap="round"${dash} opacity="0.9"${l.arrow ? ` data-ah="${l.arrow}" data-w="${sw}"` : ''}${l.brk ? ` data-brk="1" data-fs="${10.5 * W / 360}"${l.label ? ' data-flip="1"' : ''}` : ''}${l.q ? ` data-q="1" data-fs="${10.5 * W / 360}"${l.label ? ' data-flip="1"' : ''}` : ''}/>`;
      const ar = l.arrow === 'both' ? 'se' : l.arrow === 'end' ? 'e' : l.arrow === 'start' ? 's' : '';
      if (l.label) { const rev = bx < ax; const ext = (x, y, cx, cy) => { const L = Math.hypot(x - cx, y - cy) || 1; return [x + (x - cx) / L * 60, y + (y - cy) / L * 60]; }; const [ex1, ey1] = ext(ax, ay, c1x, c1y), [ex2, ey2] = ext(bx, by, c2x, c2y);
        const ks = W / 360, q2 = (x, y) => `${x / ks} ${y / ks}`; const tl = (l.label.length * 6.4 + 30) * ks, ch = Math.hypot(bx - ax, by - ay);
        // the words sit on the line and follow its curve, kept upright: a right-to-left line gets its path drawn backwards
        const tx0 = 0.75 * (c1x - ax) + 1.5 * (c2x - c1x) + 0.75 * (bx - c2x); const back = tx0 < 0;
        const pd = back ? `M${q2(ex2, ey2)}L${q2(bx, by)}C${q2(c2x, c2y)} ${q2(c1x, c1y)} ${q2(ax, ay)}L${q2(ex1, ey1)}` : `M${q2(ex1, ey1)}L${q2(ax, ay)}C${q2(c1x, c1y)} ${q2(c2x, c2y)} ${q2(bx, by)}L${q2(ex2, ey2)}`;
        const pid = 'mblp-' + l.id, tp = `<textPath href="#${pid}" startOffset="50%" text-anchor="middle">${esc(l.label)}</textPath>`, cr = ((back ? ax - bx : bx - ax) * ((c1y + c2y) / 2 - (back ? by : ay)) - (back ? ay - by : by - ay) * ((c1x + c2x) / 2 - (back ? bx : ax))), dyv = cr > 0 ? `dy="${(sw / 2 + 12) / ks}"` : `dy="-${(sw / 2 + 4) / ks}"`; // the words go on the outer side of the bend, where they spread out
        out += `<g transform="scale(${ks})"><path id="${pid}" d="${pd}" fill="none" stroke="none"/><text class="mblab" ${dyv} style="stroke:${bg}" fill="${bg}">${tp}</text><text class="mblab" ${dyv} style="stroke:none" fill="${c}">${tp}</text></g>`; }
      out += `<path class="mblk" data-lk="${l.id}" d="${d}" fill="none" stroke="transparent" stroke-width="18"/>`;
      if (on) out += `<path d="M${ax} ${ay}L${c1x} ${c1y}M${bx} ${by}L${c2x} ${c2y}" stroke="${c}" stroke-width="1" stroke-dasharray="2 3" fill="none" opacity="0.7"/>`
        + `<circle class="mblh" data-lk="${l.id}" data-h="1" cx="${c1x}" cy="${c1y}" r="6.5" fill="${bg}" stroke="${c}" stroke-width="1.6"/><circle class="mblh" data-lk="${l.id}" data-h="2" cx="${c2x}" cy="${c2y}" r="6.5" fill="${bg}" stroke="${c}" stroke-width="1.6"/>`
        + `<rect class="mblh end" data-lk="${l.id}" data-h="a" x="${ax - 5}" y="${ay - 5}" width="10" height="10" rx="2" fill="${c}" stroke="${bg}" stroke-width="1.5"/><rect class="mblh end" data-lk="${l.id}" data-h="b" x="${bx - 5}" y="${by - 5}" width="10" height="10" rx="2" fill="${c}" stroke="${bg}" stroke-width="1.5"/>`
        + `<circle class="mblh mid" data-lk="${l.id}" data-h="m" cx="${mx}" cy="${my}" r="7.5" fill="${c}" stroke="${bg}" stroke-width="2"/>`;
      return out; }).join('');
    sv.innerHTML = (defs ? `<defs>${defs}</defs>` : '') + body; }); bArrows(); bBreaks(); }
// a break in a line: where an argument doesn't follow, the line has a gap with a slash through it and my note beside it
function bBreaks() { const NS = 'http://www.w3.org/2000/svg', RC = '#C2453A';
  document.querySelectorAll('.mbwrap .mmbrk, .mboard .mmbrk').forEach((n) => n.remove());
  document.querySelectorAll('.mbwrap path[data-brk], .mboard path[data-brk]').forEach((pa) => { let L = 0; try { L = pa.getTotalLength(); } catch (e) { return; } if (L < 12) return;
    const w = +pa.getAttribute('stroke-width') || 1.3, u = +pa.dataset.fs ? pa.dataset.fs / 10.5 : 1, g = 5 * u + w, M = L * (pa.dataset.flip ? 0.28 : 0.5); pa.setAttribute('stroke', RC); if (!pa.getAttribute('stroke-dasharray')) pa.setAttribute('stroke-dasharray', `${M - g} ${2 * g} ${L}`);
    const ah = pa.nextElementSibling; if (ah && ah.classList.contains('mmah')) { ah.setAttribute('fill', RC); ah.setAttribute('stroke', RC); }
    const p = pa.getPointAtLength(M), a = pa.getPointAtLength(Math.max(0, M - 2)), c = pa.getPointAtLength(Math.min(L, M + 2)); let tx = c.x - a.x, ty = c.y - a.y; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl; const nx = -ty, ny = tx;
    const r = g * 0.95; let d = ''; [[1, 1], [1, -1]].forEach(([i, j]) => { const dx = (tx * i + nx * j) * r * 0.7071, dy = (ty * i + ny * j) * r * 0.7071; d += `M${p.x - dx} ${p.y - dy}L${p.x + dx} ${p.y + dy}`; });
    const G = document.createElementNS(NS, 'g'); G.setAttribute('class', 'mmbrk'); G.innerHTML = `<path d="${d}" fill="none" stroke="${RC}" stroke-width="${Math.max(1.5, w)}" stroke-linecap="round"/>`;
    (ah && ah.classList.contains('mmah') ? ah : pa).after(G); }); bQs(); }
// a line I call into question: a small ? in a ring sits on it (beside the break when it has one)
function bQs() { const NS = 'http://www.w3.org/2000/svg';
  document.querySelectorAll('.mbwrap .mmq, .mboard .mmq').forEach((n) => n.remove());
  document.querySelectorAll('.mbwrap path[data-q], .mboard path[data-q]').forEach((pa) => { let L = 0; try { L = pa.getTotalLength(); } catch (e) { return; } if (L < 12) return;
    const u = +pa.dataset.fs ? pa.dataset.fs / 10.5 : 1, w = +pa.getAttribute('stroke-width') || 1.3, c = pa.getAttribute('stroke') || '#7A7368'; const bd = pa.closest('.mbcanvas, .mboard'); const bg = bd ? getComputedStyle(bd).backgroundColor : '#FAF8F4';
    const f = pa.dataset.brk ? (pa.dataset.flip ? 0.55 : 0.74) : pa.dataset.flip ? 0.28 : 0.5; const p = pa.getPointAtLength(L * f), r = 7 * u + w / 2;
    const G = document.createElementNS(NS, 'g'); G.setAttribute('class', 'mmq'); G.innerHTML = `<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${bg}" stroke="${c}" stroke-width="${Math.max(1.2, w * 0.8)}"/><text x="${p.x}" y="${p.y}" text-anchor="middle" dominant-baseline="central" font-size="${10 * u}" font-weight="600" fill="${c}" style="font-family:var(--sans,system-ui)">?</text>`;
    const ah = pa.nextElementSibling; let at = ah && (ah.classList.contains('mmah') || ah.classList.contains('mmbrk')) ? ah : pa; while (at.nextElementSibling && at.nextElementSibling.classList.contains('mmbrk')) at = at.nextElementSibling; at.after(G); }); }
// arrow heads point along the last stretch of the line as drawn, so they never stick out sideways on a curve
function bArrows() { document.querySelectorAll('.mbwrap path[data-ah], .mboard path[data-ah]').forEach((pa) => { const sv = pa.ownerSVGElement; if (!sv) return; if (pa.nextElementSibling && pa.nextElementSibling.classList.contains('mmah')) pa.nextElementSibling.remove();
  let L = 0; try { L = pa.getTotalLength(); } catch (e) { return; } if (!L) return; const w = +pa.dataset.w || 1.3, hl = Math.min(L / 2, mmHeadLen(w) * 0.9), ah = pa.dataset.ah; let d = '';
  if (ah !== 'start') { const t = pa.getPointAtLength(L), q = pa.getPointAtLength(L - hl); d += mmHead(t.x, t.y, Math.atan2(t.y - q.y, t.x - q.x), w); }
  if (ah === 'start' || ah === 'both') { const t = pa.getPointAtLength(0), q = pa.getPointAtLength(hl); d += mmHead(t.x, t.y, Math.atan2(t.y - q.y, t.x - q.x), w); }
  const h = document.createElementNS('http://www.w3.org/2000/svg', 'path'); h.setAttribute('class', 'mmah'); h.setAttribute('d', d); const c = pa.getAttribute('stroke'); h.setAttribute('fill', c); h.setAttribute('stroke', c); h.setAttribute('stroke-width', '0.6'); h.setAttribute('stroke-linejoin', 'round'); pa.after(h); }); }
// bending a connection: drag its handles like a vector line
let bLkGeo = {}, bLkDrag = null;
document.addEventListener('pointerdown', (e) => { const h = e.target.closest && e.target.closest('.mblh'); if (!h) return; const b = curBoard(); const l = b && (b.links || []).find((q) => q.id === h.dataset.lk); const g = bLkGeo[h.dataset.lk]; if (!l || !g) return;
  e.preventDefault(); e.stopPropagation(); const before = bState(b); const bd = h.closest('.mboard'); const R = bd.getBoundingClientRect();
  const c1 = [(g.C1[0] - g.p.cx) / g.W, (g.C1[1] - g.p.cy) / g.W], c2 = [(g.C2[0] - g.q.cx) / g.W, (g.C2[1] - g.q.cy) / g.W];
  bLkDrag = { b, l, h: h.dataset.h, before, sx: e.clientX, sy: e.clientY, c1, c2, W: g.W, p: g.p, q: g.q, R }; }, true);
document.addEventListener('pointermove', (e) => { const d = bLkDrag; if (!d) return; const l = d.l; if (d.h !== 'a' && d.h !== 'b') delete l.str;
  const x = e.clientX - d.R.left, y = e.clientY - d.R.top;
  if (d.h === '1') { l.c1 = [(x - d.p.cx) / d.W, (y - d.p.cy) / d.W]; l.c2 = d.c2; }
  else if (d.h === '2') { l.c2 = [(x - d.q.cx) / d.W, (y - d.q.cy) / d.W]; l.c1 = d.c1; }
  else if (d.h === 'a' || d.h === 'b') { const P = d.h === 'a' ? d.p : d.q; const [ex, ey] = mmEdgeS(P, x, y); l['p' + d.h] = [Math.round((ex - P.cx) / (P.w / 2) * 1e3) / 1e3, Math.round((ey - P.cy) / (P.h / 2) * 1e3) / 1e3]; }
  else { const k = 4 / 3 / d.W, ox = (e.clientX - d.sx) * k, oy = (e.clientY - d.sy) * k; l.c1 = [d.c1[0] + ox, d.c1[1] + oy]; l.c2 = [d.c2[0] + ox, d.c2[1] + oy]; }
  if (l.c1 && l.c2) l.c1 = l.c1.map((v) => Math.round(v * 1e4) / 1e4), l.c2 = l.c2.map((v) => Math.round(v * 1e4) / 1e4); bMaps(); });
document.addEventListener('pointerup', () => { const d = bLkDrag; if (!d) return; bLkDrag = null; bPush(d.b, d.before); bTouch(d.b); save(); mSkip = true; setTimeout(() => { mSkip = false; }, 0); });
addEventListener('resize', () => bMaps());
function bRight(b) { return Math.max(1, ...b.items.filter((x) => x.t).map((x) => x.x + (x.w || 0.3) + 0.04), ...mapRoots(b).map((r) => { const Lo = mindLayout(b, r); return (r.x == null ? 0.5 : r.x) + (Lo.W - (Lo.P[r.id].cx - Lo.x0)) * (r.k || 1) / 360 + 0.02; })); }
// how far maps reach past the left and top of the board, so the board can make room there
function bReach(b) { let l = 0, t = 0; b.items.forEach((x) => { if (x.t) { l = Math.min(l, x.x); t = Math.min(t, x.y); } }); mapRoots(b).forEach((r) => { const Lo = mindLayout(b, r); const k = (r.k || 1) / 360, p = Lo.P[r.id];
  l = Math.min(l, (r.x == null ? 0.5 : r.x) - (p.cx - Lo.x0) * k); t = Math.min(t, (r.y == null ? 0.2 : r.y) - (p.cy - Lo.y0) * k); }); return { l: l < 0 ? 0.02 - l : 0, t: t < 0 ? 0.02 - t : 0 }; }
function bPat(b) { const c = bDark(b) ? 'rgba(255,255,255,.13)' : 'rgba(60,50,30,.13)';
  return b.pat === 'dots' ? `background-image:radial-gradient(circle,${c} 1px,transparent 1.4px);background-size:5cqw 5cqw` : b.pat === 'grid' ? `background-image:linear-gradient(${c} 1px,transparent 1px),linear-gradient(90deg,${c} 1px,transparent 1px);background-size:5cqw 5cqw` : b.pat === 'lines' ? `background-image:linear-gradient(transparent calc(6cqw - 1px),${c} calc(6cqw - 1px));background-size:100% 6cqw` : ''; }
function mbItem(b, x, thumb) { const sel = !thumb && S.bSel === x.id;
  const st = `left:${x.x * 100}%;top:calc(100cqw * ${x.y});width:${x.w * 100}%;z-index:${x.z || 1}${x.r ? `;transform:rotate(${x.r}deg)` : ''}`;
  const txt = x.t === 'text' || x.t === 'note';
  const hd = thumb || x.lock ? '' : `<span class="mbh" aria-hidden="true"></span><span class="mbr" aria-hidden="true"></span>${txt ? '<span class="mbw" aria-hidden="true"></span>' : ''}`;
  const lk = sel && x.lock ? `<span class="mblk">${icon('lock', 12)}</span>` : '';
  const cls = `mbi ${sel ? 'sel' : ''} ${x.lock ? 'lock' : ''} ${!thumb && S.bMulti && S.bMulti.includes(x.id) ? 'msel' : ''}`;
  if (x.t === 'photo') { const f = x.frame || 'plain'; const p = f === 'border' ? x.w * 0.035 : f === 'polaroid' ? x.w * 0.05 : f === 'mat' ? x.w * 0.07 : f === 'stamp' ? x.w * 0.06 : 0; // journal frames too (2026-11-10)
    const pad = p ? `;padding:calc(100cqw * ${p}) calc(100cqw * ${p}) calc(100cqw * ${f === 'polaroid' ? p * 3.6 : p})` : '';
    const rad = f === 'round' ? `;--rad:calc(100cqw * ${x.w * 0.1})` : '';
    return `<div class="${cls} mbp f-${f}" data-id="${x.id}" style="${st};height:calc(100cqw * ${x.h})${pad}${rad}${f === 'stamp' ? ';--hole:' + bBg(b) : ''}"><img src="${esc(bSrc(x))}" alt="" draggable="false">${hd}${lk}</div>`; }
  if (x.t === 'swatch') return `<div class="${cls} mbs" data-id="${x.id}" data-fs="${x.w * 0.085}" style="${st};height:calc(100cqw * ${x.h});font-size:calc(100cqw * ${x.w * 0.085})"><div class="sw" style="background:${x.col}"></div><div class="mbtx" data-ph="${esc((x.col || '').toUpperCase())}" style="color:${bDark(b) ? '#D8D2C6' : 'var(--quiet)'}">${esc(x.text || '')}</div>${hd}${lk}</div>`;
  const font = MB_FONTS[x.font || (x.t === 'note' ? 'hand' : 'serif')][1];
  const ink = x.ink || (x.fill === '#23211E' || (!x.fill && bDark(b)) ? '#F2EFEA' : 'var(--ink)');
  const fill = x.fill ? `;background:${x.fill};padding:.45em .6em` : '';
  return `<div class="${cls} mbt ${x.t === 'note' ? 'mbnote' : ''}" data-id="${x.id}" data-fs="${x.fs}" style="${st};font-size:calc(100cqw * ${x.fs})"><div class="mbtx" style="font-family:${font};color:${ink};text-align:${{ l: 'left', c: 'center', r: 'right' }[x.al || 'l']}${x.b ? ';font-weight:600' : ''}${x.i ? ';font-style:italic' : ''}${fill}">${esc(x.text || '').replace(/\n/g, '<br>')}</div>${hd}${lk}</div>`; }
function moodHtml(b, thumb) { const H = moodHeight(b);
  if (!thumb) { const o = bReach(b), Wu = bRight(b) + o.l; return `<div class="mbcanvas ${bDark(b) ? 'dusk' : ''}" style="--ol:${o.l};--ot:${o.t};width:calc(100cqw * ${Wu} * var(--z,1));height:calc(100cqw * ${H + o.t} * var(--z,1));background-color:${bBg(b)};${bPat(b).replace(/5cqw/g, 'calc(5cqw * var(--z,1))').replace(/6cqw/g, 'calc(6cqw * var(--z,1))')}">${moodInner(b, H)}</div>`; }
  return `<div class="mboard ${thumb ? 'thumb' : ''} ${bDark(b) ? 'dusk' : ''} ${S.bLink && !thumb ? 'linking' : ''}" data-bid="${b.id}" ${thumb ? '' : `data-board="${b.id}"`} style="height:calc(100cqw * ${H});background-color:${bBg(b)};${bPat(b)}">${b.items.filter((x) => x.t).map((x) => mbItem(b, x, thumb)).join('')}${(b.links || []).length ? '<svg class="mblinks" aria-hidden="true"></svg>' : ''}${mapRoots(b).map((r) => mapHtml(b, r, thumb)).join('')}</div>`; }
function moodInner(b, H) { return `<div class="mboard ${bDark(b) ? 'dusk' : ''} ${S.bLink ? 'linking' : ''}" data-bid="${b.id}" data-board="${b.id}" style="width:calc(100cqw * var(--z,1));height:calc(100cqw * ${H} * var(--z,1))">${b.items.filter((x) => x.t).map((x) => mbItem(b, x)).join('')}<svg class="mblinks" aria-hidden="true"></svg>${mapRoots(b).map((r) => mapHtml(b, r)).join('')}</div>`; }
// zoom: the board is drawn at its width times the zoom, so everything on it scales together; the point under my fingers (or the pointer) stays put
const BZ = [0.25, 4];
function bSetZoom(z, cx, cy) { const w = $('#mbwrap'), m = $('#main'); const bd = w && w.querySelector('.mboard'); if (!bd) return; z = Math.max(BZ[0], Math.min(BZ[1], z));
  const R = bd.getBoundingClientRect(), W = bd.clientWidth; if (cx == null) { const wr = w.getBoundingClientRect(); cx = wr.left + wr.width / 2; cy = Math.min(innerHeight, wr.bottom) / 2 + Math.max(0, wr.top) / 2; }
  const ux = (cx - R.left) / W, uy = (cy - R.top) / W; S.bZoom = z; w.style.setProperty('--z', z); bMaps();
  const R2 = bd.getBoundingClientRect(), W2 = bd.clientWidth; w.scrollLeft += R2.left + ux * W2 - cx; if (m) m.scrollTop += R2.top + uy * W2 - cy; S.bSL = w.scrollLeft;
  const lab = document.querySelector('.bzm .bzp'); if (lab) lab.textContent = Math.round(z * 100) + '%'; }
function moodWidth() { const m = document.querySelector('.mbwrap .mboard'); return m ? m.clientWidth : 340; }
const bTopZ = (b) => Math.max(0, ...b.items.map((x) => x.z || 1));
function bEmptySpot(w, h, near, skip) { const bd = document.querySelector('.mbwrap .mboard'), m = $('#main'); if (!bd) return null; const R = bd.getBoundingClientRect(), W = bd.clientWidth;
  const rs = [...bd.querySelectorAll(':scope > *:not(svg):not(.mbmap), .mmn')].filter((e) => !skip || !skip.contains(e)).map((e) => { const r = e.getBoundingClientRect(); return { l: r.left - R.left, t: r.top - R.top, r: r.right - R.left, b: r.bottom - R.top }; }).filter((r) => r.r > r.l);
  bd.querySelectorAll('.mbmap path, .mblinks path').forEach((pa) => { if (skip && skip.line && skip.line(pa)) return; let L = 0; try { L = pa.getTotalLength(); } catch (e) { return; } const M = pa.getScreenCTM(); if (!M) return;
    for (let i = 0; i <= L; i += 12) { const q = pa.getPointAtLength(i), x = M.a * q.x + M.c * q.y + M.e - R.left, y = M.b * q.x + M.d * q.y + M.f - R.top; rs.push({ l: x - 2, r: x + 2, t: y - 2, b: y + 2 }); } });
  const mr = m ? m.getBoundingClientRect() : { top: 0, bottom: innerHeight }; const top = Math.max(10, mr.top - R.top + 20), bot = Math.max(top + 40, Math.min(bd.clientHeight, mr.bottom - R.top) - 150);
  const n = near || { x: W / 2, y: top + 60 }, pad = 14, c = [];
  for (let y = top + h / 2; y <= bot - h / 2; y += 20) for (let x = w / 2 + 8; x <= W - w / 2 - 8; x += 20) c.push({ x, y, d: Math.hypot(x - n.x, (y - n.y) * 1.3) });
  c.sort((a, b) => a.d - b.d);
  const ok = (p) => rs.every((r) => p.x + w / 2 + pad < r.l || p.x - w / 2 - pad > r.r || p.y + h / 2 + pad < r.t || p.y - h / 2 - pad > r.b);
  const p = c.find(ok) || { x: W / 2, y: Math.max(top + 60, ...rs.map((r) => r.b + h / 2 + 30)) };
  return { x: p.x / W, y: p.y / W }; }
const viewTop = () => Math.max(0.05, (($('#main') || {}).scrollTop || 0) / moodWidth() + 0.2);
function bAdd(kind, at) { const b = curBoard(); if (!b) return; const before = bState(b); const id = uid('bi'); const y = at ? at.y : viewTop() + (b.items.length % 4) * 0.03;
  let it;
  if (kind === 'swatch') { const used = new Set(b.items.map((i) => i.col)); it = { id, t: 'swatch', x: at ? at.x - 0.1 : 0.4, y, w: 0.2, h: 0.2, col: MB_SW.find((c) => !used.has(c)) || MB_SW[0], text: '' }; }
  else if (kind === 'note') it = { id, t: 'note', x: at ? at.x - 0.2 : 0.29, y, w: 0.42, fs: 0.065, fill: '#F6E7A6', font: 'hand', r: -1.5, text: '' };
  else it = { id, t: 'text', x: at ? Math.max(0.02, Math.min(0.38, at.x - 0.05)) : 0.2, y, w: 0.6, fs: 0.06, text: '' };
  if (!at) { const W = moodWidth(), hh = kind === 'swatch' ? 0.24 : kind === 'note' ? 0.2 : 0.1; const sp = bEmptySpot(it.w * W, hh * W); if (sp) { it.x = Math.max(0.02, sp.x - it.w / 2); it.y = Math.max(0.02, sp.y - hh / 2); } }
  it.z = bTopZ(b) + 1; b.items.push(it); bTouch(b); save(); S.bSel = id; S.bPanel = null; render();
  if (kind === 'swatch') bPush(b, before); else bEditText(id, before); }
function bPhoto(bid, pic, ar) { const b = boardOf(bid); if (!b) return; const id = uid('bp'); const w = ar >= 1 ? 0.6 : 0.45; const n = b.items.length % 4;
  const before = bState(b); const ph = w / (ar || 1), W0 = moodWidth(), sp = bEmptySpot(w * W0, ph * W0); b.items.push(Object.assign({ id, t: 'photo', x: sp ? Math.max(0.02, sp.x - w / 2) : (1 - w) / 2 + (n - 1.5) * 0.04, y: sp ? Math.max(0.02, sp.y - ph / 2) : viewTop() - 0.05 + n * 0.04, w, h: ph, ar: ar || 1, z: bTopZ(b) + 1 }, pic));
  bPush(b, before); bTouch(b); save(); S.bSel = id; S.bPanel = null; render(); }
function bEditText(id, before) { const el = document.querySelector(`.mbi[data-id="${id}"] .mbtx`); if (!el) return; const b = curBoard();
  S.bEditBefore = before || (b && bState(b)); el.contentEditable = 'plaintext-only'; el.focus();
  const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); requestAnimationFrame(() => bFollow(el.closest('.mbi') || el)); }
['input', 'keyup'].forEach((ev) => document.addEventListener(ev, (e) => { const el = e.target; if (el && el.classList && el.classList.contains('mbtx') && el.isContentEditable) requestAnimationFrame(() => bFollow(el.closest('.mbi') || el)); }));
function bEndText(el) { const b = curBoard(); const box = el.closest('.mbi'); if (!b || !box) return; const x = b.items.find((i) => i.id === box.dataset.id); if (!x) return;
  el.contentEditable = 'false'; const t = el.innerText.replace(/\n$/, '').trim();
  if (!t && x.t !== 'swatch') { b.items = b.items.filter((i) => i !== x); if (S.bSel === x.id) S.bSel = null; } else { x.text = t; if (x.t !== 'swatch') x.h = box.offsetHeight / moodWidth(); }
  if (S.bEditBefore) bPush(b, S.bEditBefore); S.bEditBefore = null; bTouch(b); save(); render(); }

// dragging, resizing, turning (pointer events, so it works with a finger and a mouse), with snapping guides
let bDrag = null, bTap = null, bPan = null; const bPts = new Map();
// dragging something to the edge of what I can see: the board grows that way and scrolls along with me (the owner, 2026-11-12)
let bEdge = null;
document.addEventListener('pointermove', (e) => { if (!e.isTrusted) return; const on = (bDrag && bDrag.moved && !['turn', 'size', 'wide'].includes(bDrag.mode)) || (mDrag && mDrag.moved && !mDrag.pan); if (!on) { bEdge = null; return; } const st = !bEdge; bEdge = { x: e.clientX, y: e.clientY }; if (st) requestAnimationFrame(bEdgeTick); });
// the board takes its new size while I drag, so nothing jumps when I let go
function bGrowLive(b) { const bw = $('#mbwrap'), cv = bw && bw.querySelector('.mbcanvas'), bd = cv && cv.querySelector('.mboard'); if (!cv || !bd || !b) return; const H = moodHeight(b), o = bReach(b), Wu = bRight(b) + o.l;
  cv.style.setProperty('--ol', o.l); cv.style.setProperty('--ot', o.t); cv.style.width = `calc(100cqw * ${Wu} * var(--z,1))`; cv.style.height = `calc(100cqw * ${H + o.t} * var(--z,1))`; bd.style.height = `calc(100cqw * ${H} * var(--z,1))`;
  const mn = $('#main'), k = bw.clientWidth * (S.bZoom || 1); if (S.bOff && S.bOff.b === S.board) { if (o.l !== S.bOff.l) { bw.scrollLeft += (o.l - S.bOff.l) * k; S.bSL = bw.scrollLeft; } if (o.t !== S.bOff.t && mn) mn.scrollTop += (o.t - S.bOff.t) * k; } S.bOff = { b: S.board, l: o.l, t: o.t }; }
function bEdgeTick() { const on = (bDrag && bDrag.moved) || (mDrag && mDrag.moved && !mDrag.pan); if (!bEdge || !on) { bEdge = null; return; }
  const m = $('#main'), w = document.querySelector('.mbwrap'), cv = w && w.querySelector('.mbcanvas'); if (!m || !w || !cv) { bEdge = null; return; }
  const vv = window.visualViewport, mr = m.getBoundingClientRect(), wr = w.getBoundingClientRect(), dk = $('#bdock'), dr = dk && dk.getBoundingClientRect();
  const top = Math.max(mr.top, vv ? vv.offsetTop : 0); let bot = vv ? vv.offsetTop + vv.height : innerHeight; if (dr && dr.height && dr.top < bot && bEdge.y < dr.top) bot = dr.top;
  const E = 56, sp = 16, f = (v, lo, hi) => v > hi - E ? Math.min(1, (v - (hi - E)) / E) * sp : v < lo + E ? -Math.min(1, (lo + E - v) / E) * sp : 0;
  const vy = f(bEdge.y, top, bot), vx = f(bEdge.x, wr.left, wr.right);
  if (vy > 0 && m.scrollTop + vy > m.scrollHeight - m.clientHeight - 1) cv.style.minHeight = (cv.offsetHeight + vy + 2) + 'px';
  if (vx > 0 && w.scrollLeft + vx > w.scrollWidth - w.clientWidth - 1) cv.style.minWidth = (cv.offsetWidth + vx + 2) + 'px';
  const t0 = m.scrollTop, l0 = w.scrollLeft; if (vy) m.scrollTop += vy; if (vx) w.scrollLeft += vx; const dy = m.scrollTop - t0, dx = w.scrollLeft - l0;
  let ex = 0, ey = 0; if (bDrag) { if (vx < 0 && !dx) ex = vx; if (vy < 0 && !dy) ey = vy; } // at the left or top end the board grows that way under my finger
  if ((dx || dy || ex || ey) && bDrag) { bDrag.sx -= dx + ex; bDrag.sy -= dy + ey; document.dispatchEvent(new PointerEvent('pointermove', { clientX: bEdge.x, clientY: bEdge.y })); }
  requestAnimationFrame(bEdgeTick); }
function bPanStart(e) { bPts.set(e.pointerId, { x: e.clientX, y: e.clientY }); const w = $('#mbwrap'), m = $('#main');
  if (bPts.size === 2) { const [a, c] = [...bPts.values()]; bPan = { pinch: true, d0: Math.hypot(a.x - c.x, a.y - c.y) || 1, z0: S.bZoom || 1 }; return; }
  bPan = { sx: e.clientX, sy: e.clientY, l0: w ? w.scrollLeft : 0, t0: m ? m.scrollTop : 0, moved: false }; }
document.addEventListener('pointermove', (e) => { if (!bPan || !bPts.has(e.pointerId)) return; bPts.set(e.pointerId, { x: e.clientX, y: e.clientY }); const w = $('#mbwrap'), m = $('#main');
  if (bPan.pinch) { if (bPts.size < 2) return; const [a, c] = [...bPts.values()]; bSetZoom(bPan.z0 * Math.hypot(a.x - c.x, a.y - c.y) / bPan.d0, (a.x + c.x) / 2, (a.y + c.y) / 2); return; }
  if (!bPan.moved && Math.hypot(e.clientX - bPan.sx, e.clientY - bPan.sy) < 5) return; bPan.moved = true; bTap = null;
  if (w) { w.scrollLeft = bPan.l0 - (e.clientX - bPan.sx); S.bSL = w.scrollLeft; } if (m) m.scrollTop = bPan.t0 - (e.clientY - bPan.sy); });
const bPanEnd = (e) => { if (!bPts.has(e.pointerId)) return; bPts.delete(e.pointerId); if (!bPts.size) bPan = null; else if (bPan && bPan.pinch) { const [a] = [...bPts.values()]; const w = $('#mbwrap'), m = $('#main'); bPan = { sx: a.x, sy: a.y, l0: w ? w.scrollLeft : 0, t0: m ? m.scrollTop : 0, moved: true }; } };
document.addEventListener('pointerup', bPanEnd); document.addEventListener('pointercancel', bPanEnd);
// a touchpad pinch (and ctrl + wheel) zooms; a two-finger swipe moves around by itself
document.addEventListener('wheel', (e) => { if (!(e.target.closest && e.target.closest('#mbwrap'))) return; if (!(e.ctrlKey || e.metaKey)) return; e.preventDefault();
  bSetZoom((S.bZoom || 1) * Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.01)), e.clientX, e.clientY); }, { passive: false });
document.addEventListener('scroll', (e) => { if (e.target && e.target.id === 'mbwrap') S.bSL = e.target.scrollLeft; }, true);
function bPick(id) { S.bSel = id; S.bPanel = null; document.querySelectorAll('.mbi.sel,.mmn.sel').forEach((n) => n.classList.remove('sel')); const n = document.querySelector(`.mbi[data-id="${id}"],.mmn[data-id="${id}"]`); if (n) n.classList.add('sel'); bToolsOnly(); }
document.addEventListener('pointerdown', (e) => {
  const cv = e.target.closest && e.target.closest('.mbwrap .mbcanvas'); if (!cv) return; const board = cv.querySelector('.mboard'); if (!board) return;
  if (e.target.closest('.mmn,.mmc,.mblk,.mblh,.mmhit,.mmsnap')) return; // map words and connections handle themselves
  const box = e.target.closest('.mbi'); const b = curBoard(); if (!b) return;
  if (document.activeElement && document.activeElement.isContentEditable && !(box && box.contains(document.activeElement))) document.activeElement.blur();
  const W = board.clientWidth;
  if (!box) { // tap on the empty board: let go of the picked thing; a double tap writes text there
    const R = board.getBoundingClientRect(); const pt = { x: (e.clientX - R.left) / W, y: (e.clientY - R.top) / W }; const now = Date.now();
    if (bTap && now - bTap.t < 350 && Math.hypot(pt.x - bTap.x, pt.y - bTap.y) < 0.04) { bTap = null; e.preventDefault(); if (S.bMap) bBubbleAt(b, pt); else bAdd('text', pt); return; }
    bTap = { t: now, ...pt }; bPanStart(e); if (S.bSel || S.bPanel || S.bLink || S.bLk || S.bMulti || S.bLines) { S.bSel = null; S.bPanel = null; S.bLink = null; S.bLk = null; S.bMulti = null; S.bLines = null; S.bLnMulti = false; render(); } return; }
  if (e.target.closest('.mbtx') && e.target.closest('.mbtx').isContentEditable) return; // typing
  const x = b.items.find((i) => i.id === box.dataset.id); if (!x) return;
  const wasSel = S.bSel === x.id; if (!wasSel) bPick(x.id);
  if (x.lock) return;
  const mode = e.target.closest('.mbr') ? 'turn' : e.target.closest('.mbh') ? 'size' : e.target.closest('.mbw') ? 'wide' : 'move';
  const R = box.getBoundingClientRect(); const cx = R.left + R.width / 2, cy = R.top + R.height / 2;
  const others = [...board.querySelectorAll('.mbi')].filter((n) => n !== box && !n.style.transform).map((n) => ({ l: n.offsetLeft / W, t: n.offsetTop / W, w: n.offsetWidth / W, h: n.offsetHeight / W }));
  bDrag = { b, x, box, board, W, mode, sx: e.clientX, sy: e.clientY, cx, cy, x0: x.x, y0: x.y, w0: x.w, fs0: x.fs, h0: x.h, wu: box.offsetWidth / W, hu: box.offsetHeight / W, r0: x.r || 0,
    a0: Math.atan2(e.clientY - cy, e.clientX - cx), d0: Math.hypot(e.clientX - cx, e.clientY - cy) || 1, others, moved: false, wasSel, before: bState(b) };
  box.setPointerCapture(e.pointerId); e.preventDefault(); });
function bGuides(board, gx, gy, W) { board.querySelectorAll('.mbg').forEach((n) => n.remove());
  gx.forEach((v) => board.insertAdjacentHTML('beforeend', `<i class="mbg v" style="left:${v * 100}%"></i>`)); gy.forEach((v) => board.insertAdjacentHTML('beforeend', `<i class="mbg h" style="top:${v * W}px"></i>`)); }
document.addEventListener('pointermove', (e) => { const d = bDrag; if (!d) return;
  if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 4) return; if (!d.moved) { d.moved = true; d.box.style.zIndex = 9999; }
  const x = d.x, s = d.box.style;
  if (d.mode === 'turn') { let r = d.r0 + (Math.atan2(e.clientY - d.cy, e.clientX - d.cx) - d.a0) * 180 / Math.PI; r = ((r + 540) % 360) - 180;
    const sn = Math.round(r / 45) * 45; if (Math.abs(r - sn) < 5) r = sn; x.r = Math.round(r * 10) / 10; s.transform = x.r ? `rotate(${x.r}deg)` : ''; return; }
  if (d.mode === 'size') { const k = Math.max(0.15, Math.min(6, Math.hypot(e.clientX - d.cx, e.clientY - d.cy) / d.d0)); const w = Math.max(0.06, Math.min(1.6, d.w0 * k)); const kk = w / d.w0;
    x.w = w; x.x = d.x0 + (d.wu - d.wu * kk) / 2; x.y = d.y0 + (d.hu - d.hu * kk) / 2; s.width = w * 100 + '%'; s.left = x.x * 100 + '%'; s.top = `calc(100cqw * ${x.y})`;
    if (x.t === 'photo' || x.t === 'swatch') { x.h = d.h0 * kk; s.height = `calc(100cqw * ${x.h})`; if (x.t === 'swatch') s.fontSize = `calc(100cqw * ${x.w * 0.085})`; }
    else { x.fs = Math.max(0.02, d.fs0 * kk); s.fontSize = `calc(100cqw * ${x.fs})`; } return; }
  if (d.mode === 'wide') { x.w = Math.max(0.1, Math.min(1.2, d.w0 + (e.clientX - d.sx) / d.W)); s.width = x.w * 100 + '%'; return; }
  let nx = d.x0 + (e.clientX - d.sx) / d.W, ny = Math.max(-4, d.y0 + (e.clientY - d.sy) / d.W); const gx = [], gy = [];
  if (d.b.snap !== false && !x.r) { const th = 7 / d.W;
    const tx = [0.04, 0.5, 0.96], ty = []; d.others.forEach((o) => { tx.push(o.l, o.l + o.w / 2, o.l + o.w); ty.push(o.t, o.t + o.h / 2, o.t + o.h); });
    let best = null; [0, d.wu / 2, d.wu].forEach((off) => tx.forEach((t) => { const df = t - (nx + off); if (Math.abs(df) < th && (!best || Math.abs(df) < Math.abs(best.df))) best = { df, t }; }));
    if (best) { nx += best.df; gx.push(best.t); }
    best = null; [0, d.hu / 2, d.hu].forEach((off) => ty.forEach((t) => { const df = t - (ny + off); if (Math.abs(df) < th && (!best || Math.abs(df) < Math.abs(best.df))) best = { df, t }; }));
    if (best) { ny += best.df; gy.push(best.t); } }
  x.x = Math.max(-4, Math.min(12, nx)); x.y = ny; s.left = x.x * 100 + '%'; s.top = `calc(100cqw * ${x.y})`; bGuides(d.board, gx, gy, d.W); bGrowLive(d.b); });
document.addEventListener('pointerup', () => { const d = bDrag; if (!d) return; bDrag = null; d.board.querySelectorAll('.mbg').forEach((n) => n.remove());
  if (d.moved) { if (d.x.t === 'text' || d.x.t === 'note') d.x.h = d.box.offsetHeight / d.W; bPush(d.b, d.before); bTouch(d.b); save(); render(); return; }
  if (d.wasSel && d.x.t !== 'photo') bEditText(d.x.id); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && e.target.classList && e.target.classList.contains('mbtx') && e.target.isContentEditable) { e.preventDefault(); e.target.blur(); } });
document.addEventListener('focusout', (e) => { if (e.target.classList && e.target.classList.contains('mbtx') && e.target.isContentEditable) bEndText(e.target); });
// redraw only the header and the dock when the picked thing changes, so a drag can carry on
function bToolsOnly() { const b = curBoard(); if (!b) return; const w = document.createElement('div'); w.innerHTML = renderBoard();
  ['.bhd', '.bdock'].forEach((q) => { const o = document.querySelector(q), n = w.querySelector(q); if (o && n) o.replaceWith(n); }); bRowsMore(); }
// a row of choices that runs past the edge fades out there, so I can see there is more to scroll to
function bRowsMore() { document.querySelectorAll('#bdock .prow, #bdock .bdrow').forEach((r) => r.classList.toggle('more', r.scrollWidth - r.clientWidth - r.scrollLeft > 4)); }
addEventListener('scroll', (e) => { const r = e.target; if (r && r.classList && (r.classList.contains('prow') || r.classList.contains('bdrow')) && r.closest('#bdock')) r.classList.toggle('more', r.scrollWidth - r.clientWidth - r.scrollLeft > 4); }, true);
// layers: renumber so the order stays clean
function bArrange(b, x, how) { const L = b.items.slice().sort((p, q) => (p.z || 1) - (q.z || 1)); const i = L.indexOf(x); L.splice(i, 1);
  const j = how === 'front' ? L.length : how === 'back' ? 0 : how === 'fwd' ? Math.min(L.length, i + 1) : Math.max(0, i - 1); L.splice(j, 0, x); L.forEach((it, k) => { it.z = k + 1; }); }
// tidy: two neat columns in reading order
function bTidy(b) { const L = b.items.filter((x) => x.t).sort((p, q) => (p.y - q.y) || (p.x - q.x)); const m = 0.05, g = 0.04, cw = (1 - m * 2 - g) / 2; const col = [0.06, 0.06];
  L.forEach((x) => { const c = col[0] <= col[1] ? 0 : 1; const k = cw / x.w; x.x = m + c * (cw + g); x.y = col[c]; x.r = 0;
    if (x.t === 'photo' || x.t === 'swatch') x.h = x.h * k; else { x.fs = x.fs * Math.min(k, 1.4); x.h = (x.h || x.fs * 1.6) * Math.min(k, 1.4); } x.w = cw; col[c] += itemH(x) + g; }); }
function bFiles(files) { [...files].filter((f) => f.type.startsWith('image/')).forEach((f, i) => setTimeout(() => addPhoto(f, 'board:' + S.board), i * 250)); }
document.addEventListener('dragover', (e) => { if (e.target.closest && e.target.closest('.mbwrap')) e.preventDefault(); });
document.addEventListener('drop', (e) => { if (!(e.target.closest && e.target.closest('.mbwrap'))) return; e.preventDefault(); if (e.dataTransfer && e.dataTransfer.files.length) bFiles(e.dataTransfer.files); });
document.addEventListener('paste', (e) => { const b = curBoard(); if (!b || b.kind !== 'mood' || S.nbView !== 'board' || (document.activeElement && (document.activeElement.isContentEditable || document.activeElement.tagName === 'INPUT'))) return;
  const f = e.clipboardData && e.clipboardData.files; if (f && f.length) { e.preventDefault(); bFiles(f); } });

// ----- mind map: a tidy tree around the centre, branches coloured, smooth curves -----
const MM = { hg: 40, vg: 6, hv: 16, vv: 30, li: 16, pad: 30, lt: 10, lk: 16, lg: 4 };
let mmCtx = null;
// my own bubble look (x.st): shape, fill, border colour and thickness, font, size, bold, italic, text colour
const MM_FONT = { sans: 'Inter, system-ui, sans-serif', serif: 'Newsreader, Georgia, serif', hand: "'Caveat', cursive", mono: 'ui-monospace, Menlo, monospace' };
const MM_FCSS = { sans: 'var(--sans)', serif: 'var(--serif)', hand: "'Caveat',cursive", mono: 'var(--mono)' };
const mmBox = (st) => !!st && ((st.shape && st.shape !== 'none') || !!st.fill || +st.bw > 0);
function mmStyleDims(st, lvl) { const base = [17, 14.5, 13.5, 13.5, 14.5][lvl] || 14; const fs = (st.fs || base) * (st.font === 'hand' ? 1.25 : 1); const box = mmBox(st);
  return { fs, lh: Math.round(fs * 1.32), px: box ? 14 : 8, py: box ? 6 : 3, bw: box ? (st.bw == null ? 1.5 : +st.bw) : 0, wt: st.b ? 700 : [600, 500, 400, 400, 500][lvl] || 400 }; }
function mmM(x, lvl, extra) { const st = x && x.st; if (!st || !Object.keys(st).length) return mmMeasure(x.text, lvl, extra);
  mmCtx = mmCtx || document.createElement('canvas').getContext('2d'); const d = mmStyleDims(st, lvl);
  mmCtx.font = `${st.i ? 'italic ' : ''}${d.wt} ${d.fs}px ${MM_FONT[st.font || 'sans']}`; const lines = String(x.text || ' ').split('\n'); const w = Math.max(...lines.map((l) => mmCtx.measureText(l || ' ').width));
  let W = Math.ceil(Math.min(w, 220)) + d.px * 2 + d.bw * 2 + 2 + (extra || 0), H = lines.length * d.lh + d.py * 2 + d.bw * 2 + (w > 220 ? d.lh * Math.floor(w / 220) : 0);
  if (st.shape === 'circle') W = H = Math.max(W, H); return { w: W, h: H }; }
function mmStyleCss(st, lvl) { if (!st || !Object.keys(st).length) return ''; const d = mmStyleDims(st, lvl); const box = mmBox(st);
  const rad = { pill: '999px', round: '12px', square: '3px', circle: '50%' }[st.shape] || (box ? '12px' : '');
  return `;font-family:${MM_FCSS[st.font || 'sans']};font-size:${d.fs}px;line-height:${d.lh}px;font-weight:${d.wt};font-style:${st.i ? 'italic' : 'normal'};padding:${d.py}px ${d.px}px;justify-content:center;text-align:center`
    + (box ? `;background:${st.fill || 'var(--card)'};border:${d.bw}px solid ${st.bc || '#7A7368'};border-radius:${rad};box-shadow:none` : ';background:none;border:0;box-shadow:none')
    + (st.ink ? `;color:${st.ink}` : ''); }
function mmMeasure(text, lvl, extra) { mmCtx = mmCtx || document.createElement('canvas').getContext('2d');
  mmCtx.font = lvl === 0 ? '600 17px Inter, system-ui, sans-serif' : lvl === 1 || lvl === 4 ? '500 14.5px Inter, system-ui, sans-serif' : '13.5px Inter, system-ui, sans-serif';
  const lines = String(text || ' ').split('\n'); const w = Math.max(...lines.map((l) => mmCtx.measureText(l || ' ').width));
  const lh = lvl === 0 ? 22 : lvl === 1 || lvl === 4 ? 19 : 18; const px = [20, 8, 8, 8, 14][lvl], py = [12, 3, 2, 3, 7][lvl];
  return { w: Math.ceil(Math.min(w, 220)) + px * 2 + 2 + (extra || 0), h: lines.length * lh + py * 2 + (w > 220 ? lh * Math.floor(w / 220) : 0) }; }
const mmKids = (b, id) => b.items.filter((x) => x.parent === id);
function mmLevel(b, x) { let l = 0, p = x; while (p && p.parent) { p = b.items.find((i) => i.id === p.parent); l++; } return l; }
const mmCount = (b, id) => mmKids(b, id).reduce((a, k) => a + 1 + mmCount(b, k.id), 0);
const MMD = { r: 'Right', l: 'Left', u: 'Up', d: 'Down' };
const mmDir = (k) => k.dir || (k.side === 1 ? 'r' : k.side === -1 ? 'l' : '');
// a board can hold several maps: every item without a parent is the centre of its own map
function mindLayout(b, only) {
  const roots = only ? [only] : mapRoots(b); if (!roots.length) return null;
  const P = {}, col = {}; let yb = null; const trees = [];
  roots.forEach((root) => { const t = treeLayout(b, root, P, col); trees.push(t);
    let dx = 0, dy = 0; if (only) {} else if (root.ox != null) { dx = root.ox; dy = root.oy; } else if (yb != null) dy = yb + 80 - t.y0;
    t.ids.forEach((id) => { P[id].cx += dx; P[id].cy += dy; }); if (root.ox == null) yb = Math.max(yb == null ? -Infinity : yb, t.y1 + dy); });
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; Object.values(P).forEach((p) => { const e = p.l ? 26 : 0; x0 = Math.min(x0, p.cx - p.w / 2 - e); x1 = Math.max(x1, p.cx + p.w / 2 + e); y0 = Math.min(y0, p.cy - p.h / 2 - e); y1 = Math.max(y1, p.cy + p.h / 2 + e); });
  return { P, col, root: roots[0], roots, x0: x0 - MM.pad, y0: y0 - MM.pad, W: x1 - x0 + MM.pad * 2, H: y1 - y0 + MM.pad * 2 }; }
// free words (x.free) are left out of the tidy layout: they sit where I put them (dx, dy from their parent) and their own branches are laid out from them
function mmItems(b) { const G = (b.groups || []); if (!G.length) return b.items; const gs = new Map(G.map((g) => [g.id, g])); const out = [], seen = new Set();
  const own = new Set(b.items.filter((x) => !x.t && x.ls && G.some((g) => g.parent === x.id && b.items.some((i) => i.g === g.id && i.parent === x.id))).map((x) => x.id));
  b.items.forEach((i) => { if (own.has(i.id)) { out.push(Object.assign({}, i, { ls: undefined, ownLs: i.ls })); return; }
    const g = i.g && gs.get(i.g); if (!g || g.parent !== i.parent || i.free) { if (i.parent && own.has(i.parent) && !i.free) { const oid = 'g:own:' + i.parent; if (!seen.has(oid)) { seen.add(oid); out.push({ id: oid, parent: i.parent, text: '', ls: (b.items.find((x) => x.id === i.parent) || {}).ls, dir: 'd', virt: true }); } out.push(Object.assign({}, i, { parent: oid })); return; } out.push(i); return; }
    if (!seen.has(g.id)) { seen.add(g.id); out.push({ id: 'g:' + g.id, parent: g.parent, text: '', ls: g.ls || 'list', dir: g.dir, virt: true, at: g.at, iside: g.iside }); } out.push(Object.assign({}, i, { parent: 'g:' + g.id })); }); return out; }
function treeLayout(b, root, P, col, opt = {}) {
  const N = mmItems(b); const ids = []; const base = opt.base || (!root.parent && root.lv0) || 0; // a word cut off its line keeps the look it had (the owner, 2026-11-12)
  const all = (id) => { const x = N.find((i) => i.id === id); return x && x.fold && x.parent ? [] : N.filter((i) => i.parent === id); };
  const kids = (id) => all(id).filter((k) => !k.free);
  const look = (x, l) => x === root && root.pill && !root.parent ? 4 : Math.min(l, 2);
  const lvlOf = (x, l) => { ids.push(x.id); P[x.id] = x.virt ? { l, look: Math.min(l, 2), w: 0, h: 0, virt: true, pid: x.parent } : { l, look: look(x, l), ...mmM(x, look(x, l), x.done ? 20 : 0) }; kids(x.id).forEach((k) => lvlOf(k, x.virt ? l : l + 1)); }; lvlOf(root, base);
  // going up or down, a branch whose words have no branches of their own lists them underneath instead of in a wide row
  const isList = (x) => false && (() => { const ks = kids(x.id); return ks.length >= 2 && ks.every((k) => !kids(k.id).length); })();
  const sh = {}, sw = {}, bl = {}, br = {}, ct = {}, bk = {};
  const gH = (a, c) => a.virt || c.virt ? 20 : MM.vg, gW = (a, c) => a.virt || c.virt ? 30 : MM.hv;
  const stH = (L, f) => L.reduce((a, k, i) => a + f(k) + (i ? gH(L[i - 1], k) : 0), 0), stW = (L, f) => L.reduce((a, k, i) => a + f(k) + (i ? gW(L[i - 1], k) : 0), 0);
  const vsp = (x) => { const ks = kids(x.id); const sd = P[x.id].side; const ud = (k, d) => k.dir === d && (k.virt || x.parent); const opp = (k) => (k.virt || x.parent) && sd && (k.dir === 'l' && sd > 0 || k.dir === 'r' && sd < 0);
    return { S: mmByAt(ks.filter((k) => !ud(k, 'u') && !ud(k, 'd') && !opp(k))), O: mmByAt(ks.filter(opp)), U: mmByAt(ks.filter((k) => ud(k, 'u'))), D: mmByAt(ks.filter((k) => ud(k, 'd'))) }; };
  const subH = (x) => { const ks = kids(x.id); const own = P[x.id].h; if (x.ls && ks.length) { kids(x.id).forEach(subH); return (sh[x.id] = blk(x).h); }
    // a list going back toward the parent hangs just under the line coming in, and the word moves out to make room for it
    const { S, O, U, D } = vsp(x); const sH = stH(S, subH), oH = O.length ? stH(O, subH) : 0; const sa = Math.max(own / 2, sH / 2), sb = Math.max(own / 2, sH / 2, oH ? 12 + oH : 0);
    const ext = (L) => L.length ? MM.vv + Math.max(...L.map((k) => subH(k))) : 0; const uh = ext(U), dh = ext(D); Object.assign(P[x.id], { uh, sa, sb, oH, ow: O.length ? MM.hg + Math.max(...O.map(fanW)) : 0 });
    sh[x.id] = uh + sa + sb + dh; return sh[x.id]; };
  const hint = (k, sd) => { P[k.id].side = sd; const { S, O, U, D } = vsp(k); S.forEach((c) => hint(c, sd)); O.forEach((c) => hint(c, -sd)); U.concat(D).forEach((c) => hint(c, 1)); };
  const subW = (x) => { const ks = kids(x.id); const own = P[x.id].w; ks.forEach(subW); if (x.ls && ks.length) return (sw[x.id] = blk(x).w);
    const rk = x.parent ? ks.filter((c) => !['r', 'l', 'u'].includes(c.dir)) : ks; if (rk.length && !isList(x)) { const R = rowPos(rk); bl[x.id] = -R.lo; br[x.id] = R.hi; ct[x.id] = R.bx.map((q) => ({ l: q.l, r: q.r, t: q.t + P[x.id].h + MM.vv, b: q.b + P[x.id].h + MM.vv })); }
    const ub = x.parent ? ks.filter((c) => c.dir === 'u') : []; if (ub.length) { const R = rowPos(ub); const mh = Math.max(...ub.map((c) => P[c.id].h)); bk[x.id] = { l: R.lo, r: R.hi, t: -(MM.vv + mh), b: -MM.vv }; }
    sw[x.id] = !ks.length ? own : isList(x) ? Math.max(own, MM.li + Math.max(...ks.map((k) => P[k.id].w))) : Math.max(own, 2 * Math.max(bl[x.id] || 0, br[x.id] || 0)); return sw[x.id]; };
  // a row of branches only spreads as far as it must: words on the same row keep apart, and the rows of words underneath keep apart from each other
  const blk0 = (k) => (k.ls && kids(k.id).length) || isList(k), ownW = (k) => blk0(k) ? sw[k.id] : P[k.id].w;
  const hReach = (k) => { const ks = kids(k.id); return P[k.id].w + (ks.length ? MM.hg + Math.max(...ks.map(hReach)) : 0); };
  const sideR = (k, d) => { if (!k.parent || k.virt) return 0; const ks = kids(k.id).filter((c) => c.dir === d); return ks.length ? MM.hg + Math.max(...ks.map(hReach)) : 0; };
  const OL = (k) => blk0(k) ? sw[k.id] / 2 : P[k.id].w / 2 + sideR(k, 'l'), OR = (k) => blk0(k) ? sw[k.id] / 2 : P[k.id].w / 2 + sideR(k, 'r');
  const BL = (k) => blk0(k) ? sw[k.id] / 2 : bl[k.id] || 0, BR = (k) => blk0(k) ? sw[k.id] / 2 : br[k.id] || 0;
  // each word's outline as boxes (its own word, everything underneath, branches turned back above it), so rows only keep apart where they really meet
  const BOX = (k) => { if (k.virt && k.ls === 'list' && kids(k.id).length) { const w = sw[k.id], h = blk(k).h; return [k.iside === 'l' ? { l: -w, r: 0, t: 0, b: h } : { l: 0, r: w, t: 0, b: h }]; } if (blk0(k)) return [{ l: -sw[k.id] / 2, r: sw[k.id] / 2, t: 0, b: k.ls ? blk(k).h : P[k.id].h }]; const o = [{ l: -OL(k), r: OR(k), t: 0, b: P[k.id].h }]; if (bk[k.id]) o.push(bk[k.id]); return o.concat(ct[k.id] || []); };
  const roomOf = (L) => Math.max(0, ...L.map((k) => bk[k.id] ? -bk[k.id].t : 0));
  // the row keeps its middle under its word; each side only spreads outward as far as it must
  const rowPos = (L) => { const n = L.length; if (!n) return { pos: [], lo: 0, hi: 0, c: 0, bx: [] };
    const ideal = [0]; for (let i = 1; i < n; i++) ideal.push(ideal[i - 1] + ownW(L[i - 1]) / 2 + gW(L[i - 1], L[i]) + ownW(L[i]) / 2);
    const c0 = (ideal[0] - ownW(L[0]) / 2 + ideal[n - 1] + ownW(L[n - 1]) / 2) / 2; const pos = ideal.map((v) => v - c0);
    const BX = L.map(BOX); const need = (j, i) => { let m = 0; BX[j].forEach((a) => BX[i].forEach((q) => { if (a.t < q.b && q.t < a.b) m = Math.max(m, a.r + gW(L[j], L[i]) - q.l); })); return m; }; // room between j (left) and i (right) wherever they sit at the same height
    const mL = Math.floor((n - 1) / 2), mR = Math.ceil((n - 1) / 2);
    if (mL !== mR) { const d = need(mL, mR) - (pos[mR] - pos[mL]); if (d > 0) { pos[mL] -= d / 2; pos[mR] += d / 2; } }
    for (let i = mR + 1; i < n; i++) { let at = pos[i]; for (let j = mR; j < i; j++) at = Math.max(at, pos[j] + need(j, i)); pos[i] = at; }
    for (let i = mL - 1; i >= 0; i--) { let at = pos[i]; for (let j = mL; j > i; j--) at = Math.min(at, pos[j] - need(i, j)); pos[i] = at; }
    let d = 0; for (let j = 0; j <= mL; j++) for (let i = mR; i < n; i++) if (i !== j) d = Math.max(d, pos[j] + need(j, i) - pos[i]);
    if (d > 0) for (let i = 0; i < n; i++) { if (i < mR) pos[i] -= d / 2; if (i > mL) pos[i] += d / 2; }
    const rm = roomOf(L); const bx = []; BX.forEach((A, i) => A.forEach((q) => bx.push({ l: q.l + pos[i], r: q.r + pos[i], t: q.t + rm, b: q.b + rm })));
    let lo = Infinity, hi = -Infinity; bx.forEach((q) => { lo = Math.min(lo, q.l); hi = Math.max(hi, q.r); });
    return { pos, lo, hi, c: 0, bx }; };
  // list styles I chose for a word's branches: 'list' hangs them underneath on a line, 'row' sets them side by side below
  const BK = {}; const fanW = (x) => x.ls && kids(x.id).length ? blk(x).w : P[x.id].w + (kids(x.id).length ? MM.hg + Math.max(...kids(x.id).map(fanW)) : 0);
  function blk(x, as) { const key = x.id + (as || ''); if (BK[key]) return BK[key]; const st = as || x.ls; const p = P[x.id]; const ks = kids(x.id); let r;
    if (st === 'list') { const bx = ks.map((c) => c.ls && kids(c.id).length ? blk(c) : { w: fanW(c), h: subH(c) });
      r = { w: Math.max(p.w, ks.length ? (p.virt ? 0 : MM.lt) + MM.lk + Math.max(...bx.map((q) => q.w)) : 0), h: p.h + (ks.length ? MM.lg + bx.reduce((a, q) => a + q.h, 0) + MM.vg * (ks.length - 1) : 0), bx }; }
    else { const vH = (c) => P[c.id].h + (kids(c.id).length ? MM.vv + Math.max(...kids(c.id).map(vH)) : 0); const bx = ks.map((c) => c.ls && kids(c.id).length ? blk(c) : kids(c.id).length ? { w: sw[c.id] || P[c.id].w, h: vH(c) } : { w: P[c.id].w, h: P[c.id].h });
      const R = rowPos(ks); const tw = R.hi - R.lo; r = { w: Math.max(p.w, tw), h: p.h + (ks.length ? (p.virt ? 12 : MM.vv) + Math.max(...bx.map((q) => q.h)) : 0), bx, tw, R }; }
    r.st = st; return (BK[key] = r); }
  function placeBlk(x, mx, my, as) { const B = blk(x, as); const p = P[x.id]; const ks = kids(x.id); if (!ks.length) return;
    if (B.st === 'list') { const br = p.virt && p.fan && my > 0; const tx = p.cx - mx * (p.w / 2 - (p.virt ? 0 : MM.lt)); let y = br ? p.cy - (B.h - MM.lg) / 2 : p.cy + my * (p.h / 2 + MM.lg);
      ks.forEach((c, i) => { const q = P[c.id], bq = B.bx[i]; const lsd = c.ls && kids(c.id).length; q.cx = q.virt ? tx : tx + mx * (MM.lk + q.w / 2); q.cy = lsd ? y + my * q.h / 2 : y + my * (q.sa != null ? (my > 0 ? (q.uh || 0) + q.sa : bq.h - (q.uh || 0) - q.sa) : bq.h / 2); y += my * (bq.h + MM.vg);
        q.side = mx; q.dir = mx > 0 ? 'r' : 'l'; delete q.vs; q.el = { x: tx, y0: p.cy + my * p.h / 2, mx, my: br ? (q.cy >= p.cy ? 1 : -1) : my };
        if (lsd) placeBlk(c, mx, my); else if (kids(c.id).length) placeKids(c, mx); }); return; }
    const sideRow = p.virt && p.fan; const ox = sideRow ? (p.side > 0 ? p.cx - B.R.lo : p.cx - B.R.hi) : p.cx; const ytop = p.cy + my * (p.virt ? 12 : p.h / 2 + MM.vv);
    ks.forEach((c, i) => { const q = P[c.id], bq = B.bx[i]; const asL = !(c.ls && kids(c.id).length) && kids(c.id).length; const left = c.ls === 'list' && kids(c.id).length;
      q.cx = left ? ox + B.R.pos[i] - sw[c.id] / 2 + q.w / 2 : ox + B.R.pos[i]; q.cy = ytop + my * q.h / 2; q.side = 0; q.vs = my; q.dir = my > 0 ? 'd' : 'u'; q.bus = { x: p.cx, y0: p.cy + my * p.h / 2, y: p.virt ? p.cy : p.cy + my * (p.h / 2 + MM.vv / 2) };
      if (c.ls && kids(c.id).length) placeBlk(c, 1, my); else if (asL) placeUnder(c, my); }); }
  const top = kids(root.id); top.forEach((k) => { subH(k); subW(k); });
  // main branches I gave a direction keep it; the rest are split in order over the sides so every side carries about the same
  const G = { r: [], l: [], u: [], d: [] }, acc = { r: 0, l: 0, u: 0, d: 0 };
  const lay = opt.side ? 'side' : root.layout || b.layout; const sides = opt.side ? [opt.side] : lay === 'right' ? ['r'] : lay === 'all' ? ['r', 'd', 'l', 'u'] : ['r', 'l'];
  const cost = (k, d) => d === 'r' || d === 'l' ? sh[k.id] + MM.vg : (sw[k.id] + MM.hv) * 0.5;
  top.forEach((k) => { const d = mmDir(k); if (d) { G[d].push(k); acc[d] += cost(k, d); } });
  const free = top.filter((k) => !mmDir(k)); const n = free.length;
  const seg = (a, z, d) => { let s = 0; for (let i = a; i < z; i++) s += cost(free[i], d); return s; };
  let best = null; const tryCuts = (cuts) => { const bounds = [0, ...cuts, n]; let worst = 0; sides.forEach((d, i) => { const v = acc[d] + seg(bounds[i], bounds[i + 1], d); worst += v * v; }); if (!best || worst < best.w - 0.01) best = { w: worst, bounds }; };
  if (sides.length === 1) tryCuts([]); else if (sides.length === 2) { for (let a = 0; a <= n; a++) tryCuts([a]); }
  else for (let a = 0; a <= n; a++) for (let c = a; c <= n; c++) for (let e = c; e <= n; e++) tryCuts([a, c, e]);
  sides.forEach((d, i) => { for (let j = best.bounds[i]; j < best.bounds[i + 1]; j++) G[d].push(free[j]); });
  ['r', 'l', 'u', 'd'].forEach((d) => { G[d] = mmByAt(top.filter((k) => G[d].includes(k))); });
  G.r.forEach((k) => hint(k, 1)); G.l.forEach((k) => hint(k, -1)); G.u.concat(G.d).forEach((k) => hint(k, 1)); Object.keys(BK).forEach((q) => delete BK[q]); top.forEach((k) => { subH(k); subW(k); });
  const rp = P[root.id]; rp.cx = 0; rp.cy = 0;
  const wW0 = (list) => list.reduce((a, k) => a + sw[k.id], 0) + MM.hv * Math.max(0, list.length - 1);
  const crowded = lay === 'all' && (G.l.length || G.r.length) && (wW0(G.u) / 2 > rp.w / 2 + MM.hg - 6 || wW0(G.d) / 2 > rp.w / 2 + MM.hg - 6);
  if (['circle', 'spiral', 'fan', 'bloom'].includes(lay) || crowded) { radial(); return finish(); }
  // a circle: main branches go round the centre in order, each gets a slice the size of what hangs from it, and every ring sits clear of the one inside it
  function radial() {
    ids.forEach((id) => { const p = P[id]; p.rad = true; if (p.l >= 2 && !p.virt) Object.assign(p, mmM(N.find((i) => i.id === id), 3, N.find((i) => i.id === id).done ? 20 : 0)); });
    // a list's joint sits on its word in a circle; the list's words go round like any branch
    const rk = (id) => kids(id).flatMap((k) => P[k.id].virt ? kids(k.id) : [k]); const vids = ids.filter((id) => P[id].virt); const pOf = {}; N.forEach((i) => { pOf[i.id] = i.parent; });
    const realP = (id) => { let q = pOf[id]; while (q && P[q] && P[q].virt) q = pOf[q]; return q; };
    const wt = {}; const leafs = (x) => { const ks = rk(x.id); wt[x.id] = ks.length ? ks.reduce((a, k) => a + leafs(k), 0) : 1; return wt[x.id]; }; leafs(root);
    const ang = {}; const give = (x, a0, a1) => { const ks = rk(x.id); let a = a0; ks.forEach((k) => { const span = (a1 - a0) * wt[k.id] / wt[x.id]; ang[k.id] = { a: a + span / 2, span }; give(k, a, a + span); a += span; }); };
    // the other round spreads: a fan opens downward in a half circle, a spiral winds outward, a bloom sets every other branch further out like petals
    if (lay === 'fan') give(root, Math.PI * 0.06, Math.PI * 0.94); else give(root, -Math.PI / 2, Math.PI * 1.5);
    const topOf = (id) => { let q = id; while (q && realP(q) && realP(q) !== root.id) q = realP(q); return q; }; const topI = {}; rk(root.id).forEach((k, i) => { topI[k.id] = i; });
    const fr = (id) => lay === 'spiral' ? 0.45 + 1.1 * (P[id].ang + Math.PI / 2) / (Math.PI * 2) : lay === 'bloom' ? (topI[topOf(id)] % 2 ? 1.55 : 0.85) : 1;
    const rl = {}; const lv = (id) => rl[id] != null ? rl[id] : (rl[id] = id === root.id ? 0 : lv(realP(id)) + 1);
    const byL = {}; ids.forEach((id) => { if (id !== root.id && !P[id].virt) (byL[lv(id)] = byL[lv(id)] || []).push(id); });
    const rho = (p, a) => Math.abs(p.w / 2 * Math.cos(a)) + Math.abs(p.h / 2 * Math.sin(a)), tau = (p, a) => Math.abs(p.w / 2 * Math.sin(a)) + Math.abs(p.h / 2 * Math.cos(a));
    let rPrev = 0, outPrev = Math.max(rp.w, rp.h) / 2 * 0.8;
    Object.keys(byL).map(Number).sort((a, c) => a - c).forEach((l) => { const L = byL[l];
      const inner = Math.max(...L.map((id) => rho(P[id], ang[id].a))); let r = rPrev + outPrev + inner + (l === 1 ? 34 : 26);
      L.forEach((id) => { const g = ang[id]; r = Math.max(r, (2 * tau(P[id], g.a) + 12) / Math.max(0.05, 2 * Math.sin(Math.min(Math.PI / 2, g.span / 2)))); });
      L.forEach((id) => { const p = P[id], a = ang[id].a; p.r = r; p.ang = a; p.side = 0; p.dir = Math.abs(Math.cos(a)) > 0.7 ? (Math.cos(a) > 0 ? 'r' : 'l') : (Math.sin(a) > 0 ? 'd' : 'u'); });
      rPrev = r; outPrev = Math.max(...L.map((id) => rho(P[id], ang[id].a))); });
    // then make sure no bubble touches another bubble or sits on a line: if one does, the rings move out a little and I check again
    const others = ids.filter((id) => id !== root.id && !P[id].virt); const rids = ids.filter((id) => !P[id].virt); const box = (p, g) => [p.cx - p.w / 2 - g, p.cy - p.h / 2 - g, p.cx + p.w / 2 + g, p.cy + p.h / 2 + g];
    const hit = (A, B) => A[0] < B[2] && B[0] < A[2] && A[1] < B[3] && B[1] < A[3]; const inB = (x, y, B) => x > B[0] && x < B[2] && y > B[1] && y < B[3];
    const par = {}; ids.forEach((id) => { const it = N.find((i) => i.id === id); par[id] = it.parent; });
    for (let k = 1, it = 0; it < 40; it++, k *= 1.07) {
      others.forEach((id) => { const p = P[id], f = fr(id); p.cx = p.r * k * f * Math.cos(p.ang); p.cy = p.r * k * f * Math.sin(p.ang); });
      vids.forEach((id) => { const v = P[id], q = P[realP(id)]; Object.assign(v, { cx: q.cx, cy: q.cy, w: q.w, h: q.h, rad: true, ang: q.ang || 0 }); });
      let bad = false;
      for (let i = 0; i < rids.length && !bad; i++) for (let j = i + 1; j < rids.length && !bad; j++) if (hit(box(P[rids[i]], 5), box(P[rids[j]], 5))) bad = true;
      for (let i = 0; i < others.length && !bad; i++) { const id = others[i]; const pts = mmCurve(P[par[id]], P[id]);
        for (const q of rids) { if (q === id || q === par[id] || q === realP(id)) continue; const B = box(P[q], 2); if (pts.some(([x, y]) => inB(x, y, B))) { bad = true; break; } } }
      if (!bad) break; } }
  function finish() {
    // words I've pinned (by moving something else) stay exactly where they were next to their parent
    const shift = (id, dx, dy, top, seenE = new Set()) => { const p = P[id]; p.cx += dx; p.cy += dy; (top ? [] : [p.el, p.bus]).forEach((e) => { if (e && !seenE.has(e)) { seenE.add(e); e.x += dx; e.y0 += dy; if (e.y != null) e.y += dy; } }); kids(id).forEach((k) => shift(k.id, dx, dy, false, seenE)); };
    if (false) ids.forEach((id) => { const x = N.find((i) => i.id === id); if (!x || !x.pin || x.pin[2] !== x.parent || !P[x.parent] || !P[id]) return; const p = P[id], q = P[x.parent]; const dx = q.cx + x.pin[0] - p.cx, dy = q.cy + x.pin[1] - p.cy; if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) shift(id, dx, dy, String(x.parent).startsWith('g:')); });
    // then anything not pinned is pushed clear of the words around it, along the way its branch grows
    const pinOk = (x) => x && x.pin && x.pin[2] === x.parent; if (false && ids.some((id) => pinOk(N.find((i) => i.id === id)))) {
      const subOf = (id) => { const out = [id]; kids(id).forEach((k) => out.push(...subOf(k.id))); return out; };
      const bx = (id) => { const p = P[id]; return !p || p.virt || p.cx == null ? null : [p.cx - p.w / 2 - 8, p.cy - p.h / 2 - 5, p.cx + p.w / 2 + 8, p.cy + p.h / 2 + 5]; };
      const units = ids.filter((id) => { if (id === root.id) return false; const x = N.find((i) => i.id === id); if (!x || pinOk(x)) return false; const par = N.find((i) => i.id === x.parent); return !par || par.id === root.id || pinOk(par) || (par.virt && pinOk(par)); });
      units.forEach((u) => { const S = new Set(subOf(u)); const p = P[u]; const hz = !!p.vs; const isMem = String((N.find((i) => i.id === u) || {}).parent).startsWith('g:');
        for (let n = 0; n < 80; n++) { let hit = null; for (const id of ids) { if (S.has(id)) continue; const o = bx(id); if (!o) continue; for (const sid of S) { const m = bx(sid); if (m && m[0] < o[2] && m[2] > o[0] && m[1] < o[3] && m[3] > o[1]) { hit = [m, o]; break; } } if (hit) break; }
          if (!hit) break; const [m, o] = hit; const sg = hz ? ((m[0] + m[2]) / 2 >= (o[0] + o[2]) / 2 ? 1 : -1) : ((m[1] + m[3]) / 2 >= (o[1] + o[3]) / 2 ? 1 : -1);
          const amt = hz ? (sg > 0 ? o[2] - m[0] : o[0] - m[2]) + sg * 2 : (sg > 0 ? o[3] - m[1] : o[1] - m[3]) + sg * 2; shift(u, hz ? amt : 0, hz ? 0 : amt, isMem); } }); }
    const pal = mmTheme(root.theme ? root : b).c; const paint = (x, c) => { c = x.col || c; col[x.id] = c; kids(x.id).forEach((y) => paint(y, c)); };
    if (opt.col || (!root.parent && root.c0)) paint(root, opt.col || root.c0); else { top.forEach((k, i) => paint(k, pal[i % pal.length])); if (root.pill) col[root.id] = root.col || pal[[...root.id].reduce((a, ch) => a + ch.charCodeAt(0), 0) % pal.length]; }
    if (opt.side) P[root.id].side = opt.side === 'r' ? 1 : -1;
    // then the free words: placed where I put them, each with its own little tidy tree
    let nf = 0; ids.slice().forEach((id) => { all(id).filter((f) => f.free).forEach((f) => { const par = P[id];
      const fc = id === root.id && !opt.col ? f.col || pal[(top.length + nf++) % pal.length] : col[id];
      const sub = treeLayout(b, f, P, col, { base: par.l + 1, side: f.fside || ((f.dx || 0) >= 0 ? 'r' : 'l'), col: fc });
      const ox = par.cx + (f.dx || 60), oy = par.cy + (f.dy || 0); sub.ids.forEach((q) => { P[q].cx += ox; P[q].cy += oy; }); P[f.id].free = true; ids.push(...sub.ids); }); });
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; ids.forEach((id) => { const p = P[id]; x0 = Math.min(x0, p.cx - p.w / 2); x1 = Math.max(x1, p.cx + p.w / 2); y0 = Math.min(y0, p.cy - p.h / 2); y1 = Math.max(y1, p.cy + p.h / 2); });
    return { root, ids, x0, y0, x1, y1 }; }
  const placeH = (list, side, px, cy, pw) => { const H = stH(list, (k) => sh[k.id]); let y = list.length === 1 && list[0].virt && list[0].ls === 'row' && kids(list[0].id).length ? cy : cy - H / 2;
    list.forEach((k, ki) => { if (ki) y += gH(list[ki - 1], k); const p = P[k.id]; const b2 = k.ls && kids(k.id).length; p.side = side; p.vs = 0; p.fan = true; p.dir = side > 0 ? 'r' : 'l'; p.cy = b2 && !(p.virt && k.ls === 'list') ? y + p.h / 2 : y + (p.uh || 0) + (p.sa != null ? p.sa : sh[k.id] / 2); p.cx = side > 0 ? px + pw / 2 + MM.hg + (p.ow || 0) + p.w / 2 : px - pw / 2 - MM.hg - (p.ow || 0) - p.w / 2; y += sh[k.id];
      if (b2) placeBlk(k, side, k.virt && k.ls === 'row' && k.iside === 'u' ? -1 : 1); else placeKids(k, side); }); };
  function placeKids(k, side) { const p = P[k.id]; const { S, O, U, D } = vsp(k); placeH(S, side, p.cx, p.cy, p.w); if (O.length) placeH(O, -side, p.cx, p.cy + 12 + p.oH / 2, p.w); if (U.length) placeV(U, -1, p.cx, p.cy, 2 * (p.sa || p.h / 2), p.w); if (D.length) placeV(D, 1, p.cx, p.cy, 2 * (p.sb || p.h / 2), p.w); }
  const placeV = (list, vs, cx, py, ph, pw) => { const R = rowPos(list); const back = vs > 0 ? 'u' : 'd'; // branches I turned back toward the parent get room between the rows
    const room = Math.max(0, ...list.map((k) => { if (k.virt || (k.ls && kids(k.id).length)) return 0; const bb = kids(k.id).filter((c) => c.dir === back); return bb.length ? Math.max(...bb.map((c) => P[c.id].h)) + MM.vv : 0; }));
    list.forEach((k, ki) => { const p = P[k.id]; p.side = 0; p.vs = vs; p.dir = vs > 0 ? 'd' : 'u'; const slot = cx + R.pos[ki] - R.c;
      p.cy = py + vs * (ph / 2 + (k.virt && k.ls === 'list' && list.length === 1 && pw ? (ph > 60 ? 12 : 2) : MM.vv) + room + p.h / 2); const ks = kids(k.id);
      if (k.virt && k.ls === 'list' && ks.length) { const L = k.iside === 'l' ? -1 : 1; // the list's line runs straight on from where it leaves the word; its items sit on the side I chose
        const pi = b.items.find((i) => i.id === k.parent); const ax = P[k.parent] ? mmAnchor(P[k.parent], vs > 0 ? 'd' : 'u', +k.at || 0, pi ? mmShape(pi) : 'rect')[0] : slot; p.cx = (list.length === 1 ? ax : slot) + L * p.w / 2; placeBlk(k, L, vs); }
      else if (k.ls && ks.length) { p.cx = k.ls === 'list' ? slot - sw[k.id] / 2 + p.w / 2 : slot; placeBlk(k, 1, vs); }
      else if (isList(k)) { const left = slot - sw[k.id] / 2; p.cx = left + p.w / 2; let y = p.cy + vs * (p.h / 2 + 10); const ord = vs < 0 ? ks.slice().reverse() : ks;
        ord.forEach((c) => { const q = P[c.id]; q.side = 0; q.vs = vs; q.list = true; q.dir = p.dir; q.cx = left + MM.li + q.w / 2; q.cy = y + vs * q.h / 2; y += vs * (q.h + 3); }); }
      else { p.cx = slot; placeUnder(k, vs); } }); };
  function placeUnder(k, vs) { const p = P[k.id]; const ks = kids(k.id); if (!ks.length) return; const back = vs > 0 ? 'u' : 'd'; // a word's own branches can go to its sides or back the other way when I snap them there
    const Rk = ks.filter((c) => c.dir === 'r'), Lk = ks.filter((c) => c.dir === 'l'), Bk = ks.filter((c) => c.dir === back), Fk = ks.filter((c) => !['r', 'l', back].includes(c.dir));
    if (Rk.length) placeH(mmByAt(Rk), 1, p.cx, p.cy, p.w); if (Lk.length) placeH(mmByAt(Lk), -1, p.cx, p.cy, p.w); if (Bk.length) placeV(mmByAt(Bk), -vs, p.cx, p.cy, p.h); if (Fk.length) placeV(mmByAt(Fk), vs, p.cx, p.cy, p.h); }
  if ((N.find((i) => i.id === root.id) || root).ls && top.length) { placeBlk(N.find((i) => i.id === root.id) || root, opt.side === 'l' ? -1 : 1, 1); return finish(); }
  placeH(G.r, 1, 0, 0, rp.w); placeH(G.l, -1, 0, 0, rp.w);
  // rows going up or down clear the side branches when they are wide enough to reach them
  const hH = (list) => stH(list, (k) => sh[k.id]);
  const wW = (list) => stW(list, (k) => sw[k.id]);
  // how far the side branches reach up and down, so rows going up or down clear them
  let eu = rp.h / 2, ed = rp.h / 2; ids.forEach((id) => { const p = P[id]; if (id === root.id || p.cx == null || p.w === 0 && p.h === 0) return; eu = Math.max(eu, -(p.cy - p.h / 2) + 6); ed = Math.max(ed, p.cy + p.h / 2 + 6); });
  const reach = (list, vs) => wW(list) / 2 > rp.w / 2 + MM.hg - 6 ? (vs < 0 ? eu : ed) : rp.h / 2;
  placeV(G.u, -1, 0, 0, reach(G.u, -1) * 2, rp.w); placeV(G.d, 1, 0, 0, reach(G.d, 1) * 2, rp.w);
  return finish(); }
// points along the curve from a word to its branch in a circle map (the same curve that gets drawn)
function mmCurveCtl(q, p) { const k = Math.hypot(p.cx - q.cx, p.cy - q.cy) * 0.45; const ca = Math.cos(p.ang), sa = Math.sin(p.ang); const f = q.l ? 1 : 0.6;
  return [q.cx, q.cy, q.cx + ca * k * f, q.cy + sa * k * f, p.cx - ca * k, p.cy - sa * k, p.cx, p.cy]; }
function mmCurve(q, p) { const [x0, y0, x1, y1, x2, y2, x3, y3] = mmCurveCtl(q, p); const out = [];
  for (let i = 1; i < 20; i++) { const t = i / 20, u = 1 - t; out.push([u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3]); } return out; }
// a soft curve between the edges of two bubbles (free words and my own connections)
// one arrow head everywhere: a slim filled point, sized to the line, a touch past the line's end so no line shows through
const mmHeadLen = (w) => Math.round((7 + w * 2.2) * 10) / 10;
function mmHead(x, y, a, w) { const L = mmHeadLen(w), hw = L * 0.34, ux = Math.cos(a), uy = Math.sin(a); const tx = x + ux * w * 0.6, ty = y + uy * w * 0.6, bx = tx - ux * L, by = ty - uy * L, nx = bx + ux * L * 0.18, ny = by + uy * L * 0.18;
  return `M${tx} ${ty}L${bx - uy * hw} ${by + ux * hw}L${nx} ${ny}L${bx + uy * hw} ${by - ux * hw}Z`; }
function mmEdgeS(p, tx, ty) { const hw = p.w / 2, hh = p.h / 2;
  if (p.shp === 'circle') { const R0 = Math.min(hw, hh) + 2, a = Math.atan2(ty - p.cy, tx - p.cx); return [p.cx + R0 * Math.cos(a), p.cy + R0 * Math.sin(a)]; }
  const e = mmEdge(p, tx, ty); if (p.shp === 'pill' && Math.abs(e[0] - p.cx) > hw - hh) { const ccx = p.cx + Math.sign(e[0] - p.cx) * (hw - hh), a = Math.atan2(ty - p.cy, tx - ccx); return [ccx + (hh + 2) * Math.cos(a), p.cy + (hh + 2) * Math.sin(a)]; } return e; }
function mmEdge(p, tx, ty) { const dx = tx - p.cx, dy = ty - p.cy; if (!dx && !dy) return [p.cx, p.cy]; const k = Math.min(dx ? (p.w / 2 + 2) / Math.abs(dx) : Infinity, dy ? (p.h / 2 + 2) / Math.abs(dy) : Infinity); return [p.cx + dx * k, p.cy + dy * k]; }
function mmFreePts(q, p) { const ddx = p.cx - q.cx, ddy = p.cy - q.cy; const hz = Math.abs(ddx) - (q.w + p.w) / 2 > 24 || Math.abs(ddx) >= Math.abs(ddy) * 1.2;
  const sx = Math.sign(ddx) || 1, sy = Math.sign(ddy) || 1;
  const [ax, ay, bx, by] = hz ? [q.cx + sx * q.w / 2, q.cy, p.cx - sx * p.w / 2, p.cy] : [q.cx, q.cy + sy * q.h / 2, p.cx, p.cy - sy * p.h / 2]; const dx = bx - ax, dy = by - ay;
  return hz ? [ax, ay, ax + dx * 0.55, ay, bx - dx * 0.55, by, bx, by] : [ax, ay, ax, ay + dy * 0.55, bx, by - dy * 0.55, bx, by]; }
function mmFreePath(q, p, X = (v) => v, Y = (v) => v) { const [ax, ay, c1x, c1y, c2x, c2y, bx, by] = mmFreePts(q, p);
  return `M${X(ax)} ${Y(ay)}C${X(c1x)} ${Y(c1y)} ${X(c2x)} ${Y(c2y)} ${X(bx)} ${Y(by)}`; }
function mmElb(pts) { const r0 = 4; let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) { const [x, y] = pts[i]; if (i === pts.length - 1) { d += `L${x} ${y}`; break; } const [px, py] = pts[i - 1], [nx, ny] = pts[i + 1];
    const l1 = Math.hypot(x - px, y - py), l2 = Math.hypot(nx - x, ny - y); if (l1 < 0.5 || l2 < 0.5) continue; const r = Math.min(r0, l1 / 2, l2 / 2);
    d += `L${x - (x - px) / l1 * r} ${y - (y - py) / l1 * r}Q${x} ${y} ${x + (nx - x) / l2 * r} ${y + (ny - y) / l2 * r}`; } return d; }
// snap points: where a line may leave or meet a bubble, following its shape
function mmShape(x) { const st = x.st || {}; if (st.shape === 'circle') return 'circle'; if (st.shape === 'pill' || (!st.shape && !x.parent && x.pill)) return 'pill'; return 'rect'; }
function mmAnchor(q, side, at, shp) { const hw = q.w / 2, hh = q.h / 2; at = +at || 0;
  if (shp === 'circle') { const R0 = Math.min(hw, hh), a = (({ r: 0, d: 90, l: 180, u: 270 })[side] + (side === 'd' || side === 'l' ? -1 : 1) * at * 60) * Math.PI / 180; return [q.cx + R0 * Math.cos(a), q.cy + R0 * Math.sin(a)]; }
  if (side === 'u' || side === 'd') { const ins = shp === 'pill' ? hh : 7; return [q.cx + at * Math.max(0, hw - ins), q.cy + (side === 'd' ? hh : -hh)]; }
  if (shp === 'pill') { const a = (side === 'r' ? 0 : 180) + (side === 'r' ? 1 : -1) * at * 60; const r = a * Math.PI / 180; return [q.cx + (side === 'r' ? 1 : -1) * (hw - hh) + hh * Math.cos(r), q.cy + hh * Math.sin(r)]; }
  return [q.cx + (side === 'r' ? hw : -hw), q.cy + at * Math.max(0, hh - 5)]; }
// a list is drawn as one main line (its spine) that every item and the line from its word join onto
function mmListGeo(P, j, ms, q, at, shp, jat) { const MP = ms.map((m) => [m, P[m.id]]).filter(([, p]) => p && (p.el || p.bus)); if (!MP.length) return null; const jp = P[j.id];
  const row = !!MP[0][1].bus, side = jp.fan ? (jp.side > 0 ? 'r' : 'l') : jp.vs > 0 ? 'd' : 'u', hz = side === 'l' || side === 'r'; const [ax, ay] = mmAnchor(q, side, at || 0, shp);
  if (row) { const y = MP[0][1].bus.y, xs = MP.map(([m, p]) => p.cx), x0 = Math.min(...xs), x1 = Math.max(...xs); const pts = MP.map(([m, p]) => ({ id: m.id, x: p.cx, y }));
    const auto = hz ? [ax < x0 ? x0 : ax > x1 ? x1 : (x0 + x1) / 2, y] : [Math.max(x0, Math.min(x1, ax)), y]; const jm = jat && pts.find((t) => t.id === jat); const J = jm ? [jm.x, y] : auto;
    const trunk = hz ? (Math.abs(ay - y) < 0.5 ? [[ax, ay], J] : [[ax, ay], [(ax + J[0]) / 2, ay], [(ax + J[0]) / 2, y], J]) : (Math.abs(ax - J[0]) < 0.5 ? [[ax, ay], J] : [[ax, ay], [ax, (ay + y) / 2], [J[0], (ay + y) / 2], J]);
    return { row: true, y, trunk, spine: [[Math.min(x0, J[0]), y], [Math.max(x1, J[0]), y]], pts, auto }; }
  const x = MP[0][1].el.x, top = MP[0][1].el.y0, ys = MP.map(([m, p]) => p.cy), y0 = Math.min(...ys), y1 = Math.max(...ys); const pts = MP.map(([m, p]) => ({ id: m.id, x, y: p.cy }));
  const auto = hz ? [x, Math.max(y0, Math.min(y1, ay))] : [x, top]; const jm = hz && jat && pts.find((t) => t.id === jat); const J = jm ? [x, jm.y] : auto;
  const trunk = hz ? (Math.abs(ay - J[1]) < 0.5 ? [[ax, ay], J] : [[ax, ay], [(ax + x) / 2, ay], [(ax + x) / 2, J[1]], J]) : (Math.abs(ax - x) < 0.5 ? [[ax, ay], J] : [[ax, ay], [ax, (ay + top) / 2], [x, (ay + top) / 2], J]);
  return { row: false, x, trunk, spine: [[x, Math.min(y0, J[1])], [x, Math.max(y1, J[1])]], pts: hz ? pts : [], auto }; }
// branches on one side sit in the order of where they leave the word (their snap point): left to right, top to bottom
function mmByAt(list) { if (!list.some((k) => k.at)) return list; return list.map((k, i) => [k, i]).sort((a, c) => (+a[0].at || 0) - (+c[0].at || 0) || a[1] - c[1]).map((q) => q[0]); }
function mmNormal(q, side, at, shp) { const [x, y] = mmAnchor(q, side, at, shp);
  if (shp === 'circle') { const L = Math.hypot(x - q.cx, y - q.cy) || 1; return [(x - q.cx) / L, (y - q.cy) / L]; }
  if (shp === 'pill' && (side === 'l' || side === 'r')) { const ccx = q.cx + (side === 'r' ? 1 : -1) * (q.w / 2 - q.h / 2); const L = Math.hypot(x - ccx, y - q.cy) || 1; return [(x - ccx) / L, (y - q.cy) / L]; }
  return { r: [1, 0], l: [-1, 0], u: [0, -1], d: [0, 1] }[side]; }
function mmSnapAts(q, side, shp) { if (shp === 'circle' || shp === 'pill') return side === 'u' || side === 'd' ? (shp === 'pill' && q.w - q.h < 30 ? [0] : [-0.5, 0, 0.5].concat(shp === 'pill' && q.w - q.h > 90 ? [-1, 1] : [])).sort((a, c) => a - c) : [-0.5, 0, 0.5];
  if (side === 'u' || side === 'd') return q.w >= 110 ? [-1, -0.5, 0, 0.5, 1] : [-0.6, 0, 0.6]; return q.h >= 46 ? [-0.6, 0, 0.6] : [0]; }
// which bubble shows snap points now, and what tapping one does
function bSnapTarget(b) { const sel = S.bSel && b.items.find((i) => i.id === S.bSel);
  if (sel && !sel.t && S.bPanel === 'mdir') return { on: sel.id, sides: ['l', 'u', 'd', 'r'], mode: 'new', cur: S.bNewPt && S.bNewPt.on === sel.id ? [S.bNewPt.side, S.bNewPt.v] : null };
  if (S.bMulti) { const first = b.items.find((i) => S.bMulti.includes(i.id) && i.parent); const par = S.bGpar || (first && first.parent); if (par && S.bPanel !== 'mstyle') return { on: par, sides: ['l', 'u', 'd', 'r'], mode: 'grp', cur: S.bGdir ? [S.bGdir, S.bGat || 0] : null }; }
  const L = S.bLines || []; if (L.length !== 1) return null; const k = L[0];
  if (k.startsWith('g:')) { const g = (b.groups || []).find((q) => 'g:' + q.id === k); if (!g) return null; const Lo = mindLayout(b, rootOf(b, g.parent)); const jp = Lo && Lo.P[k]; const sd = g.dir || (jp ? (jp.fan ? (jp.side > 0 ? 'r' : 'l') : jp.vs > 0 ? 'd' : 'u') : 'd'); return { on: g.parent, sides: ['l', 'u', 'd', 'r'], mode: 'g', key: k, cur: [sd, g.at || 0] }; }
  const x = b.items.find((i) => i.id === k); if (!x || !x.parent) return null; const Lo = mindLayout(b, rootOf(b, x.id)); const p = Lo && Lo.P[x.id]; if (!p) return null;
  if (x.g) { const sd = p.el ? (p.el.mx > 0 ? 'l' : 'r') : p.bus ? (p.vs > 0 ? 'u' : 'd') : null; return sd ? { on: x.id, sides: [sd], mode: 'm', key: k, cur: [sd, x.mat || 0] } : null; }
  if (p.free || p.rad) return null; const sd = p.vs ? (p.vs > 0 ? 'd' : 'u') : p.side > 0 ? 'r' : 'l'; const top = !(b.items.find((i) => i.id === x.parent) || {}).parent;
  return { on: x.parent, sides: ['l', 'u', 'd', 'r'], mode: 'kid', key: k, cur: [sd, x.at || 0] }; }
const MM_SNAPS = [-1, -0.5, 0, 0.5, 1];
const bLnOne = (id) => (S.bLines || []).length === 1 && S.bLines[0] === id;
// every line I can style: my own links (lk:id) and the map's branch and list lines (the word's id, or g:list for a list's trunk)
function bAllLines(b) { const out = (b.links || []).map((l) => 'lk:' + l.id); mmItems(b).forEach((x) => { if (x.parent && !x.t) out.push(x.id); }); return [...new Set(out)]; }
function bLnObj(b, key) { if (key.startsWith('lk:')) return (b.links || []).find((l) => l.id === key.slice(3)); if (key.startsWith('g:')) { const g = (b.groups || []).find((q) => q.id === key.slice(2)); if (!g) return null; return g.ln = g.ln || {}; } const x = b.items.find((i) => i.id === key); if (!x) return null; return x.ln = x.ln || {}; }
function bLnClean(b) { b.items.forEach((x) => { if (x.ln && !Object.keys(x.ln).filter((k) => x.ln[k] != null).length) delete x.ln; }); (b.groups || []).forEach((g) => { if (g.ln && !Object.keys(g.ln).filter((k) => g.ln[k] != null).length) delete g.ln; }); }
function mindSvg(b, thumb, only, L0) { const Lo = L0 || mindLayout(b, only); if (!Lo) return '';
  const { P, col, x0, y0, W, H } = Lo; const X = (v) => v - x0, Y = (v) => v - y0;
  let lines = '', nodes = '', marks = new Set(), snaps = ''; const GS = new Map((b.groups || []).map((g) => [g.id, g])); const SH = {}; b.items.forEach((i) => { if (!i.t) SH[i.id] = mmShape(i); });
  const JX = {}; (b.groups || []).forEach((g) => { const m = g.jat && P[g.jat]; if (!m) return; const e = m.bus || m.el; if (!e) return; JX[g.id] = m.bus ? { x: m.cx, y: e.y0 } : { x: e.x, y: m.cy }; });
  const T = !thumb && bSnapTarget(b); if (T && P[T.on]) { const q = P[T.on]; snaps = T.sides.map((sd) => mmSnapAts(q, sd, SH[T.on]).map((k) => { const [sx, sy] = mmAnchor(q, sd, k, SH[T.on]); return `<circle class="mmsnap ${T.cur && T.cur[0] === sd && Math.abs((T.cur[1] || 0) - k) < 0.01 ? 'on' : ''}" data-side="${sd}" data-v="${k}" cx="${X(sx)}" cy="${Y(sy)}" r="4.5"/>`; }).join('')).join('');
 }
  const MI = mmItems(b), GEO = {}; MI.forEach((x) => { const p = P[x.id]; if (!p) return; const c = col[x.id] || '#9A9387'; const LS = `fill="none" stroke="${c}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"`; const L0 = lines.length;
    const grp = x.virt && GS.get(String(x.id).slice(2)); const at = grp && grp.at != null ? +grp.at : null;
    // from a word to its lists: square lines that leave the word together and split at one point
    const LG = x.parent && P[x.parent] && p.virt && !p.el && !p.bus && !p.rad && !p.free && mmListGeo(P, x, MI.filter((i) => i.parent === x.id), P[x.parent], at, SH[x.parent], grp && grp.jat);
    if (LG) { GEO[grp ? grp.id : x.id] = LG; const lst = grp && grp.lst; lines += `<path d="${mmElb(LG.trunk.map(([u, v]) => [X(u), Y(v)]))}" ${LS}/>` + (lst === 'bullet' || lst === 'num' ? '' : `<path d="M${X(LG.spine[0][0])} ${Y(LG.spine[0][1])}L${X(LG.spine[1][0])} ${Y(LG.spine[1][1])}" ${LS}/>`); }
    else if (x.parent && P[x.parent] && p.virt && !p.el && !p.bus && !p.rad && !p.free) { const q = P[x.parent];
      if (p.fan) { const s = p.side, [ax, ay] = mmAnchor(q, s > 0 ? 'r' : 'l', at || 0, SH[x.parent]), mx = ax + s * Math.min(16, Math.abs(p.cx - ax) / 2); const J = grp && JX[grp.id] || { x: p.cx, y: p.cy }; lines += `<path d="${mmElb([[X(ax), Y(ay)], [X(mx), Y(ay)], [X(mx), Y(J.y)], [X(J.x), Y(J.y)]])}" ${LS}/>`; }
      else if (p.vs) { const v = p.vs, ay = q.cy + v * q.h / 2; const many = Object.keys(P).filter((id) => P[id].virt && P[id].vs === v && !P[id].el && !P[id].bus && P[id].pid === x.parent).length > 1; const by = many ? p.cy - v * 14 : p.cy; let ax = Math.abs(p.cx - q.cx) < q.w / 2 && Math.abs(p.cy - ay) < 40 ? p.cx : q.cx, ay2 = ay; if (at != null) [ax, ay2] = mmAnchor(q, v > 0 ? 'd' : 'u', at, SH[x.parent]);
        const J = grp && JX[grp.id] || { x: p.cx, y: p.cy }; lines += `<path d="${mmElb(Math.abs(ax - J.x) < 0.5 ? [[X(ax), Y(ay2)], [X(J.x), Y(J.y)]] : [[X(ax), Y(ay2)], [X(ax), Y(by)], [X(J.x), Y(by)], [X(J.x), Y(J.y)]])}" ${LS}/>`; } }
    else if (x.parent && P[x.parent] && p.free) lines += `<path d="${mmFreePath(P[x.parent], p, X, Y)}" ${LS}/>`;
    else if (x.parent && P[x.parent] && p.rad) { const [ax1, ay1, c1x0, c1y0, c2x0, c2y0, bx1, by1] = mmCurveCtl(P[x.parent], p); const [ax0, ay0] = mmEdge(P[x.parent], c1x0, c1y0), [bx0, by0] = mmEdge(p, c2x0, c2y0); const ax = X(ax0), ay = Y(ay0), c1x = X(c1x0), c1y = Y(c1y0), c2x = X(c2x0), c2y = Y(c2y0), bx = X(bx0), by = Y(by0);
      lines += `<path d="M${ax} ${ay}C${c1x} ${c1y} ${c2x} ${c2y} ${bx} ${by}" ${LS}/>`; }
    else if (x.parent && P[x.parent] && (p.el || p.bus) && !p.virt && GEO[String(x.parent).slice(2)]) { const G0 = GEO[String(x.parent).slice(2)];
      // the list's look I picked: line, curved, timeline dots, bullets or numbers
      const gg = GS.get(String(x.parent).slice(2)); const lst = gg && gg.lst; const dc = (x.ln && x.ln.col) || c; const dot = (u, v, r) => `<circle cx="${u}" cy="${v}" r="${r}" fill="${dc}"/>`;
      if (G0.row) { const [qx, qy] = x.mat != null ? mmAnchor(p, p.vs > 0 ? 'u' : 'd', +x.mat, SH[x.id]) : [p.cx, p.cy - p.vs * (p.h / 2 - 1)]; const sg = qy > G0.y ? 1 : -1, r = Math.min(9, Math.abs(qy - G0.y) / 2), mid = (G0.spine[0][0] + G0.spine[1][0]) / 2, tw = qx < mid - 0.5 ? 1 : qx > mid + 0.5 ? -1 : 0;
        if (lst === 'curve' && tw) lines += `<path d="M${X(qx + tw * r)} ${Y(G0.y)}Q${X(qx)} ${Y(G0.y)} ${X(qx)} ${Y(G0.y + sg * r)}L${X(qx)} ${Y(qy)}" ${LS}/>`;
        else lines += `<path d="M${X(qx)} ${Y(G0.y)}L${X(qx)} ${Y(qy)}" ${LS}/>`; if (lst === 'dots') lines += dot(X(qx), Y(G0.y), 3.2); }
      else { const e = p.el; const [ex, ey] = x.mat != null ? mmAnchor(p, e.mx > 0 ? 'l' : 'r', +x.mat, SH[x.id]) : [p.cx - e.mx * (p.w / 2 - 4), p.cy]; const dx = ex > G0.x ? 1 : -1, r = Math.min(9, Math.abs(ex - G0.x) / 2), up = ey > G0.spine[0][1] + 0.5 ? -1 : 1;
        if (lst === 'bullet') lines += dot(X(G0.x), Y(ey), 2.8);
        else if (lst === 'num') { const sib = MI.filter((i) => i.parent === x.parent && P[i.id]).sort((a, q) => P[a.id].cy - P[q.id].cy); lines += `<text x="${X(G0.x)}" y="${Y(ey) + 4}" text-anchor="middle" font-size="11" font-family="var(--mono, monospace)" fill="${dc}">${sib.indexOf(x) + 1}.</text>`; }
        else if (lst === 'curve') lines += `<path d="M${X(G0.x)} ${Y(ey + up * r)}Q${X(G0.x)} ${Y(ey)} ${X(G0.x + dx * r)} ${Y(ey)}L${X(ex)} ${Y(ey)}" ${LS}/>`;
        else { lines += `<path d="M${X(G0.x)} ${Y(ey)}L${X(ex)} ${Y(ey)}" ${LS}/>`; if (lst === 'dots') lines += dot(X(G0.x), Y(ey), 3.2); } } }
    else if (x.parent && P[x.parent] && p.el) { const e = p.el; const jj = JX[String(x.parent).slice(2)]; const tx = X(e.x), y0 = Y(jj ? jj.y : e.y0); let cy = Y(p.cy), ex = X(p.cx - e.mx * (p.w / 2 - 4)); if (!p.virt && x.mat != null) { const [a1, a2] = mmAnchor(p, e.mx > 0 ? 'l' : 'r', +x.mat, SH[x.id]); ex = X(a1); cy = Y(a2); }
      lines += p.virt ? `<path d="M${tx} ${y0}V${cy}" ${LS}/>` : `<path d="${Math.abs(cy - y0) < 4 ? `M${tx} ${cy}H${ex}` : mmElb([[tx, y0], [tx, cy], [ex, cy]])}" ${LS}/>`; }
    else if (x.parent && P[x.parent] && p.bus) { const e = p.bus; const jj = JX[String(x.parent).slice(2)]; const bx = X(jj ? jj.x : e.x), y0 = Y(e.y0), by = Y(e.y), qx0 = x.mat != null ? mmAnchor(p, p.vs > 0 ? 'u' : 'd', +x.mat, SH[x.id]) : [p.cx, p.cy - p.vs * (p.h / 2 - 1)], qx = X(qx0[0]), qy = Y(qx0[1]);
      lines += `<path d="${mmElb(Math.abs(qx - bx) < 0.5 ? [[bx, y0], [qx, qy]] : [[bx, y0], [bx, by], [qx, by], [qx, qy]])}" ${LS}/>`; }
    else if (x.parent && P[x.parent] && p.list) { const q = P[x.parent]; const v = p.vs; const ax = X(q.cx - q.w / 2 + 8), ay = Y(q.cy + v * q.h / 2), bx = X(p.cx - p.w / 2 + 3), by = Y(p.cy);
      lines += `<path d="M${ax} ${ay}V${by - v * 7}Q${ax} ${by} ${ax + 7} ${by}H${bx}" ${LS}/>`; }
    else if (x.parent && P[x.parent] && p.vs && p.virt && Math.abs(p.cx - P[x.parent].cx) < P[x.parent].w / 2) { const q = P[x.parent]; lines += `<path d="M${X(p.cx)} ${Y(q.cy + p.vs * q.h / 2)}V${Y(p.cy)}" ${LS}/>`; }
    else if (x.parent && P[x.parent] && p.vs) { const q = P[x.parent]; const v = p.vs; const A = x.at != null ? mmAnchor(q, v > 0 ? 'd' : 'u', +x.at, SH[x.parent]) : [q.cx, q.cy + v * q.h / 2]; const ax = X(A[0]), ay = Y(A[1]), bx = X(p.cx), by = Y(p.cy - v * p.h / 2); const m = Math.max(14, Math.abs(by - ay) / 2); const n = mmNormal(q, v > 0 ? 'd' : 'u', +x.at || 0, SH[x.parent]);
      lines += `<path d="M${ax} ${ay}C${ax + n[0] * m} ${ay + n[1] * m} ${bx} ${by - v * m} ${bx} ${by}" ${LS}/>`; }
    else if (x.parent && P[x.parent]) { const q = P[x.parent]; const s = p.side; const A = x.at != null ? mmAnchor(q, s > 0 ? 'r' : 'l', +x.at, SH[x.parent]) : [q.cx + s * q.w / 2, q.cy]; const ax = X(A[0]), ay = Y(A[1]), bx = X(p.cx - s * p.w / 2), by = Y(p.cy); const m = Math.max(14, Math.abs(bx - ax) * 0.55); const n = mmNormal(q, s > 0 ? 'r' : 'l', +x.at || 0, SH[x.parent]);
      lines += `<path d="M${ax} ${ay}C${ax + n[0] * m} ${ay + n[1] * m} ${bx - s * m} ${by} ${bx} ${by}" ${LS}/>`; }
    if (lines.length > L0) { const ln = (grp ? grp.ln : x.ln) || {}; const lc = ln.col || c, w = +ln.w || 1.3; const sel = !thumb && (S.bLines || []).includes(x.id);
      const dash = ln.dash === 'dash' ? ` stroke-dasharray="${w * 4 + 2} ${w * 3 + 2}"` : ln.dash === 'dot' ? ` stroke-dasharray="0.1 ${w * 2.5 + 2}"` : '';
      const mk = ln.arrow ? (marks.add(lc + '|' + w), `mah${lc.replace(/[^0-9a-z]/gi, '')}w${String(w).replace('.', '_')}`) : ''; const realP = !String(x.parent).startsWith('g:'); const ae = ln.arrow && ln.arrow !== 'start' && !x.virt, as = ln.arrow && ln.arrow !== 'end' && realP; const mm = ae || as ? ` data-ah="${ae && as ? 'both' : ae ? 'end' : 'start'}" data-w="${w}"` : '';
      const piece = lines.slice(L0); const ds = [...piece.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]);
      lines = lines.slice(0, L0) + (sel ? ds.map((d) => `<path d="${d}" fill="none" stroke="${lc}" stroke-width="${w + 7}" stroke-linecap="round" opacity="0.18"/>`).join('') : '')
        + piece.split(LS).map((q, qi) => qi === 0 ? q : `fill="none" stroke="${lc}" stroke-width="${ln.dash === 'dot' ? w + 0.8 : w}" stroke-linecap="round" stroke-linejoin="round"${dash}${qi === 1 ? mm + (ln.brk ? ' data-brk="1"' : '') + (ln.q ? ' data-q="1"' : '') : ''}` + q).join('')
        + (thumb ? '' : ds.map((d) => `<path class="mmhit" data-ln="${x.id}" d="${d}"/>`).join('')); }
    if (x.virt) return;
    const gr = p.look === 0 ? mmGrad(mmTheme(x.theme ? x : b)) : null; const st = `left:${X(p.cx - p.w / 2)}px;top:${Y(p.cy - p.h / 2)}px;width:${p.w}px;min-height:${p.h}px;--bc:${c}${gr ? `;--g1:${gr[0]};--g2:${gr[1]}` : ''}${S.bLink === x.id && !thumb ? ';outline:2px solid ' + c : ''}${mmStyleCss(x.st, p.rad && p.l >= 2 ? 3 : p.look)}`;
    const n = x.fold && x.parent ? mmCount(b, x.id) : 0;
    const fold = n ? `<button class="mmc" data-a="mfold" data-ref="${x.id}" style="${p.rad ? `left:${X(p.cx + Math.cos(p.ang) * (Math.abs(p.w / 2 * Math.cos(p.ang)) + Math.abs(p.h / 2 * Math.sin(p.ang)) + 13)) - 10}px;top:${Y(p.cy + Math.sin(p.ang) * (Math.abs(p.w / 2 * Math.cos(p.ang)) + Math.abs(p.h / 2 * Math.sin(p.ang)) + 13)) - 10}px` : p.vs ? `left:${X(p.cx) - 10}px;top:${Y(p.cy + p.vs * (p.h / 2 + 13)) - 10}px` : `left:${X(p.cx + p.side * (p.w / 2 + 13)) - 10}px;top:${Y(p.cy) - 10}px`};--bc:${c}" aria-label="Open ${n} hidden">${n}</button>` : '';
    nodes += `<div data-shp="${SH[x.id] || 'rect'}" class="mmn l${p.look == null ? Math.min(p.l, 2) : p.look} ${p.free ? 'free' : ''} ${S.bLink && !thumb ? 'linking' : ''} ${p.rad ? 'rad' : ''} ${(S.bSel === x.id || (S.bMulti || []).includes(x.id)) && !thumb ? 'sel' : ''} ${S.bMulti && S.bGpar === x.id && !thumb ? 'gpar' : ''} ${x.done ? 'done' : ''}" data-id="${x.id}" style="${st}">${x.done ? `<span class="mmck">${icon('check', 11, 2.6)}</span>` : ''}<div class="mmt">${esc(x.text || '').replace(/\n/g, '<br>')}</div></div>${fold}`; });
  if (T && T.mode === 'g') { const g = (b.groups || []).find((q) => 'g:' + q.id === T.key); const G0 = g && GEO[g.id];
    if (G0 && G0.pts.length > 1) snaps += G0.pts.map((q) => `<rect class="mmsnap jn ${g.jat === q.id ? 'on' : ''}" data-side="j" data-v="${q.id}" x="${X(q.x) - 4}" y="${Y(q.y) - 4}" width="8" height="8" rx="1.5"/>`).join('')
      + (g.jat ? `<rect class="mmsnap jn" data-side="j" data-v="" x="${X(G0.auto[0]) - 4}" y="${Y(G0.auto[1]) - 4}" width="8" height="8" rx="1.5" transform="rotate(45 ${X(G0.auto[0])} ${Y(G0.auto[1])})"/>` : ''); }
  return `<div class="mmap" style="width:${W}px;height:${H}px"><svg width="${W}" height="${H}" aria-hidden="true"><defs>${[...marks].map((m0) => { const [m, w] = m0.split('|'); const L = mmHeadLen(+w); return `<marker id="mah${m.replace(/[^0-9a-z]/gi, '')}w${w.replace('.', '_')}" viewBox="0 0 ${L} ${L}" refX="${L - +w * 0.6}" refY="${L / 2}" markerWidth="${L}" markerHeight="${L}" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0 ${L * 0.16}L${L} ${L / 2}L0 ${L * 0.84}L${L * 0.18} ${L / 2}Z" fill="${m}" stroke="${m}" stroke-width="0.6" stroke-linejoin="round"/></marker>`; }).join('')}</defs><g opacity="0.85">${lines}</g></svg>${nodes}${snaps ? `<svg class="mmsnaps" width="${W}" height="${H}" aria-hidden="true">${snaps}</svg>` : ''}</div>`; }
function bListFor(b, par, side, at) { b.groups = (b.groups || []).filter((q) => b.items.some((i) => i.g === q.id && i.parent === q.parent)); let g = (b.groups || []).find((q) => q.parent === par && q.ls === 'list' && (q.dir || '') === (side || '')); if (!g) { g = Object.assign({ id: uid('mg'), parent: par, ls: 'list' }, side ? { dir: side } : {}, +at ? { at: +at } : {}); (b.groups = b.groups || []).push(g); } return g.id; }
function mmNew(parent, after, dir, gid) { const b = curBoard(); if (!b) return; const before = bState(b); const id = uid('mn');
  const par = b.items.find((i) => i.id === parent); if (par && par.fold) par.fold = false;
  const it = { id, text: '', parent }; const pd = dir || (after && !(b.items.find((i) => i.id === parent) || {}).parent && mmDir(after)); if (after && after.g && !gid) gid = after.g; if (gid) { it.g = gid; delete it.dir; } else if (pd) it.dir = pd; if (after) { const i = b.items.indexOf(after); b.items.splice(i + 1, 0, it); } else b.items.push(it); bTouch(b);
  S.bSel = id; S.bPanel = null; render(); mmEdit(id, before); }
function mmEdit(id, before) { const el = document.querySelector(`.mmn[data-id="${id}"] .mmt`); if (!el) return; const b = curBoard();
  S.bEditBefore = before || (b && bState(b)); el.contentEditable = 'plaintext-only'; el.focus({ preventScroll: true });
  const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); mmGrow(el); }
function mmCentre(id) { const n = document.querySelector(`.mbwrap .mmn[data-id="${id}"]`); if (n) bFollow(n); }
// whatever I'm writing in stays in the middle of what I can see, above the tools and the keyboard; a long text follows the line I'm on (the owner, 2026-11-12)
function bFollow(n) { const m = $('#main'), w = n.closest('.mbwrap'); if (!m || !w) return; const r = n.getBoundingClientRect(); const vv = window.visualViewport;
  const dk = $('#bdock'), dr = dk && dk.getBoundingClientRect(); const mr = m.getBoundingClientRect(); const top = Math.max(mr.top, vv ? vv.offsetTop : 0) + 8; let bot = (vv ? vv.offsetTop + vv.height : innerHeight) - 8; if (dr && dr.height && dr.top < bot) bot = dr.top - 8;
  let cy = r.top + r.height / 2, cx = r.left + r.width / 2; const wr = w.getBoundingClientRect();
  const a = document.activeElement; let cr = null; if (a && a.isContentEditable && n.contains(a)) { const sel = getSelection(); if (sel.rangeCount) { const rg = sel.getRangeAt(0).cloneRange(); rg.collapse(false); const rs = rg.getClientRects(); cr = rs.length ? rs[rs.length - 1] : null; } if (!cr || !cr.height) cr = null; }
  if (r.height > bot - top - 16 && cr) cy = cr.top + cr.height / 2; if (r.width > wr.width - 16 && cr) cx = cr.left;
  let dy = cy - (top + bot) / 2; if (cr) { const c = cr.top + cr.height / 2 - dy, pad = Math.min(70, (bot - top) / 4); if (c > bot - pad) dy += c - (bot - pad); else if (c < top + pad) dy -= top + pad - c; } const cv = w.querySelector('.mbcanvas'); const room = m.scrollTop + dy - (m.scrollHeight - m.clientHeight); if (room > 0 && cv) cv.style.minHeight = (cv.offsetHeight + room + 4) + 'px'; // room below while I write
  m.scrollTop += dy; w.scrollLeft += cx - (wr.left + wr.right) / 2; }
function mmEnd(el, next) { const b = curBoard(); const n = el.closest('.mmn'); if (!b || !n) return; const x = b.items.find((i) => i.id === n.dataset.id); if (!x) return;
  el.contentEditable = 'false'; const t = el.innerText.replace(/\n$/, '').trim();
  if (!t && (x.parent || !mmKids(b, x.id).length)) { const drop = (id) => { mmKids(b, id).forEach((k) => drop(k.id)); b.items = b.items.filter((i) => i.id !== id); }; drop(x.id); S.bSel = x.parent || null; }
  else x.text = t || x.text || 'Idea';
  if (S.bEditBefore) bPush(b, S.bEditBefore); S.bEditBefore = null; bTouch(b); save(); render();
  // a tap on another bubble while I was writing picks that bubble (2026-11-12: the tap used to be lost, so the next branch grew from the wrong word)
  const pk = mPendPick; mPendPick = null; if (pk && pk !== x.id && b.items.some((i) => i.id === pk)) { bPick(pk); return; }
  if (t && next === 'sib' && x.parent) mmNew(x.parent, x); else if (t && (next === 'child' || next === 'sib')) mmNew(x.id); /* Enter on the centre starts a branch */ else if (S.bSel) mmCentre(S.bSel); }
document.addEventListener('keydown', (e) => { const el = e.target; if (!(el.classList && el.classList.contains('mmt') && el.isContentEditable)) return;
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.dataset.next = 'sib'; el.blur(); }
  else if (e.key === 'Tab') { e.preventDefault(); el.dataset.next = 'child'; el.blur(); }
  else if (e.key === 'Escape') { e.preventDefault(); el.blur(); } });
// the bubble grows while I type: right-side words grow right, left-side words grow left, the rest grow from the middle
// while I write, the whole map lays itself out again around the new words, so neighbours make room straight away (the owner, 2026-11-12)
function mmGrow(el) { const n = el.closest('.mmn'); const b = curBoard(); if (!n || !b) return; const id = n.dataset.id; const it = b.items.find((i) => i.id === id); const r = it && rootOf(b, id); const wrap = n.closest('.mbmap'); const om = n.closest('.mmap'); if (!it || !r || !om) return;
  const t0 = it.text; it.text = el.innerText.replace(/\n$/, ''); let Lo, html; try { Lo = mindLayout(b, r); html = Lo && (wrap ? mapHtml(b, r, false, Lo) : `<div>${mindSvg(b, false, r, Lo)}</div>`); } finally { it.text = t0; } if (!html) return;
  const tmp = document.createElement('div'); tmp.innerHTML = html; const nw = tmp.firstElementChild; const nm = nw.querySelector('.mmap'); const nn = nm && nm.querySelector(`.mmn[data-id="${id}"]`); if (!nn) return;
  if (wrap) ['x', 'y', 'k', 'rx', 'ry', 'w', 'h'].forEach((k) => { wrap.dataset[k] = nw.dataset[k]; });
  om.style.width = nm.style.width; om.style.height = nm.style.height;
  [...om.children].forEach((c) => { if (c !== n) c.remove(); }); let after = false; [...nm.children].forEach((c) => { if (c === nn) { after = true; return; } if (after) om.appendChild(c); else om.insertBefore(c, n); });
  n.setAttribute('style', nn.getAttribute('style')); n.style.zIndex = 5;
  // the bubble sits centred on its line: if the words need more room than measured, it grows evenly (or away from its line on a side branch)
  const p = Lo.P[id]; const sw = parseFloat(n.style.width) || 0, real = n.offsetWidth; if (p && real > sw + 0.5) { const dw = real - sw, l0 = parseFloat(n.style.left) || 0; n.style.left = (p.side > 0 || p.list ? l0 : p.side < 0 ? l0 - dw : l0 - dw / 2) + 'px'; }
  if (wrap) bMaps(); else { bArrows(); bBreaks(); } mmCentre(id); }
document.addEventListener('input', (e) => { const el = e.target; if (el.classList && el.classList.contains('mmt') && el.isContentEditable) mmGrow(el); });
['compositionupdate', 'keyup'].forEach((ev) => document.addEventListener(ev, (e) => { const el = e.target; if (el && el.classList && el.classList.contains('mmt') && el.isContentEditable) requestAnimationFrame(() => mmGrow(el)); }));
document.addEventListener('focusout', (e) => { if (e.target.classList && e.target.classList.contains('mmt') && e.target.isContentEditable) { const nx = e.target.dataset.next; delete e.target.dataset.next; mmEnd(e.target, nx); } });
function mmZoom(how) { const b = curBoard(); const r = b && rootOf(b, S.bSel); if (!r) return; const Lo = mindLayout(b, r);
  bMut(() => { r.k = how === 'fit' ? Math.max(0.2, Math.min(1.5, 0.94 * 360 / Lo.W)) : Math.max(0.2, Math.min(2.5, (r.k || 1) * (how === 'in' ? 1.15 : 1 / 1.15)));
    if (how === 'fit') r.x = 0.5 + ((Lo.P[r.id].cx - Lo.x0) - Lo.W / 2) * r.k / 360; }); }
// moving a node: drag it onto another node to hang it there; drop a main branch beside the centre to switch sides
let mDrag = null, mSkip = false, mPendPick = null;
// the keyboard coming up keeps the word I'm writing in view
if (window.visualViewport) { let mvT = 0; visualViewport.addEventListener('resize', () => { clearTimeout(mvT); mvT = setTimeout(() => { const a = document.activeElement; const n = a && a.isContentEditable && a.closest && a.closest('.mbwrap .mmn, .mbwrap .mbi'); if (n) bFollow(n); }, 120); }); }
document.addEventListener('pointerdown', (e) => { const a = document.activeElement; if (!a || !a.classList || !a.classList.contains('mmt') || !a.isContentEditable) return;
  const n = e.target.closest && e.target.closest('.mbmap .mmn'); if (!n || n.contains(a)) return; mPendPick = n.dataset.id; mSkip = true; setTimeout(() => { mSkip = false; }, 450); }, true);
document.addEventListener('pointerdown', (e) => { const w = e.target.closest && e.target.closest('.mbmap'); if (!w || e.target.closest('.mmc')) return;
  const n = e.target.closest('.mmn'); if (!n || S.bLink) return; const sc = +w.dataset.s || 1;
  if (n.querySelector('.mmt').isContentEditable) return; const b = curBoard(); const x = b && b.items.find((i) => i.id === n.dataset.id); if (!x) return; const nr = n.getBoundingClientRect();
  mDrag = { n, x, b, sx: e.clientX, sy: e.clientY, moved: false, nl: nr.left, nt: nr.top, gx: e.clientX - nr.left - nr.width / 2, gy: e.clientY - nr.top - nr.height / 2, sc }; });
document.addEventListener('pointermove', (e) => { const d = mDrag; if (!d) return;
  if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 7) return;
  if (d.pan) { d.moved = true; d.w.scrollLeft = d.l0 - (e.clientX - d.sx); $('#main').scrollTop = d.t0 - (e.clientY - d.sy); return; }
  if (!d.moved) { d.moved = true; d.g = d.n.cloneNode(true); d.g.classList.add('mmghost'); d.g.classList.remove('sel'); d.g.style.left = d.g.style.top = '0'; d.g.style.transform = `scale(${d.sc})`; document.body.appendChild(d.g); d.n.classList.add('mmdrag'); d.n.setPointerCapture(e.pointerId);
    const bad = new Set([d.x.id]); const add = (id) => mmKids(d.b, id).forEach((k) => { bad.add(k.id); add(k.id); }); add(d.x.id); d.bad = bad; }
  d.g.style.translate = `${d.nl + e.clientX - d.sx}px ${d.nt + e.clientY - d.sy}px`;
  document.querySelectorAll('.mmn.drop').forEach((q) => q.classList.remove('drop'));
  const t = [...document.querySelectorAll('.mbwrap .mmn')].find((q) => { if (d.bad.has(q.dataset.id)) return false; const r = q.getBoundingClientRect(); return e.clientX > r.left + 4 && e.clientX < r.right - 4 && e.clientY > r.top + 2 && e.clientY < r.bottom - 2; });
  d.t = t || null; if (t) t.classList.add('drop'); d.ex = e.clientX; d.ey = e.clientY;
  if (!t && !d.x.parent) { const bd = document.querySelector('.mbwrap .mboard'); if (bd) { const R = bd.getBoundingClientRect(), W = bd.clientWidth, ox = d.x.x, oy = d.x.y; d.x.x = (d.ex - d.gx - R.left) / W; d.x.y = Math.max(0.02, (d.ey - d.gy - R.top) / W); try { bGrowLive(d.b); } finally { d.x.x = ox; d.x.y = oy; } } } });
document.addEventListener('pointerup', () => { const d = mDrag; if (!d) return; mDrag = null; if (!d.moved) return; mSkip = true; setTimeout(() => { mSkip = false; }, 50);
  if (d.pan) return; d.g.remove(); d.n.classList.remove('mmdrag'); document.querySelectorAll('.mmn.drop').forEach((q) => q.classList.remove('drop'));
  if (!d.t) { // dropped on empty space: a centre moves its whole map there; a branch becomes a map of its own
    if (d.x.parent) { const pe = document.querySelector(`.mbwrap .mmn[data-id="${d.x.parent}"]`); if (!pe) return; const pr = pe.getBoundingClientRect();
      const fx = (d.ex - d.gx - (pr.left + pr.width / 2)) / d.sc, fy = (d.ey - d.gy - (pr.top + pr.height / 2)) / d.sc;
      const bd = document.querySelector('.mbwrap .mboard'), BR = bd ? bd.getBoundingClientRect() : { left: 0, right: innerWidth }, cxp = d.ex - d.gx; let fs = fx >= 0 ? 'r' : 'l';
      if (fs === 'r' && BR.right - cxp < 130 && cxp - BR.left > 130) fs = 'l'; else if (fs === 'l' && cxp - BR.left < 130 && BR.right - cxp > 130) fs = 'r';
      S.bSel = d.x.id; bMut((b) => { const x = b.items.find((i) => i.id === d.x.id); if (!x) return; x.free = true; x.dx = Math.round(fx); x.dy = Math.round(fy); x.fside = fs; delete x.dir; delete x.side; }); return; }
    const bd = document.querySelector('.mbwrap .mboard'); if (!bd) return; const R = bd.getBoundingClientRect(); const W = bd.clientWidth;
    const nx = (d.ex - d.gx - R.left) / W, ny = (d.ey - d.gy - R.top) / W; const old = rootOf(d.b, d.x.id);
    S.bSel = d.x.id; bMut((b) => { const x = b.items.find((i) => i.id === d.x.id); if (!x) return; if (x.parent) { x.k = (old && old.k) || 1; x.theme = old && old.theme; x.layout = old && old.layout; } x.parent = null; delete x.side; delete x.dir; x.x = nx; x.y = Math.max(0.02, ny); x.z = bTopZ(b) + 1; }); return; }
  const tid = d.t.dataset.id; const tr = d.t.getBoundingClientRect();
  S.bSel = d.x.id; bMut((b) => { const x = b.items.find((i) => i.id === d.x.id); const t = b.items.find((i) => i.id === tid); if (!x || !t) return;
    if (t.fold) t.fold = false; x.parent = tid; delete x.lv0; delete x.c0; b.items = b.items.filter((i) => i !== x).concat([x]); delete x.side; delete x.dir; delete x.x; delete x.y; delete x.k; delete x.layout; delete x.theme; delete x.free; delete x.dx; delete x.dy; delete x.fside; delete x.pill; delete x.g; if (!t.parent) { const dx = (d.ex - tr.left - tr.width / 2) / tr.width, dy = (d.ey - tr.top - tr.height / 2) / tr.height; x.dir = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'l' : 'r') : (dy < 0 ? 'u' : 'd'); } }); });
function mmMove(b, x, how) {
  if (how === 'out') { const p = b.items.find((i) => i.id === x.parent); if (!p || !p.parent) return; x.parent = p.parent; delete x.side; delete x.dir; b.items = b.items.filter((i) => i !== x); b.items.splice(b.items.indexOf(p) + 1, 0, x); return; }
  const sib = b.items.filter((i) => i.parent === x.parent); const i = sib.indexOf(x); const o = sib[how === 'up' ? i - 1 : i + 1]; if (!o) return;
  const a = b.items.indexOf(x), c = b.items.indexOf(o); b.items[a] = o; b.items[c] = x; }
// arrow keys walk the map; Enter adds the next one, Tab a branch, Space or F2 writes
function mmWalk(b, x, key) { const Lo = mindLayout(b); const p = Lo.P[x.id]; if (!p) return null; const vis = (id) => Lo.P[id];
  const K = { ArrowRight: 'r', ArrowLeft: 'l', ArrowUp: 'u', ArrowDown: 'd' }[key]; const OPP = { r: 'l', l: 'r', u: 'd', d: 'u' };
  if (!x.parent) return b.items.find((i) => i.parent === x.id && vis(i.id) && Lo.P[i.id].dir === K);
  if (K === p.dir) return x.fold ? null : b.items.find((i) => i.parent === x.id && vis(i.id));
  if (K === OPP[p.dir]) return b.items.find((i) => i.id === x.parent);
  const hz = p.dir === 'r' || p.dir === 'l' || p.list; const sib = b.items.filter((i) => i.parent === x.parent && vis(i.id) && Lo.P[i.id].dir === p.dir).sort((q, r) => hz ? Lo.P[q.id].cy - Lo.P[r.id].cy : Lo.P[q.id].cx - Lo.P[r.id].cx);
  const i = sib.indexOf(x); return sib[K === 'u' || K === 'l' ? i - 1 : i + 1]; }
document.addEventListener('keydown', (e) => { const b = curBoard(); if (!b || S.nbView !== 'board' || S.area !== 'notebook') return; const a = document.activeElement;
  if (a && (a.isContentEditable || a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')) return; if ($('#layer') && $('#layer').innerHTML.trim()) return;
  const k = e.key, mod = e.ctrlKey || e.metaKey;
  if (mod && (k === 'z' || k === 'Z')) { e.preventDefault(); bUndo(e.shiftKey); return; } if (mod && k === 'y') { e.preventDefault(); bUndo(true); return; }
  const x = selItem(); if (!x) return; const btn = (q) => { const el = document.querySelector(`#bdock [data-a="${q}"]`); if (el) el.click(); };
  if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); btn('bdelitem'); return; }
  if (k === 'Escape') { S.bSel = null; S.bPanel = null; S.bLink = null; S.bMulti = null; render(); return; }
  if (x.t) { if (mod && k === 'd') { e.preventDefault(); btn('bdup'); return; }
    if (k.startsWith('Arrow') && !x.lock) { e.preventDefault(); const st = (e.shiftKey ? 10 : 1) / moodWidth(); bMut((bb, it) => { if (k === 'ArrowLeft') it.x -= st; if (k === 'ArrowRight') it.x += st; if (k === 'ArrowUp') it.y = Math.max(0, it.y - st); if (k === 'ArrowDown') it.y += st; }); }
    return; }
  if (k === 'Tab') { e.preventDefault(); mmNew(x.id); return; } if (k === 'Enter') { e.preventDefault(); if (x.parent) mmNew(x.parent, x); else mmNew(x.id); return; }
  if (k === ' ' || k === 'F2') { e.preventDefault(); mmEdit(x.id); return; }
  if (k.startsWith('Arrow')) { e.preventDefault(); const n = mmWalk(b, x, k); if (n) { bPick(n.id); mmCentre(n.id); } } });

function boardAction(act, a, ref, v) {
  const b = curBoard();
  switch (act) {
    case 'bnewopen': S.bNewOpen = !S.bNewOpen; render(); return true;
    case 'bnew': { S.bNewOpen = false; if (S.area !== 'notebook') { S.sheet = null; S.area = 'notebook'; S.insOn = false; S.nbView = 'home'; } const id = uid('bd'); const nb = { id, kind: 'mood', title: '', upd: Date.now(), items: [] };
      change(() => { boards().push(nb); }, null, false); S.bBack = S.nbView || 'home'; S.nbView = 'board'; S.board = id; S.bSel = null; S.bPanel = null; render(); $('#main').scrollTop = 0; const t = $('#btitle'); if (t) t.focus(); return true; }
    case 'bdopen': S.bBack = S.nbView === 'board' ? (S.bBack || 'home') : (S.nbView || 'home'); S.nbView = 'board'; S.board = ref; S.bZoom = 1; S.bSL = 0; S.bSel = null; S.bMenu = false; S.bPanel = null; render(); $('#main').scrollTop = 0; return true;
    case 'bback': { const t = $('#btitle'); if (t && b && t.value.trim() !== (b.title || '')) { b.title = t.value.trim(); bTouch(b); save(); }
      if (b && !b.items.length && !b.title) { M.boards = boards().filter((x) => x !== b); save(); }
      if (!bBackTo()) { S.nbView = S.bBack || 'home'; S.board = null; } S.bSel = null; S.bMenu = false; S.bPanel = null; render(); return true; }
    case 'bmenu': S.bMenu = !S.bMenu; render(); return true;
    case 'bpng': S.bMenu = false; bPng(); return true;
    case 'bzoom': bSetZoom(v === 'in' ? (S.bZoom || 1) * 1.25 : v === 'out' ? (S.bZoom || 1) / 1.25 : 1); return true;
    case 'bdel': { S.bMenu = false; if (!bBackTo()) { S.nbView = S.bBack || 'home'; S.board = null; } change(() => { M.boards = boards().filter((x) => x !== b); }, 'Board deleted'); return true; }
    case 'bdupboard': { if (!b) return true; const c = JSON.parse(JSON.stringify(b)); c.id = uid('bd'); c.upd = Date.now(); c.title = boardTitle(b) + ' (copy)';
      S.bMenu = false; change(() => { boards().push(c); }, 'Board copied'); S.board = c.id; S.bSel = null; render(); return true; }
    case 'bvw': S.bVw = !S.bVw; S.bSel = S.bMulti = S.bLines = S.bLk = S.bLink = S.bPanel = null; S.bLnMulti = false; render(); return true;
    case 'bundo': bUndo(false); return true;
    case 'bredo': bUndo(true); return true;
    case 'bpanel': { const was = S.bPanel; S.bPanel = S.bPanel === v ? null : v; if (v === 'mdir' || was === 'mdir' || S.bMulti) render(); else bToolsOnly(); return true; }
    case 'badd': bAdd(v); return true;
    case 'bbg': bMut((bb) => { bb.bg = v === 'paper' ? undefined : v; }); return true;
    case 'bpat': bMut((bb) => { bb.pat = v === 'none' ? undefined : v; }); return true;
    case 'bsnap': if (b) { b.snap = b.snap === false ? undefined : false; save(); render(); } return true;
    case 'btidy': S.bMenu = false; bMut((bb) => bTidy(bb)); return true;
    case 'bfont': bMut((bb, x) => { if (x) x.font = v; }); return true;
    case 'balign': bMut((bb, x) => { if (x) x.al = v; }); return true;
    case 'bbold': bMut((bb, x) => { if (x) x.b = !x.b; }); return true;
    case 'bital': bMut((bb, x) => { if (x) x.i = !x.i; }); return true;
    case 'bsize': bMut((bb, x) => { if (x) { x.fs = Math.max(0.02, x.fs * (v === 'up' ? 1.15 : 1 / 1.15)); x.h = undefined; } }); requestAnimationFrame(bMeasure); return true;
    case 'bink': bMut((bb, x) => { if (x) x.ink = v === MB_INK[0] && !bDark(bb) ? undefined : v; }); return true;
    case 'bfill': bMut((bb, x) => { if (x) x.fill = v || undefined; }); return true;
    case 'bswc': bMut((bb, x) => { if (x) x.col = v; }); return true;
    case 'bframe': bMut((bb, x) => { if (!x) return; x.frame = v === 'plain' ? undefined : v; x.h = v === 'circle' ? x.w : x.w / (x.ar || 1); }); return true;
    case 'barr': bMut((bb, x) => { if (!x) return; if (v === 'flat') x.r = 0; else bArrange(bb, x, v); }); return true;
    case 'bdup': { const x = selItem(); if (!x) return true; const id = uid('bi'); bMut((bb) => { const c = JSON.parse(JSON.stringify(x)); c.id = id; const W = moodWidth(), cw = c.w || 0.3, ch = itemH(c) || 0.1; const sp = bEmptySpot(cw * W, ch * W, { x: (x.x + cw / 2) * W, y: (x.y + ch / 2) * W }); if (sp) { c.x = Math.max(0.02, sp.x - cw / 2); c.y = Math.max(0.02, sp.y - ch / 2); } else { c.x += 0.04; c.y += 0.04; } c.z = bTopZ(bb) + 1; delete c.lock; bb.items.push(c); }); S.bSel = id; S.bPanel = null; render(); return true; }
    case 'block': bMut((bb, x) => { if (x) x.lock = !x.lock || undefined; }); S.bPanel = null; render(); return true;
    case 'bdelitem': { const x = selItem(); if (!x) return true;
      const drop = (id) => { b.items.filter((i) => i.parent === id).forEach((k) => drop(k.id)); b.items = b.items.filter((i) => i.id !== id); };
      S.bSel = x.t ? null : x.parent || null; S.bPanel = null; bMut((bb) => { if (!x.t) drop(x.id); else bb.items = bb.items.filter((i) => i !== x); if (bb.links) bb.links = bb.links.filter((l) => bb.items.some((i) => i.id === l.a) && bb.items.some((i) => i.id === l.b)); }); return true; }
    case 'medit': if (S.bSel) mmEdit(S.bSel); return true;
    case 'mgrow': S.bGrow = v; bToolsOnly(); return true;
    // Auto adds a branch without moving the ones already there (2026-11-12: the map kept swapping sides on my phone)
    case 'mchild': if (S.bSel) { if (b && S.bGrow !== 'list') { bPinSibs(b, { on: S.bSel }); bPinKids(b, b.items.find((i) => i.id === S.bSel)); } if (S.bGrow === 'list') mmNew(S.bSel, null, null, bListFor(b, S.bSel)); else mmNew(S.bSel, null, v || null); } return true;
    case 'mroot': { const r = b && rootOf(b, S.bSel); S.bPanel = null; if (r) { if (S.bGrow === 'list') mmNew(r.id, null, null, bListFor(b, r.id)); else { if (!v) bPinSibs(b, { on: r.id }); mmNew(r.id, null, v || null); } } return true; }
    case 'mgrow': bMut((bb, x) => { if (!x) return; delete x.side; if (v) x.dir = v; else delete x.dir; }); requestAnimationFrame(() => S.bSel && mmCentre(S.bSel)); return true;
    case 'mtheme': bMut((bb, x) => { const r = x && rootOf(bb, x.id); if (r) r.theme = v === 'ink' ? undefined : v; }); return true;
    case 'mnewmap': { if (!b) return true; const before = bState(b); const id = uid('mn'); const sp = bEmptySpot(170, 60) || { x: 0.5, y: viewTop() + 0.1 }; b.items.push({ id, text: '', parent: null, x: sp.x, y: sp.y, k: 1, z: bTopZ(b) + 1 }); bTouch(b); S.bSel = id; S.bPanel = null; render(); mmEdit(id, before); return true; }
    case 'mlinkgo': { if (S.bLink) { S.bLink = null; S.bPanel = null; render(); return true; } const lb = curBoard(); S.bLink = S.bSel; S.bPanel = lb && (lb.links || []).some((l) => l.a === S.bSel || l.b === S.bSel) ? 'mlink' : null; render(); return true; }
    case 'mlinkdel': bMut((bb) => { bb.links = (bb.links || []).filter((l) => l.id !== v); }); return true;
    case 'mbubble': { if (!b) return true; const sp = bEmptySpot(130, 44) || { x: 0.5, y: viewTop() + 0.1 }; bBubbleAt(b, sp); return true; }
    case 'mbubble0': { if (!b) return true; const before = bState(b); const id = uid('mn'); const sp = bEmptySpot(130, 44) || { x: 0.5, y: viewTop() + 0.1 }; b.items.push({ id, text: '', parent: null, pill: true, x: sp.x, y: sp.y, k: 1, z: bTopZ(b) + 1 }); bTouch(b); S.bSel = id; S.bPanel = null; render(); mmEdit(id, before); return true; }
    case 'mplace': { const x = selItem(); if (!x || !x.parent) return true;
      if (v === 'tree') { bMut((bb, it) => { delete it.free; delete it.dx; delete it.dy; delete it.fside; }); return true; }
      if (v === 'free') { const Lo = mindLayout(b, rootOf(b, x.id)); const p = Lo.P[x.id], q = Lo.P[x.parent]; bMut((bb, it) => { it.free = true; it.dx = Math.round(p.cx - q.cx); it.dy = Math.round(p.cy - q.cy); delete it.dir; delete it.side; }); return true; }
      const n = document.querySelector(`.mbwrap .mmn[data-id="${x.id}"]`), bd = document.querySelector('.mbwrap .mboard'); const old = rootOf(b, x.id); if (!n || !bd) return true; const r = n.getBoundingClientRect(), R = bd.getBoundingClientRect(), W = bd.clientWidth;
      const kids = new Set([x.id]); let grow = true; while (grow) { grow = false; b.items.forEach((i) => { if (i.parent && kids.has(i.parent) && !kids.has(i.id)) { kids.add(i.id); grow = true; } }); }
      const sub = [...document.querySelectorAll('.mbwrap .mmn')].filter((e) => kids.has(e.dataset.id)); const fake = { contains: (e) => sub.includes(e) };
      const U = sub.map((e) => e.getBoundingClientRect()), uw = Math.max(...U.map((q) => q.right)) - Math.min(...U.map((q) => q.left)), uh = Math.max(...U.map((q) => q.bottom)) - Math.min(...U.map((q) => q.top));
      const sp = bEmptySpot(Math.min(W - 20, Math.max(140, uw * 2 + 20)), Math.max(60, uh + 30), { x: r.left + r.width / 2 - R.left, y: r.top + r.height / 2 - R.top }, fake) || { x: (r.left + r.width / 2 - R.left) / W, y: (r.top + r.height / 2 - R.top) / W };
      const kl = S.bKeepLook && mindLayout(b, old); const kp = kl && kl.P[x.id]; S.bKeepLook = false;
      bMut((bb, it) => { if (kp) { it.lv0 = kp.l; if (kl.col[x.id]) it.c0 = kl.col[x.id]; } it.parent = null; it.x = sp.x; it.y = sp.y; it.k = (old && old.k) || 1; it.z = bTopZ(bb) + 1; it.theme = old && old.theme; it.layout = old && old.layout; ['free', 'dx', 'dy', 'fside', 'dir', 'side'].forEach((k) => delete it[k]); }); return true; }
    case 'lkbrk': bMut((bb) => { const l = (bb.links || []).find((q) => q.id === S.bLk); if (l) { if (l.brk) delete l.brk; else l.brk = 1; } }); return true;
    case 'lkset': { const [k, val] = v.split(':'); S.bLkSty = Object.assign({}, S.bLkSty, { [k]: val || undefined }); bMut((bb) => { const l = (bb.links || []).find((q) => q.id === S.bLk); if (l) l[k] = val || undefined; }); return true; }
    case 'lkflip': bMut((bb) => { const l = (bb.links || []).find((q) => q.id === S.bLk); if (l) { const t = l.a; l.a = l.b; l.b = t; } }); return true;
    case 'lkdel': S.bLk = null; bMut((bb) => { bb.links = (bb.links || []).filter((l) => l.id !== v); }); return true;
    case 'bpanmin': S.bPanMin = !S.bPanMin; render(); return true;
    case 'mmulti': if (v === 'go') { S.bGpar = S.bSel; S.bMulti = []; S.bSelMode = 'one'; S.bSel = null; S.bPanel = null; S.bLk = null; S.bLink = null; } else { S.bMulti = null; S.bGpar = null; } render(); return true;
    case 'mgdir': S.bGdir = v || undefined; S.bGat = undefined; render(); return true;
    case 'mgrp': { let ids = (S.bMulti || []).filter((id) => b.items.some((i) => i.id === id && !i.t)); if (!ids.length) return true;
      { const it = (id) => b.items.find((i) => i.id === id); const sel = new Set(ids); const tops = ids.filter((id) => !it(id).parent || !sel.has(it(id).parent)); // a picked word with its own picked branches: those branches become its list
        if (v !== 'tree' && !S.bGpar && tops.length === 1 && ids.length > 1) { S.bGpar = tops[0]; ids = ids.filter((id) => it(id).parent === tops[0]); } else ids = tops; }
      const first = b.items.find((i) => ids.includes(i.id) && i.parent); const par = S.bGpar || (first ? first.parent : ids[0]); S.bGpar = null;
      const anc = new Set(); let a0 = b.items.find((i) => i.id === par); while (a0) { anc.add(a0.id); a0 = a0.parent && b.items.find((i) => i.id === a0.parent); }
      S.bMulti = null; bMut((bb) => { if (v !== 'tree' && S.bGdir) bPinSibs(bb, { on: par }); const gid = v === 'tree' ? null : uid('mg'); const ds = [...new Set(bb.items.filter((i) => ids.includes(i.id)).map((i) => i.dir || (i.g && ((bb.groups || []).find((q) => q.id === i.g) || {}).dir) || ''))]; const gd = S.bGdir || (ds.length === 1 && ds[0] ? ds[0] : undefined); if (gid) (bb.groups = bb.groups || []).push(Object.assign({ id: gid, parent: par, ls: v, dir: gd }, S.bGat ? { at: S.bGat } : {}, S.bGdir ? { nc: 1 } : {})); S.bGat = undefined;
        bb.items.forEach((i) => { if (!ids.includes(i.id) || anc.has(i.id)) return; if (i.parent !== par) { i.parent = par; ['lv0', 'c0', 'x', 'y', 'k', 'z', 'layout', 'theme', 'pill', 'dir', 'side'].forEach((k) => delete i[k]); }
          ['free', 'dx', 'dy', 'fside'].forEach((k) => delete i[k]); if (gid) i.g = gid; else delete i.g; });
        if (gid && S.bGdir) { const ms = bb.items.filter((i) => i.g === gid); bb.items = bb.items.filter((i) => i.g !== gid).concat(ms); }
        bb.groups = (bb.groups || []).filter((g) => bb.items.some((i) => i.g === g.id && i.parent === g.parent)); if (!bb.groups.length) delete bb.groups; }); return true; }
    case 'mgset': bMut((bb, x) => { const g = x && (bb.groups || []).find((q) => q.id === x.g); if (!g) return; if (v === 'out') { delete x.g; } else { const [k, val] = v.split(':'); g[k] = k === 'dir' && g.dir === val ? undefined : val; }
        bb.groups = (bb.groups || []).filter((q) => bb.items.some((i) => i.g === q.id && i.parent === q.parent)); }); return true;
    case 'mls': bMut((bb, x) => { if (x) x.ls = v || undefined; }); return true;
    case 'mspread': bMut((bb, x) => { const r = x && rootOf(bb, x.id); bb.items.forEach((i) => { if (r && rootOf(bb, i.id) === r) { delete i.dir; delete i.side; delete i.pin; delete i.nc; } }); (bb.groups || []).forEach((g) => { if (r && rootOf(bb, g.parent) === r) { delete g.pin; delete g.nc; } }); }); return true;
    case 'msib': { const x = selItem(); if (x && x.parent) mmNew(x.parent, x); return true; }
    case 'mcol': bMut((bb, x) => { if (x) x.col = v || undefined; }); return true;
    case 'mfold': { const id = ref || S.bSel; bMut((bb) => { const x = bb.items.find((i) => i.id === id); if (x) x.fold = !x.fold || undefined; }); return true; }
    case 'mfoldall': bMut((bb, sel) => { const r = sel && rootOf(bb, sel.id); bb.items.forEach((x) => { if (!r || x.t || rootOf(bb, x.id) !== r) return; if (x.parent && v === 'shut' && mmLevel(bb, x) === 1 && bb.items.some((i) => i.parent === x.id)) x.fold = true; else if (v === 'open') delete x.fold; }); }); return true;
    case 'mtick': bMut((bb, x) => { if (x) x.done = !x.done || undefined; }); return true;
    case 'mmove': bMut((bb, x) => { if (x) { bb.items.forEach((i) => { if (i.parent === x.parent) delete i.pin; }); (bb.groups || []).forEach((g) => { if (g.parent === x.parent) delete g.pin; }); mmMove(bb, x, v); } }); requestAnimationFrame(() => S.bSel && mmCentre(S.bSel)); return true;
    case 'mlayout': bMut((bb, x) => { const r = x && rootOf(bb, x.id); if (r) r.layout = v === 'both' ? undefined : v; }); return true;
    case 'mselmode': if (v === 'all') { S.bMulti = b ? b.items.filter((i) => !i.t).map((i) => i.id) : []; S.bGpar = null; render(); return true; } S.bSelMode = v; bToolsOnly(); return true;
    case 'lnall': S.bLines = b ? bAllLines(b) : []; S.bLnMulti = true; S.bMulti = null; S.bSel = null; S.bLk = null; S.bPanel = null; render(); return true;
    case 'lnmove': S.bLnMove = !S.bLnMove; render(); return true;
    case 'mpt': { const d = bPtStep(v); if (d && S.bSel) S.bNewPt = { on: S.bSel, side: d.side, v: d.v }; render(); return true; }
    case 'mptgo': { const T = b && bSnapTarget(b); if (T && T.mode === 'new' && T.cur) bNewAt(b, T, T.cur[0], T.cur[1]); return true; }
    case 'lnpt': { const T = b && bSnapTarget(b); const d = T && bPtStep(v); if (!d) return true; const before = bState(b); bSnapDrag = { b, T, dots: [d], before, cur: null }; if (T.mode === 'g' || T.mode === 'kid') bPinSibs(b, T); bSnapTo({ clientX: d.x, clientY: d.y }); bSnapDrag = null; bPush(b, before); bTouch(b); save(); return true; }
    case 'lndel': { const key = (S.bLines || [])[0]; S.bLines = null; S.bLnMove = false; if (!key || !b) { render(); return true; }
      if (key.startsWith('lk:')) { bMut((bb) => { bb.links = (bb.links || []).filter((l) => l.id !== key.slice(3)); }); return true; }
      // a branch line taken away: the word and what grows from it become a map of their own
      S.bSel = key; S.bKeepLook = true; boardAction('mplace', null, null, 'own'); S.bSel = null; render(); return true; }
    case 'lndone': S.bLnMove = false; S.bLines = null; S.bLnMulti = false; S.bPanel = null; render(); return true;
    case 'lstset': { const k = v.slice(0, v.indexOf(':')), val = v.slice(v.indexOf(':') + 1); const key = (S.bLines || [])[0] || ''; bMut((bb) => { const g = (bb.groups || []).find((q) => 'g:' + q.id === key); if (!g) return; if (k === 'ls') { g.ls = val; delete g.iside; if (val === 'row' && ['bullet', 'num'].includes(g.lst)) delete g.lst; } else if (k === 'iside') { if (val === 'r' || val === 'd') delete g.iside; else g.iside = val; } else if (val) g.lst = val; else delete g.lst; }); return true; }
    case 'lnset': { const k = v.slice(0, v.indexOf(':')), val = v.slice(v.indexOf(':') + 1); bMut((bb) => { (S.bLines || []).forEach((key) => { const o = bLnObj(bb, key); if (o) o[k] = val || undefined; }); bLnClean(bb); }); return true; }
    case 'lnat': bMut((bb) => { const k = (S.bLines || [])[0]; const g = (bb.groups || []).find((q) => 'g:' + q.id === k); if (g) { delete g.at; delete g.dir; delete g.pin; delete g.jat; } const x = bb.items.find((i) => i.id === k); if (x) { delete x.at; delete x.mat; delete x.pin; } }); return true;
    case 'mstab': S.bStab = v; bToolsOnly(); return true;
    case 'mstcol': S.bStCol = v; bToolsOnly(); return true;
    case 'lptab': S.bLtab = v; bToolsOnly(); return true;
    case 'mmapgo': S.bMap = true; S.bTool = null; S.bSel = S.bLines = S.bLk = S.bLink = S.bPanel = null; render(); return true;
    case 'mmapx': S.bMap = false; S.bTool = null; S.bLink = null; render(); return true;
    case 'mstsec': S.bStSec = v; bToolsOnly(); return true;
    case 'mtool': S.bTool = S.bTool === v ? null : v; S.bLink = null; render(); return true;
    case 'lpset': { const k = v.slice(0, v.indexOf(':')), val = v.slice(v.indexOf(':') + 1); S.bLnPaint = Object.assign({}, S.bLnPaint, { [k]: val || undefined }); bToolsOnly(); return true; }
    case 'lpall': bMut((bb) => { bAllLines(bb).forEach((key) => bPaintLine(bb, key)); bLnClean(bb); }); return true;
    case 'mpaint': bMut((bb) => (S.bMulti || []).forEach((id) => { const x = bb.items.find((i) => i.id === id && !i.t); if (x) bPaintBub(x); })); return true;
    case 'mst': { if (S.bTool === 'bub' && !S.bMulti && !S.bSel) { const P0 = S.bPaint = S.bPaint || {}; if (v === 'reset') { delete P0.st; bToolsOnly(); return true; } const st = Object.assign({}, P0.st); const k = v.slice(0, v.indexOf(':')), val = v.slice(v.indexOf(':') + 1);
        if (k === 'fs') st.fs = Math.max(9, Math.min(44, (st.fs || 14.5) + (val === '+' ? 1.5 : -1.5))); else if (k === 'b' || k === 'i') { if (st[k]) delete st[k]; else st[k] = 1; } else if (val === '') delete st[k]; else st[k] = val;
        if (Object.keys(st).length) P0.st = st; else delete P0.st; bToolsOnly(); return true; }
      const ids = S.bMulti ? S.bMulti.slice() : S.bSel ? [S.bSel] : []; if (!ids.length) return true;
      bMut((bb) => ids.forEach((id) => { const x = bb.items.find((i) => i.id === id && !i.t); if (!x) return;
        if (v === 'reset') { delete x.st; return; } const st = Object.assign({}, x.st); const k = v.slice(0, v.indexOf(':')), val = v.slice(v.indexOf(':') + 1);
        if (k === 'fs') { const lv = !x.parent ? (x.pill ? 4 : 0) : Math.min(3, mmLevel(bb, x)); const cur = st.fs || [17, 14.5, 13.5, 13.5, 14.5][lv]; st.fs = Math.max(9, Math.min(44, cur + (val === '+' ? 1.5 : -1.5))); }
        else if (k === 'b' || k === 'i') { if (st[k]) delete st[k]; else st[k] = 1; }
        else if (val === '') delete st[k]; else st[k] = val;
        if (Object.keys(st).length) x.st = st; else delete x.st; })); return true; }
    case 'mstsave': { const x = selItem() || (S.bMulti && b && b.items.find((i) => i.id === S.bMulti[0])) || (S.bTool === 'bub' ? S.bPaint : null); if (!x || !x.st) return true;
      (M.bubbleStyles = M.bubbleStyles || []).push({ id: uid('bs'), st: JSON.parse(JSON.stringify(x.st)) }); save(); bToolsOnly(); return true; }
    case 'mstuse': { const q = (M.bubbleStyles || []).find((k) => k.id === v); if (!q) return true; const qs = Object.assign({ shape: 'round' }, JSON.parse(JSON.stringify(q.st))); // a style is used exactly as its swatch shows, plain words included (2026-11-10)
      if (S.bTool === 'bub' && !S.bMulti && !S.bSel) { S.bPaint = { st: qs }; bToolsOnly(); return true; } const ids = S.bMulti ? S.bMulti.slice() : S.bSel ? [S.bSel] : [];
      bMut((bb) => ids.forEach((id) => { const x = bb.items.find((i) => i.id === id && !i.t); if (x) x.st = bStFull(qs); })); return true; }
    case 'mstdel': M.bubbleStyles = (M.bubbleStyles || []).filter((k) => k.id !== v); save(); bToolsOnly(); return true;
    case 'mselect': { const x = selItem(); if (!x || !b) return true; let ids = [x.id];
      const desc = (id) => b.items.filter((i) => i.parent === id && !i.t).forEach((k) => { ids.push(k.id); desc(k.id); });
      if (v === 'branch') desc(x.id);
      if (v === 'list' && x.g) ids = b.items.filter((i) => i.g === x.g && i.parent === x.parent).map((i) => i.id);
      if (v === 'map') { const r = rootOf(b, x.id); ids = [r.id]; desc(r.id); }
      S.bMulti = ids; S.bGpar = null; S.bSel = null; S.bPanel = null; render(); return true; }
    case 'mdelmany': { const ids = new Set(S.bMulti || []); if (!ids.size || !b) return true; let grow = true;
      while (grow) { grow = false; b.items.forEach((i) => { if (i.parent && ids.has(i.parent) && !ids.has(i.id)) { ids.add(i.id); grow = true; } }); }
      S.bMulti = null; S.bPanel = null; bMut((bb) => { bb.items = bb.items.filter((i) => !ids.has(i.id)); if (bb.links) bb.links = bb.links.filter((l) => !ids.has(l.a) && !ids.has(l.b));
        if (bb.groups) { bb.groups = bb.groups.filter((g) => bb.items.some((i) => i.g === g.id && i.parent === g.parent)); if (!bb.groups.length) delete bb.groups; } }); return true; }
    case 'bturn': { const x = selItem(); if (!x || !b) return true; const bd = document.querySelector('.mbwrap .mboard'); const W = bd ? bd.clientWidth : 360;
      if (!x.t) { if (b.items.some((i) => i.parent === x.id)) return true; const n = document.querySelector(`.mbwrap .mmn[data-id="${x.id}"]`); if (!n || !bd) return true;
        const r = n.getBoundingClientRect(), R = bd.getBoundingClientRect(); const id = uid('bi'); const w = Math.max(0.3, Math.min(0.8, r.width / W + 0.08));
        const it = v === 'note' ? { id, t: 'note', w: Math.max(0.36, w), fs: 0.065, fill: '#F6E7A6', font: 'hand', r: -1.5 } : { id, t: 'text', w, fs: 0.055 };
        Object.assign(it, { x: Math.max(0, (r.left + r.width / 2 - R.left) / W - it.w / 2), y: Math.max(0, (r.top - R.top) / W), text: x.text || '', z: bTopZ(b) + 1 });
        S.bSel = id; S.bPanel = null; bMut((bb) => { bb.items = bb.items.filter((i) => i.id !== x.id).concat([it]); if (bb.links) bb.links = bb.links.filter((l) => l.a !== x.id && l.b !== x.id);
          if (bb.groups) { bb.groups = bb.groups.filter((g) => bb.items.some((i) => i.g === g.id && i.parent === g.parent)); if (!bb.groups.length) delete bb.groups; } }); requestAnimationFrame(bMeasure); return true; }
      if (x.t !== 'text' && x.t !== 'note') return true;
      if (v === 'bubble') { const id = uid('mn'); const it = { id, text: x.text || '', parent: null, pill: true, x: x.x + x.w / 2, y: x.y + itemH(x) / 2, k: 1, z: bTopZ(b) + 1 };
        S.bSel = id; S.bPanel = null; bMut((bb) => { bb.items = bb.items.filter((i) => i.id !== x.id).concat([it]); }); return true; }
      bMut((bb, it) => { if (!it) return; if (v === 'note') { it.t = 'note'; it.fill = it.fill || '#F6E7A6'; it.font = 'hand'; it.r = it.r || -1.5; it.w = Math.max(it.w, 0.36); } else { it.t = 'text'; delete it.fill; delete it.font; delete it.r; } it.h = undefined; });
      requestAnimationFrame(bMeasure); return true; }
    case 'lkcol': bMut((bb) => { const l = (bb.links || []).find((q) => q.id === S.bLk); if (l) l.col = v || undefined; }); return true;
    case 'lkbend': bMut((bb) => { const l = (bb.links || []).find((q) => q.id === S.bLk); if (!l) return; delete l.c1; delete l.c2; delete l.pa; delete l.pb; if (v === 'straight') l.str = 1; else delete l.str; }); return true;
    case 'mzoom': mmZoom(v); return true;
  }
  return false; }
// text size changed: measure the new height so the board grows to fit
function bMeasure() { const b = curBoard(); if (!b) return; const W = moodWidth(); b.items.forEach((x) => { if ((x.t === 'text' || x.t === 'note') && x.h === undefined) { const n = document.querySelector(`.mbi[data-id="${x.id}"]`); if (n) x.h = n.offsetHeight / W; } }); save(); }
// mind map taps: pick a node; tap it again to write in it
document.addEventListener('click', (e) => { if (mSkip) { mSkip = false; return; } const n = e.target.closest && e.target.closest('.mbmap .mmn');
  if (!n || e.target.closest('.mmc')) return;
  const id = n.dataset.id; if (n.querySelector('.mmt').isContentEditable) return;
  if (S.bLink) { const from = S.bLink; if (from === id) { S.bLink = null; render(); return; } bMut((bb) => { bb.links = bb.links || []; const ex = bb.links.find((l) => (l.a === from && l.b === id) || (l.a === id && l.b === from)); if (ex) S.bLk = ex.id; else { const nl = Object.assign({ id: uid('lk'), a: from, b: id }, S.bLkSty || {}); bb.links.push(nl); S.bLk = nl.id; } }); S.bLink = null; S.bSel = null; S.bPanel = null; render(); return; }
  if (S.bMulti || e.shiftKey) { const L = S.bMulti || (S.bSel && S.bSel !== id ? [S.bSel] : []); if (!S.bMulti) S.bGpar = null; if (id === S.bGpar) return; const bb = curBoard(); const md = S.bMulti ? S.bSelMode || 'one' : 'one'; let add = [id]; const me = bb.items.find((i) => i.id === id);
    const desc = (q) => bb.items.filter((i) => i.parent === q && !i.t).forEach((k) => { add.push(k.id); desc(k.id); });
    if (md === 'branch') desc(id); if (md === 'list' && me && me.g) add = bb.items.filter((i) => i.g === me.g && i.parent === me.parent).map((i) => i.id); if (md === 'map') { const r = rootOf(bb, id); add = [r.id]; desc(r.id); }
    S.bMulti = add.every((q) => L.includes(q)) ? L.filter((q) => !add.includes(q)) : L.concat(add.filter((q) => !L.includes(q))); S.bSel = null; S.bPanel = null; render(); return; }
  if (S.bSel === id) mmEdit(id); else bPick(id); });
document.addEventListener('input', (e) => { if (e.target && e.target.id === 'btitle') { const b = curBoard(); if (b) { b.title = e.target.value.trim(); bTouch(b); save(); } } });
document.addEventListener('change', (e) => { const k = e.target && e.target.dataset && e.target.dataset.bcol; if (!k) return; const v = e.target.value; bMut((bb, x) => { if (!x) return; if (k === 'sw') x.col = v; else x.col = v; }); });
function mmKeep() { bMaps(); }
function mmScrollRoot() {}
document.addEventListener('change', (e) => { if (e.target && e.target.id === 'boardphoto' && e.target.files && e.target.files.length) bFiles(e.target.files); });
// tapping a tool while I'm still writing: finish the writing first, then do what the tool says
document.addEventListener('pointerdown', (e) => { const btn = e.target.closest && e.target.closest('#bdock [data-a], .bhd [data-a]'); const a = document.activeElement;
  if (!btn || !a || !a.isContentEditable) return; e.preventDefault(); const q = `[data-a="${btn.dataset.a}"]` + (btn.dataset.v != null ? `[data-v="${btn.dataset.v}"]` : ':not([data-v])');
  const inDock = !!btn.closest('#bdock'); a.blur(); const nb = document.querySelector((inDock ? '#bdock ' : '.bhd ') + q); if (nb) nb.click(); }, true);

// tapping a connection picks it
document.addEventListener('click', (e) => { const h = e.target.closest && e.target.closest('.mblk'); if (!h) return; if (S.bMulti) return; if (S.bLnMulti) { bLnToggle('lk:' + h.dataset.lk); return; } return; /* lines are only edited with the Lines tool (2026-11-12) */ S.bLines = null; S.bLk = h.dataset.lk; S.bSel = null; S.bPanel = null; S.bLink = null; S.bMulti = null; render(); });
document.addEventListener('input', (e) => { if (!(e.target && e.target.classList && e.target.classList.contains('lkin'))) return; const b = curBoard(); const l = b && (b.links || []).find((q) => q.id === e.target.dataset.lk); if (!l) return;
  if (!S.bLkBefore) S.bLkBefore = bState(b); l.label = e.target.value.trim() || undefined; bMaps(); });
document.addEventListener('change', (e) => { if (!(e.target && e.target.classList && e.target.classList.contains('lkin'))) return; const b = curBoard(); if (b && S.bLkBefore) { bPush(b, S.bLkBefore); bTouch(b); save(); } S.bLkBefore = null; });

// while linking, a line follows the pointer from the first bubble
document.addEventListener('pointermove', (e) => { if (!S.bLink || bLkDrag) return; const bd = document.querySelector('.mbwrap .mboard'); const sv = bd && bd.querySelector('.mblinks'); const n = bd && bd.querySelector(`.mmn[data-id="${S.bLink}"]`); if (!sv || !n) return;
  const B = bd.getBoundingClientRect(), r = n.getBoundingClientRect(); const p = { cx: r.left - B.left + r.width / 2, cy: r.top - B.top + r.height / 2, w: r.width, h: r.height }; const x = e.clientX - B.left, y = e.clientY - B.top; const [ax, ay] = mmEdge(p, x, y);
  let band = sv.querySelector('.lkband'); if (!band) { band = document.createElementNS('http://www.w3.org/2000/svg', 'path'); band.setAttribute('class', 'lkband'); sv.appendChild(band); }
  band.setAttribute('d', Math.hypot(x - p.cx, y - p.cy) < Math.max(r.width, r.height) / 2 ? '' : `M${ax} ${ay}L${x} ${y}`); });

// tapping a map line picks it; in select mode it joins the picked lines
function bLnToggle(key) { const L = S.bLines || []; S.bLines = L.includes(key) ? L.filter((q) => q !== key) : L.concat([key]); S.bLnMulti = true; S.bMulti = null; S.bSel = null; S.bLk = null; S.bPanel = null; render(); }
document.addEventListener('click', (e) => { const h = e.target.closest && e.target.closest('.mmhit'); if (!h) return; if (mSkip) return; const key = h.dataset.ln; const b = curBoard(); if (!b) return;
  // in select mode a line picks every word down that line
  if (S.bMulti) { const MI = mmItems(b); const out = []; const walk = (id) => { if (!String(id).startsWith('g:')) out.push(id); MI.filter((i) => i.parent === id).forEach((k) => walk(k.id)); }; walk(key);
    const L = S.bMulti; S.bMulti = out.every((q) => L.includes(q)) ? L.filter((q) => !out.includes(q)) : L.concat(out.filter((q) => !L.includes(q))); S.bSel = null; render(); return; }
  const T = bSnapTarget(b); if (T && (T.mode === 'new' || T.mode === 'grp')) return; // picking a snap point: lines stay out of the way
  if (S.bLnMulti) { bLnToggle(key); return; } /* a plain tap on a line does nothing: lines are edited with the Lines tool in Map (2026-11-12) */ });
// where a list leaves its word: drag (or tap) along the dots, it snaps to them
let bSnapDrag = null;
function bNewAt(b, T, side, v) { const r = b.items.find((i) => i.id === T.on); if (!r) return; S.bPanel = null; S.bNewPt = null; bPinSibs(b, T); bPinKids(b, r); if (S.bGrow === 'list') { const bf = bState(b); const gid = bListFor(b, r.id, side, String(v)); mmNew(r.id, null, null, gid); S.bEditBefore = bf; return; } mmNew(r.id, null, side); const nx = b.items.find((i) => i.id === S.bSel); if (nx) { nx.nc = 1; if (+v) nx.at = +v; } }
// arrows step from one connection point to the next one that way, so I never have to hit the small dots (the owner, 2026-11-12)
const bPtArrows = (act) => ['l', 'u', 'd', 'r'].map((k) => pB(act, k, icon({ l: 'arrow-left', u: 'arrow-up', d: 'arrow-down', r: 'arrow-right' }[k], 18), false, 'ico')).join('');
function bPtStep(dir) { const dots = [...document.querySelectorAll('.mbwrap .mmsnap')].map((n) => { const r = n.getBoundingClientRect(); return { n, side: n.dataset.side, v: n.dataset.side === 'j' ? n.dataset.v : +n.dataset.v, x: r.left + r.width / 2, y: r.top + r.height / 2 }; }); if (!dots.length) return null;
  const ux = { l: -1, r: 1 }[dir] || 0, uy = { u: -1, d: 1 }[dir] || 0; const cur = dots.find((d) => d.n.classList.contains('on'));
  if (!cur) return dots.find((d) => d.side === dir && !d.v) || dots.reduce((a, d) => d.x * ux + d.y * uy > a.x * ux + a.y * uy ? d : a);
  let best = null, bs = Infinity; dots.forEach((d) => { const ax = (d.x - cur.x) * ux + (d.y - cur.y) * uy; if (ax < 1) return; const sc = ax + 2.5 * Math.abs((d.x - cur.x) * uy + (d.y - cur.y) * ux); if (sc < bs) { bs = sc; best = d; } }); return best || cur; }
document.addEventListener('pointerdown', (e) => { const d = e.target.closest && e.target.closest('.mmsnap'); if (!d) return; e.preventDefault(); e.stopPropagation(); const b = curBoard(); if (!b) return; const T = bSnapTarget(b); if (!T) return;
  if (T.mode === 'new') { bNewAt(b, T, d.dataset.side, d.dataset.v); return; }
  const dots = [...document.querySelectorAll('.mmsnap')].map((n) => { const r = n.getBoundingClientRect(); return { side: n.dataset.side, v: n.dataset.side === 'j' ? n.dataset.v : +n.dataset.v, x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  bSnapDrag = { b, T, dots, before: bState(b), cur: null }; if (T.mode === 'g' || T.mode === 'kid') bPinSibs(b, T); bSnapTo(e); }, true);
// moving one branch leaves the others alone: pin every sibling to the side it is on now
// a branch moved to another side goes last there, and the ones already there keep their places
function bLast() {}
function bLastOld(b, gid, id) { if (gid) { const g = (b.groups || []).find((q) => q.id === gid); if (g) g.nc = 1; const ms = b.items.filter((i) => i.g === gid && g && i.parent === g.parent); b.items = b.items.filter((i) => !ms.includes(i)).concat(ms); }
  if (id) { const x = b.items.find((i) => i.id === id); if (x) { x.nc = 1; b.items = b.items.filter((i) => i !== x).concat([x]); } } }
// a word's own branches keep their side when I add one elsewhere on it
function bPinKids(b, r) { if (!r || !r.parent) return; const Lo = mindLayout(b, rootOf(b, r.id)); const p = Lo && Lo.P[r.id]; if (!p) return; const d0 = p.side > 0 ? 'r' : p.side < 0 ? 'l' : p.vs > 0 ? 'd' : 'u'; b.items.forEach((k) => { if (k.parent === r.id && !k.dir && !k.g && !k.free) k.dir = d0; }); }
function bPinSibs(b, T) { const r = rootOf(b, T.on); const Lo = r && mindLayout(b, r); if (!Lo) return; const P = Lo.P; const N = mmItems(b);
  const skip = new Set(); const add = (id) => { skip.add(id); N.filter((i) => i.parent === id).forEach((k) => add(k.id)); }; if (T.key) add(T.key);
  const dirOf = (p) => p ? (p.vs ? (p.vs > 0 ? 'd' : 'u') : p.side > 0 ? 'r' : p.side < 0 ? 'l' : null) : null;
  N.forEach((n) => { if (!n.parent || skip.has(n.id) || n.free || !P[n.id] || !P[n.parent] || String(n.id).startsWith('g:own')) return;
    const off = [Math.round((P[n.id].cx - P[n.parent].cx) * 10) / 10, Math.round((P[n.id].cy - P[n.parent].cy) * 10) / 10, n.parent];
    const o = n.virt ? (b.groups || []).find((g) => 'g:' + g.id === n.id) : b.items.find((i) => i.id === n.id); if (!o) return; delete o.pin; delete o.nc; if (n.parent !== T.on) return; if (!o.dir) { const d = dirOf(P[n.id]); if (d) { o.dir = d; delete o.side; } } });
  if (T.key) { const o = T.key.startsWith('g:') ? (b.groups || []).find((g) => 'g:' + g.id === T.key) : b.items.find((i) => i.id === T.key); if (o) delete o.pin; } }
function bSnapTo(e) { const d = bSnapDrag; if (!d) return; let best = d.dots[0]; d.dots.forEach((q) => { if (Math.hypot(q.x - e.clientX, q.y - e.clientY) < Math.hypot(best.x - e.clientX, best.y - e.clientY)) best = q; });
  const id = best.side + best.v; if (id === d.cur) return; d.cur = id; const T = d.T, b = d.b, v = best.v || undefined;
  if (T.mode === 'grp') { S.bGdir = best.side; S.bGat = v; }
  else if (T.mode === 'g' && best.side === 'j') { const g = (b.groups || []).find((q) => 'g:' + q.id === T.key); if (g) { if (best.v) g.jat = best.v; else delete g.jat; } }
  else if (T.mode === 'g') { const g = (b.groups || []).find((q) => 'g:' + q.id === T.key); if (g) { if (g.dir !== best.side || !T.cur || T.cur[0] !== best.side) bLast(b, g.id, null); g.dir = best.side; if (v) g.at = v; else delete g.at; } }
  else { const x = b.items.find((i) => i.id === T.key); if (!x) return; if (T.mode === 'm') { if (v) x.mat = v; else delete x.mat; } else { if (T.sides.length > 1) { if (T.cur && T.cur[0] !== best.side) bLast(b, null, x.id); x.dir = best.side; delete x.side; } if (v) x.at = v; else delete x.at; } }
  render(); }
document.addEventListener('pointermove', (e) => { if (bSnapDrag) bSnapTo(e); });
document.addEventListener('pointerup', () => { const d = bSnapDrag; if (!d) return; bSnapDrag = null; if (d.T.mode !== 'grp') { bPush(d.b, d.before); bTouch(d.b); save(); } mSkip = true; setTimeout(() => { mSkip = false; }, 0); });

// drag select: in Select, drag across the board to pick every word inside the box
let bMq = null;
document.addEventListener('pointerdown', (e) => { if (!S.bMulti || e.button) return; const cv = e.target.closest && e.target.closest('.mbwrap .mbcanvas'); if (!cv) return;
  if (e.target.closest('.mmn,.mmsnap,.mblh,#bdock,.bzm')) return; const bx = e.target.closest('.mbi'); const b = curBoard();
  bMq = { sx: e.clientX, sy: e.clientY, moved: false, empty: !e.target.closest('.mmhit,.mblk,.mbi'), item: bx && bx.dataset.id, b, before: b && bState(b) }; e.stopPropagation(); e.preventDefault(); }, true);
document.addEventListener('pointermove', (e) => { const d = bMq; if (!d) return; if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) return; d.moved = true;
  if (d.item && d.b) { // dragging a picked thing moves everything picked with it
    if (!d.mv) { if (!S.bMulti.includes(d.item)) S.bMulti.push(d.item); const bd = document.querySelector('.mbwrap .mboard'); d.W = bd ? bd.clientWidth : 360;
      d.mv = d.b.items.filter((i) => i.t && S.bMulti.includes(i.id) && !i.lock).map((i) => ({ i, x0: i.x, y0: i.y, el: document.querySelector(`.mbi[data-id="${i.id}"]`) })); }
    const dx = (e.clientX - d.sx) / d.W, dy = (e.clientY - d.sy) / d.W; d.mv.forEach((m) => { m.i.x = m.x0 + dx; m.i.y = m.y0 + dy; if (m.el) { m.el.style.left = m.i.x * 100 + '%'; m.el.style.top = `calc(100cqw * ${m.i.y})`; m.el.classList.add('msel'); } }); return; }
  let r = document.getElementById('bmq'); if (!r) { r = document.createElement('div'); r.id = 'bmq'; document.body.appendChild(r); }
  const l = Math.min(d.sx, e.clientX), t = Math.min(d.sy, e.clientY); Object.assign(r.style, { left: l + 'px', top: t + 'px', width: Math.abs(e.clientX - d.sx) + 'px', height: Math.abs(e.clientY - d.sy) + 'px' });
  d.box = { l, t, r: l + Math.abs(e.clientX - d.sx), b: t + Math.abs(e.clientY - d.sy) };
  document.querySelectorAll('.mbmap .mmn, .mbwrap .mbi').forEach((n) => { const q = n.getBoundingClientRect(); n.classList.toggle('mq', q.right > d.box.l && q.left < d.box.r && q.bottom > d.box.t && q.top < d.box.b); }); }, true);
document.addEventListener('pointerup', (e) => { const d = bMq; if (!d) return; bMq = null; const r = document.getElementById('bmq'); if (r) r.remove();
  if (d.moved && d.mv) { bPush(d.b, d.before); bTouch(d.b); save(); mSkip = true; setTimeout(() => { mSkip = false; }, 50); render(); return; }
  if (!d.moved && d.item) { const i = S.bMulti.indexOf(d.item); if (i < 0) S.bMulti.push(d.item); else S.bMulti.splice(i, 1); render(); return; }
  if (d.moved) { const ids = [...document.querySelectorAll('.mbmap .mmn.mq, .mbwrap .mbi.mq')].map((n) => n.dataset.id); S.bMulti = [...new Set([...(S.bMulti || []), ...ids])]; mSkip = true; setTimeout(() => { mSkip = false; }, 50); render(); }
  else if (d.empty) { S.bMulti = null; S.bPanel = null; S.bLines = null; render(); } }, true);

// viewing: I can look around the board (move about, zoom, open and fold branches) without picking up or changing anything
document.addEventListener('pointerdown', (e) => { if (!S.bVw) return; const cv = e.target.closest && e.target.closest('.mbwrap .mbcanvas'); if (!cv || e.target.closest('.mmc,#bdock,.bzm')) return;
  if (document.activeElement && document.activeElement.isContentEditable) document.activeElement.blur(); bPanStart(e); e.stopPropagation(); e.preventDefault(); }, true);
document.addEventListener('click', (e) => { if (!S.bVw) return; const cv = e.target.closest && e.target.closest('.mbwrap .mbcanvas'); if (!cv || e.target.closest('.mmc')) return; e.stopPropagation(); e.preventDefault(); }, true);

document.addEventListener('change', (e) => { const el = e.target; if (!(el && el.classList && el.classList.contains('lnnote'))) return; const val = el.value.trim() || undefined;
  if (el.dataset.lk) { bMut((bb) => { const l = (bb.links || []).find((q) => q.id === el.dataset.lk); if (l) l.note = val; }); return; }
  bMut((bb) => { (S.bLines || []).forEach((key) => { const o = bLnObj(bb, key); if (o) o.note = val; }); bLnClean(bb); }); });

// the map tools: with one picked, a tap on a word or a line does that tool's job
// previews of the style I'm holding
function bBubPrev(st) { st = st || {}; return `<span class="bspb" style="${mmStyleCss(Object.assign({}, st), 1).slice(1)}${st.shape === 'circle' ? ';width:68px;height:68px;padding:0;white-space:normal;font-size:12px;line-height:14px' : ''}">My bubble</span>`; }
function bLinePrev(lp) { const c = lp.col || '#7A7368', w = +lp.w || 1.4, da = lp.dash === 'dash' ? ` stroke-dasharray="${w * 4 + 2} ${w * 3 + 2}"` : lp.dash === 'dot' ? ` stroke-dasharray="0.1 ${w * 2.5 + 2}"` : '';
  const hd = (x, dir) => `<path d="M${x - dir * (5 + w * 1.5)} ${14 - 3 - w} L${x} 14 L${x - dir * (5 + w * 1.5)} ${14 + 3 + w}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  return `<svg class="bspl" viewBox="0 0 120 28" width="120" height="28"><path d="M10 14 L110 14" stroke="${c}" stroke-width="${lp.dash === 'dot' ? w + 0.8 : w}" stroke-linecap="round" fill="none"${da}/>${lp.arrow === 'end' || lp.arrow === 'both' ? hd(110, 1) : ''}${lp.arrow === 'start' || lp.arrow === 'both' ? hd(10, -1) : ''}</svg>`; }
function bPaintLine(bb, key) { const o = bLnObj(bb, key); if (!o) return; const lp = S.bLnPaint || {}; ['dash', 'w', 'arrow', 'col'].forEach((k) => { if (lp[k]) o[k] = lp[k]; else delete o[k]; }); }
// a given style looks exactly like its preview: a border left on the default colour becomes the preview's grey,
// not the word's own branch colour (2026-11-10)
const B_BC = '#7A7368';
const bStFull = (st) => { const o = JSON.parse(JSON.stringify(st)); if (mmBox(o) && !o.bc) o.bc = B_BC; return o; };
function bPaintBub(x) { const st = S.bPaint && S.bPaint.st; if (st && Object.keys(st).length) x.st = bStFull(st); else delete x.st; }
document.addEventListener('click', (e) => { if (!S.bMap || !S.bTool || S.bMulti || S.bVw) return; const cv = e.target.closest && e.target.closest('.mbwrap .mbcanvas'); if (!cv || e.target.closest('.mmc')) return;
  const n = e.target.closest('.mbmap .mmn'), h = e.target.closest('.mmhit'), lk = e.target.closest('.mblk'); const key = h ? h.dataset.ln : lk ? 'lk:' + lk.dataset.lk : null; const T = S.bTool;
  if (!n && !key) return; e.stopPropagation(); e.preventDefault(); if (mSkip) { mSkip = false; return; }
  if (T === 'link') { if (!n) return; const id = n.dataset.id; if (!S.bLink) { S.bLink = id; render(); return; } const from = S.bLink; S.bLink = null; if (from === id) { render(); return; }
    bMut((bb) => { bb.links = bb.links || []; if (!bb.links.some((l) => (l.a === from && l.b === id) || (l.a === id && l.b === from))) bb.links.push(Object.assign({ id: uid('lk'), a: from, b: id }, S.bLkSty || {})); }); return; }
  if (T === 'line') { const b0 = curBoard(); if (!b0) return;
    if (S.bLnMove && n && (S.bLines || []).length === 1) { const key0 = S.bLines[0], to = n.dataset.id; S.bLnMove = false;
      if (key0.startsWith('lk:')) { bMut((bb) => { const l = (bb.links || []).find((q) => q.id === key0.slice(3)); if (l && l.a !== to) l.b = to; }); return; }
      const bad = new Set([key0]); let grow = true; while (grow) { grow = false; b0.items.forEach((i) => { if (i.parent && bad.has(i.parent) && !bad.has(i.id)) { bad.add(i.id); grow = true; } }); }
      if (bad.has(to)) { render(); return; }
      bMut((bb) => { const it = bb.items.find((i) => i.id === key0); if (!it) return; it.parent = to; ['lv0', 'c0', 'g', 'dir', 'side', 'free', 'dx', 'dy', 'fside', 'pin', 'x', 'y', 'k', 'z'].forEach((k) => delete it[k]); }); return; }
    if (key) { S.bLines = [key]; S.bLnMulti = false; S.bLnMove = false; S.bSel = null; S.bLk = null; S.bPanel = null; render(); } return; }
  if (T === 'brk' && key) { bMut((bb) => { if (key.startsWith('lk:')) { const l = (bb.links || []).find((q) => q.id === key.slice(3)); if (l) { if (l.brk) delete l.brk; else l.brk = 1; } return; } const o = bLnObj(bb, key); if (o) { if (o.brk) delete o.brk; else o.brk = '1'; } bLnClean(bb); }); return; }
  if (T === 'bub' && key && (S.bStSec || 'bub') === 'line') { bMut((bb) => { if (key.startsWith('lk:')) { const l = (bb.links || []).find((q) => q.id === key.slice(3)); const lp = S.bLnPaint || {}; if (l) ['dash', 'w', 'arrow', 'col'].forEach((k) => { if (lp[k]) l[k] = lp[k]; else delete l[k]; }); return; } bPaintLine(bb, key); bLnClean(bb); }); return; }
  if (T === 'bub' && n && (S.bStSec || 'bub') === 'bub') { const id = n.dataset.id; bMut((bb) => { const x = bb.items.find((i) => i.id === id); if (x) bPaintBub(x); }); } }, true);
// a new loose bubble at a spot (board-width fractions); in map mode a double tap on the empty board puts one there (2026-11-10)
function bBubbleAt(b, sp) { const before = bState(b); const id = uid('mn'); b.items.push({ id, text: '', parent: null, pill: true, x: sp.x, y: sp.y, k: 1, z: bTopZ(b) + 1 }); bTouch(b); S.bSel = id; S.bPanel = null; render(); mmEdit(id, before); }
// save the board as a picture: drawn at 100% without my selection, cropped to what's on it (the owner, 2026-11-12)
let H2C = null;
function h2cLoad() { if (window.html2canvas) return Promise.resolve(window.html2canvas); if (H2C) return H2C;
  H2C = new Promise((ok, no) => { const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'; sc.onload = () => ok(window.html2canvas); sc.onerror = () => { H2C = null; no(new Error('load')); }; document.head.appendChild(sc); }); return H2C; }
async function bPng() { const b = curBoard(); if (!b) return;
  const keep = { z: S.bZoom, sel: S.bSel, multi: S.bMulti, lines: S.bLines, lk: S.bLk, panel: S.bPanel, map: S.bMap, tool: S.bTool, top: ($('#main') || {}).scrollTop, left: ($('#mbwrap') || {}).scrollLeft };
  try { const h2c = await h2cLoad(); S.bZoom = 1; S.bSel = null; S.bMulti = null; S.bLines = null; S.bLk = null; S.bPanel = null; S.bMap = false; S.bTool = null; render(); await new Promise((r) => setTimeout(r, 120)); if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const cv = document.querySelector('.mbwrap .mbcanvas'); if (!cv) throw new Error('no board'); const C = cv.getBoundingClientRect(); let l = Infinity, t = Infinity, r = -Infinity, bt = -Infinity;
    cv.querySelectorAll('.mbi, .mbmap .mmn').forEach((n) => { const q = n.getBoundingClientRect(); if (!q.width) return; l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); bt = Math.max(bt, q.bottom); });
    const pad = 24; const box = l === Infinity ? { x: 0, y: 0, width: C.width, height: Math.min(C.height, 600) } : { x: Math.max(0, l - C.left - pad), y: Math.max(0, t - C.top - pad), width: Math.min(C.width, r - C.left + pad) - Math.max(0, l - C.left - pad), height: Math.min(C.height, bt - C.top + pad) - Math.max(0, t - C.top - pad) };
    const pic = await h2c(cv, Object.assign({ scale: 2, backgroundColor: bBg(b), useCORS: true, logging: false, scrollX: 0, scrollY: 0, ignoreElements: (e) => e.classList && (e.classList.contains('bzm') || e.id === 'bdock') }, box));
    const blob = await new Promise((ok) => pic.toBlob(ok, 'image/png')); const name = ((b.title || 'Board').replace(/[\\/:*?"<>|]+/g, '').trim() || 'Board') + '.png'; const file = new File([blob], name, { type: 'image/png' });
    const phone = navigator.userAgentData ? navigator.userAgentData.mobile : /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
    if (phone && navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: name }); } catch (e) { if (e.name !== 'AbortError') throw e; } }
    else { const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 10000); }
  } catch (e) { flash(e && e.message === 'load' ? 'I need to be online to make the picture' : 'Could not make the picture'); }
  finally { Object.assign(S, { bZoom: keep.z, bSel: keep.sel, bMulti: keep.multi, bLines: keep.lines, bLk: keep.lk, bPanel: keep.panel, bMap: keep.map, bTool: keep.tool }); render(); const m = $('#main'), w = $('#mbwrap'); if (m) m.scrollTop = keep.top || 0; if (w) w.scrollLeft = keep.left || 0; } }

