const CACHE_NAME = 'pwa-ios-poc-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/src/main.jsx',
  '/src/App.jsx',
  '/src/index.css'
];

// Install Service Worker and cache essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use silent failure for caching during dev to avoid breaking the install
      return cache.addAll(ASSETS).catch(err => {
        console.warn('Cache pre-fill failed (normal in Vite dynamic dev mode):', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate and clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Network-first falling back to cache strategy for maximum flexibility
self.addEventListener('fetch', (event) => {
  // Only handle local HTTP/HTTPS requests (avoid chrome-extension or external CDNs)
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache dynamic responses if valid
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if offline
        return caches.match(event.request);
      })
  );
});

// Listen for the Background Sync event
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-activities') {
    event.waitUntil(syncActivities());
  }
});

// Simulates synchronization of stored offline activities from IndexedDB
function syncActivities() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('pwa-sync-db', 1);
    
    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('activities')) {
        resolve();
        return;
      }

      const transaction = db.transaction('activities', 'readwrite');
      const store = transaction.objectStore('activities');
      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = () => {
        const records = getAllRequest.result;
        const pendingRecords = records.filter(r => r.status === 'pending');

        if (pendingRecords.length === 0) {
          resolve();
          return;
        }

        // Simulate a network upload delay (1.5 seconds)
        setTimeout(() => {
          const updateTransaction = db.transaction('activities', 'readwrite');
          const updateStore = updateTransaction.objectStore('activities');

          pendingRecords.forEach((record) => {
            record.status = 'synced';
            updateStore.put(record);
          });

          updateTransaction.oncomplete = () => {
            console.log('Background Sync completed successfully');
            
            // Send message to open client tabs to update their UI
            self.clients.matchAll().then((clients) => {
              clients.forEach((client) => {
                client.postMessage({ type: 'SYNC_COMPLETE' });
              });
            });

            // Trigger visual notification
            if (self.registration.showNotification) {
              self.registration.showNotification('Background Sync Complete', {
                body: `Successfully synced ${pendingRecords.length} offline activities!`,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                vibrate: [100, 50, 100],
                data: {
                  url: '/'
                }
              });
            }
            resolve();
          };

          updateTransaction.onerror = () => {
            reject(updateTransaction.error);
          };
        }, 1500);
      };

      getAllRequest.onerror = () => {
        reject(getAllRequest.error);
      };
    };

    // Initialize database structure if requested version doesn't exist
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('activities')) {
        db.createObjectStore('activities', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}
