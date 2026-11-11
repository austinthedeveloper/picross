/*
 * Retires Picross Cubed's old offline worker. Cubed used to be its own app at /3d/, with a
 * service worker (this URL) that served every page from its cache. It's part of the one app
 * now, and /3d/ only sends old links on (index.html). A browser that still has the old
 * worker checks this file when it next opens /3d/, finds this one, and runs it: it deletes
 * the old cache, unregisters itself and reloads the open pages, which then load from the
 * network and land in the one app.
 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // The old worker's cache (CACHE in Cubed's old public/sw.js).
      await caches.delete('picross-cubed');
      await self.registration.unregister();
      // A new query makes it a real load: the same URL with its hash would only scroll.
      const pages = await self.clients.matchAll({ type: 'window' });
      await Promise.all(
        pages.map((page) => {
          const url = new URL(page.url);
          url.searchParams.set('moved', '');
          return page.navigate(url.href).catch(() => {});
        }),
      );
    })(),
  );
});
