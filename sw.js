self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('note-cache').then(cache => {
      return cache.addAll([
        '/note.html',
        '/styles.css',
        '/script.js',
        '/manifest.json'
      ]);
    })
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});