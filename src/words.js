// ===================== Word bank (2026-11-09) =====================
// Words I like and want to remember, kept as cards in the Notebook: M.words = [{ id, word, mean, note, upd }].
// The Words page is a card deck: swipe left or right to move through it, tap a card to turn it over.
const wList = () => (M.words = M.words || []);
// every word has a language, shown as a flag: English (the default) or Norwegian (2026-11-10)
const WLANGS = [['en', 'English'], ['no', 'Norwegian']];
const wLang = (w) => (w && w.lang === 'no' ? 'no' : 'en');
const wLangName = (k) => (WLANGS.find((x) => x[0] === k) || WLANGS[0])[1];
const wFL = () => (S.wLang === 'en' || S.wLang === 'no' ? S.wLang : 'all');
// minimal flags with no colour, drawn in the text colour (2026-11-10)
function flagSvg(k, h = 12) { const w = Math.round(h * 1.4);
  const box = '<rect x=".6" y=".6" width="12.8" height="8.8" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.1"/>';
  if (k === 'no') return `<svg class="flag" width="${w}" height="${h}" viewBox="0 0 14 10" aria-hidden="true">${box}<path d="M5 .6v8.8M.6 5h12.8" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>`;
  return `<svg class="flag" width="${w}" height="${h}" viewBox="0 0 14 10" aria-hidden="true">${box}<path d="M1.4 1.2L12.6 8.8M12.6 1.2L1.4 8.8" fill="none" stroke="currentColor" stroke-width=".7"/><path d="M7 .6v8.8M.6 5h12.8" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>`; }
const wFlag = (w, h) => `<span class="wflag" title="${wLangName(wLang(w))}">${flagSvg(wLang(w), h)}</span>`;
const wSorted = () => wList().slice().sort((a, b) => (b.upd || 0) - (a.upd || 0));
// the deck's order: newest first, or shuffled until I leave the page
// tags on word cards (2026-11-09); tags I leave out drop out of the shuffled deck (settings.wOut)
const wF = () => (S.wTag && wTags().includes(S.wTag) ? S.wTag : 'all');
const wTags = () => [...new Set(wList().flatMap((w) => w.tags || []))].sort((a, b) => a.localeCompare(b));
const wOut = () => ((M.settings || {}).wOut || []).filter((t) => wTags().includes(t));
// the filter decides which words are in the deck; the shuffle no longer leaves tags out (2026-11-10)
const wLeftOut = () => false;
const wPass = (w) => (wF() === 'all' || (w.tags || []).includes(wF())) && (wFL() === 'all' || wLang(w) === wFL());
function wDeck() { return wDeckAll().filter((w) => w && !wLeftOut(w) && wPass(w)); }
// all my words as cards, like the Notepad (2026-11-09)
// word cards look like the Notepad post-its: the word on the title line, the meaning on its ruled lines (2026-11-10)
const wTile = (w, i) => `<button class="postit wtile" data-a="wgo" data-ref="${w.id}" style="transform:rotate(${TILTS[i % TILTS.length]}deg)"><span class="pt">${esc(w.word)}</span><span class="wpl">${esc(w.mean || '')}</span><span class="wtfoot">${wFlag(w, 10)}<span class="ptag mono">${esc((w.tags || []).join(' · '))}</span></span></button>`;
function wDeckAll() { const ids = wList().map((w) => w.id); if (S.wOrder) { const o = S.wOrder.filter((id) => ids.includes(id)); ids.forEach((id) => { if (!o.includes(id)) o.unshift(id); }); S.wOrder = o; return o.map((id) => wList().find((w) => w.id === id)); } return wSorted(); }
const wHead = () => `<div class="nbhead"><button class="nbt" data-a="nbgo" data-v="words"><span class="mono">Words</span><span class="chev" aria-hidden="true">›</span></button><button class="nbpen" data-a="wnew" aria-label="New word">${icon('pen-line', 20)}</button></div>`;
// on the landing: a little stack with the newest word on top
function wRow() { const W = wSorted(); return wHead() + (W.length ? `<div class="hscroll postrow wprow">${W.map(wTile).join('')}</div>` : '<p class="empty">No words yet.</p>'); }
// a card has two faces and really turns over (2026-11-09: "more tactile"); the ones underneath show their word
function wCardFace(w, under) {
  if (under) return `<div class="wcard wunder" data-under="${under}" aria-hidden="true"><div class="wfl"><div class="wf"><span class="wwd">${esc(w.word)}</span></div></div></div>`;
  const back = !!S.wFlip;
  return `<div class="wcard${back ? ' turned' : ''}" id="wcard" role="button" tabindex="0" aria-label="${esc(w.word)}${back ? ': ' + esc(w.mean || '') : '. Tap to turn over'}"><div class="wfl">
    <div class="wf"><span class="wwd">${esc(w.word)}</span></div>
    <div class="wb"><span class="wwd sm">${esc(w.word)}</span>${w.mean ? `<span class="wmean">${esc(w.mean)}</span>` : '<span class="wmean faint">No meaning written yet.</span>'}${w.note ? `<span class="wnote">${esc(w.note)}</span>` : ''}<button class="wedit" data-a="wopen" data-ref="${w.id}" aria-label="Edit ${esc(w.word)}">${icon('pencil', 18)}</button></div></div></div>`; }
function renderWords() { const D = wDeck(); const N = D.length; const list = S.wView === 'list';
  // shuffle shuffles straight away, no menu (2026-11-10)
  const shuf = wList().length > 1 && !list ? `<button class="fbtn wshufb" data-a="wshuf" aria-label="Shuffle">${icon('shuffle', 13)}</button>` : '';
  const tools = `${list ? `<button class="fbtn" data-a="wnew" aria-label="New word">${icon('pen-line', 18)}</button>` : (N ? `<button class="fbtn" data-a="wopen" data-ref="${(D[((S.wI || 0) % N + N) % N] || {}).id}" aria-label="Edit this word">${icon('pencil', 18)}</button>` : '')}${wList().length ? `<span class="vsortw"><button class="fbtn" data-a="wfopen" aria-label="Filter" aria-haspopup="menu" aria-expanded="${!!S.wFOpen}" aria-pressed="${wF() !== 'all' || wFL() !== 'all' || !!S.wFOpen}">${icon('sliders-horizontal', 18)}</button>${S.wFOpen ? `<span class="vsortx" data-a="wfopen"></span><span class="vdrop vsortm" role="menu"><span class="mono">Language</span>${[['all', 'All']].concat(WLANGS).map(([k, l]) => `<button role="menuitemradio" data-a="wflang" data-v="${k}" aria-checked="${wFL() === k}"><span class="wfl1">${k === 'all' ? '' : flagSvg(k, 12)}${esc(l)}</span>${wFL() === k ? icon('check', 16, 2) : ''}</button>`).join('')}${wTags().length ? `<span class="mono">Tags</span>${[['all', 'All']].concat(wTags().map((t) => [t, t])).map(([k, l]) => `<button role="menuitemradio" data-a="wftag" data-v="${esc(k)}" aria-checked="${wF() === k}">${esc(l)}${wF() === k ? icon('check', 16, 2) : ''}</button>`).join('')}` : ''}</span>` : ''}</span>` : ''}`;
  if (!N) return nbCrumbs([['Notebook', 'home'], ['Words']], tools) + `<p class="empty">${wList().length ? 'No words here.' : 'No words yet.'}</p>`;
  if (list) { const L = wSorted().filter(wPass); return nbCrumbs([['Notebook', 'home'], ['Words']], tools) + (L.length ? `<div class="postits">${L.map(wTile).join('')}</div>` : '<p class="empty">No words here.</p>'); }
  S.wI = ((S.wI || 0) % N + N) % N;
  // flash cards in a vertical scroll (2026-11-10): one word to a screen, tap shows what it means. I move the words myself
  // (no browser scroll snapping), so nothing can pull them back or jump. A menu right of the stack/spread button edits the word and sets its language and tags (2026-11-10).
  const cur = D[S.wI];
  const menu = S.wMenu ? `<span class="vsortx" data-a="wmenu"></span><span class="vdrop vsortm wmenu" role="menu"><button role="menuitem" data-a="wopen" data-ref="${cur.id}">Edit this word</button><span class="mono">Language</span>${WLANGS.map(([k, l]) => `<button role="menuitemradio" data-a="wqlang" data-v="${k}" aria-checked="${wLang(cur) === k}"><span class="wfl1">${flagSvg(k, 12)}${l}</span>${wLang(cur) === k ? icon('check', 16, 2) : ''}</button>`).join('')}${(wTags().length || addOpen('wqtag')) ? '<span class="mono">Tags</span>' : ''}${wTags().map((t) => { const on = (cur.tags || []).includes(t); return `<button role="menuitemcheckbox" data-a="wqtag" data-v="${esc(t)}" aria-checked="${on}">${esc(t)}${on ? icon('check', 16, 2) : ''}</button>`; }).join('')}${addOpen('wqnew') ? `<span class="inrow wqrow"><input class="inp" id="wqnew" placeholder="New tag" enterkeyhint="done" autocomplete="off"></span>` : '<button role="menuitem" data-a="openadd" data-v="wqnew">+ New tag</button>'}</span>` : '';
  // the flash cards have their own crumb; Words takes me back to all the words (2026-11-10)
  const h = nbCrumbs([['Notebook', 'home'], ['Words', 'words'], ['Review']], tools);
  return h + `<div class="wpage"><div class="wscroll" id="wscroll"><div class="wtrack" id="wtrack" style="transform:translateY(calc(${-S.wI} * var(--wh,480px)))">${D.map((w, i) => wItem(w, i === S.wI && !!S.wFlip)).join('')}</div></div>
    <div class="wfoot"><span></span><span class="wcountw"><span class="mono wcount" id="wcount">${S.wI + 1} of ${N}</span>${shuf}</span><span></span></div></div>`; }
// the word sits centred; when I turn it, the word and its meaning slide together so the whole lot is centred (2026-11-10)
const wItem = (w, open) => `<div class="witem${open ? ' open' : ''}" data-wid="${w.id}"><div class="wbox"><span class="wiw">${esc(w.word)}</span><span class="wans">${w.mean ? `<span class="wim">${esc(w.mean)}</span>` : ''}${w.note ? `<span class="win">${esc(w.note)}</span>` : ''}<span class="wit mono">${wFlag(w, 11)}${esc((w.tags || []).join(' · '))}</span></span></div></div>`;
// the words fill the rest of the screen; the page itself never scrolls
function wFit() { const sc = document.getElementById('wscroll'), m = document.getElementById('main'); if (!sc || !m) return; if (m.scrollTop) m.scrollTop = 0;
  const top = sc.getBoundingClientRect().top - m.getBoundingClientRect().top; const foot = sc.nextElementSibling ? sc.nextElementSibling.offsetHeight : 40;
  const hh = Math.max(240, Math.floor(m.clientHeight - top - foot - 12)); if (sc.dataset.h !== String(hh)) { sc.dataset.h = hh; sc.style.height = hh + 'px'; sc.style.setProperty('--wh', hh + 'px'); }
  sc.querySelectorAll('.wbox').forEach((b) => { const wd = b.firstElementChild; const y = (wd ? wd.offsetHeight : 42) / 2 + 'px'; if (b.style.getPropertyValue('--wy') !== y) b.style.setProperty('--wy', y); }); }
new MutationObserver(() => { if (document.getElementById('wscroll')) wFit(); }).observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('resize', () => wFit());
// moving: the words follow my finger, then settle on the nearest word (a flick goes one on); a tap turns the card
let wSw = null;
function wGo(i, ms = 260) { const N = wDeck().length; const t = document.getElementById('wtrack'), sc = document.getElementById('wscroll'); if (!t || !sc) return;
  i = Math.max(0, Math.min(N - 1, i)); const ch = i !== S.wI; S.wI = i; if (ch) { S.wFlip = false; t.querySelectorAll('.witem.open').forEach((x) => x.classList.remove('open')); wBuzz(6); }
  t.style.transition = `transform ${ms}ms cubic-bezier(.22,.7,.3,1)`; t.style.transform = `translateY(${-i * sc.clientHeight}px)`; const c = document.getElementById('wcount'); if (c) c.textContent = (i + 1) + ' of ' + N; }
document.addEventListener('pointerdown', (e) => { const sc = e.target.closest && e.target.closest('#wscroll'); if (!sc || e.button > 0) return; const t = document.getElementById('wtrack');
  wSw = { sc, t, y: e.clientY, x: e.clientX, dy: 0, h: [[performance.now(), e.clientY]], base: -S.wI * sc.clientHeight }; t.style.transition = 'none'; try { sc.setPointerCapture(e.pointerId); } catch (_) {} });
document.addEventListener('pointermove', (e) => { const d = wSw; if (!d) return; d.dy = e.clientY - d.y; d.h.push([performance.now(), e.clientY]); if (d.h.length > 6) d.h.shift();
  if (Math.abs(d.dy) > 6) d.moved = true; if (!d.moved) return; const N = wDeck().length; let y = d.base + d.dy; const min = -(N - 1) * d.sc.clientHeight;
  if (y > 0) y = y / 3; else if (y < min) y = min + (y - min) / 3; d.t.style.transform = `translateY(${y}px)`; });
function wSwEnd() { const d = wSw; if (!d) return; wSw = null;
  if (!d.moved) { const it = d.t.children[S.wI]; S.wFlip = !S.wFlip; if (it) it.classList.toggle('open', S.wFlip); wBuzz(5); return; }
  const now = performance.now(); const h0 = d.h.find((q) => now - q[0] < 110) || d.h[0], h1 = d.h[d.h.length - 1]; const v = (h1[1] - h0[1]) / Math.max(1, h1[0] - h0[0]);
  const H = d.sc.clientHeight; let i = S.wI; if (Math.abs(v) > 0.4 && Math.abs(d.dy) > 20) i += v < 0 ? 1 : -1; else if (Math.abs(d.dy) > H / 3) i += d.dy < 0 ? 1 : -1; wGo(i); }
document.addEventListener('pointerup', wSwEnd); document.addEventListener('pointercancel', wSwEnd);
let wWheelT = 0; document.addEventListener('wheel', (e) => { if (!(e.target.closest && e.target.closest('#wscroll'))) return; e.preventDefault(); const n = performance.now(); if (n - wWheelT < 450 || Math.abs(e.deltaY) < 8) return; wWheelT = n; wGo(S.wI + (e.deltaY > 0 ? 1 : -1)); }, { passive: false });
function wordSheet(s) { const D = s.draft;
  return `<div class="fld"><span class="mono">Word</span><input class="inp" id="wword" value="${esc(D.word || '')}" autocomplete="off" spellcheck="true" lang="${D.lang === 'no' || D.lang === 'nb' ? 'nb' : 'en-GB'}" ${s.isNew ? 'data-autofocus' : ''}></div>
    <div class="fld"><span class="mono">Language</span><div class="chips">${WLANGS.map(([k, l]) => `<button class="chip wlchip" data-a="wlang" data-v="${k}" aria-pressed="${wLang(D) === k}">${flagSvg(k, 12)}${l}</button>`).join('')}</div></div>
    <div class="fld"><span class="mono">What it means</span><textarea class="inp" id="wmean" rows="3" spellcheck="true">${esc(D.mean || '')}</textarea></div>
    <div class="fld"><span class="mono">Where I found it, or an example</span><textarea class="inp" id="wnote" rows="3" spellcheck="true">${esc(D.note || '')}</textarea></div>
    <div class="fld"><span class="mono">Tags</span><div class="chips">${wTags().concat((D.tags || []).filter((t) => !wTags().includes(t))).map((t) => `<button class="chip" data-a="wtag" data-v="${esc(t)}" aria-pressed="${(D.tags || []).includes(t)}">${esc(t)}</button>`).join('')}${addChip('wnewtag', 'New tag')}</div>${addOpen('wnewtag') ? `<div class="inrow" style="margin-top:10px"><input class="inp" id="wnewtag" placeholder="New tag" enterkeyhint="done" autocomplete="off"><button class="btn" data-a="wtagadd">Add</button></div>` : ''}</div>
    ${s.isNew ? '' : `<button class="btn soft" style="width:100%;margin-top:8px;color:#B5503E" data-a="wdel" data-ref="${s.ref}">Delete this word</button>`}`; }
function wCapture() { const s = S.sheet; if (!s || s.kind !== 'word') return; const g = (id) => (document.getElementById(id) || {}).value; s.draft.word = (g('wword') || '').trim(); s.draft.mean = (g('wmean') || '').trim(); s.draft.note = (g('wnote') || '').trim(); }
// touch: the card lifts when I hold it, follows my finger and tips around where I hold it, the card underneath rises as it
// moves away, a flick throws it even when short, and a let-go springs it back; a tap turns it over (2026-11-09)
let wDrag = null;
const wBuzz = (n) => { try { if (navigator.vibrate) navigator.vibrate(n); } catch (_) {} };
function wUnder(k, p) { const dk = document.querySelector('.wdeck'); if (!dk) return; dk.classList.toggle('goprev', k === 'prev' && !!dk.querySelector('.wunder[data-under="prev"]'));
  dk.querySelectorAll('.wunder').forEach((u) => { u.style.transform = `scale(${0.94 + 0.06 * p})`; u.style.boxShadow = `0 1px 2px rgba(0,0,0,${0.06 + 0.06 * p}),0 ${3 + 3 * p}px ${8 + 8 * p}px rgba(0,0,0,${0.05 + 0.03 * p})`; }); }
document.addEventListener('pointerdown', (e) => { const c = e.target.closest && e.target.closest('#wcard'); if (!c || e.target.closest('.wedit')) return; const r = c.getBoundingClientRect();
  wDrag = { c, x: e.clientX, y: e.clientY, dx: 0, dy: 0, top: e.clientY < r.top + r.height / 2, hist: [[performance.now(), e.clientX, e.clientY]] }; try { c.setPointerCapture(e.pointerId); } catch (_) {}
  c.style.transition = 'transform .12s ease-out, box-shadow .12s'; c.classList.add('held'); c.style.transform = 'scale(1.03)'; });
document.addEventListener('pointermove', (e) => { const d = wDrag; if (!d) return; d.dx = e.clientX - d.x; d.dy = e.clientY - d.y; d.hist.push([performance.now(), e.clientX, e.clientY]); if (d.hist.length > 6) d.hist.shift();
  if (Math.abs(d.dx) > 4 || Math.abs(d.dy) > 4) { d.moved = true; d.c.style.transition = 'none'; const rot = d.dx / 16 * (d.top ? 1 : -1);
    d.c.style.transform = `translate(${d.dx}px,${d.dy * 0.35}px) rotate(${rot}deg) scale(1.03)`; wUnder(d.dx < 0 ? 'next' : 'prev', Math.min(1, Math.abs(d.dx) / (d.c.offsetWidth * 0.6))); } });
function wEnd() { const d = wDrag; if (!d) return; wDrag = null; d.c.classList.remove('held'); const N = wDeck().length; const W = d.c.offsetWidth;
  const now = performance.now(); const h0 = d.hist.find((q) => now - q[0] < 110) || d.hist[0]; const h1 = d.hist[d.hist.length - 1]; const vx = (h1[1] - h0[1]) / Math.max(1, h1[0] - h0[0]), vy = (h1[2] - h0[2]) / Math.max(1, h1[0] - h0[0]);
  if (!d.moved) { // a tap: turn it over, with a little press first
    d.c.style.transition = 'transform .25s cubic-bezier(.34,1.56,.64,1)'; d.c.style.transform = ''; S.wFlip = !S.wFlip; d.c.classList.toggle('turned', S.wFlip); wBuzz(5); return; }
  if (N > 1 && (Math.abs(d.dx) > W / 3 || (Math.abs(vx) > 0.55 && Math.abs(d.dx) > 24))) { const dir = (Math.abs(vx) > 0.55 ? -Math.sign(vx) : d.dx < 0 ? 1 : -1);
    const sp = Math.max(1.2, Math.abs(vx)); const ms = Math.round(Math.min(320, Math.max(160, 420 / sp))); wUnder(dir > 0 ? 'next' : 'prev', 1); wBuzz(8);
    d.c.style.transition = `transform ${ms}ms cubic-bezier(.2,.6,.4,1)`; d.c.style.transform = `translate(${-dir * W * 1.6}px,${d.dy * 0.35 + vy * 120}px) rotate(${-dir * 26 * (d.top ? 1 : -1)}deg)`;
    setTimeout(() => { S.wI = (S.wI || 0) + dir; S.wFlip = false; render(); }, ms - 20); return; }
  d.c.style.transition = 'transform .45s cubic-bezier(.34,1.56,.64,1)'; d.c.style.transform = ''; wUnder(d.dx < 0 ? 'next' : 'prev', 0); }
document.addEventListener('pointerup', wEnd); document.addEventListener('pointercancel', wEnd);
document.addEventListener('keydown', (e) => { if (e.target && e.target.id === 'wqnew' && e.key === 'Enter') { e.preventDefault(); wordAction('wqnew'); return; } if (e.target && e.target.id === 'wnewtag' && e.key === 'Enter') { e.preventDefault(); wordAction('wtagadd'); return; } if (e.target && e.target.id === 'wcard' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); S.wFlip = !S.wFlip; e.target.classList.toggle('turned', S.wFlip); }
  if (S.area === 'notebook' && S.nbView === 'words' && S.wView !== 'list' && !S.sheet && /^Arrow(Left|Right|Up|Down)$/.test(e.key) && !(e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) { e.preventDefault(); wGo(S.wI + (/Right|Down/.test(e.key) ? 1 : -1)); } });
function wordAction(act, a, ref, v) {
  switch (act) {
    case 'wnew': openSheet({ kind: 'word', title: 'New word', isNew: true, draft: { word: '', mean: '', note: '', lang: 'en' } }); return true;
    case 'wopen': { S.wMenu = false; const w = wList().find((x) => x.id === ref); if (w) openSheet({ kind: 'word', ref, title: 'Word', draft: Object.assign({}, w) }); return true; }
    case 'wsave': { wCapture(); const s = S.sheet; const D = s.draft; if (!D.word) { flash('Write the word first'); return true; }
      change(() => { if (s.isNew) { wList().push({ id: uid('w'), word: D.word, lang: wLang(D), mean: D.mean, note: D.note, tags: D.tags || [], upd: Date.now() }); S.wI = 0; S.wOrder = null; S.wFlip = false; } else { const w = wList().find((x) => x.id === s.ref); if (w) Object.assign(w, { word: D.word, lang: wLang(D), mean: D.mean, note: D.note, tags: D.tags || [] }); } S.sheet = null; }, s.isNew ? 'Added ' + D.word : 'Saved'); return true; }
    case 'wdel': { const w = wList().find((x) => x.id === ref); S.sheet = null; change(() => { M.words = wList().filter((x) => x.id !== ref); }, 'Deleted ' + (w ? w.word : 'the word')); return true; }
    case 'wstep': S.wI = (S.wI || 0) + (+v); S.wFlip = false; render(); return true;
    case 'wmenu': S.wMenu = !S.wMenu; S.openAdd = null; render(); return true;
    case 'wqtag': case 'wqnew': { const w = wDeck()[S.wI]; if (!w) return true; let t = v; if (act === 'wqnew') { const el = document.getElementById('wqnew'); t = el && el.value.replace(/\s+/g, ' ').trim(); if (!t) return true; S.openAdd = null; }
      change(() => { const T = w.tags = (w.tags || []).slice(); const i = T.indexOf(t); if (i >= 0 && act === 'wqtag') T.splice(i, 1); else if (i < 0) T.push(t); }); return true; }
    case 'wgo': { S.nbView = 'words'; S.wView = 'deck'; S.wMenu = false; let D = wDeck(); if (!D.some((w) => w.id === ref)) { S.wOrder = null; D = wDeck(); } if (!D.some((w) => w.id === ref)) { S.wTag = 'all'; S.wLang = 'all'; D = wDeck(); } S.wI = Math.max(0, D.findIndex((w) => w.id === ref)); S.wFlip = false; render(); const m = document.getElementById('main'); if (m) m.scrollTop = 0; return true; }
    case 'wlang': wCapture(); S.sheet.draft.lang = v; renderLayer(); return true;
    case 'wqlang': { const w = wDeck()[S.wI]; if (!w) return true; change(() => { w.lang = v; }); return true; }
    case 'wflang': S.wLang = v; S.wFOpen = false; render(); return true;
    case 'wfopen': S.wFOpen = !S.wFOpen; render(); return true;
    case 'wftag': S.wTag = v; S.wFOpen = false; render(); return true;
    case 'wshufopen': S.wShufOpen = !S.wShufOpen; render(); return true;
    case 'wunshuf': S.wOrder = null; S.wI = 0; S.wFlip = false; S.wShufOpen = false; render(); return true;
    case 'wout': { const O = wOut().slice(); const i = O.indexOf(v); if (i >= 0) O.splice(i, 1); else O.push(v); S.wI = 0; change(() => { M.settings.wOut = O; }); return true; }
    case 'wtag': { wCapture(); const T = S.sheet.draft.tags = (S.sheet.draft.tags || []).slice(); const i = T.indexOf(v); if (i >= 0) T.splice(i, 1); else T.push(v); renderLayer(); return true; }
    case 'wtagadd': { wCapture(); const el = document.getElementById('wnewtag'); const t = el && el.value.replace(/\s+/g, ' ').trim(); if (!t) return true; const T = S.sheet.draft.tags = (S.sheet.draft.tags || []).slice(); if (!T.includes(t)) T.push(t); S.openAdd = null; renderLayer(); return true; }
    case 'wview': S.wView = S.wView === 'list' ? 'deck' : 'list'; S.wFlip = false; render(); return true;
    case 'wshuf': { S.wShufOpen = false; const ids = wList().map((w) => w.id); for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; } S.wOrder = ids; S.wI = 0; S.wFlip = false; render(); return true; }
  }
  return false;
}
// sample words for testing (2026-11-09), example data only, marked sample so the wipe before deploying takes them
function wMigrate(m) { m.settings = m.settings || {}; if (m.settings.words1) return; m.settings.words1 = true; if (!m.example) return; m.words = m.words || [];
  const W = [['Petrichor', 'The smell of rain on dry earth.', 'From a poem about summer storms.'], ['Sonder', 'Realising that every passer-by has a life as full and vivid as my own.', ''],
    ['Hygge', 'A cosy, warm feeling of comfort and contentment.', 'Danish and Norwegian.'], ['Vellichor', 'The wistful feeling of an old bookshop.', ''],
    ['Komorebi', 'Sunlight filtering through the leaves of trees.', 'Japanese.'], ['Susurrus', 'A soft whispering or rustling sound.', 'The wind in the birches.'],
    ['Halcyon', 'A calm, peaceful and happy time, often looked back on fondly.', ''], ['Frisson', 'A sudden thrill or shiver of feeling.', 'Hearing a choir in a cold church.'],
    ['Eunoia', 'Beautiful thinking; a well mind.', 'Shortest English word with all five vowels.'], ['Ephemeral', 'Lasting a very short time.', 'Like frost on a window.'],
    ['Lilt', 'A pleasant rise and fall in the voice, or a gentle rhythm.', ''], ['Gloaming', 'Twilight, dusk.', 'Scottish.']];
  const now = Date.now(); W.forEach(([word, mean, note], i) => m.words.push({ id: 'w-ex' + i, word, mean, note, upd: now - i * 3600000, sample: true })); }
// sample tags for testing (2026-11-09)
function wMigrate2(m) { m.settings = m.settings || {}; if (m.settings.words2) return; m.settings.words2 = true; if (!m.example) return;
  const T = { 'w-ex0': ['Nature'], 'w-ex1': ['Feelings'], 'w-ex2': ['Feelings', 'Borrowed'], 'w-ex3': ['Feelings'], 'w-ex4': ['Nature', 'Borrowed'], 'w-ex5': ['Nature', 'Sounds'], 'w-ex6': ['Feelings'], 'w-ex7': ['Feelings', 'Borrowed'], 'w-ex8': ['Rare'], 'w-ex9': [], 'w-ex10': ['Sounds'], 'w-ex11': ['Nature', 'Rare'] };
  (m.words || []).forEach((w) => { if (T[w.id] && !(w.tags || []).length) w.tags = T[w.id]; }); }
// every word gets a language; English unless I set it (2026-11-10)
function wMigrate3(m) { (m.words || []).forEach((w) => { if (w.lang !== 'en' && w.lang !== 'no') w.lang = 'en'; }); }
