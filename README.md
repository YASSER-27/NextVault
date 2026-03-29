# NextVault 🌌

> **A local-first, offline-capable ecosystem turning your PC into a powerful Dashboard/Server and your Android device into an ultimate connected client. No internet required.**

---

## 📖 Introduction
**NextVault** is an innovative local-first software ecosystem designed to seamlessly connect a desktop server/dashboard with mobile clients over a local network. It acts as a bridge for offline communities, allowing users to share media, host chatrooms, distribute applications, and moderate content without ever needing an active internet connection.

Built with a focus on professional, ultra-modern design (Dark Neumorphism & Glassmorphism elements), it provides an immersive and interactive user experience.

---

## ✨ Key Features

### 🎬 Media Streaming (Artplayer & Plyr)
- **Local Netflix-like Experience:** Browse and stream Films, Series, and Music directly from your PC to your phone.
- **Robust Video Players:** Integrated **`Artplayer`** and **`Plyr`** handle video playback smoothly across any network condition.

### 🏪 Offline App Store (APK Distribution)
- **Host Your Own Apps:** Easily distribute `.apk` files directly from the Server's `Android` folder.
- **1-Click Installation:** Over-the-air native downloading and auto-prompt installation on Android via Expo's `FileSystem` and native `IntentLauncher`.

### 🛡️ "Tawasal" Moderation System
- **Real-Time Communication:** A localized chat system with powerful oversight tools.
- **Smart Moderation:** Set forbidden words and automatically censor unauthorized content in real-time.
- **Dashboard Control:** Admins can kick or block users, moderate messages, and track network stats directly from the PC dashboard.

---

## 🎨 UI/UX Design

NextVault takes user experience to the next level by adopting **Dark Neumorphism** combined with **Glassmorphism**.
- **The Dashboard:** A professional React-Vite built control panel with a responsive Grid layout, deep-dark color palettes, glowing gradients, and subtle micro-animations (powered by Tailwind HTML & Lucide React Icons).
- **The Mobile App:** Sleek, dark-themed native Android UI utilizing `react-native-safe-area-context` to feel perfectly cohesive with modern Android hardware.

---

## 📂 Project Structure

```text
C:\after
├── Server/                   # The PC Dashboard & Backend API
│   ├── src/                  # React + Vite Frontend
│   ├── backend/              # Express JS Server (Port: 3000)
│   ├── main.js               # Electron Desktop App Entry
│   ├── Tawasal/              # Specialized Chat System Files
│   ├── Android/              # Store your APK files here (auto-served)
│   └── media/                # Store your Films, Series, and Songs here
│
└── android-client/           # The Mobile App Client
    ├── App.js                # React Native Entry
    ├── src/                  # Screens, Components, Configs
    └── android/              # Native Android Build Configuration
```

---

## ⚙️ Technical Specs
- **Frontend (Server):** React 18, Vite, TailwindCSS, Lucide React.
- **Backend (Server):** ExpressJS, Multer (File Uploads), Cors.
- **Desktop Wrapper:** Electron (with `utilityProcess` for robust background Node.js processes without locking).
- **Mobile Client:** React Native (Expo SDK 54, Custom Native Builds).

### Core API Endpoints
- `GET /api/apps` - Fetches available APKs from `Android/` folder.
- `GET /api/media` - Lists available movies and audio in `media/`.
- `GET /api/posts` & `POST /api/posts` - Tawasal Feed and auto-censored chat routes.
- `POST /api/upload` - General media and APK upload handler.
- `POST /api/upload-audio` - Dedicated Base64 audio uploader for voice messages.
- Statically Served Folders: `/media`, `/apps`, `/voice`, `/tawasal`.

---

## 🚀 Installation & Build Guide

### 1. Server Dashboard (Electron)
The Server must be running on your PC for the mobile app to function.

**To Run in Development:**
```bash
cd Server
npm install
npm run dev
```

**To Build the Production Installer (.exe):**
```bash
cd Server
npm run build:electron
```
> **Output:** Head to `Server/release/`. You will find either `win-unpacked` (Portable Folder) or the Setup installer `NextVault Setup 1.0.0.exe`. The app securely generates missing directories when executed.

### 2. Android Mobile Client
Ensure that the PC and the Android device are connected to the same Wi-Fi router.

**To Update the Local Server IP:**
1. Open `android-client/src/config/api.js`.
2. Update the `BASE_URL` to match your PC's IP address (e.g., `http://192.168.1.10:3000`).

**To Build the APK:**
```bash
cd android-client
npm install
# Generate the native Android project (Skip if already done)
npx expo prebuild
# Build the production APK natively
cd android
./gradlew assembleRelease
```
> **Output:** The .apk file will be successfully generated at `android-client/android/app/build/outputs/apk/release/app-release.apk`.

---

## 👨‍💻 Developer Note
Designed, Engineered, and Maintained internally by **Yasser (YASSER-27)**.

*This README describes the architectural integrity achieved during our development session. Do not distribute without authorization.*
