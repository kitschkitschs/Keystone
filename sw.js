// sw.js: the service worker. It keeps a copy of the app's files on the phone,
// so Keystone opens without a connection.
//
// How updates work: the app always opens from the saved copy (fast, works
// offline), and at the same time fetches fresh files in the background.
// So after you publish a change, it shows up the next time you open the app.
//
// If you add a new file to the app, add it to APP_FILES below.

const CACHE_NAME = 'keystone-app';

const APP_FILES = [
  './',
  'index.html',
  'style.css',
  'manifest.webmanifest',
  'js/db.js',
  'js/sync.js',
  'js/app.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request, { ignoreSearch: true });
      const fresh = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached || Response.error());
      if (cached) {
        event.waitUntil(fresh);
        return cached;
      }
      return fresh;
    })
  );
});
