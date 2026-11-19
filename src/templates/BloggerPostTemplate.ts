import { escapeHtml } from '../lib/sanitizer';
import {
  isPngImageUrl,
  selectMainThumbnailImageFromHtml,
} from '../lib/mainImageSelector';
import {
  deduplicateAdScriptsAndContainers,
  ensureMasterAdConfiguration,
  sanitizeImportedArticleFragment,
} from '../lib/importedHtmlCleaner';
import { type AdsSettings } from '../lib/adsSettings';

export interface BloggerTemplateVariables {
  title: string;
  imageUrl: string;
  thumbnailUrl?: string;
  caption: string;
  metaDescription?: string;
  publishedDate?: string;
}

/**
 * Authoritative Default Master HTML Template.
 * Matches /templates/blogger-post-template.html verbatim.
 */
export const DEFAULT_MASTER_TEMPLATE = String.raw`<!DOCTYPE html>
<html lang="bn">
<head>
  <script src="https://pl30161573.effectivecpmnetwork.com/bc/17/d1/bc17d177bcada949929a7511850a6cf0.js" data-app-ad="popup-script"></script>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{TITLE}}</title>
  <meta name="description" content="{{META_DESCRIPTION}}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@500;600;700&family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
    }

    html {
      scroll-behavior: smooth;
    }

    body {
      font-family: 'Hind Siliguri', 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #1e293b;
      background-color: #ffffff;
      line-height: 1.65;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
    }

    /* Blogger Post Thumbnail Separator */
    .separator {
      clear: both;
      margin: 16px 0;
      text-align: center;
    }

    .separator a {
      display: block;
      padding: 0.5em 0;
      text-align: center;
      color: #475569;
      text-decoration: none;
      font-size: 14px;
    }

    .separator img {
      max-width: 100%;
      height: auto;
      border-radius: 10px;
      display: inline-block;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
    }

    /* CLS-Safe Responsive Ad Slots & Fallback System */
    .ad-slot-wrapper {
      width: 100%;
      margin: 18px auto;
      padding: 10px 12px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      background-color: #f8fafc;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      contain: layout style;
      overflow: hidden;
    }

    .ad-slot-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #94a3b8;
      margin-bottom: 6px;
      line-height: 1;
      user-select: none;
    }

    .ad-slot-inner {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .ad-slot--banner .ad-slot-inner {
      max-width: 728px;
      min-height: 90px;
    }

    .ad-slot--native .ad-slot-inner,
    .ad-slot--incontent .ad-slot-inner,
    .ad-slot--player-bottom .ad-slot-inner,
    .ad-slot--related .ad-slot-inner {
      min-height: 120px;
    }

    .ad-fallback {
      display: none;
      width: 100%;
      padding: 14px 16px;
      border-radius: 8px;
      border: 1px dashed #cbd5e1;
      background: #ffffff;
      color: #64748b;
      font-size: 13px;
      text-align: center;
      line-height: 1.45;
    }

    .ad-slot-wrapper.is-fallback .ad-fallback {
      display: block;
    }

    .ad-fallback strong {
      display: block;
      color: #334155;
      font-size: 13.5px;
      margin-bottom: 2px;
    }

    /* Bengali CTA Heading Above Player */
    .bn-player-heading-wrap {
      text-align: center;
      margin: 20px auto 12px;
      animation: bnFadeSlideUp 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .bn-player-heading {
      margin: 0;
      font-size: clamp(1.2rem, 2.8vw, 1.55rem);
      font-weight: 700;
      color: #0f172a;
      line-height: 1.45;
    }

    .bn-player-subheading {
      margin: 4px 0 0;
      font-size: 14px;
      font-weight: 500;
      color: #475569;
    }

    @keyframes bnFadeSlideUp {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Auto-Sizing Video Player Container */
    .video-container {
      position: relative;
      width: 100%;
      max-width: min(100%, var(--video-width, 100%), calc(max(320px, 82vh) * var(--video-aspect, 1.777778)));
      aspect-ratio: var(--video-ratio, 16 / 9);
      height: auto;
      margin: 12px auto 18px;
      background-color: #000;
      overflow: hidden;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
      cursor: pointer;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    }

    #videoThumbnail {
      width: 100%;
      height: 100%;
      object-fit: contain;
      object-position: center;
      display: block;
      transition: opacity 0.25s ease;
    }

    .video-container.is-thumb-error #videoThumbnail,
    .video-container.is-playing #videoThumbnail,
    .video-container.is-playing .video-scrim,
    .video-container.is-playing .play-center-group {
      display: none;
    }

    .video-scrim {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at center, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.08) 55%, rgba(0, 0, 0, 0.36) 100%);
      pointer-events: none;
      z-index: 2;
    }

    #videoPlayer {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: none;
      background: #000;
      z-index: 20;
    }

    .video-container.is-playing #videoPlayer {
      display: block;
    }

    /* Live Viewer Counter Badge Over Video Player */
    .live-viewer-badge {
      position: absolute;
      top: 12px;
      left: 12px;
      z-index: 25;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 6px 12px;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.72);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.22);
      color: #ffffff;
      font-size: 12.5px;
      font-weight: 600;
      line-height: 1.2;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.32);
      pointer-events: none;
      user-select: none;
    }

    .live-viewer-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: #ef4444;
      box-shadow: 0 0 8px rgba(239, 68, 68, 0.85);
      flex-shrink: 0;
      animation: liveDotPulse 1.6s ease-in-out infinite;
    }

    .live-viewer-count {
      font-variant-numeric: tabular-nums;
      display: inline-block;
      transition: opacity 0.28s ease, transform 0.28s ease;
    }

    .live-viewer-count.is-updating {
      opacity: 0;
      transform: translateY(-2px);
    }

    @keyframes liveDotPulse {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.45;
        transform: scale(0.85);
      }
    }

    /* Centered Play Button + Bengali Instruction Group */
    .play-center-group {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      pointer-events: none;
    }

    .play-icon {
      position: relative;
      width: 78px;
      height: 78px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(110, 142, 251, 0.96), rgba(167, 119, 227, 0.96));
      border: 2px solid rgba(255, 255, 255, 0.94);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      pointer-events: auto;
      box-shadow:
        0 0 26px rgba(110, 142, 251, 0.7),
        0 0 48px rgba(167, 119, 227, 0.45),
        0 10px 24px rgba(0, 0, 0, 0.38);
      transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.28s ease, opacity 0.25s ease;
    }

    .play-icon::before,
    .play-icon::after {
      content: '';
      position: absolute;
      inset: -10px;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.75);
      box-shadow: 0 0 20px rgba(110, 142, 251, 0.58);
      animation: playPulseRing 2.2s cubic-bezier(0.22, 1, 0.36, 1) infinite;
      pointer-events: none;
    }

    .play-icon::after {
      animation-delay: 1.05s;
    }

    .video-container:hover .play-icon,
    .play-icon:hover {
      transform: scale(1.1);
      box-shadow:
        0 0 34px rgba(110, 142, 251, 0.88),
        0 0 64px rgba(167, 119, 227, 0.58),
        0 14px 32px rgba(0, 0, 0, 0.45);
    }

    .play-icon:active {
      transform: scale(0.97);
    }

    .play-icon:focus-visible {
      outline: 3px solid #ffffff;
      outline-offset: 4px;
    }

    .play-icon svg {
      width: 30px;
      height: 30px;
      margin-left: 4px;
      fill: currentColor;
      filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.25));
    }

    .play-icon.loading {
      opacity: 0;
      pointer-events: none;
      transform: scale(0.84);
    }

    /* Short Bengali instruction directly below Play button */
    .bn-play-hint {
      position: absolute;
      top: calc(50% + 52px);
      left: 12px;
      right: 12px;
      margin-inline: auto;
      width: fit-content;
      max-width: min(90%, 340px);
      padding: 6px 14px;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.72);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #ffffff;
      font-size: 13px;
      font-weight: 600;
      text-align: center;
      line-height: 1.4;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.28);
      animation: bnFadeSlideUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.12s both;
      transition: opacity 0.2s ease;
    }

    .play-center-group.is-hidden {
      opacity: 0;
      pointer-events: none;
    }

    @keyframes playPulseRing {
      0% { transform: scale(0.92); opacity: 0.85; }
      75% { transform: scale(1.52); opacity: 0; }
      100% { transform: scale(1.52); opacity: 0; }
    }

    /* Friendly Bengali Loading & Error / Retry Overlay */
    .loading-screen,
    .playback-error-screen {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      padding: 20px;
      background: rgba(15, 23, 42, 0.68);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 15;
    }

    .overlay-glass-card {
      width: min(350px, 94%);
      padding: 22px 20px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.24);
      box-shadow: 0 18px 42px rgba(0, 0, 0, 0.35);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 10px;
      color: #ffffff;
      animation: bnFadeSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .loading-spinner {
      width: 46px;
      height: 46px;
      border-radius: 50%;
      background: conic-gradient(from 0deg, #6e8efb, #a777e3, rgba(255, 255, 255, 0.16) 75%);
      -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px));
      mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px));
      animation: spinnerSpin 0.85s linear infinite;
    }

    .overlay-title {
      font-size: 16.5px;
      font-weight: 700;
      color: #ffffff;
      line-height: 1.45;
      text-shadow: 0 1px 6px rgba(0, 0, 0, 0.3);
    }

    .overlay-subtitle {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.88);
      line-height: 1.5;
    }

    .retry-btn {
      margin-top: 4px;
      padding: 10px 22px;
      border-radius: 50px;
      border: 1px solid rgba(255, 255, 255, 0.35);
      background: linear-gradient(135deg, #6e8efb, #a777e3);
      color: #ffffff;
      font-family: inherit;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .retry-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(110, 142, 251, 0.45);
    }

    @keyframes spinnerSpin {
      to { transform: rotate(360deg); }
    }

    /* Controls & Floating Scroll Indicator */
    .controls {
      display: flex;
      justify-content: center;
      gap: 15px;
      margin: 18px 0 14px;
      flex-wrap: wrap;
    }

    button {
      padding: 12px 25px;
      background: linear-gradient(135deg, #6e8efb, #a777e3);
      color: white;
      border: none;
      border-radius: 50px;
      cursor: pointer;
      font-family: inherit;
      font-size: 16px;
      font-weight: bold;
      transition: all 0.3s;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }

    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
    }

    button:active {
      transform: scale(0.98);
    }

    button.is-cooldown {
      opacity: 0.82;
      transform: scale(0.98);
      pointer-events: none;
    }

    .scroll-indicator-wrap {
      display: flex;
      justify-content: center;
      margin: 8px 0 22px;
    }

    .scroll-indicator {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 8px 18px;
      border-radius: 999px;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      color: #475569;
      text-decoration: none;
      font-size: 13.5px;
      font-weight: 600;
      animation: gentleFloat 2.4s ease-in-out infinite;
      transition: color 0.2s ease, border-color 0.2s ease;
    }

    .scroll-indicator:hover {
      color: #6e8efb;
      border-color: #c7d2fe;
    }

    .scroll-indicator svg {
      width: 18px;
      height: 18px;
      color: #6e8efb;
    }

    @keyframes gentleFloat {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(5px);
      }
    }

    .post-description {
      margin: 24px 0;
      padding: 20px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background-color: #ffffff;
    }

    .post-description h1 {
      margin: 0 0 10px;
      font-size: clamp(1.25rem, 2.5vw, 1.65rem);
      color: #0f172a;
      line-height: 1.35;
    }

    .post-description p {
      margin: 0 0 14px;
      font-size: 15px;
      color: #475569;
    }

    .post-description p:last-child {
      margin-bottom: 0;
    }

    .related-section {
      margin: 26px 0;
    }

    .related-heading {
      margin: 0 0 14px;
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
    }

    .related-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .related-card {
      display: flex;
      flex-direction: column;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
      background-color: #ffffff;
      text-decoration: none;
      color: inherit;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .related-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
    }

    .related-thumb {
      width: 100%;
      aspect-ratio: 16 / 9;
      background: linear-gradient(135deg, #eef2ff, #f5f3ff);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #6e8efb;
      font-weight: 700;
      font-size: 13px;
    }

    .related-body {
      padding: 12px;
    }

    .related-title {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 4px;
      line-height: 1.4;
    }

    .related-meta {
      font-size: 12px;
      color: #64748b;
    }

    @media (max-width: 600px) {
      body {
        padding: 12px;
      }

      .ad-slot--banner .ad-slot-inner {
        min-height: 56px;
      }

      .ad-slot--native .ad-slot-inner,
      .ad-slot--incontent .ad-slot-inner,
      .ad-slot--player-bottom .ad-slot-inner,
      .ad-slot--related .ad-slot-inner {
        min-height: 96px;
      }

      .play-icon {
        width: 62px;
        height: 62px;
      }

      .play-icon svg {
        width: 24px;
        height: 24px;
      }

      .bn-play-hint {
        top: calc(50% + 42px);
        font-size: 12px;
        padding: 5px 12px;
      }

      .live-viewer-badge {
        top: 10px;
        left: 10px;
        padding: 5px 10px;
        font-size: 11.5px;
        gap: 6px;
      }

      .overlay-glass-card {
        padding: 18px 14px;
      }

      .controls {
        gap: 10px;
        margin: 16px 0 12px;
      }

      button {
        padding: 11px 20px;
        font-size: 14.5px;
        flex: 1 1 auto;
        min-width: 130px;
      }

      .post-description {
        padding: 14px;
      }

      .related-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      html {
        scroll-behavior: auto;
      }
      .play-icon::before,
      .play-icon::after,
      .scroll-indicator,
      .bn-player-heading-wrap,
      .bn-play-hint,
      .live-viewer-dot {
        animation: none;
      }
    }
  </style>
</head>
<body>
  <!-- 1. TOP BANNER AD (At the beginning of the post) -->
  <aside class="ad-slot-wrapper ad-slot--banner" data-ad-slot="top-banner" aria-label="Top Advertisement">
    <span class="ad-slot-label">Advertisement</span>
    <div class="ad-slot-inner" id="ad-top-banner">
      <div class="ad-fallback">
        <strong>Sponsored Banner</strong>
        <span>Ad content unavailable right now.</span>
      </div>
    </div>
  </aside>

  <!-- BLOGGER THUMBNAIL & CAPTION -->
  <div class="separator" style="clear: both;">
    <a href="{{IMAGE_URL}}">
      <img alt="{{TITLE}}" border="0" data-original-height="1350" data-original-width="1080" height="320" loading="eager" src="{{IMAGE_URL}}" />
    </a>
    <a href="{{IMAGE_URL}}">{{CAPTION}}</a>
  </div>

  <!-- 2. NATIVE AD (Below the thumbnail) -->
  <aside class="ad-slot-wrapper ad-slot--native" data-ad-slot="native-below-thumb" aria-label="Native Advertisement">
    <span class="ad-slot-label">Sponsored</span>
    <div class="ad-slot-inner" id="ad-native-thumb">
      <div id="container-390299b40362a820b12f3db553aff06f"></div>
      <div class="ad-fallback">
        <strong>Recommended Partner</strong>
        <span>Native placement reserved for lightweight display.</span>
      </div>
    </div>
  </aside>

  <!-- BENGALI HEADING ABOVE VIDEO PLAYER -->
  <div class="bn-player-heading-wrap">
    <h2 class="bn-player-heading">সম্পূর্ণ ভিডিওটি দেখতে প্লে বাটনে ক্লিক করুন</h2>
    <p class="bn-player-subheading">মোবাইল ও ডেস্কটপ উপযোগী এইচডি প্লেব্যাক</p>
  </div>

  <!-- VIDEO PLAYER SECTION -->
  <div class="video-container" id="videoContainer">
    <div class="live-viewer-badge" aria-live="off">
      <span class="live-viewer-dot" aria-hidden="true"></span>
      <span class="live-viewer-count" id="liveViewerCount">2,840</span>
      <span>জন দেখছেন</span>
    </div>

    <img alt="{{TITLE}}" decoding="async" id="videoThumbnail" loading="eager" src="{{IMAGE_URL}}" />
    <div class="video-scrim" aria-hidden="true"></div>

    <video id="videoPlayer" playsinline controls preload="none" poster="{{IMAGE_URL}}"></video>

    <div class="play-center-group" id="playCenterGroup">
      <div class="play-icon" id="playIcon" role="button" tabindex="0" aria-label="ভিডিও চালু করুন">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 5.14v14l11-7-11-7z"></path>
        </svg>
      </div>
      <div class="bn-play-hint">ভিডিও চালু করতে উপরের প্লে বাটনে চাপ দিন</div>
    </div>

    <!-- Friendly Bengali Loading Screen (shown only while buffering/loading) -->
    <div class="loading-screen" id="loadingScreen" style="display: none;" aria-live="polite">
      <div class="overlay-glass-card">
        <div class="loading-spinner" aria-hidden="true"></div>
        <div class="overlay-title" id="loadingMessage">ভিডিও লোড হচ্ছে, অনুগ্রহ করে একটু অপেক্ষা করুন...</div>
        <div class="overlay-subtitle">প্লেব্যাকের জন্য ভিডিও সোর্স সংযুক্ত করা হচ্ছে</div>
      </div>
    </div>

    <!-- Real Failure Retry / Repeated Failure Error Overlay -->
    <div class="playback-error-screen" id="playbackErrorScreen" style="display: none;" aria-live="assertive">
      <div class="overlay-glass-card">
        <div class="overlay-title" id="errorTitle">ভিডিওটি চালু করতে সমস্যা হয়েছে</div>
        <div class="overlay-subtitle" id="errorSubtitle">অনুগ্রহ করে পুনরায় চেষ্টা করুন।</div>
        <button type="button" class="retry-btn" id="retryPlayBtn">আবার চেষ্টা করুন</button>
      </div>
    </div>
  </div>

  <div class="controls">
    <button type="button" id="btn1">Play Now</button>
    <button type="button" id="btn2">Watch Now</button>
    <button type="button" id="btn3">Play &amp; Watch</button>
  </div>

  <!-- FLOATING DOWNWARD SCROLL INDICATOR -->
  <div class="scroll-indicator-wrap">
    <a class="scroll-indicator" href="#postDescription">
      <span>নিচে Scroll করুন</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 5v14"></path>
        <path d="m19 12-7 7-7-7"></path>
      </svg>
    </a>
  </div>

  <!-- 3. PLAYER BOTTOM AD (Directly below the video player) -->
  <aside class="ad-slot-wrapper ad-slot--player-bottom" data-ad-slot="player-bottom" aria-label="Player Advertisement">
    <span class="ad-slot-label">Advertisement</span>
    <div class="ad-slot-inner" id="ad-player-bottom">
      <div class="ad-fallback">
        <strong>Player Sponsor</strong>
        <span>Video playback remains unaffected.</span>
      </div>
    </div>
  </aside>

  <!-- POST DESCRIPTION WITH IN-CONTENT AD IN THE MIDDLE -->
  <section class="post-description" id="postDescription">
    <h1>{{TITLE}}</h1>
    <p>{{CAPTION}}</p>

    <!-- 4. IN-CONTENT AD (In the middle of the description) -->
    <aside class="ad-slot-wrapper ad-slot--incontent" data-ad-slot="in-content" aria-label="In-Content Advertisement">
      <span class="ad-slot-label">Sponsored Content</span>
      <div class="ad-slot-inner" id="ad-in-content">
        <div class="ad-fallback">
          <strong>Sponsored Highlight</strong>
          <span>Content continues smoothly below.</span>
        </div>
      </div>
    </aside>

    <p>পোর্ট্রেট, স্কয়ার কিংবা ল্যান্ডস্কেপ—যেকোনো থাম্বনেইল অনুপাতের সাথে স্বয়ংক্রিয়ভাবে মানিয়ে নেওয়া পরিচ্ছন্ন ও দ্রুতগতির ভিডিও প্লেয়ার।</p>
  </section>

  <!-- RELATED VIDEOS WITH RELATED CONTENT AD BETWEEN THEM -->
  <section class="related-section" aria-label="Related Videos">
    <h2 class="related-heading">সম্পর্কিত আরও ভিডিও</h2>
    <div class="related-grid">
      <a class="related-card" href="#videoContainer">
        <div class="related-thumb">Featured Stream</div>
        <div class="related-body">
          <div class="related-title">{{TITLE}}</div>
          <div class="related-meta">এইচডি স্ট্রিম &middot; দেখার জন্য প্রস্তুত</div>
        </div>
      </a>
      <a class="related-card" href="#videoContainer">
        <div class="related-thumb">Full Version</div>
        <div class="related-body">
          <div class="related-title">{{CAPTION}}</div>
          <div class="related-meta">মোবাইল অপ্টিমাইজড</div>
        </div>
      </a>
    </div>

    <!-- 5. RELATED CONTENT AD (Between related videos) -->
    <aside class="ad-slot-wrapper ad-slot--related" data-ad-slot="related-content" aria-label="Related Content Advertisement">
      <span class="ad-slot-label">Sponsored Suggestion</span>
      <div class="ad-slot-inner" id="ad-related-content">
        <div class="ad-fallback">
          <strong>More to Explore</strong>
          <span>Additional video suggestions above and below.</span>
        </div>
      </div>
    </aside>

    <div class="related-grid">
      <a class="related-card" href="#videoContainer">
        <div class="related-thumb">Highlights</div>
        <div class="related-body">
          <div class="related-title">জনপ্রিয় ক্লিপ ও হাইলাইটস দেখুন</div>
          <div class="related-meta">দ্রুত লোডিং</div>
        </div>
      </a>
      <a class="related-card" href="#videoContainer">
        <div class="related-thumb">Full Cut</div>
        <div class="related-body">
          <div class="related-title">সম্পূর্ণ সংস্করণ উপভোগ করুন</div>
          <div class="related-meta">ফুল রেজোলিউশন</div>
        </div>
      </a>
    </div>
  </section>

  <!-- 6. BOTTOM BANNER AD (At the end of the post) -->
  <aside class="ad-slot-wrapper ad-slot--banner" data-ad-slot="bottom-banner" aria-label="Bottom Advertisement">
    <span class="ad-slot-label">Advertisement</span>
    <div class="ad-slot-inner" id="ad-bottom-banner">
      <div class="ad-fallback">
        <strong>End of Post Banner</strong>
        <span>Thanks for watching.</span>
      </div>
    </div>
  </aside>

  <script>
    // =========================================================================
    // 1. MEDIA & THUMBNAIL CONFIGURATION
    // =========================================================================
    const CUSTOM_THUMBNAIL_URL = "{{IMAGE_URL}}";
    const CUSTOM_VIDEO_URL = "";

    // =========================================================================
    // 2. BUTTON CLICK & AD LINK CONFIGURATION
    // Configure individual button URLs, enable/disable actions, tab behavior,
    // and duplicate-click protection in one place.
    // =========================================================================
    const BUTTON_CLICK_CONFIG = {
      cooldownMs: 1200, // Prevents accidental double-clicks & duplicate events
      buttons: {
        btn1: {
          enabled: true,
          url: "https://cheflobesofficer.com/b1b9djat?key=a45917b862f040650d5da9b0f6ceac52",
          openInNewTab: true,    // true = new tab, false = current tab
          triggerPlayback: true  // true = also run video playback
        },
        btn2: {
          enabled: true,
          url: "https://www.effectivecpmnetwork.com/b1b9djat?key=a45917b862f040650d5da9b0f6ceac52",
          openInNewTab: true,
          triggerPlayback: false
        },
        btn3: {
          enabled: false,
          url: "",
          openInNewTab: true,
          triggerPlayback: true
        }
      }
    };

    const POPUP_AD_CONFIG = {
      enabled: false,
      url: "",
      cooldownMs: 15000
    };

    // Core Player Elements
    const videoContainer = document.getElementById('videoContainer');
    const playCenterGroup = document.getElementById('playCenterGroup');
    const playIcon = document.getElementById('playIcon');
    const loadingScreen = document.getElementById('loadingScreen');
    const loadingMessage = document.getElementById('loadingMessage');
    const playbackErrorScreen = document.getElementById('playbackErrorScreen');
    const errorTitle = document.getElementById('errorTitle');
    const errorSubtitle = document.getElementById('errorSubtitle');
    const retryPlayBtn = document.getElementById('retryPlayBtn');
    const videoThumbnail = document.getElementById('videoThumbnail');
    const videoPlayer = document.getElementById('videoPlayer');
    const liveViewerCount = document.getElementById('liveViewerCount');

    const VIEWER_MIN = 1577;
    const VIEWER_MAX = 5285;
    let currentViewerCount = VIEWER_MIN;

    function getRandomViewerCount(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function formatViewerNumber(num) {
      return num.toLocaleString('en-US');
    }

    function initLiveViewerCounter() {
      if (!liveViewerCount) return;
      currentViewerCount = getRandomViewerCount(VIEWER_MIN, VIEWER_MAX);
      liveViewerCount.textContent = formatViewerNumber(currentViewerCount);

      function scheduleNextUpdate() {
        const delayMs = 3200 + Math.floor(Math.random() * 2600);
        setTimeout(function () {
          const delta = Math.floor(Math.random() * 141) - 70;
          let nextCount = currentViewerCount + delta;
          if (nextCount < VIEWER_MIN || nextCount > VIEWER_MAX || nextCount === currentViewerCount) {
            nextCount = getRandomViewerCount(VIEWER_MIN, VIEWER_MAX);
          }
          currentViewerCount = nextCount;

          liveViewerCount.classList.add('is-updating');
          setTimeout(function () {
            liveViewerCount.textContent = formatViewerNumber(currentViewerCount);
            liveViewerCount.classList.remove('is-updating');
          }, 260);

          scheduleNextUpdate();
        }, delayMs);
      }

      scheduleNextUpdate();
    }

    let playbackFailures = 0;
    let loadTimeoutId = null;

    // Auto Thumbnail Aspect Ratio (16:9, 9:16, 1:1, 4:3, 2:3 & custom ratios without cropping or stretching)
    function adjustAspectRatio() {
      if (!videoThumbnail || !videoContainer) return;
      const w = videoThumbnail.naturalWidth;
      const h = videoThumbnail.naturalHeight;
      if (w > 0 && h > 0) {
        videoContainer.style.setProperty('--video-ratio', w + ' / ' + h);
        videoContainer.style.setProperty('--video-width', w + 'px');
        videoContainer.style.setProperty('--video-aspect', String(w / h));
        videoContainer.classList.toggle('is-portrait', h > w);
        videoContainer.classList.toggle('is-landscape', w > h);
        videoContainer.classList.toggle('is-square', w === h);
        videoContainer.classList.remove('is-thumb-error');
        videoThumbnail.style.display = 'block';
      }
    }

    function showLoadingState(messageText) {
      if (loadingMessage && messageText) {
        loadingMessage.textContent = messageText;
      }
      if (playbackErrorScreen) playbackErrorScreen.style.display = 'none';
      if (playCenterGroup) playCenterGroup.classList.add('is-hidden');
      if (playIcon) playIcon.classList.add('loading');
      if (loadingScreen) loadingScreen.style.display = 'flex';
    }

    function hideOverlaysForPlayback() {
      if (loadTimeoutId) clearTimeout(loadTimeoutId);
      if (loadingScreen) loadingScreen.style.display = 'none';
      if (playbackErrorScreen) playbackErrorScreen.style.display = 'none';
      if (playIcon) playIcon.classList.remove('loading');
      if (playCenterGroup) playCenterGroup.classList.remove('is-hidden');
      if (videoContainer) videoContainer.classList.add('is-playing');
    }

    function handlePlaybackFailure() {
      if (loadTimeoutId) clearTimeout(loadTimeoutId);
      playbackFailures += 1;

      if (loadingScreen) loadingScreen.style.display = 'none';
      if (playIcon) playIcon.classList.remove('loading');
      if (playCenterGroup) playCenterGroup.classList.add('is-hidden');
      if (videoContainer) videoContainer.classList.remove('is-playing');

      if (playbackFailures >= 2) {
        if (errorTitle) {
          errorTitle.textContent = 'দুঃখিত, বারবার চেষ্টা করেও ভিডিওটি চালু করা যায়নি';
        }
        if (errorSubtitle) {
          errorSubtitle.textContent =
            'অনুগ্রহ করে আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন অথবা কিছুক্ষণ পর পুনরায় চেষ্টা করুন।';
        }
        if (retryPlayBtn) {
          retryPlayBtn.textContent = 'পুনরায় চেষ্টা করুন';
        }
      } else {
        if (errorTitle) {
          errorTitle.textContent = 'ভিডিওটি লোড হতে ব্যর্থ হয়েছে';
        }
        if (errorSubtitle) {
          errorSubtitle.textContent = 'সংযোগে সাময়িক ত্রুটি দেখা দিয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।';
        }
        if (retryPlayBtn) {
          retryPlayBtn.textContent = 'আবার চেষ্টা করুন';
        }
      }

      if (playbackErrorScreen) {
        playbackErrorScreen.style.display = 'flex';
      }
    }

    function isUnresolvedPlaceholder(val) {
      return typeof val === 'string' && /^\{\{[A-Z0-9_]+\}\}$/.test(val.trim());
    }

    function isJpgOnlyAsset(url) {
      if (typeof url !== 'string') return false;
      const trimmed = url.trim();
      if (!trimmed || isUnresolvedPlaceholder(trimmed)) return false;
      if (/^data:image\/(jpe?g|webp|avif)/i.test(trimmed)) return true;
      if (/^data:image\//i.test(trimmed)) return false;
      if (/\.(png|gif|svg|bmp|ico)(\?|#|$)/i.test(trimmed)) return false;
      if (/[?&](?:format|fm|ext)=png(?:&|$)/i.test(trimmed)) return false;
      if (/\.(jpe?g|webp|avif)(\?|#|$)/i.test(trimmed)) return true;
      return /^(?:https?:)?\/\/|^(?:blob:|\/|\.\/|\.\.\/)/i.test(trimmed);
    }

    function getImageCandidateSrc(img) {
      if (!img) return '';
      const rawSrc = (img.getAttribute('src') || '').trim();
      const isPlaceholderSrc =
        !rawSrc ||
        isUnresolvedPlaceholder(rawSrc) ||
        /^data:image\/gif;base64,R0lGOD/i.test(rawSrc);
      if (!isPlaceholderSrc) {
        return rawSrc;
      }
      const lazyAttrs = ['data-src', 'data-original', 'data-lazy-src', 'data-lazyload'];
      for (let i = 0; i < lazyAttrs.length; i += 1) {
        const val = (img.getAttribute(lazyAttrs[i]) || '').trim();
        if (val && !isUnresolvedPlaceholder(val)) {
          return val;
        }
      }
      return '';
    }

    function handleThumbnailError() {
      if (!videoThumbnail) return;
      const fallbackSrc = videoThumbnail.dataset.fallbackUrl || '';
      if (fallbackSrc && !videoThumbnail.dataset.fallbackTried) {
        videoThumbnail.dataset.fallbackTried = 'true';
        videoThumbnail.src = fallbackSrc;
        if (videoPlayer) videoPlayer.setAttribute('poster', fallbackSrc);
        return;
      }
      videoThumbnail.style.display = 'none';
      if (videoContainer) {
        videoContainer.classList.add('is-thumb-error');
      }
      if (videoPlayer) {
        videoPlayer.removeAttribute('poster');
      }
    }

    function enforceJpgOnlyImages() {
      let resolvedJpgUrl = isJpgOnlyAsset(CUSTOM_THUMBNAIL_URL) ? CUSTOM_THUMBNAIL_URL.trim() : '';
      let separatorFallbackUrl = '';

      // Automatically exclude any PNG or ad/non-content images inside Blogger post separators
      document.querySelectorAll('.separator img').forEach(function (img) {
        const src = getImageCandidateSrc(img);
        if (!src || isUnresolvedPlaceholder(src)) return;
        if (isJpgOnlyAsset(src)) {
          if (img.getAttribute('src') !== src) {
            img.setAttribute('src', src);
          }
          if (!resolvedJpgUrl) {
            resolvedJpgUrl = src;
          } else if (!separatorFallbackUrl && src !== resolvedJpgUrl) {
            separatorFallbackUrl = src;
          }
        } else {
          const parentAnchor = img.closest('a');
          if (parentAnchor) {
            parentAnchor.style.display = 'none';
          } else {
            img.style.display = 'none';
          }
          img.removeAttribute('src');
        }
      });

      if (videoThumbnail) {
        const directThumbSrc = getImageCandidateSrc(videoThumbnail);
        if (!resolvedJpgUrl && isJpgOnlyAsset(directThumbSrc)) {
          resolvedJpgUrl = directThumbSrc;
        }

        if (separatorFallbackUrl && separatorFallbackUrl !== resolvedJpgUrl) {
          videoThumbnail.dataset.fallbackUrl = separatorFallbackUrl;
        }

        if (!videoThumbnail.dataset.sizingListenersAttached) {
          videoThumbnail.dataset.sizingListenersAttached = 'true';
          videoThumbnail.addEventListener('load', function () {
            if (typeof videoThumbnail.decode === 'function') {
              videoThumbnail.decode().catch(function () {}).finally(adjustAspectRatio);
            } else {
              adjustAspectRatio();
            }
          });
          videoThumbnail.addEventListener('error', handleThumbnailError);
        }

        if (resolvedJpgUrl) {
          if (videoThumbnail.getAttribute('loading') === 'lazy') {
            videoThumbnail.setAttribute('loading', 'eager');
          }
          if (videoThumbnail.getAttribute('src') !== resolvedJpgUrl) {
            videoThumbnail.src = resolvedJpgUrl;
          }
          if (videoPlayer) videoPlayer.setAttribute('poster', resolvedJpgUrl);
          if (videoThumbnail.complete) {
            if (videoThumbnail.naturalWidth > 0) {
              adjustAspectRatio();
            } else {
              handleThumbnailError();
            }
          }
        } else if (CUSTOM_THUMBNAIL_URL && !isUnresolvedPlaceholder(CUSTOM_THUMBNAIL_URL)) {
          videoThumbnail.style.display = 'none';
          if (videoContainer) videoContainer.classList.add('is-thumb-error');
          if (videoPlayer) videoPlayer.removeAttribute('poster');
        }
      }
    }

    function initSmoothScrollIndicator() {
      document.querySelectorAll('.scroll-indicator').forEach(function (link) {
        link.addEventListener('click', function (e) {
          const targetId = link.getAttribute('href');
          if (targetId && targetId.charAt(0) === '#') {
            const targetEl = document.getElementById(targetId.slice(1));
            if (targetEl) {
              e.preventDefault();
              targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }
        });
      });
    }

    function init() {
      enforceJpgOnlyImages();
      initSmoothScrollIndicator();

      if (videoPlayer) {
        videoPlayer.addEventListener('playing', hideOverlaysForPlayback);
        videoPlayer.addEventListener('canplay', function () {
          if (loadingScreen && loadingScreen.style.display === 'flex') {
            hideOverlaysForPlayback();
          }
        });
        videoPlayer.addEventListener('error', handlePlaybackFailure);
      }
    }

    // Real video playback handler (no fake progress, no popups, no forced redirects)
    function handleAction() {
      if (!videoPlayer) return;
      if (videoContainer) {
        videoContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      const sourceUrl = CUSTOM_VIDEO_URL || videoPlayer.getAttribute('src') || '';
      if (!sourceUrl) {
        handlePlaybackFailure();
        return;
      }

      showLoadingState('ভিডিও লোড হচ্ছে, অনুগ্রহ করে একটু অপেক্ষা করুন...');

      if (videoPlayer.src !== sourceUrl) {
        videoPlayer.src = sourceUrl;
        videoPlayer.load();
      }

      if (loadTimeoutId) clearTimeout(loadTimeoutId);
      loadTimeoutId = setTimeout(function () {
        if (videoPlayer.readyState < 2) {
          handlePlaybackFailure();
        }
      }, 10000);

      const playPromise = videoPlayer.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(function () {
            hideOverlaysForPlayback();
          })
          .catch(function (err) {
            // Only trigger failure UI when actual media loading/playback fails
            if (err && err.name !== 'AbortError') {
              handlePlaybackFailure();
            }
          });
      }
    }

    // =========================================================================
    // 3. USER-INITIATED BUTTON CLICK SYSTEM (NO AUTO POPUPS OR REDIRECTS)
    // =========================================================================
    const buttonLastClickAt = {};
    let lastPopupOpenedAt = 0;

    function isValidDestinationUrl(rawUrl) {
      if (typeof rawUrl !== 'string') return false;
      const trimmed = rawUrl.trim();
      return /^https?:\/\//i.test(trimmed);
    }

    function triggerConfiguredPopupAd(event) {
      if (!event || event.isTrusted === false) return;
      if (!POPUP_AD_CONFIG.enabled || !isValidDestinationUrl(POPUP_AD_CONFIG.url)) return;
      const now = Date.now();
      const cooldown = Math.max(1000, Number(POPUP_AD_CONFIG.cooldownMs) || 15000);
      if (now - lastPopupOpenedAt < cooldown) return;
      lastPopupOpenedAt = now;
      window.open(POPUP_AD_CONFIG.url.trim(), '_blank', 'noopener,noreferrer');
    }

    function applyButtonCooldown(buttonEl, buttonId, cooldownMs) {
      buttonLastClickAt[buttonId] = Date.now();
      if (!buttonEl || cooldownMs <= 0) return;

      buttonEl.classList.add('is-cooldown');
      buttonEl.setAttribute('aria-busy', 'true');
      setTimeout(function () {
        buttonEl.classList.remove('is-cooldown');
        buttonEl.removeAttribute('aria-busy');
      }, cooldownMs);
    }

    function handleConfiguredButtonClick(buttonId, event) {
      // Only respond to genuine user-initiated clicks
      if (!event || event.isTrusted === false) return;

      const buttonEl = document.getElementById(buttonId);
      const btnSettings = BUTTON_CLICK_CONFIG.buttons[buttonId];
      const cooldownMs = Math.max(0, Number(BUTTON_CLICK_CONFIG.cooldownMs) || 0);
      const now = Date.now();
      const lastClick = buttonLastClickAt[buttonId] || 0;

      // Prevent accidental duplicate click events
      if (cooldownMs > 0 && now - lastClick < cooldownMs) {
        return;
      }
      applyButtonCooldown(buttonEl, buttonId, cooldownMs);

      const hasActiveUrl =
        Boolean(btnSettings && btnSettings.enabled) &&
        isValidDestinationUrl(btnSettings.url);

      if (hasActiveUrl) {
        const destinationUrl = btnSettings.url.trim();
        if (btnSettings.openInNewTab) {
          // Single intentional new-tab open synchronously within the click handler
          window.open(destinationUrl, '_blank', 'noopener,noreferrer');
          if (btnSettings.triggerPlayback) {
            handleAction();
          }
          return;
        } else {
          // Intentional navigation in the current tab when configured
          window.location.assign(destinationUrl);
          return;
        }
      }

      // Preserve original playback functionality when URL action is disabled or empty
      if (!btnSettings || btnSettings.triggerPlayback !== false) {
        handleAction();
      }
    }

    function initButtonClickSystem() {
      Object.keys(BUTTON_CLICK_CONFIG.buttons).forEach(function (buttonId) {
        const buttonEl = document.getElementById(buttonId);
        if (!buttonEl) return;
        buttonEl.addEventListener('click', function (event) {
          handleConfiguredButtonClick(buttonId, event);
        });
      });
    }

    initButtonClickSystem();

    if (playIcon) {
      playIcon.addEventListener('click', function (e) {
        e.stopPropagation();
        triggerConfiguredPopupAd(e);
        handleAction();
      });
      playIcon.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          triggerConfiguredPopupAd(e);
          handleAction();
        }
      });
    }

    if (retryPlayBtn) {
      retryPlayBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        triggerConfiguredPopupAd(e);
        handleAction();
      });
    }

    if (videoContainer) {
      videoContainer.addEventListener('click', function (e) {
        if (!videoContainer.classList.contains('is-playing')) {
          triggerConfiguredPopupAd(e);
          handleAction();
        }
      });
    }

    // Smart Lazy-Loading & Fallback Advertisement System
    const adQueue = [];
    let isProcessingAdQueue = false;

    function markAdFallback(wrapper) {
      if (wrapper) {
        wrapper.classList.add('is-fallback');
      }
    }

    function injectExternalScript(targetEl, src, wrapper, asyncFlag, done) {
      const script = document.createElement('script');
      script.src = src;
      if (asyncFlag) {
        script.async = true;
        script.setAttribute('data-cfasync', 'false');
      }
      script.onload = function () {
        if (done) done();
      };
      script.onerror = function () {
        markAdFallback(wrapper);
        if (done) done();
      };
      targetEl.appendChild(script);

      setTimeout(function () {
        const hasRenderedAd = targetEl.querySelector('iframe, img, ins, a');
        if (!hasRenderedAd) {
          markAdFallback(wrapper);
        }
      }, 4500);
    }

    function processNextAd() {
      if (isProcessingAdQueue || adQueue.length === 0) return;
      isProcessingAdQueue = true;

      const wrapper = adQueue.shift();
      if (wrapper.querySelector('[data-app-ad="banner"]')) {
        isProcessingAdQueue = false;
        processNextAd();
        return;
      }

      const slotType = wrapper.getAttribute('data-ad-slot');
      const isMobileViewport = window.innerWidth <= 600;

      const finish = function () {
        isProcessingAdQueue = false;
        processNextAd();
      };

      if (slotType === 'top-banner') {
        const target = document.getElementById('ad-top-banner');
        if (!target) { finish(); return; }
        window.atOptions = {
          'key': '36d19f913897a5c30f86205584612f58',
          'format': 'iframe',
          'height': isMobileViewport ? 50 : 90,
          'width': isMobileViewport ? 320 : 728,
          'params': {}
        };
        injectExternalScript(
          target,
          'https://www.highperformanceformat.com/36d19f913897a5c30f86205584612f58/invoke.js',
          wrapper,
          false,
          finish
        );
      } else if (slotType === 'native-below-thumb') {
        const target = document.getElementById('ad-native-thumb');
        if (!target) { finish(); return; }
        injectExternalScript(
          target,
          'https://pl30160056.effectivecpmnetwork.com/390299b40362a820b12f3db553aff06f/invoke.js',
          wrapper,
          true,
          finish
        );
      } else if (slotType === 'bottom-banner') {
        const target = document.getElementById('ad-bottom-banner');
        if (!target) { finish(); return; }
        injectExternalScript(
          target,
          'https://pl30160054.effectivecpmnetwork.com/44/86/88/448688bfd2ba5f19d655439d50b8ea0b.js',
          wrapper,
          true,
          finish
        );
      } else {
        const target = wrapper.querySelector('.ad-slot-inner');
        if (!target) { finish(); return; }
        window.atOptions = {
          'key': '36d19f913897a5c30f86205584612f58',
          'format': 'iframe',
          'height': isMobileViewport ? 50 : 90,
          'width': isMobileViewport ? 320 : 728,
          'params': {}
        };
        injectExternalScript(
          target,
          'https://www.highperformanceformat.com/36d19f913897a5c30f86205584612f58/invoke.js',
          wrapper,
          false,
          finish
        );
      }
    }

    function loadAdSlot(wrapper) {
      if (!wrapper || wrapper.dataset.adLoaded === 'true') return;
      wrapper.dataset.adLoaded = 'true';
      adQueue.push(wrapper);
      processNextAd();
    }

    function initLazyAds() {
      const adSlots = document.querySelectorAll('.ad-slot-wrapper[data-ad-slot]');
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(function (entries, obs) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              loadAdSlot(entry.target);
              obs.unobserve(entry.target);
            }
          });
        }, { rootMargin: '220px 0px' });

        adSlots.forEach(function (slot) {
          observer.observe(slot);
        });
      } else {
        adSlots.forEach(loadAdSlot);
      }
    }

    init();
    initLiveViewerCounter();
    initLazyAds();
  </script>
</body>
</html>`;

function normalizeComparableUrl(url: string): string {
  return url.trim().replace(/&amp;/gi, '&');
}

function extractImportedArticleSlice(html: string): string | null {
  const startMarker = '<div class="imported-article-content">';
  const startIdx = html.indexOf(startMarker);
  if (startIdx === -1) return null;
  const endSectionIdx = html.indexOf('</section>', startIdx);
  return endSectionIdx !== -1 ? html.slice(startIdx, endSectionIdx) : html.slice(startIdx);
}

/**
 * Guarantees that {{IMAGE_URL}} is the VERY FIRST <img> in the published Blogger HTML <body>
 * and precedes any competing images, iframes, videos, embeds, objects, or body scripts
 * so Blogger always selects the Main Post Image as the post thumbnail.
 */
export function ensureMainImageFirstInPostHtml(
  html: string,
  mainImageUrl: string,
  altText?: string
): string {
  let cleanUrl = sanitizeTemplateUrlValue(mainImageUrl);

  // Never scan the Master Template shell as a fallback; only inspect .imported-article-content if present
  if (!cleanUrl || isPngImageUrl(cleanUrl)) {
    const articleSlice = extractImportedArticleSlice(html);
    const htmlCandidate = articleSlice ? selectMainThumbnailImageFromHtml(articleSlice) : null;
    if (htmlCandidate && !isPngImageUrl(htmlCandidate)) {
      cleanUrl = sanitizeTemplateUrlValue(htmlCandidate);
    }
  }

  if (!cleanUrl || isPngImageUrl(cleanUrl)) return html;

  const comparableTarget = normalizeComparableUrl(cleanUrl);
  const bodyMatch = /<body\b[^>]*>/i.exec(html);
  const bodyStartOffset =
    bodyMatch && bodyMatch.index !== undefined ? bodyMatch.index + bodyMatch[0].length : 0;
  const bodyContent = html.slice(bodyStartOffset);

  const firstImgMatch = /<img\b([^>]*)>/i.exec(bodyContent);
  const competingBeforeRegex = /<(?:iframe|video|embed|object|ins|script)\b/i;

  if (firstImgMatch && firstImgMatch.index !== undefined) {
    const attrs = firstImgMatch[1] || '';
    const srcMatch = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
    const firstImgSrc = srcMatch ? (srcMatch[1] || srcMatch[2] || srcMatch[3] || '') : '';
    const isTargetFirstImg = normalizeComparableUrl(firstImgSrc) === comparableTarget;
    const prefixBeforeImg = bodyContent.slice(0, firstImgMatch.index);
    const hasCompetingBeforeImg = competingBeforeRegex.test(prefixBeforeImg);

    if (isTargetFirstImg && !hasCompetingBeforeImg) {
      return html;
    }
  }

  const safeAlt = escapeHtml((altText || '').trim());
  const heroBlock = `<div class="separator" style="clear: both;"><a href="${cleanUrl}" style="display: block; padding: 1em 0px; text-align: center;"><img alt="${safeAlt}" border="0" data-original-height="1350" data-original-width="1080" height="320" src="${cleanUrl}" /></a></div>`;

  if (bodyMatch && bodyMatch.index !== undefined) {
    return `${html.slice(0, bodyStartOffset)}\n  ${heroBlock}\n${html.slice(bodyStartOffset)}`;
  }

  return `${heroBlock}\n${html}`;
}

export function normalizeMetaDescription(raw?: string | null): string {
  if (!raw) return '';
  return raw
    .replace(/\{\{\s*(TITLE|IMAGE_URL|THUMBNAIL_URL|CAPTION|PUBLISHED_DATE|META_DESCRIPTION)\s*\}\}/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Injects or replaces the <meta name="description"> tag cleanly in Blogger post HTML.
 * - Replaces {{META_DESCRIPTION}} when present.
 * - If metaDescription is empty/blank, removes the empty placeholder tag cleanly.
 * - If a custom/cached template lacks {{META_DESCRIPTION}} and a non-empty description is provided,
 *   updates an existing <meta name="description"> or injects one inside <head>.
 */
export function applyMetaDescriptionToTemplate(
  html: string,
  metaDescription?: string | null
): string {
  const normalized = normalizeMetaDescription(metaDescription);
  const emptyPlaceholderMetaLineRx =
    /[ \t]*<meta\b(?=[^>]*\bname\s*=\s*["']description["'])(?=[^>]*\bcontent\s*=\s*["']\s*\{\{META_DESCRIPTION\}\}\s*["'])[^>]*\/?>[ \t]*\r?\n?/gi;

  if (!normalized) {
    return html
      .replace(emptyPlaceholderMetaLineRx, '')
      .replace(/\{\{META_DESCRIPTION\}\}/g, '');
  }

  const escapedMeta = escapeHtml(normalized);
  if (/\{\{META_DESCRIPTION\}\}/.test(html)) {
    return html.replace(/\{\{META_DESCRIPTION\}\}/g, () => escapedMeta);
  }

  const existingMetaDescRx = /<meta\b([^>]*\bname\s*=\s*["']description["'][^>]*)>/i;
  if (existingMetaDescRx.test(html)) {
    return html.replace(existingMetaDescRx, (full, attrs: string) => {
      if (/\bcontent\s*=/i.test(attrs)) {
        return full.replace(
          /\bcontent\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i,
          () => `content="${escapedMeta}"`
        );
      }
      return `<meta${attrs} content="${escapedMeta}" />`;
    });
  }

  const metaTag = `<meta name="description" content="${escapedMeta}" />`;
  if (/<\/title>/i.test(html)) {
    return html.replace(/<\/title>/i, (m) => `${m}\n  ${metaTag}`);
  }
  if (/<head\b[^>]*>/i.test(html)) {
    return html.replace(/<head\b[^>]*>/i, (m) => `${m}\n  ${metaTag}`);
  }
  return `${metaTag}\n${html}`;
}

/**
 * Renders the Blogger post HTML by replacing all dynamic template variables:
 * - {{TITLE}}
 * - {{META_DESCRIPTION}}
 * - {{IMAGE_URL}} / {{THUMBNAIL_URL}} (always uses the selected Main Post Image)
 * - {{CAPTION}}
 * - {{PUBLISHED_DATE}}
 * Applies only the enabled, valid Ads Settings cleanly.
 */
export function renderBloggerPostTemplate(
  templateString?: string,
  data?: BloggerTemplateVariables,
  adsSettings?: AdsSettings | null
): string {
  const safeTemplate =
    templateString && templateString.trim().length > 0
      ? templateString
      : DEFAULT_MASTER_TEMPLATE;

  if (!data) {
    const cleaned = applyMetaDescriptionToTemplate(safeTemplate, undefined);
    return adsSettings
      ? ensureMasterAdConfiguration(cleaned, DEFAULT_MASTER_TEMPLATE, adsSettings)
      : cleaned;
  }

  const escapedTitle = escapeHtml(data.title || '');
  const formattedCaption = escapeHtml(data.caption || '').replace(/\n/g, '<br/>');
  const rawMainUrl = sanitizeTemplateUrlValue(data.imageUrl || data.thumbnailUrl);
  const safeImageUrl = rawMainUrl && !isPngImageUrl(rawMainUrl) ? rawMainUrl : '';

  const formattedDate =
    data.publishedDate ||
    new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

  const renderedWithVars = safeTemplate
    .replace(/\{\{TITLE\}\}/g, () => escapedTitle)
    .replace(/\{\{IMAGE_URL\}\}/g, () => safeImageUrl)
    .replace(/\{\{THUMBNAIL_URL\}\}/g, () => safeImageUrl)
    .replace(/\{\{CAPTION\}\}/g, () => formattedCaption)
    .replace(/\{\{PUBLISHED_DATE\}\}/g, () => formattedDate);

  const rendered = applyMetaDescriptionToTemplate(renderedWithVars, data.metaDescription);
  const secured = ensureMasterAdConfiguration(rendered, DEFAULT_MASTER_TEMPLATE, adsSettings);
  return ensureMainImageFirstInPostHtml(secured, safeImageUrl, data.title);
}

export interface ImportedTemplateVariables {
  title: string;
  articleHtml: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  firstImageAlt?: string;
  firstImageSrcset?: string;
  metaDescription?: string;
  publishedDate?: string;
  sourceUrl?: string;
}

const IMPORTED_ARTICLE_SCOPED_CSS = `
    .imported-article-content {
      display: block;
      padding: 1em 0px;
      text-align: left;
      line-height: 1.75;
      max-width: 100%;
      overflow-wrap: break-word;
      color: inherit;
    }
    .imported-article-content h1,
    .imported-article-content h2,
    .imported-article-content h3,
    .imported-article-content h4 {
      margin: 1.1em 0 0.5em;
      line-height: 1.35;
    }
    .imported-article-content p {
      margin: 0.75em 0;
    }
    .imported-article-content ul,
    .imported-article-content ol {
      margin: 0.75em 0;
      padding-left: 1.5em;
    }
    .imported-article-content blockquote {
      margin: 1em 0;
      padding: 0.5em 1em;
      border-left: 4px solid #6e8efb;
      background: rgba(0, 0, 0, 0.03);
    }
    .imported-article-content figure {
      margin: 1em 0;
      text-align: center;
    }
    .imported-article-content figcaption {
      font-size: 0.875em;
      color: #555;
      margin-top: 6px;
    }
    .imported-article-content img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 12px auto;
      border-radius: 6px;
    }
    .imported-article-content video,
    .imported-article-content audio {
      max-width: 100%;
      display: block;
      margin: 12px auto;
      border-radius: 8px;
    }
    .imported-article-content table {
      width: 100%;
      max-width: 100%;
      overflow-x: auto;
      border-collapse: collapse;
      margin: 14px 0;
    }
    .imported-article-content th,
    .imported-article-content td {
      border: 1px solid #cbd5e1;
      padding: 8px 10px;
      text-align: left;
    }
    .imported-article-content th {
      background-color: #f8fafc;
      font-weight: 700;
    }
`;

function sanitizeTemplateUrlValue(url?: string): string {
  if (!url) return '';
  return url.trim().replace(/["'<>\\\r\n]/g, '');
}

/**
 * Converts a sanitized imported article (title, cleaned HTML body, original images)
 * into the existing Master HTML Template without bypassing its design, CSS, scripts,
 * or interactive player/control sections, injecting the imported article body strictly once.
 */
export function renderImportedPostTemplate(
  templateString?: string | null,
  data?: ImportedTemplateVariables,
  masterAdSourceTemplate?: string | null,
  adsSettings?: AdsSettings | null
): string {
  const authoritativeMaster =
    masterAdSourceTemplate && masterAdSourceTemplate.trim().length > 0
      ? masterAdSourceTemplate
      : DEFAULT_MASTER_TEMPLATE;

  const safeTemplate =
    templateString && templateString.trim().length > 0
      ? deduplicateAdScriptsAndContainers(templateString)
      : authoritativeMaster;

  if (!data) {
    return adsSettings
      ? ensureMasterAdConfiguration(safeTemplate, authoritativeMaster, adsSettings)
      : safeTemplate;
  }

  // Always sanitize imported HTML strictly before merging so imported content
  // can never execute scripts, inject ads/smart links, keep clickable ad banners, or override Master Template ad config.
  const cleanedArticleHtml = sanitizeImportedArticleFragment(data.articleHtml || '', {
    baseUrl: data.sourceUrl,
  });

  const escapedTitle = escapeHtml(data.title || '');
  const plainSummary = cleanedArticleHtml
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const shortSummary = escapeHtml(
    plainSummary.length > 110 ? `${plainSummary.slice(0, 107).trim()}...` : plainSummary || data.title || ''
  );

  let safeImageUrl = sanitizeTemplateUrlValue(data.imageUrl || data.thumbnailUrl);
  if (!safeImageUrl || isPngImageUrl(safeImageUrl)) {
    const recoveredFromArticle = selectMainThumbnailImageFromHtml(cleanedArticleHtml);
    safeImageUrl =
      recoveredFromArticle && !isPngImageUrl(recoveredFromArticle)
        ? sanitizeTemplateUrlValue(recoveredFromArticle)
        : '';
  }
  const formattedDate =
    data.publishedDate ||
    new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

  const articleContainer = `<div class="imported-article-content">${cleanedArticleHtml}</div>`;

  let output = safeTemplate;

  // 1. Add scoped responsive rules for imported article elements without altering existing template CSS
  if (/<\/style>/i.test(output)) {
    output = output.replace(/<\/style>/i, () => `${IMPORTED_ARTICLE_SCOPED_CSS}  </style>`);
  }

  // 2. Replace {{CAPTION}} inside the Master Template cleanly (injecting articleContainer exactly once)
  const postDescCaptionRx = /(<section\b[^>]*id=["']postDescription["'][^>]*>[\s\S]*?)<p>\s*\{\{CAPTION\}\}\s*<\/p>/i;
  if (postDescCaptionRx.test(output)) {
    // Master Template: place articleContainer in #postDescription, keep separator caption clean, and use shortSummary in related card
    output = output.replace(postDescCaptionRx, (_m, prefix: string) => `${prefix}${articleContainer}`);
    output = output.replace(/<a\b[^>]*>\s*\{\{CAPTION\}\}\s*<\/a>/gi, () =>
      safeImageUrl ? `<a href="{{IMAGE_URL}}">${escapedTitle}</a>` : ''
    );
    output = output.replace(/\{\{CAPTION\}\}/g, () => shortSummary);
  } else {
    const captionAnchorRegex = /<a\b[^>]*>\s*\{\{CAPTION\}\}\s*<\/a>/i;
    let articleInserted = false;
    if (captionAnchorRegex.test(output)) {
      output = output.replace(captionAnchorRegex, () => {
        articleInserted = true;
        return articleContainer;
      });
    }
    if (!articleInserted && output.includes('{{CAPTION}}')) {
      output = output.replace(/\{\{CAPTION\}\}/, () => {
        articleInserted = true;
        return articleContainer;
      });
    }
    if (output.includes('{{CAPTION}}')) {
      output = output.replace(/\{\{CAPTION\}\}/g, () => shortSummary);
    } else if (!articleInserted && !output.includes('class="imported-article-content"')) {
      if (/<div\b[^>]*class=["'][^"']*video-container[^"']*["'][^>]*>/i.test(output)) {
        output = output.replace(
          /<div\b[^>]*class=["'][^"']*video-container[^"']*["'][^>]*>/i,
          (match) => `${articleContainer}\n${match}`
        );
      } else if (/<body\b[^>]*>/i.test(output)) {
        output = output.replace(/<body\b[^>]*>/i, (match) => `${match}\n${articleContainer}`);
      } else {
        output = `${articleContainer}\n${output}`;
      }
    }
  }

  // 3. Handle hero {{IMAGE_URL}} / {{THUMBNAIL_URL}} and #videoThumbnail cleanly
  if (!safeImageUrl) {
    output = output.replace(
      /<a\b[^>]*href=["']\{\{(?:IMAGE_URL|THUMBNAIL_URL)\}\}["'][^>]*>\s*<img\b[^>]*src=["']\{\{(?:IMAGE_URL|THUMBNAIL_URL)\}\}["'][^>]*>\s*<\/a>/gi,
      ''
    );
    output = output.replace(
      /<img\b([^>]*id=["']videoThumbnail["'][^>]*)>/gi,
      (_m, attrs: string) => {
        const withoutSrc = attrs.replace(/\s*src=["']\{\{(?:THUMBNAIL_URL|IMAGE_URL)\}\}["']/i, '');
        return `<img${withoutSrc} style="display: none;">`;
      }
    );
    output = output.replace(
      /<video\b([^>]*poster=["']\{\{(?:IMAGE_URL|THUMBNAIL_URL)\}\}["'][^>]*)>/gi,
      (_m, attrs: string) => {
        return `<video${attrs.replace(/\s*poster=["']\{\{(?:IMAGE_URL|THUMBNAIL_URL)\}\}["']/i, '')}>`;
      }
    );
    output = output.replace(/<img\b[^>]*src=["']\{\{(?:IMAGE_URL|THUMBNAIL_URL)\}\}["'][^>]*>/gi, '');
  } else {
    output = output.replace(
      /<img\b([^>]*src=["']\{\{(?:IMAGE_URL|THUMBNAIL_URL)\}\}["'][^>]*)>/gi,
      (_m, attrs: string) => {
        let updatedAttrs = attrs;
        if (data.firstImageAlt && /\balt=["']\s*["']/i.test(updatedAttrs)) {
          updatedAttrs = updatedAttrs.replace(/\balt=["']\s*["']/i, () => `alt="${escapeHtml(data.firstImageAlt!)}"`);
        }
        if (data.firstImageSrcset && !/\bsrcset=/i.test(updatedAttrs)) {
          updatedAttrs = `${updatedAttrs} srcset="${escapeHtml(data.firstImageSrcset)}"`;
        }
        return `<img${updatedAttrs}>`;
      }
    );
  }

  // 4. Substitute all remaining Master Template placeholders safely (exact same image for {{IMAGE_URL}} & {{THUMBNAIL_URL}})
  const renderedWithVars = output
    .replace(/\{\{TITLE\}\}/g, () => escapedTitle)
    .replace(/\{\{IMAGE_URL\}\}/g, () => safeImageUrl)
    .replace(/\{\{THUMBNAIL_URL\}\}/g, () => safeImageUrl)
    .replace(/\{\{PUBLISHED_DATE\}\}/g, () => formattedDate);

  const rendered = applyMetaDescriptionToTemplate(renderedWithVars, data.metaDescription);

  // 5. Apply ONLY configured & enabled Ads Settings and deduplicate
  const secured = ensureMasterAdConfiguration(rendered, authoritativeMaster, adsSettings);

  return ensureMainImageFirstInPostHtml(secured, safeImageUrl, data.firstImageAlt || data.title);
}

export const renderTemplate = renderBloggerPostTemplate;
