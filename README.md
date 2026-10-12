# Blogger Post Automation AI

[![Android Build & Release](https://github.com/malot-apps/Blogger-post-automation-/actions/workflows/android-build.yml/badge.svg)](https://github.com/malot-apps/Blogger-post-automation-/actions/workflows/android-build.yml)
[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20Web-blue.svg)](https://github.com/malot-apps/Blogger-post-automation-)
[![Gemini AI](https://img.shields.io/badge/AI-Gemini%203.8%20Flash-orange.svg)](https://ai.google.dev/)
[![Blogger API](https://img.shields.io/badge/Blogger%20API-v3-green.svg)](https://developers.google.com/blogger)

**Blogger Post Automation AI** is an enterprise-grade, mobile-first publishing platform and Android application built with Kotlin, Jetpack Compose, Next.js, and Google Gemini AI. It enables creators to format, enhance, proofread, and publish high-converting image, video-thumbnail, and caption articles directly to their Google Blogger blogs with a single tap.

---

## 📥 Android APK Download & Installation

The Android debug APK is built automatically on every commit and release via **GitHub Actions**.

### Download Methods:
1. **GitHub Releases (Version Tags)**:
   - Navigate to [Releases](https://github.com/malot-apps/Blogger-post-automation-/releases).
   - Under the latest version (e.g., `v1.0.0`), download **`BloggerPostAutomationAI-debug.apk`**.
2. **GitHub Actions Workflow Artifacts (Latest Commits)**:
   - Go to the **Actions** tab on GitHub: [Blogger-post-automation- Actions](https://github.com/malot-apps/Blogger-post-automation-/actions/workflows/android-build.yml).
   - Click the most recent workflow run.
   - Scroll down to the **Artifacts** section at the bottom and download **`BloggerPostAutomationAI-apk`**.
   - Unzip the downloaded archive to access `BloggerPostAutomationAI-debug.apk`.

### How to Install on Android:
1. Transfer or download `BloggerPostAutomationAI-debug.apk` directly on your Android phone or tablet (Android 8.0+ / Oreo / API Level 26 or higher).
2. Tap the downloaded APK in your Downloads folder or notification bar.
3. If prompted with *"For your security, your phone is not allowed to install unknown apps from this source"*, tap **Settings** and enable **"Allow from this source"**.
4. Tap **Install** and open **Blogger Post Automation AI**.
5. In the app or web interface, open **Settings** to enter your own personal **Gemini API Key**. The key is stored securely in your private device session and never exposed or hardcoded.

---

## 🚀 Key Features

### 1. 🌐 Public Multi-User Google Authentication
- **Universal Multi-User Sign-In**: Any user can securely sign in with their own Google account. No fixed accounts or developer email hardcoding.
- **Isolated User Sessions**: Each account maintains its own OAuth session, Blogger blog list, selected default blog, and Firestore post history.
- **Granular OAuth Permissions**: Requests only user identity and `https://www.googleapis.com/auth/blogger`. Tokens are never shared or logged.
- **Instant Revocation**: Users can disconnect their session at any time or revoke permissions via [Google Security Settings](https://myaccount.google.com/permissions).

### 2. 🤖 Gemini AI Content Suite
- **Custom User API Key**: Users can provide their own Gemini API key in **Settings**, using their private quota and tier without exposing keys to other users.
- **Multilingual Support (বাংলা & English)**: Native content generation, SEO headlines, and natural copy in both Bengali and English.
- **Smart Image Analysis**: Visual scene understanding, focal-point coordinate detection ($x, y$ percentages), and automatic 16:9 thumbnail crop suggestions.
- **Article Rewriter & Proofreader**: Rewrites rough drafts into polished, high-readability Blogger HTML articles with `<h2>`, `<h3>` headings, meta descriptions, and bullet points.
- **SEO & Readability Auditor**: Instant scoring (0–100), word count, keyword density analysis, and actionable recommendations.
- **Label & Hashtag Generator**: Automatically extracts high-traffic category labels formatted for Blogger and social media discovery.

### 3. 🔄 Blogger Site-to-Site Post Import
- **Instant Blog Discovery by URL**: Paste any public or owned Blogger URL (e.g., `https://myblog.blogspot.com` or custom domain).
- **Dual API & Feed Pipeline**: Fetches posts via Google Blogger API v3 or the standard public Blogger Atom/JSON feed.
- **Comprehensive Post Extraction**: Extracts post titles, complete HTML contents, author info, published dates, category labels, and all embedded images.
- **AI Enhancement**: Preview any imported article and run one-tap AI enhancement to rewrite, reformat, and translate before publishing.
- **One-Tap & Bulk Publishing**: Publish imported posts individually or in bulk directly to the user's chosen target Blogger blog.

### 4. 🎨 Master HTML Template Engine & 16:9 Thumbnail Composer
- **Dynamic Variable Substitution**: Supports `{{TITLE}}`, `{{IMAGE_URL}}`, `{{THUMBNAIL_URL}}`, `{{CAPTION}}`, and `{{PUBLISHED_DATE}}`.
- **4 Thumbnail Composition Styles**:
  1. *Cinematic Focus* (Centered zoom with video play overlay)
  2. *Dramatic Close-Up* (Tight facial/object crop)
  3. *Rule of Thirds* (Asymmetric editorial layout)
  4. *Vivid Editorial* (High-saturation cover card)
- **Responsive In-App Preview**: Toggle between Mobile (375px) and Desktop (100%) views before live publishing.

---

## 🏗️ Architecture & Technologies

| Layer | Technologies |
| :--- | :--- |
| **Android Client** | Kotlin 2.0, Jetpack Compose (M3), MVVM, Coroutines, StateFlow, Coil, OkHttp |
| **Web Client** | Next.js 15 (App Router), React 19, Tailwind CSS v4, Lucide Icons |
| **AI Integration** | Google GenAI SDK (`@google/genai`), Models: `gemini-3.8-flash`, `gemini-3.1-flash-lite` |
| **Cloud & Database** | Firebase Firestore (per-user security rules), Google Cloud Identity |
| **CI/CD** | GitHub Actions (`.github/workflows/android-build.yml`), automated release asset tagging |

---

## 🔒 Security & Privacy Architecture

1. **Zero-Trust Token Management**: Google OAuth access tokens are handled ephemerally. They are passed directly to Google's Blogger endpoints and are never written to unauthenticated databases.
2. **Server-Side API Secret Protection**: Gemini API keys entered by users are transmitted only over encrypted HTTPS to server endpoints and never logged or exposed in public client bundles.
3. **Firestore Multi-Tenant Security Rules**: Firestore security rules restrict reading and writing post history strictly to `request.auth.uid == userId`. No cross-tenant data leakage is possible.

---

## 🛠️ Local Development & Build

### Running the Web Platform:
```bash
npm install
npm run dev
# Open http://localhost:3000
```

### Compiling the Android APK locally:
```bash
./gradlew assembleDebug
# Generated APK will be in:
# app/build/outputs/apk/debug/app-debug.apk
```

---

## 📄 License & Attribution

Developed with Google AI Studio and Jetpack Compose. All Blogger rights belong to Google LLC.
