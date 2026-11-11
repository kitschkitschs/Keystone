// store.js: what Almanac keeps on this phone (IndexedDB). Shared by the app and the service worker (sw.js).
//   kv:    small named values: 'model' (everything I've entered, as text), 'rem' (the reminder list the
//          service worker reads when a ping arrives), 'remshown', 'backupAt'
//   files: photos and PDFs, kept as files instead of inside the model
const DBK = (() => {
  let dbp = null;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('daybook', 1);
    r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv'); if (!d.objectStoreNames.contains('files')) d.createObjectStore('files'); };
    r.onsuccess = () => res(r.result); r.onerror = () => { dbp = null; rej(r.error); };
  }));
  const run = (store, mode, fn) => open().then((d) => new Promise((res, rej) => { const tx = d.transaction(store, mode); const q = fn(tx.objectStore(store)); tx.oncomplete = () => res(q && q.result); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); }));
  return {
    get: (k) => run('kv', 'readonly', (s) => s.get(k)),
    set: (k, v) => run('kv', 'readwrite', (s) => s.put(v, k)),
    fileGet: (id) => run('files', 'readonly', (s) => s.get(id)),
    filePut: (id, blob) => run('files', 'readwrite', (s) => s.put(blob, id)),
    fileKeys: () => run('files', 'readonly', (s) => s.getAllKeys()),
    fileAll: async () => { const ks = await run('files', 'readonly', (s) => s.getAllKeys()); const vs = await run('files', 'readonly', (s) => s.getAll()); return ks.map((k, i) => [k, vs[i]]); },
    fileClear: () => run('files', 'readwrite', (s) => s.clear()),
  };
})();
// Which reminders are due at this moment. Used by the service worker when a ping arrives.
// R: [{ id, text, time 'HH:MM', days [0..6, Monday first] or date 'YYYY-MM-DD', skip 'YYYY-MM-DD' (already done that day) }]
function remDue(R, now, shown, lateMin) {
  const p2 = (n) => String(n).padStart(2, '0'); const today = now.getFullYear() + '-' + p2(now.getMonth() + 1) + '-' + p2(now.getDate());
  const dow = (now.getDay() + 6) % 7, mins = now.getHours() * 60 + now.getMinutes();
  return (R || []).filter((r) => { const [h, m] = String(r.time || '').split(':').map(Number); const late = mins - (h * 60 + m);
    if (!(late >= -1 && late <= lateMin)) return false; // -1: the phone's clock may be a little behind the sender's
    if (r.date ? r.date !== today : !(r.days || []).includes(dow)) return false;
    return r.skip !== today && (shown || {})[r.id] !== today; });
}
