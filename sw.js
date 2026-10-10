// HackMatrix Service Worker - Full Offline Support
const CACHE_NAME = 'hackmatrix-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/patient.html',
  '/clinician.html',
  '/admin.html',
  '/app.css',
  '/app.js',
  '/api.js',
  '/patient.js',
  '/clinician.js',
  '/admin.js',
  '/qrcode.min.js',
  '/jsqr.min.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(ASSETS).catch(err => console.warn('Cache prefetch warning:', err)))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null)))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Let api calls pass through; api.js handles offline fallbacks itself
  if (e.request.url.includes('/api/')) {
    return;
  }
  
  // Stale-while-revalidate / Cache-first with network fallback
  e.respondWith(
    caches.match(e.request).then(cached => {
      var fetchPromise = fetch(e.request).then(response => {
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, responseToCache));
        }
        return response;
      }).catch(err => {
        // Offline navigation fallback
        if (e.request.mode === 'navigate') {
          var url = e.request.url;
          if (url.includes('patient')) return caches.match('/patient.html');
          if (url.includes('clinician')) return caches.match('/clinician.html');
          if (url.includes('admin')) return caches.match('/admin.html');
          return caches.match('/index.html');
        }
        return cached;
      });

      return cached || fetchPromise;
    })
  );
});
