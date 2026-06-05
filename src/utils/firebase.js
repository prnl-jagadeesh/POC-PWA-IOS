import { initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';

// Grab Firebase keys from import.meta.env
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Check if Firebase environment variables are populated and not default templates
export const isFirebaseConfigured = () => {
  return (
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== 'your_firebase_api_key_here' &&
    firebaseConfig.apiKey.trim() !== '' &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.messagingSenderId !== 'your_firebase_messaging_sender_id_here' &&
    firebaseConfig.messagingSenderId.trim() !== ''
  );
};

let app = null;
let messaging = null;

if (isFirebaseConfigured()) {
  try {
    app = initializeApp(firebaseConfig);
    messaging = getMessaging(app);
    console.log('[Diagnostic] Firebase client SDK initialized successfully.');
  } catch (error) {
    console.error('[Diagnostic] Firebase initialization error:', error);
  }
} else {
  console.log('[Diagnostic] Firebase is not configured. Running in Mock/Simulator mode.');
}

/**
 * Requests browser notification permission and retrieves FCM token if configured,
 * or generates a mock token if running in simulator mode.
 * Accepts a callback to output diagnostic lines on screen.
 */
export const getNotificationToken = async (onLog) => {
  const log = (msg) => {
    const time = new Date().toLocaleTimeString();
    const formatted = `[${time}] ${msg}`;
    console.log(formatted);
    if (onLog) onLog(formatted);
  };

  if (!('Notification' in window)) {
    log('API Error: Notifications are not supported in this browser.');
    throw new Error('This browser does not support notifications.');
  }

  log(`Checking current permission status: ${Notification.permission}`);

  // Request browser permission
  const permission = await Notification.requestPermission();
  log(`Requested permission. Result: ${permission}`);
  
  if (permission !== 'granted') {
    log('API Error: Notification permission was denied by the user.');
    throw new Error('Notification permission was denied.');
  }

  // If configuration is active, register the SW and grab the token
  if (isFirebaseConfigured() && messaging) {
    try {
      log('Production keys detected. Initializing Firebase Service Worker...');
      
      // Construct dynamic URL with query parameters so the SW gets settings
      const fcmSwUrl = `/firebase-messaging-sw.js?apiKey=${encodeURIComponent(firebaseConfig.apiKey)}` +
        `&authDomain=${encodeURIComponent(firebaseConfig.authDomain || '')}` +
        `&projectId=${encodeURIComponent(firebaseConfig.projectId || '')}` +
        `&storageBucket=${encodeURIComponent(firebaseConfig.storageBucket || '')}` +
        `&messagingSenderId=${encodeURIComponent(firebaseConfig.messagingSenderId)}` +
        `&appId=${encodeURIComponent(firebaseConfig.appId || '')}`;
        
      log('Registering SW under sub-scope "/firebase-cloud-messaging-push-scope" to avoid conflict with sw.js...');
      
      const registration = await navigator.serviceWorker.register(fcmSwUrl, {
        scope: '/firebase-cloud-messaging-push-scope'
      });
      
      log(`Service Worker registered successfully. Scope: ${registration.scope}`);
      
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      const cleanVapidKey = vapidKey && vapidKey !== 'your_firebase_vapid_key_here' ? vapidKey.trim() : null;
      
      log(`Retrieving token using getToken(). VAPID Key: ${cleanVapidKey ? 'Configured' : 'Not Provided (using default)'}`);
      
      const token = await getToken(messaging, {
        serviceWorkerRegistration: registration,
        vapidKey: cleanVapidKey || undefined
      });
      
      if (!token) {
        log('API Error: Firebase SDK returned an empty token.');
        throw new Error('No token returned. Request permission or verify configurations.');
      }
      
      log(`FCM token generated successfully: ${token.substring(0, 16)}...`);
      return { token, isMock: false, swScope: registration.scope };
    } catch (err) {
      log(`API Error during token generation: ${err.message}`);
      console.error('[Diagnostic] FCM Token generation error:', err);
      throw new Error(`Firebase Error: ${err.message}`);
    }
  } else {
    // Simulator Mode
    log('Offline Simulator Mode active. Simulating token fetching...');
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockToken = 'mock_fcm_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString().slice(-6);
        log(`Simulated FCM token generated: ${mockToken}`);
        resolve({ token: mockToken, isMock: true, swScope: 'Mock Scope (Simulator)' });
      }, 1000);
    });
  }
};
