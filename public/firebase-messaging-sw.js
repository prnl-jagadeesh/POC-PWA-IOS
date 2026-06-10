// Force immediate activation of the updated Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Helpers for persistent badge count tracking in Cache Storage (lock-free & reliable in background contexts)
async function getPersistedBadgeCount() {
  try {
    const cache = await caches.open('pwa-badge-cache');
    const response = await cache.match('/badge-count');
    if (response) {
      const text = await response.text();
      return parseInt(text, 10) || 0;
    }
  } catch (e) {
    console.warn('Failed to read badge count from cache:', e);
  }
  return 0;
}

async function setPersistedBadgeCount(count) {
  try {
    const cache = await caches.open('pwa-badge-cache');
    await cache.put('/badge-count', new Response(count.toString()));
  } catch (e) {
    console.warn('Failed to write badge count to cache:', e);
  }
}

// Custom push event listener defined FIRST to ensure we run before Firebase SDK intercepts it
self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let payloadBadgeCount = null;
    let title = 'New Notification';
    let body = 'You have a new message.';
    let icon = '/icon-192.png';

    if (event.data) {
      try {
        const payload = event.data.json();
        if (payload.data && payload.data.badge) {
          payloadBadgeCount = parseInt(payload.data.badge, 10);
        } else if (payload.badge) {
          payloadBadgeCount = parseInt(payload.badge, 10);
        } else if (payload.notification && payload.notification.badge) {
          payloadBadgeCount = parseInt(payload.notification.badge, 10);
        }

        if (payload.notification) {
          title = payload.notification.title || title;
          body = payload.notification.body || body;
          icon = payload.notification.icon || icon;
        } else if (payload.data) {
          title = payload.data.title || title;
          body = payload.data.body || body;
        }
      } catch (e) {
        body = event.data.text();
      }
    }

    // Resolve final badge count (auto-increment if none provided in push payload)
    let finalBadgeCount = 1;
    if (payloadBadgeCount !== null && !isNaN(payloadBadgeCount)) {
      finalBadgeCount = payloadBadgeCount;
    } else {
      const currentPersisted = await getPersistedBadgeCount();
      finalBadgeCount = currentPersisted + 1;
    }

    await setPersistedBadgeCount(finalBadgeCount);

    if ('setAppBadge' in self.navigator) {
      await self.navigator.setAppBadge(finalBadgeCount).catch(err => {
        console.error('[firebase-messaging-sw.js] Generic push badging error:', err);
      });
    }
  })());
});

// Handle notification click to open or focus the PWA client window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

// Give the service worker access to Firebase Messaging.
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Parse dynamic configuration parameters from the URL query string
const params = new URLSearchParams(self.location.search);
const apiKey = params.get('apiKey');
const messagingSenderId = params.get('messagingSenderId');

const firebaseConfig = {
  apiKey: apiKey && apiKey !== 'undefined' ? apiKey : "PLACEHOLDER_API_KEY",
  authDomain: params.get('authDomain') || "PLACEHOLDER_AUTH_DOMAIN",
  projectId: params.get('projectId') || "PLACEHOLDER_PROJECT_ID",
  storageBucket: params.get('storageBucket') || "PLACEHOLDER_STORAGE_BUCKET",
  messagingSenderId: messagingSenderId && messagingSenderId !== 'undefined' ? messagingSenderId : "PLACEHOLDER_MESSAGING_SENDER_ID",
  appId: params.get('appId') || "PLACEHOLDER_APP_ID"
};

// Check if credentials are valid and not the default templates
const hasRealConfig = firebaseConfig.apiKey && 
                       firebaseConfig.apiKey !== 'PLACEHOLDER_API_KEY' && 
                       firebaseConfig.apiKey !== 'your_firebase_api_key_here' && 
                       firebaseConfig.apiKey.trim() !== '';

if (hasRealConfig) {
  try {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();
    console.log('[firebase-messaging-sw.js] Firebase initialized inside Service Worker successfully.');

    // Listen to incoming push notifications when PWA is in background or closed
    messaging.onBackgroundMessage((payload) => {
      console.log('[firebase-messaging-sw.js] Received background notification payload:', payload);
      
      const notificationTitle = payload.notification?.title || 'FCM Background Message';
      const notificationOptions = {
        body: payload.notification?.body || 'New notification received.',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: payload.data
      };

      // Extract and update badge count from FCM payload
      let payloadBadgeCount = null;
      if (payload.data && payload.data.badge) {
        payloadBadgeCount = parseInt(payload.data.badge, 10);
      } else if (payload.badge) {
        payloadBadgeCount = parseInt(payload.badge, 10);
      } else if (payload.notification && payload.notification.badge) {
        payloadBadgeCount = parseInt(payload.notification.badge, 10);
      }

      // Update app icon badge asynchronously
      const updateBadge = async () => {
        let finalBadgeCount = 1;
        if (payloadBadgeCount !== null && !isNaN(payloadBadgeCount)) {
          finalBadgeCount = payloadBadgeCount;
        } else {
          const currentPersisted = await getPersistedBadgeCount();
          finalBadgeCount = currentPersisted + 1;
        }
        
        await setPersistedBadgeCount(finalBadgeCount);
        
        if ('setAppBadge' in self.navigator) {
          await self.navigator.setAppBadge(finalBadgeCount);
        }
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
      updateBadge().catch(err => {
        console.error('[firebase-messaging-sw.js] Error updating badge in background message:', err);
      });
    });
  } catch (error) {
    console.error('[firebase-messaging-sw.js] Failed to initialize Firebase inside Service Worker:', error);
  }
} else {
  console.log('[firebase-messaging-sw.js] Service Worker running in offline Simulator Mode. (Define real credentials to activate FCM).');
}



