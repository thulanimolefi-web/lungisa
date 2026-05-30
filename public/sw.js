const STATIC = 'lungisa-static-v1';
const DYNAMIC = 'lungisa-dynamic-v1';
const SHELL = ['/', '/auth', '/post-job', '/home', '/offline', '/icons/icon-192x192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(STATIC).then(c => c.addAll(SHELL)));
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
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  // Never cache Supabase
  if (url.hostname.includes('supabase.co') || url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Cache-first for static assets
  if (url.pathname.startsWith('/_next/static/') || e.request.destination === 'image') {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(r => {
        caches.open(STATIC).then(c => c.put(e.request, r.clone()));
        return r;
      }))
    );
    return;
  }

  // Network-first for pages, fallback to offline
  e.respondWith(
    fetch(e.request).then(r => {
      caches.open(DYNAMIC).then(c => c.put(e.request, r.clone()));
      return r;
    }).catch(() => caches.match(e.request).then(cached => cached || caches.match('/offline')))
  );
});