// ---------- Notebook (2026-11-06): Notepad (post-it notes with tags and a tag filter) and Journal (plain lined pages) ----------
// M.notes = [{ id, title, text, tags: [names], upd }]; M.journal = [{ id, d, at, text }]. Tags are plain names so a note can
// later carry a project's or subject's name and show up there too (project notes come after this).
function nMigrate(m) { m.settings = m.settings || {};
  // journal tags are their own list, so the example pages get journal-like tags (2026-11-06)
  if (!m.settings.notebook4 && m.settings.notebook3) { m.settings.notebook4 = true; if (m.example) { const R = { 'j-ex1': ['Good day'], 'j-ex2': ['Hard day'], 'j-ex3': ['Outside'], 'j-ex5': ['Good day'] }; (m.journal || []).forEach((e) => { if (R[e.id]) e.tags = R[e.id]; }); } }
  // example journal pages with tags, enough to scroll (2026-11-06)
  if (!m.settings.notebook3 && m.settings.notebook1) { m.settings.notebook3 = true; if (m.example) { const T = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    const J = m.journal = m.journal || []; const tg = (id, t) => { const e = J.find((x) => x.id === id); if (e) e.tags = t; }; tg('j-ex1', ['Good day']); tg('j-ex2', ['Hard day']);
    J.push({ id: 'j-ex3', d: T(-5), at: '20:15', text: 'Walked the long way home. The air smelled like snow.', tags: ['Outside'] }, { id: 'j-ex4', d: T(-7), at: '23:02', text: 'Could not settle tonight. Wrote a list instead and that helped a bit.', tags: [] }, { id: 'j-ex5', d: T(-9), at: '19:30', text: 'Tried the seeded rye. Too dense, more water next time.', tags: ['Good day'] }); } } if (!m.settings.notebook2) { m.settings.notebook2 = true; if (m.areas && m.areas.notebook) m.areas.notebook.pages = []; } if (m.settings.notebook1) return; m.settings.notebook1 = true;
  m.notes = m.notes || []; m.journal = m.journal || [];
    if (!m.example) return;
  const T = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const now = Date.now(); let k = 0; const N = (title, tags, text) => m.notes.push({ id: 'n-ex' + k, title, tags, text, upd: now - (k++) * 36e5 });
  N('Gift ideas', ['Ideas'], 'Wool socks for Mum\nA plant for Ida\nBook voucher');
  N('Sweater sizing', ['Knitting'], 'Chest 96 cm\nSleeves 46 cm\n4 mm needles for the ribbing');
  N('Bread to try', ['Recipes'], 'Seeded rye\nFocaccia with olives\nCardamom buns');
  N('Essay thoughts', ['Study'], 'Start with the case, not the theory.\nAsk about the word limit.');
  N('Slow mornings', ['Ideas'], 'Open the curtains first\nWater before coffee\nNo phone until I am dressed');
  N('Linen skirt', ['Sewing'], 'Pre-wash the linen\nCheck the waist measurement again');
  m.journal.push({ id: 'j-ex1', d: T(-3), at: '21:40', tags: ['Good day'], text: 'Quiet day. Finished the back panel of the sweater and it actually fits.\nTired, but the good kind.' },
    { id: 'j-ex2', d: T(-1), at: '22:05', tags: ['Hard day'], text: 'Long day at the library. Hard to start, easier once I had the first page.' });
}
const noteTags = () => { const s = new Set(); (M.notes || []).forEach((n) => (n.tags || []).forEach((t) => s.add(t))); (M.settings.noteTags || []).forEach((t) => s.add(t)); return [...s].sort((a, b) => a.localeCompare(b)); };
// the Journal has its own tags, same system as the Notepad but not shared (2026-11-06)
const jTags = () => { const s = new Set(); (M.journal || []).forEach((n) => (n.tags || []).forEach((t) => s.add(t))); return [...s].sort((a, b) => a.localeCompare(b)); };
const TILTS = [-1.2, 0.8, 0.6, -0.9, -0.5, 1.1, 0.9, -0.7];
function renderNotepad() {
  const F = S.nTag || 'all'; if (F !== 'all' && !noteTags().includes(F)) S.nTag = 'all';
  const notes = (M.notes || []).filter((n) => F === 'all' || (n.tags || []).includes(F)).sort((a, b) => (b.upd || 0) - (a.upd || 0));
  const dm = S.nFOpen ? `<span class="vsortx" data-a="nfopen"></span><span class="vdrop vsortm" role="menu"><span class="mono">Show</span>${[['all', 'All']].concat(noteTags().map((t) => [t, t])).map(([k, l]) => `<button role="menuitemradio" data-a="ntag" data-v="${esc(k)}" aria-checked="${F === k}">${esc(l)}${F === k ? icon('check', 16, 2) : ''}</button>`).join('')}</span>` : '';
  const tools = `<button class="fbtn" data-a="nnew" aria-label="Write a new note">${icon('pen-line', 18)}</button><span class="vsortw"><button class="fbtn" data-a="nfopen" aria-label="Filter" aria-haspopup="menu" aria-expanded="${!!S.nFOpen}" aria-pressed="${F !== 'all' || !!S.nFOpen}">${icon('sliders-horizontal', 18)}</button>${dm}</span>`;
  return nbCrumbs([['Notebook', 'home'], ['Notes']], tools) + (notes.length ? `<div class="postits">${notes.map(postit).join('')}</div>` : `<p class="empty">${F === 'all' ? 'No notes yet.' : 'No notes with this tag.'}</p>`);
}
// post-it pop-up, minimal like the journal (2026-11-06): the paper, a tag icon whose drop-down holds the tags (and
// Delete), and a notepad that peels off a post-it when it saves
// the notepad close button, drawn like the journal's book (2026-11-08): the top post-it lifts from the bottom and peels away, a blank one waits below
const PADSVG = `<svg class="pdk" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect class="pdB" x="6.5" y="6.5" width="14" height="14" rx=".6" fill="var(--page)"/><g class="pdT"><path d="M3.5 3.5h14a.5.5 0 0 1 .5.5v10l-4 4H4a.5.5 0 0 1-.5-.5z" fill="var(--page)"/><path d="M18 14h-3.5a.5.5 0 0 0-.5.5V18"/><path d="M6.5 7.5h8M6.5 10.5h5.5"/></g></svg>`;
// a hobby project keeps its own notes (2026-11-06): they live in the project (G(p).notes), never in the Notepad
const noteList = (s) => s && s.proj && G(s.proj) ? (G(s.proj).notes = G(s.proj).notes || []) : (M.notes = M.notes || []);
function noteSheet(s) { const D = s.draft; const T = D.tags || [];
  const all = noteTags().concat(T.filter((t) => !noteTags().includes(t)));
  // tags and Delete live in the ⋯ menu, like the journal (2026-11-08)
  const tg = s.proj ? '' : `<span class="mono">Tags</span>${all.map((t) => `<button role="menuitemcheckbox" data-a="ntagtog" data-v="${esc(t)}" aria-checked="${T.includes(t)}">${esc(t)}${T.includes(t) ? icon('check', 16, 2) : ''}</button>`).join('')}${addOpen('nnewtag') ? `<div class="inrow jtagnew"><input class="inp" id="nnewtag" placeholder="New tag" enterkeyhint="done" autocomplete="off"><button class="btn" data-a="nnewtag">Add</button></div>` : `<button role="menuitem" data-a="openadd" data-v="nnewtag">${icon('plus', 16)} New tag</button>`}`;
  const cp = `<button role="menuitem" data-a="ncopy">${mi('copynote', 'copy')}Copy</button>`;
  const del = s.isNew ? '' : `<button role="menuitem" class="ndel" data-a="ndelete">${mi('delnote', 'trash')}Delete note</button>`;
  const dm = S.nTagOpen ? `<span class="vsortx" data-a="ntagmenu"></span><span class="vdrop vsortm ntagm" role="menu">${tg}${cp}${del}</span>` : '';
  return `<div class="ntop"><input class="ntitle" id="ntitle" spellcheck="true" value="${esc(D.title || '')}" aria-label="Title" ${s.isNew ? 'data-autofocus' : ''}>${`<span class="vsortw"><button class="fbtn" data-a="ntagmenu" aria-label="More" aria-haspopup="menu" aria-expanded="${!!S.nTagOpen}">${icon('ellipsis', 18)}</button>${dm}</span>`}</div>
    <div class="notepaper"><textarea id="ntext" class="nlines" rows="8" spellcheck="true" autocapitalize="sentences">${esc(D.text || '')}</textarea></div>`; }
// notes save while I write; the notepad button only closes (2026-11-08)
let nT = 0;
function nAuto() { const s = S.sheet; if (!s || s.kind !== 'note') return; ncapture(); const D = s.draft; const L = noteList(s);
  if (s.isNew) { if (!D.title && !(D.text || '').trim()) return; D.id = D.id || uid('n'); D.upd = Date.now(); L.push(D); s.isNew = false; s.ref = D.id; }
  else { const i = L.findIndex((x) => x.id === s.ref); const o = i >= 0 ? L[i] : null;
    // only a real change moves the note to the front (2026-11-11)
    if (!o || o === D || (o.title || '') !== (D.title || '') || (o.text || '') !== (D.text || '') || JSON.stringify(o.tags || []) !== JSON.stringify(D.tags || [])) D.upd = Date.now(); if (i >= 0) L[i] = D; else L.push(D); }
  save(); }
document.addEventListener('input', (ev) => { const t = ev.target; if (t && (t.id === 'ntitle' || t.id === 'ntext')) nAuto(); });
function ncapture() { const s = S.sheet; if (!s || s.kind !== 'note') return; const t = document.getElementById('ntitle'), x = document.getElementById('ntext'); if (t) s.draft.title = t.value.trim(); if (x) s.draft.text = x.value; }
// Journal: one plain lined page with an automatic date stamp; the ≡ menu holds a fresh page and earlier entries
function jCurrent() { if (S.jEntry === 'new') return null; const J = M.journal || []; if (S.jEntry) return J.find((e) => e.id === S.jEntry) || null; return J.filter((e) => e.d === T0).sort((a, b) => (a.at || '').localeCompare(b.at || '')).pop() || null; }
const stampOf = (d, at) => { const x = parse(d); return `${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][x.getDay()]} ${x.getDate()} ${MONTHS[x.getMonth()]}${at ? ' · ' + at : ''}`; };
// Notebook landing (2026-11-06): no side tabs. Two rows of post-its, then a row of journal pages, both scroll sideways;
// each has Write new and See all, which opens the Notepad or the Journal.
// the page's filter sits on the breadcrumb row, at the right (2026-11-08)
const nbCrumbs = (parts, tools = '') => `<nav class="crumbs" aria-label="Where I am">${parts.map(([l, v], i) => i < parts.length - 1 ? `<button data-a="nbgo" data-v="${v}">${esc(l)}</button><span aria-hidden="true">›</span>` : `<span aria-current="page">${esc(l)}</span>`).join('')}${tools ? `<span class="crtools">${tools}</span>` : ''}</nav>`;
// the preview is one block of text over four ruled lines, so a sentence wraps and fills them (the owner, 2026-11-11)
const postit = (n, i) => { const txt = (n.text || '').split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 4).join('\n');
  return `<button class="postit" data-a="nopen" data-ref="${n.id}" style="transform:rotate(${TILTS[i % TILTS.length]}deg)"><span class="pt">${esc(n.title || 'Untitled')}</span><span class="pls">${esc(txt)}</span><span class="ptag mono">${esc((n.tags || []).join(' · '))}</span></button>`; };
const jSorted = () => (M.journal || []).slice().sort((a, b) => (b.d + (b.at || '')).localeCompare(a.d + (a.at || '')));
// previews show the page itself, shrunk (2026-11-08)
const jcard = (e, i = 0) => `<button class="jcard${e.paper === 'blank' ? ' blank' : ''}" data-a="jopen" data-ref="${e.id}" style="transform:rotate(${TILTS[(i + 3) % TILTS.length]}deg)"><span class="mono jcs">${e.re ? icon('corner-down-right', 12) : ''}${esc(fmtDate(e.d))}</span><span class="jmini" aria-hidden="true"><span class="jmp" data-jref="${e.id}"><span class="jflow"></span><span class="jpics"></span></span></span><span class="ptag mono">${esc((e.tags || []).join(' · '))}</span></button>`;
// the section title opens the whole Notepad or Journal; the pen writes a new one (2026-11-06)
const nbHead = (t, nw, all) => `<div class="nbhead"><button class="nbt" data-a="nbgo" data-v="${all}"><span class="mono">${t}</span><span class="chev" aria-hidden="true">›</span></button><button class="nbpen" data-a="${nw}" aria-label="Write new">${icon('pen-line', 20)}</button></div>`;
function renderNbHome() {
  const notes = (M.notes || []).slice().sort((a, b) => (b.upd || 0) - (a.upd || 0)); const J = jSorted();
  return nbHead('Notes', 'nnew', 'notepad') + (notes.length ? `<div class="hscroll postrow wprow">${notes.map(postit).join('')}</div>` : '<p class="empty">No notes yet.</p>') + wRow()
    + nbHead('Journal', 'jnew', 'journal') + (J.length ? `<div class="hscroll jrow">${J.map(jcard).join('')}</div>` : '<p class="empty">Nothing written yet.</p>')
    + bRow();
}
// journal pages use the same tags and the same tag filter as the Notepad (2026-11-06)
const tagFilter = (F, open, act, pick, list) => `<span class="vsortw"><button class="fbtn" data-a="${act}" aria-label="Filter" aria-haspopup="menu" aria-expanded="${!!open}" aria-pressed="${F !== 'all' || !!open}">${icon('sliders-horizontal', 18)}</button>${open ? `<span class="vsortx" data-a="${act}"></span><span class="vdrop vsortm" role="menu"><span class="mono">Show</span>${[['all', 'All']].concat(list.map((t) => [t, t])).map(([k, l]) => `<button role="menuitemradio" data-a="${pick}" data-v="${esc(k)}" aria-checked="${F === k}">${esc(l)}${F === k ? icon('check', 16, 2) : ''}</button>`).join('')}</span>` : ''}</span>`;
function renderJournalAll() { const F = S.jTag || 'all'; const J = jSorted().filter((e) => F === 'all' || (e.tags || []).includes(F));
  return nbCrumbs([['Notebook', 'home'], ['Journal']], `<button class="fbtn" data-a="jnew" aria-label="Write a new page">${icon('pen-line', 18)}</button>` + tagFilter(F, S.jFOpen, 'jfopen', 'jtagf', jTags())) + (J.length ? `<div class="jgrid">${J.map(jcard).join('')}</div>` : `<p class="empty">${F === 'all' ? 'Nothing written yet.' : 'No pages with this tag.'}</p>`); }
// writing page (2026-11-06): nothing but the date, a tag icon (its drop-down holds the tags, never shown on the page),
// lined paper and Save
// text options: in the ⋯ menu and in a bar under selected text (2026-11-08)
function jTxtRows(e, sty) { const P0 = e ? ((e.ps || [])[jParas(e)[0]] || {}) : {}; const ALS = [['l', 'text-align-start', 'Left'], ['c', 'text-align-center', 'Centre'], ['r', 'text-align-end', 'Right'], ['j', 'text-align-justify', 'Even']];
  return `<span class="jtxr">${ALS.map(([k, ic, l]) => `<button data-a="jal" data-v="${k}" aria-label="${l}" aria-pressed="${(P0.al || 'l') === k}">${icon(ic, 18)}</button>`).join('')}</span>` + (sty ? `<span class="jtxr jtxs">${[['n', 'Normal'], ['h', 'Heading'], ['q', 'Quote']].map(([k, l]) => `<button data-a="jst" data-v="${k}" class="s-${k}" aria-pressed="${jStAt(e, S.jCaret != null ? S.jCaret : -1) === k}">${l}</button>`).join('')}</span>` : ''); }
function jSelBar() { const pa = document.querySelector('.jpaper'); const fl = pa && pa.querySelector('.jflow'); let bar = pa && pa.querySelector('.jselbar'); const ae = document.activeElement;
  if (bar && bar.contains(ae)) return;
  const sel = getSelection(); const on = fl && ae === fl && sel.rangeCount && !sel.isCollapsed && S.jCaret != null && S.jCaretEnd != null && S.jCaret !== S.jCaretEnd;
  if (!on) { if (bar) bar.remove(); return; }
  const e = jCurrent(); const html = jTxtRows(e || { ps: [] }, true);
  if (!bar) { bar = document.createElement('div'); bar.className = 'jselbar jtxtm'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Text');
    ['pointerdown', 'mousedown'].forEach((t) => bar.addEventListener(t, (ev) => ev.preventDefault())); pa.appendChild(bar); }
  if (bar.dataset.h !== html) { bar.innerHTML = html; bar.dataset.h = html; }
  const rs = sel.getRangeAt(0).getClientRects(); if (!rs.length) return; const last = rs[rs.length - 1], first = rs[0], pr = pa.getBoundingClientRect();
  const bw = bar.offsetWidth, bh = bar.offsetHeight; let top = last.bottom - pr.top + 10; if (top + bh > pa.offsetHeight) top = first.top - pr.top - bh - 10;
  const left = Math.max(0, Math.min(pa.clientWidth - bw, (first.left + last.right) / 2 - pr.left - bw / 2)); bar.style.top = top + 'px'; bar.style.left = left + 'px'; }
const jBlank = (e) => e ? e.paper === 'blank' : M.jPaper === 'blank';
function renderJournal() { const e = jCurrent(); const T = (e && e.tags) || []; const ed = jEditable(e);
  // extras live behind ⋯ (2026-11-08)
  const jmi = (ic, l) => `<span class="jmi">${mi('j-' + ic, ic)}${l}</span>`; // icons editable in edit mode (2026-11-08)
  const items = (ed ? `<label role="menuitem" class="jmrow" tabindex="0">${jmi('image-plus', 'Add a picture')}<input type="file" accept="image/*" id="jimgin" hidden></label><span class="mono jmtag">Paper</span>${[['lined', 'Lined'], ['blank', 'Blank']].map(([k, l]) => `<button role="menuitemradio" data-a="jpaper" data-v="${k}" aria-checked="${jBlank(e) === (k === 'blank')}">${l}${jBlank(e) === (k === 'blank') ? icon('check', 16, 2) : ''}</button>`).join('')}<span class="mono jmtag">Text</span><span class="jtxtm jmtxt">${jTxtRows(e)}</span>` : `<button role="menuitem" data-a="jreply" data-ref="${e.id}">${jmi('reply', 'Write an answer')}</button>`)
    + `<button role="menuitem" data-a="jnew">${jmi('file-plus', 'Fresh page')}</button><button role="menuitem" data-a="jlistopen">${jmi('book-open', 'Earlier pages')}</button>` 
    + `<span class="mono jmtag">Tags</span>${jTags().map((t) => `<button role="menuitemcheckbox" data-a="jtagtog" data-v="${esc(t)}" aria-checked="${T.includes(t)}">${esc(t)}${T.includes(t) ? icon('check', 16, 2) : ''}</button>`).join('')}${addOpen('jnewtagin') ? `<div class="inrow jtagnew"><input class="inp" id="jnewtagin" placeholder="New tag" enterkeyhint="done" autocomplete="off"><button class="btn" data-a="jnewtag">Add</button></div>` : `<button role="menuitem" data-a="openadd" data-v="jnewtagin">${jmi('plus', 'New tag')}</button>`}`
    + (e ? `<button role="menuitem" class="ndel" data-a="jdelete" data-ref="${e.id}">${jmi('trash', 'Delete this page')}</button>` : ''); // Delete sits at the bottom (2026-11-08)
  const tools = `<span class="vsortw"><button class="fbtn" data-a="jmenu" aria-label="More" aria-haspopup="menu" aria-expanded="${!!S.jMenu}">${icon('ellipsis', 18)}</button>${S.jMenu ? `<span class="vsortx" data-a="jmenu"></span><span class="vdrop vsortm jmenu" role="menu">${items}</span>` : ''}</span>`;
  return `<div class="jhead"><span class="mono jstamp">${esc(stampOf(e ? e.d : T0, ''))}</span>${tools}<button class="jbook" data-a="jsave" aria-label="Close">${jBookBtn()}</button></div>${jLinks(e)}`
    + (ed ? `<div class="jpaper${jBlank(e) ? ' blank' : ''}"><div id="jtext" class="jflow" contenteditable="plaintext-only" role="textbox" aria-multiline="true" aria-label="Journal page" spellcheck="true"></div><div class="jpics"></div></div>` : `<div class="jpaper jread${jBlank(e) ? ' blank' : ''}" data-jref="${e.id}"><div class="jflow"></div><div class="jpics"></div></div>`); }
// old pages are read only, apart from their tags (2026-11-08)
const jEditable = (e) => !e || e.d === T0;
// answers (2026-11-08): an answer keeps e.re = the page it answers; both pages show the link under the date
function jLinks(e) { if (!e) { const r = S.jRe && (M.journal || []).find((x) => x.id === S.jRe); return r ? `<div class="jlinks"><button class="jlk mono" data-a="jopen" data-ref="${r.id}" aria-label="The page I am answering">${icon('corner-up-left', 13)}${esc(fmtDate(r.d))}</button></div>` : ''; }
  const up = e.re && (M.journal || []).find((x) => x.id === e.re); const down = (M.journal || []).filter((x) => x.re === e.id).sort((a, b) => (a.d + (a.at || '')).localeCompare(b.d + (b.at || '')));
  if (!up && !down.length) return '';
  return `<div class="jlinks">${up ? `<button class="jlk mono" data-a="jopen" data-ref="${up.id}" aria-label="The page I answered">${icon('corner-up-left', 13)}${esc(fmtDate(up.d))}</button>` : ''}${down.map((x) => `<button class="jlk mono" data-a="jopen" data-ref="${x.id}" aria-label="My answer">${icon('corner-down-right', 13)}${esc(fmtDate(x.d))}</button>`).join('')}</div>`; }
// ---------- journal page layout (2026-11-08: "split into two columns when there's space") ----------
// The words are plain text (e.text, paragraphs split by \n) with a style per paragraph (e.ps[i] = { al: l|c|r|j, st: h|q }).
// Pictures sit anywhere on the page: e.imgs [{ id, asset | src, r (w/h), x, w (shares of the page width), y (px), z, frame }].
// Each 32px row gets the gaps the pictures leave. Rows with the same number of gaps make a band, and the words fill a band
// column by column, so beside a picture in the middle the writing reads as two columns. Each line is a span I can type in.
const JA = '', JB = '', JRX = /[^]*/g;
const jPlain = (t) => (t || '').replace(JRX, '');
const jEmpty = (e) => !jPlain(e.text).trim() && !(e.imgs || []).length && !(e.tags || []).length;
const jImgSrc = (q) => q.asset ? blobUrl(q.asset) : q.src;
// frame padding as shares of the picture width: [sides and top, bottom] (the owner's journal reference, 2026-11-08)
const JFR = { border: [0.03, 0.03], polaroid: [0.05, 0.18], gilt: [0.075, 0.075], mat: [0.07, 0.07], stamp: [0.06, 0.06] };
const JFRAMES = [['plain', 'Plain'], ['border', 'Border'], ['polaroid', 'Polaroid'], ['mat', 'Mat'], ['tape', 'Tape'], ['stamp', 'Stamp'], ['corners', 'Corners']];
const jPcH = (p) => { const f = p.frame || 'plain', r = p.r || 1, P = JFR[f]; return f === 'circle' ? p.w : P ? p.w * (1 - 2 * P[0]) / r + p.w * (P[0] + P[1]) : p.w / r; };
const JLH = 32, JGAP = 10, JMIN = 40;
// pages written before this layout kept pictures as markers in the text, or stuck onto each other: give them a place
const jTq = (p) => p.t != null ? p.t : jTilt(p.id);
function jCorners(q, PW) { const w = q.w * PW, h = jPcH(q) * PW, cx = q.x * PW + w / 2, cy = q.y + h / 2, t = jTq(q) * Math.PI / 180, c = Math.cos(t), s = Math.sin(t); return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]); }
const jBot = (q, PW) => Math.max(...jCorners(q, PW).map((c) => c[1]));
// how far a (tilted) picture reaches across one band of the page
function jSpanX(q, PW, ya, yb) { const P = jCorners(q, PW); const xs = []; P.forEach(([x, y]) => { if (y >= ya && y <= yb) xs.push(x); });
  for (let i = 0; i < 4; i++) { const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % 4]; [ya, yb].forEach((Y) => { if ((y1 - Y) * (y2 - Y) < 0) xs.push(x1 + (x2 - x1) * (Y - y1) / (y2 - y1)); }); }
  return xs.length ? [Math.min(...xs), Math.max(...xs)] : null; }
const jTilt = (id) => { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) | 0; return ((Math.abs(h) % 7) - 3) * 0.55; };
function jMig(e, PW) { if ((e.ps || []).some((q) => q && q.st)) { const R = e.rs = e.rs || []; let o = 0; (e.text || '').split('\n').forEach((t, i) => { const P = e.ps[i]; if (P && P.st) { if (t.length) R.push({ a: o, b: o + t.length, st: P.st }); delete P.st; } o += t.length + 1; }); R.sort((x, y) => x.a - y.a); save(); }
  const im = e.imgs || []; im.forEach((p) => { if (p.frame === 'round' || p.frame === 'circle' || p.frame === 'gilt') p.frame = 'plain'; }); if (!im.length && !JRX.test(e.text || '')) return; JRX.lastIndex = 0;
  const t = e.text || ''; let changed = false;
  im.filter((q) => !q.on && q.y == null).forEach((q) => { const k = t.indexOf(JA + q.id + JB); const before = jPlain(k >= 0 ? t.slice(0, k) : t); const pars = before.split('\n'); const row = pars.length - 1 + pars.reduce((n, p) => n + Math.floor(p.length / 38), 0);
    const kids = im.filter((c) => c.on === q.id); const P = [q].concat(kids); const x0 = Math.min(...P.map((p) => p.cx || 0)), y0 = Math.min(...P.map((p) => p.cy || 0)), x1 = Math.max(...P.map((p) => (p.cx || 0) + p.w));
    const bx = q.w >= 0.95 && !kids.length ? 0 : q.side === 'r' ? 1 - (x1 - x0) - (q.x || 0) : (q.x || 0); const by = row * JLH + 4;
    P.forEach((p) => { p.x = Math.max(0, bx + (p.cx || 0) - x0); p.y = by + ((p.cy || 0) - y0) * PW; if (p.w >= 0.95) p.w = 1; delete p.on; delete p.cx; delete p.cy; delete p.side; }); changed = true; });
  im.forEach((q) => { if (q.y == null) { q.y = 4; q.x = q.x || 0; changed = true; } });
  if (JRX.test(t)) { JRX.lastIndex = 0; e.text = jPlain(t); changed = true; } JRX.lastIndex = 0;
  if (changed) save(); }
// widths are measured on the page itself (the same font the lines are drawn in), word by word, and remembered
const jW = {};
function jMeasure(fl) { const out = {}; ['n', 'h', 'q'].forEach((k) => { let pr = fl.querySelector('.jprobe.s-' + k); if (!pr) { pr = document.createElement('span'); pr.className = 'jl jprobe s-' + k; pr.setAttribute('contenteditable', 'false'); fl.appendChild(pr); }
    const C = jW[k] = jW[k] || new Map(); out[k] = (str) => { if (!str) return 0; let w = C.get(str); if (w == null) { pr.textContent = str; w = pr.getBoundingClientRect().width; C.set(str, w); } return w; }; }); return out; }
if (document.fonts) document.fonts.addEventListener('loadingdone', () => { Object.keys(jW).forEach((k) => delete jW[k]); if (document.querySelector('.jpaper')) jLayout(); });
// free stretches of one row, left to right
function jGaps(r, PW, im) { const ya = r * JLH + 3, yb = (r + 1) * JLH - 3; let free = [[0, PW]];
  im.forEach((q) => { const sp = jSpanX(q, PW, ya - 2, yb + 2); if (!sp) return; let [a, b] = sp;
    a -= JGAP; b += JGAP; free = free.flatMap(([s, t]) => b <= s || a >= t ? [[s, t]] : [[s, Math.min(a, t)], [Math.max(b, s), t]]); });
  return free.filter(([s, t]) => t - s >= JMIN); }
// where the words go: rows of gaps, banded into columns
function jSlots(PW, im) { let last = 0; im.forEach((q) => { last = Math.max(last, Math.ceil(jBot(q, PW) / JLH)); }); const rows = [];
  for (let r = 0; r <= last; r++) rows.push(jGaps(r, PW, im)); const slots = []; let r = 0;
  while (r < rows.length) { const k = rows[r].length; if (k < 2) { rows[r].forEach((g) => slots.push({ r, x: g[0], w: g[1] - g[0] })); r++; continue; }
    let r2 = r; while (r2 + 1 < rows.length && rows[r2 + 1].length === k) r2++;
    for (let c = 0; c < k; c++) for (let i = r; i <= r2; i++) slots.push({ r: i, x: rows[i][c][0], w: rows[i][c][1] - rows[i][c][0] });
    r = r2 + 1; }
  return { slots, from: rows.length }; }
// places a word may be split with a hyphen: between two consonants, or before a consonant that starts a new syllable
const JDI = /^(th|ch|sh|ph|ck|ng|wh|gh|qu)$/i;
function jHyPts(w) { const out = []; if (!/^[A-Za-z]{5,}$/.test(w.replace(/[.,;:!?'")]+$/, ''))) return out; const t = w.replace(/[.,;:!?'")]+$/, ''); const V = (c) => /[aeiouy]/i.test(c);
  for (let i = 2; i <= t.length - 3; i++) { const p = t[i - 1], c = t[i], n = t[i + 1]; if (!V(p) && !V(c) && !JDI.test(p + c) && p.toLowerCase() !== 'q') out.push(i); else if (V(p) && !V(c) && n && V(n)) out.push(i); }
  return out; }
// Normal / Heading / Quote belong to stretches of words, not whole paragraphs (2026-11-08): e.rs = [{a, b, st}]
const jStAt = (e, k) => { for (const r of ((e && e.rs) || [])) if (r.a <= k && k < r.b) return r.st; return 'n'; };
function jPieces(e, a, b) { const out = []; let k = a; (e.rs || []).filter((r) => r.b > a && r.a < b).sort((x, y) => x.a - y.a).forEach((r) => { const ra = Math.max(r.a, a), rb = Math.min(r.b, b); if (ra > k) out.push([k, ra, 'n']); out.push([ra, rb, r.st]); k = rb; }); if (k < b) out.push([k, b, 'n']); return out; }
function jShiftRuns(e, s, t, L) { if (!e.rs || !e.rs.length) return; const d = L - (t - s); const mA = (x) => x < s ? x : x >= t ? x + d : s; const mB = (x) => x < s ? x : x >= t ? x + d : s + L;
  e.rs = e.rs.map((r) => ({ a: mA(r.a), b: mB(r.b), st: r.st })).filter((r) => r.b > r.a); }
function jSetSt(e, c1, c2, st) { let R = (e.rs || []).flatMap((r) => r.b <= c1 || r.a >= c2 ? [r] : [r.a < c1 ? { a: r.a, b: c1, st: r.st } : null, r.b > c2 ? { a: c2, b: r.b, st: r.st } : null].filter(Boolean));
  if (st !== 'n') R.push({ a: c1, b: c2, st }); R.sort((x, y) => x.a - y.a); const out = []; R.forEach((r) => { const l = out[out.length - 1]; if (l && l.st === r.st && l.b >= r.a) l.b = Math.max(l.b, r.b); else out.push(Object.assign({}, r)); }); e.rs = out; }
function jFlowSegs(e, PW, Wm) { const im = e.imgs || []; const { slots, from } = jSlots(PW, im); let si = 0; const slot = () => si < slots.length ? slots[si++] : { r: from + (si++ - slots.length), x: 0, w: PW };
  const segs = []; const text = e.text || ''; const pars = text.split('\n'); const ps = e.ps || []; let off = 0;
  pars.forEach((p, pi) => { const al = (ps[pi] && ps[pi].al) || 'l';
    const X = (u, v) => jPieces(e, u, v).reduce((n, [x, y, st]) => n + Wm[st](text.slice(x, y)), 0); const H = (k) => Wm[jStAt(e, k)]('-');
    const toks = p.match(/\S+\s*|\s+/g) || []; let cur = slot(), a = off, lw = 0, pos = off;
    const push = (b, lastL, hy) => { const t = text.slice(a, b), tt = t.replace(/\s+$/, ''); segs.push({ a, b, r: cur.r, x: cur.x, w: cur.w, al, last: lastL, hy, t, tw: X(a, a + tt.length) + (hy ? H(b - 1) : 0) }); };
    if (!toks.length) { push(off, true); off += 1; return; }
    // a word wider than the whole gap: cut it with a hyphen (2026-11-08)
    const rest = (len, wl) => { let L = len, w0 = wl; while (L > 0) { const r2 = cur.w - 2; if (X(pos, pos + w0) <= r2) { lw = X(pos, pos + L); pos += L; break; }
      let n = w0 - 1; while (n > 1 && X(pos, pos + n) + H(pos + n - 1) > r2) n--; n = Math.max(1, n); pos += n; push(pos, false, true); cur = slot(); a = pos; L -= n; w0 -= n; lw = 0; } };
    toks.forEach((tk) => { const wl = tk.replace(/\s+$/, '').length; const room = cur.w - 2;
      if (lw + X(pos, pos + wl) <= room) { lw += X(pos, pos + tk.length); pos += tk.length; return; }
      if (lw > 0) { const left = room - lw;
        // a gap left at the end of a line: split the next word at a syllable instead (2026-11-08)
        if (left > 12) { const pts = jHyPts(tk.slice(0, wl)); for (let k = pts.length - 1; k >= 0; k--) { const q = pts[k]; if (X(pos, pos + q) + H(pos + q - 1) <= left) { pos += q; push(pos, false, true); cur = slot(); a = pos; lw = 0; rest(tk.length - q, wl - q); return; } } }
        push(pos, false); cur = slot(); a = pos; lw = 0; }
      rest(tk.length, wl); });
    push(pos, true); off = pos + 1; });
  return segs; }
// draw the page: lines into the writing layer, pictures into their own layer
function jLayout() { const pa = document.querySelector('.jpaper'); if (!pa) return; const fl = pa.querySelector('.jflow'); if (!fl) return; const keep = document.activeElement === fl ? jSelOffs() : null;
  const E = jLayoutText(); if (!E) return; jPicsDraw(E, fl.clientWidth || 336); if (keep) jSetCaret(keep[0], keep[1]); }
function jPicsDraw(E, PW, pl) { const mini = !!pl; pl = pl || document.querySelector('.jpaper .jpics'); if (!pl) return;
  pl.innerHTML = (E.imgs || []).map((p) => { const f = p.frame || 'plain', P = JFR[f], w = p.w * PW; const pd = P ? `;padding:${(w * P[0]).toFixed(1)}px ${(w * P[0]).toFixed(1)}px ${(w * P[1]).toFixed(1)}px` : '';
    return `<span class="jpc f-${f}${S.jSel === p.id ? ' sel' : ''}" data-pc="${p.id}" style="left:${(p.x * 100).toFixed(2)}%;top:${p.y.toFixed(1)}px;width:${(p.w * 100).toFixed(2)}%;height:${(jPcH(p) * PW).toFixed(1)}px;z-index:${p.z || 1};--t:${jTq(p)}deg${pd}"><b class="jph"><img src="${esc(jImgSrc(p))}" alt="" draggable="false"><i class="jgl"></i></b></span>`; }).join('');
  if (S.jSel && !mini) jPick(S.jSel); }
function jMinis() { document.querySelectorAll('.jmp').forEach((m) => { const e = (M.journal || []).find((x) => x.id === m.dataset.jref); if (!e) return; const PW = S.jPW || 336; m.style.width = PW + 'px'; m.style.transform = 'none'; const E = jLayoutText(m); if (E) jPicsDraw(E, PW, m.querySelector('.jpics')); const box = m.parentNode; m.style.transform = `scale(${box.clientWidth / PW})`; }); }
function jLayoutText(pa) { const mini = !!pa; pa = pa || document.querySelector('.jpaper'); const fl = pa && pa.querySelector('.jflow'); if (!fl) return null; const e = pa.dataset.jref ? (M.journal || []).find((x) => x.id === pa.dataset.jref) : jCurrent(); const E = e || { text: '', imgs: [] }; const PW = mini ? (S.jPW || 336) : (fl.clientWidth || 336); if (!mini) S.jPW = PW;
  jMig(E, PW); const Wm = jMeasure(fl); const segs = jFlowSegs(E, PW, Wm); fl.querySelectorAll('.jl:not(.jprobe)').forEach((n) => n.remove());
  fl.insertAdjacentHTML('afterbegin', segs.map((s, i) => { let sty = `left:${s.x.toFixed(1)}px;top:${s.r * JLH}px;width:${s.w.toFixed(1)}px`; if (s.al === 'c') sty += ';text-align:center'; else if (s.al === 'r') sty += ';text-align:right';
    else if (s.al === 'j' && !s.last) { const tt = s.t.replace(/\s+$/, ''); const sp = (tt.match(/ /g) || []).length; const ex = s.w - 2 - s.tw; if (ex > 0 && sp) sty += `;word-spacing:${(ex / sp).toFixed(2)}px`; }
    const inner = s.t ? jPieces(E, s.a, s.b).map(([u, v, st]) => st === 'n' ? esc(E.text.slice(u, v)) : `<span class="s-${st}">${esc(E.text.slice(u, v))}</span>`).join('') : '​';
    return `<span class="jl s-n${s.t ? '' : ' e'}${s.hy ? ' hy' : ''}" data-i="${i}" data-a="${s.a}" data-b="${s.b}" style="${sty}">${inner}</span>`; }).join(''));
  if (mini) return E; const rows = Math.max(...segs.map((s) => s.r + 1), ...(E.imgs || []).map((q) => Math.ceil(jBot(q, PW) / JLH)), 1); const mn = $('#main') ? $('#main').clientHeight - pa.offsetTop - 8 : 560; const H = Math.max(rows * JLH + JLH, mn, 300); fl.style.height = H + 'px'; pa.style.minHeight = H + 'px'; return E; }
// caret <-> place in the text
const jKOf = (n, c, o) => { const r = document.createRange(); try { r.setStart(n, 0); r.setEnd(c, o); } catch (_) { return 0; } return r.toString().replace(/​/g, '').length; };
function jPtOff(node, off) { const fl = document.querySelector('.jpaper .jflow'); if (!fl || !node || !fl.contains(node)) return null;
  const sp = (node.nodeType === 3 ? node.parentNode : node).closest && (node.nodeType === 3 ? node.parentNode : node).closest('.jl');
  if (sp && !sp.classList.contains('jprobe')) { const a = +sp.dataset.a, b = +sp.dataset.b; if (sp.classList.contains('e')) return a; return Math.min(a + jKOf(sp, node, off), b); }
  const L = [...fl.querySelectorAll('.jl:not(.jprobe)')]; const n = L[off] || null; return n ? +n.dataset.a : (L.length ? +L[L.length - 1].dataset.b : 0); }
function jSelOffs() { const s = getSelection(); if (!s || !s.rangeCount) return null; const r = s.getRangeAt(0); const a = jPtOff(r.startContainer, r.startOffset), b = jPtOff(r.endContainer, r.endOffset); return a == null || b == null ? null : [Math.min(a, b), Math.max(a, b)]; }
function jSpanAt(o) { const L = [...document.querySelectorAll('.jpaper .jflow .jl:not(.jprobe)')]; return L.find((n) => +n.dataset.a <= o && o < +n.dataset.b) || L.find((n) => +n.dataset.b === o) || L.find((n) => +n.dataset.a === o) || L[L.length - 1]; }
function jSetCaret(o, o2) { const fl = document.querySelector('.jpaper .jflow'); if (!fl) return; const at = (x) => { const n = jSpanAt(x); if (!n) return [fl, 0]; const tw = document.createTreeWalker(n, NodeFilter.SHOW_TEXT); const ts = []; while (tw.nextNode()) ts.push(tw.currentNode); if (!ts.length) return [n, 0]; if (n.classList.contains('e')) return [ts[0], 0]; let k = Math.max(0, x - +n.dataset.a); for (const t of ts) { if (k <= t.length) return [t, k]; k -= t.length; } const lt = ts[ts.length - 1]; return [lt, lt.length]; };
  const [n1, k1] = at(o); const r = document.createRange(); r.setStart(n1, k1); if (o2 != null && o2 !== o) { const [n2, k2] = at(o2); r.setEnd(n2, k2); } else r.collapse(true); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
// one edit to the words: replace [s, t) with str, keeping the paragraph styles in step
function jEdit(s, t, str) { const e = jMake(); const T = e.text || ''; s = Math.max(0, Math.min(s, T.length)); t = Math.max(s, Math.min(t, T.length));
  const pi = (T.slice(0, s).match(/\n/g) || []).length, rm = (T.slice(s, t).match(/\n/g) || []).length, ad = (str.match(/\n/g) || []).length; const ps = e.ps = e.ps || [];
  while (ps.length <= pi) ps.push({}); const base = ps[pi] || {}; ps.splice(pi + 1, rm); for (let i = 0; i < ad; i++) ps.splice(pi + 1, 0, base.al ? { al: base.al } : {});
  jShiftRuns(e, s, t, str.length); e.text = T.slice(0, s) + str + T.slice(t); jFixPs(e); jSaveSoon(e); return s + str.length; }
function jFixPs(e) { const n = (e.text || '').split('\n').length; const ps = e.ps = e.ps || []; while (ps.length < n) ps.push({}); ps.length = n; }
function jSaveSoon(e) { clearTimeout(jT); jT = setTimeout(() => { if (jEmpty(e)) M.journal = M.journal.filter((x) => x !== e); save(); }, 400); }
// read the words back from the page after the keyboard changed it directly (phone keyboards while composing a word)
function jFromDom() { const fl = document.querySelector('.jpaper .jflow'); const e = jCurrent(); if (!fl) return null; const old = (e && e.text) || ''; const sel = getSelection(); const an = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
  let out = '', prev = null, caret = null;
  [...fl.childNodes].forEach((n) => { if (n.nodeType === 1 && n.classList.contains('jprobe')) return;
    if (n.nodeType === 1 && n.classList.contains('jl')) { const a = +n.dataset.a, i = +n.dataset.i; if (prev) out += i === prev.i + 1 ? old.slice(prev.b, a) : ''; const raw = n.textContent; const c = raw.replace(/​/g, '');
      if (an && n.contains(an.startContainer)) { caret = out.length + jKOf(n, an.startContainer, an.startOffset); }
      out += c; prev = { i, b: +n.dataset.b }; }
    else if (n.nodeType === 3) { if (an && an.startContainer === n) caret = out.length + an.startOffset; out += n.data.replace(/​/g, ''); } });
  return { text: out, caret }; }
function jSyncDom() { const r = jFromDom(); if (!r) return; let e = jCurrent(); if (!e && !r.text.trim()) return; e = jMake(); if (r.text === e.text) return r; { const o = e.text || '', nw = r.text; let pf = 0; while (pf < o.length && pf < nw.length && o[pf] === nw[pf]) pf++; let sf = 0; while (sf < o.length - pf && sf < nw.length - pf && o[o.length - 1 - sf] === nw[nw.length - 1 - sf]) sf++; jShiftRuns(e, pf, o.length - sf, nw.length - pf - sf); } e.text = r.text; jFixPs(e); jSaveSoon(e); jLayoutText(); if (r.caret != null) jSetCaret(r.caret); return r; }
let jComp = false;
document.addEventListener('compositionstart', (ev) => { if (ev.target.closest && ev.target.closest('.jflow')) jComp = true; });
document.addEventListener('compositionend', (ev) => { if (!(ev.target.closest && ev.target.closest('.jflow'))) return; jComp = false; setTimeout(jSyncDom, 0); });
document.addEventListener('beforeinput', (ev) => { const fl = ev.target.closest && ev.target.closest('.jflow'); if (!fl || !fl.isContentEditable) return; if (ev.isComposing || jComp || ev.inputType === 'insertCompositionText') return;
  const so = jSelOffs(); if (!so) return; let [s, t] = so; const T = (jCurrent() || { text: '' }).text || ''; let str = '';
  const ty = ev.inputType;
  if (ty === 'insertText' || ty === 'insertReplacementText') str = ev.data != null ? ev.data : (ev.dataTransfer ? ev.dataTransfer.getData('text/plain') : '');
  else if (ty === 'insertParagraph' || ty === 'insertLineBreak') str = '\n';
  else if (ty === 'insertFromPaste' || ty === 'insertFromDrop' || ty === 'insertFromYank') str = ev.dataTransfer ? ev.dataTransfer.getData('text/plain') : (ev.data || '');
  else if (ty === 'deleteContentBackward') { if (s === t) s = Math.max(0, s - (/[\uDC00-\uDFFF]/.test(T[s - 1] || '') ? 2 : 1)); }
  else if (ty === 'deleteContentForward') { if (s === t) t = Math.min(T.length, t + 1); }
  else if (ty === 'deleteWordBackward') { if (s === t) { let k = s; while (k > 0 && /\s/.test(T[k - 1])) k--; while (k > 0 && !/\s/.test(T[k - 1])) k--; s = k; } }
  else if (ty === 'deleteWordForward') { if (s === t) { let k = t; while (k < T.length && /\s/.test(T[k])) k++; while (k < T.length && !/\s/.test(T[k])) k++; t = k; } }
  else if (ty === 'deleteSoftLineBackward' || ty === 'deleteHardLineBackward') { if (s === t) s = T.lastIndexOf('\n', s - 1) + 1; }
  else if (ty === 'deleteSoftLineForward' || ty === 'deleteHardLineForward') { if (s === t) { const k = T.indexOf('\n', t); t = k < 0 ? T.length : k; } }
  else if (ty === 'deleteByCut' || ty === 'deleteContent' || ty === 'deleteByDrag') { }
  else if (ty === 'historyUndo' || ty === 'historyRedo' || /^format/.test(ty)) { ev.preventDefault(); return; }
  else return;
  ev.preventDefault(); if (s === t && !str) return; str = str.replace(/\r\n?/g, '\n'); const c = jEdit(s, t, str); jLayoutText(); jSetCaret(c); });
document.addEventListener('input', (ev) => { const fl = ev.target.closest && ev.target.closest('.jflow'); if (!fl || !fl.isContentEditable) return; if (ev.isComposing || jComp) return; jSyncDom(); });
document.addEventListener('selectionchange', () => { const fl = document.querySelector('.jpaper .jflow'); if (!fl || document.activeElement !== fl) return; const so = jSelOffs(); if (so) { S.jCaret = so[0]; S.jCaretEnd = so[1]; } });
document.addEventListener('selectionchange', () => requestAnimationFrame(jSelBar));
// the entry being written; made on first use
function jMake() { let e = jCurrent(); if (e) return e; e = { id: uid('j'), d: T0, at: nowHM(), text: '', tags: [], ps: [{}] }; if (M.jPaper === 'blank') e.paper = 'blank'; if (S.jRe) e.re = S.jRe; if (S.jNewTags) e.tags = S.jNewTags.slice(); (M.journal = M.journal || []).push(e); S.jEntry = e.id; const pa = document.querySelector('.jpaper'); if (pa && !pa.dataset.jref) { /* keeps following jCurrent */ } return e; }
function jSync() { if (jComp) { jComp = false; jSyncDom(); } return jCurrent(); }
function jAddImg(pic, r) { const e = jMake(); const PW = S.jPW || 336; const sp = S.jCaret != null ? jSpanAt(S.jCaret) : null; const row = sp ? Math.round(parseFloat(sp.style.top) / JLH) : 0; const z = Math.max(1, ...(e.imgs || []).map((q) => q.z || 1)) + 1;
  const q = Object.assign({ id: uid('ji'), w: 0.45, x: 0, y: row * JLH + 4, z, r: r || 1 }, pic); (e.imgs = e.imgs || []).push(q); save(); S.jSel = q.id; S.jMenu = false; const c = S.jCaret != null ? S.jCaret : (e.text || '').length; render(); jLayout(); const fl = document.querySelector('.jflow'); if (fl) { fl.focus({ preventScroll: true }); jSetCaret(c); } }
function jView(e, id) { const im = (e.imgs || []).slice().sort((a, b) => a.y - b.y || a.x - b.x); vwOpen(() => im.map((q) => ({ id: q.id, src: jImgSrc(q), d: e.d })), id); }
const jImgs = () => { const e = jCurrent(); return (e && e.imgs) || []; };
// paragraph look (2026-11-08: "basic text editing options like aligning evenly")
function jParas(e) { const T = e.text || ''; const a = S.jCaret != null ? S.jCaret : T.length, b = S.jCaretEnd != null ? S.jCaretEnd : a; const p0 = (T.slice(0, a).match(/\n/g) || []).length, p1 = (T.slice(0, b).match(/\n/g) || []).length; const out = []; for (let i = p0; i <= p1; i++) out.push(i); return out; }
// a picked picture: frame and delete, a corner handle to resize, drag to move anywhere (pictures can overlap)
function jPick(id) { S.jSel = id; if (!id) S.jFr = false; const pa = document.querySelector('.jpaper'); if (!pa) return; const old = pa.querySelector('.jtools'); if (old) old.remove();
  pa.querySelectorAll('.jpics .jpc').forEach((el) => { const on = el.dataset.pc === id && !pa.classList.contains('jread'); el.classList.toggle('sel', on); /* both handles go when the picture is let go (2026-11-08) */ el.querySelectorAll('.jrs, .jrot').forEach((x) => x.remove()); if (on) el.insertAdjacentHTML('beforeend', `<span class="jrs" aria-hidden="true"></span><span class="jrot" aria-hidden="true">${icon('rotate-cw', 12, 2)}</span>`); });
  const el = id && !pa.classList.contains('jread') && pa.querySelector(`.jpics .jpc[data-pc="${id}"]`); if (!el) return; const p = jImgs().find((x) => x.id === id);
  // the picture's tools sit on the page, kept inside it, above the picture (or below it near the top)
  const fr = S.jFr ? `<span class="jfrow">${JFRAMES.map(([k, l]) => `<button data-a="jimgfr" data-v="${k}" aria-pressed="${((p && p.frame) || 'plain') === k}"><i class="fprev f-${k}"></i>${l}</button>`).join('')}</span>` : '';
  pa.querySelector('.jpics').insertAdjacentHTML('beforeend', `<span class="jtools"><span class="jtrow"><button data-a="jimgfrm" aria-label="Frame" aria-pressed="${!!S.jFr}">${icon('scan', 16)}</button><button data-a="jimgrm" data-v="${id}" aria-label="Delete the picture">${icon('trash', 16)}</button></span>${fr}</span>`);
  const t = pa.querySelector('.jtools'); const PW = pa.clientWidth, tw = t.offsetWidth, th = t.offsetHeight; const x = el.offsetLeft, y = el.offsetTop, h = el.offsetHeight;
  t.style.left = Math.max(0, Math.min(PW - tw, x)) + 'px'; t.style.top = (y - th - 44 >= 0 ? y - th - 44 : y + h + 12) + 'px'; }
let jDrag = null;
// closing the journal (2026-11-08): the close button IS a little open book with writing; tapping it folds it shut
// a plain line book, like the other icons: the left page folds over onto the right and it shuts (2026-11-08)
// closes like a real book (2026-11-08): the left page turns over onto the right, its back is the cover, and the whole book slides to the middle as it shuts
const jBookBtn = () => `<svg class="jbk" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><g class="jbA"><g class="jbR"><path d="M12 6.5h9.5a.5.5 0 0 1 .5.5v10a.5.5 0 0 1-.5.5H12z" fill="var(--page)"/><path class="jbw" d="M14.5 10h4.5M14.5 13h3.2"/></g><g class="jbL"><path d="M12 6.5H2.5a.5.5 0 0 0-.5.5v10a.5.5 0 0 0 .5.5H12z" fill="var(--page)"/><path class="jbw" d="M5 10h4.5M6.3 13h3.2"/><path class="jbcv" d="M10.3 6.5v11M4.3 9.6h3.6v2.4H4.3z"/></g></g></svg>`;
function jBookShut(a) { if (matchMedia('(prefers-reduced-motion: reduce)').matches) return 0; a.classList.add('go'); return 760; }
document.addEventListener('pointerdown', (ev) => { const pcEl = ev.target.closest && ev.target.closest('.jpaper .jpc'); const pa = document.querySelector('.jpaper'); const live = pa && !pa.classList.contains('jread');
  if (!pcEl) { if (S.jSel && live && !ev.target.closest('.jtools')) { S.jSel = null; jPick(null); } return; }
  if (!live || ev.target.closest('.jtools')) return;
  const p = jImgs().find((x) => x.id === pcEl.dataset.pc); if (!p) return;
  if (S.jSel !== p.id) { S.jFr = false; jPick(p.id); ev.preventDefault(); return; }
  ev.preventDefault(); const R = pa.getBoundingClientRect(), pr = pcEl.getBoundingClientRect();
  jDrag = { p, el: pcEl, gx: ev.clientX - R.left - p.x * pa.querySelector('.jflow').clientWidth, gy: ev.clientY - R.top - p.y, x0: ev.clientX, y0: ev.clientY, w0: p.w, W: pa.querySelector('.jflow').clientWidth, R, rs: !!ev.target.closest('.jrs'), rot: !!ev.target.closest('.jrot'), cx: pr.left + pr.width / 2, cy: pr.top + pr.height / 2, moved: false }; });
document.addEventListener('pointermove', (ev) => { const d = jDrag; if (!d) return; const dx = ev.clientX - d.x0, dy = ev.clientY - d.y0; if (!d.moved && Math.hypot(dx, dy) < 6) return; ev.preventDefault();
  if (!d.moved) { d.moved = true; const tl = document.querySelector('.jpaper .jtools'); if (tl) tl.remove(); d.el.classList.add('moving'); d.p.z = Math.max(1, ...jImgs().map((q) => q.z || 1)) + 1; d.el.style.zIndex = d.p.z; }
  const p = d.p, W = d.W, R = document.querySelector('.jpaper').getBoundingClientRect();
  // tilt by hand, snapping straight near 0 (2026-11-08)
  if (d.rot) { let g = Math.atan2(ev.clientY - d.cy, ev.clientX - d.cx) * 180 / Math.PI + 90; if (g > 180) g -= 360; if (Math.abs(g) < 4) g = 0; p.t = Math.round(g); d.el.style.setProperty('--t', p.t + 'deg'); d.el.classList.toggle('straight', p.t === 0); }
  else if (d.rs) { p.w = Math.max(0.12, Math.min(1 - p.x, d.w0 + dx / W)); d.el.style.width = (p.w * 100) + '%'; d.el.style.height = (jPcH(p) * W) + 'px'; const P = JFR[p.frame || 'plain']; if (P) d.el.style.padding = `${p.w * W * P[0]}px ${p.w * W * P[0]}px ${p.w * W * P[1]}px`; }
  else { p.x = Math.max(0, Math.min(1 - p.w, (ev.clientX - d.gx - R.left) / W)); p.y = Math.max(0, ev.clientY - d.gy - R.top); d.el.style.left = (p.x * 100) + '%'; d.el.style.top = p.y + 'px'; }
  if (!d.raf) d.raf = requestAnimationFrame(() => { d.raf = 0; jLayoutText(); }); });
document.addEventListener('pointercancel', () => { jDrag = null; });
document.addEventListener('pointerup', () => { const d = jDrag; if (!d) return; jDrag = null; if (!d.moved) return; if (d.raf) cancelAnimationFrame(d.raf); const e = jCurrent(); if (!e) return;
  d.p.x = Math.round(d.p.x * 1000) / 1000; d.p.y = Math.round(d.p.y); if (d.rs) d.p.w = Math.round(d.p.w * 1000) / 1000; save(); jLayout(); });
document.addEventListener('click', (ev) => { const el = ev.target.closest && ev.target.closest('.jread .jpc'); if (!el) return; const p = el.closest('.jread'); const e = (M.journal || []).find((x) => x.id === p.dataset.jref); if (e) jView(e, el.dataset.pc); });
function renderNotebook() { const v = S.nbView || 'home';
  if (v === 'notepad') return renderNotepad();
  if (v === 'journal') return renderJournalAll();
  if (v === 'jpage') return renderJournal();
  if (v === 'boards') return renderBoardsAll();
  if (v === 'board') return renderBoard();
  if (v === 'words') return renderWords();
  return renderNbHome(); }
const nbTitle = () => ({ notepad: 'Notes', journal: 'Journal', jpage: 'Journal', boards: 'Boards', board: 'Boards', words: 'Words' })[S.nbView] || 'Notebook';
function jTagSheet(s) { const e = (M.journal || []).find((x) => x.id === s.ref) || { tags: [] }; const T = e.tags || [];
  return `<div class="chips">${jTags().map((t) => `<button class="chip" data-a="jtagtog" data-v="${esc(t)}" aria-pressed="${T.includes(t)}">${esc(t)}</button>`).join('')}${addChip('jnewtagin', 'New tag')}</div>${addOpen('jnewtagin') ? `<div class="inrow" style="margin-top:12px"><input class="inp" id="jnewtagin" placeholder="New tag" enterkeyhint="done" autocomplete="off"><button class="btn" data-a="jnewtag">Add</button></div>` : ''}`; }
function jListSheet() { const J = (M.journal || []).slice().sort((a, b) => (b.d + (b.at || '')).localeCompare(a.d + (a.at || '')));
  return J.length ? `<div class="hlist">${J.map((e) => `<div class="tg"><button class="l" data-a="jopen" data-ref="${e.id}" style="text-align:left"><span class="mono" style="font-size:10px;color:var(--quiet)">${esc(stampOf(e.d, e.at))}</span><small style="color:var(--ink);font-size:15px">${esc(jPlain(e.text).split('\n')[0].slice(0, 80))}</small></button></div>`).join('')}</div>` : '<p class="empty">Nothing written yet.</p>'; }
function jGrow() { jLayout(); jMinis(); }
let jT;
function jFromBack() { S.jNewTags = null; if (S.jFrom) { S.area = S.jFrom; S.jFrom = null; S.nbView = 'home'; S.page = null; } }
function jDropEmpty() { const e = jCurrent(); if (e && jEditable(e) && jEmpty(e)) M.journal = M.journal.filter((x) => x !== e); }
document.addEventListener('input', (ev) => { const t = ev.target;
  // growing the page must not move where I am in a long note: the pop-up keeps its scroll position
  if (t && t.id === 'ntext') { const sb = t.closest('.sb'); const y = sb ? sb.scrollTop : 0; t.style.height = 'auto'; t.style.height = Math.max(t.scrollHeight, 224) + 'px'; if (sb) sb.scrollTop = y; } });
function notebookAction(act, a, ref, v) {
  switch (act) {
    case 'nnew': S.nTagOpen = false; openSheet({ kind: 'note', title: 'New note', isNew: true, draft: { title: '', text: '', tags: S.nTag && S.nTag !== 'all' ? [S.nTag] : [] } }); return true;
    case 'nopen': { S.nTagOpen = false; const pj = v && G(v) ? v : null; const n = noteList({ proj: pj }).find((x) => x.id === ref); if (n) openSheet({ kind: 'note', ref, proj: pj, title: 'Note', draft: JSON.parse(JSON.stringify(n)) }); return true; }
    case 'pnnew': S.nTagOpen = false; openSheet({ kind: 'note', title: 'New note', isNew: true, proj: v, draft: { title: '', text: '' } }); return true;
    case 'ntagtog': { ncapture(); const T = S.sheet.draft.tags = S.sheet.draft.tags || []; const i = T.indexOf(v); if (i >= 0) T.splice(i, 1); else T.push(v); nAuto(); renderLayer(); return true; }
    case 'nnewtag': { ncapture(); const el = document.getElementById('nnewtag'); const t = el && el.value.trim(); if (!t) return true; const T = S.sheet.draft.tags = S.sheet.draft.tags || []; if (!T.includes(t)) T.push(t); nAuto(); renderLayer(); return true; }
    case 'ntagmenu': ncapture(); S.nTagOpen = !S.nTagOpen; renderLayer(); return true;
    case 'notesave': { if (a && !a.dataset.ok && a.classList.contains('npad')) { nAuto(); a.dataset.ok = '1'; a.classList.add('peeled'); setTimeout(() => { a.dispatchEvent(new MouseEvent('click', { bubbles: true })); }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 700); return true; }
      S.nTagOpen = false; nAuto(); S.sheet = null; render(); return true; }
    case 'ncopy': { ncapture(); S.nTagOpen = false; renderLayer(); const D = S.sheet.draft; noteCopy([D.title, D.text].filter((x) => (x || '').trim()).join('\n\n')); return true; }
    case 'ndelete': { const s = S.sheet; S.sheet = null; S.nTagOpen = false; change(() => { const L = noteList(s); const i = L.findIndex((x) => x.id === s.ref); if (i >= 0) L.splice(i, 1); }, 'Note deleted'); return true; }
    case 'nfopen': S.nFOpen = !S.nFOpen; render(); return true;
    case 'ntag': S.nTag = v; S.nFOpen = false; render(); return true;
    case 'jnew': S.jNewTags = null; S.jFrom = null; if (S.nbView === 'jpage') { jSync(); jDropEmpty(); save(); } S.jMenu = false; S.jBack = S.nbView === 'jpage' ? (S.jBack || 'home') : (S.nbView || 'home'); S.jTagOpen = false; S.jRe = null; S.jSel = null; S.jCaret = null; S.nbView = 'jpage'; S.jEntry = 'new'; render(); jGrow(); $('#main').scrollTop = 0; requestAnimationFrame(() => { const t = document.getElementById('jtext'); if (t) { jLayout(); t.focus(); jSetCaret(((jCurrent() || {}).text || '').length); } }); return true;
    case 'jopen': S.jNewTags = null; S.jFrom = null; jSync(); jDropEmpty(); S.jBack = S.nbView === 'jpage' ? (S.jBack || 'home') : (S.nbView || 'home'); S.jTagOpen = false; S.jRe = null; S.jSel = null; S.jCaret = null; S.nbView = 'jpage'; S.jEntry = ref; S.sheet = null; render(); jGrow(); $('#main').scrollTop = 0; return true;
    case 'jfopen': S.jFOpen = !S.jFOpen; render(); return true;
    case 'jtagf': S.jTag = v; S.jFOpen = false; render(); return true;
    case 'jtags': { S.jMenu = false; if (S.jTagOpen) { S.jTagOpen = false; render(); return true; } jMake(); jSync(); save(); S.jTagOpen = true; render(); return true; }
    case 'jtagtog': { jMake(); const e = jSync(); if (!e) return true; const T = e.tags = e.tags || []; const i = T.indexOf(v); if (i >= 0) T.splice(i, 1); else T.push(v); save(); render(); return true; }
    case 'jnewtag': { if (document.getElementById('jnewtagin') && document.getElementById('jnewtagin').value.trim()) jMake(); const e = jSync(); const el = document.getElementById('jnewtagin'); const t = el && el.value.trim(); if (!e || !t) return true; e.tags = e.tags || []; if (!e.tags.includes(t)) e.tags.push(t); save(); render(); return true; }
    case 'jmenu': jSync(); S.jTxt = false; S.jMenu = !S.jMenu; S.jTagOpen = false; render(); return true;
    case 'jlistopen': jSync(); S.jMenu = false; render(); openSheet({ kind: 'jlist', title: 'Earlier pages' }); return true;
    case 'jreply': { S.jMenu = false; S.jBack = S.jBack || 'home'; S.jTagOpen = false; S.jRe = ref; S.jSel = null; S.jCaret = null; S.jEntry = 'new'; render(); jGrow(); $('#main').scrollTop = 0; requestAnimationFrame(() => { const t = document.getElementById('jtext'); if (t) { jLayout(); t.focus(); jSetCaret(((jCurrent() || {}).text || '').length); } }); return true; }
    case 'jimgfrm': S.jFr = !S.jFr; jPick(S.jSel); return true;
    case 'jimgfr': { const e = jSync(); const p = e && (e.imgs || []).find((x) => x.id === S.jSel); if (!p) return true; if (v === 'plain') delete p.frame; else p.frame = v; save(); jLayout(); return true; }
    case 'jimgview': { const e = jSync(); if (e) jView(e, v); return true; }
    case 'jimgrm': { const e = jSync(); if (!e) return true; e.imgs = (e.imgs || []).filter((q) => q.id !== v); S.jSel = null; S.jFr = false; save(); jLayout(); return true; }
    case 'jtxt': S.jTxt = !S.jTxt; S.jMenu = false; { const c = S.jCaret, c2 = S.jCaretEnd; render(); jLayout(); if (!S.jTxt && c != null) { const fl = document.querySelector('.jflow'); if (fl) { fl.focus(); jSetCaret(c, c2); } } } return true;
    case 'jdelete': { M.journal = (M.journal || []).filter((x) => x.id !== ref); (M.journal || []).forEach((x) => { if (x.re === ref) delete x.re; }); save(); S.jMenu = false; S.jTagOpen = false; S.jSel = null; S.jRe = null; S.nbView = S.jBack || 'home'; S.jEntry = null; jFromBack(); render(); return true; }
    case 'jpaper': { const e = jMake(); if (v === 'blank') e.paper = 'blank'; else delete e.paper; M.jPaper = v; save(); render(); jLayout(); return true; }
    case 'jal': case 'jst': { const e = jMake(); jFixPs(e); const c = S.jCaret, c2 = S.jCaretEnd;
      if (act === 'jst') { if (c == null || c2 == null || c === c2) return true; jSetSt(e, Math.min(c, c2), Math.max(c, c2), v); }
      else jParas(e).forEach((i) => { const P = e.ps[i] = Object.assign({}, e.ps[i]); if (v === 'l') delete P.al; else P.al = v; });
      save(); render(); jLayout(); if (c != null) { const fl = document.querySelector('.jflow'); if (fl) { fl.focus({ preventScroll: true }); jSetCaret(c, c2); } } return true; }
    // the open book closes, then the page saves and exits (2026-11-06)
    case 'jsave': { if (a && !a.dataset.ok && a.classList.contains('jbook')) { a.dataset.ok = '1'; jSync(); save(); const t = jBookShut(a); setTimeout(() => { a.dispatchEvent(new MouseEvent('click', { bubbles: true })); }, t); return true; }
      const e0 = jCurrent(); const ed = jEditable(e0); jSync(); jDropEmpty();
      save(); S.jTagOpen = false; S.jMenu = false; S.jTxt = false; S.jRe = null; S.jSel = null; S.nbView = S.jBack || 'home'; S.jEntry = null; jFromBack(); render(); return true; }
    // (a page opened from Studies goes back to Studies)
    case 'nbgo': S.jNewTags = null; S.jFrom = null; S.nbView = v; if (v === 'words') { S.wView = 'list'; S.wMenu = false; } S.nFOpen = false; render(); $('#main').scrollTop = 0; return true;
  }
  return false;
}

async function noteCopy(t) { if (!t) { flash('Nothing in the note to copy'); return; }
  try { await navigator.clipboard.writeText(t); flash('Note copied'); return; } catch (e) {}
  try { const ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); flash(ok ? 'Note copied' : 'Could not copy the note'); } catch (e) { flash('Could not copy the note'); } }
