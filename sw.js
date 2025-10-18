// Cache-first service worker for static assets
const CACHE = 'transitmap-resume-v1';
const CORE = ['./','./index.html','./style.css','./app.js','./data.js'];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)));
  self.skipWaiting();
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e=>{
  if (e.request.method!=='GET') return;
  e.respondWith((async()=>{
    const c = await caches.open(CACHE);
    const hit = await c.match(e.request);
    if (hit){ fetch(e.request).then(r=>r.ok&&c.put(e.request,r.clone())).catch(()=>{}); return hit; }
    try{
      const net = await fetch(e.request);
      if (net && net.ok) c.put(e.request, net.clone());
      return net;
    }catch{
      return new Response('',{status:504});
    }
  })());
});
