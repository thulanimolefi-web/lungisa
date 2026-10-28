// Lungisa service worker v2
// - Works on both lungiza.co.za and www.lungiza.co.za (same-origin check)
// - Pre-caches the shell one file at a time so a single missing file can
//   never stop the worker from installing
// - Never caches API / Supabase / third-party requests
const STATIC = 'lungisa-static-v2';
const DYNAMIC = 'lungisa-dynamic-v2';
const SHELL = [
  '/',
  '/auth',
  '/post',
  '/offline.html',
  '/icons/icon-192x192.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(STATIC).then(c =>
      Promise.all(SHELL.map(url => c.add(url).catch(() => null)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== STATIC && k !== DYNAMIC).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Anything not on our own origin, plus API routes: straight to the network
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  // Cache-first for versioned static assets and images
  if (url.pathname.startsWith('/_next/static/') || req.destination === 'image') {
    e.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(res => {
          if (res && res.ok) {
            const copy = res.clone();           // clone BEFORE returning
            caches.open(STATIC).then(c => c.put(req, copy));
          }
          return res;
        });
      })
    );
    return;
  }

  // Network-first for pages, falling back to cache, then the offline page
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(DYNAMIC).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then(cached => cached || caches.match('/offline.html'))
        )
    );
  }
});
