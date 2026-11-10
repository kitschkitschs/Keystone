// ---------- project files and viewers (2026-11-08) ----------
// A project keeps files: its notes (G(p).notes), boards (M.boards with proj = p) and PDFs (G(p).files = [{ id, name, asset | src, upd, hl: [] }]).
// Photos and PDFs open in a full-screen viewer that lives outside render(), so the page can redraw under it.
const msDay = (ms) => { const d = new Date(ms || Date.now()); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
function projFiles(p) { const x = G(p);
  const N = (x.notes || []).map((n) => ({ k: 'note', id: n.id, name: n.title || (n.text || '').split('\n')[0] || 'Note', upd: n.upd || 0 }));
  const B = (M.boards || []).filter((b) => b.proj === p).map((b) => ({ k: 'board', id: b.id, name: boardTitle(b), upd: b.upd || 0 }));
  const F = (x.files || []).map((f) => ({ k: 'pdf', id: f.id, name: f.name || 'PDF', upd: f.upd || 0 }));
  return N.concat(B, F).sort((a, b) => b.upd - a.upd); }
function filesCard(p) { const L = projFiles(p), x = G(p); const kn = { note: 'Note', board: 'Board', pdf: 'PDF' };
  const prev = (f) => { if (f.k === 'note') { const n = (x.notes || []).find((q) => q.id === f.id) || {}; const lines = (n.text || '').split('\n').filter((l) => l.trim()).slice(n.title ? 0 : 1, 6);
      return `<button class="postit pjpv" data-a="nopen" data-v="${p}" data-ref="${f.id}" aria-label="${esc(f.name)}">${lines.map((l) => `<span class="pl">${esc(l)}</span>`).join('')}</button>`; }
    if (f.k === 'board') { const b = boardOf(f.id); return `<button class="bprev pjpv" data-a="pjbopen" data-ref="${f.id}" style="background:${bBg(b)}" aria-label="${esc(f.name)}">${moodHtml(b, true)}</button>`; }
    const pf = (x.files || []).find((q) => q.id === f.id) || {};
    return `<button class="pjpdf pjpv" data-a="pdfopen" data-v="${p}" data-ref="${f.id}" aria-label="${esc(f.name)}">${pf.thumb ? `<img src="${pf.thumb}" alt="">` : icon('file-text', 28)}${pf.mark ? `<span class="pjmk mono">${icon('bookmark', 12)} p${pf.mark.pg}</span>` : ''}</button>`; };
  const tile = (f) => `<div class="pjft">${prev(f)}<span class="bname">${esc(f.name)}</span><span class="mono pjfk">${kn[f.k]}${f.upd ? ' · ' + agoText(msDay(f.upd)) : ''}${S.edit && f.k === 'pdf' ? `<button class="rm" data-a="pdfdel" data-ref="${p}" data-v="${f.id}" aria-label="Delete ${esc(f.name)}">✕</button>` : ''}</span></div>`;
  // one add tile: tap it and it offers Note, Board or PDF
  // the + sits in the header and drops down Note, Board or PDF (2026-11-08)
  const menu = S.pjAdd === p ? `<div class="pjaddm"><button data-a="pnnew" data-v="${p}">${icon('sticky-note', 18)}Note</button><button data-a="pjbnew" data-v="${p}">${icon('layout-dashboard', 18)}Board</button><label>${icon('file-text', 18)}PDF<input type="file" accept="application/pdf" id="projpdf" data-ref="${p}" hidden></label></div>` : '';
  const plus = '';
  if ((x.files || []).some((f) => !f.thumb && !f.noThumb)) setTimeout(() => pdfThumbs(p), 0);
  return lcardPlus('pjn:' + p, 'Files', L.length || '', L.length ? `<div class="pjfiles">${L.map(tile).join('')}</div>` : '', plus); }
// the first page of each PDF becomes its preview, made once and kept with the file
let thumbBusy = false;
async function pdfThumbs(p) { if (thumbBusy) return; thumbBusy = true; let done = 0;
  try { const lib = await pdfJs(); for (const f of (G(p).files || []).filter((q) => !q.thumb && !q.noThumb)) {
      try { const doc = await lib.getDocument({ data: await pdfBytes(f) }).promise; const pg = await doc.getPage(1); const v1 = pg.getViewport({ scale: 1 }); const vp = pg.getViewport({ scale: 320 / v1.width });
        const cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height; const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
        await pg.render({ canvasContext: cx, viewport: vp }).promise; f.thumb = cv.toDataURL('image/jpeg', 0.7); done++; } catch (e) { f.noThumb = true; } } }
  catch (e) { /* pdf.js could not load: try again next time */ }
  thumbBusy = false; if (done) { save(); render(); } }
async function pdfBytes(f) { return f.asset ? new Uint8Array(await (await fetch(blobUrl(f.asset))).arrayBuffer()) : Uint8Array.from(atob(f.src.split(',')[1]), (c) => c.charCodeAt(0)); }
// a card whose header carries its own + (2026-11-08)
function lcardPlus(key, title, count, inner, plus, open) { if (open == null) open = !key || S.edit || S.open[key] !== false;
  return `<section class="card lcard pjcard"><div class="bhead"><button data-a="secopen" data-ref="${key}" aria-expanded="${open}" style="display:flex;align-items:center;gap:8px;flex:1;min-height:44px"><span class="nm mono" style="flex:1;text-align:left">${esc(title)}</span><span class="cnt">${esc(String(count || ''))}</span></button>${plus}<button class="pjchev" data-a="secopen" data-ref="${key}" aria-expanded="${open}" aria-label="${open ? 'Close' : 'Open'} ${esc(title)}">${fold(open)}</button></div>${inner && (open || key && key.startsWith('pjp:')) ? `<div class="list">${inner}</div>` : ''}</section>`; }
// photos: closed by default, then only the newest row shows
function photosCard(p) { const x = G(p); const ph = (x.photos || []).slice().reverse(); const key = 'pjp:' + p; if (S.open[key] === undefined) S.open[key] = false; const open = S.edit || S.open[key] !== false;
  const tile = (q) => `<span class="pph" data-a="phview" data-ref="${p}" data-v="${q.id}"><img src="${esc(projSrc(q))}" alt="">${S.edit ? `<button class="rm" data-a="projphrm" data-ref="${p}" data-v="${q.id}" aria-label="Remove photo">✕</button>` : ''}</span>`;
  const add = '';
  const shown = open ? ph : ph.slice(0, 3);
  return lcardPlus(key, 'Photos', ph.length || '', ph.length ? `<div class="pjgrid">${shown.map(tile).join('')}</div>` : '', add, open); }

// ----- the viewer -----
let VW = null;
function vwEl() { let el = document.getElementById('viewer'); if (!el) { el = document.createElement('div'); el.id = 'viewer'; $('#phone').appendChild(el); } return el; }
function vwClose() { VW = null; const el = document.getElementById('viewer'); if (el) el.remove(); }
// one photo viewer for project photos, food diary photos and journal pictures (2026-11-08): VW.list() gives
// [{ id, src, d, at, cap, rm: [act, ref, v], ed: [act, ref, v] }], newest first
function phView(p, id) { vwOpen(() => (G(p).photos || []).slice().reverse().map((q) => ({ id: q.id, src: projSrc(q), d: q.d, rm: ['projphrm', p, q.id] })), id); }
function vwOpen(list, id) { const L = list(); VW = { kind: 'photo', list, i: Math.max(0, L.findIndex((q) => q.id === id)) }; vwPhoto(); }
function vwPhoto() { const L = VW.list(); if (!L.length) { vwClose(); return; } VW.i = Math.max(0, Math.min(VW.i, L.length - 1)); const q = L[VW.i];
  const btn = (x, ic, lab) => x ? `<button class="vwb" data-a="${x[0]}" data-ref="${esc(x[1])}" data-v="${esc(x[2])}" aria-label="${lab}">${icon(ic, 20)}</button>` : '';
  const right = btn(q.ed, 'pencil', 'Edit') + btn(q.rm, 'trash', 'Delete this photo');
  vwEl().className = 'vwph'; vwEl().innerHTML = `<div class="vwbar"><button class="vwb" data-a="vwx" aria-label="Close">${icon('x', 22)}</button>${q.ed && q.rm ? '<span class="vwb" aria-hidden="true"></span>' : ''}<span class="mono vwn">${L.length > 1 ? (VW.i + 1) + ' / ' + L.length : ''}</span>${right || '<span class="vwb" aria-hidden="true"></span>'}</div>
    <div class="vwimg"><img src="${esc(q.src)}" alt=""></div>${q.cap ? `<p class="vwcap">${esc(q.cap)}</p>` : ''}
    <div class="vwfoot"><button class="vwb vwnav" data-a="vwstep" data-v="-1" aria-label="Newer photo"${VW.i && L.length > 1 ? '' : ' disabled'}>${icon('chevron-left', 24)}</button><span class="mono vwd">${q.d ? esc(lowDay(q.d)) + (q.at ? ' · ' + esc(q.at) : '') : ''}</span><button class="vwb vwnav" data-a="vwstep" data-v="1" aria-label="Older photo"${VW.i < L.length - 1 ? '' : ' disabled'}>${icon('chevron-right', 24)}</button></div>`; }
// food diary photos: every meal with a photo, newest first; the pencil opens the meal
function mealView(d, id) { vwOpen(() => { const out = []; Object.keys(M.photos || {}).filter((k) => /^\d{4}-\d\d-\d\d$/.test(k)).sort().reverse().forEach((day) => mealsOn(day).slice().reverse().forEach((p) => { if (mealSrc(p)) out.push({ id: p.id, src: mealSrc(p), d: day, at: p.at, cap: p.text || '', rm: ['mealphrm', p.id, day], ed: ['mealedit', p.id, day] }); })); return out; }, id); }

// PDFs open with pdf.js; a highlighter draws marks over the page, kept as fractions of the page
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
let pdfLib = null;
function pdfJs() { if (pdfLib) return pdfLib; pdfLib = new Promise((res, rej) => { const s = document.createElement('script'); s.src = PDFJS + 'pdf.min.js'; s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; res(window.pdfjsLib); }; s.onerror = () => { pdfLib = null; rej(new Error('pdf.js')); }; document.head.appendChild(s); }); return pdfLib; }
const HLC = ['#F4D35E', '#9ED39F', '#F2A7C0', '#9CC3EC'];
// my own highlight and bookmark colours, set in the PDF's ⋯ menu (2026-11-09); a highlight keeps its slot (k), so changing a slot recolours its marks
const pdCols = () => M.settings.pdfCols || {};
const pdHl = () => { const H = pdCols().hl || []; return Array.from({ length: Math.max(HLC.length, H.length) }, (_, i) => H[i] || HLC[i] || '#F4A259'); }; // more can be added in the ⋯ menu (2026-11-09)
const pdMarkCol = () => pdCols().mark || '#E39B5B';
const hlCol = (h) => h.k != null ? pdHl()[h.k] : h.c;
function pdSetCol(key, v) { const C = M.settings.pdfCols = M.settings.pdfCols || {}; if (key === 'mark') C.mark = v; else (C.hl = C.hl || [])[+key.slice(2)] = v;
  setTimeout(() => { if (VW && VW.kind === 'pdf') { pdfBar(); if (VW.doc) for (let n = 1; n <= VW.doc.numPages; n++) pdfMarks(n); } }); }
const pdGetCol = (key) => key === 'mark' ? pdMarkCol() : pdHl()[+key.slice(2)];
const pdfFile = () => VW && (G(VW.p).files || []).find((f) => f.id === VW.fid);
async function pdfOpen(p, fid) { VW = { kind: 'pdf', p, fid, zoom: 1, hl: false, mk: false, k: 0, menu: false, toMark: true }; const f = pdfFile(); if (!f) return;
  const el = vwEl(); el.className = 'vwpdf'; el.innerHTML = `<div class="vwbar">${''}</div><div class="pdsc"><p class="empty" style="text-align:center;padding:40px 0">Opening…</p></div>`; pdfBar();
  try { const lib = await pdfJs(); const data = await pdfBytes(f);
    if (!VW || VW.fid !== fid) return; VW.doc = await lib.getDocument({ data }).promise; pdfDraw(); }
  catch (e) { const sc = el.querySelector('.pdsc'); if (sc) sc.innerHTML = '<p class="empty" style="text-align:center;padding:40px 0">Could not open this PDF</p>'; } }
function pdfBar() { const f = pdfFile(); const bar = vwEl().querySelector('.vwbar'); if (!bar || !f) return;
  bar.innerHTML = `<button class="vwb" data-a="vwx" aria-label="Close">${icon('x', 22)}</button><input class="vwt" id="pdfname" value="${esc(f.name)}" aria-label="PDF name" maxlength="80">
    <button class="vwb" data-a="pdzoom" data-v="-1" aria-label="Smaller">${icon('zoom-out', 20)}</button><button class="vwb" data-a="pdzoom" data-v="1" aria-label="Bigger">${icon('zoom-in', 20)}</button>
    <button class="vwb ${VW.mk ? 'on' : ''}" data-a="pdmk" aria-pressed="${VW.mk}" aria-label="Progress mark">${icon('bookmark', 20)}</button><button class="vwb ${VW.hl ? 'on' : ''}" data-a="pdhl" aria-pressed="${VW.hl}" aria-label="Highlighter">${icon('highlighter', 20)}</button>
    <button class="vwb ${VW.menu ? 'on' : ''}" data-a="pdmenu" aria-haspopup="menu" aria-expanded="${!!VW.menu}" aria-label="More">${icon('ellipsis', 20)}</button>`
    + (VW.hl ? `<div class="pdcols">${pdHl().map((c, i) => `<button class="pdcol" data-a="pdcol" data-v="${i}" aria-pressed="${VW.k === i}" style="background:${c}" aria-label="Highlight colour ${i + 1}"></button>`).join('')}</div>` : '')
    // the ⋯ menu (2026-11-09): bookmark colour, highlight colours, and Delete last, out of the way
    + (VW.menu ? `<span class="pdmx" data-a="pdmenu"></span><div class="pdmenu" role="menu"><span class="mono">Bookmark colour</span><div class="pdmrow"><button class="pdcol" data-a="colopen" data-ref="pdc:mark" style="background:${pdMarkCol()}" aria-label="Change the bookmark colour"></button></div>
      <span class="mono">Highlight colours</span><div class="pdmrow">${pdHl().map((c, i) => `<button class="pdcol" data-a="colopen" data-ref="pdc:hl${i}" style="background:${c}" aria-label="Change highlight colour ${i + 1}"></button>`).join('')}<button class="pdcol pdadd" data-a="pdhladd" aria-label="Add a highlight colour">${icon('plus', 16)}</button></div>
      <button class="pdmdel" role="menuitem" data-a="pdfdel" data-ref="${VW.p}" data-v="${VW.fid}">${icon('trash', 18)}Delete this PDF</button></div>` : ''); }
async function pdfDraw() { const sc = vwEl().querySelector('.pdsc'); if (!sc || !VW.doc) return; const fr = sc.scrollHeight ? sc.scrollTop / sc.scrollHeight : 0;
  const W = (sc.clientWidth - 16) * VW.zoom, dpr = window.devicePixelRatio || 1; const tok = VW.tok = {}; sc.innerHTML = ''; sc.classList.toggle('hl', VW.hl);
  for (let n = 1; n <= VW.doc.numPages; n++) { const pg = await VW.doc.getPage(n); if (VW.tok !== tok) return; const v1 = pg.getViewport({ scale: 1 }); const vp = pg.getViewport({ scale: W / v1.width });
    const wrap = document.createElement('div'); wrap.className = 'pdpg'; wrap.dataset.pg = n; wrap.style.width = vp.width + 'px'; wrap.style.height = vp.height + 'px';
    const cv = document.createElement('canvas'); cv.width = Math.round(vp.width * dpr); cv.height = Math.round(vp.height * dpr); cv.style.width = vp.width + 'px'; cv.style.height = vp.height + 'px';
    const ov = document.createElement('div'); ov.className = 'pdov'; wrap.append(cv, ov); sc.appendChild(wrap); pdfMarks(n); pdfWords(n).catch(() => {});
    if (n === 1 && fr) sc.scrollTop = fr * sc.scrollHeight;
    const fm = pdfFile() && pdfFile().mark; if (VW.toMark && fm && fm.pg === n) { VW.toMark = false; sc.scrollTop = wrap.offsetTop + fm.y * vp.height - sc.clientHeight * 0.35; } // opens where I left off
    pg.render({ canvasContext: cv.getContext('2d'), viewport: pg.getViewport({ scale: (W / v1.width) * dpr }) }); }
  if (fr) sc.scrollTop = fr * sc.scrollHeight; }
// marks on a page: highlights cover whole words (one box per line), the progress mark is a long band across the page
function pdfMarks(n) { const f = pdfFile(); const ov = vwEl().querySelector(`.pdpg[data-pg="${n}"] .pdov`); if (!f || !ov) return;
  const box = (q, c, cls, extra) => `<span class="${cls}" ${extra} style="left:${q[0] * 100}%;top:${q[1] * 100}%;width:${q[2] * 100}%;height:${q[3] * 100}%;background:${c}"></span>`;
  ov.innerHTML = (f.mark && f.mark.pg === n ? `<span class="pdprog" style="top:${f.mark.y * 100}%;height:${(f.mark.h || 0.024) * 100}%;background:${pdMarkCol()};box-shadow:inset 3px 0 0 ${mix(pdMarkCol(), '#000000', 0.25)}"></span>` : '')
    + (f.hl || []).filter((h) => h.pg === n).map((h) => (h.r || [[h.x, h.y, h.w, h.h]]).map((q) => box(q, hlCol(h), 'pdmk', `data-a="pdhlrm" data-v="${h.id}"`)).join('')).join(''); }
// the words on each page, in reading order, as boxes in page fractions (from pdf.js text)
// where a letter sits along a line of text: measured with the line's own font family, so narrow letters and brackets land right
let pdCtx = null; const pdFrac = (s, i, fam) => { if (!i) return 0; if (i >= s.length) return 1; pdCtx = pdCtx || document.createElement('canvas').getContext('2d'); pdCtx.font = '20px ' + fam; const w = pdCtx.measureText(s).width; return w ? pdCtx.measureText(s.slice(0, i)).width / w : i / s.length; };
async function pdfWords(n) { VW.words = VW.words || {}; if (VW.words[n]) return VW.words[n]; const pg = await VW.doc.getPage(n); const v1 = pg.getViewport({ scale: 1 }); const tc = await pg.getTextContent(); const W = [];
  tc.items.forEach((it) => { const s = it.str || ''; if (!s.trim()) return; const t = it.transform; const fam = ((tc.styles || {})[it.fontName] || {}).fontFamily || 'sans-serif'; const fh = Math.hypot(t[2], t[3]) || it.height || 10; const len = s.length;
    s.replace(/[^\s()[\]{}<>]+/g, (w0, i0) => { const m = w0.match(/^[\s"'“”‘’«».,;:!?*•·–—-]*(.*?)[\s"'“”‘’«».,;:!?*•·–—-]*$/); if (!m || !m[1]) return w0; const wd = m[1]; /* lone punctuation is never a word */ const i = i0 + (m && m[1] ? w0.indexOf(m[1]) : 0);
      const x0 = t[4] + it.width * pdFrac(s, i, fam), x1 = t[4] + it.width * pdFrac(s, i + wd.length, fam);
      const a = v1.convertToViewportPoint(x0, t[5] + fh * 0.88), b = v1.convertToViewportPoint(x1, t[5] - fh * 0.24);
      W.push([Math.min(a[0], b[0]) / v1.width, Math.min(a[1], b[1]) / v1.height, Math.abs(b[0] - a[0]) / v1.width, Math.abs(b[1] - a[1]) / v1.height]); return wd; }); });
  VW.words[n] = W; return W; }
const wNear = (W, x, y) => { let best = -1, bd = 1e9; W.forEach((q, i) => { const dx = x < q[0] ? q[0] - x : x > q[0] + q[2] ? x - q[0] - q[2] : 0, dy = y < q[1] ? q[1] - y : y > q[1] + q[3] ? y - q[1] - q[3] : 0; const d = dx + dy * 4; if (d < bd) { bd = d; best = i; } }); return bd < 0.06 ? best : -1; };
// words a..b joined into one box per line
function wRects(W, a, b) { const out = []; for (let i = Math.min(a, b); i <= Math.max(a, b); i++) { const q = W[i], L = out[out.length - 1];
    if (L && Math.abs(L[1] - q[1]) < q[3] * 0.5 && q[0] >= L[0] - 0.01) { const r = Math.max(L[0] + L[2], q[0] + q[2]); L[1] = Math.min(L[1], q[1]); L[3] = Math.max(L[3], q[3]); L[2] = r - L[0]; } else out.push(q.slice()); } return out; }
let pdDrag = null;
const pdPt = (e, r) => [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
// the progress mark: in mark mode a tap on a page puts my one mark on that line
document.addEventListener('click', async (e) => { if (!VW || VW.kind !== 'pdf' || !VW.mk) return; const ov = e.target.closest && e.target.closest('.pdov'); if (!ov) return; const r = ov.getBoundingClientRect(); const f = pdfFile(); if (!f) return;
  const pg = +ov.parentNode.dataset.pg; const [x, y] = pdPt(e, r); const W = await pdfWords(pg).catch(() => []); let my = y - 0.012, mh = 0.024;
  let line = W.filter((q) => y >= q[1] - 0.004 && y <= q[1] + q[3] + 0.004); if (!line.length && W.length) { const nq = W.reduce((m, q) => Math.abs(q[1] + q[3] / 2 - y) < Math.abs(m[1] + m[3] / 2 - y) ? q : m); if (Math.abs(nq[1] + nq[3] / 2 - y) < 0.04) line = W.filter((q) => Math.abs(q[1] - nq[1]) < nq[3] * 0.5); } // between lines: the nearest line if (line.length) { my = Math.min(...line.map((q) => q[1])) - 0.003; mh = Math.max(...line.map((q) => q[1] + q[3])) - my + 0.003; }
  const old = f.mark && f.mark.pg; change(() => { f.mark = { pg, y: Math.max(0, my), h: mh }; f.upd = Date.now(); }); if (old && old !== pg) pdfMarks(old); pdfMarks(pg); });
document.addEventListener('change', (e) => { if (e.target && e.target.id === 'pdfname') { const f = pdfFile(); const v = e.target.value.trim(); if (f && v && v !== f.name) change(() => { f.name = v; }); } });
// the highlighter: press on a word and drag to the last word; a tap marks one word
document.addEventListener('pointerdown', (e) => { if (!VW || VW.kind !== 'pdf' || !VW.hl) return; const ov = e.target.closest && e.target.closest('.pdov'); if (!ov || e.target.closest('.pdmk')) return;
  const pg = +ov.parentNode.dataset.pg; const W = (VW.words || {})[pg]; if (!W || !W.length) return; const r = ov.getBoundingClientRect(); const [x, y] = pdPt(e, r); const a = wNear(W, x, y); if (a < 0) return;
  const lay = document.createElement('span'); lay.className = 'pdlive'; ov.appendChild(lay); pdDrag = { ov, r, pg, W, a, b: a, lay }; pdLive(); e.preventDefault(); });
function pdLive() { const d = pdDrag; d.lay.innerHTML = wRects(d.W, d.a, d.b).map((q) => `<span class="pdmk" style="left:${q[0] * 100}%;top:${q[1] * 100}%;width:${q[2] * 100}%;height:${q[3] * 100}%;background:${pdHl()[VW.k]}"></span>`).join(''); }
document.addEventListener('pointermove', (e) => { if (!pdDrag) return; const [x, y] = pdPt(e, pdDrag.r); const b = wNear(pdDrag.W, x, y); if (b >= 0 && b !== pdDrag.b) { pdDrag.b = b; pdLive(); } });
document.addEventListener('pointerup', () => { if (!pdDrag) return; const d = pdDrag; pdDrag = null; d.lay.remove(); const f = pdfFile(); if (!f) return;
  change(() => { (f.hl = f.hl || []).push({ id: uid('hl'), pg: d.pg, k: VW.k, c: pdHl()[VW.k], r: wRects(d.W, d.a, d.b) }); f.upd = Date.now(); }); pdfMarks(d.pg); });
document.addEventListener('keydown', (e) => { if (VW && e.key === 'Escape' && !S.ask) { vwClose(); e.stopPropagation(); } }, true);
// turning the phone (2026-11-09): the PDF fills the screen in landscape and is drawn again at the new width
let pdRot = null, pdW = 0; addEventListener('resize', () => { clearTimeout(pdRot); pdRot = setTimeout(() => { if (!VW || VW.kind !== 'pdf' || !VW.doc) return; const sc = vwEl().querySelector('.pdsc'); if (sc && sc.clientWidth !== pdW) { pdW = sc.clientWidth; pdfDraw(); } }, 200); });
// swiping between photos
let vwSw = null;
document.addEventListener('pointerdown', (e) => { if (VW && VW.kind === 'photo' && e.target.closest && e.target.closest('.vwimg')) vwSw = { x: e.clientX, y: e.clientY }; });
document.addEventListener('pointerup', (e) => { if (!vwSw) return; const dx = e.clientX - vwSw.x, dy = e.clientY - vwSw.y; vwSw = null; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { const L = (G(VW.p).photos || []).length; const i = VW.i + (dx < 0 ? 1 : -1); if (i >= 0 && i < L) { VW.i = i; vwPhoto(); } } });

async function addPdf(file, p) { const g = G(p); if (!g) return;
  try { const f = { id: uid('pf'), name: file.name.replace(/\.pdf$/i, ''), upd: Date.now(), hl: [] };
    if (assetsNS === undefined) { try { assetsNS = window.claude && window.claude.use ? await window.claude.use('assets') : null; } catch (e) { assetsNS = null; } if (!assetsNS && HOSTED) assetsNS = LOCAL_ASSETS; }
    if (assetsNS) { const up = await assetsNS.upload(file); f.asset = up.id; }
    else { if (file.size > 3e6) { flash('This PDF is too big to keep here'); return; } f.src = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); }); }
    S.pjAdd = null; change(() => { (g.files = g.files || []).push(f); }, 'PDF added'); }
  catch (e) { flash('Could not add that PDF'); } }
document.addEventListener('change', (e) => { if (e.target && e.target.id === 'projpdf' && e.target.files && e.target.files[0]) addPdf(e.target.files[0], e.target.dataset.ref); });

function fileAction(act, a, ref, v) {
  switch (act) {
    case 'phview': if (S.edit) return true; phView(ref, v); return true;
    case 'vwx': vwClose(); return true;
    case 'vwstep': VW.i += +v; vwPhoto(); return true;
    case 'mealview': mealView(v, ref); return true;
    case 'mealedit': vwClose(); openSheet({ kind: 'photo', ref, d: v || T0, title: 'Meal' }); return true;
    case 'mealphrm': { const p = mealsOn(v).find((x) => x.id === ref); if (!p) return true; change(() => { delete p.asset; delete p.src; }, 'Photo deleted'); if (VW && VW.kind === 'photo') vwPhoto(); if (S.sheet) renderLayer(); return true; }
    case 'pdfopen': pdfOpen(v, ref); return true;
    case 'pdzoom': VW.zoom = Math.max(1, Math.min(3, VW.zoom + (+v) * 0.5)); pdfDraw(); return true;
    case 'pjadd': S.pjAdd = S.pjAdd === v ? null : v; render(); return true;
    case 'pdmk': VW.mk = !VW.mk; VW.hl = false; pdfBar(); { const sc = vwEl().querySelector('.pdsc'); if (sc) { sc.classList.remove('hl'); sc.classList.toggle('mk', VW.mk); } } return true;
    case 'pdhl': VW.hl = !VW.hl; VW.mk = false; { const sc0 = vwEl().querySelector('.pdsc'); if (sc0) sc0.classList.remove('mk'); } pdfBar(); const sc = vwEl().querySelector('.pdsc'); if (sc) sc.classList.toggle('hl', VW.hl); return true;
    case 'pdcol': VW.k = +v; pdfBar(); return true;
    case 'pdmenu': VW.menu = !VW.menu; pdfBar(); return true;
    case 'pdhladd': { const C = M.settings.pdfCols = M.settings.pdfCols || {}; const n = pdHl().length; C.hl = pdHl().concat(['#F4A259']); save(); VW.k = n; pdfBar(); openColorPick('pdc:hl' + n); return true; }
    case 'pdhlrm': { if (!VW || !VW.hl) return true; const f = pdfFile(); const h = f && (f.hl || []).find((q) => q.id === v); if (!h) return true; change(() => { f.hl = f.hl.filter((q) => q.id !== v); }); pdfMarks(h.pg); return true; }
    case 'pdfdel': { const g = G(ref); if (VW && VW.fid === v) vwClose(); change(() => { g.files = (g.files || []).filter((f) => f.id !== v); }, 'PDF deleted'); return true; }
    case 'pjbnew': { S.pjAdd = null; S.sheet = null; const id = uid('bd'); const nb = { id, kind: 'mood', title: '', upd: Date.now(), items: [], proj: v };
      change(() => { boards().push(nb); }, null, false); S.bBack = 'proj:' + v; S.area = 'notebook'; S.nbView = 'board'; S.board = id; S.bSel = null; S.bPanel = null; render(); $('#main').scrollTop = 0; const t = $('#btitle'); if (t) t.focus(); return true; }
    case 'pjbopen': { const b = boardOf(ref); if (!b) return true; S.bBack = 'proj:' + b.proj; S.area = 'notebook'; S.nbView = 'board'; S.board = ref; S.bZoom = 1; S.bSL = 0; S.bSel = null; S.bMenu = false; S.bPanel = null; render(); $('#main').scrollTop = 0; return true; }
  }
  return false;
}
// a board opened from a project goes back to the project
function bBackTo() { const bk = S.bBack || 'home'; if (String(bk).startsWith('proj:')) { const p = bk.slice(5); S.board = null; S.bBack = null; S.nbView = 'home'; if (G(p)) { S.area = 'hobbies'; S.hob = hobOf(p); S.proj = p; } return true; } return false; }
// the add drop-down closes when I tap anywhere else
document.addEventListener('click', (e) => { if (S.pjAdd && !(e.target.closest && e.target.closest('.pjaddm,.pjplus'))) { S.pjAdd = null; render(); } }, true);
// a file picked from the + pop-up closes the pop-up
document.addEventListener('change', (e) => { if (S.sheet && S.sheet.kind === 'add' && e.target && (e.target.id === 'projphoto' || e.target.id === 'projpdf')) { S.sheet = null; renderLayer(); } });
