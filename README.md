# Blogger Post Automation AI

[![Android Build & Release](https://github.com/malot-apps/Blogger-post-automation-/actions/workflows/android-build.yml/badge.svg)](https://github.com/malot-apps/Blogger-post-automation-/actions/workflows/android-build.yml)
[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20Web%20%28Vercel%29-blue.svg)](https://github.com/malot-apps/Blogger-post-automation-)
[![Gemini AI](https://img.shields.io/badge/AI-Google%20Gemini-orange.svg)](https://ai.google.dev/)
[![Blogger API](https://img.shields.io/badge/Blogger%20API-v3-green.svg)](https://developers.google.com/blogger)

**Blogger Post Automation AI** is a dual-platform publishing suite featuring a modern **Next.js Web application** (deployable on Vercel) and a native **Kotlin Android application** (built with Jetpack Compose & Material Design 3). It empowers content creators to format, proofread, generate catchy SEO titles, compose 16:9 thumbnails, and publish articles directly to Google Blogger blogs with a single tap.

---

## 📥 Android APK Download & Installation

The Android debug APK is built automatically on every commit, pull request, and release via **GitHub Actions**.

### Download Methods:
1. **GitHub Actions Artifacts (Latest Commits)**:
   - Go to the **Actions** tab: [Blogger-post-automation- Actions](https://github.com/malot-apps/Blogger-post-automation-/actions/workflows/android-build.yml).
   - Click the latest successful workflow run.
   - Scroll to **Artifacts** at the bottom and download **`BloggerPostAutomationAI-apk`**.
   - Extract the ZIP to obtain `BloggerPostAutomationAI-debug.apk`.
2. **GitHub Releases (Version Tags)**:
   - Go to [Releases](https://github.com/malot-apps/Blogger-post-automation-/releases).
   - Under the release tag (e.g., `v1.0.0`), download **`BloggerPostAutomationAI-debug.apk`**.

### Installation on Android:
1. Open the downloaded APK on your Android device (Android 8.0+ / API 26 or higher).
2. If prompted with *"Install unknown apps"*, tap **Settings** and toggle **"Allow from this source"**.
3. Tap **Install** and open **Blogger Post Automation AI**.
4. Tap **Settings (⚙️)** in the top bar to enter your own personal **Google Gemini API Key**.

---

## 🔒 Security & Privacy Policy (Zero Hardcoded Keys)

To protect user quotas and prevent accidental exposure:
1. **No Shared or Hardcoded API Keys**: No developer or personal Gemini API keys are embedded anywhere in the source code, build configs, or deployment scripts.
2. **Bring Your Own Key (BYOK)**:
   - **On the Web**: Users enter their key in **Settings ➔ Gemini AI Key**. It is saved in their private browser storage (`localStorage`) and forwarded securely over HTTPS via request headers (`x-gemini-key`).
   - **On Android**: Users enter their key in **Publisher Settings ➔ Gemini AI Key Tab**. It is stored securely in encrypted device `SharedPreferences` and used directly for Google Generative AI endpoints.
3. **Revocation Notice**: Any previously exposed developer API keys have been revoked and replaced with strict user-supplied authentication.
4. **Free Key Generation**: Users can generate their own free API key in seconds at [Google AI Studio](https://aistudio.google.com/app/apikey).

---

## 🚀 Key Features

### 1. 🌐 Google Account & Blogger Integration
- Multi-user authentication supporting any Google account.
- Queries user-owned Blogger blogs via Blogger API v3 (`/users/self/blogs`).
- Publishes drafts or live posts with automatic thumbnail association and label categories.

### 2. 🤖 Gemini AI Suite (বাংলা & English)
- **Visual Image Analysis**: Detects primary subjects, scene context, and focal-point coordinates ($x, y$ percentages).
- **SEO Title Generator**: Creates high-engagement titles under 70 characters with one-tap title regeneration.
- **Bilingual Copywriting**: Native quality content generation in both Bengali and English.
- **Article Formatting**: Converts draft notes into structured Blogger HTML with headings and bullet points.

### 3. 🎨 16:9 Video-Style Thumbnail Composer
- Crops portrait and square images into 16:9 landscape aspect ratio (1200×675) centered on the AI-detected focal point.
- 4 preset composition styles:
  1. *Cinematic Focus* (Centered focal zoom with subtle play button)
  2. *Gradient Overlay* (Bottom gradient scrim for text readability)
  3. *Split Card* (Structured editorial card layout)
  4. *Minimalist Badge* (Clean frame with category badge)

### 4. 📝 Master HTML Template Customizer
- Supports variable tokens: `{{TITLE}}`, `{{IMAGE_URL}}`, `{{THUMBNAIL_URL}}`, `{{CAPTION}}`, `{{PUBLISHED_DATE}}`.
- Live in-app preview with toggles for Mobile (375px) and Desktop (100%) layouts.

---

## 🏗️ Architecture & Dual-Platform Support

Both applications coexist in this repository:

| Layer | Technologies & Specs |
| :--- | :--- |
| **Android Application** | Kotlin 2.0.21, Jetpack Compose (M3), AndroidX, OkHttp 4.12, Coil, Coroutines, StateFlow, Android SDK 35, Gradle 8.10.2 |
| **Web Application** | Next.js 15 (App Router), React 19, Tailwind CSS v4, Lucide Icons, TypeScript 5.9 |
| **Web Hosting** | Vercel Serverless (configured with dynamic standalone omission for zero-friction Vercel builds) |
| **CI/CD Automation** | GitHub Actions (`.github/workflows/android-build.yml`), automated APK build, verification, and artifact upload |

---

## 🛠️ Local Development & Build Commands

### Run Next.js Web Platform:
```bash
npm install
npm run dev
# Open http://localhost:3000
```

### Build Android APK Locally:
```bash
# Ensure gradle.properties contains android.useAndroidX=true
./gradlew assembleDebug --stacktrace
# Output APK location:
# app/build/outputs/apk/debug/app-debug.apk
```

---

## 📄 License & Attribution

Developed with Google AI Studio and Jetpack Compose. Google Blogger and Gemini are trademarks of Google LLC.
