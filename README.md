# PWA iOS Capability POC

A ReactJS + Vite Progressive Web App (PWA) proof-of-concept application designed to test and validate iOS PWA platform limitations compared to a native Flutter application.

This repository serves as a testing playground to compare web-standard APIs (Push notifications, camera capture, IndexedDB, background sync, GPS geolocation, and WebAuthn biometrics) against native hardware features on real iOS and Android devices.

---

## 🚀 Tech Stack
- **Core**: ReactJS (State-based routing, instant screen loading)
- **Bundler**: Vite
- **Styling**: Vanilla CSS (Mobile-first Dark Glassmorphism, viewport-optimizations)
- **External Dependencies**:
  - `lucide-react`: Clean, vector-based iconography
  - `jsqr`: Client-side JavaScript QR code decoder
  - `firebase`: Firebase Core and Messaging SDK placeholders

---

## 🛠️ Project Structure
```
├── public/
│   ├── icon.svg                 # Main scalable PWA vector icon
│   ├── icon-192.png             # Standalone fallback icon (192px)
│   ├── icon-512.png             # Standalone fallback icon (512px)
│   ├── manifest.json            # PWA manifest declaring display mode & metadata
│   ├── sw.js                    # Main Service Worker (Caches assets, handles background sync event)
│   └── firebase-messaging-sw.js # Firebase Cloud Messaging background worker placeholder
├── src/
│   ├── screens/
│   │   ├── Dashboard.jsx        # Environment detection & card layout
│   │   ├── PushNotificationTest.jsx # FCM & notification Permission tester
│   │   ├── CameraQRTest.jsx     # Live canvas QR scan & fallback uploader
│   │   ├── BackgroundSyncTest.jsx # SyncManager API inspector & IndexedDB logging
│   │   ├── GPSTest.jsx          # Live coordinate streaming & background notes
│   │   ├── BiometricTest.jsx    # WebAuthn and passkey checker
│   │   └── Scorecard.jsx        # Manual and auto rating review scorecard
│   ├── utils/
│   │   ├── db.js                # IndexedDB database helpers
│   │   └── firebase.js          # Firebase SDK configurator with Simulator mode
│   ├── App.jsx                  # Main routing container & service worker loading hook
│   ├── index.css                # Global glassmorphism theme and component classes
│   └── main.jsx                 # Application renderer
├── .env.example                 # Environment variable templates
├── vite.config.js               # Vite configs
└── README.md                    # Setup and guide handbook
```

---

## 💻 Local Quickstart

### 1. Install Dependencies
Ensure you have Node.js installed (v18+ recommended):
```bash
npm install
```

### 2. Generate Fallback PNGs (Optional)
The manifest references `icon-192.png` and `icon-512.png`. If your browser requires PNGs, you can generate placeholders from `icon.svg` or drop any PNG images in the `/public` folder with those names.

### 3. Run Development Server
Start Vite's local hot-reloading server:
```bash
npm run dev
```
To access it from a mobile device on your local network:
```bash
npm run dev -- --host
```
Vite will print a network URL (e.g. `http://192.168.1.X:5173`). Open this link in Safari (iOS) or Chrome (Android) on your mobile device.

---

## 📦 Build Instructions

To bundle the application into static production assets:
```bash
npm run build
```
This compiles your files into the `/dist` folder. You can preview the production bundle locally with:
```bash
npm run preview
```

---

## ☁️ Vercel Deployment

Since the app compiles entirely into static html/js assets, it is 100% compatible with Vercel static hosting.

### Deploying via Vercel CLI:
1. Install the Vercel CLI globally (if not already done):
   ```bash
   npm install -g vercel
   ```
2. Run the deployment command in the root folder:
   ```bash
   vercel
   ```
3. Follow the CLI prompts. Set the output directory to `dist` when asked.
4. For production release, execute:
   ```bash
   vercel --prod
   ```

---

## 📱 Mobile Platform Testing Instructions

### 1. iOS Safari (iPhone / iPad)

#### A. Installing the PWA (Required for Push Notifications)
1. Open the deployed Vercel URL in **Safari** (iOS Chrome or Firefox will not support installing).
2. Tap the **Share** button (bottom toolbar).
3. Scroll down and select **Add to Home Screen**.
4. Close Safari and launch the newly created **PWA iOS Capability POC** app from your Home Screen.

#### B. Testing Push Notifications (requires iOS 16.4+)
1. Ensure the app is running in **standalone PWA mode** (declared by the green "PWA" badge in the header).
2. Open the **Push Notifications** module.
3. Tap **Request Notification Permission** and select "Allow".
4. Tap **Generate FCM Token**. By default, this will run in **Simulator Mode** and generate a mock token.
5. *For Production Testing*: Rename `.env.example` to `.env`, add your Firebase credentials, configure your Web Push VAPID certificate, and rebuild the app.

#### C. Testing Background Sync (The iOS Limitation)
1. Open the **Background Sync API** module.
2. Note that `SyncManager` is flagged as **Unsupported** on iOS.
3. Turn on **Airplane Mode** (go offline) on your iPhone.
4. Input details in the form and tap **Submit while Offline**. The activity will save to **IndexedDB**.
5. Turn Airplane Mode off (go online).
6. Note that Android/Chrome would trigger synchronization automatically in the background; on iOS, the PWA will remain out-of-sync. You must trigger **Try Manual Sync** to process the queue.

#### D. Testing GPS Geolocation
1. Tap **Get Current Location** or **Stream Location Updates**. Approve the native browser location dialog.
2. Observe live coordinate changes.
3. Lock your iPhone screen or minimize the app for 1 minute, then unlock it. Note that streaming is halted when the app goes background—a major difference compared to a native Flutter application which can stream GPS in the background.

#### E. Testing Biometrics
1. Open **Biometric Login**.
2. Tap **Check Biometric / Passkey Availability**.
3. If your iPhone has Touch ID/Face ID set up, it will resolve to **AVAILABLE**. Note that this represents passkey-based credential registration, not native local UI gates.

---

## 📋 Evaluation Scorecard Summary
Once you complete checks on Safari (iOS) and Chrome (Android), fill out the **Scorecard** tab. You can mark tests as:
- **PASS**: Feature is fully functional foreground & background.
- **PARTIAL**: Supported, but with installation/active-screen caveats (e.g. iOS Notifications, GPS Background, WebAuthn secure context limits).
- **FAIL**: Browser engine restricts the feature completely (e.g. Background Sync on WebKit).

This scorecard persists inside `localStorage` for convenient testing sessions.
