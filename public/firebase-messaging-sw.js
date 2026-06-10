// Give the service worker access to Firebase Messaging.
// Note: These compatibility scripts are loaded from Google CDNs because they run inside the standalone Service Worker context.
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Parse dynamic configuration parameters from the URL query string
// This allows us to load credentials from the main app thread (.env) without hardcoding secrets in this static file.
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
      let badgeCount = 1;
      if (payload.data && payload.data.badge) {
        badgeCount = parseInt(payload.data.badge, 10);
      } else if (payload.badge) {
        badgeCount = parseInt(payload.badge, 10);
      } else if (payload.notification && payload.notification.badge) {
        badgeCount = parseInt(payload.notification.badge, 10);
      }

      if ('setAppBadge' in self.navigator) {
        self.navigator.setAppBadge(badgeCount).catch(err => {
          console.error('[firebase-messaging-sw.js] Failed to update app badge:', err);
        });
      }

      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  } catch (error) {
    console.error('[firebase-messaging-sw.js] Failed to initialize Firebase inside Service Worker:', error);
  }
} else {
  console.log('[firebase-messaging-sw.js] Service Worker running in offline Simulator Mode. (Define real credentials to activate FCM).');
}

// Fallback push event listener to catch badge updates
self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const payload = event.data.json();
      let badgeCount = null;
      
      if (payload.data && payload.data.badge) {
        badgeCount = parseInt(payload.data.badge, 10);
      } else if (payload.badge) {
        badgeCount = parseInt(payload.badge, 10);
      } else if (payload.notification && payload.notification.badge) {
        badgeCount = parseInt(payload.notification.badge, 10);
      }
      
      if (badgeCount !== null && 'setAppBadge' in self.navigator) {
        event.waitUntil(self.navigator.setAppBadge(badgeCount).catch(err => {
          console.error('[firebase-messaging-sw.js] Generic push badging error:', err);
        }));
      }
    } catch (e) {
      // Ignored if text-only payload
    }
  }
});

// Handle notification click to open or focus the PWA client window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus if window already open
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Or open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

