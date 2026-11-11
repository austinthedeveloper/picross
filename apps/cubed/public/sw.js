/*
 * Offline play. Every file the game loads is kept in a cache; it's served from there
 * straight away and refreshed in the background, so the game opens without a network
 * and an update shows up on the next launch.
 */
const CACHE = 'picross-cubed';
const CORE = ['./', './index.html', './manifest.webmanifest', './favicon.svg'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  // Pages are one page whatever the query (the app routes on the hash).
  const key = request.mode === 'navigate' ? './index.html' : request;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(key, { ignoreSearch: request.mode === 'navigate' });
      const fresh = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(key, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached ?? fresh;
    }),
  );
});
