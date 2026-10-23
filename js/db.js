// db.js: saving and reading data on this device.
//
// Everything is kept in the browser's built-in database (IndexedDB),
// in two "stores" (think of them as tables):
//
//   items  every piece of data the app keeps: a note, a check-in, a habit tick.
//          Each item looks like this:
//            {
//              id:        "note-1729690000000-ab12",  unique name, never changes
//              kind:      "note",                    what sort of thing it is
//              day:       "2026-10-23",              the day it belongs to
//              updatedAt: 1729690000000,              when it last changed (ms)
//              deleted:   true,                       only on deleted items
//              ...anything else the item needs
//            }
//          Deleted items are kept with deleted: true, so a deletion
//          can travel to the other device when you sync.
//
//   meta   small settings, such as when you last saved a backup.

const DB_NAME = 'keystone';
const DB_VERSION = 1;

let dbPromise = null;

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('items')) {
          const items = db.createObjectStore('items', { keyPath: 'id' });
          items.createIndex('day', 'day');
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta');
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

// Runs one request inside a transaction and returns its result.
async function runRequest(storeName, mode, makeRequest) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const request = makeRequest(tx.objectStore(storeName));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// Today's date as "YYYY-MM-DD", in the phone's own time zone.
function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function newId(kind) {
  const random = Math.random().toString(36).slice(2, 6);
  return `${kind}-${Date.now()}-${random}`;
}

// Saves an item, stamping it with the current time.
function putItem(item) {
  const stamped = { ...item, updatedAt: Date.now() };
  return runRequest('items', 'readwrite', (store) => store.put(stamped)).then(() => stamped);
}

// Marks an item as deleted, rather than removing it, so the deletion syncs.
async function deleteItem(id) {
  const item = await runRequest('items', 'readonly', (store) => store.get(id));
  if (item) {
    await putItem({ id: item.id, kind: item.kind, day: item.day, deleted: true });
  }
}

// All items for one day, without deleted ones.
async function getItemsForDay(day) {
  const items = await runRequest('items', 'readonly', (store) => store.index('day').getAll(day));
  return items.filter((item) => !item.deleted);
}

// Every item, deleted ones included. Used when saving a backup file.
function getAllItems() {
  return runRequest('items', 'readonly', (store) => store.getAll());
}

// Merges items from a backup file into this device.
// For each item, whichever copy changed most recently wins.
// Returns how many items were added or updated.
async function mergeItems(incoming) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('items', 'readwrite');
    const store = tx.objectStore('items');
    let changed = 0;
    for (const item of incoming) {
      const request = store.get(item.id);
      request.onsuccess = () => {
        const local = request.result;
        if (!local || item.updatedAt > local.updatedAt) {
          store.put(item);
          changed++;
        }
      };
    }
    tx.oncomplete = () => resolve(changed);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function getMeta(key) {
  return runRequest('meta', 'readonly', (store) => store.get(key));
}

function setMeta(key, value) {
  return runRequest('meta', 'readwrite', (store) => store.put(value, key));
}
