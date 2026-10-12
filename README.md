# Blogger Auto Publisher (Android)

Mobile-first Android publishing application built with Kotlin and Jetpack Compose to format and publish image and caption articles directly to Google Blogger blogs with a single tap.

## Features

- **Google Blogger API v3 Integration**: Securely connect Google accounts and query user-owned Blogger blogs (`https://www.googleapis.com/auth/blogger`).
- **Multi-User Isolation**: Isolated session handling, per-user blog selection, and post history.
- **Smart Image Processing**:
  - Automatic on-device photo optimization and downscaling for fast mobile loading.
  - Video player 16:9 thumbnail composer (1200×675) with 4 distinct composition styles: Cinematic Focus, Dramatic Close-Up, Rule of Thirds, and Vivid Cover.
- **AI Content Assistant (Gemini)**:
  - Visual subject recognition and focal-point coordinates extraction.
  - SEO title generation in English and Bengali (বাংলা).
  - Title regeneration and fine-tuning.
- **Master Blogger HTML Template Engine**:
  - Dynamic variable substitution for `{{TITLE}}`, `{{IMAGE_URL}}`, `{{THUMBNAIL_URL}}`, `{{CAPTION}}`, and `{{PUBLISHED_DATE}}`.
  - In-app HTML template editor with reset to default and variable tag insertion.
- **Post Preview**:
  - Real-time rendered WebView preview with Mobile/Desktop responsive toggles.
  - Raw HTML preview with one-tap clipboard copy.
- **Publishing & History Tracking**:
  - 4-step animated publishing workflow.
  - Success screen with live article URL, native Android Share (`Intent.ACTION_SEND`), and copy link.
  - Firestore-synced published posts history.

## Architecture

- **Language**: Kotlin 2.0.21
- **UI Toolkit**: Jetpack Compose with Material Design 3 (M3)
- **Architecture Pattern**: MVVM (Model-View-ViewModel) + Repository Pattern
- **Async & Reactive**: Kotlin Coroutines & StateFlow
- **Networking**: OkHttp 4.12
- **Image Loading**: Coil Compose 2.7
- **Serialization**: kotlinx.serialization 1.7.3

## Building & Running

Open the project in Android Studio (Ladybug or newer) and run the `app` module on an Android device or emulator running Android 8.0 (API 26) or higher.
