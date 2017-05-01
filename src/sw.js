self.importScripts('store.js');

const cacheName = '__cache__';
const files = ['/', '/index.html', '/sw.js', '/server.js', '/store.js', '/jszip.js', '/level.js', '/logo.png'];


self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(cacheName)
      .then((cache) => cache.addAll(files))
  );
});

self.addEventListener('activate', (e) => {
  self.clients.claim();
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.map(key => {
          if (key !== cacheName) {
            return caches.delete(key);
          }
        })
      ))
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url, self.location);


  // If the url is local
  if (url.origin == self.location.origin) {
    // If anything other than GET, 404
    if (e.request.method !== 'GET') {
      return new Response('', {status: 404});
    }

    // If the url is on our list, return if from the cache
    if (files.includes(url.pathname)) {
      return e.respondWith(
        caches.match(url.pathname)
      );
    }
    // If they are asking for packages.json
    if (url.pathname === '/_/packages.json') {
      return e.respondWith(
        self.store.getPackages()
          .then(packages => new Response(JSON.stringify(packages)))
        );
    }

    // If they ask for a file with an extension, try indexeddb
    if (/\.[A-Za-z]+$/.test(url.pathname)) {
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

    // If they are asking for any other file, return the index page
    return e.respondWith(
      caches.match('/index.html')
    );
  }

  // Else let it go through
  e.respondWith(fetch(e.request));
});
