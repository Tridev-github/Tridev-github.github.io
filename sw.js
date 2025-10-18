// Service worker for cache-first on static assets and model shards
const CACHE_NAME = 'resume-rag-pro-v1';
const CORE_ASSETS = ['./','./index.html','./style.css','./app.js','./resume.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(CORE_ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});

const CACHE_FIRST_HOSTS = ['cdn.jsdelivr.net','esm.run','huggingface.co'];

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;

  if (CACHE_FIRST_HOSTS.includes(url.host)) {
    event.respondWith(caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) { fetch(event.request).then(res => { if (res && res.ok) cache.put(event.request, res.clone()); }).catch(()=>{}); return cached; }
      const res = await fetch(event.request, { mode: 'cors' }).catch(()=>null);
      if (res && res.ok) cache.put(event.request, res.clone());
      return res || new Response('', { status: 504 });
    }));
    return;
  }

  event.respondWith((async () => {
    try {
      const res = await fetch(event.request);
      const cache = await caches.open(CACHE_NAME);
      cache.put(event.request, res.clone());
      return res;
    } catch (e) {
      const cached = await caches.match(event.request);
      return cached || new Response('', { status: 504 });
    }
  })());
});
