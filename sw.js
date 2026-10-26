/* WKAB's service worker: makes the site an installable app that opens
   fast and works without a signal for what it has seen before.
   - Pages: network first, the saved copy when offline.
   - The site's own files and the fonts/libraries from CDNs: served from
     the cache and refreshed in the background. Each deploy stamps a new
     VERSION (the workflow replaces __BUILD__ with the commit id), and the
     old cache is dropped.
   - Supabase (your data), the audio recordings and anything else: straight
     to the network, never cached here. */
const VERSION = '__BUILD__';
const CACHE = 'wkab-' + VERSION;
const SHELL = ['./', './index.html', './icon.svg', './manifest.webmanifest'];
const CDN = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com)\//;

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('wkab-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const own = url.origin === self.location.origin;
  if (!own && !CDN.test(req.url)) return;            // Supabase and the rest
  if (own && url.pathname.includes('/audio/')) return;  // large, and range requests

  if (req.mode === 'navigate'){
    event.respondWith(fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put('./index.html', copy));
      return res;
    }).catch(() => caches.match('./index.html').then(r => r || caches.match('./'))));
    return;
  }

  event.respondWith(caches.open(CACHE).then(cache => cache.match(req).then(hit => {
    const fresh = fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
      return res;
    }).catch(() => hit);
    return hit || fresh;
  })));
});
