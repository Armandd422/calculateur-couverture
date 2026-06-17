// Couvr'Toit Métré - Service Worker v2
const CACHE='couvrtoit-v4';
const ASSETS=['./','./index.html','./manifest.json','./logo.png','./icon-192.png','./icon-512.png'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).catch(()=>{}));
  self.skipWaiting();
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch',e=>{
  const url=e.request.url;
  // Ne jamais mettre en cache les appels Supabase (toujours réseau)
  if(url.includes('supabase.co')||url.includes('supabase.in')){
    return; // laisse passer au réseau normalement
  }
  // Network-first pour le HTML, cache-first pour le reste
  if(e.request.mode==='navigate'||url.endsWith('.html')){
    e.respondWith(fetch(e.request).then(r=>{const cl=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cl));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
  }else{
    e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(resp=>{const cl=resp.clone();caches.open(CACHE).then(c=>c.put(e.request,cl));return resp})).catch(()=>{}));
  }
});
