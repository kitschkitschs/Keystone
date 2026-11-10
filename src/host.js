// ===================== Running as my own app (2026-11-11) =====================
// On GitHub Pages there is no Claude behind the page, so everything is kept on the phone (store.js):
// the model, photos and PDFs as files, and the reminder list the service worker (sw.js) shows when a ping arrives.
// Backups go out as one file (for Proton Drive) and come back in the same way.
const HOSTED = !(window.claude && window.claude.use);
// LS_ONLY: a model sits in localStorage that this app's own save didn't put there (no marker beside it), so it wins over the phone's store
let HAD_LS = false, LS_ONLY = false; try { HAD_LS = !!localStorage.getItem('daybook3'); LS_ONLY = HAD_LS && !localStorage.getItem('daybook3-at'); } catch (e) {}
const FILES = {}; // file id -> a web address for it, made when the app opens
const blobUrl = (id) => String(id).startsWith('l-') ? (FILES[id] || '') : '/_blob/' + id;
const LOCAL_ASSETS = { upload: async (blob) => { const id = 'l-' + uid('f'); await DBK.filePut(id, blob); FILES[id] = URL.createObjectURL(blob); return { id }; } };
let hostT = 0;
function hostSave() { if (!HOSTED) return; const s = JSON.stringify(M); DBK.set('model', s).catch(() => {}); DBK.set('rem', remDigest()).catch(() => {}); clearTimeout(hostT); hostT = setTimeout(remAuto, 1500); }
async function hostBoot() {
  if (!HOSTED) return;
  try { for (const [k, b] of await DBK.fileAll()) FILES[k] = URL.createObjectURL(b); } catch (e) {}
  try { const s = LS_ONLY ? null : await DBK.get('model'); if (s) M = migrate(JSON.parse(s)); else if (!HAD_LS) M = blank(); } catch (e) {} // a new phone starts empty, never with examples
  try { BK.at = (await DBK.get('backupAt')) || 0; BK.first = (await DBK.get('firstAt')) || 0; if (!BK.first) { BK.first = Date.now(); DBK.set('firstAt', BK.first); } } catch (e) {}
  freezePast(); save(); render();
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {} // ask the browser not to clear my data when space runs low
  try { if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) {}
}

// ---------- backups ----------
const BK = { at: 0, first: 0, pending: null };
const BK_DAYS = 7; // a reminder shows when the last backup is older than this
const bkAgo = () => { const t = BK.at || BK.first; return t ? Math.floor((Date.now() - t) / 864e5) : 0; };
const bkDue = () => HOSTED && bkAgo() >= BK_DAYS;
const bkLine = () => BK.at ? (bkAgo() === 0 ? 'Saved today' : bkAgo() === 1 ? 'Saved yesterday' : 'Saved ' + bkAgo() + ' days ago') : 'Never saved';
function bkMenu() { if (!HOSTED) return ""; return `<button role="menuitem" data-a="bksave">${mi('bksave', 'hard-drive-download')} <span class="bkl">Save a backup<small${bkDue() ? ' class="due"' : ''}>${bkLine()}</small></span></button><button role="menuitem" data-a="bkload">${mi('bkload', 'hard-drive-upload')} Load a backup</button>`; }
function bkDot() { const b = document.getElementById('menubtn'); if (b) b.classList.toggle('dot', bkDue()); }
const b64 = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });
async function bkText() { const files = {}; if (HOSTED) for (const [k, b] of await DBK.fileAll()) files[k] = { type: b.type || '', data: await b64(b) };
  return JSON.stringify({ format: 'daybook-backup', version: 1, savedAt: new Date().toISOString(), model: M, files }); }
// On the phone the share menu opens, so the file can go straight to Proton Drive; on a computer it downloads.
// The file ends in .txt because Chrome won't share .json files.
async function bkSave() {
  try { const text = await bkText(); const d = new Date(); const name = 'daybook-' + iso(d) + '-' + nowHM().replace(':', '') + '.txt'; const file = new File([text], name, { type: 'text/plain' });
    const phone = navigator.userAgentData ? navigator.userAgentData.mobile : /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
    if (phone && navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: name }); } catch (e) { if (e.name === 'AbortError') return; throw e; } }
    else { const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 10000); }
    BK.at = Date.now(); if (HOSTED) DBK.set('backupAt', BK.at).catch(() => {}); bkDot(); flash('Backup saved');
  } catch (e) { flash('Could not save the backup'); }
}
function bkPick() { const f = document.createElement('input'); f.type = 'file'; f.accept = '.txt,.json,text/plain,application/json'; f.onchange = async () => { const file = f.files && f.files[0]; if (!file) return;
    try { const b = JSON.parse(await file.text()); if (!b || b.format !== 'daybook-backup' || !b.model || !b.model.groups) throw 0; BK.pending = b;
      S.ask = { q: 'Replace everything on this phone with the backup from ' + lowDay(String(b.savedAt).slice(0, 10)) + '?', yes: 'Load it', data: { a: 'bkapply' } }; renderLayer(); }
    catch (e) { flash('That file isn’t a Daybook backup'); } }; f.click(); }
async function bkApply() { const b = BK.pending; BK.pending = null; if (!b) return;
  try { if (HOSTED) { await DBK.fileClear(); Object.keys(FILES).forEach((k) => { URL.revokeObjectURL(FILES[k]); delete FILES[k]; });
      for (const [k, f] of Object.entries(b.files || {})) { const bytes = Uint8Array.from(atob(f.data), (c) => c.charCodeAt(0)); const blob = new Blob([bytes], { type: f.type }); await DBK.filePut(k, blob); FILES[k] = URL.createObjectURL(blob); } }
    M = migrate(b.model); HIST.past = []; HIST.fut = []; freezePast(); save(); render(); flash('Backup loaded');
  } catch (e) { flash('Could not load that backup'); }
}
function hostAction(act) {
  switch (act) {
    case 'bksave': S.menu = false; renderLayer(); bkSave(); return true;
    case 'bkload': S.menu = false; renderLayer(); bkPick(); return true;
    case 'bkapply': bkApply(); return true;
  }
  return false;
}

// ---------- reminders: this phone and the sender ----------
// The sender (worker/ in the repo) runs on Cloudflare. It only ever gets times and days, never the words.
// At each time it sends this phone an empty ping; sw.js then shows the reminders that are due from the list kept here.
const REM_SENDER = 'https://keystone-reminders.lilworkerguy.workers.dev';
const remLive = () => remList().filter((r) => r.on && !r.sample && r.time && (r.rep === 'once' ? (r.date || '') >= T0 : (r.days || []).length));
// what the service worker reads: the words too, and whether the linked item is already done today
function remDigest() { return remLive().map((r) => { const o = { id: r.id, text: r.text || 'Reminder', time: r.time }; if (r.rep === 'once') o.date = r.date; else o.days = r.days; if (r.item && I(r.item) && isDone(r.item, T0)) o.skip = T0; return o; }); }
// what the sender gets: the same without ids or words
const remSlots = () => remDigest().map((r) => { const o = { time: r.time }; if (r.date) o.date = r.date; else o.days = r.days; if (r.skip) o.skip = r.skip; return o; });
const remCan = () => HOSTED && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const remKey = () => { let k = localStorage.getItem('daybook3-device'); if (!k) { k = (crypto.randomUUID ? crypto.randomUUID() : uid('dev') + uid('ice') + uid('key')); localStorage.setItem('daybook3-device', k); } return k; };
async function remSend(path, body) { const r = await fetch(REM_SENDER + path, body && { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const j = await r.json(); if (!r.ok) throw new Error(j.error || 'The sender answered ' + r.status); return j; }
async function remSub() { if (!remCan() || Notification.permission !== 'granted') return null; const reg = await navigator.serviceWorker.ready; return reg.pushManager.getSubscription(); }
// asks for permission and signs this phone up; has to start from a tap
async function remTurnOn() {
  if (!remCan()) { flash('Notifications aren’t available here'); return; }
  try { if ((await Notification.requestPermission()) !== 'granted') { flash('Notifications are blocked for Daybook in the browser’s settings'); render(); return; }
    const reg = await navigator.serviceWorker.ready; let sub = await reg.pushManager.getSubscription();
    if (!sub) { const { publicKey } = await remSend('/public-key'); sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(atob(publicKey.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)) }); }
    REM.sub = true; await remSync(true);
  } catch (e) { flash('Couldn’t turn notifications on: ' + (e && e.message || 'no answer')); render(); }
}
const REM = { sub: false, last: null };
// sends the times to the sender; quietly does nothing when this phone isn't signed up
async function remSync(force) { let ok = false, sent = false;
  try { const sub = await remSub(); REM.sub = !!sub; if (!sub) { if (S.area === 'plan' && S.page === 'rem') render(); return; }
    const body = { deviceKey: remKey(), endpoint: sub.endpoint, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, slots: remSlots() }; const sig = JSON.stringify(body);
    if (!force && sig === REM.last) return; sent = true; await remSend('/schedule', body); REM.last = sig; ok = true;
  } catch (e) { ok = false; }
  if (sent) { M.settings.remSync = { at: iso(new Date()) + 'T' + nowHM(), ok }; try { localStorage.setItem('daybook3', JSON.stringify(M)); } catch (e) {} if (HOSTED) DBK.set('model', JSON.stringify(M)).catch(() => {}); if (S.area === 'plan' && S.page === 'rem') render(); }
}
function remAuto() { if (remCan()) remSync(false); }
