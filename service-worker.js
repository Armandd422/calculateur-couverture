// Couvr'Toit Métré - Service Worker v6
const CACHE='couvrtoit-v6';
const ASSETS=[
  './','./index.html','./manifest.json',
  './logo.png','./icon-192.png','./icon-512.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

self.addEventListener('install',e=>{
  e.waitUntil(
    caches.open(CACHE).then(c=>Promise.allSettled(ASSETS.map(a=>c.add(a))))
  );
  self.skipWaiting();
});

self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch',e=>{
  const req=e.request;
  const url=req.url;

  // Appels données Supabase (REST/realtime) : toujours réseau, jamais cache
  if(url.includes('supabase.co/rest')||url.includes('supabase.co/realtime')||url.includes('supabase.co/auth')||url.includes('supabase.in')){
    return; // laisse passer normalement (échoue proprement si hors-ligne)
  }

  // Navigation (ouverture de l'app) : cache d'abord, réseau ensuite
  if(req.mode==='navigate'){
    e.respondWith(
      caches.match('./index.html').then(cached=>{
        const net=fetch(req).then(r=>{const cl=r.clone();caches.open(CACHE).then(c=>c.put('./index.html',cl));return r}).catch(()=>cached);
        return cached||net;
      })
    );
    return;
  }

  // Tout le reste (CSS, images, librairie Supabase) : cache d'abord
  e.respondWith(
    caches.match(req).then(cached=>{
      if(cached)return cached;
      return fetch(req).then(r=>{
        if(r&&r.status===200){const cl=r.clone();caches.open(CACHE).then(c=>c.put(req,cl));}
        return r;
      }).catch(()=>cached);
    })
  );
});
