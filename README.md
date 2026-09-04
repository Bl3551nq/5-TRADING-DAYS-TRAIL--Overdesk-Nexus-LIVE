# Overdesk Nexus 🚀

> **Floating desktop dashboard widget & real-time economic news intelligence platform.**

---

## 🔒 Registered Software & Proprietary License Notice

**Copyright © 2026 Overdesk. All Rights Reserved.**

This repository contains **Registered Intellectual Property**. Unauthorized copying, cloning, modification, distribution, reverse engineering, or public hosting of any part of this codebase, design assets, or branding is **strictly prohibited**.

For full legal terms, please refer to the [`LICENSE`](./LICENSE) file included in this project.

---

## 🌟 Key Features

- **Interactive Floating Checklist**: Customizable task tracking with fluid animations, custom timers, focus modes, and customizable completion alarms.
- **FX Economic Calendar**: Live economic event calendar with multi-currency filtering (USD, EUR, GBP, JPY, CAD, AUD, NZD, CHF), 5-min & 30-min pre-alerts, custom bell audio signals, and glassy alert overlays.
- **Global App Switcher**: Quick switching between app modes using **`Ctrl + N`** (or `Cmd + N`).
- **High-Fidelity Branding**: Sharp icon rendering and auto-update support.
- **Cross-Platform**: Native builds for Windows desktop (`.exe` via Electron) and Android mobile (`.apk` via Capacitor).

---

## 📱 Android APK Build & Deployment

### Quick Commands:
```bash
# 1. Sync web assets and icons into the Android native project
npm run android:sync

# 2. Compile Debug APK directly via Gradle
npm run android:build

# 3. Open project directly in Android Studio
npm run android:open
```

The compiled APK will be located at:
`android/app/build/outputs/apk/debug/app-debug.apk`

### 🤖 Automated GitHub Actions APK Releases:
The project includes a ready-to-run GitHub Actions workflow at [`.github/workflows/build-android.yml`](./.github/workflows/build-android.yml).
Whenever you push to `main` or push a version tag (e.g. `v1.3.4`), GitHub Actions will automatically:
1. Set up Node.js, Java 17, and the Android SDK.
2. Build the web app and sync Capacitor assets.
3. Compile `Overdesk-Nexus-v<VERSION>-debug.apk`.
4. Upload the APK as a downloadable workflow artifact and publish it to GitHub Releases.

---

## 🛡️ License & Copyright

```
Proprietary / All Rights Reserved
Copyright (c) 2026 Overdesk.
```

*This software is registered and protected under international copyright and intellectual property laws. Any unauthorized reproduction or distribution on GitHub or other platforms will be subject to immediate DMCA takedown and legal enforcement.*
