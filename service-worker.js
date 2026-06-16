const CACHE_NAME = 'calculateur-couverture-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// Installation du service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.log('Erreur cache:', err))
  );
  self.skipWaiting();
});

// Activation du service worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Stratégie: Network first, fallback to cache
self.addEventListener('fetch', event => {
  // Ne mettre en cache que les GET
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache la réponse pour usage offline
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Retourne la version en cache si offline
        return caches.match(event.request)
          .then(response => {
            return response || new Response('Hors ligne - données mises en cache disponibles', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Synchronisation en arrière-plan (quand reconnecté)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  try {
    const db = await openDatabase();
    const unsyncedData = await getAllUnsyncedData(db);
    
    if (unsyncedData.length > 0) {
      // Envoyer données au serveur si connecté
      for (const data of unsyncedData) {
        // Vous pouvez ajouter une sync serveur ici plus tard
        markAsSynced(db, data.id);
      }
      
      // Notifier les clients que la sync est terminée
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'SYNC_COMPLETE',
          message: 'Données synchronisées'
        });
      });
    }
  } catch (error) {
    console.error('Erreur synchronisation:', error);
  }
}

// Notification quand online
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
