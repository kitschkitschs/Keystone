// sw.js: the service worker. It keeps a copy of the app's files on the phone,
// so Keystone opens without a connection.
//
// How updates work: when there's a connection, the app opens with the newest
// files (asking the server past any short-term caching) and saves a copy.
// With no connection, or one too slow to answer within a few seconds, it
// opens from the saved copy instead. So a published change shows up on the
// next open.
//
// If you add a new file to the app, add it to APP_FILES below.

// db.js lets the service worker read reminders from the app's data.
importScripts('js/db.js');

const CACHE_NAME = 'keystone-app';

// A ping shows reminders whose time was up to this many minutes ago,
// in case it arrives late (for example when the phone was offline).
const REMINDER_LATE_MINUTES = 60;

// How reminder notifications look. Swap these files to change the look.
//   badge: the small symbol in the bar at the top of the screen. Android
//          only uses its shape: a white shape on a see-through background,
//          96 x 96 pixels. Colors in it are ignored.
//   icon:  the larger picture shown next to the reminder text.
const NOTIFICATION_LOOK = {
  badge: 'icons/badge.png',
  icon: 'icons/icon-192.png',
};

const APP_FILES = [
  './',
  'index.html',
  'style.css',
  'manifest.webmanifest',
  'js/look.js',
  'js/db.js',
  'js/sample.js',
  'js/sync.js',
  'js/reminders.js',
  'js/plan.js',
  'js/app.js',
  'js/health.js',
  'js/health-edit.js',
  'js/charts.js',
  'js/insight.js',
  'fonts/lora-latin-400-normal.woff2',
  'fonts/lora-latin-500-normal.woff2',
  'fonts/lora-latin-600-normal.woff2',
  'fonts/roboto-latin-400-normal.woff2',
  'fonts/roboto-latin-500-normal.woff2',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/badge.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// How long to wait for the server before opening from the saved copy.
const NETWORK_WAIT_MS = 4000;

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request, { ignoreSearch: true });
      // cache: 'no-cache' makes the browser check with the server, so a change
      // shows up right away instead of after the server's 10-minute cache.
      const fresh = fetch(request, { cache: 'no-cache' }).then((response) => {
        if (response.ok) cache.put(request, response.clone());
        return response;
      });
      if (!cached) return fresh;
      event.waitUntil(fresh.catch(() => {}));
      const slow = new Promise((resolve) => setTimeout(() => resolve(cached), NETWORK_WAIT_MS));
      return Promise.race([fresh.catch(() => cached), slow]);
    })
  );
});

// --- Reminders ---

// The reminder sender (worker/ in this repo) pings the phone at each reminder
// time. The ping is empty: the texts come from the app's own data here.
self.addEventListener('push', (event) => {
  event.waitUntil(showDueReminders());
});

async function showDueReminders() {
  const now = new Date();
  const today = todayKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const shown = (await getMeta('remindersShown')) || {}; // reminder id -> day it was last shown

  const reminders = (await getAllItems()).filter((item) => item.kind === 'reminder' && !item.deleted);
  for (const reminder of reminders) {
    const [hours, minutes] = reminder.time.split(':').map(Number);
    const minutesLate = nowMinutes - (hours * 60 + minutes);
    // -1 allows for the phone's clock being a little behind the sender's.
    if (minutesLate < -1 || minutesLate > REMINDER_LATE_MINUTES || shown[reminder.id] === today) continue;

    await self.registration.showNotification(reminder.text, {
      tag: reminder.id,
      badge: NOTIFICATION_LOOK.badge,
      icon: NOTIFICATION_LOOK.icon,
    });
    shown[reminder.id] = today;
  }
  await setMeta('remindersShown', shown);
}

// Tapping a reminder opens Keystone.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (windows.length) return windows[0].focus();
    return self.clients.openWindow('./');
  })());
});
