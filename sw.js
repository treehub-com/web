self.importScripts('store.js');

const files = ['/', '/index.html', '/sw.js', '/server.js', '/store.js', '/jszip.js'];


self.addEventListener('install', (e) => {
  e.waitUntil(caches.open('v1').then((cache) => cache.addAll(files)).then(() => {
    return self.skipWaiting();
  }));
});

self.addEventListener('activate', (e) => {
  return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // If the url is local
  if (url.origin == location.origin) {
    // If anything other than GET, 404
    // TODO

    // If the url is on our list, return if from the cache
    if (files.includes(url.pathname)) {
      return e.respondWith(
        caches.match(url.pathname)
      );
    }
    // If they are asking for TH.json
    if (url.pathname === '/TH.json') {
      return e.respondWith(
        self.store.getTH()
          .then(TH => new Response(JSON.stringify(TH)))
        );
    }
    // If they are asking for any other file, try indexeddb
    return e.respondWith(
      self.store.getFile(url.pathname)
        .then(file => {
          if (file === undefined) {
            return new Response('', {status: 404});
          }
          return new Response(file);
        })
      );
  }

  // Else let it go through
  e.respondWith(fetch(e.request));
});
