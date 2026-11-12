'use strict';
/* Daybook, rebuilt on building blocks (2026-11-01).
   Data: areas -> pages -> groups -> items. An item is stored ONCE in M.items and placed by id in group kid lists
   (a routine keeps its steps in item.steps). One edit mode works the same on every block. */

// ---------- dates ----------
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
// a new day starts at 6 in the morning, not at midnight (2026-11-11)
const DAY_H = 6; const appDay = () => { const n = new Date(); n.setHours(n.getHours() - DAY_H); return iso(n); };
let T0 = appDay(); // moves on at 6am, even while the app stays open (2026-11-10: feelings showed yesterday's colours)
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
const diff = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
const wd = (s) => (parse(s).getDay() + 6) % 7;
const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const fmtDate = (s) => { const d = parse(s); return WD[wd(s)] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3); };
const ord = (n) => n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th');
const relDay = (s) => { const n = diff(T0, s); return n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n === -1 ? 'Yesterday' : fmtDate(s); };
const weekStart = (s) => addDays(s, -wd(s));
const isoWeek = (s) => { const d = parse(s); d.setDate(d.getDate() + 3 - wd(s)); const y = new Date(d.getFullYear(), 0, 4); return 1 + Math.round(((d - y) / 864e5 - 3 + ((y.getDay() + 6) % 7)) / 7); };
const hm = (t) => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };
const fmtHM = (m) => pad(Math.floor(m / 60)) + ':' + pad(m % 60);

// ---------- colour ----------
const PAL = [['Sage', '#7DBE9A'], ['Moss', '#6FA24A'], ['Ochre', '#EDBB3A'], ['Amber', '#F08A3E'], ['Terracotta', '#E0644E'], ['Rose', '#EC8FA8'], ['Plum', '#A877C4'], ['Slate', '#6F9BD6'], ['Teal', '#3FAFA6'], ['Sand', '#D9AE72']];
const rgb = (h) => { h = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
// dark mode (2026-11-08): warm near-black, cards that glow warmer as they need care; kept per device
const THL = { card: '#FAF8F4', page: '#F2EFEA', ink: '#23211E', line: '#DDD6CA' }, THD = { card: '#2B2926', page: '#1D1B19', ink: '#EFEAE2', line: '#3D3934' };
const TH = Object.assign({}, THL); let darkOn = false; try { darkOn = localStorage.getItem('daybook3-dark') === '1'; } catch (e) { /* no storage */ }
function applyTheme() { Object.assign(TH, darkOn ? THD : THL); document.documentElement.classList.toggle('dark', darkOn); document.documentElement.style.colorScheme = darkOn ? 'dark' : 'only light'; /* tells the browser not to darken the page by itself, and to draw its own pickers to match */ const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = TH.page; }
applyTheme();
// in dark mode the colours I picked are toned down to fit: lighter, brighter ones get darker and a little softer.
// Done on whatever gets drawn (backgrounds, borders, fills, --c / --bg tones), never on text colour or inside boards.
const dkCache = new Map();
function dkCol(h) { let c = dkCache.get(h); if (c) return c; let x = h.slice(1); if (x.length === 3) x = x.split('').map((q) => q + q).join(''); if (x.length !== 6) return h;
  const r = parseInt(x.slice(0, 2), 16) / 255, g = parseInt(x.slice(2, 4), 16) / 255, b = parseInt(x.slice(4, 6), 16) / 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let L = (mx + mn) / 2, S = 0, H = 0; const d = mx - mn;
  if (d) { S = L > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); H = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; H /= 6; }
  if (L > 0.34) { L = 0.34 + (L - 0.34) * 0.42; S *= 0.82; }
  const f = (n) => { const k = (n + H * 12) % 12, a = S * Math.min(L, 1 - L); return Math.round((L - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255).toString(16).padStart(2, '0'); };
  c = '#' + f(0) + f(8) + f(4); dkCache.set(h, c); return c; }
const DKP = /^(background|background-color|background-image|border|border-color|border-left|border-top|border-bottom|border-right|box-shadow|outline|--c|--bg|--deep|--g1|--g2|--bc|fill|stroke)$/;
function dkStyle(st) { return st.split(';').map((dec) => { const i = dec.indexOf(':'); if (i < 0) return dec; const k = dec.slice(0, i).trim(); return DKP.test(k) ? dec.slice(0, i + 1) + dec.slice(i + 1).replace(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g, dkCol) : dec; }).join(';'); }
function dkPass(root) { if (!darkOn || !root || !root.querySelectorAll) return; const els = [root, ...root.querySelectorAll('[style],[fill],[stroke]')];
  els.forEach((el) => { if (el.dataset && el.dataset.dk) return; if (el.closest && el.closest('.mboard,#viewer,.cpick,.bdock')) return; const st = el.getAttribute && el.getAttribute('style'); if (st && /#[0-9a-fA-F]{3}/.test(st)) el.setAttribute('style', dkStyle(st));
    if (el.tagName !== 'text' && el.tagName !== 'tspan') ['fill', 'stroke'].forEach((k) => { const v = el.getAttribute && el.getAttribute(k); if (v && /^#[0-9a-fA-F]{3,6}$/.test(v)) el.setAttribute(k, dkCol(v)); });
    if (el.dataset) el.dataset.dk = 1; }); }
new MutationObserver((ms) => { if (!darkOn) return; ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1) dkPass(n); })); }).observe(document.documentElement, { childList: true, subtree: true });
const mix = (a, b, t) => '#' + rgb(a).map((x, i) => pad(Math.round(x + (rgb(b)[i] - x) * t).toString(16))).join('');
const pale = (c) => mix(c, TH.card, 0.62);

// ---------- example data (the owner can start empty from the ⋯ menu) ----------
function seed() {
  const it = {}; const add = (id, o) => { it[id] = Object.assign({ made: addDays(T0, -30), tags: [], insight: true, kind: 'behaviour' }, o); return id; };
  add('ci-m', { name: 'Morning check-in', type: 'checkin', which: 'morning', color: '#EDBB3A', insight: false });
  add('ci-e', { name: 'Evening check-in', type: 'checkin', which: 'evening', color: '#EDBB3A', insight: false });
  add('s-meds', { name: 'Medication', type: 'step' }); add('s-water', { name: 'Glass of water', type: 'step' }); add('s-stretch', { name: 'Stretch', type: 'step' }); add('s-plan', { name: 'Look at today', type: 'step' });
  add('r-morning', { name: 'Morning routine', type: 'routine', when: { mode: 'every', n: 1 }, steps: ['s-meds', 's-water', 's-stretch', 's-plan'], icon: 'sunrise', dur: 30 });
  add('s-teeth', { name: 'Brush teeth', type: 'step', tags: ['t-hyg'] }); add('s-face', { name: 'Wash face', type: 'step', tags: ['t-hyg'] }); add('s-clothes', { name: 'Lay out clothes', type: 'step' });
  add('r-evening', { name: 'Evening routine', type: 'routine', when: { mode: 'every', n: 1 }, steps: ['s-teeth', 's-face', 's-clothes'], icon: 'moon', dur: 30 });
  add('t-shower', { name: 'Shower', type: 'task', when: { mode: 'every', n: 2 }, tags: ['t-hyg'], icon: 'shower-head', color: '#3FAFA6' });
  add('t-wipe', { name: 'Wipe counters', type: 'task', when: { mode: 'every', n: 3 }, icon: 'spray-can', color: '#EDBB3A' });
  add('t-wash', { name: 'Wash a load', type: 'task', when: { mode: 'days', days: [0, 3, 5] }, icon: 'washing-machine', color: '#EDBB3A' });
  add('t-brine', { name: 'Brine the chicken', type: 'task', when: { mode: 'once', date: T0 }, icon: 'cooking-pot', color: '#F08A3E', insight: false });
  add('t-walk', { name: 'Short walk', type: 'task', when: { mode: 'every', n: 1 }, icon: 'footprints', color: '#6FA24A', tags: ['t-move'] });
  add('t-tv', { name: 'TV', type: 'task', when: { mode: 'every', n: 1 }, overdo: true, icon: 'tv', color: '#A877C4', tags: ['t-media'] });
  add('t-knit', { name: 'Knit', type: 'task', when: { mode: 'every', n: 1 }, overdo: true, icon: 'scissors', color: '#EC8FA8', tags: ['t-hobby'] });
  add('t-tax', { name: 'Send the tax form', type: 'task', when: { mode: 'once', date: addDays(T0, 3) }, insight: false, icon: 'mail' });
  add('t-lamp', { name: 'Fix the lamp', type: 'task', when: { mode: 'once', date: null }, insight: false, icon: 'wrench' });
  add('a-hair', { name: 'Hairdresser', type: 'appt', date: T0, time: '18:30', note: 'Reminder 1 h before', insight: false, kind: '' });
  add('a-gp', { name: 'GP appointment', type: 'appt', date: addDays(T0, 4), time: '10:30', note: 'Bring the blood test letter', insight: false, kind: '' });
  add('a-dent', { name: 'Dentist', type: 'appt', date: addDays(T0, -2), time: '14:00', note: '', insight: false, kind: '' });
  add('a-coffee', { name: 'Coffee with Mia', type: 'appt', date: addDays(T0, 2), time: '14:00', note: 'Example social plan', insight: false, kind: 'circumstance', rep: { n: 1, unit: 'week' } });
  // A few days of example ticks so the week strip and repeats have a history.
  const log = {};
  for (let i = 1; i <= 6; i++) { const d = addDays(T0, -i); log[d] = { 'ci-m': 'done', 'ci-e': 'done', 's-meds': 'done', 's-water': 'done', 's-stretch': 'done', 's-plan': 'done', 's-teeth': 'done', 's-face': 'done', 's-clothes': 'done', 't-walk': 'done', 't-tv': i % 3 === 0 ? 'much:inert' : 'done' }; if (i % 2 === 1) log[d]['t-shower'] = 'done'; if (i === 2) log[d]['t-wipe'] = 'done'; }
  const snap = {}; for (let i = 1; i <= 6; i++) snap[addDays(T0, -i)] = { due: 10, done: i === 4 ? 8 : 10 };
  return migrate({
    v: 3, example: true,
    areaOrder: ['plan', 'study', 'home', 'fitness', 'hobbies', 'notebook'],
    areas: {
      plan: { name: 'Planner', icon: 'calendar-days', color: '#D9AE72', pages: ['today', 'schedule', 'plan', 'appts'] },
      study: { name: 'Studies', icon: 'book-text', color: '#3FAFA6', pages: [] }, home: { name: 'Home', icon: 'armchair', color: '#EDBB3A', pages: [] },
      hobbies: { name: 'Hobbies', icon: 'hot-air-balloon', color: '#EC8FA8', pages: [] },
      notebook: { name: 'Notebook', icon: 'pencil', color: '#A877C4', pages: [] }
    },
    pages: { today: { name: 'Today', color: '#D9AE72' }, schedule: { name: 'Schedule', color: '#D9AE72' }, plan: { name: 'Plan', color: '#D9AE72' }, appts: { name: 'Appointments', color: '#6F9BD6' } },
    groups: {
      'g-blocks': { name: 'Day blocks', holds: 'blocks', kids: ['b-morning', 'b-study', 'b-evening'] },
      'b-morning': { name: 'Morning', style: 'dayblock', holds: 'task', start: '07:00', end: '09:00', color: '#D9AE72', icon: 'sunrise', kids: ['ci-m', 'r-morning', 't-walk'] },
      'b-study': { name: 'Study', style: 'dayblock', holds: 'task', start: '09:00', end: '18:00', color: '#3FAFA6', icon: 'book-open', kids: ['t-tax', 't-lamp'] },
      'b-evening': { name: 'Evening', style: 'dayblock', holds: 'task', start: '18:00', end: '23:00', color: '#A877C4', icon: 'moon', kids: ['t-wipe', 't-brine', 't-wash', 't-shower', 't-knit', 't-tv', 'r-evening', 'ci-e'] },
      'g-appts': { name: 'Appointments', holds: 'acats', kids: ['c-appt', 'c-social'] },
      'c-appt': { name: 'Appointments', style: 'acat', holds: 'appt', color: '#6F9BD6', icon: 'calendar-clock', kids: ['a-hair', 'a-gp', 'a-dent'] },
      'c-social': { name: 'Social', style: 'acat', holds: 'appt', color: '#EC8FA8', icon: 'users', kids: ['a-coffee'] }
    },
    items: it,
    tags: { 't-hyg': 'Hygiene', 't-move': 'Movement', 't-media': 'Media', 't-hobby': 'Hobbies', 't-sleep': 'Sleep' },
    log, snap, settings: {}
  });
}
function blank() { const m = seed(); m.example = false; m.items = {}; m.log = {}; m.snap = {};
  Object.values(m.groups).forEach((g) => { g.kids = g.kids.filter((k) => m.groups[k]); });
  m.items['ci-m'] = seed().items['ci-m']; m.items['ci-e'] = seed().items['ci-e']; m.groups['b-morning'].kids = ['ci-m']; m.groups['b-evening'].kids = ['ci-e'];
  // the check-ins live in a Morning and an Evening routine, so those two stay (empty apart from the check-in)
  if (m.groups['ht-beh']) { m.settings = m.settings || {}; m.settings.hyper1 = false; hyperMigrate(m); } // Hyperfocus is part of the app, not an example
  const sd = seed().items; m.items['r-morning'] = Object.assign(sd['r-morning'], { steps: [] }); m.items['r-evening'] = Object.assign(sd['r-evening'], { steps: [] });
  m.groups['b-morning'].kids = ['ci-m', 'r-morning']; m.groups['b-evening'].kids = ['r-evening', 'ci-e'];
  const hs = healthSeed(); Object.assign(m.groups, hs.groups); Object.assign(m.items, hs.items); m.events = []; m.conds = []; m.photos = {}; m.feel = {};
  m.settings = {}; migrate(m);
  // later areas seed their own examples in migrate; clear those too, keeping only the categories (hobbies, rooms, subjects)
  m.study = {}; m.support = {}; m.trips = []; m.notes = []; m.journal = []; m.words = []; m.shop = []; m.shopLists = [{ id: 'sl-main', name: 'To get' }]; m.reminders = [];
  Object.keys(m.groups).filter((k) => m.groups[k].style === 'project').forEach((k) => { delete m.groups[k]; });
  Object.values(m.groups).forEach((g) => { g.kids = g.kids.filter((k) => m.groups[k] || m.items[k]); });
  // Empty means EMPTY (2026-11-10/11): no symptoms, tags, social trackers, slots, rooms, subjects or hobbies either.
  // What stays: the day blocks, the two routines with their check-ins, and the check-in questions.
  const keep = ['ci-m', 'ci-e', 'r-morning', 'r-evening', 'tr-sleep', 'tr-mmood', 'tr-mmot', 'tr-mood', 'tr-mot', 'tr-energy', 'tr-prod'];
  Object.keys(m.items).forEach((k) => { if (!keep.includes(k)) delete m.items[k]; });
  Object.keys(m.groups).forEach((k) => { if (['room', 'subject', 'sgroup', 'hobby'].includes(m.groups[k].style)) delete m.groups[k]; });
  Object.values(m.groups).forEach((g) => { g.kids = g.kids.filter((k) => m.groups[k] || m.items[k]); });
  m.tags = {};
  return m; }

const LAYOUT_V = 5; // bump when placeDay's rules change, so past snapshots are retaken
let M = seed();
const S = { area: 'plan', page: 'today', day: T0, month: false, monthOf: T0.slice(0, 7), edit: false, sheet: null, menu: false, toast: null, showDone: false, open: {}, cat: 'all', sday: T0, sview: 'week', smonth: false, smonthOf: T0.slice(0, 7), htab: {}, fd: { day: T0, month: false, monthOf: T0.slice(0, 7), sel: 'day' } };

// ---------- helpers ----------
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = (p) => p + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 6);
function icon(name, size = 20, sw = 1.8) { const L = window.LUCIDE || {}; const d = L[name] || L.circle || ''; return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`; }
const G = (id) => M.groups[id]; const I = (id) => M.items[id];
function blockIds() { return G('g-blocks').kids.filter((k) => G(k)); }
function placements(ref) { const out = []; for (const [gid, g] of Object.entries(M.groups)) if (g.kids.includes(ref)) out.push(gid); for (const [rid, r] of Object.entries(M.items)) if ((r.steps || []).includes(ref)) out.push('s:' + rid); return out; }
function homeOf(ref) { return placements(ref)[0]; }
// the colour comes from where the item lives (a room, a subject group, a project), not from the day block it was put in; only an item that
// lives in a day block alone takes the block's colour (2026-11-11: circles changed colour when a chore went into a block)
// a generic item without its own colour wears its section's (2026-11-11)
const slotCol = (it) => { const o = it.opens; const A = M.areas || {}, P = M.pages || {}; return o === 'study' ? (A.study || {}).color : o === 'chores' ? (P.chores || A.home || {}).color : o === 'hobbies' ? (A.hobbies || {}).color : o === 'training' || o === 'move' ? (P.training || {}).color : null; };
function colorOf(id) { const it = I(id); if (!it && G(id)) return grpCol(id); if (it && it.color) return it.color; if (it && it.type === 'slot' && slotCol(it)) return slotCol(it); const P = placements(id); const pl = P.find((p) => !(G(p) && (G(p).style === 'dayblock' || G(p).holds === 'slot'))) || P[0]; if (!pl) return '#9A9387'; if (pl.startsWith('s:')) return colorOf(pl.slice(2)); return grpCol(pl); }
// a group without its own colour wears its parent's, up to the page or area it sits in (2026-11-11: items take their parent colour everywhere)
// Home's sections keep their colour on their tab (2026-11-11): Homemaking, Cooking, Chores; a room without its own colour wears Chores'
const ROOTCOL = { 'g-tend': ['pages', 'homemaking'], 'g-prep': ['pages', 'cooking'], 'g-oneoff': ['pages', 'chores'], 'g-rooms': ['pages', 'chores'], 'g-subjects': ['areas', 'study'], 'g-hobbies': ['areas', 'hobbies'], 'g-train': ['pages', 'training'], 'g-appts': ['pages', 'appts'], 'g-health': ['areas', 'health'], 'g-blocks': ['areas', 'plan'], 'g-slots': ['areas', 'plan'] };
function parentGrp(k) { return Object.keys(M.groups).find((p) => (M.groups[p].kids || []).includes(k)) || null; }
function grpCol(k, n) { const g = G(k); if (!g || (n || 0) > 8) return '#9A9387'; const R = ROOTCOL[k]; const rc = R && ((M[R[0]] || {})[R[1]] || {}).color;
  if (R && R[0] === 'pages' && rc) return rc; if (g.color) return g.color; if (rc) return rc;
  if (g.style === 'sgroup' || g.style === 'subject') { const p = parentGrp(k); return p && p !== 'g-subjects' && G(p).color ? G(p).color : ((M.areas || {}).study || {}).color || '#9A9387'; }
  if (g.style === 'project' && typeof hobOf === 'function' && G(hobOf(k))) return grpCol(hobOf(k), (n || 0) + 1);
  const p = parentGrp(k); return p ? grpCol(p, (n || 0) + 1) : '#9A9387'; }
// TWO-PART CHORES (2026-11-12), like laundry: the first tick starts it (M.half[id] = { at }), it waits on Today for
// the second tick, a reminder goes off after it.two hours, and once those hours are up the app asks if I finished it.
const halfOf = (id) => (M.half || {})[id];
function twoTick(id) { const it = I(id); if (!it || !it.two || isDone(id, T0)) return false;
  if (halfOf(id)) { twoFinish(id); return true; }
  const at = Date.now(); const due = new Date(at + (+it.two || 2) * 3600000);
  change(() => { (M.half = M.half || {})[id] = { at }; if (typeof remList === 'function') remList().push({ id: uid('rm'), text: it.name + ': part two', time: pad(due.getHours()) + ':' + pad(due.getMinutes()), rep: 'once', date: iso(due), item: id, on: true, two: id }); }, 'Started ' + it.name);
  if (typeof remSync === 'function') remSync(); return true; }
function twoFinish(id) { change(() => { if (M.half) delete M.half[id]; M.reminders = (M.reminders || []).filter((r) => r.two !== id); L(T0)[id] = 'done'; }, I(id).name + ' done'); if (typeof remSync === 'function') remSync(); }
const TWO_ASKED = new Set();
function twoCheck() { if (S.sheet || S.edit || document.hidden) return; const now = Date.now();
  const id = Object.keys(M.half || {}).find((k) => I(k) && I(k).two && !TWO_ASKED.has(k) && now - M.half[k].at >= (+I(k).two || 2) * 3600000);
  if (id) { TWO_ASKED.add(id); openSheet({ kind: 'two', ref: id, title: I(id).name }); } }
document.addEventListener('visibilitychange', () => { if (document.hidden) TWO_ASKED.clear(); else setTimeout(twoCheck, 400); });
setInterval(twoCheck, 60000); setTimeout(twoCheck, 1500);
function blockOfItem(id) { const pl = placements(id).find((p) => G(p) && G(p).style === 'dayblock'); return pl || blockIds()[blockIds().length - 1]; }
function blockAtTime(t) { const m = hm(t); return blockIds().find((b) => hm(G(b).start) <= m && m < hm(G(b).end)) || blockIds()[blockIds().length - 1]; }
function placeName(p) { if (p.startsWith('s:')) return (I(p.slice(2)) || {}).name + ' (steps)'; const g = G(p); return g.style === 'dayblock' ? 'Day block · ' + g.name : g.style === 'acat' ? 'Appointments · ' + g.name : g.name; }

// ---------- log ----------
const L = (d) => M.log[d] || (M.log[d] = {});
const val = (d, id) => (M.log[d] || {})[id];
function isDone(id, d) { const it = I(id); if (it && it.type === 'slot') return slotDone(it, d); if (it && it.type === 'routine') { const st = rSteps(id, d); return !!val(d, id) || (st.length ? st.every((s) => val(d, s)) : false); } return !!val(d, id); }
// Routines (2026-11-11): a part can be optional, and can be variable (only on days without a workout, with one, or on certain weekdays).
// Ticking the routine closes it: parts I didn't tick count as missed. It is complete when every part that isn't optional got ticked.
const rStepsAll = (id) => ((I(id) || {}).steps || []).filter((s) => I(s));
function workDay(d) { const k = 'wd|' + d; if (WKC.has(k)) return WKC.get(k); let r = false;
  try { r = trainCats().filter((c) => c !== 'tc-move').some((c) => kidsOf(c).some((x) => I(x) && (onDay(x, d) || !!val(d, x)))); } catch (e) { r = false; } WKC.set(k, r); return r; }
// an existing item can be a part too (2026-11-11: Shower on days it doesn't follow a workout, no duplicates); its options for this routine live in the routine (partOpt)
const isLinkPart = (s) => !!I(s) && !['step', 'checkin'].includes(I(s).type);
const pOpt = (rid, s) => isLinkPart(s) ? (((I(rid) || {}).partOpt || {})[s] || {}) : (I(s) || {});
function stepOn(s, d, rid) { const x = pOpt(rid, s); const o = x.only || ''; if (!o) return true; if (o === 'rest') return !workDay(d); if (o === 'train') return workDay(d); if (o === 'days') return (x.days || []).includes(wd(d)); return true; }
const rSteps = (id, d) => rStepsAll(id).filter((s) => stepOn(s, d, id));
const stepMissed = (s, d) => !!(((M.missed || {})[d] || {})[s]);
function rComplete(id, d) { const st = rSteps(id, d); if (!st.length) return !!val(d, id); return st.every((s) => (pOpt(id, s).optional) || (val(d, s) && !stepMissed(s, d))); }
function lastDoneBefore(id, d) { const ks = Object.keys(M.log).filter((k) => k < d).sort().reverse(); for (const k of ks) if (isDone(id, k)) return k; return null; }
function doneSince(id, from, to) { return Object.keys(M.log).some((k) => k >= from && k <= to && isDone(id, k)); }
const repeatable = (it) => it.type === 'routine' || (it.when && it.when.mode !== 'once');

// Does this item belong on day d? Past days show what was done; today and coming days follow the rule.
// The repeat rule that was in force on a past day: rule changes keep the old rule in it.past [{until, when}].
// Items changed before this was kept use today's rule back to when they were made (2026-11-03).
// a monthly or yearly date that a month doesn't have (the 31st, 29 Feb) lands on that month's last day
const sameDom = (a, b) => { const last = new Date(b.getFullYear(), b.getMonth() + 1, 0).getDate(); return b.getDate() === Math.min(a.getDate(), last); };
function whenOn(it, d) {
  const w = it.when || { mode: 'once', date: null };
  const h = (it.past || []).slice().sort((a, b) => a.until.localeCompare(b.until)).find((p) => d <= p.until); if (h) return h.when;
  // a day I moved it to keeps it off the days before (2026-11-12: a rescheduled shower came back on Yesterday); only items from before rules were kept lose the date
  if (w.mode !== 'once' && w.date && it.made && it.made < '2026-11-04' && it.made < w.date && !(it.past || []).length) return Object.assign({}, w, { date: null });
  return w;
}
// Always after (2026-11-11): a workout item names the tasks that always follow it (a shower after a hike). A task named
// this way shows on every day one of its workouts is on, right after it, and its own rhythm counts on from there.
const WKC = new Map();
function afterSrc() { if (WKC.has('_src')) return WKC.get('_src'); const m = {};
  Object.keys(M.items).forEach((k) => (I(k).then || []).forEach((t) => { if (I(t) && t !== k) (m[t] = m[t] || []).push(k); })); WKC.set('_src', m); return m; }
function workoutOn(d, id) { const key = d + '|' + id; if (WKC.has(key)) return WKC.get(key); let r = false;
  try { r = (afterSrc()[id] || []).some((k) => onDay0(k, d)); } catch (e) { r = false; }
  WKC.set(key, r); return r; }
// a repeat from Home or Studies that I've never done stays off my days: I get through everything once first, from its own page
const firstRound = (id, upto) => { const it = I(id); if (!it || !it.when || it.when.mode === 'once' || it.type !== 'task') return false; if (it.when.set && it.when.date) return false; // a day I picked myself always counts (2026-11-11)
  if (!placements(id).some((p) => p === 'g-tend' || (G(p) && (G(p).style === 'room' || G(p).style === 'sgroup')))) return false; return !Object.keys(M.log).some((k) => (!upto || k <= upto) && val(k, id)); };
function onDay(id, d) { const it = I(id); if (!it) return false;
  if (d >= T0 ? firstRound(id) : firstRound(id, d) && !isDone(id, d)) return false; // a past day never shows a repeat I hadn't done once yet by then (2026-11-12)
  if (!afterSrc()[id] || d < T0 || it.type === 'checkin') return onDay0(id, d);
  if (it.made && d < it.made) return false; if (it.end && d > it.end) return false;
  const w = it.when || {};
  // moved to a later day by hand (2026-11-11): nothing before that day, that day for sure, the usual rhythm after it
  const later = w.date && w.date > T0; if (later && d < w.date) return isDone(id, d); if (later && d === w.date) return true;
  // after every workout: it shows on each workout day, and its own rhythm counts on from there
  if (workoutOn(d, id)) return true; if (w.mode !== 'every') return onDay0(id, d);
  const n = Math.max(1, w.n || 1); const last = lastDoneBefore(id, T0); let anchor = later ? w.date : isDone(id, T0) || workoutOn(T0, id) || !last || diff(last, T0) >= n ? T0 : last; if (d === T0) return anchor === T0;
  for (let x = addDays(anchor > T0 ? anchor : T0, 1); x <= d; x = addDays(x, 1)) { if (workoutOn(x, id) || diff(anchor, x) >= n) anchor = x; } return anchor === d; }
function onDay0(id, d) {
  const it = I(id); if (!it) return false;
  if (it.type === 'checkin') return true;
  let w = it.when || { mode: 'once', date: null };
  if (d < T0) w = whenOn(it, d);
  if (it.made && d < it.made && !isDone(id, d)) return false;
  if (it.end && d > it.end && !isDone(id, d)) return false; // an experiment's task stops with it (2026-11-08)
  // Past days show what was planned, done or not (not done fades like the rest), not only what got done (2026-11-03)
  if (d < T0) { if (isDone(id, d)) return true; if (w.mode === 'once') return w.date === d;
    if (w.mode === 'every') { if (w.date && d < w.date) return false; const last = lastDoneBefore(id, d); return !last || diff(last, d) >= Math.max(1, w.n || 1); } }
  if (w.mode === 'once') { if (!w.date) return false; if (d === T0) return w.date === T0 || (w.date < T0 && !doneSince(id, w.date, addDays(T0, -1))); return w.date === d; }
  if (w.date && d < w.date && (w.mode === 'days' || w.mode === 'month' || w.mode === 'year')) return false;
  if (w.mode === 'days') { if (!(w.days || []).includes(wd(d))) return false; const n = Math.max(1, w.n || 1); return n === 1 || !w.date || Math.round(diff(weekStart(w.date), weekStart(d)) / 7) % n === 0; }
  if (w.mode === 'month') { const a = parse(w.date || it.made || T0), b = parse(d); const m = (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth(); return sameDom(a, b) && m >= 0 && m % Math.max(1, w.n || 1) === 0; }
  if (w.mode === 'year') { const a = parse(w.date || it.made || T0), b = parse(d); return sameDom(a, b) && a.getMonth() === b.getMonth() && (b.getFullYear() - a.getFullYear()) % Math.max(1, w.n || 1) === 0; }
  if (w.mode === 'every') {
    if (w.date && d < w.date) return false;
    const n = Math.max(1, w.n || 1); const last = lastDoneBefore(id, T0); const doneT = isDone(id, T0);
    // a start day ahead of today wins over the last time I did it, so moving it to a later day puts it on that day (2026-11-11)
    if (w.date && w.date > T0) return diff(w.date, d) >= 0 && diff(w.date, d) % n === 0;
    const dueT = doneT || !last || diff(last, T0) >= n;
    if (d === T0) return dueT;
    const anchor = dueT ? T0 : last; const k = diff(anchor, d); return k > 0 && k % n === 0;
  }
  return false;
}
const lateBy = (id) => { const w = (I(id) || {}).when; if (w && w.mode === 'once' && w.date && w.date < T0) return diff(w.date, T0); if (w && w.mode === 'every') { const last = lastDoneBefore(id, T0); if (last) { const over = diff(last, T0) - w.n; return over > 0 ? over : 0; } } return 0; };
function whenText(it) {
  const w = it.when || {}; if (it.type === 'checkin') return '';
  if (w.mode === 'once') return w.date ? relDay(w.date) : ''; // no 'No date' note anywhere (2026-11-06)
  if (w.mode === 'every') return w.n === 1 ? 'Every day' : 'Every ' + w.n + ' days';
  if (w.mode === 'days') { const n = Math.max(1, w.n || 1); const ds = (w.days || []).length === 7 ? 'every day' : (w.days || []).map((x) => WD[x]).join(', ') || 'no days picked'; return n === 1 ? ds[0].toUpperCase() + ds.slice(1) : 'Every ' + n + ' weeks · ' + ds; }
  if (w.mode === 'month') { const n = Math.max(1, w.n || 1); return (n === 1 ? 'Monthly' : 'Every ' + n + ' months') + ' on the ' + ord(parse(w.date || T0).getDate()); }
  if (w.mode === 'year') { const a = parse(w.date || T0); return 'Every year on ' + a.getDate() + ' ' + MONTHS[a.getMonth()].slice(0, 3); }
  return '';
}
// BAD DAYS (2026-11-08): a bad day (M.badDays[day]) keeps only its appointments and its own Bad day list;
// everything else scheduled moves on to the next normal day. I can still look at it and tick it on the bad day.
const isBad = (d) => !!((M.badDays || {})[d]);
const badList = () => ((G('g-bad') || {}).kids || []).filter((id) => I(id));
const badMoved = (d) => dayListRaw(d, true).flatMap((x) => x.items.map((id) => ({ id, b: x.b }))).filter((o) => I(o.id).type !== 'checkin');
function dayList(d) { const out = dayListRaw(d); if (frozenOf(d)) return out;
  if (isBad(d)) { out.forEach((x) => { x.items = []; }); return out; }
  const run = []; for (let p = addDays(d, -1); run.length < 30 && isBad(p); p = addDays(p, -1)) run.push(p);
  run.forEach((p) => dayListRaw(p, true).forEach((x) => x.items.forEach((id) => {
    if (I(id).type === 'checkin' || run.some((q) => isDone(id, q)) || out.some((z) => z.items.includes(id))) return;
    const y = out.find((z) => z.b === x.b); if (y) y.items.push(id); })));
  return out; }
// A task set to follow every workout (a shower) goes right after the workout, in the same block when there's room for it, otherwise
// first thing in the next block (2026-11-11). Room = the block's length against the minutes already in it.
function afterWork(out, d) { const src = afterSrc();
  const after = out.flatMap((x) => x.items).filter((id) => I(id) && src[id] && workoutOn(d, id)); if (!after.length) return;
  out.forEach((x) => { x.items = x.items.filter((id) => !after.includes(id)); });
  // each workout takes its own followers along; a task that follows two workouts that day goes after the first one
  const byW = new Map(); after.forEach((id) => { let at = null; out.some((x, bi) => x.items.some((k, i) => { if (src[id].includes(k)) { at = [bi, k]; return true; } return false; })); if (!at) { out[out.length - 1].items.push(id); return; } const key = at[1]; byW.set(key, (byW.get(key) || { bi: at[0], ids: [] })); byW.get(key).ids.push(id); });
  byW.forEach(({ bi, ids }, wk) => { const x = out[bi]; const g = G(x.b); const len = g && g.start && g.end ? hm(g.end) - hm(g.start) : 1e9;
    const used = x.items.filter((id) => !I(id).time).reduce((t, id) => t + (I(id).dur || 30), 0) + ids.reduce((t, id) => t + (I(id).dur || 30), 0);
    const wi = x.items.indexOf(wk);
    if (used <= len || bi === out.length - 1) x.items.splice(wi + 1, 0, ...ids); else out[bi + 1].items.unshift(...ids); }); }
function dayListRaw(d, raw) {
  const fz = raw ? null : frozenOf(d);
  if (fz) { const out = blockIds().map((b) => ({ b, items: [], appts: [] })); fz.slice().sort((p, q) => p.a - q.a).forEach((o) => { const x = out.find((y) => y.b === o.blk); if (x) (o.appt ? x.appts : x.items).push(o.id); }); return dropMissed(slotDrop(out), d); }
  const out = blockIds().map((b) => ({ b, items: [] }));
  const at = (b) => out.find((x) => x.b === b);
  const mv = (M.dayMove || {})[d] || {}, ord = (M.dayOrder || {})[d] || {};
  blockIds().forEach((b) => G(b).kids.forEach((id) => { if (I(id) && onDay(id, d)) at(mv[id] && G(mv[id]) ? mv[id] : b).items.push(id); }));
  // a move made on one day only changes that day
  out.forEach((x) => { const o = ord[x.b]; if (!o) return; const base = x.items.slice(); const key = (id) => o.indexOf(id) >= 0 ? o.indexOf(id) : 1000 + base.indexOf(id); x.items.sort((p, q) => key(p) - key(q)); });
  // a day with real study tasks (or study sessions) drops the generic Study session slot; a day with real chores (rooms and
  // one-off chores, not Homemaking or Cooking) drops the Daily chore slot (2026-11-06)
  // a started two-part chore waits on Today, and counts as a real chore there, so the generic chore slot drops (2026-11-12)
  if (d === T0) { const has = new Set(out.flatMap((x) => x.items)); Object.keys(M.half || {}).forEach((id) => { if (!I(id) || has.has(id)) return; const x = at(blockOfItem(id)) || out[out.length - 1]; if (x) x.items.push(id); }); }
  slotDrop(out);
  afterWork(out, d);
  { const R = out.flatMap((x) => x.items).filter((id) => I(id) && I(id).type === 'routine'); const inR = new Set(R.flatMap((r) => rSteps(r, d).filter(isLinkPart))); if (inR.size) out.forEach((x) => { x.items = x.items.filter((id) => !inR.has(id)); }); }
  // check-ins: morning opens the day, evening closes it
  out.forEach((x) => { x.items = x.items.filter((id) => I(id).type !== 'checkin'); });
  if (out.length) { const mi = Object.keys(M.items).find((k) => I(k).which === 'morning'); const ei = Object.keys(M.items).find((k) => I(k).which === 'evening');
    const inBlock = (k) => placements(k).some((p) => G(p)); // a check-in inside a routine shows there instead (2026-11-02)
    if (mi && inBlock(mi)) out[0].items.unshift(mi); if (ei && inBlock(ei)) out[out.length - 1].items.push(ei); }
  const appts = apptsOn(d);
  appts.forEach((id) => { const x = at(blockAtTime(I(id).time || '23:59')); if (x) x.appts = (x.appts || []).concat([id]); });
  return dropMissed(out, d);
}
// Missed (2026-11-02): an item marked missed leaves that day's list and schedule and drops into a Missed section.
// It counts as not done. Kept in M.missed[day][id], apart from the day log.
const isMissed = (id, d) => { const v = ((M.missed || {})[d] || {})[id]; return !!v && v !== 'r'; };
const missedOn = (d) => Object.entries((M.missed || {})[d] || {}).filter(([id, v]) => I(id) && v !== 'r' && I(id).type !== 'step').map(([id]) => id); // parts a ticked routine missed ('r') count in the routine, not on their own
function dropMissed(out, d) { out.forEach((x) => { x.items = x.items.filter((id) => !isMissed(id, d)); if (x.appts) x.appts = x.appts.filter((id) => !isMissed(id, d)); }); return out; }
// Move an item to place idx of block b on one day only (repeats and routines). One-off tasks move for good.
function seqOf(day, b, excl) { return placeDay(day).filter((o) => o.blk === b && I(o.id).type !== 'checkin' && o.id !== excl).sort((p, q) => p.a - q.a).map((o) => o.id); }
function moveOnDay(id, day, b, idx) {
  M.dayMove = M.dayMove || {}; M.dayOrder = M.dayOrder || {};
  const list = seqOf(day, b, id);
  list.splice(Math.max(0, Math.min(idx, list.length)), 0, id);
  (M.dayOrder[day] = M.dayOrder[day] || {})[b] = list;
  const mv = M.dayMove[day] = M.dayMove[day] || {};
  const home = placements(id).find((p) => G(p) && G(p).style === 'dayblock');
  if (home === b) delete mv[id]; else mv[id] = b;
}
// After a move made for every day, put the item at the same place in every day that has its own order.
function syncDayOrders(id) {
  Object.values(M.dayMove || {}).forEach((o) => { delete o[id]; });
  const home = placements(id).find((p) => G(p) && G(p).style === 'dayblock');
  Object.values(M.dayOrder || {}).forEach((o) => Object.entries(o).forEach(([b, l]) => {
    const i = l.indexOf(id); if (i >= 0) l.splice(i, 1);
    if (b !== home) return; const ks = G(b).kids; const at = ks.indexOf(id);
    // keep it just before the item that now follows it (or just after the one before it)
    let j = at + 1; while (j < ks.length && !l.includes(ks[j])) j++;
    if (j < ks.length) { l.splice(l.indexOf(ks[j]), 0, id); return; }
    j = at - 1; while (j >= 0 && !l.includes(ks[j])) j--;
    l.splice(j >= 0 ? l.indexOf(ks[j]) + 1 : l.length, 0, id);
  }));
}
function allAppts() { return G('g-appts').kids.flatMap((c) => (G(c) ? G(c).kids.map((id) => ({ id, cat: c })) : [])).filter((x) => I(x.id)); }
// An appointment happens on its date, and again every n days, weeks or months when it repeats.
function occurs(id, d) { const it = I(id); if (!it || !it.date) return false; if (it.date === d) return true; if (d < it.date) return false;
  // the same Frequency rules as tasks (2026-11-04), counted from the appointment's date
  const w = it.when; if (w && w.mode && w.mode !== 'once') { const n = Math.max(1, w.n || 1), a = parse(it.date), b = parse(d);
    if (w.mode === 'days') return (w.days || []).includes(wd(d)) && (n === 1 || Math.round(diff(weekStart(it.date), weekStart(d)) / 7) % n === 0);
    if (w.mode === 'month') { const m = (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth(); return sameDom(a, b) && m % n === 0; }
    if (w.mode === 'year') return sameDom(a, b) && a.getMonth() === b.getMonth() && (b.getFullYear() - a.getFullYear()) % n === 0;
    if (w.mode === 'every') { const last = lastDoneBefore(id, d) || it.date; return diff(last, d) > 0 && diff(last, d) % n === 0 && (last !== it.date || true); }
    return false; }
  const r = it.rep; if (!r) return false;
  const n = Math.max(1, r.n || 1);
  if (r.unit === 'day') return diff(it.date, d) % n === 0;
  if (r.unit === 'week') return diff(it.date, d) % (7 * n) === 0;
  if (r.unit === 'month') { const a = parse(it.date), b = parse(d); const m = (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth(); return sameDom(a, b) && m % n === 0; }
  return false; }
function nextOcc(id, from) { for (let k = 0; k < 400; k++) { const d = addDays(from, k); if (occurs(id, d)) return d; } return null; }
const apRepText = (it) => it.when && it.when.mode !== 'once' ? whenText(Object.assign({}, it, { when: Object.assign({}, it.when, { date: it.date }) })) : repText(it.rep);
function repText(r) { if (!r) return ''; const n = Math.max(1, r.n || 1); const u = { day: 'day', week: 'week', month: 'month' }[r.unit]; return n === 1 ? 'Every ' + u : 'Every ' + n + ' ' + u + 's'; }
function apptsOn(d) { return allAppts().filter((x) => occurs(x.id, d)).map((x) => x.id).sort((a, b) => (hm(I(a).time) || 0) - (hm(I(b).time) || 0)); }
const catOf = (id) => G('g-appts').kids.find((c) => G(c) && G(c).kids.includes(id));

// ---------- saving ----------
let db = null, docRef = null, saveT = null;
function gc() {
  const used = new Set(); Object.values(M.groups).forEach((g) => g.kids.forEach((k) => used.add(k)));
  Object.values(M.items).forEach((r) => (r.steps || []).forEach((s) => used.add(s)));
  for (const id of Object.keys(M.items)) if (!used.has(id)) delete M.items[id];
  for (const id of Object.keys(M.groups)) if (!used.has(id) && !['g-blocks', 'g-appts', 'g-health', 'g-train', 'hg-aches', 'g-hobbies', 'g-bad'].concat(VGROUPS).includes(id)) delete M.groups[id];
}
function save() { gc(); histNote(); clearTimeout(saveT); saveT = setTimeout(async () => {
  try { localStorage.setItem('daybook3', JSON.stringify(M)); localStorage.setItem('daybook3-at', '1'); } catch (e) { try { localStorage.removeItem('daybook3'); } catch (_) {} }
  hostSave();
  if (docRef) { try { await docRef.set({ model: JSON.stringify(M), saved: Date.now() }); } catch (e) { flash('Could not save just now. It will try again.'); } }
}, 300); }
// undo and redo live in the ⋯ menu, not on a pop-up (2026-11-10): each named change keeps the state before it
const HIST = { past: [], fut: [] };
// Persistent (2026-11-11): a task that stays where it lives after a tick, with no repeat, like a hobby activity
const keeps = (k) => !!(I(k) && I(k).persist);
// Coupled items (2026-11-11): ticking one ticks the items it links to that day (a hike ticks Outdoors). Kept apart in the log as
// 'ln:<target>' = the item that ticked it, so unticking takes it off again, and a tick I made myself is never touched.
const linkDone = (id, d) => { const it = I(id); const v = hval(d, id); if (!it) return false; if (it.type === 'tracker') return v === 'yes' || v === 'faced' || (typeof v === 'number' && v > 0) || (Array.isArray(v) && v.length > 0); return isDone(id, d); };
const linkVal = (t) => { const it = I(t); return it.type === 'tracker' ? (it.scale === 'avoid' ? 'faced' : 'yes') : 'done'; };
const LINKABLE = (k) => { const it = I(k); return !!it && !it.brk && ((it.type === 'tracker' && (it.scale === 'yesno' || it.scale === 'avoid')) || it.type === 'task' || it.type === 'routine'); };
function linkPass(d) { const L0 = M.log[d] = M.log[d] || {};
  Object.keys(L0).filter((k) => k.startsWith('ln:')).forEach((k) => { const t = k.slice(3), src = L0[k]; if (!I(src) || !(I(src).links || []).includes(t) || !linkDone(src, d)) { delete L0[k]; delete L0[t]; } });
  Object.keys(M.items).forEach((id) => { const ls = I(id).links; if (!ls || !ls.length || !linkDone(id, d)) return; ls.forEach((t) => { if (!I(t) || t === id || L0[t] != null) return; L0[t] = linkVal(t); L0['ln:' + t] = id; }); });
  if (!Object.keys(L0).length) delete M.log[d]; }
function change(fn, msg, canUndo = true) { freezePast(); const before = JSON.stringify(M); if (HIST.last == null) HIST.last = before; HIST.t = 0; fn(); keepToday(); try { linkPass(T0); if (S.day && S.day < T0) linkPass(S.day); } catch (_) {} try { snapDay(T0); if (S.day && S.day < T0 && S.area === 'plan') snapDay(S.day); } catch (_) {} save(); HIST.t = 0; render(); } // no pop-up when I tick or save (2026-11-10); undo history is kept by save()
function dayTick() { const t = appDay(); if (t === T0) return; const old = T0; T0 = t; if (S.day === old) S.day = t; if (S.sday === old) S.sday = t; if (S.monthOf === old.slice(0, 7)) S.monthOf = t.slice(0, 7); S.dayComp = null; render(); }
setInterval(dayTick, 30000); document.addEventListener('visibilitychange', () => { if (!document.hidden) dayTick(); }); window.addEventListener('focus', dayTick);
// every change is a step (2026-11-12: undo several steps, then redo): save() compares with the last state it saw; changes
// close together (typing) make one step. Loading data starts the history afresh (HIST.last = null).
const histKey = (s) => { try { const o = JSON.parse(s); delete o.snap; delete o.rOpen; return JSON.stringify(o); } catch (e) { return s; } }; // what's only open or counted isn't a step
function histNote() { if (HIST.busy) return; const cur = JSON.stringify(M); if (HIST.last == null) { HIST.last = cur; HIST.lk = histKey(cur); return; } if (cur === HIST.last) return; const ck = histKey(cur); if (ck === HIST.lk) { HIST.last = cur; return; } HIST.lk = ck;
  const now = Date.now(); if (!(HIST.t && now - HIST.t < 1200 && HIST.past.length)) { HIST.past.push({ s: HIST.last }); if (HIST.past.length > 60) HIST.past.shift(); }
  HIST.t = now; HIST.fut = []; HIST.last = cur; }
function histStep(back) { histNote(); HIST.t = 0; const A = back ? HIST.past : HIST.fut, B = back ? HIST.fut : HIST.past; const e = A.pop(); if (!e) return; B.push({ s: JSON.stringify(M), msg: e.msg }); HIST.busy = true; M = JSON.parse(e.s); HIST.last = JSON.stringify(M); HIST.lk = histKey(HIST.last); save(); HIST.busy = false; render(); }
function flash(msg, undo) { clearTimeout(S.tt); S.toast = { msg, undo }; renderLayer(); S.tt = setTimeout(() => { S.toast = null; renderLayer(); }, undo ? 5000 : 2200); }

// ---------- render ----------
const ce = () => S.edit ? 'contenteditable="plaintext-only" spellcheck="false"' : '';
const nm = (ref, text) => S.edit ? `<span data-nm="${ref}" ${ce()}>${esc(text)}</span>` : esc(text);
const grip = (on = true) => S.edit && on ? `<span class="grip" aria-label="Drag to move">${icon('grip-vertical', 16)}</span>` : '';
const tail = (ref, list, opts = {}) => S.edit ? `${opts.gear === false ? '' : `<button class="gear" data-a="gear" data-ref="${ref}" aria-label="Settings">${icon('settings', 18)}</button>`}${opts.rm === false ? '' : `<button class="rm" data-a="rm" data-ref="${ref}" data-in="${list}" aria-label="Remove">✕</button>`}` : '';

function render() { WKC.clear(); bkDot(); setTimeout(navTrack, 0);
  try { localStorage.setItem('daybook3-open', JSON.stringify(S.open)); localStorage.setItem('daybook3-fold', JSON.stringify({ showDone: S.showDone, showMissed: S.showMissed, month: S.month, smonth: S.smonth, fmonth: S.fmonth, xmonth: S.xmonth })); } catch (e) {} // every open or closed section is remembered on this device (2026-11-06)
  const A = M.areas[S.area];
  const pg = A.pages.length ? M.pages[S.page] : null;
  $('#phone').classList.toggle('editing', S.edit);
  // writing a journal page hides the top and bottom bars (2026-11-06)
  $('#phone').classList.toggle('jwrite', S.area === 'notebook' && (S.nbView === 'jpage' || S.nbView === 'board') && !S.insOn);
  if (S.area === 'notebook' && S.nbView === 'jpage' && typeof jGrow === 'function') requestAnimationFrame(jGrow);
  $('#phone').classList.toggle('bview', S.area === 'notebook' && S.nbView === 'board' && !S.insOn);
  $('#ttl').innerHTML = pg ? (S.edit ? `<span data-nm="p:${S.page}" ${ce()}>${esc(pg.name)}</span>` : esc(pg.name)) : esc(A.name);
  $('#editbar').innerHTML = S.edit ? `<div class="editbar" role="status"><span>Editing</span></div>` : '';
  // in edit mode Done takes the place of the + (2026-11-04)
  { const db = $('#donebtn'); if (db) db.hidden = !S.edit; }
  $('#rail').innerHTML = A.pages.length ? `<nav role="tablist" aria-label="${esc(A.name)} pages">${A.pages.map((p) => `<button role="tab" data-page="${p}" aria-selected="${p === S.page}" style="${p === S.page ? 'background:' + M.pages[p].color + '2E' : ''}"><span class="dot" style="background:${M.pages[p].color}" ${S.edit ? `data-col="p:${p}" role="button" aria-label="Change colour of ${esc(M.pages[p].name)}"` : ''}></span><span class="vl">${esc(M.pages[p].name)}</span></button>`).join('')}</nav>` : '';
  if (S.area === 'hobbies' && !S.insOn) $('#rail').innerHTML = hobRail();
  $('#rail').hidden = (!A.pages.length && S.area !== 'hobbies') || !!S.insOn;
  $('#areas').innerHTML = M.areaOrder.map((a) => { const x = M.areas[a]; const on = a === S.area;
    return `<button data-area="${a}" aria-label="${esc(x.name)}" ${on ? 'aria-current="page"' : ''} style="color:${on ? x.color : '#857E73'}"><span class="pill" style="background:${on ? x.color + '38' : 'transparent'}" ${S.edit && on ? `data-ic="a:${a}"` : ''}>${icon(x.icon, 24, on ? 2 : 1.6)}</span></button>`; }).join('');
  const v = $('#view'); v.classList.toggle('ptoday', S.area === 'plan' && S.page === 'today'); v.classList.toggle('pplan', S.area === 'plan' && S.page === 'plan');
  if (S.studyMode) $('#areas').innerHTML = studyBar();
  $('#areas').classList.toggle('two', !!S.studyMode);
  if (S.insOn) { v.innerHTML = renderInsight(); $('#ttl').innerHTML = insTitle(); } // Insight from the ⋯ menu covers the area until I tap an area
  else if (A.nav === 'verdict') { v.innerHTML = renderVerdict(); $('#ttl').innerHTML = vTitle(); }
  else if (S.area === 'hobbies') { v.innerHTML = renderHobbies(); $('#ttl').innerHTML = hobTitle(); }
  else if (S.area === 'notebook') { v.innerHTML = renderNotebook(); $('#ttl').innerHTML = esc(nbTitle()); requestAnimationFrame(jGrow); bMaps(); }
  else if (!A.pages.length) v.innerHTML = `<div class="soon">${esc(A.name)} is rebuilt on the new building blocks after the Planner.<br>The old version stays at its own link until then.</div>`;
  else if (S.page === 'today') { v.innerHTML = renderToday(); if (S.day < T0) { requestAnimationFrame(jMinis); bMaps(); } }
  else if (S.page === 'schedule') { v.innerHTML = renderSchedule(); const c0 = v.querySelector('.tl .col'); const w = c0 ? Math.round(c0.offsetWidth) : 0; if (S.sview === 'week' && w && w !== S.colW) { S.colW = w; v.innerHTML = renderSchedule(); } }
  else if (S.page === 'plan') v.innerHTML = renderPlan();
  else if (S.page === 'health') v.innerHTML = renderHealth();
  else if (S.page === 'food') v.innerHTML = diarySheet();
  else if (S.page === 'insight') { v.innerHTML = renderInsight(); if (!S.edit) $('#ttl').innerHTML = insTitle(); }
  else if (S.page === 'training') v.innerHTML = renderTraining();
  else if (S.page === 'expeds') v.innerHTML = renderExpeds();
  else if (S.page === 'rem') v.innerHTML = renderRem();
  else v.innerHTML = renderAppts();
  renderLayer();
  if (typeof snapBars === 'function') snapBars();
}

// Today: calendar strip, then the picked day's blocks
function dayCell(d, inMonth = true, c = 't') {
  const s = M.snap[d]; const selD = c === 's' ? (S.sview === 'day' ? S.sday : null) : c === 'f' ? (S.fday || T0) : c === 'x' ? (S.xday || T0) : S.day; const bd = (c === 't' || c === 's') && d <= T0 && isBad(d) && (d < T0 || !!(s && s.bdue > 0 && s.bdone >= s.bdue)); // bad days: their own mark, or a small dot when not all done (2026-11-08)
  const star = c === 'x' ? false : c === 'f' ? trainStar(d) : bd ? !!(s && s.bdue > 0 && s.bdone >= s.bdue) : d <= T0 && !(d === T0 && isBad(d)) && s && s.due > 0 && s.done >= s.due;
  const ck = c === 's' ? 'sched' : c === 'f' ? 'train' : 'plan'; // what shows is set in edit mode › Calendars
  const aw = c === 'x' ? tripsOn(d)[0] || null : awayOf(ck, d); // the Expeditions calendar always shows its trips (2026-11-06)
  return `<button class="day fday ${d === selD ? 'sel' : ''} ${d === T0 ? 'today' : ''} ${inMonth ? '' : 'out'}${awayCls(aw, d)}" data-a="pickday" data-c="${c}" data-v="${d}" aria-label="${fmtDate(d)}${aw ? ', away: ' + esc(aw.name) : star ? ', all done' : ''}">
    ${aw || c === 'x' ? '' : calLines(ck, d) + calDotsHtml(ck, d)}
    <span class="n">${star && !aw ? markSvg(c === 'f' ? 'train' : bd ? 'bad' : 'plan', null, 'star') : bd && !aw ? `<i class="badot" style="background:${starCol('bad')}"></i>` : ''}${parse(d).getDate()}</span></button>`;
}
function renderCal(c = 't') {
  let weeks; const mon = c === 's' ? S.smonth : c === 'f' || c === 'x' ? S[c + 'month'] : S.month, monthOf = c === 's' ? S.smonthOf : c === 'f' || c === 'x' ? (S[c + 'monthOf'] || T0.slice(0, 7)) : S.monthOf, anchor = c === 's' ? S.sday : c === 'f' || c === 'x' ? (S[c + 'day'] || T0) : S.day;
  if (mon) { const [y, m] = monthOf.split('-').map(Number); const first = iso(new Date(y, m - 1, 1)); let w = weekStart(first); weeks = [];
    while (w.slice(0, 7) <= monthOf || weeks.length === 0) { weeks.push(w); w = addDays(w, 7); if (w.slice(0, 7) > monthOf) break; } }
  else weeks = [weekStart(anchor)];
  const selW = c === 's' && S.sview === 'week' ? weekStart(S.sday) : null;
  return `<div class="stack calblk" style="gap:6px">
    ${mon ? `<div class="calnav"><button data-a="month" data-c="${c}" data-v="-1" aria-label="Previous month">‹</button><span>${MONTHS[+monthOf.slice(5) - 1]} ${monthOf.slice(0, 4)}</span><button data-a="month" data-c="${c}" data-v="1" aria-label="Next month">›</button></div>` : ''}
    <div><div class="wk wkh"><span style="text-align:left">W</span>${WD.map((x) => `<span>${x.toUpperCase()}</span>`).join('')}</div>
    ${weeks.map((w) => `<div class="wk wkr">${c === 's' ? `<button class="wkn ${w === selW ? 'sel' : ''}" data-a="pickweek" data-v="${w}" aria-label="Show week ${isoWeek(w)}" aria-pressed="${w === selW}">${isoWeek(w)}</button>` : `<span class="wkn">${isoWeek(w)}</span>`}${[0, 1, 2, 3, 4, 5, 6].map((i) => dayCell(addDays(w, i), !mon || addDays(w, i).slice(0, 7) === monthOf, c)).join('')}</div>`).join('')}</div>
    <button class="toggle-cal" data-a="calmode" data-c="${c}" aria-label="${mon ? 'Show one week' : 'Show the month'}" aria-expanded="${mon}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(${mon ? 180 : 0}deg)" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button></div>`;
}
function tickCircle(id, d, live) {
  const st = val(d, id); const done = isDone(id, d); const much = typeof st === 'string' && st.startsWith('much');
  const c = colorOf(id);
  const inner = much ? '' : done ? '✓' : '';
  const circ = `<span class="circ ${much ? 'much' : done ? 'done' : d === T0 && halfOf(id) ? 'half' : ''}" style="--c:${c}" ${S.edit ? `data-col="${id}" role="button" aria-label="Change colour"` : 'aria-hidden="true"'}>${inner}</span>`;
  if (!live || S.edit) return S.edit ? circ : `<span class="tickbtn">${circ}</span>`;
  return `<button class="tickbtn" data-a="tick" data-ref="${id}" aria-label="Tick ${esc(I(id).name)}">${circ}</button>`;
}
// A check-in is a step of its routine (2026-11-02): morning check-in in Morning routine, evening in Evening routine.
// Its circle shows if it's done; tapping the row opens the check-in.
function ciStepRow(s, rid, d, live) {
  const on = !!val(d, s); const circ = `<span class="circ ${on ? 'done' : ''}" style="--c:${colorOf(rid)}">${on ? '✓' : ''}</span>`;
  return `<div class="row" data-ref="${s}">${grip()}${live && !S.edit ? `<button class="tickbtn" style="width:18px;height:40px" data-a="checkin" data-ref="${s}" aria-label="Open ${esc(I(s).name)}">${circ}</button><button class="lbl" data-a="checkin" data-ref="${s}" style="display:flex;align-items:center;text-align:left"><span style="flex:1">${esc(I(s).name)}</span><span class="chev" aria-hidden="true">›</span></button>` : `${circ}<span class="lbl">${nm(s, I(s).name)}</span>`}${tail(s, 's:' + rid, { gear: false })}</div>`;
}
// A routine opens by itself once it's due today (its start time on Schedule has come) and stays open until closed.
// Opening or closing by hand is kept for that day, also after a reload (2026-11-03).
// the small mark for an optional item; its icon is mine to pick in edit mode
const optMark = () => S.edit ? `<span class="optic" data-a="iconfor" data-v="ui:optional" role="button" aria-label="Optional. Change this icon">${icon(uiIc('optional', 'circle-dashed'), 14)}</span>` : `<span class="optic" role="img" aria-label="Optional">${icon(uiIc('optional', 'circle-dashed'), 14)}</span>`;
const stepNote = (s, rid) => { const x = pOpt(rid, s); const W = { rest: 'Days without a workout', train: 'Days with a workout', days: (x.days || []).slice().sort().map((k) => WD[k]).join(', ') }; return [x.optional ? 'Optional' : '', W[x.only] || ''].filter(Boolean).join(' · '); };
function routineOpen(id, d) {
  const set = ((M.rOpen || {})[d] || {})[id]; if (set !== undefined) return set;
  if (d !== T0 || isDone(id, d)) return false;
  const p = placeDay(T0).find((o) => o.id === id); const n = new Date(); return !!p && p.a <= n.getHours() * 60 + n.getMinutes();
}
// an item's length, shown next to its name on Today in the study/home mono font (2026-11-04)
// without a length of its own an item counts as 30 min (2026-11-04)
// Today shows no item lengths (2026-11-04): only the block totals and the Study session; kept as a hook in case they come back
const tdur = (it) => '';
// appointments run from one time to another, 12:00–15:00 (2026-11-12); the length is kept as dur
const apEnd = (it) => it.time && it.dur ? fmtHM((hm(it.time) + it.dur) % 1440) : '';
const apTime = (it) => it.time ? it.time + (apEnd(it) ? '–' + apEnd(it) : '') : '';
function whereOf(id) { const it = I(id); const src = it && it.part && I(it.part) ? it.part : id; const r = placements(src).find((p) => G(p) && G(p).style === 'room'); if (r) return G(r).name;
  if (typeof subjIds === 'function') { const sj = subjIds().find((s) => sIds(s).includes(src)); if (sj) return G(sj).name; } return ''; }
function itemRow(id, list, d) {
  const it = I(id); const live = d === T0;
  if (it.type === 'slot') return `<div class="row" data-ref="${id}">${grip()}${tickCircle(id, d, false)}<span class="lbl">${S.edit ? nm(id, it.name) : `<button data-a="${live ? 'slot' : 'peek'}" data-ref="${id}" data-d="${d}" style="width:100%;text-align:left;display:flex;align-items:center;gap:8px"><span style="flex:1">${esc(it.name)}${live && it.opens === 'study' && supMin(T0) < sessLen() ? `<span class="tdur">${estHM(minOn(null, T0) / 60)} of ${estHM(sessLen() / 60)}</span>` : ''}${live && slotSub(it) ? `<span class="sub">${esc(slotSub(it))}</span>` : ''}</span>${live ? '<span class="chev" aria-hidden="true">›</span>' : ''}</button>`}</span>${tail(id, list)}</div>`;
  // a break looks like a day block's title (2026-11-11): its icon, its name in small capitals, its length on the right
  if (it.brk) { const bi = icon(it.icon || 'coffee', 16); const ln = `${it.time ? esc(it.time) + ' · ' : ''}${estHM((it.dur || 15) / 60)}`;
    // outside edit mode it's a minimal title like the block titles on Schedule (2026-11-11): dashed lines, small capitals
    if (!S.edit) return `<div class="row brkrow brkmin" data-ref="${id}"><button class="brkt" data-a="${live ? 'open' : 'peek'}" data-ref="${id}" data-d="${d}" aria-label="${esc(it.name)}, a break, ${ln}"><span class="bkt"><span>${esc(it.name)} · ${ln}</span></span></button></div>`;
    return `<div class="row brkrow" data-ref="${id}">${grip()}<button class="bico" data-a="iconfor" data-v="${id}" aria-label="Change icon">${bi}</button><span class="nm mono" style="flex:1">${nm(id, it.name)}</span><span class="cnt">${ln}</span>${tail(id, list)}</div>`; }
  if (it.type === 'checkin') return `<div class="row" data-ref="${id}" data-fixed="1">${S.edit ? '<span class="grip"></span>' : ''}${tickCircle(id, d, live)}<button class="lbl" data-a="checkin" data-ref="${id}">${nm(id, it.name)}</button><span class="chev">›</span></div>`;
  const much = String(val(d, id) || '').startsWith('much');
  const late = live ? lateBy(id) : 0;
  const sub0 = much ? 'Too much' + (val(d, id) === 'much:hyper' ? ' · hyperfixation' : val(d, id) === 'much:inert' ? ' · inertia' : '') : late ? (late === 1 ? '1 day late' : late + ' days late') : '';
  // Today keeps to names (2026-11-11: no grey text about how an item is set up); an optional item gets a small icon instead
  const onToday = S.area === 'plan' && S.page === 'today'; const sub = onToday ? '' : [whereOf(id), it.optional ? 'Optional' : '', sub0].filter(Boolean).join(' · '); // a chore shows its room, a study task its subject
  if (it.type === 'routine') {
    const open = S.edit || routineOpen(id, d); const steps = S.edit ? rStepsAll(id) : rSteps(id, d);
    return `<div data-ref="${id}"><div class="row">${grip()}${tickCircle(id, d, live)}
      <button class="lbl" data-a="ropen" data-ref="${id}" aria-expanded="${!!open}" style="display:flex;align-items:center;gap:10px">${S.edit ? `<span style="flex:1">${nm(id, it.name)}${it.optional ? optMark() : ''}</span>` : `<span style="flex:1">${esc(it.name)}${it.optional ? optMark() : ''}${tdur(it)}</span>`}${S.edit ? '' : `${fold(open)}`}</button>${tail(id, list)}</div>
      ${open ? `<div class="steps" data-list="s:${id}">${steps.map((s) => I(s).type === 'checkin' ? ciStepRow(s, id, d, live) : `<div class="row" data-ref="${s}">${grip()}${live && !S.edit ? `<button class="tickbtn" style="width:18px;height:40px" data-a="step" data-ref="${s}" aria-label="Tick ${esc(I(s).name)}"><span class="circ ${val(d, s) ? 'done' : ''}" style="--c:${colorOf(id)}">${val(d, s) ? '✓' : ''}</span></button>` : `<span class="circ ${val(d, s) ? 'done' : ''}" style="--c:${colorOf(id)}">${val(d, s) ? '✓' : ''}</span>`}<span class="lbl">${nm(s, I(s).name)}${pOpt(id, s).optional ? optMark() : ''}${S.edit && stepNote(s, id) && !(S.area === 'plan' && S.page === 'today') ? `<span class="sub">${esc(stepNote(s, id))}</span>` : ''}</span>${tail(s, 's:' + id, { gear: false })}</div>`).join('')}
        ${S.edit ? `<button class="addrow" data-a="addstep" data-ref="${id}"><span class="plus">+</span>Add step</button>` : ''}</div>` : ''}</div>`;
  }
  return `<div class="row" data-ref="${id}">${grip()}${tickCircle(id, d, live)}<span class="lbl">${S.edit ? nm(id, it.name) + (onToday && it.optional ? optMark() : '') : `<button data-a="${live ? 'sched' : 'peek'}" data-ref="${id}" data-d="${d}" style="width:100%;text-align:left">${esc(it.name)}${onToday && it.optional ? optMark() : ''}${tdur(it)}</button>`}${sub ? `<span class="sub">${esc(sub)}</span>` : ''}</span>${tail(id, list)}</div>`; // estimate on the right (2026-11-04)
}
// A past day is an overview of everything ticked, logged and added that day (2026-11-08), not the old list.
function pastDay(d) {
  // just text: a compact list under small headings, no cards, circles, chips or pictures (2026-11-08)
  const lg = M.log[d] || {}; const day = (t) => { const x = new Date(t); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
  const ln = (name, sub = '', right = '', a = '', c = '') => `<${a ? 'button' : 'div'} class="pdl" ${a}>${c ? `<span class="pdot" style="background:${c}"></span>` : ''}<span class="pdn">${esc(name)}</span>${sub ? `<span class="sub">${esc(sub)}</span>` : ''}${right ? `<span class="pdv">${esc(right)}</span>` : ''}</${a ? 'button' : 'div'}>`;
  const secs = []; const sec = (t, lines) => { if (lines.length) secs.push(`<div class="pdh mono">${esc(t)}</div>${lines.join('')}`); };
  const isTick = (v) => typeof v === 'string' && (v === 'done' || v.startsWith('done@') || v.startsWith('much'));
  const tk = Object.keys(lg).filter((id) => I(id) && ['task', 'routine', 'checkin', 'appt', 'slot'].includes(I(id).type) && isTick(lg[id]));
  Object.keys(M.items).filter((id) => I(id).type === 'routine' && !tk.includes(id) && (I(id).steps || []).some((st) => isTick(lg[st]))).forEach((id) => tk.push(id));
  const sub = (id) => { const it = I(id); if (it.type === 'routine') { const st = rSteps(id, d); const dn = st.filter((x) => isTick(lg[x])); return st.length ? dn.length + ' of ' + st.length : ''; }
    if (String(lg[id]).startsWith('done@')) return lg[id].slice(5); if (String(lg[id]).startsWith('much')) return 'Too much'; return ''; }; // grey text only for values (2026-11-08)
  // routines sit with tasks; a check-in that's a step of its routine shows only as part of it (2026-11-08)
  const inRout = (id) => Object.values(M.items).some((x) => x.type === 'routine' && (x.steps || []).includes(id));
  const kindOf = (id) => { const it = I(id); if (it.type === 'appt') return 'appt'; if (it.type === 'checkin') return inRout(id) ? 'none' : 'task'; if (it.type === 'routine') return 'task';
    const st = placements(id).map((x) => G(x)).filter(Boolean).map((g) => g.style); const ps = placements(id);
    if (st.includes('sgroup')) return 'study'; if (st.includes('tcat')) return 'train'; if (st.includes('hobby') || st.includes('project')) return 'hob';
    if (st.includes('room') || ps.some((x) => ['g-oneoff', 'g-tend', 'g-prep'].includes(x))) return 'home'; return 'task'; };
  const tl = (id, right = '') => ln(I(id).name, sub(id), right, `data-a="peek" data-ref="${id}" data-d="${d}"`, colorOf(id));
  const sm = {}; ((M.study || {})[d] || []).forEach((x) => { sm[x.id] = (sm[x.id] || 0) + (+x.min || 0); }); const sup = (M.support || {})[d];
  const mins = (m) => ((m >= 60 ? Math.floor(m / 60) + 'H ' : '') + (m % 60 ? (m % 60) + 'M' : m >= 60 ? '' : '0M')).trim();
  // missed = planned that day and not done; greyed in their own category (2026-11-08)
  const mi = missedOn(d);
  dayList(d).forEach((x) => x.items.concat(x.appts || []).forEach((id) => { const it = I(id); if (it && !['checkin', 'slot'].includes(it.type) && !isDone(id, d) && !mi.includes(id) && !tk.includes(id)) mi.push(id); }));
  const ml0 = (id) => ln(I(id).name, '', '', `data-a="peek" data-ref="${id}" data-d="${d}"`, colorOf(id)).replace('class="pdl"', 'class="pdl pdmiss"');
  [['task', 'Tasks'], ['appt', 'Appointments'], ['home', 'Home'], ['study', 'Study'], ['train', 'Training'], ['hob', 'Hobbies']].forEach(([k, t]) => {
    const ids = tk.filter((id) => kindOf(id) === k); let L = ids.map((id) => tl(id, k === 'study' && sm[id] ? mins(sm[id]) : ''));
    const mk = mi.filter((id) => kindOf(id) === k);
    if (k === 'study') L = L.concat(Object.entries(sm).filter(([id]) => !ids.includes(id)).map(([id, m]) => ln(I(id) ? I(id).name : 'Study', '', mins(m), '', I(id) ? colorOf(id) : M.areas.study.color)), sup && sup.min ? [ln('Study support', '', mins(Math.round(sup.min)), '', M.areas.study.color)] : []);
    sec(t, L.concat(mk.map(ml0))); });
  const fk = (G(foodGroup()) || { kids: [] }).kids; // nutrition answers go with the food diary
  const tv = Object.keys(lg).filter((id) => I(id) && I(id).type === 'tracker' && lg[id] != null && lg[id] !== '' && !fk.includes(id));
  const lev = (id) => { const it = I(id), v = lg[id]; if (Array.isArray(v)) return v.join(', '); if (it.scale === 'yesno') return ''; if (it.scale === 'avoid') return cap(String(v)); const sc = SCALES[it.scale]; return sc && sc[+v - 1] ? cap(sc[+v - 1]) : String(v); };
  const yes = tv.filter((id) => I(id).scale === 'yesno'); const hl = tv.filter((id) => I(id).scale !== 'yesno').map((id) => ln(I(id).name, lev(id), '', '', colorOf(id)));
  // tags in one sentence, split by dots (2026-11-08)
  if (yes.length) hl.push(`<div class="pdl"><span class="pdot" style="background:${colorOf(yes[0])}"></span><span class="pdn pdwrap">${yes.map((id) => esc(I(id).name)).join(' · ')}</span></div>`);
  sec('Health', hl);
  const fd = dayMeals(d); if (fd) sec('Food diary', [`<div class="pdfood">${fd}</div>`]);
  sec('Life', (M.events || []).filter((e) => e.day === d).map((e) => ln(e.text, '', '', '', '#9A9387')).concat((M.conds || []).filter((c) => c.start === d || c.end === d).map((c) => ln(c.name, c.start === d ? 'Condition started' : 'Condition ended', '', '', condCol()))));
  const KIND = { task: 'Task', routine: 'Routine', appt: 'Appointment', tracker: 'Tracker' };
  // added and written: real previews of notes, journal pages and boards (2026-11-08)
  const NT = (M.notes || []).filter((n) => n.upd && day(n.upd) === d), JJ = (M.journal || []).filter((j) => j.d === d && (j.text || (j.ims || []).length)), BB = (M.boards || []).filter((b) => b.upd && day(b.upd) === d);
  const AL = Object.keys(M.items).filter((id) => I(id).made === d && KIND[I(id).type] && !I(id).part && !I(id).sample).map((id) => ln(I(id).name, '', '', `data-a="peek" data-ref="${id}" data-d="${d}"`, colorOf(id)));
  if (NT.length) AL.push(`<div class="hscroll postrow pdprev">${NT.map(postit).join('')}</div>`);
  if (JJ.length) AL.push(`<div class="hscroll jrow pdprev">${JJ.map(jcard).join('').replace(/data-a="jopen"/g, 'data-a="pdjopen"')}</div>`);
  if (BB.length) AL.push(`<div class="hscroll brow pdprev">${BB.map(bCard).join('').replace(/data-a="bdopen"/g, 'data-a="pdbopen"')}</div>`);
  sec('Added and written', AL);
  // the feelings block on top, like on Health
  const fw = M.feel[d] || []; const fb = fw.length ? fieldBg(fw) : null;
  if (fw.length) secs.unshift(`<div class="feelcard pdfeel" style="${fb ? `background:${fb.old};background:${fb.ok}` : ''}"><span>${esc(fw.join(', '))}</span></div>`);
  return `<div class="pastday">${secs.join('') || '<p class="empty">Nothing logged that day.</p>'}</div>`;
}
// "New tag" and similar: a + chip that opens its text box on tap, never an always-open box (2026-11-08)
const addOpen = (id) => S.openAdd === id;
// the tags on an item or tracker (2026-11-08): tap to put on or take off, + New tag, Edit tags to rename or delete them
function tagField(D, act) {
  if (S.tagEdit) return `<div class="fld"><span class="mono">Tags</span>${Object.entries(M.tags).map(([t, n]) => `<div class="inrow" style="margin-bottom:6px"><input class="inp" data-tagname="${t}" value="${esc(n)}" aria-label="Tag name"><button class="hb" data-a="tagrm" data-v="${t}" aria-label="Delete the tag ${esc(n)}">${icon('x', 18)}</button></div>`).join('')}<div class="chips"><button class="chip" data-a="tagedit">${icon('check', 14)} Done</button></div></div>`;
  return `<div class="fld"><span class="mono">Tags</span><div class="chips">${Object.entries(M.tags).map(([t, n]) => `<button class="chip" data-a="${act}" data-v="${t}" aria-pressed="${(D.tags || []).includes(t)}">${esc(n)}</button>`).join('')}${addChip('newtag', 'New tag')}${Object.keys(M.tags).length ? `<button class="chip addchip" data-a="tagedit">${icon('pencil', 13)} Edit tags</button>` : ''}</div>${addOpen('newtag') ? `<div class="inrow"><input class="inp" id="newtag" placeholder="New tag"><button class="btn" data-a="dnewtag">Add</button></div>` : ''}</div>`; }
const tagNames = () => document.querySelectorAll('#layer [data-tagname]').forEach((el) => { const n = el.value.trim(); if (n) M.tags[el.dataset.tagname] = n; });
const addChip = (id, label) => addOpen(id) ? '' : `<button class="chip addchip" data-a="openadd" data-v="${id}"><span class="plus" aria-hidden="true">+</span>${esc(label)}</button>`;
// menu icons can be changed too: in edit mode the icon is its own button (2026-11-08)
const uiIc = (key, def) => ((M.settings || {}).uiIcons || {})[key] || def;
const mi = (key, def) => S.edit ? `<span class="miic" data-a="iconfor" data-v="ui:${key}" role="button" aria-label="Change this icon">${icon(uiIc(key, def), 18)}</span>` : icon(uiIc(key, def), 18);
// what a day had on it and how much got done, kept for the calendar's marks. Counted after every change, wherever I tick
// (a chore page, the + sheet, Studies), not only while Today is on screen, so yesterday's mark is always right (2026-11-10)
function snapDay(d, DL) { DL = DL || dayList(d); const opt = (id) => !!(I(id) && I(id).optional); let due = missedOn(d).filter((id) => !opt(id)).length, done = 0; DL.forEach((x) => x.items.concat(x.appts || []).forEach((id) => { if (I(id) && I(id).brk) return; const dn = I(id) && I(id).type === 'routine' ? isDone(id, d) && rComplete(id, d) : isDone(id, d); if (opt(id) && !dn) return; due++; if (dn) done++; })); /* an optional item only counts once it's done */ M.snap[d] = { due, done };
  // a bad day is finished when its own list and the day's appointments are done (2026-11-10: an empty Bad day list never finished)
  if (isBad(d)) { const bl = badList().concat(DL.flatMap((x) => x.appts || [])).filter((id, i, A) => A.indexOf(id) === i); Object.assign(M.snap[d], { bad: 1, bdue: bl.length, bdone: bl.filter((id) => isDone(id, d)).length }); }
  return M.snap[d]; }
function renderToday() {
  const d = S.edit ? T0 : S.day; const live = d === T0;
  const DL = dayList(d);
  if (live) { snapDay(T0, DL);
    // the day just got completed by a tick: confetti from that row, and the day's mark flies up to the calendar (2026-11-09)
    { const s0 = M.snap[T0]; const comp = s0.bad ? s0.bdue > 0 && s0.bdone >= s0.bdue : s0.due > 0 && s0.done >= s0.due; if (comp && S.dayComp === false && lastTick && Date.now() - lastTick.t < 2000) requestAnimationFrame(() => celebrate(s0.bad ? 'bad' : 'plan')); S.dayComp = comp; } }
  const bad = isBad(d) && d >= T0;
  const badCard = () => { const g = G('g-bad'); if (!g) return ''; const bl = badList(); const shownB = live && !S.edit ? bl.filter((id) => !isDone(id, d)) : bl;
    if (!S.edit && !shownB.length) return bl.length ? '' : `<p class="empty">Nothing on my bad day list yet.</p>`;
    return `<section class="card badcard" data-ref="g-bad"><div class="bhead">${S.edit ? `<span class="circ" style="--c:${g.color};width:14px;height:14px;background:${g.color}" data-col="g-bad" role="button" aria-label="Change colour"></span><button class="bico" data-a="iconfor" data-v="g-bad" aria-label="Change icon">${icon(g.icon || 'cloud', 16)}</button><span class="nm mono" style="font-size:11px;flex:1">${nm('g-bad', g.name)}</span>` : `<span class="bico" aria-hidden="true" style="color:${g.color}">${icon(g.icon || 'cloud', 16)}</span><span class="nm mono" style="flex:1">${esc(g.name)}</span>`}<span class="cnt">${bl.filter((id) => !isDone(id, d)).length} left</span></div>
      <div class="list" data-list="g-bad">${shownB.map((id) => itemRow(id, 'g-bad', d)).join('')}${S.edit ? `<button class="addrow" data-a="addtask" data-in="g-bad"><span class="plus">+</span>Add to ${esc(g.name)}</button>` : ''}</div></section>`; };
  let h = renderCal() + calEdit(); // the calendar stays in edit mode so calendar changes show live (2026-11-06)
  if (d > T0) h += `<div class="mono" style="margin:8px 2px">Coming up on ${fmtDate(d)}</div>`; // past days: the calendar shows the date (2026-11-08)
  if (d < T0 && !S.edit) return h + pastDay(d);
  const PD = placeDay(d); const at = {}; PD.forEach((o) => { at[o.id] = o.a; });
  const blocksH = DL.map(({ b, items, appts }) => {
    const g = G(b); const shown = live ? items.filter((id) => S.edit || !isDone(id, d)) : items;
    const apShown = live && !S.edit ? (appts || []).filter((id) => !isDone(id, d)) : (appts || []);
    if (!S.edit && !shown.length && !apShown.length) return '';
    const open = S.edit || S.open['b:' + b] !== false;
    const ap = appts || []; const total = items.length + ap.length, left = items.concat(ap).filter((id) => !isDone(id, d)).length;
    const apRow = (id) => `<div class="appt" data-appt="${id}" style="--c:${G(catOf(id)).color}">${tickCircle(id, d, live)}<button data-a="peek" data-ref="${id}" data-d="${d}" style="display:flex;align-items:center;gap:10px;flex:1;min-height:44px;text-align:left"><b>${esc(apTime(I(id)))}</b><span style="flex:1">${esc(I(id).name)}${tdur(I(id))}</span><span class="cnt">${live && I(id).time ? inTime(I(id).time) : ''}</span></button></div>`;
    const seq = apShown.map((id) => ({ id, ap: true })).concat(shown.map((id) => ({ id }))).map((x, k) => Object.assign(x, { k })).sort((p, q) => ((at[p.id] ?? 9999) - (at[q.id] ?? 9999)) || p.k - q.k);
    return `<section class="card" data-ref="${b}">
      <div class="bhead">${grip()}${S.edit ? `<span class="circ" style="--c:${g.color};width:14px;height:14px;background:${g.color}" data-col="${b}" role="button" aria-label="Change colour"></span><button class="bico" data-a="iconfor" data-v="${b}" aria-label="Change icon">${icon(g.icon || 'clock', 16)}</button><span class="nm mono" style="font-size:11px">${nm(b, g.name)}</span><span class="cnt">${g.start}–${g.end}</span>${tail(b, 'g-blocks')}`
        : `<button data-a="bopen" data-ref="${b}" aria-expanded="${open}" style="display:flex;align-items:center;gap:8px;width:100%;min-height:44px"><span class="bico" aria-hidden="true">${icon(g.icon || 'clock', 16)}</span><span class="nm mono" style="flex:1">${esc(g.name)}</span><span class="cnt">${estHM(PD.filter((o) => o.blk === b).reduce((t, o) => t + (o.b - o.a), 0) / 60)} of ${estHM((hm(g.end) - hm(g.start)) / 60)}</span>${fold(open)}</button>`}</div>
      ${open ? `<div class="list ${d < T0 ? 'pastday' : ''}" ${d < T0 ? '' : `data-list="${b}"`}>${seq.map((x) => x.ap ? apRow(x.id) : itemRow(x.id, b, d)).join('')}${S.edit ? `<button class="addrow" data-a="addtask" data-in="${b}"><span class="plus">+</span>Add to ${esc(g.name)}</button>` : ''}</div>` : ''}
    </section>`;
  }).join('');
  if (bad && !S.edit) h += `<div style="margin-top:6px">${badCard()}</div>`;
  h += `<div class="stack" ${d < T0 ? '' : 'data-list="g-blocks"'} style="margin-top:${S.edit ? 0 : 6}px">${blocksH || (bad && !S.edit ? '' : `<p class="empty">${live ? 'Nothing left for today.' : d < T0 ? 'Nothing was ticked that day.' : 'Nothing planned that day yet.'}</p>`)}</div>`;
  if (S.edit) h += `<div style="margin-top:10px">${badCard()}</div>`;
  // what was scheduled before I made it a bad day, in case I feel like doing more
  if (bad && !S.edit) { const mv = badMoved(d); if (mv.length) h += `<div class="donebox"><button class="donebtn" data-a="showmoved">${fold(S.showMoved)} Scheduled · ${mv.length} moved to the next normal day</button>
      ${S.showMoved ? `<div class="list">${mv.map((o) => itemRow(o.id, o.b, d)).join('')}</div>` : ''}</div>`; }
  if (S.edit) h += `<div style="margin-top:10px"><button class="addcard" data-a="addblock">+ Add day block</button></div>`;
  if (live && !S.edit) {
    const doneIds = DL.flatMap((x) => x.items.concat(x.appts || []).filter((id) => isDone(id, d)).map((id) => ({ id, b: x.b }))).concat(bad ? badList().filter((id) => isDone(id, d)).map((id) => ({ id, b: 'g-bad' })) : []);
    if (doneIds.length) h += `<div class="donebox"><button class="donebtn" data-a="showdone">${fold(S.showDone)} Done today · ${doneIds.length}</button>
      ${S.showDone ? doneIds.map(({ id }) => `<button class="drow" data-a="tick" data-ref="${id}" aria-label="${esc(I(id).name)}, done. Tap to change"><span class="circ ${String(val(d, id) || '').startsWith('much') ? 'much' : 'done'}">${String(val(d, id) || '').startsWith('much') ? '' : '✓'}</span><span>${esc(I(id).name)}${String(val(d, id) || '').startsWith('much') ? ' · too much' : ''}</span></button>`).join('') : ''}</div>`;
    const mis = missedOn(d);
    if (mis.length) h += `<div class="donebox"><button class="donebtn" data-a="showmissed">${fold(S.showMissed)} Missed · ${mis.length}</button>
      ${S.showMissed ? mis.map((id) => `<button class="drow" data-a="unmiss" data-ref="${id}" data-d="${d}" aria-label="${esc(I(id).name)}, missed. Tap to put it back"><span class="circ missed" aria-hidden="true">–</span><span style="flex:1">${esc(I(id).name)}</span><span class="cnt">Put back</span></button>`).join('') : ''}</div>`;
  }
  return h;
}
function inTime(t) { const now = new Date(); const m = hm(t) - (now.getHours() * 60 + now.getMinutes()); return m > 0 ? 'in ' + (m >= 60 ? Math.floor(m / 60) + ' h' : m + ' min') : m > -60 ? 'now' : ''; }

// Schedule: the week as a timeline; untimed items fill their block in list order.
const PX = 48; // per hour
// Past days are recorded as they were: once a day is over its layout is frozen, so later moves never change it.
// today's list is kept as it stands after every change, so once the day is over it shows what was really on it (2026-11-12)
function keepToday() { try { WKC.clear(); M.frozen = M.frozen || {}; M.frozen[T0] = placeDay(T0).map((o) => ({ id: o.id, a: o.a, b: o.b, blk: o.blk, appt: !!o.appt })); } catch (e) {} }
function freezePast() { M.frozen = M.frozen || {}; Object.keys(M.log).forEach((k) => { if (k < T0 && !M.frozen[k]) M.frozen[k] = placeDay(k).map((o) => ({ id: o.id, a: o.a, b: o.b, blk: o.blk, appt: !!o.appt })); }); }
const frozenOf = (d) => d < T0 && M.frozen && M.frozen[d] ? M.frozen[d].filter((o) => I(o.id)) : null;
// a day with real study tasks (or sessions) drops the generic Study session slot; real chores drop the Daily chore slot.
// Also used on frozen past days, so old snapshots follow the rule too (2026-11-06)
function slotDrop(out) {
  const all = out.flatMap((x) => x.items); const sids = typeof subjIds === 'function' ? new Set(subjIds().flatMap(sIds)) : new Set(); const cids = typeof choreIds === 'function' ? new Set(choreIds()) : new Set();
    const tids = typeof trainCats === 'function' ? new Set(trainCats().flatMap(kidsOf)) : new Set(); const hobOn = typeof hobArea === 'function' && all.some((id) => hobArea(id));
    const studyOn = all.some((id) => sids.has(id) || (I(id) && I(id).part && sids.has(I(id).part))), choreOn = all.some((id) => cids.has(id)), moveOn = all.some((id) => tids.has(id));
    if (studyOn || choreOn || moveOn || hobOn) out.forEach((x) => { x.items = x.items.filter((id) => !(I(id) && I(id).type === 'slot' && ((I(id).opens === 'study' && studyOn) || (I(id).opens === 'chores' && choreOn) || (I(id).opens === 'training' && moveOn) || (I(id).opens === 'hobbies' && hobOn)))); });
  return out; }
function placeDay(d) {
  const fz = frozenOf(d); if (fz) { const keep = new Set(slotDrop([{ items: fz.filter((o) => !o.appt).map((o) => o.id) }])[0].items); return fz.filter((o) => !isMissed(o.id, d) && (o.appt || keep.has(o.id))).map((o) => Object.assign({}, o)); }
  const out = []; const DL = dayList(d);
  // items with a set time (and appointments) are fixed for the whole day; untimed items flow around ALL of them, and a block
  // that spills over pushes the next block's untimed items later, so nothing hides behind anything (2026-11-02)
  const allFixed = []; DL.forEach(({ b, items, appts }) => { const g = G(b);
    items.filter((id) => I(id).time).forEach((id) => allFixed.push({ id, a: hm(I(id).time), b: hm(I(id).time) + (I(id).dur || 30), blk: b }));
    (appts || []).forEach((id) => allFixed.push({ id, a: hm(I(id).time || g.start), b: hm(I(id).time || g.start) + (I(id).dur || 30), appt: true, blk: b })); });
  // a block that runs over keeps its extra items: they spill past its end into a red stretch on Schedule (2026-11-02)
  DL.forEach(({ b, items, appts }) => {
    const g = G(b); let cur = hm(g.start);
    const fixed = allFixed.filter((f) => f.blk === b);
    allFixed.filter((f) => f.blk === b).forEach((f) => out.push(f));
    // a day's own order may say an item comes after an appointment: then it starts after that appointment ends
    // ... and the same after an item with a set time (2026-11-11), even when that leaves room in front of it
    const o = ((M.dayOrder || {})[d] || {})[b] || []; const after = {};
    fixed.forEach((f) => { const k = o.indexOf(f.id); if (k < 0) return; o.slice(k + 1).forEach((id) => { after[id] = Math.max(after[id] || 0, f.b); }); });
    // moved behind a set-time item for every day: it.behind names that item (a day's own order wins)
    items.forEach((id) => { const bh = I(id).behind; if (!bh || o.includes(id)) return; const f = fixed.find((q) => q.id === bh); if (f) after[id] = Math.max(after[id] || 0, f.b); });
    // tacked in front of a set-time item (2026-11-11): it ends right where that item starts, several in a row stack up
    // backwards; a day's own choice wins over the every-day one (it.before)
    const dt = (M.dayTack || {})[d] || {}; const tackOf = (id) => { const t = (id in dt ? dt[id] : I(id).before) || null; return t && I(t) ? t : null; }; // breaks too (2026-11-12), but only when dropped right at them (see the drop)
    const tacked = new Set(); const busy = fixed.slice();
    fixed.forEach((f) => { let end = f.a; items.filter((id) => !I(id).time && tackOf(id) === f.id).reverse().forEach((id) => { const len = I(id).dur || 30; if (end - len < hm(g.start)) return; /* no room before the block starts: it flows as usual */ const q = { id, a: end - len, b: end, blk: b }; out.push(q); busy.push(q); tacked.add(id); end -= len; }); });
    items.filter((id) => !I(id).time && !tacked.has(id)).forEach((id) => { const len = I(id).dur || 30; let moved = true; if (after[id]) cur = Math.max(cur, after[id]);
      while (moved) { moved = false; busy.forEach((f) => { if (cur < f.b && cur + len > f.a) { cur = f.b; moved = true; } }); }
      out.push({ id, a: cur, b: cur + len, blk: b }); cur += len; });
  });
  return out;
}
const dur = (m) => m < 60 ? m + ' min' : Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) : '');
// the default icon for a kind of task, changed in edit mode on its page (2026-11-11)
const DEFIC = { study: 'book-open', chores: 'spray-can', tend: 'sprout', prep: 'cooking-pot' };
const defKind = (id) => { const P = placements(id); return P.some((p) => G(p) && G(p).style === 'sgroup') ? 'study' : P.some((p) => p === 'g-oneoff' || (G(p) && G(p).style === 'room')) ? 'chores' : P.includes('g-tend') ? 'tend' : P.includes('g-prep') ? 'prep' : ''; };
const defIcon = (id) => { const it = I(id); const k = defKind(it && it.part && I(it.part) ? it.part : id); return k ? uiIc('def-' + k, DEFIC[k] || '') : ''; }; // the section's icon until I pick one (2026-11-11)
const defBlock = (k) => { const b = ((M.settings || {}).defBlock || {})[k]; return b && G(b) && blockIds().includes(b) ? b : k === 'study' ? studyBlock0() : eveBlock(); };
function boxIcon(o) { const it = I(o.id); return it.icon || (it.brk ? 'coffee' : '') || defIcon(o.id) || (o.appt ? G(catOf(o.id)).icon : it.type === 'checkin' ? (it.which === 'morning' ? 'sun' : 'moon') : it.type === 'routine' ? (hm(G(blockOfItem(o.id)).start) >= 18 * 60 ? 'moon' : 'sun') : 'check'); }
function renderSchedule() {
  const dayV = S.sview === 'day'; const w0 = weekStart(S.sday);
  const days = dayV ? [S.sday] : [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(w0, i));
  const B = blockIds().map(G); const h0 = Math.min(...B.map((g) => hm(g.start))) / 60 | 0; const h1 = Math.ceil(Math.max(...B.map((g) => hm(g.end))) / 60);
  const starts = blockIds().map((b) => hm(G(b).start)); const GAP = 16;
  const base = (m) => (m - h0 * 60) / 60 * PX + GAP * starts.filter((t) => t <= m).length;
  // overfull blocks stretch the timeline: each gets a red stretch after its end as tall as its biggest spill that week
  const PDs = days.map(placeDay); const ends = {}; blockIds().forEach((b) => { ends[b] = hm(G(b).end); });
  const OV = {}; blockIds().forEach((b) => { OV[b] = Math.max(0, ...PDs.flat().filter((o) => o.blk === b && !o.appt).map((o) => o.b - ends[b])); });
  const shiftBefore = (m, skip) => blockIds().filter((b) => b !== skip && ends[b] <= m).reduce((t, b) => t + OV[b] / 60 * PX, 0);
  const y = (m) => base(m) + shiftBefore(m);
  const yIn = (m, b) => b && m >= ends[b] ? base(ends[b] - 0.001) + shiftBefore(ends[b], b) + (m - ends[b]) / 60 * PX : base(m) + shiftBefore(m, b);
  const H = y(h1 * 60);
  const cols = `grid-template-columns:22px repeat(${days.length},minmax(0,1fr))`;
  let h = renderCal('s') + calEdit();
  h += `<div class="tl" style="height:${H}px;margin-top:4px;${cols}">`;
  for (let k = h0; k < h1; k++) h += `<div class="hr ${starts.includes(k * 60) ? 'bs' : ''}" style="top:${y(k * 60)}px"><span>${pad(k)}</span></div>`;
  // block lines, like the old Daybook: a dashed line at each block's start with its name (day view: time used of its length)
  const P = dayV ? placeDay(S.sday) : null;
  blockIds().forEach((b) => { const g = G(b); const len = hm(g.end) - hm(g.start);
    let lbl = esc(g.name), over = !dayV && OV[b] > 0; const overB = OV;
    if (dayV) { const used = P.filter((o) => o.blk === b && !o.appt).reduce((t, o) => t + (o.b - o.a), 0); over = used > len; lbl += ' · ' + dur(used) + ' of ' + dur(len) + (over ? ' · over by ' + dur(used - len) : ''); }
    // the block's border is a band: dashed top and bottom in one colour, name in between; it sits right under the
    // previous block's last box, so there's no stray gap (2026-11-02)
    h += `<div class="bl ${over ? 'over' : ''}" style="top:${y(hm(g.start)) - GAP}px;height:${GAP}px"><span>${lbl}</span></div>`;
    if (overB[b]) h += `<div class="ovz" style="top:${yIn(ends[b], b)}px;height:${overB[b] / 60 * PX}px"></div>`; });
  h += '<span></span>';
  // Week view (2026-11-02): the same item at the same time on neighbouring days joins into one block. Each day keeps
  // its own piece underneath, so a hold-drag outside edit mode still moves just that day (the piece comes loose).
  const PD = PDs; const clash = (k, o) => PD[k].some((p) => p.id !== o.id && p.blk === o.blk && p.a < o.b && p.b > o.a); // a day where it overlaps something else stays on its own
  // only joins pieces in the same block; a day moved to another block at the same clock time stays apart.
  // Past and done days still join; their pieces just fade, by colour instead of opacity so the seams don't show (2026-11-03)
  const same = (k, o) => k >= 0 && k < days.length && PD[k].some((p) => p.id === o.id && p.blk === o.blk && p.a === o.a && p.b === o.b) && !clash(k, o);
  // past days no longer fade; today gets a long card behind its column instead, like the selected day in the calendar (2026-11-04)
  // past days don't fade (2026-11-04); only done items do
  const faded = () => false; // nothing on the Schedule fades, not past days and not done items (2026-11-12)
  days.forEach((d, di) => {
    h += `<div class="col" data-day="${d}" style="height:${H}px">` + PD[di].map((o) => { const it = I(o.id); const c = o.appt ? G(catOf(o.id)).color : colorOf(o.id); const top0 = yIn(o.a, o.blk), flush = !o.appt && (OV[o.blk] ? o.b >= ends[o.blk] + OV[o.blk] : o.b >= ends[o.blk]); const top = it.brk ? top0 : top0 + 1, ht = Math.max(14, yIn(o.b - 0.01, o.blk) - top0 - (flush ? 1 : 2)); // 1px in from the lines above and below, so boxes sit evenly on the hour lines (2026-11-11) // the last box of a block (or of its red stretch) sits flush on the next block's border (2026-11-03/04)
      // a break fills its time exactly so its lines sit on the hour lines; a line that would double a block title's line is left out
      const bkE = !o.appt && it.brk ? [starts.includes(o.a) ? 'nt' : '', starts.includes(o.b) || o.b >= ends[o.blk] ? 'nb' : ''].join(' ') : '';
      const solo = dayV || clash(di, o); const jl = !solo && same(di - 1, o), jr = !solo && same(di + 1, o); let run = 1; if (!jl && !solo) while (same(di + run, o)) run++;
      let st = di; if (jl) while (same(st - 1, o)) st--; const rk = jl || jr ? o.id + '@' + days[st] : '';
      // a break is drawn like a block title (2026-11-11): dashed lines above and below, its name small in the middle
      const bk = !o.appt && it.brk; const fitsB = bk && (S.colW || 42) - 6 >= it.name.length * 6.2;
      const inner = bk ? (jl || run > 1 ? '' : `<span class="bkt">${dayV || fitsB ? `<span>${esc(it.name)}</span>` : ''}</span>`)
        : dayV ? `<span class="bi">${icon(boxIcon(o), 14, 2)}</span><span class="bn">${esc(it.name)}</span><span class="bt">${fmtHM(o.a)}</span>`
        : jl || run > 1 ? '' : (ht >= 14 ? icon(boxIcon(o), 12, 2) : '');
      // the joined block's label sits beside the boxes in the column (not inside a button), spanning the joined days
      // the name only shows when it fits the joined block; otherwise just the icon (2026-11-02)
      const fits = run * ((S.colW || 42) + 4) - 4 - 10 >= it.name.length * 6.3 + (ht >= 30 ? 0 : 18);
      // faded = past or done; drawn with paler solid colours, never see-through, so no lines show through (2026-11-03)
      const fd = faded(di, o); const allFaded = [...Array(run).keys()].every((r) => faded(di + r, o));
      const lab = bk && !dayV && !jl && run > 1 ? `<span class="blab bkl" data-run="${rk}" style="top:${top}px;height:${ht}px;width:calc(${run} * (100% + 4px) - 4px)" aria-hidden="true"><span class="bkt"><span>${esc(it.name)}</span></span></span>`
        : !dayV && !jl && run > 1 && ht >= 14 ? `<span class="blab ${ht >= 30 ? '' : 'brow'} ${!o.appt && o.b > ends[o.blk] ? 'spill' : ''}" data-run="${rk}" style="top:${top}px;height:${ht}px;width:calc(${run} * (100% + 4px) - 4px);color:${allFaded ? mix(mix(c, TH.ink, 0.35), TH.page, 0.5) : mix(c, TH.ink, 0.35)}" aria-hidden="true">${icon(boxIcon(o), 12, 2)}${fits ? `<span class="bn">${esc(it.name)}</span>` : ''}</span>` : '';
      const mv = !o.appt && !it.time && it.type !== 'checkin' && d >= T0;
      return `<button class="box ${dayV ? 'wide' : ''} ${mv ? 'mv' : ''} ${jl ? 'jl' : ''} ${jr ? 'jr' : ''} ${!o.appt && o.b > ends[o.blk] ? 'spill' : ''} ${fd ? 'fd' : ''}${!o.appt && I(o.id) && I(o.id).brk ? ' brk ' + bkE : ''}" style="top:${top}px;height:${!o.appt && it.brk ? Math.max(14, yIn(o.b, o.blk) - top) : ht}px;--c:${c};--bg:${fd ? mix(pale(c), TH.page, 0.5) : pale(c)};--deep:${fd ? mix(mix(c, TH.ink, 0.35), TH.page, 0.5) : mix(c, TH.ink, 0.35)}" data-a="peek" data-ref="${o.id}" data-d="${d}" ${rk ? `data-run="${rk}"` : ''} data-from="${o.a}" data-to="${o.b}" aria-label="${esc(it.name)}, ${fmtHM(o.a)}">${inner}</button>${lab}`; }).join('') + '</div>';
  });
  S.ymap = { y, h0, h1, zones: blockIds().filter((b) => OV[b]).map((b) => ({ b, top: yIn(ends[b], b), h: OV[b] / 60 * PX, e: ends[b], ov: OV[b] })) };
  h += '</div>';
  return h;
}

// Plan: every task by its rule. Same items as Today, just sorted differently.
function renderPlan() {
  const inPlan = (id) => placements(id).some((p) => p.startsWith('s:') || (G(p) && G(p).style === 'dayblock'));
  const F = S.planF || 'all';
  const tasks = Object.keys(M.items).filter((id) => ['task', 'routine'].includes(I(id).type) && !I(id).part && !placements(id).some((p) => G(p) && G(p).style === 'sgroup') /* Studies items live on Studies (2026-11-11) */ && !(typeof hobArea === 'function' && hobArea(id)) && (F === 'home' ? homeItem(id) : F === 'plan' ? inPlan(id) && !homeItem(id) : inPlan(id) || homeItem(id)));
  const brks = tasks.filter((id) => I(id).brk); tasks.splice(0, tasks.length, ...tasks.filter((id) => !I(id).brk));
  const nos = tasks.filter((id) => (I(id).when || {}).mode === 'once' && !I(id).when.date && !keeps(id) && !Object.keys(M.log).some((d) => val(d, id)));
  const per = tasks.filter((id) => keeps(id) && !repeatable(I(id)));
  const sch = tasks.filter((id) => (I(id).when || {}).mode === 'once' && I(id).when.date && (I(id).when.date >= T0 || onDay(id, T0))).sort((a, b) => I(a).when.date.localeCompare(I(b).when.date));
  const rep = tasks.filter((id) => repeatable(I(id)));
  const row = (id) => { const hm0 = homeItem(id); const ed = S.edit && !hm0; const blk = placements(id).find((p) => G(p) && G(p).style === 'dayblock');
    return `<div class="row" data-ref="${id}"><span class="circ" style="--c:${colorOf(id)}" ${ed ? `data-col="${id}" role="button" aria-label="Change colour"` : ''}></span><button class="lbl" data-a="${ed ? 'open' : 'sched'}" data-ref="${id}" style="text-align:left">${ed ? nm(id, I(id).name) : esc(I(id).name)}<span class="sub">${esc(whenText(I(id)))}</span></button>${ed ? tail(id, homeOf(id)) : ''}</div>`; };
  const sec = (title, ids, empty) => lcard('p:' + title, title, ids.length, ids.length ? ids.map(row).join('') : `<p class="empty">${empty}</p>`);
  const fOn = F !== 'all';
  // filter as a dropdown beside the first heading (2026-11-04), the same menu as Study's order
  const FO = [['all', 'All'], ['plan', 'Planner'], ['home', 'Home']];
  const fbar = `<span class="vsortw"><button class="fbtn" data-a="planfopen" aria-label="Filter" aria-haspopup="menu" aria-expanded="${!!S.planFOpen}" aria-pressed="${fOn || !!S.planFOpen}">${icon('sliders-horizontal', 18)}</button>${S.planFOpen ? `<span class="vsortx" data-a="planfopen"></span><span class="vdrop vsortm" role="menu"><span class="mono">Show</span>${FO.map(([k, l]) => `<button role="menuitemradio" data-a="planf" data-v="${k}" aria-checked="${F === k}" aria-current="${F === k}">${l}${F === k ? icon('check', 16, 2) : ''}</button>`).join('')}</span>` : ''}</span>`;
  // one row over the categories: Add (a dropdown) on the left, the filter on the right (2026-11-04)
  const AO = [['once', 'One-off task'], ['every', 'Repeat task'], ['routine', 'Routine'], ['break', 'Break']];
  // generic items (2026-11-11): they stand in on a day with nothing specific from their section, and open it to pick the real thing
  const GO = [['study', 'Studies'], ['chores', 'Chores'], ['hobbies', 'Hobbies'], ['training', 'Training']];
  const slots = Object.keys(M.items).filter((id) => I(id).type === 'slot' && placements(id).some((p) => G(p) && G(p).style === 'dayblock'));
  const slotRow = (id) => { const blk = placements(id).find((p) => G(p) && G(p).style === 'dayblock');
    return `<div class="row" data-ref="${id}"><span class="circ" style="--c:${colorOf(id)}" ${S.edit ? `data-col="${id}" role="button" aria-label="Change colour"` : ''}></span><span class="lbl">${nm(id, I(id).name)}<span class="sub">${esc(blk ? G(blk).name : '')}</span></span><span class="mono" style="font-size:10px;color:var(--quiet)">Optional</span><button class="swt" role="switch" aria-checked="${!!I(id).optional}" data-a="slotopt" data-ref="${id}" aria-label="${esc(I(id).name)} is optional"></button>${S.edit ? `<button class="rm" data-a="slotrm" data-ref="${id}" aria-label="Remove ${esc(I(id).name)}">✕</button>` : ''}</div>`; };
  const abar = `<span class="vsortw"><button class="fbtn" data-a="planaddopen" aria-label="Add" aria-haspopup="menu" aria-expanded="${!!S.planAddOpen}" aria-pressed="${!!S.planAddOpen}">${icon('plus', 18)}</button>${S.planAddOpen ? `<span class="vsortx" data-a="planaddopen"></span><span class="vdrop vsortm vaddm" role="menu">${AO.map(([k, l]) => `<button role="menuitem" data-a="new" data-v="${k}">${l}</button>`).join('')}<span class="mono">Generic</span>${GO.map(([k, l]) => `<button role="menuitem" data-a="slotadd" data-v="${k}">${l}</button>`).join('')}</span>` : ''}</span>`;
  if (S.open['p:Repeat'] === undefined) S.open['p:Repeat'] = false; // Repeat starts folded
  // an add icon on the left balances the filter icon (2026-11-08)
  return `<div class="ptools">${abar}${fbar}</div>` + sec('Not scheduled', nos, 'Nothing waiting. Tasks without a date land here.') + sec('Scheduled', sch, 'No dated tasks yet.') + sec('Repeat', rep, 'No repeat tasks yet.') + (per.length ? sec('Persistent', per, '') : '') + (brks.length ? sec('Breaks', brks, '') : '') + (slots.length ? lcard('p:Generic', 'Generic', slots.length, slots.map(slotRow).join('')) : '');
}

// Appointments: categories (Social is one of them), then Today / Coming up / Past.
function renderAppts() {
  const cats = G('g-appts').kids.filter(G);
  const chips = `<div class="chips" data-list="g-appts" style="margin-bottom:14px">${S.edit ? '' : `<button class="chip" data-a="cat" data-v="all" aria-pressed="${S.cat === 'all'}">All</button>`}${cats.map((c) => `<span class="chip" data-ref="${c}" ${S.edit ? '' : `role="button" data-a="cat" data-v="${c}" aria-pressed="${S.cat === c}"`} style="--c:${G(c).color}">${grip()}<span class="d" ${S.edit ? `data-col="${c}" role="button" aria-label="Change colour"` : ''}></span>${nm(c, G(c).name)}${S.edit ? `<button data-a="gear" data-ref="${c}" aria-label="Settings" style="display:grid;place-items:center">${icon('settings', 14)}</button><button data-a="rm" data-ref="${c}" data-in="g-appts" aria-label="Remove category" style="display:grid;place-items:center">${icon('x', 14)}</button>` : ''}</span>`).join('')}${S.edit ? `<button class="chip" data-a="addcat">+ Category</button>` : ''}</div>`;
  const all = allAppts().filter((x) => S.edit || S.cat === 'all' || x.cat === S.cat);
  all.forEach((x) => { x.on = occurs(x.id, T0) ? T0 : (I(x.id).rep || (I(x.id).when && I(x.id).when.mode !== 'once')) ? nextOcc(x.id, addDays(T0, 1)) : I(x.id).date; });
  const by = (a, b) => ((a.on || '') + (I(a.id).time || '')).localeCompare((b.on || '') + (I(b.id).time || ''));
  const today = all.filter((x) => x.on === T0).sort(by), coming = all.filter((x) => x.on && x.on > T0).sort(by), past = all.filter((x) => x.on && x.on < T0).sort(by).reverse().slice(0, 12);
  // the same rows as Plan; a filled dot with the category icon takes the place of the tick circle
  const row = (x, isPast) => { const it = I(x.id); const c = G(x.cat).color; const done = x.on === T0 && isDone(x.id, T0);
    return `<div class="row ${isPast || done ? 'past' : ''}" data-ref="${x.id}"><span class="adot" style="--c:${c}">${icon(it.icon || G(x.cat).icon || 'calendar', 13, 2.2)}</span><button class="lbl" data-a="${S.edit ? 'open' : 'peek'}" data-ref="${x.id}" data-d="${x.on}" style="text-align:left">${S.edit ? nm(x.id, it.name) : esc(it.name)}<span class="sub">${esc(relDay(x.on))}${it.time ? ' · ' + esc(apTime(it)) : ''}${done ? ' · done' : ''}${it.note ? ' · ' + esc(it.note) : ''}</span></button>${apRepText(it) ? `<span class="rep" title="${esc(apRepText(it))}" aria-label="${esc(apRepText(it))}">${icon('repeat', 12, 2)}</span>` : ''}${tail(x.id, x.cat)}</div>`; };
  const sec = (t, xs, p) => xs.length ? lcard('a:' + t, t, xs.length, xs.map((x) => row(x, p)).join('')) : '';
  // outside edit mode: the same row as Plan, Add (a dropdown of categories) on the left and the filter on the right (2026-11-04)
  const one = (c) => esc(G(c).name.replace(/s$/, ''));
  const dm = (open, act, head, opts) => open ? `<span class="vsortx" data-a="${act}"></span><span class="vdrop vsortm ${head ? '' : 'vaddm'}" role="menu">${head ? `<span class="mono">${head}</span>` : ''}${opts}</span>` : '';
  const abar = `<span class="vsortw"><button class="fbtn" data-a="apaddopen" aria-label="Add" aria-haspopup="menu" aria-expanded="${!!S.apAddOpen}" aria-pressed="${!!S.apAddOpen}">${icon('plus', 18)}</button>${dm(S.apAddOpen, 'apaddopen', '', cats.map((c) => `<button role="menuitem" data-a="newappt" data-v="${c}">${one(c)}</button>`).join(''))}</span>`;
  const fOn = S.cat !== 'all';
  const fbar = `<span class="vsortw"><button class="fbtn" data-a="apfopen" aria-label="Filter" aria-haspopup="menu" aria-expanded="${!!S.apFOpen}" aria-pressed="${fOn || !!S.apFOpen}">${icon('sliders-horizontal', 18)}</button>${dm(S.apFOpen, 'apfopen', 'Show', [['all', 'All']].concat(cats.map((c) => [c, G(c).name])).map(([k, l]) => `<button role="menuitemradio" data-a="cat" data-v="${k}" aria-checked="${S.cat === k}" aria-current="${S.cat === k}">${esc(l)}${S.cat === k ? icon('check', 16, 2) : ''}</button>`).join(''))}</span>`;
  if (!S.edit) return `<div class="ptools">${abar}${fbar}</div>` + (sec('Today', today) + sec('Coming up', coming) || '<p class="empty">Nothing booked.</p>');
  return chips + (sec('Today', today) + sec('Coming up', coming) || '<p class="empty">Nothing booked.</p>') +
    `<button class="addbtn" data-a="newappt"><span class="plus">+</span>Add ${S.cat !== 'all' && G(S.cat) ? esc(G(S.cat).name.toLowerCase().replace(/s$/, '')) : 'appointment'}</button>`;
}

// ---------- layer: menu, sheets, toast ----------
// Every delete asks first (2026-11-02). Returns the question, or null when the action needs none.
function askDelete(act, a, ref, v) {
  const nm = (x) => x ? '“' + x + '”' : 'this';
  switch (act) {
    case 'rm': { const list = a.dataset.in || ''; if (I(ref) && placements(ref).length > 1 && !list.startsWith('s:')) return null; const o = I(ref) || G(ref); return { q: 'Delete ' + nm(o && o.name) + '?', yes: 'Delete' }; }
    case 'slotrm': return { q: 'Remove the generic item ' + nm(I(ref) && I(ref).name) + ' from my days?', yes: 'Remove' };
    case 'ddelete': return { q: 'Delete ' + nm(S.sheet && S.sheet.draft && S.sheet.draft.name) + '?', yes: 'Delete' };
    case 'hevrm': { const e = M.events.find((x) => x.id === ref); return { q: 'Delete the life event ' + nm(e && e.text) + '?', yes: 'Delete' }; }
    case 'xrm': { const x = mealPlan().extras.find((e) => e.id === v); return { q: 'Delete the extra ' + nm(x && x.name) + '?', yes: 'Delete' }; }
    case 'photodel': return { q: 'Delete this meal?', yes: 'Delete meal' };
    case 'mealphrm': return { q: 'Delete this photo?', yes: 'Delete' };
    case 'jimgrm': return { q: 'Delete this picture?', yes: 'Delete' };
    case 'ndelete': return { q: 'Delete this note?', yes: 'Delete' };
    case 'jdelete': return { q: 'Delete this journal page?', yes: 'Delete' };
    case 'toptrm': { const o = S.sheet && S.sheet.draft && (S.sheet.draft.options || [])[+v]; return { q: 'Remove the option ' + nm(o) + '?', yes: 'Remove' }; }
    case 'inscdel': { const x = (M.settings.insCircles || []).find((u) => u.id === ref); return { q: 'Delete the circle ' + nm(x && x.name) + '? My ticks stay.', yes: 'Delete' }; }
    case 'tagrm': return { q: 'Delete the tag ' + nm(M.tags[v]) + '? It comes off everything that has it.', yes: 'Delete' };
    case 'insexpdel': { const e = (M.settings.exps || []).find((x) => x.id === ref); return { q: 'Delete the experiment ' + nm(e && e.name) + '? My logged days stay.', yes: 'Delete' }; }
    case 'hobdel': { const g = G(ref); return { q: 'Delete the hobby ' + nm(g && g.name) + ' with its activities and projects?', yes: 'Delete' }; }
    case 'bdel': { const b = boardOf(S.board); return { q: 'Delete the board ' + nm(b && boardTitle(b)) + '?', yes: 'Delete' }; }
    case 'lkdel': return { q: 'Delete this connection?', yes: 'Delete' };
    case 'mstdel': return { q: 'Delete this saved look?', yes: 'Delete' };
    case 'mdelmany': { const n = (S.bMulti || []).length; const b = curBoard(); const mm = b && b.items.some((i) => S.bMulti.includes(i.id) && !i.t); return n ? { q: (n === 1 ? 'Delete this' : 'Delete these ' + n) + (mm ? ' and their branches?' : '?'), yes: 'Delete' } : null; }
    case 'mlinkdel': { const b = boardOf(S.board); const l = b && (b.links || []).find((k) => k.id === v); if (!l) return null; const o = b.items.find((i) => i.id === (l.a === S.bSel ? l.b : l.a)); return { q: 'Remove the connection to ' + nm(o && o.text) + '?', yes: 'Remove' }; }
    case 'bdelitem': { const b = boardOf(S.board); const x = b && b.items.find((i) => i.id === S.bSel); if (!x) return null; return { q: !x.t ? (x.parent ? 'Delete ' : 'Delete the map ') + nm(x.text) + (b.items.some((i) => i.parent === x.id) ? ' and its branches?' : '?') : 'Delete this ' + ({ photo: 'photo', note: 'note', swatch: 'colour' }[x.t] || 'text') + '?', yes: 'Delete' }; }
    case 'conddel': { const x = (M.conds || []).find((c) => c.id === ref); return { q: 'Delete ' + nm(x && x.name) + '?', yes: 'Delete' }; }
    case 'ctagdel': { const t = ctag(ref); return { q: 'Delete the tag ' + nm(t && t.name) + '? Conditions keep everything else.', yes: 'Delete' }; }
    case 'tripdel': { const t = (M.trips || []).find((x) => x.id === ref); return { q: 'Delete ' + nm(t && t.name) + '?', yes: 'Delete' }; }
    case 'projphrm': return { q: 'Delete this photo?', yes: 'Delete' };
    case 'pdfdel': { const f = ((G(ref) || {}).files || []).find((x) => x.id === v); return { q: 'Delete the PDF ' + nm(f && f.name) + '?', yes: 'Delete' }; }
    case 'pdhlrm': return VW && VW.hl ? { q: 'Remove this highlight?', yes: 'Remove' } : null;
    case 'colrm': return { q: 'Remove this colour from my palette?', yes: 'Remove' };
    case 'shopdel': { const x = (M.shop || []).find((s) => s.id === v); return { q: 'Delete ' + nm(x && x.name) + ' from the list?', yes: 'Delete' }; }
    case 'remdel': { const r = (M.reminders || []).find((x) => x.id === ref); return { q: 'Delete the reminder ' + nm(r && r.text) + '?', yes: 'Delete' }; }
    case 'wdel': { const w = (M.words || []).find((x) => x.id === ref); return { q: 'Delete ' + nm(w && w.word) + ' from my words?', yes: 'Delete' }; }
    case 'shoplistdel': { const l = (M.shopLists || []).find((s) => s.id === v); const n = (M.shop || []).filter((x) => x.list === v).length; return { q: 'Delete the list ' + nm(l && l.name) + (n ? ' and the ' + n + (n === 1 ? ' thing' : ' things') + ' on it?' : '?'), yes: 'Delete' }; }
    case 'shopclear': return { q: 'Clear everything I got from the list?', yes: 'Clear' };
    case 'mkall': return { q: 'Use this mark on every calendar? It replaces the marks on all the others.', yes: 'Use everywhere' };
  }
  return null;
}
function sheetLayer() { let h = '';
  if (S.sheet.kind === 'checkin') { const b = sheetBody(); const [main, foot] = b.split('\u0001'); h += `<div class="cifull" role="dialog" aria-label="${esc(S.sheet.title)}">${ciHeader(S.sheet)}<div class="sb">${main}</div>${foot || ''}</div>`; }
  else h += `<div class="scrim" data-a="closesheet"><div class="sheet ${S.sheet.kind === 'feel' && !S.sheet.cfg ? 'feelsh' : S.sheet.kind === 'note' ? 'notesh' : ''}" role="dialog" aria-label="${esc(S.sheet.title)}"><header><h2>${esc(S.sheet.title)}</h2>${S.sheet.kind === 'hyper' ? hyperDetHead(S.sheet.ref, T0, hcolor(S.sheet.ref)) || (() => { const DT = (I(S.sheet.ref).parts || []).map((w) => [w, w]); const pk = hval(T0, 'pt:' + S.sheet.ref) || []; return DT.length ? `<div class="chips hdet">${DT.map((x) => pchip(S.sheet.ref, pk, hcolor(S.sheet.ref), x)).join('')}</div>` : ''; })() : ''}${(() => { const k = { item: 'dsave', group: 'savegroup', area: 'savearea', tracker: 'tsave', trip: 'tripsave', cond: 'condsave', insc: 'inscsave', word: 'wsave', rem: 'remsave' }[S.sheet.kind]; return k ? `<button class="hsave" data-a="${k}">${S.sheet.isNew ? 'Add' : 'Save'}</button>` : ''; })()}<button class="hb" data-a="closesheet" aria-label="Close">${icon('x', 22)}</button></header><div class="sb">${sheetBody()}</div></div></div>`;
  return h; }
function renderLayer() { setTimeout(navTrack, 0);
  let h = vLayer() + insLayer();
  if (S.menu) h += `<div class="scrim" style="background:transparent" data-a="closemenu"></div><div class="menu" role="menu"><span class="mundo"><button role="menuitem" data-a="histundo" ${HIST.past.length ? '' : 'disabled'}>${icon('undo-2', 18)} Undo</button><button role="menuitem" data-a="histredo" ${HIST.fut.length ? '' : 'disabled'}>${icon('redo-2', 18)} Redo</button></span>${vMenu()}<span class="mono">Data</span><button role="menuitem" data-a="insopen">${mi('insight', 'chart-pie')} Insight</button>${bkMenu()}<span class="mono">App</span><button role="menuitem" data-a="toggleedit">${S.edit ? mi('editdone', 'check') : mi('edit', 'pencil')} ${S.edit ? 'Finish editing' : 'Edit'}</button>
    <button role="menuitem" data-a="archopen">${mi('archive', 'archive')} Archive</button></div>`;
  // pop-ups stack (2026-11-06): the pop-ups underneath (S.sheet.back, ...) stay drawn but can't be touched; the top one works
  if (S.sheet) { const top = S.sheet, chain = []; for (let x = top; x; x = x.back) chain.unshift(x);
    chain.forEach((x) => { S.sheet = x; const one = sheetLayer(); h += x === top ? one : `<div class="under" inert aria-hidden="true">${one.replace(/ id="/g, ' data-oid="')}</div>`; }); S.sheet = top; }
  if (S.ask) h += `<div class="askwrap" data-a="askno"><div class="ask" role="alertdialog" aria-label="Am I sure?"><b>Am I sure?</b><p>${esc(S.ask.q)}</p><div class="btns"><button class="btn" data-a="askno">Cancel</button><button class="btn danger" data-a="askyes">${esc(S.ask.yes)}</button></div></div></div>`;
  if (S.toast && !S.sheet) h += `<div class="toast" role="status"><span>${esc(S.toast.msg)}</span>${S.toast.undo ? '<button data-a="undo">Undo</button>' : ''}</div>`;
  const lastSb = () => [...document.querySelectorAll('#layer .sb')].pop(); const sb0 = lastSb(); const keep = sb0 && S.sheet && S._lastSheet === S.sheet ? sb0.scrollTop : 0; $('#layer').innerHTML = h; S._lastSheet = S.sheet; if (keep) { const sb1 = lastSb(); if (sb1) sb1.scrollTop = keep; }
  // a message while a pop-up is open shows inside that pop-up, under its title (never hidden behind it)
  if (S.toast && S.sheet) { const hd = [...document.querySelectorAll('#layer > .scrim > .sheet > header, #layer > .cifull > header, #layer > .cifull .cihd')].pop(); if (hd) { const m = document.createElement('div'); m.className = 'shmsg'; m.setAttribute('role', 'alert'); m.textContent = S.toast.msg; hd.after(m); } }
  { const nt = document.getElementById('ntext'); if (nt) { nt.style.height = 'auto'; nt.style.height = Math.max(nt.scrollHeight, 224) + 'px'; } } // a long note opens at its full height, so the pop-up can scroll through it
  // the + sheet keeps the size it opened at while I search (2026-11-08)
  if (S.sheet && S.sheet.kind === 'add') { const sh = [...document.querySelectorAll('#layer .sheet')].pop(); if (sh) { if (!(S.sheet.q || '').trim()) S.sheet.h = sh.offsetHeight; else if (S.sheet.h) sh.style.height = S.sheet.h + 'px'; } }
}
function openSheet(s) { S.openAdd = null; S.tagEdit = false; if (!s.back && S.sheet && S.sheet.kind === 'checkin' && s.kind !== 'checkin') s.back = S.sheet; // anything I add from a check-in comes back to it (2026-11-10)
  if (s.kind === 'checkin' && !s.feel0) s.feel0 = (M.feel[T0] || []).slice(); S.sheet = s; S.menu = false; renderLayer(); const f = [...document.querySelectorAll('#layer [data-autofocus]')].pop(); if (f) f.focus(); }
function closeSheet() { if (S.sheet && S.sheet.kind === 'note' && typeof nAuto === 'function') { nAuto(); S.nTagOpen = false; } S.sheet = S.sheet && S.sheet.back || null; render(); }
const swRow = (cur, act, extra = '') => `<div class="sw">${extra}${PAL.map(([n, c]) => `<button style="--c:${c}" data-a="${act}" data-v="${c}" aria-label="${n}" title="${n}" aria-pressed="${(cur || '').toLowerCase() === c.toLowerCase()}"></button>`).join('')}</div>`;
// a step's own options in the routine sheet: optional, which days it's part of the routine, its tags (2026-11-11)
function partPick(s) { const have = (s.steps || []).map((x) => x.id).filter(Boolean); const self = s.ref;
  const all = Object.keys(M.items).filter((k) => k !== self && !have.includes(k) && I(k).type === 'task' && !I(k).part && !I(k).brk && !(!repeatable(I(k)) && everDone(k))).sort((a, b) => I(a).name.localeCompare(I(b).name));
  return all.length ? `<select class="inp" data-partadd="1" aria-label="Add one of my items as a step" style="margin-top:8px"><option value="">+ Add one of my items</option>${all.map((k) => `<option value="${k}">${esc(I(k).name)}</option>`).join('')}</select>` : ''; }
function stepOpts(x, i) { const ch = (a, v, on, l) => `<button class="chip" data-a="${a}" data-ref="${i}" data-v="${v}" aria-pressed="${!!on}">${esc(l)}</button>`;
  return `<div class="stepopts"><div class="tg"><span class="l">Optional</span><button class="swt" role="switch" aria-checked="${!!x.optional}" data-a="dstep-opt" data-ref="${i}" aria-label="Optional"></button></div>
    <span class="mono">Part of the routine</span><div class="chips">${[['', 'Every time'], ['rest', 'Days without a workout'], ['train', 'Days with a workout'], ['days', 'Certain days']].map(([v, l]) => ch('dstep-only', v, (x.only || '') === v, l)).join('')}</div>
    ${x.only === 'days' ? `<div class="chips">${WD.map((w, k) => ch('dstep-day', k, (x.days || []).includes(k), w)).join('')}</div>` : ''}
    ${x.link ? '' : `<span class="mono">Tags</span><div class="chips">${Object.entries(M.tags).map(([t, n]) => ch('dstep-tag', t, (x.tags || []).includes(t), n)).join('') || '<span class="sub">No tags yet</span>'}</div>`}</div>`; }
const sw = (key, label, on, sub) => `<div class="tg"><span class="l">${label}</span><button class="swt" role="switch" aria-checked="${!!on}" data-a="dflag" data-v="${key}" aria-label="${label}"></button></div>`;
// icon picker categories (Lucide's own), in the order I'm most likely to want them
const ICON_CATS = [['custom', 'Custom'], ['home', 'Home'], ['food-beverage', 'Food and drink'], ['nature', 'Nature'], ['animals', 'Animals'], ['weather', 'Weather'], ['seasons', 'Seasons'], ['medical', 'Health'], ['sports', 'Sports'], ['people', 'People'], ['emoji', 'Faces'], ['time', 'Time'], ['travel', 'Travel'], ['transportation', 'Transport'], ['gaming', 'Games'], ['multimedia', 'Media'], ['photography', 'Photos'], ['shopping', 'Shopping'], ['tools', 'Tools'], ['science', 'Science'], ['buildings', 'Buildings'], ['communication', 'Talking'], ['mail', 'Mail'], ['text', 'Writing'], ['design', 'Art and design'], ['shapes', 'Shapes'], ['finance', 'Money'], ['devices', 'Devices'], ['files', 'Files'], ['charts', 'Charts'], ['math', 'Maths'], ['notifications', 'Alerts'], ['security', 'Security'], ['navigation', 'Places'], ['arrows', 'Arrows'], ['account', 'Account'], ['social', 'Social'], ['sustainability', 'Green living'], ['accessibility', 'Accessibility']];
// on a PC the mouse wheel scrolls the category chips sideways
document.addEventListener('wheel', (e) => { const r = e.target.closest && e.target.closest('.iccats, .xslide'); if (r && Math.abs(e.deltaY) > Math.abs(e.deltaX)) { r.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
function sheetBody() {
  const s = S.sheet;
  if (s.kind[0] === 'v') return vSheet(s);
  if (s.kind === 'trip') return tripSheet(s);
  if (s.kind === 'mark') return markSheet(s);
  if (s.kind === 'mkpick') return mkPickSheet(s);
  if (s.kind === 'word') return wordSheet(s);
  if (s.kind === 'rem') return remSheet(s);
  if (s.kind === 'cals') return calsSheet();
  if (s.kind === 'shop') return shopSheet();
  if (s.kind === 'shoplist') return shopListSheet(s);
  if (s.kind === 'shoptext') return `<textarea id="shoptxt" class="inp" rows="8" readonly style="width:100%;box-sizing:border-box;font:inherit">${esc(shopText())}</textarea><p class="empty">Copy blocked here: select it and copy.</p>`;
  if (s.kind === 'cond') return condSheet(s);
  if (s.kind === 'insc') return inscSheet(s);
  if (s.kind === 'confirm') return `<p class="note" style="font-size:14px">${esc(s.msg)}</p><div class="btns"><button class="btn danger" data-a="${s.yes}">${esc(s.yesLabel)}</button><button class="btn" data-a="closesheet">Cancel</button></div>`;
  if (s.kind === 'icon') { const q = (s.q || '').trim().toLowerCase(); const names = Object.keys(window.LUCIDE || {}); const cur = getProp(s.ref, 'icon'); const FAV = ['sun', 'moon', 'sunrise', 'sunset', 'coffee', 'bed', 'bath', 'shower-head', 'droplets', 'pill', 'heart', 'heart-pulse', 'brain', 'face-slightly-smiling', 'footprints', 'dumbbell', 'bike', 'mountain', 'leaf', 'flower-2', 'sprout', 'house', 'sofa', 'washing-machine', 'shirt', 'spray-can', 'trash', 'utensils', 'cooking-pot', 'chef-hat', 'shopping-cart', 'book-open', 'graduation-cap', 'pencil', 'notebook-pen', 'laptop', 'eighth-notes', 'palette', 'scissors', 'tv', 'gamepad-2', 'camera', 'phone', 'mail', 'users', 'calendar', 'clock', 'alarm-clock', 'stethoscope', 'wrench', 'lamp', 'car', 'plane', 'dog', 'cat', 'star', 'sparkles', 'check', 'circle', 'flag'].filter((n) => names.includes(n)); const CATS = window.LUCIDE_CATS || {}; const cat = s.cat && CATS[s.cat] ? s.cat : ''; const list = q ? names.filter((n) => n.includes(q)).slice(0, 160) : cat ? CATS[cat] : FAV;
    const chips = q ? '' : `<div class="iccats">${[['', 'Shown first']].concat(ICON_CATS.filter(([k]) => CATS[k])).map(([k, l]) => `<button data-a="iconcat" data-v="${k}" aria-pressed="${k === cat}">${l}</button>`).join('')}</div>`;
    return `<input class="inp" id="iconq" placeholder="Search all ${names.length} icons" value="${esc(s.q || '')}" data-autofocus>${chips}<div class="icg">${list.map((n) => `<button data-a="pickicon" data-v="${n}" aria-label="${n}" title="${n}" aria-pressed="${n === cur}">${icon(n, 22)}</button>`).join('')}</div>`; }
  if (s.kind === 'colorpick') return colorPickSheet(s);
  if (s.kind === 'item') return itemSheet(s);
  if (s.kind === 'blk') return blkSheet();
  if (s.kind === 'archive') return archSheet();
  if (s.kind === 'note') return noteSheet(s);
  if (s.kind === 'jlist') return jListSheet();
  if (s.kind === 'jtags') return jTagSheet(s);
  if (s.kind === 'group') { const g = G(s.ref);
    return `<div class="fld"><span class="mono">Name</span><input class="inp" id="gname" value="${esc(g.name)}"></div>
      ${g.style === 'sgroup' ? `<div class="fld"><span class="mono">Deadline</span><div class="inrow"><input class="inp" type="date" id="gdl" value="${g.deadline || ''}"><span class="note">optional</span></div></div>` : ''}
      ${g.style === 'project' && typeof hobOf === 'function' && hobOf(s.ref) && hobActs(hobOf(s.ref)).length ? `<div class="fld"><span class="mono">Activity it covers</span><div class="chips">${[['', 'None']].concat(hobActs(hobOf(s.ref)).map((k) => [k, I(k).name])).map(([k, l]) => `<button class="chip" data-a="projact" data-ref="${s.ref}" data-v="${k}" aria-pressed="${(g.act || '') === k}">${esc(l)}</button>`).join('')}</div></div>` : ''}
      ${g.style === 'dayblock' ? `<div class="fld"><span class="mono">Time</span><div class="inrow"><input class="inp" type="time" id="gstart" value="${g.start}"><span>to</span><input class="inp" type="time" id="gend" value="${g.end}"></div></div>` : ''}
      <div class="fld"><span class="mono">Colour</span>${colorField(s.ref, g.color)}</div>
      ${g.style === 'hgroup' && g.special !== 'checkins' ? `<div class="fld"><span class="mono">Asked in a check-in</span><div class="chips">${[['', 'No'], ['morning', 'Morning'], ['evening', 'Evening']].map(([k, l]) => `<button class="chip" data-a="gci" data-ref="${s.ref}" data-v="${k}" aria-pressed="${(g.ci || '') === k}">${l}</button>`).join('')}</div></div>` : ''}
      ${g.style === 'acat' ? `<div class="fld"><span class="mono">Icon</span><div><button class="btn" data-a="iconfor" data-v="${s.ref}" style="display:inline-flex;gap:8px;align-items:center">${icon(g.icon || 'circle', 18)} Change icon</button></div></div>` : ''}`; }
  if (s.kind === 'area') { const a = M.areas[s.ref];
    return `<div class="fld"><span class="mono">Name</span><input class="inp" id="aname" value="${esc(a.name)}"></div><div class="fld"><span class="mono">Colour</span>${colorField('a:' + s.ref, a.color)}</div>
      <div class="fld"><span class="mono">Icon</span><div><button class="btn" data-a="iconfor" data-v="a:${s.ref}" style="display:inline-flex;gap:8px;align-items:center">${icon(a.icon, 18)} Change icon</button></div></div>`; }
  if (s.kind === 'remove') { const pl = placements(s.ref);
    return `<p class="note" style="font-size:14px">“${esc(I(s.ref).name)}” is in ${pl.length} places: ${pl.map((p) => esc(placeName(p))).join(', ')}. It is one item, so its history is shared.</p><div class="btns"><button class="btn" data-a="rmhere">Remove from here</button><button class="btn danger" data-a="rmall">Delete everywhere</button></div>`; }
  if (s.kind === 'hyper') { const pk = hval(T0, 'pt:' + s.ref) || []; const c = hcolor(s.ref); const chip = ([h, l]) => `<button class="hchip" data-a="hpart" data-ref="${s.ref}" data-v="${esc(h)}" aria-pressed="${pk.includes(h)}" style="${pk.includes(h) ? `background:${pale(c)};border-color:${c}` : ''}">${esc(l)}</button>`; const HB = hyperHobs(s.ref), DT = (I(s.ref).parts || []).map((w) => [w, w]); const hobOn = HB.some(([h]) => pk.includes(h));
      return `<p class="note" style="font-size:14px">Which hobbies?</p><div class="chips">${HB.map(chip).join('')}</div><div class="btns" style="margin-top:16px"><button class="btn dark" data-a="hyperdone" ${hobOn || !HB.length ? '' : 'disabled'}>Done</button></div>`; }
  if (false) { return `<div class="chips">${partOpts(s.ref).map(([h, l]) => `<button class="hchip" data-a="hpart" data-ref="${s.ref}" data-v="${esc(h)}" aria-pressed="${pk.includes(h)}" style="${pk.includes(h) ? `background:${pale(c)};border-color:${c}` : ''}">${esc(l)}</button>`).join('')}</div><div class="btns" style="margin-top:16px"><button class="btn dark" data-a="hyperdone" ${pk.length ? '' : 'disabled'}>Done</button></div>`; }
  if (s.kind === 'two') return `<p class="note" style="font-size:14px">Did I finish it?</p><div class="btns"><button class="btn dark" data-a="twoyes" data-ref="${s.ref}">Yes, done</button><button class="btn" data-a="closesheet">Not yet</button></div>`;
  if (s.kind === 'much') return `<p class="note" style="font-size:14px">Too much “${esc((I(s.ref) || G(s.ref) || {}).name || '')}”. What kind?</p><div class="btns"><button class="btn dark" data-a="much" data-v="hyper">Hyperfixation</button><button class="btn dark" data-a="much" data-v="inert">Inertia</button><button class="btn" data-a="much" data-v="">Skip</button></div>`;
  if (s.kind === 'checkin') return checkinSheet(s);
  if (s.kind === 'feel') return feelSheet();
  if (s.kind === 'tracker') return trackerSheet(s);
  if (s.kind === 'ttype') return `<div class="stack" style="gap:8px">${TTYPES.map(([k, l, sub]) => `<button class="ttrow" data-a="ttpick" data-v="${k}"><b>${l}</b><small>${sub}</small><span aria-hidden="true">›</span></button>`).join('')}</div>`;
  if (s.kind === 'photo') return photoSheet(s);
  if (s.kind === 'diary') return diarySheet();
  if (s.kind === 'mealweek') return mealWeekSheet();
  if (s.kind === 'newopt') return `<input class="inp" id="newopt" placeholder="Like energy drink or late snack" data-autofocus><div class="btns"><button class="btn dark" data-a="hoptsave">Add and tick for today</button></div>`;
  if (s.kind === 'peek') { const it = I(s.ref); if (!it) return ''; const isA = it.type === 'appt'; const c = isA ? G(catOf(s.ref)).color : colorOf(s.ref); const d = s.d || T0; const done = isDone(s.ref, d);
    const lines = [];
    lines.push(['Day', relDay(d) === fmtDate(d) ? fmtDate(d) : relDay(d) + ', ' + fmtDate(d)]);
    if (isA) { lines.push(['Time', apTime(it) || 'No time set']); lines.push(['Category', G(catOf(s.ref)).name]); if (it.when && it.when.mode !== 'once') lines.push(['Frequency', whenText(Object.assign({}, it, { when: Object.assign({}, it.when, { date: it.date }) }))]); else if (it.rep) lines.push(['Frequency', repText(it.rep)]); }
    else { if (s.from) lines.push(['Time', fmtHM(+s.from) + '–' + fmtHM(+s.to) + (it.time ? '' : ' · fills its block')]); if (it.type !== 'checkin') lines.push(['Day block', G(blockOfItem(s.ref)).name]); const wt = whenText(it); if (wt) lines.push(['Repeats', wt]);
      if (it.type === 'routine') lines.push(['Steps', rSteps(s.ref, d).map((x) => (val(d, x) ? '✓ ' : stepMissed(x, d) ? '✕ ' : '') + I(x).name + (I(x).optional ? ' (optional)' : '')).join(', ')]); }
    if (it.note) lines.push(['Note', it.note]);
    lines.push(['Status', done ? (String(val(d, s.ref)).startsWith('much') ? 'Too much' : 'Done') : d < T0 ? 'Not done' : d === T0 ? 'Not done yet' : 'Coming up']);
    return `<div class="peekhd"><span class="aic" style="background:${pale(c)};color:${mix(c, TH.ink, 0.35)}">${icon(it.icon || defIcon(s.ref) || (isA ? G(catOf(s.ref)).icon : 'check') || 'circle', 20, 1.9)}</span></div>
      <dl class="peek">${lines.map(([k, v]) => `<dt class="mono">${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
      <div class="btns">${d === T0 && it.type !== 'checkin' && it.type !== 'routine' ? `<button class="btn dark" data-a="peektick">${it.type === 'slot' ? 'Open ' + (it.opens === 'study' ? 'Study' : it.opens === 'training' ? 'Training' : it.opens === 'hobbies' ? 'Hobbies' : 'Chores') : done ? 'Untick' : 'Tick as done'}</button>` : ''}${d <= T0 && !done && it.type !== 'checkin' ? `<button class="btn" data-a="miss" data-ref="${s.ref}" data-d="${d}">Missed</button>` : ''}<button class="btn" data-a="peekedit">Edit</button></div>`; }
  if (s.kind === 'add') {
    // Add or log, redone (2026-11-08): compact, everything in reach. Always on top: a feeling, plan items, notebook items.
    // The search finds anything tickable and ticks it right there; Tick as done = everything on Today plus what I ticked lately.
    const q = (s.q || '').trim().toLowerCase();
    const today = dayList(T0).flatMap((x) => x.items).filter((id) => I(id) && !['checkin', 'appt', 'slot'].includes(I(id).type));
    const tile = (a, ic, l, extra = '') => capTile(l, ic, `data-a="${a}" ${extra}`);
    let h = `<input class="inp" id="addq" placeholder="Search anything to tick" value="${esc(s.q || '')}" autocomplete="off" enterkeyhint="search">`;
    if (q) { const TT = ['task', 'routine', 'step', 'tracker']; const hits = Object.keys(M.items).filter((id) => TT.includes(I(id).type) && (I(id).name || '').toLowerCase().includes(q) && (I(id).type !== 'step' || placements(id).length) && !I(id).arch)
        .sort((a, b) => (I(a).name.toLowerCase().startsWith(q) ? 0 : 1) - (I(b).name.toLowerCase().startsWith(q) ? 0 : 1)).slice(0, 14);
      const where = (id) => { const g = placements(id).map((x) => G(x) || I(x)).find(Boolean); return g ? g.name : ''; };
      const ctl = (id) => { const it = I(id); if (it.type !== 'tracker') { const on = isDone(id, T0); return `<button class="atick${on ? ' on' : ''}" data-a="addtick" data-ref="${id}" aria-pressed="${on}" aria-label="${on ? 'Untick' : 'Tick'} ${esc(it.name)}" style="--c:${colorOf(id)}">${on ? icon('check', 16, 2.4) : ''}</button>`; }
        const cur = val(T0, id); const opts = it.scale === 'yesno' ? [['yes', 'Yes']] : it.scale === 'avoid' ? [['faced', 'Faced'], ['avoided', 'Avoided']] : (SCALES[it.scale] || []).map((w, k) => [String(k + 1), w]);
        return `<span class="alev">${opts.map(([v, l]) => `<button class="chip${String(cur) === v ? ' on' : ''}" data-a="addset" data-ref="${id}" data-v="${v}" aria-pressed="${String(cur) === v}">${esc(cap(l))}</button>`).join('')}</span>`; };
      h += `<div class="afind">${hits.length ? hits.map((id) => `<div class="arow"><span class="an">${esc(I(id).name)}<span class="sub">${esc(where(id))}</span></span>${ctl(id)}</div>`).join('') : '<p class="empty">Nothing by that name.</p>'}</div>`;
      return h; }
    // which study task group: picked right here when there's more than one (2026-11-08)
    // a task from Capture first asks what kind it is (2026-11-10): a plain task, a chore, a study task or a prep
    if (s.pickTask && !s.pickStudy) { const row = (a, v, ic, l) => `<button class="arow" data-a="${a}" ${v ? `data-v="${v}"` : ''} style="text-align:left"><span class="an" style="display:flex;align-items:center;gap:12px">${icon(ic, 20)}${l}</span><span class="chev" aria-hidden="true">›</span></button>`;
      return `<div class="fld"><div class="afind">${row('new', 'once', 'check', 'Task')}${row('vadd', 'g-oneoff', 'spray-can', 'Chore')}${row('addstudy', '', 'book-open', 'Study task')}${row('vadd', 'g-prep', 'cooking-pot', 'Prep')}</div></div>`; }
    if (s.pickStudy) { const subs = S.subj && G(S.subj) ? [S.subj] : subjIds();
      return `<div class="fld"><span class="mono">Study task in</span><div class="afind">${subs.map((sb) => sgroupsOf(sb).map((g) => `<button class="arow" data-a="vadd" data-v="${g}" style="text-align:left"><span class="an">${esc(G(g).name)}<span class="sub">${esc(G(sb).name)}</span></span><span class="chev" aria-hidden="true">›</span></button>`).join('')).join('') || '<p class="empty">No task groups yet.</p>'}</div></div>`; }
    // the page I'm on comes first, under This page (2026-11-08)
    const here = pageAdds((a, ic, l, extra = '') => capTile(l, ic, `data-a="${a}" ${extra}`, null, true)); if (here) h += `<div class="fld"><span class="mono">This page</span><div class="addtiles">${here}</div></div>`;
    // a thin Feeling bar over a 3×2 grid, so the tiles line up (2026-11-08)
    h += `<div class="fld"><span class="mono">Anywhere</span><div class="addtop">${(() => { const ws = feelOf(T0); const b = ws.length ? fieldBg(ws) : null; return `<button class="feelcard addfeel" data-a="feel" style="${b ? `background:${b.old};background:${b.ok}` : ''}" aria-label="${ws.length ? 'Feelings: ' + esc(ws.join(', ')) + '. Tap to change' : 'How do I feel?'}"></button>`; })()}<div class="addtiles">${tile('newpick', 'check', 'Task')}${tile('newappt', 'calendar-clock', 'Appointment', 'data-v="appt"')}${tile('shopnew', 'shopping-basket', 'Shopping')}${tile('mealnew', 'utensils', 'Meal')}${tile('nnew', 'sticky-note', 'Note')}${tile('wnew', 'book-a', 'Lexicon')}${tile('jnew', 'notebook-pen', 'Journal page')}${tile('bnew', 'layout-dashboard', 'Board')}</div></div></div>`;
    // recently ticked: done in the last week, not on Today, newest first
    const recent = []; for (let k = 1; k <= 7 && recent.length < 10; k++) { const d = addDays(T0, -k); Object.entries(M.log[d] || {}).forEach(([id, v]) => { if (recent.length < 10 && v === 'done' && I(id) && ['task', 'routine', 'step'].includes(I(id).type) && !today.includes(id) && !recent.includes(id) && !(I(id).type === 'task' && I(id).when && I(id).when.mode === 'once')) recent.push(id); }); }
    const chip = (id) => { const on = isDone(id, T0); return `<button class="chip${on ? ' done' : ''}" data-a="addtick" data-ref="${id}" aria-pressed="${on}" style="--c:${colorOf(id)}"><span class="d"></span>${esc(I(id).name)}</button>`; };
    if (today.length || recent.length) h += `<div class="fld"><span class="mono">Tick as done</span><div class="chips achips">${today.concat(recent).map(chip).join('')}</div></div>`;
    return h; }
  return '';
}
// what the + offers first on the page I'm on: [heading, buttons]
// the Capture buttons show only their icon, and I can change each icon (2026-11-10): opening Capture while in edit mode turns that on
const capKey = (l) => 'cap-' + l.toLowerCase().replace(/[^a-z0-9]+/g, '-');
// the This page buttons keep their names under the icon (2026-11-10: they're not as intuitive)
function capTile(l, ic, attrs, file, named) { const k = capKey(l), i = icon(uiIc(k, ic), named ? 20 : 24) + (named ? `<span>${l}</span>` : '');
  if (S.sheet && S.sheet.capEdit) return `<button class="addtile ed" data-a="iconfor" data-v="ui:${k}" aria-label="Change the icon for ${l}" title="${l}">${i}</button>`;
  return file ? `<label class="addtile" aria-label="${l}" title="${l}">${i}${file}</label>` : `<button class="addtile" ${attrs} aria-label="${l}" title="${l}">${i}</button>`; }
function pageAdds(ab) { if (S.insOn) return null; const fileIn = (id, ref, ic, l, acc) => capTile(l, ic, '', `<input type="file" accept="${acc}"${acc.startsWith('image') ? ' multiple' : ''} id="${id}" data-ref="${ref}" hidden>`, true);
  if (S.area === 'hobbies' && S.proj && G(S.proj)) { const p = S.proj; return [ab('hobnewtask', 'check', 'Task', `data-v="${p}"`) + fileIn('projphoto', p, 'camera', 'Photo', 'image/*') + ab('pnnew', 'sticky-note', 'Note', `data-v="${p}"`) + ab('pjbnew', 'layout-dashboard', 'Board', `data-v="${p}"`) + fileIn('projpdf', p, 'file-text', 'PDF', 'application/pdf')]; }
  if (S.area === 'hobbies' && S.hob && G(S.hob)) return ab('hobnewproj', 'folder-plus', 'Project', `data-v="${S.hob}"`) + ab('hobnewact', 'plus', 'Activity', `data-v="${S.hob}"`);
  if (S.area === 'home' && S.page === 'shopping') return ab('shoplistnew', 'list-plus', 'List');
  if (S.area === 'study') return S.subj && G(S.subj) ? ab('vaddsg', 'folder-plus', 'Task group', `data-v="${S.subj}"`) : null;
  if (S.area === 'plan' && S.page === 'appts') return G('g-appts').kids.filter(G).slice(1).map((c) => ab('newappt', G(c).icon || 'calendar-clock', esc(G(c).name.replace(/s$/, '')), `data-v="${c}"`)).join('');
  // Health and Food have their adds on the page itself (2026-11-08)
  if (S.area === 'health') { if (S.page === 'expeds') return ab('tripnew', 'mountain', 'Expedition', 'data-v="planned"') + ab('tripnew', 'star', 'Wish', 'data-v="wish"'); }
  return null; }
// Star colours, one per calendar kind (plan = Today + Schedule, train, food), set in edit mode (2026-11-05)
const starCol = (k) => ((M.settings || {}).starCols || {})[k] || (k === 'bad' ? '#8C9EBF' : k === 'broke' ? '#E3A99B' : '#EBCB95');
const starSvg = (k, sz = 18) => `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z" fill="${starCol(k)}" stroke="${starCol(k)}" stroke-width="3.2" stroke-linejoin="round"/></svg>`;
// Training marks a fully done day with a flower instead of a star (2026-11-05)
const flowerSvg = (col, sz, cls = '') => `<svg class="${cls}" width="${sz}" height="${sz}" viewBox="0 0 24 24" aria-hidden="true"><g fill="${col}"><ellipse cx="12" cy="6.3" rx="2.9" ry="5" transform="rotate(0 12 12)"/><ellipse cx="12" cy="6.3" rx="2.9" ry="5" transform="rotate(72 12 12)"/><ellipse cx="12" cy="6.3" rx="2.9" ry="5" transform="rotate(144 12 12)"/><ellipse cx="12" cy="6.3" rx="2.9" ry="5" transform="rotate(216 12 12)"/><ellipse cx="12" cy="6.3" rx="2.9" ry="5" transform="rotate(288 12 12)"/></g></svg>`;
const starEdit = (k) => markEdit(k); // the completed-day mark pop-up (marks.js)
function getProp(ref, k) { if (ref.startsWith('wh:')) return k === 'color' ? whCol(ref.slice(3)) : undefined; if (ref.startsWith('pdc:')) return k === 'color' ? pdGetCol(ref.slice(4)) : undefined; if (ref.startsWith('ic:')) return k === 'color' ? insColOf(ref.slice(3)) : undefined; if (ref.startsWith('ui:')) return k === 'icon' ? uiIc(ref.slice(3), 'circle') : undefined; if (ref.startsWith('fc:')) return k === 'color' ? feelCol(ref.slice(3), '#9A9387') : undefined; if (ref.startsWith('ctag:')) return k === 'color' ? ctagCol(ref.slice(5)) : undefined; if (ref.startsWith('star:')) return k === 'color' ? starCol(ref.slice(5)) : undefined; if (ref.startsWith('tk:')) return k === 'color' ? tripCol(ref.slice(3)) : undefined; if (ref === 'cc:fit') return k === 'color' ? condCol() : undefined; if (ref.startsWith('x:')) return (mealPlan().extras.find((x) => x.id === ref.slice(2)) || {})[k] || (k === 'color' ? xcol({ id: ref.slice(2) }) : k === 'icon' ? xicon({ id: ref.slice(2) }) : undefined); if (ref.startsWith('a:')) return M.areas[ref.slice(2)][k]; if (ref.startsWith('p:')) return M.pages[ref.slice(2)][k]; if (ref === 'draft') return S.sheet && S.sheet.back && S.sheet.back.draft && S.sheet.back.draft[k]; return (I(ref) || G(ref) || {})[k]; }
function setProp(ref, k, v) { if (ref.startsWith('wh:')) { if (k === 'color') { const W = M.settings.wheelCols = M.settings.wheelCols || {}; if (v) W[ref.slice(3)] = v; else delete W[ref.slice(3)]; } return; } if (ref.startsWith('pdc:')) { if (k === 'color' && v) pdSetCol(ref.slice(4), v); return; } if (ref.startsWith('ic:')) { if (k === 'color') insSetCol(ref.slice(3), v); return; } if (ref.startsWith('ui:')) { if (k === 'icon') (M.settings.uiIcons = M.settings.uiIcons || {})[ref.slice(3)] = v; return; } if (ref.startsWith('fc:')) { const x = (M.settings.feelings || []).find((y) => y[0] === ref.slice(3)); if (x && k === 'color' && v) x[1] = v; return; } if (ref.startsWith('ctag:')) { const t = ctag(ref.slice(5)); if (t && k === 'color' && v) t.color = v; return; } if (ref === 'cc:fit') { if (k === 'color') { if (v) M.settings.fitCondCol = v; else delete M.settings.fitCondCol; } return; } if (ref.startsWith('tk:')) { if (k === 'color') { M.settings.tripCols = M.settings.tripCols || {}; if (v) M.settings.tripCols[ref.slice(3)] = v; else delete M.settings.tripCols[ref.slice(3)]; } return; } if (ref.startsWith('star:')) { if (k === 'color') { M.settings.starCols = M.settings.starCols || {}; if (v) M.settings.starCols[ref.slice(5)] = v; else delete M.settings.starCols[ref.slice(5)]; } return; } if (ref.startsWith('x:')) { const x = mealPlan().extras.find((e) => e.id === ref.slice(2)); if (x) x[k] = v; return; } if (ref.startsWith('a:')) M.areas[ref.slice(2)][k] = v; else if (ref.startsWith('p:')) M.pages[ref.slice(2)][k] = v; else { const o = I(ref) || G(ref); if (!o) return; if (v === '' || v == null) delete o[k]; else o[k] = v; } }

// The item sheet edits a draft; Save writes it back (and places a new item).
// STUDY SESSIONS (2026-11-06): a study task's estimate can be split into dated sessions (2 h = 1 h Monday, 30 min twice).
// Each session is its own one-off item (part: the task's id) placed in a day block, so it shows on Today and Schedule that day.
const studyBlock = () => defBlock('study');
const studyBlock0 = () => (G('b-study') && blockIds().includes('b-study') ? 'b-study' : blockIds().find((b) => /study|^day$/i.test(G(b).name))) || blockIds()[0];
const eveBlock = () => (G('b-evening') && blockIds().includes('b-evening') ? 'b-evening' : blockIds()[blockIds().length - 1]);
const isStudyItem = (s, D) => D.est != null || !!(G(s.home) && G(s.home).style === 'sgroup');
// in the quick Schedule pop-up too: Estimate and Sessions are part of scheduling (2026-11-06)
// length is typed, like 45m or 1h 30m; a bare number is minutes; the list offers the usual ones (2026-11-06)
const durIn = (D) => `<input class="inp durin" id="ddur" list="durlist" value="${estHM((D.dur || 30) / 60)}" aria-label="Length" autocomplete="off"><datalist id="durlist">${[10, 15, 30, 45, 60, 90, 120].map((m) => `<option value="${estHM(m / 60)}">`).join('')}</datalist>`;
const estIn = (D) => `<input class="inp estin" id="dest" value="${D.est ? estHM(D.est) : ''}" placeholder="0h 0m" aria-label="Estimate, in hours and minutes" autocomplete="off">`;
// Day block is a button in the Time and length row; it opens a small pop-up of the blocks (2026-11-06)
const isHobAct = (s) => !!s.hobact || !!(s.ref && hobIds().some((h) => G(h).kids.includes(s.ref)));
const blkBtn = (s) => { if ((!s.block || !G(s.block)) && !isHobAct(s)) s.block = isStudyItem(s, s.draft) ? studyBlock() : eveBlock(); const g = s.block && G(s.block); return `<button class="blkbtn ${g ? '' : 'off'}" data-a="dblkopen" aria-label="Day block: ${esc(g ? g.name : 'not on Today')}" title="${esc(g ? g.name : 'Not on Today')}">${icon(g ? g.icon || 'clock' : 'calendar-plus', 20)}</button>`; };
// ARCHIVE in the ⋯ menu (2026-11-06): old things that aren't done tasks leave their pages and wait here.
// Past one-off appointments and archived conditions so far; more sections join as the app grows.
function archSheet() {
  const ap = allAppts().filter((x) => { const it = I(x.id); return it.date && it.date < T0 && !it.rep && !(it.when && it.when.mode && it.when.mode !== 'once'); }).sort((a, b) => I(b.id).date.localeCompare(I(a.id).date));
  const cs = (M.conds || []).filter((x) => x.end && x.arch).sort((a, b) => b.end.localeCompare(a.end));
  const apRow = (x) => { const it = I(x.id); const c = G(x.cat).color; return `<div class="row past"><span class="adot" style="--c:${c}">${icon(it.icon || G(x.cat).icon || 'calendar', 13, 2.2)}</span><button class="lbl" data-a="archgo" data-v="open" data-ref="${x.id}" style="text-align:left">${esc(it.name)}<span class="sub">${esc(fmtDate(it.date))}${it.time ? ' · ' + esc(it.time) : ''}</span></button></div>`; };
  const cRow = (x) => `<div class="tg cond arch"><button class="l" data-a="archgo" data-v="condopen" data-ref="${x.id}" style="text-align:left">${esc(x.name)}<small>${esc(fmtDate(x.start))} to ${esc(fmtDate(x.end))}</small></button><button class="soft condic" data-a="condarch" data-ref="${x.id}" aria-label="Bring back ${esc(x.name)}" title="Bring back">${icon('archive-arrow-up', 18)}</button></div>`;
  const dx = (M.trips || []).filter((t) => t.status === 'done').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const xRow = (t) => `<div class="row past"><span class="circ done" style="--c:${tripCol(t.kind === 'hike' ? 'hike' : 'expedition')}">✓</span><button class="lbl" data-a="archgo" data-v="trip" data-ref="${t.id}" style="text-align:left">${esc(t.name)}<span class="sub">${esc(tripWhen(t))}</span></button></div>`;
  const ah = allHobIds().filter((h) => G(h).arch);
  const hRow = (h) => `<div class="tg cond arch"><span class="l"><span class="hdot" style="background:${G(h).color};width:10px;height:10px;display:inline-block;border-radius:5px;margin-right:10px"></span>${esc(G(h).name)}</span><button class="soft condic" data-a="hobback" data-ref="${h}" aria-label="Bring back ${esc(G(h).name)}" title="Bring back">${icon('archive-arrow-up', 18)}</button></div>`;
  const st = subjIds().flatMap((sj) => sgroupsOf(sj).flatMap((g) => kidsOf(g).filter((k) => I(k) && sFinished(k) && !isDone(k, T0)).map((k) => ({ k, sj, d: Object.keys(M.log).filter((d) => val(d, k)).sort().pop() })))).sort((x, y) => y.d.localeCompare(x.d));
  const sRow = (x) => `<div class="tg cond arch"><span class="l">${esc(I(x.k).name)}<small>${esc(G(x.sj).name)} · finished ${esc(fmtDate(x.d))}</small></span><button class="soft condic" data-a="staskback" data-ref="${x.k}" aria-label="Bring back ${esc(I(x.k).name)}" title="Bring back">${icon('archive-arrow-up', 18)}</button></div>`;
  const fp = finishedProjects();
  const pRow = ({ p, h }) => `<div class="tg cond arch"><button class="l" data-a="archgo" data-v="proj" data-ref="${p}" style="text-align:left">${esc(G(p).name)}<small>${esc(G(h).name)} · finished ${esc(fmtDate(G(p).done))}</small></button><button class="soft condic" data-a="projback" data-ref="${p}" aria-label="Bring back ${esc(G(p).name)}" title="Bring back">${icon('archive-arrow-up', 18)}</button></div>`;
  const h = (st.length ? lcard('ar:study', 'Finished study tasks', st.length, `<div class="hlist">${st.map(sRow).join('')}</div>`) : '') + (fp.length ? lcard('ar:proj', 'Finished projects', fp.length, `<div class="hlist">${fp.map(pRow).join('')}</div>`) : '') + (ap.length ? lcard('ar:ap', 'Past appointments', ap.length, ap.map(apRow).join('')) : '') + (cs.length ? lcard('ar:cond', 'Conditions', cs.length, `<div class="hlist">${cs.map(cRow).join('')}</div>`) : '') + (ah.length ? lcard('ar:hob', 'Hobbies', ah.length, `<div class="hlist">${ah.map(hRow).join('')}</div>`) : '') + (dx.length ? lcard('ar:trip', 'Done expeditions', dx.length, dx.map(xRow).join('')) : '');
  return h || '<p class="empty">Nothing archived.</p>'; }
function blkSheet() { const b = S.sheet.back || {}; return `<div class="blkpick">${blockIds().map((k) => [k, G(k).name, G(k).icon]).map(([k, n, ic]) => `<button data-a="dblkpick" data-v="${k}" aria-pressed="${b.block === k}">${icon(ic || 'clock', 20)}<span>${esc(n)}</span>${b.block === k ? icon('check', 18, 2) : ''}</button>`).join('')}</div>`; }
// sessions list under Time and length (2026-11-06): pick a day, a length and maybe a time, then + adds it here
function sessList(s, D) { const P = s.parts || (s.parts = []); if (!P.length) return ''; const est = Math.round((D.est || 0) * 60); const planned = P.reduce((a, x) => a + (+x.min || 0), 0); const left = est - planned;
  const note = !est ? `${estHM(planned / 60)} planned` : left > 0 ? `${estHM(left / 60)} left to plan` : left < 0 ? `${estHM(-left / 60)} more than the estimate` : `All ${estHM(est / 60)} planned`;
  return `<div class="sesslist">${P.slice().map((x, i) => [x, i]).sort((a, b) => (a[0].date || '').localeCompare(b[0].date || '') || (a[0].time || '').localeCompare(b[0].time || '')).map(([x, i]) => `<div class="sessrow"><span class="l">${esc(fmtDate(x.date))}${x.time ? ' · ' + esc(x.time) : ''}</span><span class="m">${estHM((+x.min || 0) / 60)}</span><button class="rm" data-a="dpart-rm" data-v="${i}" aria-label="Remove the session on ${esc(fmtDate(x.date))}">✕</button></div>`).join('')}<small class="note">${note}</small></div>`; }
// planned prep can have sub-tasks, like Pizza › Dough (2026-11-06); they're stored like a routine's steps
const isChoreSheet = (s) => !!((s.home && (s.home === 'g-oneoff' || (G(s.home) && G(s.home).style === 'room'))) || (s.ref && typeof choreIds === 'function' && choreIds().includes(s.ref)));
const isPrep = (s) => s.home === 'g-prep' || !!(s.ref && G('g-prep') && G('g-prep').kids.includes(s.ref));
const subField = (s) => `<div class="fld"><span class="mono">Sub-tasks</span>${(s.steps || []).map((x, i) => `<div class="inrow"><input class="inp" data-step="${i}" value="${esc(x.name)}" placeholder="Like making the dough"><button class="rm" data-a="dstep-rm" data-v="${i}" aria-label="Remove sub-task">✕</button></div>`).join('')}<button class="addbtn" data-a="dstep-add">+ Add sub-task</button></div>`;
function itemSheet(s) {
  const D = s.draft; const w = D.when || {};
  if (s.quick && areaItem(s.ref)) return `<div class="qhead"><p class="note">${esc(D.name)}<span style="display:block;font-size:13px;color:var(--quiet)">${esc(areaItem(s.ref))}${whenText(D) ? ' · ' + esc(whenText(D)) : ''}</span></p>${isStudyItem(s, D) ? estIn(D) : ''}</div>` + schedUI(s, D) + (s.ref && I(s.ref) ? whenDidI() : '') + `<div class="btns"><button class="btn" data-a="dmore">More settings</button></div>`;
  if (s.quick) return `<div class="qhead"><p class="note">${esc(D.name)}</p>${isStudyItem(s, D) ? estIn(D) : ''}</div>` + schedUI(s, D) + (isPrep(s) ? subField(s) : '') + (s.ref && I(s.ref) && !s.isNew ? whenDidI() : '') + `<div class="btns"><button class="btn" data-a="dmore">More settings</button></div>`;
  let h = `<div class="fld"><span class="mono">Name</span>${D.type !== 'appt' && D.type !== 'checkin' && D.type !== 'step' && (D.est != null || isStudyItem(s, D)) ? `<div class="inrow"><input class="inp" id="dname" value="${esc(D.name)}" ${s.isNew ? 'data-autofocus' : ''}>${estIn(D)}</div>` : `<input class="inp" id="dname" value="${esc(D.name)}" ${s.isNew ? 'data-autofocus' : ''}>`}</div>`;
  if (D.type === 'appt') {
    h += `<div class="fld"><span class="mono">When</span><input class="inp" type="date" id="ddate" value="${D.date || T0}"><div class="inrow" style="margin-top:8px;align-items:center"><input class="inp" type="time" id="dtime" value="${D.time || ''}" aria-label="From" style="flex:1;min-width:0"><span class="mono" aria-hidden="true">–</span><input class="inp" type="time" id="dend" value="${apEnd(D)}" aria-label="Until" style="flex:1;min-width:0"></div></div>
      ${freqUI(s, D)}
      <div class="fld"><span class="mono">Note</span><input class="inp" id="dnote" value="${esc(D.note || '')}" placeholder="Bring the letter, reminder…"></div>
      <div class="fld"><span class="mono">Category</span><div class="chips">${G('g-appts').kids.filter(G).map((c) => `<button class="chip" style="--c:${G(c).color}" data-a="dset" data-k="cat" data-v="${c}" aria-pressed="${s.cat === c}"><span class="d"></span>${esc(G(c).name)}</button>`).join('')}</div></div>`;
  } else if (D.type !== 'checkin' && D.type !== 'step') {
    h += schedUI(s, D);
    if (D.brk) { h += `<div class="fld"><span class="mono">Icon</span><div><button class="btn" data-a="iconfor" data-v="draft" style="display:inline-flex;gap:8px;align-items:center">${icon(D.icon || 'coffee', 18)}Change</button></div></div>`; if (s.ref && !s.isNew) h += `<div class="btns"><button class="btn danger" data-a="ddelete">Delete</button></div>`; return h; } // a break: a name, its time and length, its days
    if (D.type === 'task' || D.type === 'routine') h += (isTrainSheet(s) ? afterField(D) : '') + sw('optional', 'Optional', D.optional) + ((D.when || {}).mode === 'once' ? sw('persist', 'Persistent', D.persist) : '')
      + (D.type === 'task' && isChoreSheet(s) ? sw('two', 'Two parts', D.two) + (D.two ? `<div class="fld"><span class="mono">Second part after</span><div class="inrow"><input class="inp" id="dtwo" inputmode="decimal" value="${typeof D.two === 'number' ? D.two : 2}" style="width:80px"><span class="note" style="margin:0">hours</span></div></div>` : '') : '');
    // study items: everything under Estimate waits behind More settings too (2026-11-06)
    if (isStudyItem(s, D)) s._more = h.length;
    if (isPrep(s)) { h += subField(s); s._more = h.length; }
    // a routine is a task with steps, added in More settings (2026-11-08)
    if (D.type === 'routine' || (D.type === 'task' && !isPrep(s) && !isStudyItem(s, D) && !D.part)) h += `<div class="fld"><span class="mono">Steps</span>${(s.steps || []).map((x, i) => `<div class="inrow">${x.link ? `<span class="inp steplink">${icon('link', 15)} ${esc(x.name)}</span>` : `<input class="inp" data-step="${i}" value="${esc(x.name)}">`}<button class="hb" data-a="dstep-open" data-v="${i}" aria-label="Options for this step" aria-expanded="${s.stepOpen === i}">${icon('sliders-horizontal', 18)}</button><button class="rm" data-a="dstep-rm" data-v="${i}" aria-label="Remove step">✕</button></div>${s.stepOpen === i ? stepOpts(x, i) : (x.optional || x.only) ? `<p class="mono stepnote">${esc([x.optional ? 'Optional' : '', { rest: 'Days without a workout', train: 'Days with a workout', days: (x.days || []).slice().sort().map((k) => WD[k]).join(', ') }[x.only] || ''].filter(Boolean).join(' · '))}</p>` : ''}`).join('')}<button class="addbtn" data-a="dstep-add"><span class="plus">+</span>Add step</button>${partPick(s)}</div>`;
  }
  // every item editor is the same shape (2026-11-10: clean up the editing menus): name, when, length, frequency, steps; the look, kind, tags and reminders wait behind More settings
  if (s._more == null && D.type !== 'checkin') s._more = h.length;
  if (D.type !== 'checkin') {
    h += `<div class="fld"><span class="mono">Colour and icon</span>${colorField('draft', D.color, { inherit: true })}<div><button class="btn" data-a="iconfor" data-v="draft" style="display:inline-flex;gap:8px;align-items:center">${icon(D.icon || (D.type === 'appt' && G(s.cat) ? G(s.cat).icon : 'circle'), 18)} Change icon</button></div></div>`;
    if (D.type !== 'appt') {
    h += `<div class="fld"><span class="mono">Kind</span><div class="chips">${[['', 'None'], ['behaviour', 'Behaviour'], ['experience', 'Experience'], ['circumstance', 'Circumstance']].map(([k, l]) => `<button class="chip" data-a="dset" data-k="kind" data-v="${k}" aria-pressed="${(D.kind || '') === k}">${l}</button>`).join('')}</div>${D.kind === 'behaviour' ? sw('unwanted', 'Unwanted', D.unwanted, 'Behaviour I want less of') : ''}</div>`;
    h += tagField(D, 'dtag'); h += linkField2(D);
    }
  }
  if (s.ref && I(s.ref) && !s.isNew) h += remField(s.ref);
  // no "Appears in": the day block button shows where it sits (2026-11-08)
  // prep: everything under Sub-tasks waits behind More settings (2026-11-06)
  if (s._more != null) { const rest = h.slice(s._more); h = h.slice(0, s._more) + `<button class="moreset" data-a="dmoreset" aria-expanded="${!!s.moreOpen}">More settings${fold(s.moreOpen)}</button>` + (s.moreOpen ? rest : ''); delete s._more; }
  if (!s.isNew && D.type !== 'checkin') h += `<div class="btns"><button class="btn danger" data-a="ddelete">Delete</button></div>`;
  return h;
}
// Scheduling, like Super Productivity: quick dates, a month to pick from, and repeat rules.
const nextMon = () => addDays(weekStart(T0), 7);
const nextMonth = () => { const a = parse(T0); return iso(new Date(a.getFullYear(), a.getMonth() + 1, 1)); }; // the 1st (2026-11-02)
function schedUI(s, D) {
  const w = D.when || (D.when = { mode: 'once', date: null }); const rep = w.mode !== 'once'; const picked = w.date || null;
  const q = [['today', 'Today', T0, 'sun'], ['tomorrow', 'Tomorrow', addDays(T0, 1), 'sunrise'], ['week', 'Next week', nextMon(), 'calendar-plus'], ['month', 'Next month', nextMonth(), 'calendar-range']];
  const cm = s.calM || (picked || T0).slice(0, 7); const [y, m] = cm.split('-').map(Number); const first = iso(new Date(y, m - 1, 1));
  let wk = weekStart(first); const weeks = []; while (weeks.length < 6 && (weeks.length === 0 || wk.slice(0, 7) <= cm)) { weeks.push(wk); wk = addDays(wk, 7); }
  // Miss (2026-11-02): a repeat counts today as not done; a one-off goes back to Not scheduled
  const canMiss = !s.isNew && s.ref && I(s.ref) && placeDay(T0).some((o) => o.id === s.ref) && !isDone(s.ref, T0);
  let h = `<div class="fld"><div class="qd">${q.filter(([k]) => k !== 'miss' || canMiss).map(([k, l, d, ic]) => k === 'miss' ? `<button data-a="dmiss">${icon(ic, 18)}<span>${l}</span><small>${rep ? 'Not done' : 'Unschedule'}</small></button>` : `<button data-a="dq" data-v="${d}" aria-pressed="${picked === d}">${icon(ic, 18)}<span>${l}</span><small>${esc(fmtDate(d))}</small></button>`).join('')}</div>
    <div class="mcal"><div class="calnav"><button data-a="dcalm" data-v="-1" aria-label="Previous month">‹</button><span>${MONTHS[m - 1]} ${y}</span><button data-a="dcalm" data-v="1" aria-label="Next month">›</button></div>
      <div class="wk wkh"><span></span>${WD.map((x) => `<span>${x.toUpperCase()}</span>`).join('')}</div>
      ${weeks.map((wk0) => `<div class="wk"><span class="wkn">${isoWeek(wk0)}</span>${[0, 1, 2, 3, 4, 5, 6].map((k) => { const d = addDays(wk0, k); return `<button class="day ${d === picked ? 'sel' : ''} ${d === T0 ? 'today' : ''} ${d.slice(0, 7) === cm ? '' : 'out'}" data-a="dq" data-v="${d}" ${d < T0 ? 'disabled' : ''}><span class="n">${parse(d).getDate()}</span></button>`; }).join('')}</div>`).join('')}</div>
</div>`;
  if (D.type !== 'appt') h += `<div class="fld"><span class="mono">Time and length</span><div class="inrow"><input class="inp" type="time" id="dtime" value="${D.time || ''}" aria-label="Time (optional)">${durIn(D)}${blkBtn(s)}${isStudyItem(s, D) ? `<button class="plusic" data-a="dpart-add" aria-label="Add this day as a session">${icon('plus', 20)}</button>` : ''}</div>${isStudyItem(s, D) ? sessList(s, D) : ''}</div>`;
  const R0 = w.mode === 'once' ? 'none' : w.mode === 'days' && (w.days || []).length === 7 && (w.n || 1) === 1 ? 'daily' : w.mode === 'days' ? 'weekly' : w.mode;
  // Repeat (2026-11-03): just Never and Repeat; Repeat opens the kinds of repeat underneath
  const ropen = rep || s.repOpen;
  // Frequency lives only under More settings, not in the quick Schedule pop-up (2026-11-03)
  if (s.quick) return h;
  return h + freqUI(s, D);
}
// Frequency, the same for every item (2026-11-04): tasks, routines, Home and Study items, appointments
function freqUI(s, D) {
  if (D.type === 'appt' && !D.when) D.when = apptWhen(D);
  const w = D.when || (D.when = { mode: 'once', date: null }); const rep = w.mode !== 'once';
  const R0 = w.mode === 'once' ? 'none' : w.mode === 'days' && (w.days || []).length === 7 && (w.n || 1) === 1 ? 'daily' : w.mode === 'days' ? 'weekly' : w.mode;
  const ropen = rep || s.repOpen; let h = '';
  h += `<div class="fld"><span class="mono">Frequency</span><div class="chips"><button class="chip" data-a="drule" data-v="none" aria-pressed="${!ropen}">None</button><button class="chip" data-a="drepopen" aria-pressed="${!!ropen}">${icon('repeat', 14, 2)} Repeat</button></div>
    ${ropen ? `<div class="seg">${[['daily', 'Daily'], ['weekly', 'Weekly'], ['month', 'Monthly'], ['year', 'Yearly'], ['every', 'After done']].map(([k, l]) => `<button class="chip" data-a="drule" data-v="${k}" aria-pressed="${R0 === k}">${l}</button>`).join('')}</div>` : ''}
    ${R0 === 'weekly' ? `<div class="seg">${WD.map((x, k) => `<button class="chip" data-a="dday" data-v="${k}" aria-pressed="${(w.days || []).includes(k)}" aria-label="${x}">${x.slice(0, 2)}</button>`).join('')}</div>` : ''}
    ${['weekly', 'month', 'year', 'every'].includes(R0) ? `<div class="inrow"><span>Every</span><input class="inp" type="number" min="1" id="dn" value="${w.n || 1}" style="width:72px"><span>${{ weekly: 'weeks', month: 'months', year: 'years', every: 'days after it\'s done' }[R0]}</span></div>` : ''}
    ${rep && w.date && D.type !== 'appt' ? `<p class="note">Starts ${esc(fmtDate(w.date))}</p>` : ''}</div>`;
  return h;
}
// an old appointment repeat ({n, unit}) as a Frequency rule
function apptWhen(D) { const r = D.rep, d = D.date || T0; if (!r) return { mode: 'once', date: d }; const n = Math.max(1, r.n || 1);
  if (r.unit === 'week') return { mode: 'days', days: [wd(d)], n, date: d }; if (r.unit === 'month') return { mode: 'month', n, date: d };
  return n === 1 ? { mode: 'days', days: [0, 1, 2, 3, 4, 5, 6], n: 1, date: d } : { mode: 'every', n, date: d }; }
// whatever pop-up is open, keep what is typed in it before it is drawn again (a New tag box used to wipe a word's text)
function capAll() { const s = S.sheet; if (!s) return; try { const k = s.kind; if (k === 'item') capture(); else if (k === 'word') wCapture(); else if (k === 'note') ncapture(); else if (k === 'rem') remCapture(); else if (k === 'trip') tripCapture(); else if (k === 'cond') condCapture(); else if (k === 'tracker') tcapture(); else if (k === 'photo') mcapture(); } catch (e) {} }
function capture() { const s = S.sheet; if (!s || s.kind !== 'item') return; const D = s.draft;
  const g = (id) => document.getElementById(id); if (g('dname')) D.name = g('dname').value.trim() || D.name;
  if (g('ddate') && D.type === 'appt') { D.date = g('ddate').value || T0; if (D.when) D.when.date = D.date; }
  if (g('dn') && D.when) D.when.n = Math.max(1, parseInt(g('dn').value) || 1);
  if (g('dtime')) { if (g('dtime').value) D.time = g('dtime').value; else delete D.time; }
  if (g('dnote')) D.note = g('dnote').value.trim();
  if (g('drepn') && D.rep) D.rep.n = Math.max(1, parseInt(g('drepn').value) || 1);
  if (g('dtwo') && D.two) { const n = parseFloat(g('dtwo').value.replace(',', '.')); D.two = n > 0 ? n : 2; }
  if (g('dend')) { const e = g('dend').value; if (D.time && e) { let m = hm(e) - hm(D.time); if (m <= 0) m += 1440; D.dur = m; } else delete D.dur; }
  if (g('ddur')) { const v = g('ddur').value.trim(); const m = /^\d+$/.test(v) ? +v : Math.round(parseHM(v) * 60); D.dur = m > 0 ? m : (D.dur || 30); }

  if (g('dest')) D.est = Math.max(0, Math.round(parseHM(g('dest').value) * 60) / 60);
  document.querySelectorAll('[data-step]').forEach((el) => { s.steps[+el.dataset.step].name = el.value; });
}
function openItem(id) { const it = I(id); if (!it) return; if (it.type === 'step') { const r = placements(id)[0]; if (r) id = r.slice(2); } if (it.part && I(it.part)) id = it.part;
  const x = I(id); openSheet({ kind: 'item', ref: id, title: x.type === 'appt' ? 'Appointment' : x.type === 'routine' ? 'Routine' : x.type === 'checkin' ? 'Check-in' : 'Task', draft: JSON.parse(JSON.stringify(x)), block: placements(id).find((p) => G(p) && G(p).style === 'dayblock') || (vHomed({ ref: id }) ? '' : blockOfItem(id)), cat: catOf(id), parts: (x.parts || []).filter(I).map((p) => Object.assign({ id: p, date: (I(p).when || {}).date, min: I(p).dur || 30 }, I(p).time ? { time: I(p).time } : {})), steps: (x.steps || []).filter(I).map((s) => { const o = pOpt(id, s); return { id: s, name: I(s).name, link: isLinkPart(s), optional: !!o.optional, only: o.only || '', days: (o.days || []).slice(), tags: (I(s).tags || []).slice() }; }) }); }
function newItem(mode, block) {
  // Breaks (2026-11-11): a named stretch of a day block, like Lunch. It takes up time but there's nothing to tick.
  if (mode === 'break') { openSheet({ kind: 'item', isNew: true, title: 'New break', draft: { name: '', brk: true, type: 'task', when: { mode: 'days', days: [0, 1, 2, 3, 4, 5, 6], n: 1, date: T0 }, made: T0, dur: 15, tags: [] }, block: block || blockIds()[0], steps: [] }); return; }
  const D = { name: '', type: mode === 'routine' ? 'routine' : 'task', when: mode === 'every' ? { mode: 'every', n: 1, date: T0 } : mode === 'routine' ? { mode: 'once', date: T0 } : { mode: 'once', date: mode === 'once' && S.page === 'plan' ? null : T0 }, kind: 'behaviour', tags: [], insight: mode !== 'once', made: T0, dur: 30 };
  openSheet({ kind: 'item', isNew: true, title: mode === 'routine' ? 'New routine' : mode === 'every' ? 'New repeat task' : 'New task', draft: D, block: block || blockIds()[blockIds().length - 1], steps: [] });
}
function newAppt(pick) { const cat = pick && G(pick) ? pick : S.cat !== 'all' && G(S.cat) ? S.cat : G('g-appts').kids[0];
  openSheet({ kind: 'item', isNew: true, title: 'New ' + (G(cat) ? G(cat).name.toLowerCase().replace(/s$/, '') : 'appointment'), draft: { name: '', type: 'appt', date: S.day >= T0 ? S.day : T0, time: '', note: '', kind: '', tags: [], insight: false, made: T0 }, cat }); }
function saveDraft() {
  const s = S.sheet; capture(); const D = s.draft; if (!D.name) { flash('Give it a name first'); return; }
  if (D.type === 'appt' && D.when) { delete D.rep; if (D.when.mode === 'once') delete D.when; }
  change(() => {
    let id = s.ref;
    if (s.isNew) { id = uid('i'); M.items[id] = D; if (s.home && G(s.home)) G(s.home).kids.push(id); }
    else { const old = I(id); // keep the old repeat rule for the days it covered, so past days still show what was planned then
      if (old && old.when && JSON.stringify(old.when) !== JSON.stringify(D.when) && (old.made || T0) < T0) D.past = (old.past || []).concat([{ until: addDays(T0, -1), when: old.when }]);
      M.items[id] = D; }
    if (D.type === 'task' && !isPrep(s) && !isStudyItem(s, D) && !D.part && (s.steps || []).some((x) => x.name.trim())) { D.type = 'routine'; }
    if (D.type === 'routine' || (isPrep(s) && s.steps)) { D.partOpt = {}; D.steps = s.steps.filter((x) => x.name.trim()).map((x) => { if (x.link && x.id && I(x.id)) { const o = {}; if (x.optional) o.optional = true; if (x.only) { o.only = x.only; if (x.only === 'days') o.days = (x.days || []).slice(); } if (Object.keys(o).length) D.partOpt[x.id] = o; return x.id; } const sid = x.id && I(x.id) ? x.id : uid('s'); const st = M.items[sid] = Object.assign(I(sid) || { type: 'step', kind: 'behaviour', tags: [], insight: true }, { name: x.name.trim() });
      if (x.optional !== undefined) { if (x.optional) st.optional = true; else delete st.optional; } if (x.only !== undefined) { if (x.only) st.only = x.only; else delete st.only; if (x.only === 'days') st.days = (x.days || []).slice(); else delete st.days; } if (x.tags) st.tags = x.tags.slice(); return sid; }); }
    if (s.parts) { const old = (D.parts || []).slice(), keep = []; const blk = (s.block && G(s.block)) ? s.block : studyBlock();
      s.parts.filter((x) => x.date).forEach((x) => { const pid = x.id && I(x.id) ? x.id : uid('p');
        const P = Object.assign(I(pid) || { type: 'task', kind: 'behaviour', tags: [], insight: false, made: T0 }, { name: D.name, part: id, when: { mode: 'once', date: x.date }, dur: +x.min || 30 }); if (x.time) P.time = x.time; else delete P.time;
        P.icon = D.icon || 'book-open'; M.items[pid] = P; if (!G(blk).kids.includes(pid)) { Object.values(M.groups).forEach((g) => { if (g.style === 'dayblock') g.kids = g.kids.filter((k) => k !== pid); }); G(blk).kids.push(pid); } keep.push(pid); });
      old.filter((p) => !keep.includes(p)).forEach((p) => { Object.values(M.groups).forEach((g) => { g.kids = g.kids.filter((k) => k !== p); }); delete M.items[p]; });
      if (keep.length) D.parts = keep; else delete D.parts;
      keep.forEach((p) => { M.items[p].color = colorOf(id); }); }
    if (D.type === 'appt') { const cur = catOf(id); if (cur !== s.cat) { if (cur) G(cur).kids = G(cur).kids.filter((k) => k !== id); G(s.cat).kids.push(id); } }
    else if (D.type !== 'checkin' && D.type !== 'step') { const cur = placements(id).find((p) => G(p) && G(p).style === 'dayblock'); if (cur !== s.block) { if (cur) G(cur).kids = G(cur).kids.filter((k) => k !== id); if (s.block && G(s.block)) G(s.block).kids.push(id); } }
  }, (s.isNew ? 'Added ' : 'Saved ') + D.name, !s.isNew);
  S.sheet = null; render();
}

// ---------- adding and removing on the page ----------
function focusName(ref) { requestAnimationFrame(() => { const el = document.querySelector(`[data-nm="${ref}"]`); if (el) { el.scrollIntoView({ block: 'center' }); el.focus(); const r = document.createRange(); r.selectNodeContents(el); const sl = getSelection(); sl.removeAllRanges(); sl.addRange(r); } }); }
function removeRef(ref, list, everywhere) {
  const name = (I(ref) || G(ref) || {}).name || 'it';
  change(() => {
    if (everywhere) { Object.values(M.groups).forEach((g) => { g.kids = g.kids.filter((k) => k !== ref); }); Object.values(M.items).forEach((r) => { if (r.steps) r.steps = r.steps.filter((k) => k !== ref); }); }
    else if (list.startsWith('s:')) I(list.slice(2)).steps = I(list.slice(2)).steps.filter((k) => k !== ref);
    else G(list).kids = G(list).kids.filter((k) => k !== ref);
    if (S.cat === ref) S.cat = 'all';
  }, (everywhere ? 'Deleted ' : 'Removed ') + name);
}

// ---------- events ----------
let suppress = false;
document.addEventListener('click', (e) => {
  if (suppress) { suppress = false; e.preventDefault(); e.stopPropagation(); return; }
  const t = e.target;
  if (S.edit && t.closest('[data-nm]')) return;
  const ic = S.edit && t.closest('[data-ic]'); if (ic) { const r = ic.dataset.ic; if (r.startsWith('a:')) openSheet({ kind: 'area', ref: r.slice(2), title: 'Area' }); else openSheet({ kind: 'icon', ref: r, title: 'Choose an icon' }); return; }
  const co = S.edit && t.closest('[data-col]'); if (co) { S.sheet = S.sheet && S.sheet.kind === 'cals' ? S.sheet : null; openColorPick(co.dataset.col, !!I(co.dataset.col)); return; }
  if (t.closest('#menubtn')) { S.menu = !S.menu; renderLayer(); return; }
  if (t.closest('#donebtn')) { S.edit = false; render(); return; }
  if (t.closest('#plusbtn')) { openSheet({ kind: 'add', title: 'Capture', capEdit: !!S.edit }); return; }
  const ar = t.closest('[data-area]'); if (ar) { const a = ar.dataset.area; if (S.insOn || S.area !== a || M.areas[a].nav === 'verdict' || a === 'notebook') { S.nbView = 'home'; S.jFrom = null; S.jNewTags = null; S.insOn = false; S.insDrop = false; S.area = a; S.page = M.areas[a].pages[0] || null; S.room = null; S.subj = null; S.pick = null; S.stv = null; S.vdrop = false; S.fromSlot = null; render(); $('#main').scrollTop = 0; } return; }
  const pg = t.closest('[data-page]'); if (pg) { S.page = pg.dataset.page; if (S.page === 'insight') S.ins = 'home'; S.insDrop = false; render(); $('#main').scrollTop = 0; return; }
  const a = t.closest('[data-a]'); if (!a) return;
  if ((a.classList.contains('scrim') || a.classList.contains('askwrap')) && t !== a) return;
  const act = a.dataset.a, ref = a.dataset.ref, v = a.dataset.v;
  if (act === 'askno') { S.ask = null; renderLayer(); return; }
  if (act === 'askyes') { const q = S.ask; S.ask = null; renderLayer(); const el = document.createElement('button'); Object.assign(el.dataset, q.data, { ok: '1' }); el.hidden = true; $('#layer').appendChild(el); el.click(); el.remove(); return; }
  if (S.sheet && S.sheet.kind === 'add' && ['hobnewtask', 'pnnew', 'pjbnew', 'hobnewproj', 'hobnewact', 'nnew', 'jnew', 'bnew'].includes(act)) { S.sheet = null; renderLayer(); } // the + pop-up hands over to what I picked
  if (!a.dataset.ok) { const q = askDelete(act, a, ref, v); if (q) { S.ask = Object.assign(q, { data: Object.assign({}, a.dataset) }); const hadM = S.bMenu || S.jMenu || S.wMenu; S.bMenu = false; S.jMenu = false; S.wMenu = false; if (hadM) render(); else renderLayer(); return; } }
  if (['dnewtag', 'ptagadd', 'ctagnew', 'nnewtag', 'jnewtag', 'hevadd', 'hcondadd'].includes(act)) S.openAdd = null; // the box closes again once used
  if (colorAction(act, a, v)) return;
  if (healthAction(act, a, ref, v)) return;
  if (verdictAction(act, a, ref, v)) return;
  if (shopAction(act, a, ref, v)) return;
  if (hostAction(act, a, ref, v)) return;
  if (hobAction(act, a, ref, v)) return;
  if (boardAction(act, a, ref, v)) return;
  if (notebookAction(act, a, ref, v)) return;
  if (wordAction(act, a, ref, v)) return;
  if (remAction(act, a, ref, v)) return;
  if (insightAction(act, a, ref, v)) return;
  if (trainingAction(act, a, ref, v)) return;
    if (markAction(act, a, ref, v)) return;
    if (calAction(act, a, ref, v)) return;
    if (condAction(act, a, ref, v)) return;
  switch (act) {
    case 'pdjopen': S.area = 'notebook'; S.insOn = false; notebookAction('jopen', a, ref, v); break;
    case 'pdbopen': S.area = 'notebook'; S.insOn = false; S.nbView = 'home'; boardAction('bdopen', a, ref, v); render(); break;
    case 'openadd': capAll(); S.openAdd = v; render(); { const el = document.getElementById(v); if (el) { el.focus(); el.scrollIntoView({ block: 'nearest' }); } } break;
    case 'slotadd': slotAdd(v); break;
    case 'slotrm': slotRm(ref); break;
    case 'slotopt': change(() => { const it = I(ref); if (it.optional) delete it.optional; else it.optional = true; }); break;
    case 'vdefblk': change(() => { (M.settings.defBlock = M.settings.defBlock || {})[ref] = v; }); break;
    case 'newpick': if (S.sheet) { S.sheet.pickTask = true; S.sheet.title = 'Task'; renderLayer(); } break;
    case 'addstudy': { const gs = (S.subj && G(S.subj) ? [S.subj] : subjIds()).flatMap(sgroupsOf); if (gs.length === 1) vNew(gs[0]); else { S.sheet.pickStudy = true; S.sheet.title = 'Study task'; renderLayer(); } break; }
    case 'addcond': openSheet({ kind: 'cond', isNew: true, ref: uid('c'), title: 'New condition', draft: { name: '', start: T0, tags: ['ct-ill'].filter(ctag) } }); break;
    case 'addev': { S.sheet = null; const pg = Object.keys(M.groups).find((k) => (G(k).kids || []).includes('ht-events')); if (pg) { S.htab[pg] = G(pg).kids.filter(G).indexOf('ht-events'); S.open['h:' + pg] = true; } S.day = T0; render(); } { const ev = $('#hev'); if (ev) { ev.scrollIntoView({ block: 'center' }); ev.focus(); } } break;
    case 'gohealth': S.sheet = null; S.area = 'health'; S.page = 'health'; render(); $('#main').scrollTop = 0; break;
    case 'closemenu': S.menu = false; renderLayer(); break;
    case 'toggleedit': S.menu = false; S.edit = !S.edit; render(); break;
    case 'doneedit': S.edit = false; render(); break;
    case 'closesheet': closeSheet(); break;
    case 'histundo': histStep(true); break;
    case 'histredo': histStep(false); break;
    case 'undo': { const u = S.toast && S.toast.undo; S.toast = null; clearTimeout(S.tt); if (u) u(); renderLayer(); break; }
    case 'showmoved': S.showMoved = !S.showMoved; render(); break;
    case 'badmode': { S.menu = false; const on = !isBad(T0); change(() => { M.badDays = M.badDays || {}; if (on) M.badDays[T0] = true; else delete M.badDays[T0]; }, on ? 'Bad day · the rest moves to the next normal day' : 'Normal day again'); S.day = T0; break; }
    case 'askblank': openSheet({ kind: 'confirm', title: 'Start empty?', msg: 'This removes the example items and ticks. Day blocks, categories and the two check-ins stay.', yes: 'doblank', yesLabel: 'Start empty' }); break;
    case 'askseed': openSheet({ kind: 'confirm', title: 'Put back the examples?', msg: 'This replaces everything with the example items again.', yes: 'doseed', yesLabel: 'Put them back' }); break;
    case 'doblank': S.sheet = null; M = blank(); save(); render(); flash('Started empty'); break;
    case 'doseed': S.sheet = null; M = seed(); freezePast(); save(); render(); flash('Examples are back'); break;
    case 'pickday': if (a.dataset.c === 'x') { const t = tripsOn(v)[0]; if (t) { trainingAction('tripopen', a, t.id); break; } S.xday = S.xday === v && v !== T0 ? T0 : v; render(); break; }
      if (a.dataset.c === 'f') { S.fday = S.fday === v && v !== T0 ? T0 : v; render(); break; } if (a.dataset.c === 's') { if (S.sview === 'day' && S.sday === v) S.sview = 'week'; else { S.sday = v; S.sview = 'day'; } render(); break; } if (S.day === v && v !== T0) S.day = T0; else S.day = v; render(); break;
    case 'pickweek': S.sday = weekStart(v) <= T0 && T0 < addDays(weekStart(v), 7) ? T0 : v; S.sview = 'week'; render(); break;
    case 'calmode': if (a.dataset.c === 'x') { S.xmonth = !S.xmonth; if (!S.xmonth) S.xday = T0; S.xmonthOf = (S.xday || T0).slice(0, 7); render(); break; }
      if (a.dataset.c === 'f') { S.fmonth = !S.fmonth; if (!S.fmonth) S.fday = T0; S.fmonthOf = (S.fday || T0).slice(0, 7); render(); break; } if (a.dataset.c === 's') { S.smonth = !S.smonth; if (!S.smonth) S.sday = T0; S.smonthOf = S.sday.slice(0, 7); } else { S.month = !S.month; if (!S.month) S.day = T0; S.monthOf = S.day.slice(0, 7); } render(); break;
    case 'month': { const k = a.dataset.c === 's' ? 'smonthOf' : a.dataset.c === 'f' ? 'fmonthOf' : a.dataset.c === 'x' ? 'xmonthOf' : 'monthOf'; S.fmonthOf = S.fmonthOf || T0.slice(0, 7); S.xmonthOf = S.xmonthOf || T0.slice(0, 7); const [y, m] = S[k].split('-').map(Number); const d = new Date(y, m - 1 + (+v), 1); S[k] = iso(d).slice(0, 7); render(); break; }
    case 'secopen': S.open[ref] = S.open[ref] === false; render(); break;
    case 'peek': openSheet({ kind: 'peek', ref, d: a.dataset.d || T0, from: a.dataset.from, to: a.dataset.to, title: I(ref).name }); break;
    case 'addtick': S.sheet = null; tick(ref); break;
    case 'addset': { S.sheet = null; const cur = val(T0, ref); const nv = /^\d+$/.test(v) ? +v : v; change(() => { if (String(cur) === String(nv)) delete L(T0)[ref]; else L(T0)[ref] = nv; }, (String(cur) === String(nv) ? 'Cleared ' : 'Logged ') + I(ref).name); break; }
    case 'peektick': { const s = S.sheet; S.sheet = null; tick(s.ref); break; }
    case 'peekedit': { const s = S.sheet; S.sheet = null; openItem(s.ref); break; }
    case 'drep': capture(); if (v) S.sheet.draft.rep = { n: (S.sheet.draft.rep || {}).n || 1, unit: v }; else delete S.sheet.draft.rep; renderLayer(); break;
    case 'week': S.day = addDays(S.day, +v); render(); break;
    case 'planfopen': S.planFOpen = !S.planFOpen; render(); break;
    case 'planf': S.planF = v; S.planFOpen = false; render(); break;
    case 'planaddopen': S.planAddOpen = !S.planAddOpen; render(); break;
    case 'gotoday': S.day = v; S.page = 'today'; render(); break;
    case 'bopen': S.open['b:' + ref] = S.open['b:' + ref] === false; render(); break;
    case 'ropen': if (!S.edit) { const d = S.day; const was = routineOpen(ref, d); M.rOpen = { [d]: Object.assign({}, (M.rOpen || {})[d], { [ref]: !was }) }; save(); render(); } break;
    case 'darkmode': darkOn = !darkOn; try { localStorage.setItem('daybook3-dark', darkOn ? '1' : '0'); } catch (e) { /* no storage */ } applyTheme(); render(); renderLayer(); dkPass(document.body); break;
    case 'showdone': S.showDone = !S.showDone; render(); break;
    case 'showmissed': S.showMissed = !S.showMissed; render(); break;
    case 'miss': { const d = a.dataset.d || T0; S.sheet = null; change(() => { M.missed = M.missed || {}; (M.missed[d] = M.missed[d] || {})[ref] = true; }, 'Missed: ' + I(ref).name); break; }
    case 'unmiss': { const d = a.dataset.d || T0; change(() => { delete M.missed[d][ref]; }, 'Put back ' + I(ref).name); break; }
    case 'tick': tick(ref); break;
    case 'twoyes': S.sheet = null; twoFinish(ref); break;
    case 'step': { const it = I(ref); const was = val(T0, ref); change(() => { if (was) delete L(T0)[ref]; else { L(T0)[ref] = 'done'; if (M.missed && M.missed[T0]) delete M.missed[T0][ref]; } }, was ? 'Unticked ' + it.name : null); break; }
    case 'checkin': openSheet({ kind: 'checkin', ref, title: I(ref).name }); break;
    case 'cidone': { const was = val(T0, v); change(() => { if (was) { delete L(T0)[v]; if (I(v).which === 'morning') delete L(T0)['ci-mfeel']; } else L(T0)[v] = 'done'; }, was ? 'Check-in not done' : 'Check-in done'); S.sheet = null; render(); break; }
    case 'much': { const r = S.sheet.ref; if (G(r)) { const x = G(r); x.muchK = Object.assign({}, x.muchK || {}, { [T0]: v || '' }); if (x.act && x.muchAuto === T0 && I(x.act)) L(T0)[x.act] = v ? 'much:' + v : 'much'; } else L(T0)[r] = v ? 'much:' + v : 'much'; save(); S.sheet = null; render(); break; }
    case 'open': openItem(ref); break;
    case 'gear': if (I(ref) && I(ref).type === 'tracker') { openSheet({ kind: 'tracker', ref, title: 'Tracker', draft: JSON.parse(JSON.stringify(I(ref))) }); break; } if (G(ref)) openSheet({ kind: 'group', ref, title: G(ref).style === 'dayblock' ? 'Day block' : 'Category' }); else openItem(ref); break;
    case 'rm': { const list = a.dataset.in; if (I(ref) && placements(ref).length > 1 && !list.startsWith('s:')) { openSheet({ kind: 'remove', ref, list, title: 'Remove' }); break; }
      if (list === 'g-blocks' && blockIds().length <= 1) { flash('Keep at least one day block'); break; }
      removeRef(ref, list, false); break; }
    case 'rmhere': { const s = S.sheet; S.sheet = null; removeRef(s.ref, s.list, false); break; }
    case 'rmall': { const s = S.sheet; S.sheet = null; removeRef(s.ref, s.list, true); break; }
    case 'addtask': { const id = uid('i'); change(() => { M.items[id] = { name: 'New task', type: 'task', when: { mode: 'once', date: T0 }, kind: 'behaviour', tags: [], insight: false, made: T0, dur: 30 }; G(a.dataset.in).kids.push(id); }); focusName(id); break; }
    case 'addstep': { const id = uid('s'); change(() => { M.items[id] = { name: 'New step', type: 'step', kind: 'behaviour', tags: [], insight: true }; I(ref).steps.push(id); }); focusName(id); break; }
    case 'addblock': { const id = uid('b'); const last = G(blockIds()[blockIds().length - 1]); change(() => { M.groups[id] = { name: 'New block', style: 'dayblock', holds: 'task', start: last.end, end: last.end < '23:00' ? '23:00' : last.end, color: '#7DBE9A', icon: 'clock', kids: [] }; G('g-blocks').kids.push(id); }); focusName(id); break; }
    case 'addcat': { const id = uid('c'); change(() => { M.groups[id] = { name: 'New category', style: 'acat', holds: 'appt', color: '#A877C4', icon: 'calendar', kids: [] }; G('g-appts').kids.push(id); }); focusName(id); break; }
    case 'cat': S.cat = v; S.apFOpen = false; render(); break;
    case 'new': S.sheet = null; if (S.planAddOpen) { S.planAddOpen = false; render(); } newItem(v); break;
    case 'newappt': S.sheet = null; if (S.apAddOpen) { S.apAddOpen = false; render(); } newAppt(v); break;
    case 'apaddopen': S.apAddOpen = !S.apAddOpen; render(); break;
    case 'apfopen': S.apFOpen = !S.apFOpen; render(); break;
    case 'iconfor': capture(); openSheet({ kind: 'icon', ref: v, title: 'Choose an icon', back: S.sheet }); break;
    case 'iconcat': S.sheet.cat = v; renderLayer(); { const g = $('#layer .icg'); if (g) g.scrollTop = 0; } break;
    case 'pickicon': { const s = S.sheet; if (s.ref === 'draft') { s.back.draft.icon = v; S.sheet = s.back; renderLayer(); break; } change(() => setProp(s.ref, 'icon', v)); S.sheet = s.back || null; render(); break; }
    case 'pickcolor': { const s = S.sheet; change(() => setProp(s.ref, 'color', v)); S.sheet = null; render(); break; }
    case 'hexcolor': { const hv = $('#hex').value.trim(); if (!/^#[0-9a-f]{6}$/i.test(hv)) { flash('Use a code like #7DBE9A'); break; } const s = S.sheet; change(() => setProp(s.ref, 'color', hv)); S.sheet = null; render(); break; }
    case 'gcolor': { G(S.sheet.ref).color = v; save(); render(); break; }
    case 'savegroup': { const g = G(S.sheet.ref); const n = $('#gname').value.trim(); const st = $('#gstart'), en = $('#gend'), dl = $('#gdl'); change(() => { if (n) g.name = n; if (dl) g.deadline = dl.value || null; if (st && st.value) g.start = st.value; if (en && en.value) g.end = en.value; }, 'Saved ' + g.name); S.sheet = null; render(); break; }
    case 'acolor': M.areas[S.sheet.ref].color = v; save(); render(); break;
    case 'savearea': { const n = $('#aname').value.trim(); if (n) M.areas[S.sheet.ref].name = n; save(); S.sheet = null; render(); break; }
    case 'dblkopen': capture(); openSheet({ kind: 'blk', title: 'Day block', back: S.sheet }); break;
    // from the Archive, an opened item or condition goes back to the Archive when closed
    case 'staskback': { const it = I(ref); change(() => { Object.keys(M.log).forEach((d) => { if (M.log[d][ref] !== undefined) delete M.log[d][ref]; }); }, 'Brought back ' + (it ? it.name : '')); break; }
    case 'archgo': { const ar = S.sheet; if (v === 'proj') { S.sheet = null; S.area = 'hobbies'; S.insOn = false; S.hob = hobOf(ref); S.proj = null; render(); break; } if (v === 'open') openItem(ref); else if (v === 'trip') trainingAction('tripopen', a, ref); else condAction('condopen', a, ref); if (S.sheet && S.sheet !== ar) { S.sheet.back = ar; renderLayer(); } break; }
    case 'archopen': S.menu = false; openSheet({ kind: 'archive', title: 'Archive' }); break;
    case 'dblkpick': if (S.sheet.back) S.sheet.back.block = v; closeSheet(); break;
    case 'dset': capture(); if (a.dataset.k === 'block' || a.dataset.k === 'cat') S.sheet[a.dataset.k] = v; else S.sheet.draft[a.dataset.k] = v; renderLayer(); break;
    case 'dwhen': { capture(); const D = S.sheet.draft; D.when = v === 'once' ? { mode: 'once', date: T0 } : v === 'every' ? { mode: 'every', n: 1 } : { mode: 'days', days: [wd(T0)] }; if (v !== 'once') D.insight = D.insight !== false; renderLayer(); break; }
    case 'drepopen': capture(); S.sheet.repOpen = true; renderLayer(); break;
    case 'dmiss': { const id = S.sheet.ref; const it = I(id); S.sheet = null;
      if (repeatable(it)) change(() => { M.missed = M.missed || {}; (M.missed[T0] = M.missed[T0] || {})[id] = true; }, 'Missed: ' + it.name);
      else change(() => { it.when = Object.assign({}, it.when, { mode: 'once', date: null }); }, it.name + ' moved to Not scheduled'); break; }
    case 'dq': { capture(); const D = S.sheet.draft; D.when.date = v && v !== D.when.date ? v : null; if (D.when.date) D.when.set = 1; else delete D.when.set; // tapping the picked day again takes the date away (the 'No date' button is gone) if (v) S.sheet.calM = v.slice(0, 7);
      if (S.sheet.quick && D.when.mode === 'once' && !areaItem(S.sheet.ref)) { saveDraft(); break; } renderLayer(); break; }
    case 'dcalm': { const [y, m] = (S.sheet.calM || ((S.sheet.draft.when || {}).date || T0).slice(0, 7)).split('-').map(Number); S.sheet.calM = iso(new Date(y, m - 1 + (+v), 1)).slice(0, 7); renderLayer(); break; }
    case 'drule': { capture(); if (v === 'none') S.sheet.repOpen = false; const D = S.sheet.draft; const w = D.when; const start = w.date || T0;
      D.when = v === 'none' ? { mode: 'once', date: w.date || null } : v === 'daily' ? { mode: 'days', days: [0, 1, 2, 3, 4, 5, 6], n: 1, date: start } : v === 'weekly' ? { mode: 'days', days: w.mode === 'days' && (w.days || []).length < 7 ? w.days : [wd(start)], n: w.n || 1, date: start } : { mode: v, n: w.mode === v ? w.n : 1, date: start };
      if (v !== 'none' && D.insight == null && D.type !== 'appt') D.insight = true; renderLayer(); break; }
    case 'dmore': capture(); S.sheet.quick = false; S.sheet.title = (I(S.sheet.ref) || {}).type === 'routine' ? 'Routine' : 'Task'; renderLayer(); break;
    case 'sched': { const it = I(ref); if (!it || it.type === 'appt' || it.type === 'checkin' || it.part) { openItem(ref); break; } openItem(ref); S.sheet.quick = true; S.sheet.title = 'Schedule'; renderLayer(); break; }
    case 'dday': { capture(); const ds = S.sheet.draft.when.days; const i = +v; const k = ds.indexOf(i); if (k >= 0) ds.splice(k, 1); else ds.push(i); ds.sort(); renderLayer(); break; }
    case 'dcolor': capture(); if (v) S.sheet.draft.color = v; else delete S.sheet.draft.color; renderLayer(); break;
    case 'dflag': capture(); tcapture(); S.sheet.draft[v] = v === 'insight' ? S.sheet.draft.insight === false : !S.sheet.draft[v]; renderLayer(); break;
    case 'dtag': { capture(); const tg = S.sheet.draft.tags = S.sheet.draft.tags || []; const k = tg.indexOf(v); if (k >= 0) tg.splice(k, 1); else tg.push(v); renderLayer(); break; }
    case 'tagedit': { capture(); tcapture(); if (S.tagEdit) { const before = JSON.stringify(M.tags); tagNames(); if (JSON.stringify(M.tags) !== before) save(); } S.tagEdit = !S.tagEdit; renderLayer(); break; }
    case 'tagrm': { tagNames(); const n = M.tags[v]; change(() => { delete M.tags[v]; Object.values(M.items).forEach((it) => { if (it.tags) it.tags = it.tags.filter((x) => x !== v); }); Object.values(M.groups || {}).forEach((g) => { if (g && g.tags) g.tags = g.tags.filter((x) => x !== v); }); if (S.sheet && S.sheet.draft && S.sheet.draft.tags) S.sheet.draft.tags = S.sheet.draft.tags.filter((x) => x !== v); }, 'Deleted the tag ' + (n || '')); break; }
    case 'dnewtag': { const n = $('#newtag').value.trim(); if (!n) break; capture(); tcapture(); let id = Object.keys(M.tags).find((k) => M.tags[k].toLowerCase() === n.toLowerCase()); if (!id) { id = uid('t'); M.tags[id] = n; } const tg = S.sheet.draft.tags = S.sheet.draft.tags || []; if (!tg.includes(id)) tg.push(id); renderLayer(); break; }
    case 'dstep-add': capture(); S.sheet.steps.push({ name: '' }); renderLayer(); { const el = document.querySelectorAll('[data-step]'); if (el.length) el[el.length - 1].focus(); } break;
    case 'dpart-add': { capture(); const D = S.sheet.draft; const d = (D.when || {}).date; const rep = (D.when && D.when.mode || 'once') !== 'once'; const orig = rep && I(S.sheet.ref) && I(S.sheet.ref).when ? I(S.sheet.ref).when.date : null; if (!d || (rep && d === orig)) { flash('Pick a day first'); break; }
      (S.sheet.parts || (S.sheet.parts = [])).push(Object.assign({ date: d, min: D.dur || 30 }, D.time ? { time: D.time } : {})); D.when.date = rep ? orig : null; delete D.time; renderLayer(); break; }
    case 'dpart-rm': capture(); S.sheet.parts.splice(+v, 1); renderLayer(); break;
    case 'dmoreset': capture(); S.sheet.moreOpen = !S.sheet.moreOpen; renderLayer(); break;
    case 'dstep-rm': capture(); S.sheet.steps.splice(+v, 1); renderLayer(); break;
    case 'dstep-open': capture(); S.sheet.stepOpen = S.sheet.stepOpen === +v ? null : +v; renderLayer(); break;
    case 'dstep-opt': { capture(); const x = S.sheet.steps[+ref]; if (x) x.optional = !x.optional; renderLayer(); break; }
    case 'dstep-only': { capture(); const x = S.sheet.steps[+ref]; if (x) { x.only = v; if (v === 'days' && !(x.days || []).length) x.days = [0, 1, 2, 3, 4, 5, 6]; } renderLayer(); break; }
    case 'dstep-day': { capture(); const x = S.sheet.steps[+ref]; if (x) { const D0 = x.days = x.days || []; const k = +v; const j = D0.indexOf(k); if (j >= 0) D0.splice(j, 1); else D0.push(k); } renderLayer(); break; }
    case 'dstep-tag': { capture(); const x = S.sheet.steps[+ref]; if (x) { const T = x.tags = x.tags || []; const j = T.indexOf(v); if (j >= 0) T.splice(j, 1); else T.push(v); } renderLayer(); break; }
    case 'dsave': saveDraft(); break;
    case 'ddelete': { const s = S.sheet; S.sheet = null; const parts = (I(s.ref) && I(s.ref).parts) || []; removeRef(s.ref, '', true); if (parts.length) { Object.values(M.groups).forEach((g) => { g.kids = g.kids.filter((k) => !parts.includes(k)); }); parts.forEach((p) => { delete M.items[p]; }); save(); render(); } break; }
  }
});
// ---------- a finished day (2026-11-09): confetti bursts out of the last thing I ticked and the day's mark flies up to the calendar ----------
let lastTick = null;
document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-a="tick"],[data-a="vtick"],[data-a="psub"],[data-a="addtick"],.tickbtn,[data-a="stick"],[data-a="rstep"],[data-a="cifinish"]'); if (!b) return;
  const c = b.querySelector('.circ') || b; const r = c.getBoundingClientRect(); lastTick = { t: Date.now(), x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, true);
function celebrate(kind) { const ph = $('#phone'); if (!ph || !lastTick) return; const P = ph.getBoundingClientRect(); const ox = lastTick.x - P.left, oy = lastTick.y - P.top; lastTick = null;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mk0 = document.querySelector(`#main .day[data-v="${T0}"] .n svg`); if (mk0) mk0.style.opacity = '0'; // the mark waits for its flight
  const fx = document.createElement('div'); fx.className = 'cfx'; ph.appendChild(fx); setTimeout(() => fx.remove(), 2600);
  if (!calm) { const cols = PAL.map((x) => x[1]).concat([starCol(kind)]);
    for (let i = 0; i < 70; i++) { const p = document.createElement('i'); const a = Math.random() * Math.PI * 2, v = 90 + Math.random() * 170, w = 5 + Math.random() * 5;
      p.style.cssText = `left:${ox}px;top:${oy}px;width:${w}px;height:${w * (Math.random() < 0.5 ? 0.45 : 1)}px;background:${cols[i % cols.length]};border-radius:${Math.random() < 0.35 ? '50%' : '1px'}`; fx.appendChild(p);
      const dx = Math.cos(a) * v, dy = Math.sin(a) * v - 60, sp = (Math.random() - 0.5) * 900;
      p.animate([{ transform: 'translate(-50%,-50%) rotate(0deg)', opacity: 1 }, { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) rotate(${sp / 2}deg)`, opacity: 1, offset: 0.45 },
        { transform: `translate(calc(-50% + ${dx * 1.25}px),calc(-50% + ${dy + 260}px)) rotate(${sp}deg)`, opacity: 0 }], { duration: 1500 + Math.random() * 700, easing: 'cubic-bezier(.15,.7,.35,1)', fill: 'forwards' }); } }
  // the mark: from the row up to today's cell, where it settles in
  const main = $('#main'); if (main && main.scrollTop > 0) main.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
  // the flight follows the cell while the page scrolls up, and grows to the cell mark's own size, so it lands exactly on it (2026-11-09)
  const f = document.createElement('div'); f.className = 'cfmark'; f.innerHTML = markSvg(kind, 48, 'star'); f.style.cssText = `left:0;top:0;opacity:0`; fx.appendChild(f);
  const t0 = performance.now(), dur = calm ? 1 : 1300; const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const step = (now) => { const mk = document.querySelector(`#main .day[data-v="${T0}"] .n svg`); const t = Math.min(1, (now - t0) / dur);
    if (!mk) { f.remove(); return; } mk.style.opacity = '0'; const C = mk.getBoundingClientRect(); const tx = C.left + C.width / 2 - P.left, ty = C.top + C.height / 2 - P.top;
    // pop up at the row (first 20%), then arc to the cell
    const pop = Math.min(1, t / 0.2), e = ease(Math.max(0, (t - 0.2) / 0.8)); const x = ox + (tx - ox) * e, y = oy + (ty - oy) * e - Math.sin(e * Math.PI) * 60;
    const big = 1.5, end = C.width / 48; const sc = t < 0.2 ? 0.3 + (big - 0.3) * pop : big + (end - big) * e;
    f.style.opacity = String(Math.min(1, pop * 1.5)); f.style.transform = `translate(${x - 24}px,${y - 24}px) scale(${sc}) rotate(${(1 - e) * -25}deg)`;
    if (t < 1) requestAnimationFrame(step); else { f.remove(); mk.style.opacity = ''; if (!calm) mk.animate([{ transform: 'translate(-50%,-52%) scale(1.25)' }, { transform: 'translate(-50%,-52%) scale(1)' }], { duration: 260, easing: 'ease-out' }); /* keeps its own centring */ } };
  requestAnimationFrame(step); }
function tick(id) {
  const it = I(id); const cur = val(T0, id) || null;
  if (it.type === 'slot') { slotGo(id); return; }
  if (it.type === 'routine') { const all = isDone(id, T0); const st = rSteps(id, T0);
    change(() => { const mm = M.missed = M.missed || {}; const md = mm[T0] = mm[T0] || {};
      if (all) { if (val(T0, id)) { delete L(T0)[id]; st.forEach((s) => { if (md[s] === 'r') delete md[s]; }); } else st.forEach((s) => { delete L(T0)[s]; }); }
      else { L(T0)[id] = 'done'; st.forEach((s) => { if (!val(T0, s)) md[s] = 'r'; }); } }, (all ? 'Unticked ' : 'Ticked ') + it.name); return; }
  if (it.type === 'checkin') { openSheet({ kind: 'checkin', ref: id, title: it.name }); return; }
  if (!cur && twoTick(id)) return;
  // a hobby item ticks like any other; Too much is a swipe to the left in Hobbies (2026-11-11)
  // Too much is gone (2026-11-12): it became the Hyperfocus symptom, so every tick is a plain tick
  if (true) { change(() => { if (cur) delete L(T0)[id]; else L(T0)[id] = 'done'; }, (cur ? 'Unticked ' : 'Ticked ') + it.name); return; }
  if (!cur) change(() => { L(T0)[id] = 'done'; }, 'Done: ' + it.name);
  else if (cur === 'done') { change(() => { L(T0)[id] = 'much'; }); openSheet({ kind: 'much', ref: id, title: 'Too much' }); }
  else change(() => { delete L(T0)[id]; }, 'Cleared ' + it.name);
}
document.addEventListener('input', (e) => {
  if (e.target.id === 'iconq') { S.sheet.q = e.target.value; const pos = e.target.selectionStart; renderLayer(); const q = $('#iconq'); q.focus(); q.setSelectionRange(pos, pos); }
  if (e.target.id === 'addq') { S.sheet.q = e.target.value; const pos = e.target.selectionStart; renderLayer(); const q = $('#addq'); q.focus(); q.setSelectionRange(pos, pos); }
  if (e.target.id === 'cust') $('#hex').value = e.target.value;
});
document.addEventListener('keydown', (e) => {
  const n = e.target.closest && e.target.closest('[data-nm]');
  if (n && e.key === 'Enter') { e.preventDefault(); n.blur(); }
  if (e.target.id === 'hcond' && e.key === 'Enter') { e.preventDefault(); healthAction('hcondadd'); }
  if (/^shop(q$|-)/.test(e.target.id) && e.key === 'Enter') { e.preventDefault(); shopAdd(e.target.id); }
  if (e.target.id === 'shlname' && e.key === 'Enter') { e.preventDefault(); shopListSave(); }
  if (n && e.key === 'Escape') { n.textContent = nameOf(n.dataset.nm); n.blur(); }
  if (!n && e.key === 'Escape') { if (S.sheet) closeSheet(); else if (S.menu) { S.menu = false; renderLayer(); } else if (S.edit) { S.edit = false; render(); } }
});
const nameOf = (ref) => ref.startsWith('p:') ? M.pages[ref.slice(2)].name : (I(ref) || G(ref) || {}).name || '';
document.addEventListener('focusout', (e) => { const n = e.target.closest && e.target.closest('[data-nm]'); if (!n) return; const v = n.textContent.replace(/\s+/g, ' ').trim(); const ref = n.dataset.nm;
  if (v && v !== nameOf(ref)) { const old = nameOf(ref); change(() => setProp(ref, 'name', v), 'Renamed ' + old); } else if (!v) n.textContent = nameOf(ref); });

// Hold a row (anywhere, edit mode or not) to pick it up and move it, the same as dragging its grip.
let lp = null;
document.addEventListener('pointerdown', (e) => { if (drag || S.sheet || e.button > 0 || e.target.closest('.grip') || e.target.closest('.box') || (S.edit && e.target.closest('[data-nm]'))) return;
  const el = e.target.closest('#main [data-list] > [data-ref]'); if (!el || el.dataset.fixed) return; const list = el.parentElement.closest('[data-list]'); if (!list || list.classList.contains('chips') && !S.edit) return;
  lp = { x: e.clientX, y: e.clientY, t: setTimeout(() => { const p = lp; lp = null; if (!p) return; startDrag(el, list, p.x, p.y); suppress = true; if (navigator.vibrate) navigator.vibrate(12); }, 350) }; });
const lpCancel = (e) => { if (lp && (e.type !== 'pointermove' || Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 8)) { clearTimeout(lp.t); lp = null; } };
['pointerup', 'pointercancel', 'pointermove'].forEach((t) => document.addEventListener(t, lpCancel));
// once something is picked up, a finger moving must drag it, not scroll the page
document.addEventListener('touchmove', (e) => { if (drag || (sd && sd.on)) e.preventDefault(); }, { passive: false });
document.addEventListener('contextmenu', (e) => { if (e.target.closest('#main')) e.preventDefault(); });

// Today (2026-11-10): swipe an item to the left to mark it missed for today; it drops into Missed, where it can be put back
let swp = null;
document.addEventListener('pointerdown', (e) => { if (e.target.closest('.swmiss')) return; if (swp || drag || S.sheet || S.edit || S.area !== 'plan' || S.page !== 'today' || S.day !== T0 || e.button > 0) return;
  if (e.target.closest('.steps, .grip, [data-fixed]')) return; const row = e.target.closest('#view .row[data-ref], #view .appt[data-appt], #view div[data-ref] > .row'); if (!row) return;
  const host = row.dataset.ref || row.dataset.appt ? row : row.parentElement; const id = host.dataset.ref || host.dataset.appt; if (!I(id) || I(id).type === 'checkin' || I(id).brk || isDone(id, T0)) return;
  swp = { row, id, x: e.clientX, y: e.clientY, on: false }; });
document.addEventListener('pointermove', (e) => { const w = swp; if (!w) return; const dx = e.clientX - w.x, dy = e.clientY - w.y;
  if (!w.on) { if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { swp = null; return; } if (dx < -12 && Math.abs(dx) > Math.abs(dy) * 1.4) { w.on = true; if (lp) { clearTimeout(lp.t); lp = null; } w.row.style.transition = 'none'; } else return; }
  w.dx = Math.max(-110, Math.min(0, dx)); w.row.style.transform = `translateX(${w.dx}px)`; });
// the swipe doesn't miss by itself (2026-11-10): it slides the row aside and shows a Miss button; a tap anywhere else slides it back
function swpClose() { document.querySelectorAll('.swmiss').forEach((b) => { const r = b.parentElement; b.remove(); if (r) { r.style.transition = 'transform .2s'; r.style.transform = ''; r.style.opacity = ''; r.classList.remove('swopen'); } }); }
function swpOpen(row, id) { swpClose(); const b = document.createElement('button'); b.className = 'swmiss'; b.dataset.a = 'miss'; b.dataset.ref = id; b.dataset.d = T0; b.setAttribute('aria-label', 'Miss ' + I(id).name + ' today'); b.innerHTML = icon('circle-slash', 18) + '<span>Miss</span>';
  row.classList.add('swopen'); row.appendChild(b); row.style.transition = 'transform .18s'; row.style.transform = 'translateX(-84px)'; row.style.opacity = ''; }
function swpEnd() { const w = swp; swp = null; if (!w || !w.on) return; suppress = true; setTimeout(() => { suppress = false; }, 300);
  if ((w.dx || 0) < -50) { if (navigator.vibrate) navigator.vibrate(8); swpOpen(w.row, w.id); return; }
  w.row.style.transition = 'transform .25s cubic-bezier(.34,1.56,.64,1), opacity .2s'; w.row.style.transform = ''; w.row.style.opacity = ''; }
document.addEventListener('pointerup', swpEnd); document.addEventListener('pointercancel', () => { const w = swp; swp = null; if (w && w.on) { w.row.style.transform = ''; w.row.style.opacity = ''; } });
document.addEventListener('pointerdown', (e) => { if (document.querySelector('.swmiss') && !e.target.closest('.swmiss')) swpClose(); }, true);
// a sideways two-finger swipe on a touchpad does the same
let swWheel = { id: null, sum: 0, t: 0 };
document.addEventListener('wheel', (e) => { if (S.sheet || S.edit || S.area !== 'plan' || S.page !== 'today' || S.day !== T0 || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
  const row = e.target.closest && e.target.closest('#view .row[data-ref], #view .appt[data-appt], #view div[data-ref] > .row'); if (!row || e.target.closest('.steps, [data-fixed]')) return;
  const host = row.dataset.ref || row.dataset.appt ? row : row.parentElement; const id = host.dataset.ref || host.dataset.appt; if (!I(id) || I(id).type === 'checkin' || isDone(id, T0)) return;
  const now = Date.now(); if (swWheel.id !== id || now - swWheel.t > 400) swWheel = { id, sum: 0, t: now }; swWheel.t = now; swWheel.sum += e.deltaX;
  if (swWheel.sum > 60 && !row.classList.contains('swopen')) { swWheel.sum = 0; swpOpen(row, id); } else if (swWheel.sum < -40 && row.classList.contains('swopen')) { swWheel.sum = 0; swpClose(); } }, { passive: true });

// Drag and drop: a grip moves its row within its list, or into another list that takes that kind of thing.
const kindOf = (ref) => G(ref) ? G(ref).style : (I(ref) || {}).type;
const ACCEPT = { hobbies: ['hobby'], task: ['task', 'routine', 'slot'], slot: ['slot'], rooms: ['room'], subjects: ['subject'], sgroups: ['sgroup'], blocks: ['dayblock'], acats: ['acat'], tcats: ['tcat'], appt: ['appt'], hgroups: ['hgroup'], tracker: ['tracker'] };
function listOf(key) { if (key === 'ins:tiles') return M.settings.insOrder; if (key.startsWith('s:')) return I(key.slice(2)).steps; return G(key).kids; }
function accepts(key, ref) { if (key === 'ins:tiles') return String(ref).startsWith('T:'); if (key.startsWith('s:')) return kindOf(ref) === 'step' && key.slice(2) !== ref; const g = G(key); if (key === 'g-hobbies') return kindOf(ref) === 'hobby'; return !!g && (ACCEPT[g.holds] || []).includes(kindOf(ref)); }
let drag = null;
document.addEventListener('pointerdown', (e) => {
  const gp = e.target.closest('.grip'); if (!gp || !S.edit) return;
  const el = gp.closest('[data-ref]'); const list = el && el.parentElement && el.parentElement.closest('[data-list]'); if (!el || !list || el.dataset.fixed) return;
  e.preventDefault(); startDrag(el, list, e.clientX, e.clientY); try { gp.setPointerCapture(e.pointerId); } catch (_) {}
});
function startDrag(el, list, cx, cy) {
  const r = el.getBoundingClientRect(); const ghost = el.cloneNode(true); ghost.classList.add('ghost');
  Object.assign(ghost.style, { width: r.width + 'px', left: r.left + 'px', top: r.top + 'px' }); document.body.appendChild(ghost); el.classList.add('dragging');
  const ph = document.createElement('div'); ph.className = 'ph';
  drag = { ref: el.dataset.ref, from: list.dataset.list, el, ghost, ph, dx: cx - r.left, dy: cy - r.top, to: null, before: null };
}
document.addEventListener('pointermove', (e) => {
  if (!drag) return; e.preventDefault();
  drag.ghost.style.left = (e.clientX - drag.dx) + 'px'; drag.ghost.style.top = (e.clientY - drag.dy) + 'px';
  drag.ghost.style.display = 'none'; const under = document.elementFromPoint(e.clientX, e.clientY); drag.ghost.style.display = '';
  let list = under && under.closest('[data-list]'); while (list && !accepts(list.dataset.list, drag.ref)) list = list.parentElement && list.parentElement.closest('[data-list]');
  const mn = $('#main'), mr = mn.getBoundingClientRect(); if (e.clientY < mr.top + 40) mn.scrollTop -= 10; else if (e.clientY > mr.bottom - 40) mn.scrollTop += 10;
  if (!list) { drag.ph.remove(); drag.to = null; return; }
  const horiz = list.classList.contains('chips') || list.classList.contains('itiles');
  const kids = [...list.children].filter((c) => (c.dataset.ref || (c.dataset.appt && !S.edit)) && c !== drag.el && !c.dataset.fixed);
  let before = null; for (const k of kids) { const b = k.getBoundingClientRect(); if (horiz ? (e.clientY < b.bottom && e.clientX < b.left + b.width / 2) || e.clientY < b.top : e.clientY < b.top + b.height / 2) { before = k; break; } }
  // never drop below a fixed evening check-in or above the morning one
  const fixedLast = [...list.children].find((c) => c.dataset.fixed && I(c.dataset.ref) && I(c.dataset.ref).which === 'evening');
  if (!before && fixedLast) before = fixedLast;
  drag.to = list.dataset.list; drag.before = before && before.dataset.appt ? before.dataset.appt : before && !before.dataset.fixed ? before.dataset.ref : before && before.dataset.fixed && I(before.dataset.ref).which === 'evening' ? before.dataset.ref : null;
  const anchor = before || [...list.children].find((c) => !c.dataset.ref && c !== drag.ph && c.tagName === 'BUTTON') || null;
  if (anchor) list.insertBefore(drag.ph, anchor); else list.appendChild(drag.ph);
});
document.addEventListener('pointercancel', () => { if (drag) { drag.ghost.remove(); drag.ph.remove(); drag.el.classList.remove('dragging'); drag = null; } if (sd) { clearTimeout(sd.t); sd.el.style.transform = ''; sd.el.classList.remove('lift'); sd = null; render(); } });
document.addEventListener('pointerup', () => {
  if (!drag) return; suppress = true; setTimeout(() => { suppress = false; }, 300); const d = drag; drag = null; d.ghost.remove(); d.ph.remove(); d.el.classList.remove('dragging');
  if (!d.to) return;
  const src = listOf(d.from), dst = listOf(d.to);
  if (d.to !== d.from && dst.includes(d.ref)) { flash('It is already there'); return; }
  if (d.before === d.ref) return;
  if (!S.edit && !d.from.startsWith('s:') && G(d.from) && G(d.from).style === 'dayblock' && G(d.to) && G(d.to).style === 'dayblock') {
    const day = S.day; const cur = seqOf(day, d.to, d.ref);
    const bi = d.before ? cur.indexOf(d.before) : -1; const idx = bi >= 0 ? bi : cur.length;
    change(() => moveOnDay(d.ref, day, d.to, idx), 'Moved ' + I(d.ref).name + ' for ' + relDay(day).toLowerCase());
    return;
  }
  change(() => {
    src.splice(src.indexOf(d.ref), 1);
    // items hidden today keep their places: drop right before the next visible row, or after the last visible one
    let at = d.before ? dst.indexOf(d.before) : -1;
    if (at < 0) { const vis = [...document.querySelectorAll(`[data-list="${CSS.escape(d.to)}"] > [data-ref]`)].map((x) => x.dataset.ref).filter((r) => r !== d.ref && dst.includes(r) && !(I(r) && I(r).which === 'morning')); at = vis.length ? dst.indexOf(vis[vis.length - 1]) + 1 : dst.length; }
    dst.splice(at, 0, d.ref);
    if (I(d.ref)) syncDayOrders(d.ref);
  }, d.to === d.from ? 'Moved' : 'Moved to ' + (G(d.to) ? G(d.to).name : 'the routine'));
});

// Schedule edit mode: hold a box without a set time, then drag it to another place, block or (one-off tasks) day.
let sd = null;
// Picking up one day's piece of a joined block: it leaves the block (own rounded box, no red outline, it's not in the
// red stretch while held); the rest of the block keeps its outline piece by piece and loses the shared label (2026-11-03)
function liftOut(bx) {
  bx.classList.remove('spill', 'jl', 'jr'); bx.innerHTML = bx.querySelector('svg') ? bx.innerHTML : icon(boxIcon({ id: bx.dataset.ref }), 12, 2);
  const rk = bx.dataset.run; if (!rk) return;
  document.querySelectorAll(`.blab[data-run="${CSS.escape(rk)}"]`).forEach((l) => { l.style.display = 'none'; });
  document.querySelectorAll(`.box[data-run="${CSS.escape(rk)}"]`).forEach((b) => { if (b !== bx) { b.classList.add('loose'); if (!b.innerHTML.trim()) b.innerHTML = icon(boxIcon({ id: b.dataset.ref }), 12, 2); } });
}
function minuteAt(px) { const { h0, h1, y, zones } = S.ymap; const z = (zones || []).find((q) => px >= q.top && px <= q.top + q.h); S.ymap.zb = z ? z.b : null; /* inside a block's overflow: the minute in the overflow, so drops there land where they're aimed (2026-11-12: items jumped when a day ran over its block) */ if (z) return z.e + Math.round((px - z.top) / Math.max(1, z.h) * z.ov); let best = h0 * 60, bd = 1e9; for (let m = h0 * 60; m <= h1 * 60; m += 5) { const dd = Math.abs(y(m) - px); if (dd < bd) { bd = dd; best = m; } } return best; }
document.addEventListener('pointerdown', (e) => {
  const bx = e.target.closest('.box.mv'); if (!bx || S.sheet) return;
  sd = { id: bx.dataset.ref, from: bx.dataset.d, el: bx, x: e.clientX, y: e.clientY, sc: bx.getBoundingClientRect().height / bx.offsetHeight || 1, off: (e.clientY - bx.getBoundingClientRect().top) / (bx.getBoundingClientRect().height / bx.offsetHeight || 1), st: $('#main').scrollTop, on: false, t: setTimeout(() => { if (!sd) return; sd.on = true; liftOut(bx); bx.classList.add('lift'); if (navigator.vibrate) navigator.vibrate(10); }, 300) };
  try { bx.setPointerCapture(e.pointerId); } catch (_) {}
});
document.addEventListener('pointermove', (e) => { if (!sd) return;
  if (!sd.on) { if (Math.hypot(e.clientX - sd.x, e.clientY - sd.y) > 8) { clearTimeout(sd.t); sd = null; } return; }
  e.preventDefault(); sd.cx = e.clientX; sd.cy = e.clientY;
  const mn = $('#main'), mr = mn.getBoundingClientRect(); if (e.clientY < mr.top + 40) mn.scrollTop -= 8; else if (e.clientY > mr.bottom - 40) mn.scrollTop += 8;
  sd.el.style.transform = `translate(${(e.clientX - sd.x) / sd.sc}px,${(e.clientY - sd.y) / sd.sc + mn.scrollTop - sd.st}px)`; });
document.addEventListener('pointerup', (e) => { if (!sd) return; const x = sd; sd = null; clearTimeout(x.t); if (!x.on) return;
  suppress = true; setTimeout(() => { suppress = false; }, 300);
  const top = e.clientY - x.off * x.sc; x.el.style.transform = ''; x.el.classList.remove('lift');
  const cols = [...document.querySelectorAll('.tl .col[data-day]')]; const col = cols.find((c) => { const r = c.getBoundingClientRect(); return e.clientX >= r.left - 2 && e.clientX <= r.right + 2; }) || cols.find((c) => c.dataset.day === x.from);
  if (!col) return; const day = col.dataset.day; const cr = col.getBoundingClientRect();
  // the middle of the box decides (2026-11-11): above another item's middle = in front of it, below = behind it
  const m = minuteAt((top - cr.top) / x.sc + (x.el.offsetHeight || 0) / 2); const mid = (o) => (o.a + o.b) / 2;
  const it = I(x.id); const b = S.ymap.zb || blockAtTime(fmtHM(m)); const g = G(b);
  if (day !== x.from && !(it.when && it.when.mode === 'once')) { flash('Repeats keep their days. Change the rule in its settings.'); render(); return; }
  if (day < T0) { flash('Past days stay as they were'); render(); return; }
  // the untimed items already in that block on that day, in time order; drop after the last one that starts before m
  const PD = placeDay(day); const inB = PD.filter((o) => o.blk === b && I(o.id).type !== 'checkin' && o.id !== x.id);
  const prev = inB.filter((o) => mid(o) < m).sort((p, q) => p.b - q.b).pop();
  const idx = inB.filter((o) => mid(o) < m).length;
  // dropped in front of an item with a set time (a routine at 22:00): it's tacked on, ending right where that item starts
  const nxt = inB.filter((o) => mid(o) >= m).sort((p, q) => p.a - q.a)[0]; const tk0 = (id) => { const T = (M.dayTack || {})[day] || {}; return (id in T ? T[id] : I(id).before) || null; }; /* in front of something already tacked on: it joins that row */ /* a break is never something to tack onto, and the drop has to be nearer the set-time item than the item before it (2026-11-11) */ const pv0 = inB.filter((o) => mid(o) < m).sort((p, q) => p.b - q.b).pop(); const near = (q) => !pv0 || (q.a - m) < (m - pv0.b);
  // a break takes it only when the drop is right at it, within 20 minutes of its start (2026-11-12: in front of or behind everything, breaks included)
  const tack = !nxt ? null : nxt.appt || I(nxt.id).time ? (near(nxt) && (!I(nxt.id).brk || nxt.a - m <= 20) ? nxt.id : null) : tk0(nxt.id);
  const setTack = () => { const T = (M.dayTack = M.dayTack || {})[day] = (M.dayTack[day] || {}); T[x.id] = tack; };
  if (Array.isArray(window.__dbg)) window.__dbg.push({ top, crt: cr.top, oh: x.el.offsetHeight, sc: x.sc, off: x.off, ey: e.clientY, m, idx, b, day, tack, prev: prev && prev.id, nxt: nxt && nxt.id, inB: inB.map((o) => o.id + '@' + o.a + '-' + o.b) });
  if (!S.edit && day === x.from) { change(() => { moveOnDay(x.id, day, b, idx); setTack(); }, 'Moved ' + it.name + ' on ' + fmtDate(day)); return; }
  change(() => {
    blockIds().forEach((k) => { const ks = G(k).kids; const i = ks.indexOf(x.id); if (i >= 0) ks.splice(i, 1); });
    // in front of or behind anything in the block, routines too (2026-11-11): right after the item before the drop, or
    // right in front of the item after it
    const ks = g.kids; const flow = (o) => !o.appt && !I(o.id).time && ks.includes(o.id); /* items with a set time sit by their time, not by their place in the list */ const pk = inB.filter((o) => mid(o) < m && flow(o)).sort((p, q) => p.b - q.b).pop();
    const nx = inB.filter((o) => mid(o) >= m && flow(o)).sort((p, q) => p.a - q.a)[0];
    const at = pk ? ks.indexOf(pk.id) + 1 : nx ? ks.indexOf(nx.id) : ks.length;
    ks.splice(at, 0, x.id);
    if (day !== x.from) it.when.date = day;
    if (tack) { it.before = tack; delete it.behind; } else { delete it.before; if (prev && (prev.appt || I(prev.id).time)) it.behind = prev.id; else delete it.behind; }
    syncDayOrders(x.id);
    // the day I dropped it on shows it exactly where it was dropped
    moveOnDay(x.id, day, b, idx); setTack();
  }, 'Moved ' + it.name + (day !== x.from ? ' to ' + fmtDate(day) : S.edit && !(it.when && it.when.mode === 'once') ? ' on every day' : ''));
});

// ---------- Health area (2026-11-01): Health merged with Fitness; folders Health and Training ----------
// One long Health page: feelings card, then groups (Check-ins, Social, Symptoms, Body, Other). Groups hold trackers,
// or tabs (sub-groups) that hold trackers. A tracker is ONE item wherever it shows (Health page, check-in pop-ups).
// Feelings follow Plutchik's wheel of emotions (2026-11-03): eight families in wheel order, each word from mild to intense.
var FEELINGS_DEF = [
  ['Joy', '#EDBE68', ['serenity', 'joy', 'ecstasy']],
  ['Trust', '#A9C47F', ['acceptance', 'trust', 'admiration']],
  ['Fear', '#6FAF86', ['apprehension', 'fear', 'terror']],
  ['Surprise', '#6FB3C4', ['distraction', 'surprise', 'amazement']],
  ['Sadness', '#7F92AB', ['pensiveness', 'sadness', 'grief']],
  ['Disgust', '#A98AA6', ['boredom', 'disgust', 'loathing']],
  ['Anger', '#D9868B', ['annoyance', 'anger', 'rage']],
  ['Anticipation', '#E9A16C', ['interest', 'anticipation', 'vigilance']]
];
// Plutchik's intersecting emotions (2026-11-03): the feeling between two neighbouring petals. They sit in their own
// 'Between' family; each one colours the card half in each of its two families.
var DYADS = { love: ['Joy', 'Trust'], submission: ['Trust', 'Fear'], awe: ['Fear', 'Surprise'], disapproval: ['Surprise', 'Sadness'], remorse: ['Sadness', 'Disgust'], contempt: ['Disgust', 'Anger'], aggressiveness: ['Anger', 'Anticipation'], optimism: ['Anticipation', 'Joy'] };
const BETWEEN = ['Between', '#B4A79C', Object.keys(DYADS)];
const famCol = (f) => (feelSet().find((x) => x[0] === f) || [])[1] || '#9A9387';
const wordCol = (w, c) => DYADS[w] ? mix(famCol(DYADS[w][0]), famCol(DYADS[w][1]), 0.5) : c;
// words from the earlier six families, so feelings logged before the switch keep a colour
var FEELINGS_OLD = { Joy: ['joyful', 'curious', 'proud', 'satisfied', 'courageous', 'peaceful', 'intimate', 'optimistic', 'powerful', 'accepted'], Surprise: ['shocked', 'confused', 'amazed', 'excited'], Fear: ['embarrassed', 'unwanted', 'insecure', 'inferior', 'anxious', 'scared'], Anger: ['hurt', 'hateful', 'mad', 'aggressive', 'frustrated', 'distant', 'critical', 'irritated', 'offended'], Disgust: ['disapproval', 'disappointed', 'awful', 'avoidant'], Sadness: ['apathetic', 'lonely', 'despair', 'depressed', 'abandoned', 'guilty'] };
var SCALES = { quality3: ['poor', 'fine', 'good'], amount3: ['a little', 'some', 'a lot'], symptom3: ['present', 'distressing', 'debilitating'], mood5: ['awful', 'bad', 'neutral', 'content', 'happy'] };
var KINDS = [['quality3', 'Poor · fine · good'], ['amount3', 'A little · some · a lot'], ['symptom3', 'Present · distressing · debilitating'], ['mood5', 'Mood, five faces'], ['yesno', 'Tag · ticked is yes, not ticked is no'], ['avoid', 'Showed up · avoided it']];
function feelSet() { return (M.settings && M.settings.feelings) || wheelSet(); }

function healthSeed() {
  const t = (id, name, scale, o) => [id, Object.assign({ name, type: 'tracker', scale, kind: 'experience', tags: [], insight: true }, o || {})];
  const items = Object.fromEntries([
    t('tr-sleep', 'Sleep', 'quality3', { ci: 'morning', tags: ['t-sleep'] }), t('tr-sleepf', 'Sleep factors', 'choices', { ci: 'morning', kind: 'circumstance', options: ['Late caffeine', 'Screens late', 'Noise', 'Nap', 'Nightmares'], tags: ['t-sleep'] }),
    t('tr-mmood', 'Morning mood', 'mood5', { ci: 'morning' }), t('tr-mmot', 'Morning motivation', 'amount3', { ci: 'morning' }),
    t('tr-mood', 'Mood', 'mood5', { ci: 'evening' }), t('tr-mot', 'Motivation', 'amount3', { ci: 'evening' }), t('tr-energy', 'Energy', 'amount3', { ci: 'evening' }), t('tr-prod', 'Productivity', 'amount3', { ci: 'evening' }),
    t('tr-socamt', 'Social time', 'amount3', { kind: 'behaviour' }), t('tr-socq', 'Social quality', 'quality3', { after: true }), t('tr-conn', 'Felt connected', 'amount3', { after: true }),
    t('tr-socev', 'Social events', 'choices', { after: true, kind: 'behaviour', options: ['Call', 'Visit', 'Group', 'Online', 'Ran into someone'] }),
    t('tr-anx', 'Anxiety', 'symptom3'), t('tr-low', 'Low mood', 'symptom3'), t('tr-fog', 'Brain fog', 'symptom3'),
    t('tr-fat', 'Fatigue', 'symptom3'), t('tr-head', 'Headache', 'symptom3'), t('tr-pain', 'Pain', 'symptom3'),
    t('tr-intake', 'Tags', 'choices', { kind: 'behaviour', addable: true, options: ['Alcohol', 'Caffeine', 'Sugar', 'Takeaway', 'Skipped a meal'] }),
    t('tr-factors', 'Factors', 'choices', { kind: 'circumstance', options: ['Period', 'Travel', 'Busy day', 'Rest day', 'Bad weather'] })
  ]);
  const groups = {
    'g-health': { name: 'Health', holds: 'hgroups', kids: ['hg-ci', 'hg-social', 'hg-sym', 'hg-food', 'hg-other'] },
    'hg-ci': { name: 'Check-ins', style: 'hgroup', special: 'checkins', holds: 'tracker', color: '#EDBB3A', kids: ['tr-sleep', 'tr-sleepf', 'tr-mmood', 'tr-mmot', 'tr-mood', 'tr-mot', 'tr-energy', 'tr-prod'] },
    'hg-social': { name: 'Social', style: 'hgroup', holds: 'tracker', color: '#EC8FA8', kids: ['tr-socamt', 'tr-socq', 'tr-conn', 'tr-socev'] },
    'hg-sym': { name: 'Symptoms', style: 'hgroup', holds: 'htabs', color: '#E0644E', kids: ['ht-mental', 'ht-phys', 'ht-beh'] },
    'ht-mental': { name: 'Mental', style: 'htab', holds: 'tracker', kids: ['tr-anx', 'tr-low', 'tr-fog'] },
    'ht-phys': { name: 'Physical', style: 'htab', holds: 'tracker', kids: ['tr-fat', 'tr-head', 'tr-pain'] },
    'ht-beh': { name: 'Behavioural', style: 'htab', holds: 'tracker', kids: [] },
    'hg-food': NUTRITION(),
    'hg-other': { name: 'Other', style: 'hgroup', holds: 'htabs', color: '#6F9BD6', kids: ['ht-factors', 'ht-events', 'ht-conds'] },
    'ht-factors': { name: 'Factors', style: 'htab', holds: 'tracker', kids: ['tr-factors'] },
    'ht-events': { name: 'Life events', style: 'htab', holds: 'tracker', special: 'events', kids: [] },
    'ht-conds': { name: 'Conditions', style: 'htab', holds: 'tracker', special: 'conds', kids: [] }
  };
  return { items, groups };
}
// Nutrition (2026-11-01): replaces Body now that Training has its own folder. Food photos plus day tags you can add to.
const INTAKE = () => ['Alcohol', 'Caffeine', 'Sugar', 'Takeaway', 'Skipped a meal'];
function NUTRITION() { return { name: 'Nutrition', style: 'hgroup', holds: 'tracker', special: 'food', color: '#6FA24A', kids: ['tr-intake'] }; }
// Older saved data gets the Health area added; Fitness becomes part of it.
// an Overeating symptom (Behavioural) whose level rings the day on the food diary calendar (2026-11-10)
// Hyperfocus (2026-11-12): a symptom like the others; when I log it I pick which of my hobbies it was. It replaces Too much.
function hyperMigrate(m) { m.settings = m.settings || {}; if (m.settings.hyper1 || !m.groups || !m.groups['ht-beh']) return; m.settings.hyper1 = true;
  if (!m.items['tr-hyper']) { m.items['tr-hyper'] = { name: 'Hyperfocus', type: 'tracker', scale: 'symptom3', special: 'hyperfocus', kind: 'behaviour', tags: [], insight: true }; m.groups['ht-beh'].kids.push('tr-hyper'); } }
const isHyper = (id) => !!I(id) && I(id).special === 'hyperfocus';
function oeMigrate(m) { m.settings = m.settings || {}; if (m.settings.overeat1 || !m.groups || !m.groups['ht-beh']) return; m.settings.overeat1 = true;
  if (!m.items['tr-over']) { m.items['tr-over'] = { name: 'Overeating', type: 'tracker', scale: 'symptom3', kind: 'behaviour', unwanted: true, tags: [], insight: true }; m.groups['ht-beh'].kids.push('tr-over'); } }
// sample: overeating yesterday, with a meal on it (only with the examples on)
function oeMigrate2(m) { if (!m.example || m.settings.overeatEx || !m.items['tr-over']) return; m.settings.overeatEx = true; const d = addDays(T0, -1);
  (m.log[d] = m.log[d] || {})['tr-over'] = 2; m.photos = m.photos || {}; (m.photos[d] = m.photos[d] || []).push({ id: 'p-exover', tags: [], at: '21:30', text: 'Pizza and crisps', kind: 'meal', sample: true }); }
const overCol = (v) => stepCol(hcolor('tr-over'), v - 1, 3);
const overOn = (d) => { if (!I('tr-over')) return null; const v = +hval(d, 'tr-over'); return v >= 1 && v <= 3 ? v : null; };
function migrate(m) {
  if (m.areas && !m.areas.health) {
    const hs = healthSeed();
    m.areas.health = { name: 'Health', icon: 'heart-pulse', color: '#7DBE9A', pages: ['health', 'food', 'training', 'insight'] };
    delete m.areas.fitness;
    m.areaOrder = ['plan', 'health'].concat((m.areaOrder || []).filter((a) => a !== 'plan' && a !== 'fitness' && a !== 'health'));
    m.pages.health = { name: 'Health', color: '#7DBE9A' }; m.pages.training = { name: 'Training', color: '#6FA24A' };
    Object.assign(m.groups, hs.groups); Object.keys(hs.items).forEach((k) => { if (!m.items[k]) m.items[k] = hs.items[k]; });
  }
  if (m.groups && m.groups['hg-body']) { const k = m.groups['g-health'].kids; k[k.indexOf('hg-body')] = 'hg-food'; delete m.groups['hg-body']; delete m.groups['ht-food']; delete m.groups['ht-fit']; m.groups['hg-food'] = NUTRITION();
    m.items['tr-intake'] = { name: 'Tags', type: 'tracker', scale: 'choices', kind: 'behaviour', tags: [], insight: true, addable: true, options: INTAKE() }; }
  if (m.items && m.items['tr-intake'] && !(m.items['tr-intake'].options || []).length) m.items['tr-intake'].options = ['Alcohol', 'Caffeine', 'Sugar', 'Takeaway', 'Skipped a meal'];
  if (m.items && !(m.settings || {}).h2) { m.settings = m.settings || {}; m.settings.h2 = true;
    ['tr-socq', 'tr-conn', 'tr-socev'].forEach((k) => { if (m.items[k]) { m.items[k].after = true; delete m.items[k].more; } });
    if (m.items['tr-conn'] && m.items['tr-conn'].scale === 'yesno') { m.items['tr-conn'].scale = 'amount3'; Object.values(m.log || {}).forEach((l) => { if (typeof l['tr-conn'] === 'string') delete l['tr-conn']; }); } }
  // Food diary and Insight become their own Health folders (2026-11-02)
  if (m.areas && m.areas.health && !m.pages.food) { m.pages.food = { name: 'Food diary', color: '#6FA24A' }; m.pages.insight = { name: 'Insight', color: '#A877C4' }; m.pages.training.color = '#3FAFA6'; m.areas.health.pages = ['health', 'food', 'training', 'insight']; }
  m.events = m.events || []; m.conds = m.conds || []; m.photos = m.photos || {}; m.feel = m.feel || {}; m.settings = m.settings || {};
  // the Bad day list (2026-11-08); Health has no Insight tab any more (2026-11-08: it opens from the menu as Data)
  if (!m.groups['g-bad']) m.groups['g-bad'] = { name: 'Bad day', style: 'list', holds: 'task', kids: [], color: '#8C9EBF', icon: 'cloud' };
  m.badDays = m.badDays || {};
  if (m.areas && m.areas.health && m.areas.health.pages) m.areas.health.pages = m.areas.health.pages.filter((p) => p !== 'insight');
  // sample feelings for the past two weeks, example data only (2026-11-08: to see the past-day feelings block)
  if (m.example && !m.settings.feelSample1) { m.settings.feelSample1 = true;
    const FS = [['content', 'relaxed'], ['anxious', 'tired'], ['cheerful', 'hopeful', 'tired'], ['frustrated', 'overwhelmed'], ['thankful', 'serene'], ['bored', 'lonely'], ['proud', 'energetic'], ['insecure', 'pensive'], ['playful', 'loving'], ['irritated', 'tired', 'content'], ['confident', 'aware'], ['sleepy', 'apathetic'], ['excited', 'creative'], ['hurt', 'discouraged']];
    FS.forEach((w, k) => { const d = addDays(T0, -(k + 1)); if (!(m.feel[d] || []).length) m.feel[d] = w; }); }
  // Past days keep a frozen layout. When the way days are laid out changes, the old snapshots are drawn
  // with the old rules and look broken, so they're taken again with the current rules (2026-11-03).
  if (m.settings.layoutV !== LAYOUT_V) { m.settings.layoutV = LAYOUT_V; m.frozen = {}; }
  delete m.feelSym;
  // DYSREGULATED feelings family (2026-11-03): feelings that are out of proportion, aimed inward or outward; all symptomatic
  if (!m.settings.plutchik1 && FEELINGS_DEF) { m.settings.plutchik1 = true; m.settings.dysreg1 = true;
    const dys = ((m.settings.feelings || []).find((x) => x[0] === 'Dysregulated') || ['Dysregulated', '#9B4F63', ['self-hatred', 'toxic shame', 'excessive guilt', 'worthless', 'rage', 'distrust', 'dread', 'panic']]).slice();
    dys[2] = dys[2].map((w) => w === 'rage' ? 'uncontrolled anger' : w);
    m.settings.feelings = JSON.parse(JSON.stringify(FEELINGS_DEF)).concat([BETWEEN, dys]);
    m.settings.feelSymOk = [...new Set((m.settings.feelSymOk || []).map((w) => w === 'rage' ? 'uncontrolled anger' : w).concat(dys[2]))]; }
  if (!m.settings.dyads1 && m.settings.plutchik1 && typeof DYADS !== 'undefined' && DYADS) { m.settings.dyads1 = true; const set = m.settings.feelings || []; if (!set.some((x) => x[0] === 'Between')) { const i = set.findIndex((x) => x[0] === 'Dysregulated'); set.splice(i < 0 ? set.length : i, 0, JSON.parse(JSON.stringify(BETWEEN))); m.settings.feelings = set; } }
  if (!m.settings.dysreg1 && (m.settings.feelings || FEELINGS_DEF)) { m.settings.dysreg1 = true; const DW = ['self-hatred', 'toxic shame', 'excessive guilt', 'worthless', 'rage', 'distrust', 'dread', 'panic'];
    const set = JSON.parse(JSON.stringify(m.settings.feelings || FEELINGS_DEF)); if (!set.some((x) => x[0] === 'Dysregulated')) set.push(['Dysregulated', '#9B4F63', DW]);
    m.settings.feelings = set; m.settings.feelSymOk = [...new Set((m.settings.feelSymOk || []).concat(DW))]; }
  if (m.settings.dysreg1 && !m.settings.sym2 && m.settings.feelings) { m.settings.sym2 = true; m.settings.feelings.forEach((x) => { if (x[0] === 'Dysregulated') x[0] = 'Symptomatic'; }); delete m.settings.feelSymOk; }
  if (m.settings.sym2 && !m.settings.sym3 && m.settings.feelings) { m.settings.sym3 = true; m.settings.feelings.forEach((x) => { if (x[0] === 'Symptomatic' || x[0] === 'Dysregulated') x[0] = 'Dysregulation'; }); }
  // the feeling wheel replaces Plutchik (2026-11-06); symptom feelings (Dysregulation) stay. Example days get wheel words.
  if (!m.settings.wheel1) { m.settings.wheel1 = true; const dys = (m.settings.feelings || []).find((x) => SYMNAMES.includes(x[0]));
    m.settings.feelings = wheelSet().concat(dys ? [dys] : []);
    const MAP = { serenity: 'content', joy: 'joyful', ecstasy: 'excited', acceptance: 'trusting', trust: 'secure', admiration: 'appreciated', apprehension: 'anxious', fear: 'scared', terror: 'overwhelmed', distraction: 'confused', surprise: 'surprised', amazement: 'fascinating', pensiveness: 'pensive', sadness: 'sad', grief: 'depressed', boredom: 'bored', disgust: 'critical', loathing: 'hateful', annoyance: 'irritated', anger: 'angry', rage: 'hostile', interest: 'hopeful', anticipation: 'excited', vigilance: 'aware', love: 'loving', optimism: 'optimistic', submission: 'submissive', awe: 'fascinating', disapproval: 'critical', remorse: 'remorseful', contempt: 'skeptical', aggressiveness: 'hostile' };
    const keep = new Set(m.settings.feelings.flatMap((x) => x[2]));
    Object.keys(m.feel || {}).forEach((d) => { m.feel[d] = [...new Set((m.feel[d] || []).map((w) => keep.has(w) ? w : MAP[w]).filter(Boolean))]; }); }
  // the wheel takes the earlier feeling colours (2026-11-06)
  // make sure the wheel families are the stored set (some saved states still held the Plutchik families)
  if (!(m.settings.feelings || []).some((x) => x[0] === 'Mad')) { const dys = (m.settings.feelings || []).find((x) => SYMNAMES.includes(x[0])); m.settings.feelings = wheelSet().concat(dys ? [dys] : []); }
  if (!m.settings.wheel2) { m.settings.wheel2 = true; const cols = Object.fromEntries(wheelDef().map((x) => [x[0], x[1]])); (m.settings.feelings || []).forEach((x) => { if (cols[x[0]]) x[1] = cols[x[0]]; }); }
  if (m.example && !m.settings.food5) { m.settings.food5 = true; foodSampleMore(m); }
  if (m.example && !m.settings.food3) { m.settings.food1 = m.settings.food3 = true; foodSample(m); }
  // Snack day becomes a once-a-week extra (2026-11-02)
  if (m.settings.plan3 && !m.settings.plan3.extras.some((x) => x.id === 'x-snackday')) { const p3 = m.settings.plan3;
    p3.extras.unshift({ id: 'x-snackday', name: 'Snack day', meal: 0, snack: 0, any: 0, treat: 1, weekly: true }); p3.week.forEach((w) => { w.treat = 0; });
    if (m.example) { const sat = addDays(T0, -2); const o = p3.days[sat] = p3.days[sat] || {}; o.extras = (o.extras || []).concat('x-snackday'); } }
  // Sleep becomes its own Health group like Social, holding the sleep items (2026-11-02); the morning check-in still asks them
  if (m.groups && m.groups['g-health'] && !m.settings.sleep1) { m.settings.sleep1 = true;
    if (!m.groups['hg-sleep']) { const ids = ['tr-sleep', 'tr-sleepf'].filter((k) => m.items[k]);
      if (m.items['tr-sleep'] && m.items['tr-sleep'].name === 'Sleep') m.items['tr-sleep'].name = 'Sleep quality';
      m.groups['hg-sleep'] = { name: 'Sleep', style: 'hgroup', holds: 'tracker', color: '#A877C4', kids: ids };
      if (m.groups['hg-ci']) m.groups['hg-ci'].kids = m.groups['hg-ci'].kids.filter((k) => !ids.includes(k));
      const gk = m.groups['g-health'].kids; gk.splice(gk.indexOf('hg-ci') + 1, 0, 'hg-sleep'); } }
  // Check-ins ask whole categories, set per category (2026-11-02); items outside Check-ins lose their own setting
  if (m.groups && !m.settings.gci1) { m.settings.gci1 = true; const G2 = (k) => m.groups[k];
    if (G2('hg-sleep')) G2('hg-sleep').ci = 'morning'; ['hg-social', 'hg-sym', 'hg-other', 'hg-food'].forEach((k) => { if (G2(k)) G2(k).ci = 'evening'; });
    const own = (G2('hg-ci') || { kids: [] }).kids; Object.keys(m.items).forEach((k) => { if (m.items[k].type === 'tracker' && !own.includes(k)) delete m.items[k].ci; }); }
  if (m.groups && m.groups['hg-ci'] && !m.groups['hc-morning']) { const ci = m.groups['hg-ci']; const ks = ci.kids.filter((k) => m.items[k]);
    m.groups['hc-morning'] = { name: 'Morning', style: 'htab', holds: 'tracker', kids: ks.filter((k) => m.items[k].ci === 'morning') };
    m.groups['hc-evening'] = { name: 'Evening', style: 'htab', holds: 'tracker', kids: ks.filter((k) => m.items[k].ci !== 'morning') };
    ks.forEach((k) => delete m.items[k].ci); ci.kids = ['hc-morning', 'hc-evening']; ci.holds = 'htabs'; }
  // check-ins move into the routines (2026-11-02)
  if (m.items && !m.settings.cir1) { m.settings.cir1 = true; const R = (k) => m.items[k];
    [['ci-m', 'r-morning', 'start'], ['ci-e', 'r-evening', 'end']].forEach(([ci, r, where]) => { if (!R(ci) || !R(r)) return;
      Object.values(m.groups).forEach((g) => { g.kids = g.kids.filter((k) => k !== ci); });
      R(r).steps = (R(r).steps || []).filter((k) => k !== ci); if (where === 'start') R(r).steps.unshift(ci); else R(r).steps.push(ci); }); }
  // Avoidance areas live under Symptoms > Behavioural and get their own evening check-in step (2026-11-02)
  if (m.items && !m.settings.av1) { m.settings.av1 = true;
    if (m.example && m.groups['ht-beh']) [['tr-av1', 'Calls and messages'], ['tr-av2', 'Admin'], ['tr-av3', 'Going out']].forEach(([id, name]) => { if (!m.items[id]) { m.items[id] = { name, type: 'tracker', scale: 'avoid', kind: 'behaviour', unwanted: true, tags: [], insight: true }; m.groups['ht-beh'].kids.push(id); } }); }
  // Extras link to other logs (2026-11-02): Low blood sugar symptom, Snack day tag, hikes from Training
  if (m.items && !m.settings.link1) { m.settings.link1 = true;
    if (!m.items['tr-lbs']) { m.items['tr-lbs'] = { name: 'Low blood sugar', type: 'tracker', scale: 'symptom3', kind: 'experience', tags: [], insight: true }; if (m.groups['ht-phys']) m.groups['ht-phys'].kids.push('tr-lbs'); }
    const ti = m.items['tr-intake']; if (ti && !(ti.options || []).includes('Snack day')) ti.options = (ti.options || []).concat('Snack day');
    linkExtras(m); }
  splitTags(m);
  vMigrate(m); // Study and Home on the verdict blocks (2026-11-03)
  tMigrate(m); cMigrate(m); sSessMigrate(m); hMigrate(m); nMigrate(m); shMigrate(m); wMigrate(m); wMigrate2(m); wMigrate3(m); oeMigrate(m); hyperMigrate(m); oeMigrate2(m); remMigrate(m); // Training and Expeditions folders (2026-11-04)
  ciRepair(m);
  // 2026-11-11: snack day = the first snack logged in a week; training extras link to a training item, not a kind and distance
  snackFix(m); afterFix(m);
  return m;
}
// the check-in questions live in the Morning and Evening tabs of Check-ins, and sleep quality in the Sleep group. An emptied app
// could lose those three groups (the questions then sat loose in Check-ins and no check-in asked them), so they are put back here
function ciRepair(m) { const G = m.groups, ci = G['hg-ci'], H = G['g-health']; if (!ci || !H) return;
  const loose = ci.kids.filter((k) => m.items[k]); const strayS = m.items['tr-sleep'] && ['hc-morning', 'hc-evening'].some((t) => G[t] && G[t].kids.includes('tr-sleep')); if (strayS) { ['hc-morning', 'hc-evening'].forEach((t) => { if (G[t]) G[t].kids = G[t].kids.filter((k) => k !== 'tr-sleep'); }); loose.push('tr-sleep'); }
  if (G['hc-morning'] && G['hc-evening'] && G['hg-sleep'] && !loose.length) return;
  if (!G['hc-morning']) G['hc-morning'] = { name: 'Morning', style: 'htab', holds: 'tracker', kids: [] };
  if (!G['hc-evening']) G['hc-evening'] = { name: 'Evening', style: 'htab', holds: 'tracker', kids: [] };
  if (!G['hg-sleep']) G['hg-sleep'] = { name: 'Sleep', style: 'hgroup', holds: 'tracker', color: '#A877C4', kids: [], ci: 'morning' };
  loose.forEach((k) => { const to = k === 'tr-sleep' ? 'hg-sleep' : (m.items[k].ci === 'morning' || /^tr-mm/.test(k)) ? 'hc-morning' : 'hc-evening'; if (!G[to].kids.includes(k)) G[to].kids.push(k); delete m.items[k].ci; });
  ci.kids = ['hc-morning', 'hc-evening']; if (m.items['tr-sleep'] && m.items['tr-sleep'].name === 'Sleep') m.items['tr-sleep'].name = 'Sleep quality';
  if (!H.kids.includes('hg-sleep')) H.kids.splice(H.kids.indexOf('hg-ci') + 1, 0, 'hg-sleep'); }
// Every pick-from-list tracker becomes separate yes/no tag items, each with its own settings (2026-11-02)
function splitTags(m) {
  if (!m.items || m.settings.tags1) return; m.settings.tags1 = true; const map = {};
  Object.keys(m.items).filter((k) => m.items[k].type === 'tracker' && m.items[k].scale === 'choices').forEach((k) => { const it = m.items[k];
    const ids = (it.options || []).map((o) => { let id = 'tg-' + o.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, ''); while (m.items[id]) id += '2';
      m.items[id] = Object.assign({ name: o, type: 'tracker', scale: 'yesno', kind: it.kind || '', tags: (it.tags || []).slice(), insight: it.insight !== false }, it.ci ? { ci: it.ci } : {}, it.after ? { after: true } : {}, it.color ? { color: it.color } : {});
      map[k + '|' + o] = id; return id; });
    Object.values(m.groups).forEach((g) => { const i = g.kids.indexOf(k); if (i >= 0) g.kids.splice(i, 1, ...ids); });
    Object.values(m.log || {}).forEach((l) => { const v = l[k]; if (Array.isArray(v)) v.forEach((o) => { if (map[k + '|' + o]) l[map[k + '|' + o]] = 'yes'; }); delete l[k]; });
    delete m.items[k]; });
  const p3 = m.settings.plan3; if (p3) p3.extras.forEach((x) => { if (x.when && x.when.src === 'tag' && x.when.opt) { const id = map[x.when.id + '|' + x.when.opt]; if (id) x.when = { src: 'tag', id }; } });
}
function linkExtras(m) {
  const p3 = m.settings.plan3; if (!p3) return;
  const X = (id) => p3.extras.find((x) => x.id === id);
  const sd = Object.keys(m.items).find((k) => m.items[k].scale === 'yesno' && m.items[k].name === 'Snack day');
  if (X('x-snackday') && !X('x-snackday').when) X('x-snackday').when = sd ? { src: 'tag', id: sd } : { src: 'tag', id: 'tr-intake', opt: 'Snack day' };
  if (X('x-sugar') && !X('x-sugar').when) X('x-sugar').when = { src: 'sym', id: 'tr-lbs' };
  if (!X('x-light')) p3.extras.splice(Math.max(0, p3.extras.indexOf(X('x-hike'))), 0, { id: 'x-light', name: 'Light hike', meal: 0, snack: 1, any: 0 });
  if (!X('x-light').when) X('x-light').when = { src: 'train', kind: 'Hike', km: 6 };
  if (X('x-hike') && !X('x-hike').when) X('x-hike').when = { src: 'train', kind: 'Hike', km: 15 };
  // example data: hand-picked Snack day and Low blood sugar days become a logged tag and symptom instead
  if (m.example) Object.entries(p3.days).forEach(([d, o]) => { const ex = o.extras || []; const l = m.log[d] = m.log[d] || {};
    if (ex.includes('x-snackday')) { if (sd) l[sd] = 'yes'; else l['tr-intake'] = [...new Set((l['tr-intake'] || []).concat('Snack day'))]; }
    if (ex.includes('x-sugar')) l['tr-lbs'] = l['tr-lbs'] || 1;
    o.extras = ex.filter((id) => id !== 'x-snackday' && id !== 'x-sugar'); });
}

// colours
const stepCol = (c, i, n) => n <= 1 ? c : mix(c, TH.card, 0.7 * (1 - i / (n - 1)));
// unpicked swatches: the tag-button white, getting a little darker along the scale
const flatCol = () => TH.card;
const deep = (c) => mix(c, TH.ink, 0.3);
function hgroupOf(id) { for (const [gid, g] of Object.entries(M.groups)) if (g.kids.includes(id)) return g.style === 'htab' ? Object.keys(M.groups).find((k) => M.groups[k].kids.includes(gid)) : gid; return null; }
const hcolor = (id) => (I(id) && I(id).color) || (G(hgroupOf(id)) || {}).color || '#9A9387';

// feelings field: the day's feelings paint a soft field, strongest family as the ground
function famRank(words) { const count = {}; const fam = {}; Object.entries(FEELINGS_OLD).forEach(([f, ws]) => ws.forEach((w) => { fam[w] = f; })); feelSet().forEach(([f, , ws]) => ws.forEach((w) => { fam[w] = f; }));
  // an in-between feeling is its own colour on the card: the mix of its two families (key '~word')
  // stronger feelings weigh more on the card (2026-11-03): mild 0.6, middle 1, intense 1.6; lvl = the strongest picked
  const lvl = {};
  words.forEach((w) => { const k = DYADS[w] ? '~' + w : fam[w]; if (!k) return; const L = intensity(w); count[k] = (count[k] || 0) + [0.6, 1, 1.6][L - 1]; lvl[k] = Math.max(lvl[k] || 0, L); });
  const keys = feelSet().map((f) => f[0]).concat(Object.keys(DYADS).map((w) => '~' + w));
  return { count, lvl, fams: keys.filter((f) => count[f]).sort((a, b) => count[b] - count[a]) }; }
// Plutchik's three steps (2026-11-03): a family's words run mild, middle, intense; their colour runs soft to strong.
// Other words (own words, in-between, Dysregulated) count as the middle step.
const intensity = (w) => wheelRing(w); // the feeling wheel: core strongest, outer ring softest (2026-11-06)
const stepTone = (c, L) => L === 1 ? mix(c, '#FFFFFF', 0.38) : L === 3 ? mix(c, '#3A2A2A', 0.16) : c;
// Feelings block colours (2026-11-02): soft blobs like a grainy retro gradient, never washed out or grey.
// Under the blobs sits a full-colour base blended in OKLCH, so where blobs fade they fade into colour, not grey.
// Each family gets a blob sized by how many of its words you picked; the strongest family is the biggest.
function fieldBg(words) {
  const { count, lvl, fams } = famRank(words); if (!fams.length) return null;
  const colOf = (f) => stepTone(f[0] === '~' ? wordCol(f.slice(1)) : (feelSet().find((x) => x[0] === f) || [])[1] || '#9A9387', lvl[f]);
  const total = fams.reduce((n, f) => n + count[f], 0);
  const spots = [[0.82, 0.7], [0.12, 0.2], [0.25, 0.95], [0.95, 0.05], [0.5, 0.45], [0.6, 1], [0.38, 0.08], [0.05, 0.6], [0.7, 0.25]];
  // the base runs along the same diagonal as the blobs, so each blob sits on its own colour
  const proj = (i) => { const [x, y] = spots[i % spots.length]; return (x * 0.866 + y * 0.5) / 1.366; };
  // colour shares follow how many feelings were picked in each family (2026-11-03): along the diagonal each family
  // gets a stretch as wide as its share, solid in the middle and blending only at the edges
  const order = fams.map((f, i) => [colOf(f), proj(i), count[f] / total]).sort((p, q) => p[1] - q[1]);
  let cum = 0; const base = order.length === 1 ? [order[0][0] + ' 0%', mix(order[0][0], '#FFFFFF', 0.16) + ' 100%'] : order.flatMap(([c, , sh]) => { const a = cum, b = cum + sh; cum = b; const pad = sh * 0.3;
    return [c + ' ' + Math.round((a === 0 ? 0 : a + pad) * 100) + '%', c + ' ' + Math.round((b >= 0.999 ? 1 : b - pad) * 100) + '%']; });
  const lin = (sp) => 'linear-gradient(120deg' + sp + ', ' + base.join(', ') + ')';
  const blobs = fams.map((f, i) => { const share = count[f] / total; const [x, y] = spots[i % spots.length]; const r = Math.round(18 + 85 * share);
    return 'radial-gradient(ellipse ' + r + '% ' + Math.round(r * 1.5) + '% at ' + Math.round(x * 100) + '% ' + Math.round(y * 100) + '%, ' + colOf(f) + ' 0%, ' + colOf(f) + 'C0 30%, ' + colOf(f) + '00 100%)'; });
  const layers = blobs.slice(1).reverse().concat(blobs.length > 1 ? [blobs[0]] : []);
  return { old: layers.concat([lin('')]).join(', '), ok: layers.concat([lin(' in oklch')]).join(', ') };
}
const feelOf = (d) => (M.feel[d] || []);
function feelCard(d) {
  const ws = feelOf(d);
  if (!ws.length) return `<button class="feelcard empty" data-a="feel">How do I feel?</button>`;
  const sy = feelSymOn(d);
  return `<button class="feelcard" data-a="feel" style="${(() => { const b = fieldBg(ws); return b ? `background:${b.old};background:${b.ok}` : ''; })()}" aria-label="Feelings: ${esc(ws.join(', '))}${sy.length ? '. As symptoms: ' + esc(sy.join(', ')) : ''}. Tap to change"><span>${esc(ws.join(', '))}</span></button>`;
}

// answers
const hval = (d, id) => (M.log[d] || {})[id];
// a full moon (2026-11-03): round face with a few craters, drawn like the Lucide icons
const FULLMOON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="9.5" cy="10" r="1.9" stroke-width="1.3"/><circle cx="14.8" cy="14.8" r="1.2" stroke-width="1.3"/></svg>';
const FACES = ['M8.5 16.4q3.5 -3 7 0', 'M8.6 15.8q3.4 -1.4 6.8 0', 'M9 15.4h6', 'M8.6 14.6q3.4 1.4 6.8 0', 'M8.5 14.2q3.5 3.2 7 0'];
function answerUI(id, d, c) {
  const it = I(id); const v = hval(d, id); const sc = it.scale;
  if (SCALES[sc]) { const n = SCALES[sc].length;
    return `<div class="scale" style="grid-template-columns:repeat(${n},minmax(0,1fr))">${SCALES[sc].map((w, i) => { const on = v === i + 1;
      return `<button data-a="hset" data-ref="${id}" data-v="${i + 1}" aria-label="${esc(it.name)}: ${w}" aria-pressed="${on}" style="background:${on ? stepCol(c, i, n) : flatCol(c)};${on ? `box-shadow:0 0 0 2px var(--card),0 0 0 3.5px ${deep(c)}` : ''}">${sc === 'mood5' ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${on ? deep(c) : '#9A9387'}" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9.2"/><path d="M9 9.6h.01M15 9.6h.01"/><path d="${FACES[i]}"/></svg>` : ''}</button>`; }).join('')}</div>`; }
  // avoidance (2026-11-03): two wordless buttons like the scales, a SUN for showing up and a MOON for avoiding
  if (sc === 'avoid') return `<div class="scale" style="grid-template-columns:repeat(2,minmax(0,1fr))">${[['faced', 'Showed up', '#E6BC74', 'sun'], ['avoided', 'Avoided it', '#A9B4C4', 'moon']].map(([k, w, col, ic]) => { const on = v === k;
    return `<button data-a="hset" data-ref="${id}" data-v="${k}" aria-label="${esc(it.name)}: ${w}" aria-pressed="${on}" style="background:${on ? col : flatCol(c)};color:${on ? mix(col, TH.ink, 0.55) : '#9A9387'};${on ? `box-shadow:0 0 0 2px var(--card),0 0 0 3.5px ${deep(col)}` : ''}">${ic === 'moon' ? FULLMOON : icon(ic, 20, 2)}</button>`; }).join('')}</div>`;
  if (sc === 'yesno') return S.edit ? '' : `<div class="chips">${tagChip(id, d, c)}</div>`;
  if (sc === 'choices') { const arr = Array.isArray(v) ? v : [];
    return `<div class="chips">${(it.options || []).map((w) => `<button class="hchip" data-a="hpick" data-ref="${id}" data-v="${esc(w)}" aria-pressed="${arr.includes(w)}" style="${arr.includes(w) ? `background:${pale(c)};border-color:${c}` : ''}">${esc(w)}</button>`).join('')}${it.addable ? `<button class="hchip addtag" data-a="hnewopt" data-ref="${id}">+ Tag</button>` : ''}</div>`; }
  return '';
}
const isTags = (id) => I(id).scale === 'choices' || I(id).scale === 'yesno';
// Tags (2026-11-02): each tag is its own yes/no item, ticked = yes, not ticked = no. Neighbouring tags share one chip row.
function tagChip(k, d, c) { const on = hval(d, k) === 'yes'; const col = (I(k).color) || c;
  return `<button class="hchip" data-a="htag" data-ref="${k}" aria-pressed="${on}" style="${on ? `background:${pale(col)};border-color:${col}` : ''}">${esc(I(k).name)}</button>`; }
function trackRows(ids, d, c, row, plus) {
  const out = []; let run = [];
  const flush = (last) => { if (run.length || (last && plus)) out.push(`<div class="trow"><div class="chips">${run.map((k) => tagChip(k, d, c)).join('')}${last && plus ? plus : ''}</div></div>`); run = []; };
  ids.forEach((k) => { if (!S.edit && I(k).scale === 'yesno') run.push(k); else { flush(false); out.push(row(k)); } }); flush(true); return out.join('');
}
// a symptom's details as chips, shown once it has an answer: on Health and in the check-in (2026-11-12)
// Hyperfocus offers my hobbies and then any details I added to it myself (2026-11-12); the sheet shows hobbies and my details in one chip row, and so does the symptom row
const hyperHobs = (id) => isHyper(id) && typeof hobIds === 'function' ? hobIds().map((h) => [h, G(h).name]) : [];
function partOpts(id) { return hyperHobs(id).concat((I(id).parts || []).map((w) => [w, w])); }
// Hyperfocus: my own details (stuck, numb) sit on the same line as its name; the hobbies stay below (2026-11-12)
function pchip(id, pk, c, [w, l]) { return `<button class="hchip" data-a="hpart" data-ref="${id}" data-v="${esc(w)}" aria-pressed="${pk.includes(w)}" style="${pk.includes(w) ? `background:${pale(c)};border-color:${c}` : ''}">${esc(l)}</button>`; }
function hyperDetHead(id, d, c) { if (!isHyper(id) || S.edit) return ''; const DT = (I(id).parts || []).map((w) => [w, w]); const hv = hval(d, id); const pk = hval(d, 'pt:' + id) || [];
  return DT.length && typeof hv === 'number' && hv > 0 ? `<div class="chips hdet">${DT.map((x) => pchip(id, pk, c, x)).join('')}</div>` : ''; }
function partDet(id, d, c) { const P = isHyper(id) ? hyperHobs(id) : partOpts(id); const hv = hval(d, id); const pk = hval(d, 'pt:' + id) || [];
  return P.length && !S.edit && typeof hv === 'number' && hv > 0 ? `<div class="chips tparts">${P.map(([w, l]) => `<button class="hchip" data-a="hpart" data-ref="${id}" data-v="${esc(w)}" aria-pressed="${pk.includes(w)}" style="${pk.includes(w) ? `background:${pale(c)};border-color:${c}` : ''}">${esc(l)}</button>`).join('')}</div>` : ''; }
function trackerRow(id, list, d, c) {
  if (!S.edit && isTags(id)) return `<div class="trow" data-ref="${id}">${answerUI(id, d, c)}</div>`;
  const P = I(id).parts || []; const hv = hval(d, id); const pk = hval(d, 'pt:' + id) || [];
  // details (2026-11-11): once a symptom has an answer, I can say where or what, like jaw for muscle tension
  const det = partDet(id, d, c);
  return `<div class="trow" data-ref="${id}"><div class="thead">${grip()}<span class="tname">${nm(id, I(id).name)}</span>${hyperDetHead(id, d, c)}${tail(id, list)}</div>${answerUI(id, d, c)}${det}</div>`;
}
function trackerList(gid, d, c, ids) {
  const g = G(gid); const all = g.kids.filter((k) => I(k)); const lead = all[0]; const open = S.edit || (lead && hval(d, lead) != null);
  const kids = ids || all.filter((k) => k === lead || !I(k).after || open);
  const plus = g.special === 'food' && !S.edit ? `<button class="hchip addtag" data-a="hnewopt" data-ref="${gid}">+ Tag</button>` : '';
  return `<div class="hlist" data-list="${gid}">${trackRows(kids, d, c, (k) => trackerRow(k, gid, d, c), plus)}${S.edit ? `<button class="addrow" data-a="addtracker" data-in="${gid}"><span class="plus">+</span>Add to ${esc(g.name)}</button>` : ''}</div>`;
}

// check-ins: what each one asks is every tracker marked for it, wherever it lives
// Check-ins holds a Morning and an Evening tab (2026-11-02): being in a tab is what makes a check-in ask it
const ciQs = (which) => (G('hc-' + which) ? G('hc-' + which).kids : []).filter((k) => I(k) && I(k).type === 'tracker');
const ciItem = (which) => Object.keys(M.items).find((k) => I(k).type === 'checkin' && I(k).which === which);
// The check-in summary reads as plain sentences (2026-11-02): "Slept well, felt content and very motivated."
const ADJ = { motivation: 'motivated', energy: 'energetic', productivity: 'productive' };
const andList = (xs) => xs.length < 2 ? xs.join('') : xs.length === 2 ? xs.join(' and ') : xs.slice(0, -1).join(', ') + ', and ' + xs[xs.length - 1];
function ciClause(it, v) {
  const n = it.name.toLowerCase().replace(/^(morning|evening) /, '');
  if (SCALES[it.scale]) { const i = v - 1; const w = SCALES[it.scale][i]; if (!w) return '';
    if (it.scale === 'mood5') return 'felt ' + w;
    // levels read as low, some, high (2026-11-02: 'a little energetic' was wrong; the low value means low energy)
    if (it.scale === 'amount3') return { had: true, t: (ADJ[n] ? ['low ', 'some ', 'high '] : ['a little ', 'some ', 'a lot of '])[i] + n };
    if (it.scale === 'symptom3') return i === 0 ? 'had ' + n : n + ' was ' + w;
    if (n === 'sleep' || n === 'sleep quality') return 'slept ' + ['poorly', 'fine', 'well'][i];
    return n + ' was ' + w; }
  if (it.scale === 'avoid') return (v === 'faced' ? 'showed up for ' : 'avoided ') + n;
  return '';
}
// Sleep gets its own row under Check-ins (2026-11-02); the morning row keeps only "slept ...".
const isSleepQ = (k) => /sleep/i.test(I(k).name) || (I(k).tags || []).includes('t-sleep');
function ciSentence(which, d) {
  const qs = (which === 'morning' && I('tr-sleep') ? ['tr-sleep'] : []).concat(ciQs(which)); const cap = (x) => x ? x[0].toUpperCase() + x.slice(1) + '.' : '';
  const clauses = [], lists = [], tagsBy = {};
  qs.forEach((k) => { const it = I(k); const v = hval(d, k); if (v == null || (Array.isArray(v) && !v.length)) return;
    if (Array.isArray(v)) lists.push(it.name + ': ' + andList(v.map((x) => x.toLowerCase())));
    else if (it.scale === 'yesno') { if (v === 'yes') { const gn = (G(hgroupOf(k)) || {}).name || 'Tags'; (tagsBy[gn] = tagsBy[gn] || []).push(it.name.toLowerCase()); } }
    else { const c = ciClause(it, v); if (c) clauses.push(c); } });
  Object.entries(tagsBy).forEach(([gn, ts]) => lists.push(gn + ': ' + andList(ts)));
  // a run of amounts shares one 'had': "had some motivation, low energy, and high productivity"
  const orig = clauses.slice(); clauses.forEach((c, i) => { if (typeof c === 'object') clauses[i] = (i > 0 && typeof orig[i - 1] === 'object' ? '' : 'had ') + c.t; });
  const out = [cap(andList(clauses))];
  // feelings picked during the MORNING check-in (2026-11-02: evening feelings are the whole day's mix, so they're left out)
  const cf = which === 'morning' ? ((M.log[d] || {})['ci-mfeel'] || []) : [];
  if (cf.length) out.push((clauses.length ? 'Also felt ' : 'Felt ') + andList(cf) + '.');
  lists.forEach((l) => out.push(l + '.'));
  return out.filter(Boolean).join(' ');
}
function ciRows(d) {
  const row = (w, ic, label, ci, done, sent) => `<button class="cirow" data-a="${ci ? 'checkin' : ''}" data-ref="${ci || ''}"><span class="ci-ic">${icon(ic, 18)}</span><span class="lbl"><b>${label}${done && typeof hval(d, ci) === 'string' && hval(d, ci).includes('@') ? ' · ' + esc(hval(d, ci).split('@')[1] || '') : ''}</b><span class="${done || sent ? 'sent' : 'nd'}">${esc(done || sent ? sent || 'Done.' : 'Not done yet')}</span></span></button>`;
  const m = ciItem('morning'), e = ciItem('evening');
  return row('morning', 'sun', 'Morning', m, m && !!hval(d, m), ciSentence('morning', d))
    + row('evening', 'moon', 'Evening', e, e && !!hval(d, e), ciSentence('evening', d));
}

// the page
function renderHealth() {
  const d = T0; let h = S.edit ? feelColRows() : feelCard(d);
  h += `<div data-list="g-health">` + G('g-health').kids.filter(G).map((gid) => hGroup(gid, d)).join('') + `</div>`;
  if (S.edit) h += `<div style="margin-top:12px"><button class="addcard" data-a="addhgroup">+ Add health group</button></div>`;
  return h;
}
function hGroup(gid, d) {
  const g = G(gid); const c = g.color || '#9A9387'; const open = S.edit || S.open['h:' + gid] !== false;
  const head = S.edit ? `<div class="hhead">${grip()}<span class="hdot" style="background:${c}" data-col="${gid}" role="button" aria-label="Change colour"></span><span class="mono" style="flex:1">${nm(gid, g.name)}</span>${tail(gid, 'g-health', { rm: g.special !== 'checkins' })}</div>`
    : `<button class="hhead" data-a="hopen" data-ref="${gid}" aria-expanded="${open}"><span class="hdot" style="background:${c}"></span><span class="mono" style="flex:1;text-align:left">${esc(g.name)}</span>${fold(open)}</button>`;
  let body = '';
  if (open) {
    if (g.special === 'checkins' && !S.edit) body = ciRows(d);
    else if (g.special === 'food') body = `<div class="hlist nutplan">${planPanel(d)}${S.edit ? `<div class="chips" style="margin-top:10px"><button class="chip" data-a="mealweek">${mi('mealplan', 'salad')} Meal plan</button></div>` : ''}</div>` + photosUI(d) + trackerList(gid, d, c);
    else if (g.holds === 'htabs') {
      const tabs = g.kids.filter(G); const k = Math.min(S.htab[gid] || 0, Math.max(0, tabs.length - 1)); const tid = tabs[k];
      body = `<div class="htabs" role="tablist">${tabs.map((t, i) => `<button role="tab" data-a="htab" data-ref="${gid}" data-v="${i}" aria-selected="${i === k}" style="--c:${c}">${S.edit && i === k ? `<span data-nm="${t}" ${ce()}>${esc(G(t).name)}</span>` : esc(G(t).name)}</button>`).join('')}${S.edit && g.special !== 'checkins' ? `<button class="tabadd" data-a="addhtab" data-ref="${gid}" aria-label="Add a tab">+</button>` : ''}</div>`;
      if (S.edit && tid && g.special !== 'checkins') body += `<div class="tabtools"><button class="soft" data-a="rm" data-ref="${tid}" data-in="${gid}">Remove the ${esc(G(tid).name)} tab</button></div>`;
      if (tid) body += tabBody(tid, d, c);
    } else {
      body = trackerList(gid, d, c);
    }
  }
  if (!open) { const t = hSummary(gid, d); body = t ? `<p class="hsum">${t}</p>` : ''; }
  return `<section class="hsec ${open ? '' : 'shut'}" data-ref="${gid}">${head}${body}</section>`;
}
// A closed Health category shows only what's logged, in one short line (2026-11-03)
function hSummary(gid, d) {
  // Closed categories show a row of small coloured dots, one per answer, in the colour of the picked button (2026-11-04).
  // Nothing logged = nothing shown. Symptom feelings stay with the feelings, not in the Symptoms summary.
  const g = G(gid); const out = []; const dot = (col, label) => out.push(`<i style="background:${col}" title="${esc(label)}"></i>`);
  if (g.special === 'checkins') Object.keys(M.items).filter((k) => I(k).type === 'checkin' && val(d, k)).forEach((k) => dot(I(k).color || '#EDBB3A', I(k).name + ' done'));
  if (g.special === 'food') mealsOn(d).forEach(() => dot(g.color || '#6FA24A', 'Meal'));
  const ids = g.holds === 'htabs' ? tabsOf(gid).flatMap((t) => G(t).kids) : g.kids;
  ids.filter((k) => I(k) && I(k).type === 'tracker').forEach((k) => { const it = I(k); const v = hval(d, k); if (v == null || v === '') return; const c = hcolor(k);
    if (it.scale === 'yesno') { if (v === 'yes') dot(c, it.name); return; }
    if (it.scale === 'avoid') { dot(v === 'faced' ? '#E6BC74' : '#A9B4C4', it.name + (v === 'faced' ? ': showed up' : ': avoided')); return; }
    if (it.scale === 'choices') { (Array.isArray(v) ? v : []).forEach((w) => dot(c, w)); return; }
    if (SCALES[it.scale]) { const n = SCALES[it.scale].length; if (v >= 1 && v <= n) dot(stepCol(c, v - 1, n), it.name + ': ' + SCALES[it.scale][v - 1]); } });
  return out.length ? `<span class="hdots" role="img" aria-label="${out.length} logged">${out.join('')}</span>` : '';
}
// Food diary (2026-11-02): meals with or without a photo, a few words, meal tags; the whole diary opens from "See all".
const mealsOn = (d) => M.photos[d] || [];
const mealSrc = (p) => p.asset ? blobUrl(p.asset) : p.src;
function mealTile(p, d) {
  const kw = KINDS3.find((k) => k[0] === mealKind(p))[1]; const sub = [kw].concat(p.tags || []).join(', ');
  const lab = [sub, p.text].filter(Boolean).join(' · ');
  return `<button class="photo${mealSrc(p) ? '' : ' txt'}" data-a="${mealSrc(p) ? 'mealview' : 'meal'}" data-ref="${p.id}" data-v="${d}" aria-label="Meal${lab ? ': ' + esc(lab) : ''}">${mealSrc(p) ? `<img src="${esc(mealSrc(p))}" alt=""><span>${esc(sub)}</span>` : `<em>${esc(p.text || kw)}</em><span>${esc(sub)}</span>`}</button>`;
}
function photosUI(d) {
  const ph = mealsOn(d);
  return `<div class="hlist" style="margin-bottom:14px"><div class="thead"><span class="tname">Food diary</span><label class="hic" aria-label="Add a meal with a photo" title="Photo">${icon('camera', 20)}<input type="file" accept="image/*" multiple id="photoin" hidden></label><button class="hic" data-a="mealnew" aria-label="Write a meal" title="Write it">${icon('pencil', 20)}</button></div>${ph.length ? `<div class="photos">${ph.map((p) => mealTile(p, d)).join('')}</div>` : ''}</div>`;
}
// the other Nutrition answers for a day (tags, and any scale you add to Nutrition), as words
const foodGroup = () => Object.keys(M.groups).find((k) => M.groups[k].special === 'food' && M.groups[k].style === 'hgroup');
function foodAnswers(d) {
  const g = G(foodGroup()); if (!g) return [];
  return g.kids.filter((k) => I(k)).flatMap((k) => { const it = I(k); const v = hval(d, k); if (v == null) return [];
    if (Array.isArray(v)) return v; if (SCALES[it.scale]) return [it.name + ': ' + SCALES[it.scale][v - 1]]; if (it.scale === 'yesno') return v === 'yes' ? [it.name] : []; return []; });
}
// Meal plan (2026-11-02, counting): each weekday has a number of meals to eat, snacks allowed and treats allowed
// (a weekend snack day). Extras like a low blood sugar episode or a proper hike are switched on for a day and allow more.
// A day earns a star when it reaches its meals and stays within what it allows.
// the owner's words (2026-11-02): fruit and veg between meals = a BITE (Norwegian mellommåltid); a pastry or cake = a snack, on snack day.
const KINDS3 = [['meal', 'Meal', 'Meals'], ['snack', 'Bite', 'Bites'], ['treat', 'Snack', 'Snacks']];
const mealKind = (p) => p.kind || ((p.tags || []).includes('Snacks') ? 'snack' : (p.tags || []).includes('Treat') ? 'treat' : 'meal');
function PLAN0() { return { week: [0, 1, 2, 3, 4, 5, 6].map(() => ({ meal: 2, snack: 2, treat: 0 })), extras: [{ id: 'x-snackday', name: 'Snack day', meal: 0, snack: 0, any: 0, treat: 1, weekly: true }, { id: 'x-sugar', name: 'Low blood sugar', meal: 0, snack: 0, any: 1 }, { id: 'x-light', name: 'Light hike', meal: 0, snack: 1, any: 0 }, { id: 'x-hike', name: 'Proper hike', meal: 1, snack: 1, any: 0 }], days: {} }; }
// "After every workout" on a task became "Always after" on the workout items (2026-11-11): each workout (not general
// movement) names the tasks that had the switch on
function afterFix(m) { if (!m.settings || m.settings.after2) return; m.settings.after2 = true; const g = (m.groups || {})['g-train']; const its = m.items || {};
  const W = g ? g.kids.filter((c) => c !== 'tc-move' && m.groups[c]).flatMap((c) => m.groups[c].kids.filter((k) => its[k])) : [];
  Object.keys(its).forEach((t) => { if (!its[t].afterTrain) return; delete its[t].afterTrain; W.forEach((k) => { if (k === t) return; const a = its[k].then = its[k].then || []; if (!a.includes(t)) a.push(t); }); }); }
function snackFix(m) { if (!(m.settings && m.settings.plan3) || m.settings.snack2) return; m.settings.snack2 = true; const p3 = m.settings.plan3; const sd = (p3.extras || []).find((x) => x.id === 'x-snackday'); if (sd) { sd.when = { src: 'treat' }; sd.weekly = true; }
    const tri = (m.groups['g-train'] ? m.groups['g-train'].kids : []).flatMap((c) => (m.groups[c] ? m.groups[c].kids : [])).filter((k) => m.items[k]);
    (p3.extras || []).forEach((x) => { if (x.when && x.when.src === 'train' && !x.when.id) { const k = tri.find((t) => (m.items[t].name || '').toLowerCase().includes((x.when.kind || '').toLowerCase())); if (k) x.when = { src: 'train', id: k }; else delete x.when; } }); }
function mealPlan() { const st = M.settings; if (!st.plan3) { st.plan3 = PLAN0(); linkExtras(M); } if (!st.snack2) snackFix(M); return st.plan3; }
const wdOf = (d) => (parse(d).getDay() + 6) % 7;
// Extras can switch on by themselves from other logs (2026-11-02): a symptom, a Nutrition tag, or a training session
// (training links wait for the Training folder). x.when = {src:'sym', id} | {src:'tag', id, opt} | {src:'train', kind, km}.
// days[d].extras = switched on by hand, days[d].off = linked ones switched off by hand for that day.
const trainingOn = (d) => ((M.training || {})[d]) || [];
function trig(w, d) {
  if (!w) return false; const v = hval(d, w.id);
  if (w.src === 'sym') return typeof v === 'number' && v > 0;
  if (w.src === 'tag') return w.opt ? Array.isArray(v) && v.includes(w.opt) : v === 'yes';
  if (w.src === 'treat') return dayCounts(d).treat > 0; // a snack logged: the week's snack day
  if (w.src === 'train' && w.id) return !!I(w.id) && isDone(w.id, d);
  if (w.src === 'train') return trainingOn(d).some((t) => (t.kind || '').toLowerCase() === (w.kind || '').toLowerCase() && (t.km || 0) >= (w.km || 0));
  return false;
}
const manualOn = (x, d) => ((mealPlan().days[d] || {}).extras || []).includes(x.id);
// several conditions (2026-11-11): x.when is the first, x.more holds the rest; any one of them switches the extra on
const xWhens = (x) => [x.when].concat(x.more || []).filter(Boolean);
const anyTrig = (x, d) => xWhens(x).some((w) => trig(w, d));
function autoOn(x, d) {
  if (!x.when || !anyTrig(x, d)) return false;
  // the longest training link of a kind wins (a 16 km hike is a proper hike, not both)
  if (!trig(x.when, d) || (x.more || []).some((w) => trig(w, d))) { if (x.weekly) { const w = weekStart(d); for (let o = w; o < d; o = addDays(o, 1)) if (anyTrig(x, o)) return false; } return true; }
  if (x.when.src === 'train' && !x.when.id && mealPlan().extras.some((y) => y !== x && y.when && y.when.src === 'train' && !y.when.id && (y.when.kind || '').toLowerCase() === (x.when.kind || '').toLowerCase() && (y.when.km || 0) > (x.when.km || 0) && trig(y.when, d))) return false;
  if (x.weekly) { const w = weekStart(d); for (let o = w; o < d; o = addDays(o, 1)) if (anyTrig(x, o)) return false; }
  return true;
}
// Extras only come from the linked logs; they are never switched by hand (2026-11-02)
const isOn = (x, d) => autoOn(x, d);
const dayExtras = (d) => mealPlan().extras.filter((x) => isOn(x, d));
function whenLabel(w) {
  if (!w) return ''; if (w.src === 'sym') return ((I(w.id) || {}).name || 'a') + ' symptom';
  if (w.src === 'tag') return (w.opt || (I(w.id) || {}).name || 'a') + ' tag'; if (w.src === 'treat') return 'the first snack of the week'; if (w.src === 'train' && w.id) return ((I(w.id) || {}).name || 'a training session') + ' done'; if (w.src === 'train') return (w.kind || 'Training') + ' of ' + (w.km || 0) + ' km or more'; return '';
}
function dayCounts(d) { const c = { meal: 0, snack: 0, treat: 0 }; mealsOn(d).forEach((p) => { c[mealKind(p)]++; }); return c; }
function dayCheck(d) {
  const base = mealPlan().week[wdOf(d)]; const ex = dayExtras(d).reduce((a, x) => ({ meal: a.meal + (x.meal || 0), snack: a.snack + (x.snack || 0), any: a.any + (x.any || 0), treat: a.treat + (x.treat || 0) }), { meal: 0, snack: 0, any: 0, treat: 0 });
  const c = dayCounts(d); const overMeal = Math.max(0, c.meal - base.meal - ex.meal); const anyLeft = ex.any - overMeal;
  const snackMax = base.snack + ex.snack + Math.max(0, anyLeft);
  const r = { c, base, ex, mealOk: anyLeft >= 0, mealMax: base.meal + ex.meal + ex.any, snackOk: c.snack <= snackMax, snackMax, treatOk: c.treat <= base.treat + ex.treat, treatMax: base.treat + ex.treat };
  r.broken = breakHits(d); r.followed = d < T0 && mealsOn(d).length > 0 && r.mealOk && r.snackOk && r.treatOk && !r.broken.length; return r;
}
const dayBroke = (d) => { if (d > T0 || overOn(d)) return false; const r = dayCheck(d); return r.broken.length > 0 || !r.mealOk || !r.snackOk || !r.treatOk; };
const followed = (d) => !overOn(d) && dayCheck(d).followed; // an overeating day gets only its red mark (2026-11-10)
// Items that break a food diary day (2026-11-03): if any is logged, the day gets no star. A tag counts when ticked,
// a scale when it's at or above the level picked, an avoidance item when avoided. mealPlan().breaks = [{id, min}]
const BREAKABLE = (k) => { const it = I(k); return it && it.type === 'tracker' && (it.scale === 'yesno' || it.scale === 'avoid' || SCALES[it.scale]); };
function breakHits(d) { return (mealPlan().breaks || []).filter((b) => { const it = I(b.id); const v = hval(d, b.id); if (!it || v == null) return false;
  if (it.scale === 'yesno') return v === 'yes'; if (it.scale === 'avoid') return v === 'avoided'; return typeof v === 'number' && v >= (b.min || 1); }).map((b) => I(b.id).name); }
function breaksUI() {
  const bs = mealPlan().breaks || []; const all = Object.keys(M.items).filter((k) => BREAKABLE(k) && !bs.some((b) => b.id === k)).sort((a, b) => I(a).name.localeCompare(I(b).name));
  return `<div class="fld" style="margin-top:16px"><span class="mono">Breaks the day</span>
    ${bs.filter((b) => I(b.id)).map((b) => { const it = I(b.id); const sc = SCALES[it.scale];
      return `<div class="inrow brk"><span style="flex:1">${esc(it.name)}</span>${sc ? `<select class="inp" data-bmin="${b.id}" aria-label="From which answer">${sc.map((w, i) => `<option value="${i + 1}" ${(b.min || 1) === i + 1 ? 'selected' : ''}>${i === 0 ? 'Any answer' : 'From ' + w}</option>`).join('')}</select>` : `<span class="note" style="margin:0">${it.scale === 'avoid' ? 'When avoided' : 'When ticked'}</span>`}<button class="rm" data-a="brkrm" data-v="${b.id}" aria-label="Remove ${esc(it.name)}">✕</button></div>`; }).join('')}
    ${all.length ? `<select class="inp" data-badd="1" aria-label="Add an item that breaks the day"><option value="">+ Add an item</option>${all.map((k) => `<option value="${k}">${esc(I(k).name)}</option>`).join('')}</select>` : ''}</div>`;
}
function foodCal() { return foodCal0() + calEdit() + (S.edit ? `<div class="starcolw"><button class="starcol" data-a="mkopen" data-ref="broke" aria-label="Change how broken days look">${markSvg('broke', 20)}<span>Broken day mark</span></button></div>` : ''); }
function foodCal0() {
  const F = S.fd; let weeks;
  if (F.month) { const [y, m] = F.monthOf.split('-').map(Number); let w = weekStart(iso(new Date(y, m - 1, 1))); weeks = []; while (weeks.length === 0 || w.slice(0, 7) <= F.monthOf) { weeks.push(w); w = addDays(w, 7); } }
  else weeks = [weekStart(F.day)];
  const cell = (d) => { const star = followed(d); const inM = !F.month || d.slice(0, 7) === F.monthOf; const ex = dayExtras(d).length; const ov = overOn(d);
    return `<button class="day fday ${d === F.day && (!F.month || F.sel === 'day') ? 'sel' : ''} ${d === T0 ? 'today' : ''} ${inM ? '' : 'out'}${awayCls(awayOf('food', d), d)}" data-a="fdday" data-v="${d}" aria-label="${fmtDate(d)}${star ? ', meal plan followed' : dayBroke(d) ? ', day broken' : ''}${ex ? ', with extras' : ''}${ov ? ', overeating: ' + SCALES.symptom3[ov - 1] : ''}">${awayOf('food', d) ? '' : calLines('food', d) + calDotsHtml('food', d)}<span class="n">${ov && !awayOf('food', d) ? markSvg('over', null, 'star', { col: overCol(ov) }) : dayBroke(d) && !awayOf('food', d) ? markSvg('broke', null, 'star') : star && !awayOf('food', d) ? markSvg('food', null, 'star') : ''}${parse(d).getDate()}</span></button>`; };
  return `<div class="stack calblk" style="gap:6px">${F.month ? `<div class="calnav"><button data-a="fdmonth" data-v="-1" aria-label="Previous month">‹</button><span>${MONTHS[+F.monthOf.slice(5) - 1]} ${F.monthOf.slice(0, 4)}</span><button data-a="fdmonth" data-v="1" aria-label="Next month">›</button></div>` : ''}
    <div><div class="wk wkh"><span style="text-align:left">W</span>${WD.map((x) => `<span>${x.toUpperCase()}</span>`).join('')}</div>
    ${weeks.map((w) => `<div class="wk wkr">${F.month ? `<button class="wkn ${F.sel === 'week' && F.week === w ? 'sel' : ''}" data-a="fdweek" data-v="${w}" aria-label="Show week ${isoWeek(w)}" aria-pressed="${F.sel === 'week' && F.week === w}">${isoWeek(w)}</button>` : `<span class="wkn">${isoWeek(w)}</span>`}${[0, 1, 2, 3, 4, 5, 6].map((i) => cell(addDays(w, i))).join('')}</div>`).join('')}</div>
    <button class="toggle-cal" data-a="fdmode" aria-label="${F.month ? 'Show one week' : 'Show the month'}" aria-expanded="${F.month}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(${F.month ? 180 : 0}deg)" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button></div>`;
}
const stepper = (act, k, f, v) => `<span class="stp"><button data-a="${act}" data-k="${k}" data-f="${f}" data-v="-1" aria-label="Less">−</button><b>${v}</b><button data-a="${act}" data-k="${k}" data-f="${f}" data-v="1" aria-label="More">+</button></span>`;
const wKey = (w) => !w ? '' : w.src === 'sym' ? 'sym:' + w.id : w.src === 'tag' ? 'tag:' + w.id + (w.opt ? ':' + w.opt : '') : w.src === 'treat' ? 'treat' : w.src === 'train' ? 'train:' + (w.id || '') : '';
const wParse = (v) => !v ? null : v === 'treat' ? { src: 'treat' } : v.startsWith('train:') ? { src: 'train', id: v.slice(6) } : (([src, id, ...o]) => o.length ? { src, id, opt: o.join(':') } : { src, id })(v.split(':'));
function linkField(x) {
  const tri = typeof trainCats === 'function' ? trainCats().flatMap(kidsOf).filter((k) => I(k)) : [];
  const syms = (G('hg-sym') ? G('hg-sym').kids : []).flatMap((t) => (G(t) || { kids: [] }).kids).filter((k) => I(k));
  const tags = (G(foodGroup()) ? G(foodGroup()).kids : []).filter((k) => I(k) && I(k).scale === 'yesno');
  const sel = (cur, attr, first, label) => { const opt = (v, l) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(l)}</option>`;
    return `<select class="inp" ${attr} aria-label="${esc(label)}" style="margin-top:6px">${opt('', first)}
    <optgroup label="Symptom">${syms.map((k) => opt('sym:' + k, I(k).name)).join('')}</optgroup>
    <optgroup label="Nutrition tag">${tags.map((k) => opt('tag:' + k, I(k).name)).join('')}</optgroup>
    <optgroup label="Training">${tri.map((k) => opt('train:' + k, I(k).name)).join('')}</optgroup>
    <optgroup label="Food diary">${opt('treat', 'The first snack of the week')}</optgroup></select>`; };
  // any one of the conditions switches it on; a second one is added under the first
  return `<div class="fld" style="margin-top:8px"><span class="mono">Switches on by itself</span>${sel(wKey(x.when), `data-xwhen="${x.id}"`, 'Not linked', 'What switches ' + x.name + ' on')}
    ${(x.more || []).map((w, i) => `<span class="mono" style="display:block;margin-top:6px">or</span>${sel(wKey(w), `data-xmore="${x.id}" data-i="${i}"`, 'Remove this one', 'Another thing that switches ' + x.name + ' on')}`).join('')}
    ${x.when ? sel('', `data-xmore="${x.id}" data-i="new"`, '+ Add another condition', 'Add another thing that switches ' + x.name + ' on') : ''}</div>`;
}
function mealWeekSheet() {
  const mp = mealPlan();
  let h = `<div class="pgrid"><span></span>${KINDS3.map((k) => `<span class="mono">${k[2]}</span>`).join('')}${WD.map((w, i) => `<span class="pd">${w}</span>${KINDS3.map(([k]) => stepper('mwstep', i, k, mp.week[i][k])).join('')}`).join('')}</div>`;
  h += `<div class="fld" style="margin-top:16px"><span class="mono">Extras</span>${mp.extras.map((x) => `<div class="xrow"><div class="inrow"><span class="xdot" style="background:${xcol(x)}" aria-hidden="true"></span><input class="inp" data-xname="${x.id}" value="${esc(x.name)}" aria-label="Extra name"><button class="rm" data-a="xrm" data-v="${x.id}" aria-label="Remove ${esc(x.name)}">✕</button></div><div style="margin-top:8px">${colorField('x:' + x.id, xcol(x))}</div>${linkField(x)}
    <div class="pgrid x"><span class="mono">Meals</span><span class="mono">Bites</span><span class="mono">Either</span><span class="mono">Snacks</span>${['meal', 'snack', 'any', 'treat'].map((f) => stepper('xstep', x.id, f, x[f] || 0)).join('')}</div>
    <button class="addbtn" data-a="xweekly" data-v="${x.id}" aria-pressed="${!!x.weekly}" style="min-height:36px;font-size:13px"><span class="circ ${x.weekly ? 'done' : ''}" style="--c:var(--quiet);width:18px;height:18px">${x.weekly ? '✓' : ''}</span>Once a week at most</button></div>`).join('')}
    <button class="addbtn" data-a="xadd"><span class="plus">+</span>Add an extra</button></div>`;
  h += breaksUI();
  return h + `<div class="btns"><button class="btn dark" data-a="closesheet">Done</button></div>`;
}
// Food diary page, tidied (2026-11-02): calendar, then the picked day as one section (counts, extras, meals, tags),
// then earlier days as quiet sections. Section style matches the Health page.
function planPanel(d) {
  const r = dayCheck(d); const past = d < T0;
  const cell = (n, max, label, ok, extra) => `<div class="cnt3 ${ok ? '' : 'over'}"><b>${n}<small>/${max}</small></b><span>${label}</span>${extra ? `<i>${extra}</i>` : ''}</div>`;
  const ex = r.mealMax > r.base.meal ? '+' + (r.mealMax - r.base.meal) + ' extra' : '';
  let h = `<div class="counts${overOn(d) ? ' fgrey' : ''}">${cell(r.c.meal, r.base.meal, 'Meals', r.mealOk, ex)}${cell(r.c.snack, r.snackMax, 'Bites', r.snackOk)}${cell(r.c.treat, r.treatMax, r.treatMax ? 'Snacks · snack day' : 'Snacks', r.treatOk)}</div>`;
  return h;
}
const dayLabel = (d) => relDay(d) === fmtDate(d) ? fmtDate(d) : relDay(d) + ', ' + fmtDate(d);
function dayMeals(d) {
  const fa = foodAnswers(d);
  // other Nutrition data and any extras in one quiet line at the bottom; an extra named like its tag shows once, with its icon
  const xs = dayExtras(d); const names = xs.map((x) => x.name.toLowerCase()); const rest = fa.filter((t) => !names.includes(String(t).toLowerCase()));
  const brk = breakHits(d);
  const line = rest.map((t) => `<span class="${brk.includes(t) ? 'brkt' : ''}">${esc(t)}</span>`).concat(xs.map((x) => `<span><i class="xdot sm" style="background:${xcol(x)}"></i>${esc(x.name)}</span>`)).concat(brk.filter((n) => !rest.includes(n)).map((n) => `<span class="brkt">${esc(n)}</span>`));
  const h = (mealsOn(d).length ? `<div class="photos">${mealsOn(d).map((p) => mealTile(p, d)).join('')}</div>` : '') + (line.length ? `<p class="ftags xshow">${line.join('')}</p>` : '');
  return h && overOn(d) ? `<div class="fgrey">${h}</div>` : h; // greyed on overeating days, nothing is asked of me there (2026-11-10)
}
// What shows under the calendar (2026-11-02): calendar closed = the picked day (today by default) with its plan;
// calendar open = the log for the month, or for a picked week, or the picked day.
function diarySheet() {
  const F = S.fd; const d = F.day; const c = (M.pages.food && M.pages.food.color) || '#6FA24A'; // the Food diary tab's own colour (2026-11-11)
  let h = foodCal();
  if (F.month && F.sel !== 'day') {
    const days = F.sel === 'week' ? [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(F.week, i)) : monthGrid(F.monthOf);
    return h + logEntries(days, F.sel === 'week' ? 'Nothing logged in week ' + isoWeek(F.week) + '.' : 'Nothing logged in ' + MONTHS[+F.monthOf.slice(5) - 1] + '.');
  }
  h += `<section class="hsec"><div class="hhead"><span class="hdot" style="background:${c}"></span><span class="mono" style="flex:1">${esc(dayLabel(d))}</span>
</div>
    ${planPanel(d)}${mealsOn(d).length || foodAnswers(d).length ? `<div style="margin-top:12px">${dayMeals(d)}</div>` : d <= T0 ? '<p class="note" style="margin-top:12px">Nothing logged.</p>' : ''}</section>`;
  return h;
}
// every day the open month calendar shows, including the spill-over days of the first and last week
function monthGrid(mo) { const [y, m] = mo.split('-').map(Number); let d = weekStart(iso(new Date(y, m - 1, 1))); const out = []; while (out.length < 42 && (out.length % 7 !== 0 || d.slice(0, 7) <= mo)) { out.push(d); d = addDays(d, 1); } return out; }
function logEntries(list, empty) {
  const days = [...new Set(list)].filter((d) => mealsOn(d).length || foodAnswers(d).length).sort().reverse();
  if (!days.length) return `<p class="note" style="padding:14px 2px">${esc(empty)}</p>`;
  return days.map((d) => { const c = dayCounts(d);
    const sum = KINDS3.filter(([k]) => c[k]).map(([k, one, many]) => c[k] + ' ' + (c[k] === 1 ? one : many).toLowerCase()).join(' · ');
    const ov = overOn(d); if (ov) { const open = !!(S.fdOpen || {})[d];
      return `<section class="hsec"><button class="hhead fdh" data-a="fdexp" data-v="${d}" aria-expanded="${open}"><span class="lbl"><span class="mono">${esc(dayLabel(d))}</span>${open && sum ? `<small>${esc(sum)}</small>` : ''}</span><span role="img" aria-label="Overeating: ${SCALES.symptom3[ov - 1]}">${markSvg('over', 16, '', { col: overCol(ov) })}</span></button>${open ? dayMeals(d) : ''}</section>`; }
    return `<section class="hsec"><button class="hhead fdh" data-a="fdday" data-v="${d}"><span class="lbl"><span class="mono">${esc(dayLabel(d))}</span>${sum ? `<small>${esc(sum)}</small>` : ''}</span>${followed(d) ? `<span role="img" aria-label="Meal plan followed">${markSvg('food', 16)}</span>` : dayBroke(d) ? `<span role="img" aria-label="Day broken">${markSvg('broke', 16)}</span>` : ''}</button>${dayMeals(d)}</section>`; }).join('');
}
// More sample weeks (2026-11-02: the open month should have a full log to test with)
function foodSampleMore(m) {
  const meals = ['Porridge', 'Toast and eggs', 'Yoghurt and granola', 'Omelette', 'Leftover stew', 'Pasta with pesto', 'Fish and rice', 'Bean chilli', 'Soup and bread', 'Stir fry', 'Baked potato', 'Pizza'];
  const small = ['Apple', 'Banana', 'Carrot sticks', 'Pear', 'Grapes', 'Cucumber'];
  const snacks = ['Cinnamon bun', 'Slice of cake', 'Croissant', 'Brownie'];
  const p3 = m.settings.plan3 = m.settings.plan3 || PLAN0();
  for (let k = 7; k <= 40; k++) { const d = addDays(T0, -k); if ((m.photos[d] || []).length) continue; const wd = (parse(d).getDay() + 6) % 7; const items = [];
    items.push([meals[k % meals.length], 'meal']); if (k % 3) items.push([small[k % small.length], 'snack']); items.push([meals[(k * 5 + 3) % meals.length], 'meal']);
    if (k % 9 === 0) items.push([meals[(k + 7) % meals.length], 'meal']);
    if (wd === 5 && k % 14 !== 6) { items.push([snacks[k % snacks.length], 'treat']); p3.days[d] = { extras: ['x-snackday'] }; }
    if (k % 11 === 0) { items.push([small[(k + 2) % small.length], 'snack']); p3.days[d] = { extras: ((p3.days[d] || {}).extras || []).concat('x-sugar') }; }
    m.photos[d] = items.map(([text, kind], i) => ({ id: 'pm' + k + '-' + i, text, kind, tags: [] }));
    if (m.items['tr-intake'] && k % 2) { const L2 = m.log[d] = m.log[d] || {}; L2['tr-intake'] = k % 4 === 1 ? ['Caffeine'] : ['Caffeine', 'Sugar']; } }
}
// Sample food diary (2026-11-02): written meals and nutrition tags for the past week, only while the examples are in.
function foodSample(m) {
  const day = (k) => addDays(T0, -k); const L2 = (d) => (m.log[d] = m.log[d] || {});
  Object.keys(m.photos).forEach((d) => { m.photos[d] = (m.photos[d] || []).filter((p) => !String(p.id).startsWith('pm')); });
  const M_ = (t) => [t, 'meal'], S_ = (t) => [t, 'snack'], T_ = (t) => [t, 'treat'];
  const days = { 0: [M_('Porridge with banana')], 1: [M_('Toast and eggs'), S_('Apple'), M_('Chicken curry with rice')], 2: [M_('Pancakes'), S_('Carrot sticks'), T_('Cinnamon bun'), M_('Roast vegetables and halloumi')],
    3: [M_('Big breakfast'), S_('Banana'), M_('Wraps on the trail'), S_('Trail mix'), S_('Cereal bar'), M_('Pasta')], 4: [M_('Yoghurt and granola'), T_('Chocolate'), M_('Lentil soup')],
    5: [M_('Toast and peanut butter'), S_('Juice'), S_('Crackers'), S_('Pear'), M_('Salmon, potatoes and greens')], 6: [M_('Porridge'), M_('Cheese sandwich'), M_('Burger and chips')] };
  Object.entries(days).forEach(([k, ms]) => { const d = day(+k); m.photos[d] = (m.photos[d] || []).concat(ms.map(([text, kind], i) => ({ id: 'pm' + k + '-' + i, text, kind, tags: [] }))); });
  const st = m.settings; st.plan3 = st.plan3 || PLAN0();
  st.plan3.days[day(3)] = { extras: ['x-hike'] }; st.plan3.days[day(5)] = { extras: ['x-sugar'] }; st.plan3.days[day(2)] = { extras: ['x-snackday'] };
  const tags = { 0: ['Caffeine'], 1: ['Caffeine', 'Sugar'], 2: ['Sugar'], 3: ['Caffeine'], 4: ['Caffeine', 'Skipped a meal'], 5: ['Sugar'], 6: ['Caffeine', 'Takeaway'] };
  if (m.items['tr-intake']) Object.entries(tags).forEach(([k, v]) => { const cur = L2(day(+k))['tr-intake']; L2(day(+k))['tr-intake'] = [...new Set((Array.isArray(cur) ? cur : []).concat(v))]; });
}
function tabBody(tid, d, c, o = {}) {
  const t = G(tid);
  if (t.special === 'events') {
    const evs = M.events.filter((e) => e.day === d);
    return `<div class="hlist">${evs.map((e) => `<div class="trow"><div class="thead"><span class="tname" style="font-weight:400">${esc(e.text)}</span><button class="rm" data-a="hevrm" data-ref="${e.id}" aria-label="Remove">✕</button></div></div>`).join('')}
      ${addOpen('hev') ? `<div class="inrow" style="margin-top:8px"><input class="inp" id="hev" placeholder="Something that happened today" enterkeyhint="done"><button class="btn" data-a="hevadd">Add</button></div>` : `<button class="addrow" data-a="openadd" data-v="hev"><span class="plus">+</span>Life event</button>`}</div>`;
  }
  if (t.special === 'conds') {
    // ONE shared list, the same in Health and Training (2026-11-06; the 2026-11-05 split is gone, tags sort them now).
    // fit only picks the default tag for a new one (Injury on Training, Illness on Health)
    const fit = !!o.fit; const now = d === T0;
    // today: ongoing first, then ENDED ones (switch off, archive button) until I archive them; the Archive keeps the rest and
    // gives them back (2026-11-06). A past day lists what was going on that day.
    const on = now ? M.conds.filter((x) => !x.end && x.start <= d) : M.conds.filter((x) => x.start <= d && (!x.end || x.end > d));
    const ended = now ? M.conds.filter((x) => x.end && !x.arch).sort((a, b) => b.end.localeCompare(a.end)) : [];
    const arch = now ? M.conds.filter((x) => x.end && x.arch).sort((a, b) => b.end.localeCompare(a.end)) : [];
    const sub = (x) => `${ctagMarks(x)}${ctagWords(x) ? esc(ctagWords(x)) + ' · ' : ''}${x.end && x.end <= d ? `Ended ${esc(fmtDate(x.end))} · ${diff(x.start, x.end)} ${diff(x.start, x.end) === 1 ? 'day' : 'days'}` : `Day ${diff(x.start, d) + 1} · since ${esc(fmtDate(x.start))}`}`;
    const row = (x, kind) => `<div class="tg cond ${kind}"><button class="l" data-a="condopen" data-ref="${x.id}" style="text-align:left">${esc(x.name)}<small>${sub(x)}</small></button>${
      kind === 'arch' ? `<button class="soft condic" data-a="condarch" data-ref="${x.id}" aria-label="Bring back ${esc(x.name)}" title="Bring back">${icon('archive-arrow-up', 18)}</button>`
      : `${kind === 'ended' ? `<button class="soft condic" data-a="condarch" data-ref="${x.id}" aria-label="Archive ${esc(x.name)}" title="Archive">${icon('archive', 18)}</button>` : ''}<button class="swt" role="switch" aria-checked="${!x.end}" data-a="hcondend" data-ref="${x.id}" aria-label="${esc(x.name)} ongoing"></button>`}</div>`;
    const archOpen = S.open['condarch'] === true;
    return `<div class="hlist">${on.map((x) => row(x, 'on')).join('') || `<p class="note" style="padding:8px 0">No ongoing conditions.</p>`}
      ${addOpen('hcond') ? `<div class="addrow condadd"><button class="plus" data-a="hcondadd" aria-label="Start a condition">+</button><input id="hcond" ${fit ? 'data-fit="1" ' : ''}placeholder="Start a condition, like a cold or a sore knee" enterkeyhint="done" autocomplete="off"></div>` : `<button class="addrow" data-a="openadd" data-v="hcond"><span class="plus">+</span>Condition</button>`}
      ${ended.length ? `<span class="mono condsub">Ended</span>${ended.map((x) => row(x, 'ended')).join('')}` : ''}
</div>`;
  }
  return trackerList(tid, d, c);
}

// sheets
// Symptomatic feelings (2026-11-03): all feelings are logged in one place, the Feelings block. Some feelings are
// marked as symptomatic (self-hatred, toxic shame...): picking one always counts as a symptom (red ring, wavy underline on the
// card, listed under Symptoms). 'Edit feelings' marks words as symptomatic and adds own words to a family.
// Symptom feelings = the words of the Dysregulation family (2026-11-04, was "Dysregulated" + a per-word symptom marking).
// Only that family can be changed; Plutchik's families and the in-between feelings stay fixed.
const SYMFAM = 'Dysregulation'; const SYMNAMES = ['Dysregulation', 'Symptomatic', 'Dysregulated'];
const symFam = () => feelSet().find((x) => SYMNAMES.includes(x[0]));
const feelSymOk = () => (symFam() || [, , []])[2];
const feelSymOn = (d) => feelOf(d).filter((w) => feelSymOk().includes(w));
function feelSheet() {
  const ws = feelOf(T0); const cfg = S.sheet && S.sheet.cfg;
  const base = new Set(FEELINGS_DEF.flatMap((x) => x[2]).concat(Object.keys(DYADS)));
  const chip = (w, c) => {
    if (cfg) return `<span class="fwrap"><span class="hchip" style="background:${mix(c, TH.card, 0.82)}">${esc(w)}</span><button class="fx" data-a="feeldel" data-v="${esc(w)}" aria-label="Remove ${esc(w)}">${icon('x', 12, 2.4)}</button></span>`;
    const on = ws.includes(w);
    return `<button class="hchip" data-a="feelw" data-v="${esc(w)}" aria-pressed="${on}" aria-label="${esc(w)}" style="${on ? `background:${stepTone(wordCol(w, c), intensity(w))};border-color:${stepTone(wordCol(w, c), intensity(w))}` : FEELINGS_DEF.some((x) => x[2].includes(w)) ? `background:${mix(stepTone(c, intensity(w)), TH.card, 0.82)}` : DYADS[w] ? `background:${mix(wordCol(w), TH.card, 0.82)}` : c ? `background:${mix(c, TH.card, 0.82)}` : ''}">${esc(w)}</button>`; };
  // the in-between feelings sit between the two families they join, in wheel order (2026-11-03): love after Joy, before Trust...
  const between = (feelSet().find((x) => x[0] === 'Between') || [, , []])[2].filter((w) => DYADS[w]);
  const dyRow = (f) => between.filter((w) => DYADS[w][0] === f).map((w) => `<div class="fld"><span class="mono" style="display:flex;align-items:center;gap:8px"><span class="hdot" style="background:${wordCol(w)}"></span>${esc(DYADS[w][0])} + ${esc(DYADS[w][1])}</span><div class="chips">${chip(w)}</div></div>`).join('');
  const isSym = (f) => SYMNAMES.includes(f);
  // outside the symptom-feelings editor: the spinning feeling wheel, then my symptom feelings as chips (2026-11-06)
  // the wheel alone, as wide as the pop-up (2026-11-06: no symptom feelings or hint text here)
  if (!cfg) return wheelBlock(ws);
  return `` +
    feelSet().map(([f, c, words], fi) => !isSym(f) ? '' : `<div class="fld"><span class="mono" style="display:flex;align-items:center;gap:8px"><span class="hdot" style="background:${c}"></span>${esc(f)}</span><div class="chips">${words.map((w) => chip(w, c)).join('')}<span class="fadd"><input class="inp" data-fadd="${fi}" placeholder="+ Feeling" aria-label="Add a symptom feeling"></span></div></div>`).join('') +
    `<div class="btns"><button class="btn dark" data-a="feelcfg">Done editing</button></div>`;
}
// Check-ins are full screen and go step by step (2026-11-02). The steps are worked out when the check-in opens,
// so pages that only show when nothing is logged (Training, Nutrition) don't jump away while you answer.
const AVOID = (k) => I(k) && I(k).scale === 'avoid';
const tabsOf = (gid) => (G(gid) ? G(gid).kids.filter(G) : []);
// Which categories a check-in asks is a per-category setting (2026-11-02): each one becomes its own step,
// in page order. Check-ins' own items (mood, motivation...) make the feelings page.
function groupParts(gid) {
  const g = G(gid);
  if (g.special === 'food') return [{ food: true }];
  if (g.holds === 'htabs') return tabsOf(gid).map((t) => G(t).special ? { title: G(t).name, tab: t, gid } : { title: G(t).name, ids: G(t).kids.filter((k) => I(k)), gid });
  return [{ list: gid }];
}
function ciSteps(which) {
  const d = T0; const steps = []; const own = ciQs(which);
  const cats = G('g-health').kids.filter((g) => G(g) && G(g).style === 'hgroup' && G(g).special !== 'checkins' && G(g).ci === which);
  const catStep = (g) => ({ name: G(g).name, parts: groupParts(g) });
  if (which === 'morning') {
    cats.forEach((g) => steps.push(catStep(g)));
    const mood = own.filter((k) => I(k).scale === 'mood5');
    steps.push({ name: 'Feelings and mood', parts: [{ feel: true }, { ids: mood }, { ids: own.filter((k) => !mood.includes(k)) }] });
    return steps;
  }
  const ORDER = ['tr-mood', 'tr-mot', 'tr-prod', 'tr-energy'];
  steps.push({ name: 'How I feel', parts: [{ feel: true }, { ids: own.slice().sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99)) }] });
  let food = null;
  cats.forEach((g) => {
    if (G(g).special === 'food') { food = catStep(g); return; }
    steps.push(catStep(g));
  });
  // Training and Nutrition are always asked in the evening, also when I logged them during the day (2026-11-10)
  if (trainCats().length) steps.push({ name: 'Training', parts: [{ training: true }].concat(G('hg-aches') && kidsOf('hg-aches').length ? [{ title: G('hg-aches').name, list: 'hg-aches' }] : []) }); // with its aches and pains (2026-11-09)
  if (food) steps.push(food);
  return steps;
}
function ciPart(p, d) {
  const c = p.gid ? (G(p.gid) || {}).color || '#9A9387' : null;
  let h = p.title ? `<span class="mono cisub">${esc(p.title)}</span>` : '';
  if (p.note) h += `<p class="note">${esc(p.note)}</p>`;
  if (p.feel) h += feelCard(d);
  if (p.ids) h += trackRows(p.ids, d, c || hcolor(p.ids[0]), (k) => `<div class="trow">${isTags(k) ? '' : `<div class="thead"><span class="tname">${esc(I(k).name)}</span>${hyperDetHead(k, d, c || hcolor(k))}</div>`}${answerUI(k, d, c || hcolor(k))}${partDet(k, d, c || hcolor(k))}</div>`);
  if (p.list) h += trackerList(p.list, d, G(p.list).color || '#9A9387');
  if (p.tab) h += tabBody(p.tab, d, c);
  if (p.training) h += trainCats().map((c) => `<span class="mono cisub">${esc(G(c).name)}</span><div class="list">${kidsOf(c).map((k) => itemRow(k, c, d)).join('') || '<p class="empty">No sessions yet.</p>'}</div>`).join('') || '<p class="note">No training set up yet.</p>'; // every training option (2026-11-09)
  if (p.food) h += photosUI(d) + trackerList(foodGroup(), d, G(foodGroup()).color);
  return `<div class="cipart">${h}</div>`;
}
function checkinSheet(s) {
  const it = I(s.ref); const which = it.which; const d = T0;
  if (!s.steps) s.steps = ciSteps(which).filter((st) => st.parts.some((p) => !p.ids || p.ids.length));
  const n = s.steps.length; const k = Math.min(s.step || 0, n - 1); const st = s.steps[k]; const last = k === n - 1;
  const body = st ? st.parts.filter((p) => !p.ids || p.ids.length).map((p) => ciPart(p, d)).join('') : '<p class="note">This check-in asks nothing yet.</p>';
  const done = hval(d, s.ref);
  const end = which === 'morning' ? 'Good morning' : 'Good night';
  return `<div class="cibody">${body}</div><div class="cifoot">${k > 0 ? `<button class="btn" data-a="cistep" data-v="${k - 1}">Back</button>` : '<span class="btn ciph" aria-hidden="true">Back</span>'}${last ? `<button class="btn dark" data-a="cifinish" data-v="${s.ref}">${done ? 'Save' : end}</button>` : `<button class="btn dark" data-a="cistep" data-v="${k + 1}">Next</button>`}</div>
    ${last && done ? `<button class="soft cinot" data-a="cidone" data-v="${s.ref}">Not done</button>` : ''}</div>`;
}
function ciHeader(s) {
  const n = (s.steps || []).length; const k = Math.min(s.step || 0, n - 1);
  return `<div class="cibar" role="progressbar" aria-valuemin="1" aria-valuemax="${n}" aria-valuenow="${k + 1}" aria-label="Step ${k + 1} of ${n}">${(s.steps || []).map((st, i) => `<button class="${i <= k ? 'on' : ''}" data-a="cistep" data-v="${i}" aria-label="Go to ${esc(st.name)}"></button>`).join('')}</div>
    <header><div class="cititle"><span class="mono">${esc(I(s.ref).name)} · ${k + 1} of ${n}</span><h2>${esc(n ? s.steps[k].name : I(s.ref).name)}</h2></div><button class="hb" data-a="closesheet" aria-label="Close">${icon('x', 22)}</button></header>`;
}
const TTYPES = [['yesno', 'Tag', 'Ticked is yes, not ticked is no'], ['quality3', 'Quality', 'Poor · fine · good'], ['amount3', 'Amount', 'A little · some · a lot'], ['symptom3', 'Symptom', 'Present · distressing · debilitating'], ['mood5', 'Mood', 'Five faces'], ['avoid', 'Avoidance', 'Sun for showing up · moon for avoiding']];
const TTNAME = Object.fromEntries(TTYPES.map(([k, l]) => [k, l]));
function trackerSheet(s) {
  const D = s.draft;
  let h = `<div class="fld"><span class="mono">Name</span><input class="inp" id="dname" placeholder="Name" value="${esc(D.name)}" ${s.isNew ? 'data-autofocus' : ''}></div>`;
  h += `<div class="fld"><span class="mono">Answer</span><div class="chips">${TTYPES.map(([k, l]) => `<button class="chip" data-a="tset" data-k="scale" data-v="${k}" aria-pressed="${D.scale === k}">${l}</button>`).join('')}</div>
    ${D.scale === 'choices' ? `<div class="stack" style="gap:6px">${(D.options || []).map((o, i) => `<div class="inrow"><input class="inp" data-opt="${i}" value="${esc(o)}"><button class="rm" data-a="toptrm" data-v="${i}" aria-label="Remove option">✕</button></div>`).join('')}<button class="addbtn" data-a="toptadd"><span class="plus">+</span>Add option</button></div>` : ''}</div>`;
  h += `<div class="fld"><span class="mono">Colour</span>${colorField('draft', D.color, { inherit: true })}</div>`;
  h += `<div class="fld"><span class="mono">Kind</span><div class="chips">${[['', 'None'], ['behaviour', 'Behaviour'], ['experience', 'Experience'], ['circumstance', 'Circumstance']].map(([k, l]) => `<button class="chip" data-a="tset" data-k="kind" data-v="${k}" aria-pressed="${(D.kind || '') === k}">${l}</button>`).join('')}</div></div>`;
  h += tagField(D, 'ttag'); if (D.scale === 'yesno' || D.scale === 'avoid' || SCALES[D.scale] || D.scale === 'choices') h += linkField2(D);
  if (D.scale === 'symptom3' || SCALES[D.scale]) h += `<div class="fld"><span class="mono">Details to pick</span><div class="stack" style="gap:6px">${(D.parts || []).map((o, i) => `<div class="inrow"><input class="inp" data-part="${i}" value="${esc(o)}" placeholder="Like jaw"><button class="rm" data-a="tpartrm" data-v="${i}" aria-label="Remove detail">✕</button></div>`).join('')}<button class="addbtn" data-a="tpartadd"><span class="plus">+</span>Add a detail</button></div></div>`;
  { const pg = Object.keys(M.groups).find((k) => M.groups[k].kids.includes(s.ref)); const lead = pg ? G(pg).kids.filter((k) => I(k))[0] : null;
    if (lead && lead !== s.ref) h += sw('after', 'Only after ' + esc(I(lead).name), D.after, 'Shows once ' + esc(I(lead).name.toLowerCase()) + ' has an answer'); }
  if (!s.isNew) h += `<div class="btns"><button class="btn danger" data-a="ddelete">Delete</button></div>`;
  return h;
}
function photoSheet(s) {
  const d = s.d || T0; const p = mealsOn(d).find((x) => x.id === s.ref); if (!p) return '';
  const tags = M.settings.foodTags || []; const mk = mealKind(p);
  return (mealSrc(p) ? `<button class="mealpic" data-a="mealview" data-ref="${p.id}" data-v="${d}" aria-label="View the photo"><img src="${esc(mealSrc(p))}" alt="" style="width:100%;border-radius:14px;max-height:260px;object-fit:cover;display:block"></button>` : `<label class="addbtn" style="cursor:pointer">${icon('camera', 20)} Add a photo<input type="file" accept="image/*" id="photoin2" hidden></label>`) +
    `<div class="fld" style="margin-top:12px"><span class="mono">What was it</span><textarea class="inp" id="mealtxt" rows="2" placeholder="Like pasta with pesto" ${s.isNew ? 'data-autofocus' : ''}>${esc(p.text || '')}</textarea></div>
    <div class="fld"><span class="mono">Counts as</span><div class="chips">${KINDS3.map(([k, l]) => `<button class="chip" data-a="pkind" data-v="${k}" aria-pressed="${mk === k}">${l}</button>`).join('')}</div></div>
    <div class="fld"><span class="mono">Tags</span><div class="chips">${tags.map((t) => `<button class="hchip" data-a="ptag" data-v="${esc(t)}" aria-pressed="${(p.tags || []).includes(t)}" style="${(p.tags || []).includes(t) ? 'background:' + pale('#6FA24A') + ';border-color:#6FA24A' : ''}">${esc(t)}</button>`).join('')}</div>
    ${addOpen('ptagnew') ? `<div class="inrow"><input class="inp" id="ptagnew" placeholder="New tag"><button class="btn" data-a="ptagadd">Add</button></div>` : `<div class="chips">${addChip('ptagnew', 'New tag')}</div>`}</div>
    <div class="btns"><button class="btn dark" data-a="mealdone">Done</button><button class="btn danger" data-a="photodel">Delete meal</button></div>`;
}
const curMeal = () => { const s = S.sheet; return s && s.kind === 'photo' ? mealsOn(s.d || T0).find((x) => x.id === s.ref) : null; };
function mcapture() { const p = curMeal(); const t = document.getElementById('mealtxt'); if (p && t) p.text = t.value.trim(); }
function tcapture() { const s = S.sheet; if (!s || s.kind !== 'tracker') return; const n = document.getElementById('dname'); if (n && n.value.trim()) s.draft.name = n.value.trim();
  document.querySelectorAll('[data-opt]').forEach((el) => { s.draft.options[+el.dataset.opt] = el.value; }); document.querySelectorAll('#layer [data-part]').forEach((el) => { s.draft.parts[+el.dataset.part] = el.value; }); }
// the items this one ticks with it, in its editor: chips to take off, a list to add from
const isTrainSheet = (s) => typeof trainCats === 'function' && ((s.home && trainCats().includes(s.home)) || (s.ref && trainCats().some((c) => kidsOf(c).includes(s.ref))));
function afterField(D) { const L = (D.then || []).filter(I); const self = S.sheet && S.sheet.ref; const tr = new Set(trainCats().flatMap(kidsOf));
  const all = Object.keys(M.items).filter((k) => k !== self && !L.includes(k) && !tr.has(k) && (I(k).type === 'task' || I(k).type === 'routine') && !I(k).part && !I(k).brk && !(!repeatable(I(k)) && everDone(k)) && placements(k).some((p) => G(p) && G(p).style === 'dayblock')).sort((a, b) => I(a).name.localeCompare(I(b).name));
  return `<div class="fld"><span class="mono">Always after</span>${L.length ? `<div class="chips">${L.map((k) => `<button class="chip" data-a="afterrm" data-v="${k}" aria-label="Stop putting ${esc(I(k).name)} after it">${esc(I(k).name)} ✕</button>`).join('')}</div>` : ''}<select class="inp" data-afteradd="1" aria-label="Add a task that always comes after it" style="margin-top:6px"><option value="">+ Add a task</option>${all.map((k) => `<option value="${k}">${esc(I(k).name)}</option>`).join('')}</select></div>`; }
function linkField2(D) { const L = (D.links || []).filter(I); const self = S.sheet && S.sheet.ref; const all = Object.keys(M.items).filter((k) => LINKABLE(k) && k !== self && !L.includes(k) && !(I(k).type === 'task' && !repeatable(I(k)) && everDone(k))).sort((a, b) => I(a).name.localeCompare(I(b).name));
  return `<div class="fld"><span class="mono">Also ticks</span>${L.length ? `<div class="chips">${L.map((k) => `<button class="chip" data-a="linkrm" data-v="${k}" aria-label="Stop ticking ${esc(I(k).name)}">${esc(I(k).name)} ✕</button>`).join('')}</div>` : ''}<select class="inp" data-linkadd="1" aria-label="Add an item it ticks" style="margin-top:6px"><option value="">+ Add an item</option>${all.map((k) => `<option value="${k}">${esc(I(k).name)}${I(k).type === 'tracker' ? ' · tag' : ''}</option>`).join('')}</select></div>`; }

// photos: kept as artifact assets when that is available, otherwise as a small picture inside the saved data
let assetsNS;
// a canvas becomes a stored picture: an uploaded asset where there is a store, else a small inline image
async function picFromCanvas(cv) {
    const pic = {};
    if (assetsNS === undefined) { try { assetsNS = window.claude && window.claude.use ? await window.claude.use('assets') : null; } catch (e) { assetsNS = null; } if (!assetsNS && HOSTED) assetsNS = LOCAL_ASSETS; }
    if (assetsNS) { const blob = await new Promise((r) => cv.toBlob(r, 'image/jpeg', 0.8)); const up = await assetsNS.upload(blob); pic.asset = up.id; }
    else { const c2 = document.createElement('canvas'); const k2 = Math.min(1, 320 / Math.max(cv.width, cv.height)); c2.width = cv.width * k2; c2.height = cv.height * k2; c2.getContext('2d').drawImage(cv, 0, 0, c2.width, c2.height); pic.src = c2.toDataURL('image/jpeg', 0.6); }
  return pic; }
async function addPhoto(file, into, nth, many) {
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
    const k = Math.min(1, 720 / Math.max(img.width, img.height)); const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    const pic = await picFromCanvas(cv);
    if (into === 'jimg') { jAddImg(pic, cv.width / cv.height, nth || 0); return; }
    if (typeof into === 'string' && into.startsWith('board:')) { bPhoto(into.slice(6), pic, cv.width / cv.height); return; }
    if (typeof into === 'string' && into.startsWith('proj:')) { const g = G(into.slice(5)); if (g) change(() => { (g.photos = g.photos || []).push(Object.assign({ id: uid('ph'), d: T0 }, pic)); }, 'Photo added'); return; }
    if (into) { mcapture(); const p = curMeal(); if (p) { change(() => { Object.assign(p, pic); }, 'Photo added'); renderLayer(); } return; }
    const p = Object.assign({ id: uid('p'), tags: [], at: nowHM(), kind: 'meal' }, pic);
    change(() => { (M.photos[T0] = M.photos[T0] || []).push(p); }, 'Meal added');
    if (!many || nth === many - 1) openSheet({ kind: 'photo', ref: p.id, d: T0, title: 'Meal' });
  } catch (e) { flash('Could not add that photo'); }
}
const nowHM = () => { const n = new Date(); return pad(n.getHours()) + ':' + pad(n.getMinutes()); };
function xcapture() { document.querySelectorAll('[data-xname]').forEach((el) => { const x = mealPlan().extras.find((e) => e.id === el.dataset.xname); if (x && el.value.trim()) x.name = el.value.trim(); }); }
document.addEventListener('change', (e) => { if (e.target.dataset && e.target.dataset.xname) { xcapture(); save(); return; }
  const ds = e.target.dataset || {};
  if (ds.fadd != null) { const w = e.target.value.trim().toLowerCase(); if (w && !feelSet().some((x) => x[2].includes(w))) change(() => { const set = JSON.parse(JSON.stringify(feelSet())); set[+ds.fadd][2].push(w); M.settings.feelings = set; }); renderLayer(); return; }
  if (ds.partadd) { const k = e.target.value; const s = S.sheet; if (k && s && I(k)) { capture(); (s.steps = s.steps || []).push({ id: k, name: I(k).name, link: true, optional: false, only: '', days: [], tags: [] }); } renderLayer(); return; }
  if (ds.afteradd) { const k = e.target.value; const s = S.sheet; if (k && s && s.draft) { capture(); s.draft.then = (s.draft.then || []).concat(k); } renderLayer(); return; }
  if (ds.linkadd) { const k = e.target.value; const s = S.sheet; if (k && s && s.draft) { if (s.kind === 'item') capture(); else tcapture(); s.draft.links = (s.draft.links || []).concat(k); } renderLayer(); return; }
  if (ds.badd) { const k = e.target.value; if (k) change(() => { const mp = mealPlan(); (mp.breaks = mp.breaks || []).push({ id: k, min: 1 }); }); renderLayer(); return; }
  if (ds.bmin) { const b = (mealPlan().breaks || []).find((x) => x.id === ds.bmin); if (b) change(() => { b.min = +e.target.value; }); renderLayer(); return; }
  if (ds.xwhen) { xcapture(); const x = mealPlan().extras.find((y) => y.id === ds.xwhen); const v = e.target.value; change(() => { if (!v) { delete x.when; const m0 = (x.more || []).shift(); if (m0) x.when = m0; if (x.more && !x.more.length) delete x.more; } else x.when = wParse(v); }); renderLayer(); return; }
  if (ds.xmore) { xcapture(); const x = mealPlan().extras.find((y) => y.id === ds.xmore); const v = e.target.value; if (x) change(() => { const L = x.more = x.more || []; if (ds.i === 'new') { if (v) L.push(wParse(v)); } else if (!v) L.splice(+ds.i, 1); else L[+ds.i] = wParse(v); if (!L.length) delete x.more; }); renderLayer(); return; }
  if (ds.xkm || ds.xkind) { const x = mealPlan().extras.find((y) => y.id === (ds.xkm || ds.xkind)); if (x && x.when) change(() => { if (ds.xkm) x.when.km = Math.max(0, +e.target.value || 0); else x.when.kind = e.target.value.trim() || 'Hike'; }); return; }
  // several photos can be picked at once (2026-11-11): each one is added in turn
  if (e.target.id === 'photoin' && e.target.files[0]) addPhotos(e.target.files); if (e.target.id === 'photoin2' && e.target.files[0]) addPhoto(e.target.files[0], true); if (e.target.id === 'jimgin' && e.target.files[0]) addPhotos(e.target.files, 'jimg'); });
async function addPhotos(fl, into) { const L0 = Array.from(fl || []); for (let k = 0; k < L0.length; k++) await addPhoto(L0[k], into, k, L0.length); }

// actions for Health; returns true when it handled the action
function healthAction(act, a, ref, v) {
  switch (act) {
    case 'brkrm': { change(() => { const mp = mealPlan(); mp.breaks = (mp.breaks || []).filter((b) => b.id !== v); }); renderLayer(); return true; }
    case 'hopen': S.open['h:' + ref] = ref === 't-conds' ? S.open['h:' + ref] !== true : S.open['h:' + ref] === false; // Training's Conditions start closed try { localStorage.setItem('daybook3-shut', JSON.stringify(Object.keys(S.open).filter((k) => k.startsWith('h:') && S.open[k] === false))); } catch (e) {} render(); return true;
    case 'hmore': S.open['more:' + ref] = !S.open['more:' + ref]; render(); return true;
    case 'htab': S.htab[ref] = +v; render(); return true;
    case 'projact': { const gn = document.getElementById('gname'); const nmv = gn && gn.value.trim(); change(() => { if (nmv) G(ref).name = nmv; if (v) G(ref).act = v; else delete G(ref).act; }); renderLayer(); return true; }
    case 'gci': { change(() => { if (v) G(ref).ci = v; else delete G(ref).ci; }); renderLayer(); return true; }
    case 'cistep': if (S.sheet && S.sheet.kind === 'checkin') { S.sheet.step = +v; S._lastSheet = null; renderLayer(); } return true;
    case 'hyperdone': { S.sheet = (S.sheet && S.sheet.back) || null; render(); return true; }
    case 'hset': { const cur = hval(T0, ref); const nv = /^\d+$/.test(v) ? +v : v; change(() => { if (cur === nv) { delete L(T0)[ref]; delete L(T0)['pt:' + ref]; } else L(T0)[ref] = nv; });
      if (isHyper(ref) && cur !== nv && nv && partOpts(ref).length) openSheet({ kind: 'hyper', ref, title: 'Hyperfocus' }); return true; }
    case 'hpick': { change(() => { const arr = Array.isArray(hval(T0, ref)) ? hval(T0, ref).slice() : []; const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); if (arr.length) L(T0)[ref] = arr; else delete L(T0)[ref]; }); return true; }
    case 'feel': openSheet({ kind: 'feel', title: 'How do I feel?', back: S.sheet && S.sheet.kind === 'checkin' ? S.sheet : null }); return true;
    case 'feelw': { change(() => { const ws = (M.feel[T0] || []).slice(); const i = ws.indexOf(v); if (i >= 0) ws.splice(i, 1); else ws.push(v); M.feel[T0] = ws; }); renderLayer(); return true; }
    case 'feeldel': { change(() => { M.settings.feelings = feelSet().map(([f, c, ws]) => [f, c, ws.filter((w) => w !== v)]); }); renderLayer(); return true; }
    case 'feelcfg': S.sheet.cfg = !S.sheet.cfg; renderLayer(); return true;
    case 'cifinish': { const ci = v; const now = new Date(); const at = pad(now.getHours()) + ':' + pad(now.getMinutes());
      const f0 = (S.sheet && S.sheet.feel0) || []; const cf = I(ci).which === 'morning' ? (M.feel[T0] || []).filter((w) => !f0.includes(w)) : null;
      change(() => { L(T0)[ci] = 'done@' + at; if (cf) { const mf = [...new Set(((M.log[T0] || {})['ci-mfeel'] || []).concat(cf))]; if (mf.length) L(T0)['ci-mfeel'] = mf; } }, (I(ci).which === 'morning' ? 'Good morning' : 'Good night') + '. Check-in saved'); S.sheet = null; render(); return true; }
    // Adding to a group (2026-11-02): first pick the type, then its settings screen
    case 'addtracker': openSheet({ kind: 'ttype', in: a.dataset.in, title: 'Add to ' + G(a.dataset.in).name }); return true;
    case 'ttpick': { const gin = S.sheet.in; const kind = v === 'avoid' || v === 'yesno' ? 'behaviour' : 'experience';
      openSheet({ kind: 'tracker', isNew: true, in: gin, ref: uid(v === 'yesno' ? 'tg' : 'tr'), title: 'New ' + TTNAME[v].toLowerCase(), draft: { name: '', type: 'tracker', scale: v, kind, tags: [], insight: true }, back: S.sheet }); return true; }
    case 'addhtab': { const id = uid('ht'); change(() => { M.groups[id] = { name: 'New tab', style: 'htab', holds: 'tracker', kids: [] }; G(ref).kids.push(id); S.htab[ref] = G(ref).kids.filter(G).length - 1; }); focusName(id); return true; }
    case 'addhgroup': { const id = uid('hg'); change(() => { M.groups[id] = { name: 'New group', style: 'hgroup', holds: 'tracker', color: '#7DBE9A', kids: [] }; G('g-health').kids.push(id); }); focusName(id); return true; }
    case 'hevadd': { const t = $('#hev').value.trim(); if (!t) return true; change(() => { M.events.push({ id: uid('e'), day: T0, text: t }); }, 'Life event added'); return true; }
    case 'hevrm': { change(() => { M.events = M.events.filter((e) => e.id !== ref); }, 'Removed'); return true; }
    case 'hcondadd': { const t = $('#hcond').value.trim(); const fit = $('#hcond').dataset.fit === '1';
      // nothing written: open the condition pop-up to fill in (2026-11-06: 'I can't add a condition')
      if (!t) { openSheet({ kind: 'cond', isNew: true, ref: uid('c'), title: 'New condition', draft: { name: '', start: T0, tags: [fit ? 'ct-inj' : 'ct-ill'].filter(ctag) } }); return true; } change(() => { M.conds.push(Object.assign({ id: uid('c'), name: t, start: T0, tags: [fit ? 'ct-inj' : 'ct-ill'].filter(ctag) })); }, (fit ? 'Added ' : 'Started ') + t); return true; }
    case 'hcondend': { const x = M.conds.find((c) => c.id === ref); if (!x) return true; const was = !!x.end; change(() => { x.end = was ? null : T0; }, (was ? 'Ongoing: ' : 'Ended ') + x.name); return true; }
    case 'hnewopt': openSheet({ kind: 'newopt', ref, title: 'New tag' }); return true;
    case 'htag': { change(() => { if (hval(T0, ref) === 'yes') delete L(T0)[ref]; else L(T0)[ref] = 'yes'; }); return true; }
    case 'hoptsave': { const t0 = $('#newopt').value.trim(); const gid = S.sheet.ref; if (G(gid)) { S.sheet = null; if (!t0) { render(); return true; }
      const id = uid('tg'); change(() => { M.items[id] = { name: t0, type: 'tracker', scale: 'yesno', kind: 'behaviour', tags: [], insight: true }; G(gid).kids.push(id); L(T0)[id] = 'yes'; }, 'Added ' + t0); return true; } }
    case 'hoptsave_old': { const t = $('#newopt').value.trim(); const r = S.sheet.ref; S.sheet = null; if (!t) { render(); return true; }
      change(() => { const it = I(r); it.options = it.options || []; if (!it.options.includes(t)) it.options.push(t); const arr = Array.isArray(hval(T0, r)) ? hval(T0, r).slice() : []; if (!arr.includes(t)) arr.push(t); L(T0)[r] = arr; }, 'Added ' + t); return true; }
    case 'fdexp': S.fdOpen = S.fdOpen || {}; S.fdOpen[v] = !S.fdOpen[v]; render(); return true;
    case 'diary': S.fd = { day: T0, month: false, monthOf: T0.slice(0, 7), sel: 'day' }; S.sheet = null; S.page = 'food'; render(); $('#main').scrollTop = 0; return true;
    case 'fdday': { const F = S.fd; const fromList = !!a.closest('.hsec');
      if (F.month && !fromList && F.sel === 'day' && F.day === v) F.sel = 'month'; else { F.day = v; F.sel = 'day'; }
      if (!F.month) F.monthOf = v.slice(0, 7); render(); if (fromList) $('#main').scrollTop = 0; return true; }
    case 'fdweek': { const F = S.fd; if (F.sel === 'week' && F.week === v) F.sel = 'month'; else { F.sel = 'week'; F.week = v; } render(); return true; }
    case 'fdmode': { const F = S.fd; F.month = !F.month; if (F.month) { F.sel = 'month'; F.monthOf = F.day.slice(0, 7); } else { F.day = T0; F.sel = 'day'; F.monthOf = T0.slice(0, 7); } render(); return true; }
    case 'fdmonth': { const [y, m] = S.fd.monthOf.split('-').map(Number); S.fd.monthOf = iso(new Date(y, m - 1 + +v, 1)).slice(0, 7); S.fd.sel = 'month'; render(); return true; }
    case 'fdextra': { const d = S.fd.day; const xx = mealPlan().extras.find((e) => e.id === v); if (!xx || (usedElsewhere(xx, d) && !isOn(xx, d))) return true; change(() => { const mp = mealPlan(); const o = mp.days[d] = mp.days[d] || {}; const ex = (o.extras || []).slice(); const off = (o.off || []).slice(); const on = isOn(xx, d);
      if (on) { if (ex.includes(v)) ex.splice(ex.indexOf(v), 1); if (autoOn(xx, d)) off.push(v); } else { if (off.includes(v)) off.splice(off.indexOf(v), 1); if (!autoOn(xx, d)) ex.push(v); }
      o.extras = ex; o.off = off; }); render(); return true; }
    case 'pkind': { mcapture(); const p = curMeal(); change(() => { p.kind = v; p.tags = (p.tags || []).filter((t) => !['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Treat'].includes(t)); }); render(); return true; }
    case 'xstep': { xcapture(); change(() => { const x = mealPlan().extras.find((e) => e.id === a.dataset.k); if (x) x[a.dataset.f] = Math.max(0, Math.min(9, (x[a.dataset.f] || 0) + +v)); }); render(); return true; }
    case 'xcolor': { xcapture(); change(() => { const x = mealPlan().extras.find((e) => e.id === a.dataset.k); if (x) x.color = v; }); renderLayer(); return true; }
    case 'xweekly': { xcapture(); change(() => { const x = mealPlan().extras.find((e) => e.id === v); if (x) x.weekly = !x.weekly; }); renderLayer(); return true; }
    case 'xadd': { xcapture(); change(() => { mealPlan().extras.push({ id: uid('x'), name: 'New extra', meal: 0, snack: 1, any: 0 }); }); render(); return true; }
    case 'xrm': { xcapture(); change(() => { const mp = mealPlan(); mp.extras = mp.extras.filter((e) => e.id !== v); }); render(); return true; }
    case 'mealweek': openSheet({ kind: 'mealweek', title: 'Meal plan', back: S.sheet }); return true;
    case 'mwstep': { xcapture(); change(() => { const w = mealPlan().week[+a.dataset.k]; w[a.dataset.f] = Math.max(0, Math.min(9, w[a.dataset.f] + +v)); }); renderLayer(); return true; }
    case 'meal': openSheet({ kind: 'photo', ref, d: v || T0, title: 'Meal', back: S.sheet && S.sheet.kind === 'diary' ? S.sheet : null }); return true;
    case 'mealnew': { const p = { id: uid('p'), tags: [], at: nowHM(), text: '', kind: 'meal' }; change(() => { (M.photos[T0] = M.photos[T0] || []).push(p); }); openSheet({ kind: 'photo', ref: p.id, d: T0, title: 'Meal', isNew: true }); return true; }
    case 'mealdone': { mcapture(); const s = S.sheet; const p = curMeal(); if (p && s.isNew && !p.text && !mealSrc(p)) { M.photos[T0] = mealsOn(T0).filter((x) => x.id !== p.id); } save(); closeSheet(); render(); return true; }
    case 'ptag': { mcapture(); const p = curMeal(); change(() => { const i = p.tags.indexOf(v); if (i >= 0) p.tags.splice(i, 1); else p.tags.push(v); }); renderLayer(); return true; }
    case 'ptagadd': { const t = $('#ptagnew').value.trim(); if (!t) return true; mcapture(); const p = curMeal(); change(() => { M.settings.foodTags = M.settings.foodTags || []; if (!M.settings.foodTags.includes(t)) M.settings.foodTags.push(t); if (!p.tags.includes(t)) p.tags.push(t); }); renderLayer(); return true; }
    case 'photodel': { const id = S.sheet.ref, d = S.sheet.d || T0; closeSheet(); change(() => { M.photos[d] = mealsOn(d).filter((x) => x.id !== id); }, 'Meal deleted'); return true; }
    case 'tset': tcapture(); S.sheet.draft[a.dataset.k] = v; if (a.dataset.k === 'scale' && v === 'choices' && !(S.sheet.draft.options || []).length) S.sheet.draft.options = ['Option']; renderLayer(); return true;
    case 'ttag': { tcapture(); const tg = S.sheet.draft.tags = S.sheet.draft.tags || []; const i = tg.indexOf(v); if (i >= 0) tg.splice(i, 1); else tg.push(v); renderLayer(); return true; }
    case 'tcolor': tcapture(); if (v) S.sheet.draft.color = v; else delete S.sheet.draft.color; renderLayer(); return true;
    case 'afterrm': { const s = S.sheet; if (s && s.draft) { capture(); s.draft.then = (s.draft.then || []).filter((x) => x !== v); if (!s.draft.then.length) delete s.draft.then; } renderLayer(); return true; }
    case 'linkrm': { const s = S.sheet; if (s && s.draft) { if (s.kind === 'item') capture(); else tcapture(); s.draft.links = (s.draft.links || []).filter((x) => x !== v); if (!s.draft.links.length) delete s.draft.links; } renderLayer(); return true; }
    case 'tpartadd': tcapture(); (S.sheet.draft.parts = S.sheet.draft.parts || []).push(''); renderLayer(); { const el = [...document.querySelectorAll('#layer [data-part]')].pop(); if (el) el.focus(); } return true;
    case 'tpartrm': tcapture(); S.sheet.draft.parts.splice(+v, 1); renderLayer(); return true;
    case 'hpart': { const k = 'pt:' + ref; change(() => { const A = (hval(T0, k) || []).slice(); const i = A.indexOf(v); if (i >= 0) A.splice(i, 1); else A.push(v); if (A.length) L(T0)[k] = A; else delete L(T0)[k]; }); return true; }
    case 'toptadd': tcapture(); (S.sheet.draft.options = S.sheet.draft.options || []).push(''); renderLayer(); return true;
    case 'toptrm': tcapture(); S.sheet.draft.options.splice(+v, 1); renderLayer(); return true;
    case 'tsave': { tcapture(); const s = S.sheet; const D = s.draft; D.options = (D.options || []).map((o) => o.trim()).filter(Boolean); if (D.parts) { D.parts = [...new Set(D.parts.map((o) => o.trim()).filter(Boolean))]; if (!D.parts.length) delete D.parts; } if (!D.ci) delete D.ci;
      if (!D.name) D.name = TTNAME[D.scale] || 'New tracker'; change(() => { M.items[s.ref] = D; if (s.isNew && G(s.in) && !G(s.in).kids.includes(s.ref)) G(s.in).kids.push(s.ref); }, (s.isNew ? 'Added ' : 'Saved ') + D.name); S.sheet = null; render(); return true; }
  }
  return false;
}

// each extra has its own colour (2026-11-02): calendar dots and the picked chip use it
const XDEF = { 'x-snackday': '#EC8FA8', 'x-sugar': '#F08A3E', 'x-hike': '#6FA24A', 'x-light': '#3FAFA6' };
const xcol = (x) => x.color || XDEF[x.id] || '#6F9BD6';
const XICON = { 'x-snackday': 'cake-slice', 'x-sugar': 'candy', 'x-hike': 'mountain', 'x-light': 'footprints' };
const xicon = (x) => x.icon || XICON[x.id] || 'sparkles';
// once-a-week extras (Snack day): used on another day of the same week = greyed out
function usedElsewhere(x, d) { if (!x.weekly) return false; const w = weekStart(d); for (let i = 0; i < 7; i++) { const o = addDays(w, i); if (o !== d && isOn(x, o)) return true; } return false; }
// Edit mode: hold a side folder tab and drag it up or down to reorder the folders (2026-11-02).
let rd = null;
document.addEventListener('pointerdown', (e) => {
  const b = S.edit && !e.target.closest('[data-col]') && e.target.closest('.rail [data-page]'); if (!b) return;
  rd = { el: b, y: e.clientY, on: false, t: setTimeout(() => { if (!rd) return; rd.on = true; b.classList.add('lift'); if (navigator.vibrate) navigator.vibrate(10); }, 250) };
  try { b.setPointerCapture(e.pointerId); } catch (_) {}
});
document.addEventListener('pointermove', (e) => {
  if (!rd) return; if (!rd.on) { if (Math.abs(e.clientY - rd.y) > 8) { clearTimeout(rd.t); rd = null; } return; }
  e.preventDefault(); const nav = rd.el.parentElement; const tabs = [...nav.querySelectorAll('[data-page]')];
  const over = tabs.find((t) => t !== rd.el && e.clientY >= t.getBoundingClientRect().top && e.clientY <= t.getBoundingClientRect().bottom); if (!over) return;
  const r = over.getBoundingClientRect(); nav.insertBefore(rd.el, e.clientY < r.top + r.height / 2 ? over : over.nextSibling); rd.moved = true;
});
document.addEventListener('pointerup', () => {
  if (!rd) return; clearTimeout(rd.t); const x = rd; rd = null; x.el.classList.remove('lift'); if (!x.on) return;
  suppress = true; setTimeout(() => { suppress = false; }, 300);
  if (!x.moved) return; const order = [...x.el.parentElement.querySelectorAll('[data-page]')].map((t) => t.dataset.page);
  change(() => { M.areas[S.area].pages = order; }, 'Folders reordered');
});
document.addEventListener('pointercancel', () => { if (rd) { clearTimeout(rd.t); rd.el.classList.remove('lift'); rd = null; render(); } });

// ---------- one colour function everywhere (2026-11-02) ----------
// colorField(ref, cur, opts) is the inline row in every editor: the palette, your saved colours, and a + that opens the
// full picker (hue / strength / lightness sliders, a code, Save to my colours). ref is what gets the colour:
// an item or group id, 'a:area', 'p:page', 'x:extra', or 'draft' (the open editor's unsaved copy).
// My palette starts as the starter palette, so every colour in it can be edited or removed (2026-11-02)
function myCols(pal) { const st = M.settings; if (pal === 'board') { if (!st.boardColors) st.boardColors = BOARD_PAL.slice(); return st.boardColors; } if (!st.palInit) { st.palInit = true; st.myColors = [...new Set(PAL.map((p) => p[1]).concat(st.myColors || []))]; } return st.myColors; }
function hexToHsl(h) { const [r, g, b] = rgb(h).map((x) => x / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let hh = 0, ss = 0; const l = (mx + mn) / 2;
  if (mx !== mn) { const d = mx - mn; ss = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh *= 60; }
  return [Math.round(hh), Math.round(ss * 100), Math.round(l * 100)]; }
function hslToHex(h, s, l) { s /= 100; l /= 100; const k = (n) => (n + h / 30) % 12; const a = s * Math.min(l, 1 - l); const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return '#' + [f(0), f(8), f(4)].map((x) => pad(Math.round(x * 255).toString(16))).join('').toUpperCase(); }
function colorField(ref, cur, opts = {}) { const pal = String(ref).startsWith('bd:') ? 'board' : undefined; const inh = opts.inhLabel || 'Same as its group';
  const sw = (c, n) => `<button style="--c:${c}" data-a="setcol" data-ref="${ref}" data-v="${c}" aria-label="${esc(n)}" title="${esc(n)}" aria-pressed="${(cur || '').toLowerCase() === c.toLowerCase()}"></button>`;
  return `<div class="sw cf">${opts.inherit ? `<button class="inh" style="--c:var(--card)" data-a="setcol" data-ref="${ref}" data-v="" aria-label="${inh}" title="${inh}" aria-pressed="${!cur}"></button>` : ''}${myCols(pal).map((c) => sw(c, (PAL.find((p) => p[1] === c) || [c])[0])).join('')}<button class="more" data-a="colopen" data-ref="${ref}" data-v="${opts.inherit ? inh : ''}" aria-label="More colours">+</button></div>`;
}
function getCol(ref) { if (String(ref).startsWith('bd:')) return bGetCol(ref.slice(3)); if (ref === 'draft') { const s = S.sheet && S.sheet.kind === 'colorpick' ? S.sheet.back : S.sheet; return s && s.draft && s.draft.color; } return getProp(ref, 'color'); }
function applyColor(ref, v) {
  const inPick = S.sheet && S.sheet.kind === 'colorpick'; const host = inPick ? S.sheet.back : S.sheet;
  if (String(ref).startsWith('bd:')) { S.sheet = inPick ? host : S.sheet; bSetCol(ref.slice(3), v); renderLayer(); return; }
  if (ref === 'draft') { if (v) host.draft.color = v; else delete host.draft.color; S.sheet = host; renderLayer(); return; }
  change(() => setProp(ref, 'color', v)); S.sheet = inPick ? host : S.sheet; render();
}
function colorPickSheet(s) {
  const hex = hslToHex(s.h, s.s, s.l);
  const track = (k) => k === 'h' ? 'linear-gradient(90deg,' + [0, 60, 120, 180, 240, 300, 360].map((x) => hslToHex(x, s.s, s.l)).join(',') + ')'
    : k === 's' ? `linear-gradient(90deg,${hslToHex(s.h, 0, s.l)},${hslToHex(s.h, 100, s.l)})` : `linear-gradient(90deg,${hslToHex(s.h, s.s, 15)},${hslToHex(s.h, s.s, 50)},${hslToHex(s.h, s.s, 92)})`;
  const sl = (k, label, max, min = 0) => `<label class="csl"><span class="mono">${label}</span><input type="range" id="c${k}" min="${min}" max="${max}" value="${s[k]}" style="background:${track(k)}" aria-label="${label}"></label>`;
  return `<div class="cprev"><span id="cprev" style="background:${hex}"></span><input class="inp" id="chex" value="${hex}" aria-label="Colour code"></div>
    ${sl('h', 'Hue', 360)}${sl('s', 'Strength', 100)}${sl('l', 'Lightness', 92, 15)}
    <div class="btns"><button class="btn dark" data-a="coluse">Use this colour</button>${s.sel != null && myCols(s.pal)[s.sel] ? `<button class="btn" data-a="colupd">Update in my palette</button>` : ''}</div>
    <div class="fld" style="margin-top:14px"><span class="mono">${s.pal === 'board' ? 'Board palette' : 'My palette'}</span><div class="sw mine">${myCols(s.pal).map((c, i) => `<span class="mc"><button style="--c:${c}" data-a="colpick" data-v="${i}" aria-label="Edit ${c}" aria-pressed="${s.sel === i}"></button>${s.sel === i ? `<button class="x" data-a="colrm" data-v="${i}" aria-label="Remove ${c} from my palette">✕</button>` : ''}</span>`).join('')}<button class="more" data-a="colsave" aria-label="Save this colour to my palette">+</button></div></div>
    ${s.inherit ? `<button class="addbtn" data-a="setcol" data-ref="${s.ref}" data-v="">${icon('rotate-ccw', 18)} ${typeof s.inherit === 'string' ? esc(s.inherit) : 'Same as its group'}</button>` : ''}`;
}
function openColorPick(ref, inherit) { const cur = getCol(ref) || '#7DBE9A'; const [h, sat, l] = hexToHsl(/^#[0-9a-f]{6}$/i.test(cur) ? cur : '#7DBE9A'); openSheet({ kind: 'colorpick', title: 'Colour', ref, inherit, pal: String(ref).startsWith('bd:') ? 'board' : undefined, h, s: sat, l: Math.max(15, Math.min(92, l)), back: S.sheet }); }
function colorAction(act, a, v) {
  switch (act) {
    case 'setcol': capture(); tcapture(); xcapture(); applyColor(a.dataset.ref, v); return true;
    case 'colopen': capture(); tcapture(); xcapture(); openColorPick(a.dataset.ref, v === '1' ? true : v || false); return true;
    case 'coluse': { const s = S.sheet; applyColor(s.ref, hslToHex(s.h, s.s, s.l)); return true; }
    case 'colsave': { const s = S.sheet; const c = hslToHex(s.h, s.s, s.l); const P = myCols(s.pal); if (!P.includes(c)) { P.push(c); save(); } s.sel = P.indexOf(c); renderLayer(); return true; }
    case 'colpick': { const s = S.sheet; const c = myCols(s.pal)[+v]; const [h, sat, l] = hexToHsl(c); Object.assign(s, { h, s: sat, l: Math.max(15, Math.min(92, l)), sel: +v }); renderLayer(); return true; }
    case 'colupd': { const s = S.sheet; const c = hslToHex(s.h, s.s, s.l); change(() => { myCols(s.pal)[s.sel] = c; }); renderLayer(); return true; }
    case 'colrm': { const s = S.sheet; change(() => { myCols(s.pal).splice(+v, 1); }); s.sel = null; renderLayer(); return true; }
  }
  return false;
}
document.addEventListener('input', (e) => {
  const s = S.sheet; if (!s || s.kind !== 'colorpick') return; const id = e.target.id;
  if (id === 'ch' || id === 'cs' || id === 'cl') { s[id.slice(1)] = +e.target.value; const hex = hslToHex(s.h, s.s, s.l); $('#cprev').style.background = hex; $('#chex').value = hex;
    ['h', 's', 'l'].forEach((k) => { if (k !== id.slice(1)) { const el = $('#c' + k); if (el) { const t = colorPickSheet(s).match(new RegExp('id="c' + k + '"[^>]*style="background:([^"]*)"')); if (t) el.style.background = t[1]; } } }); }
  if (id === 'chex' && /^#[0-9a-f]{6}$/i.test(e.target.value.trim())) { const [h, sat, l] = hexToHsl(e.target.value.trim()); Object.assign(s, { h, s: sat, l }); $('#cprev').style.background = e.target.value.trim(); ['h', 's', 'l'].forEach((k) => { const el = $('#c' + k); if (el) el.value = s[k]; }); }
});

// Generic items (2026-11-11): Daily chore, Movement and Study session. They sit on Today when nothing specific from their
// section is planned that day, and open that section to pick the real thing.
function slotAdd(k) { const DEF = { study: ['sl-study', 'Study session', 'graduation-cap', '#3FAFA6', 60], chores: ['sl-chore', 'Daily chore', 'spray-can', '#EDBB3A', 20], hobbies: ['sl-hobby', 'Hobby time', 'palette', '#EC8FA8', 30], training: ['sl-move', 'Movement', 'footprints', '#6FA24A', 30] }[k]; if (!DEF) return;
  const [id, name, ic, color, dur] = DEF; const blk = k === 'study' ? studyBlock() : k === 'chores' ? defBlock('chores') : k === 'hobbies' ? eveBlock() : blockIds()[0];
  const placed = I(id) && placements(id).some((p) => G(p) && G(p).style === 'dayblock');
  S.sheet = null; S.planAddOpen = false;
  if (placed) { render(); flash(I(id).name + ' is already on my days'); return; }
  change(() => { if (!M.items[id]) M.items[id] = { name, type: 'slot', opens: k, when: { mode: 'every', n: 1 }, icon: ic, dur, made: T0 };
    const gs = M.groups['g-slots'] = M.groups['g-slots'] || { name: 'Slots', holds: 'slot', kids: [] }; if (!gs.kids.includes(id)) gs.kids.push(id);
    if (blk && G(blk) && !G(blk).kids.includes(id)) G(blk).kids.push(id); }, 'Added ' + name); }
function slotRm(id) { const n = (I(id) || {}).name; change(() => { Object.values(M.groups).forEach((g) => { if (g && g.kids && (g.style === 'dayblock' || g.holds === 'slot')) g.kids = g.kids.filter((x) => x !== id); }); delete M.items[id]; }, 'Removed ' + n); }
// The phone keyboard (2026-11-11): pop-ups slide up so the field I'm writing in stays above it.
(function () { const vv = window.visualViewport; if (!vv) return; let last = -1;
  const fit = () => { const kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)); if (kb === last) return; last = kb; document.documentElement.style.setProperty('--kb', kb + 'px'); document.documentElement.classList.toggle('kbon', kb > 80);
    const a = document.activeElement; if (kb > 80 && a && a.closest && a.closest('#layer') && /^(INPUT|SELECT)$/.test(a.tagName)) setTimeout(() => { try { a.scrollIntoView({ block: 'nearest' }); } catch (e) {} }, 60); };
  vv.addEventListener('resize', fit); vv.addEventListener('scroll', fit); })();
// only one-line fields are brought into view; in a page of text the browser keeps the caret in view by itself, and moving the page made the text jump
document.addEventListener('focusin', (e) => { const t = e.target; if (!t || !t.closest || !t.closest('#layer') || !/^(INPUT|SELECT)$/.test(t.tagName)) return; setTimeout(() => { try { t.scrollIntoView({ block: 'nearest' }); } catch (_) {} }, 350); });
// The phone's back gesture (2026-11-11): each move between pages, tabs and pop-ups is a step back can undo. Only in the installed app;
// inside Claude the page has no history of its own.
const NAVK = ['area', 'page', 'ins', 'hob', 'proj', 'nbView', 'room', 'subj', 'pick', 'jEntry', 'sday', 'sview'];
const navSnap = () => Object.fromEntries(NAVK.map((k) => [k, S[k] === undefined ? null : S[k]]));
let navLast = null, navBusy = false, navSheet = false;
function navTrack() { if (!HOSTED || navBusy) return; try { const k = JSON.stringify(navSnap());
    if (navLast === null) { history.replaceState({ nav: navSnap() }, ''); navLast = k; }
    else if (k !== navLast) { history.pushState({ nav: navSnap() }, ''); navLast = k; }
    if (S.sheet && !navSheet) { history.pushState({ nav: navSnap(), sheet: 1 }, ''); navSheet = true; } else if (!S.sheet && navSheet) { navSheet = false; navBusy = true; history.back(); } } catch (e) {} }
window.addEventListener('popstate', (e) => { if (!HOSTED) return; if (navBusy) { navBusy = false; return; }
  if (S.sheet || S.menu || S.ask) { navSheet = false; S.sheet = null; S.menu = false; S.ask = null; navBusy = true; render(); renderLayer(); navBusy = false; navLast = JSON.stringify(navSnap()); return; }
  const n = e.state && e.state.nav; if (!n) return; navBusy = true; Object.assign(S, n); render(); renderLayer(); navBusy = false; navLast = JSON.stringify(navSnap()); try { $('#main').scrollTop = 0; } catch (_) {} });
// ---------- boot ----------
try { JSON.parse(localStorage.getItem('daybook3-shut') || '[]').forEach((k) => { S.open[k] = false; }); } catch (e) {}
try { Object.assign(S.open, JSON.parse(localStorage.getItem('daybook3-open') || '{}')); } catch (e) {}
try { Object.assign(S, JSON.parse(localStorage.getItem('daybook3-fold') || '{}')); } catch (e) {} // closed Health categories stay closed on this device
try { const s = localStorage.getItem('daybook3'); if (s) M = migrate(JSON.parse(s)); } catch (e) {} HIST.last = null;
if (!M.settings.plutchik1 || !M.settings.dyads1 || !M.settings.vb1) M = migrate(M); // steps that need data defined later in this file (feelings families)
freezePast();
render();
(async () => {
  try { db = await (window.claude && window.claude.use ? window.claude.use('db') : null); } catch (e) { db = null; }
  if (!db) { hostBoot(); return; }
  docRef = db.doc('state/main');
  try { const snap = await docRef.get(); const m = snap.exists && snap.data() && snap.data().model; if (m) { M = migrate(JSON.parse(m)); HIST.last = null; HIST.past = []; HIST.fut = []; freezePast(); render(); } else save(); } catch (e) {}
})();
