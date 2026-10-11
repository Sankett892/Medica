# 📱 HackMatrix Clinician & Doctor Mobile App Deployment Guide

This guide details how to run and deploy the **HackMatrix Clinician & Doctor Portal** as a mobile application on Android and iOS devices.

---

## Option 1: Instant PWA Installation (Recommended — Zero Build Required)

The Clinician portal is configured as a standalone **Progressive Web App (PWA)** with offline caching, high-resolution icons, safe-area viewport insets, and an interactive mobile bottom navigation bar.

### A. Testing on Your Computer (Mobile Device Simulation)
1. Open Google Chrome or Microsoft Edge and navigate to:
   ```
   http://localhost:4000/clinician.html
   ```
2. Press `F12` (or right-click and choose **Inspect**).
3. Toggle the Device Toolbar (or press `Ctrl + Shift + M`) and select a mobile device preset (e.g. **iPhone 14 Pro**, **Pixel 7**, or **Samsung Galaxy S20**).
4. Notice the mobile-optimized interface:
   - **Mobile Bottom Navigation Bar**: One-thumb switching between `Dashboard`, `Patients`, `Chart`, and `Recovery`.
   - **Floating Action Button (FAB)**: Primary camera scanner button directly in the center of the bottom nav.
   - **Mobile Install Banner**: Prompts to install the standalone doctor application.

### B. Installing on a Physical Android Smartphone
1. Connect your smartphone and your computer to the same Wi-Fi network.
2. Find your computer's local IP address (e.g. `192.168.1.15` via `ipconfig` in terminal).
3. Open Google Chrome on your Android smartphone and visit:
   ```
   http://<YOUR_COMPUTER_IP>:4000/clinician.html
   ```
4. Sign in with doctor credentials (`dr.kapoor@sunrise.demo` / `Password@123`).
5. Tap the **"📲 Install App"** button at the top, or tap Chrome's three dots menu (`⋮`) -> **"Install app"** (or **"Add to Home screen"**).
6. The app installs immediately with the **HackMatrix HM Clinician** icon directly on your smartphone launcher.
7. Tap the app icon: it launches full-screen without any browser address bars.
8. Tap **"Scan QR"**: grant camera permission to use your smartphone's rear camera to optically scan patient QR consent passes.

### C. Installing on an Apple iPhone / iPad (iOS Safari)
1. Ensure your iPhone is on the same local network as your computer.
2. Open Safari and navigate to:
   ```
   http://<YOUR_COMPUTER_IP>:4000/clinician.html
   ```
3. Tap the **Share** button at the bottom of Safari (square with an arrow pointing up).
4. Scroll down and tap **"Add to Home Screen"**.
5. Tap **"Add"** in the top-right corner.
6. The HackMatrix Doctor icon will appear on your iOS home screen as a standalone application.

---

## Option 2: Native Android APK Packaging via Capacitor

If you wish to package an actual `.apk` file for sideloading or internal MDM hospital deployment, use the configured Capacitor setup.

### Prerequisites
1. **Node.js** (v18+)
2. **Android Studio** (Electric Eel or newer) with Android SDK (API level 33+)
3. **Java Development Kit (JDK 17+)**

### Step-by-Step Build Instructions

1. **Install Capacitor CLI & Android Platform**:
   Run in the project root directory:
   ```bash
   npm install
   ```

2. **Initialize Android Platform**:
   ```bash
   npx cap add android
   ```
   *(This creates an `android/` directory containing the full Android Studio project and Gradle scripts).*

3. **Synchronize Web Assets to Android**:
   Whenever you make changes to HTML, CSS, or JS files, sync them to the Android project:
   ```bash
   npm run cap:sync
   ```

4. **Verify Android Camera Permissions**:
   In `android/app/src/main/AndroidManifest.xml`, ensure camera permissions are present:
   ```xml
   <uses-permission android:name="android.permission.CAMERA" />
   <uses-feature android:name="android.hardware.camera" android:required="false" />
   ```

5. **Open Project in Android Studio**:
   ```bash
   npm run cap:open
   ```
   Android Studio will launch and index the Gradle project.

6. **Generate Debug APK**:
   * **Within Android Studio**: Select **Build** -> **Build Bundle(s) / APK(s)** -> **Build APK(s)**.
   * **Via Command Line**:
     ```bash
     cd android
     ./gradlew assembleDebug
     ```
   * The compiled `.apk` will be located at:
     ```
     android/app/build/outputs/apk/debug/app-debug.apk
     ```

7. **Deploy to Device**:
   Transfer `app-debug.apk` to any Android phone via USB or adb:
   ```bash
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```

---

## Mobile Features Implemented

| Feature | Clinician Web | Clinician Mobile App |
|---|---|---|
| **Standalone Display** | Browser Tab | Native Fullscreen (No URL bar) |
| **Navigation** | Top Tab Bar | Ergonomic Fixed Bottom Navigation Bar |
| **Optical QR Scanning** | Webcam / File Upload | Rear Smartphone Camera Feed with Auto-Focus |
| **Offline Resilience** | Standard Cache | Service Worker Cache-First Shell (`sw.js`) |
| **Emergency Break-Glass** | Modal Dialog | Mobile Responsive Touch Modal |
| **Encounter Recording** | Responsive Form | Thumb-Friendly Input Controls |
