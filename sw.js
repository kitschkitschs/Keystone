// sw.js: the service worker. It keeps a copy of the app on the phone, so Almanac opens
// without a connection, and it shows my reminders when the sender pings the phone.
//
// How updates work: with a connection, the app opens with the newest files and saves a copy.
// With no connection, or one too slow to answer within a few seconds, it opens from the saved
// copy instead. So a published change shows up on the next open.

// store.js reads what the app keeps on the phone (the reminder list among it).
importScripts('store.js');

const CACHE_NAME = 'daybook-app';
const FONT_CACHE = 'daybook-fonts';

// A ping shows reminders whose time was up to this many minutes ago,
// in case it arrives late (for example when the phone was offline).
const REMINDER_LATE_MINUTES = 60;

const APP_FILES = ['./', 'index.html', 'store.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/badge.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // the old Keystone app's saved copy is no longer needed
  event.waitUntil(caches.delete('keystone-app').then(() => self.clients.claim()));
});

// How long to wait for the server before opening from the saved copy.
const NETWORK_WAIT_MS = 4000;

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const host = new URL(request.url).hostname;

  // The fonts come from Google Fonts. Once fetched they are kept, so they work offline too.
  if (host === 'fonts.googleapis.com' || host === 'fonts.gstatic.com') {
    event.respondWith(caches.open(FONT_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
      return response;
    }));
    return;
  }
  if (new URL(request.url).origin !== self.location.origin) return;

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

// The reminder sender (worker/ in this repo) pings the phone at each reminder time.
// The ping is empty: the words come from the list the app keeps on the phone.
self.addEventListener('push', (event) => {
  event.waitUntil(showDueReminders());
});

async function showDueReminders() {
  const now = new Date();
  const p2 = (n) => String(n).padStart(2, '0');
  const today = now.getFullYear() + '-' + p2(now.getMonth() + 1) + '-' + p2(now.getDate());
  const shown = (await DBK.get('remshown')) || {}; // reminder id -> day it was last shown
  const due = remDue(await DBK.get('rem'), now, shown, REMINDER_LATE_MINUTES);
  for (const reminder of due) {
    await self.registration.showNotification(reminder.text, { tag: reminder.id, badge: 'icons/badge.png', icon: 'icons/icon-192.png' });
    shown[reminder.id] = today;
  }
  if (due.length) await DBK.set('remshown', shown);
}

// Tapping a reminder opens Almanac.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (windows.length) return windows[0].focus();
    return self.clients.openWindow('./');
  })());
});
