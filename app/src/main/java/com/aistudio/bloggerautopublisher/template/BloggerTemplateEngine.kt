package com.aistudio.bloggerautopublisher.template

import com.aistudio.bloggerautopublisher.model.AdsSettings
import com.aistudio.bloggerautopublisher.util.HtmlEntityCodec
import com.aistudio.bloggerautopublisher.util.ImportedHtmlSanitizer
import com.aistudio.bloggerautopublisher.util.MainImageSelector
import com.aistudio.bloggerautopublisher.util.ThumbnailCandidate
import java.net.URI
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object BloggerTemplateEngine {

    val DEFAULT_MASTER_TEMPLATE: String = """
<!DOCTYPE html>
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
      transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.28s ease, opacity 0.25s ease, background 0.3s ease;
    }

    .play-icon.is-locked {
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.94), rgba(79, 70, 229, 0.92));
      border-color: rgba(255, 255, 255, 0.88);
      box-shadow:
        0 0 22px rgba(99, 102, 241, 0.62),
        0 0 40px rgba(245, 158, 11, 0.25),
        0 10px 26px rgba(0, 0, 0, 0.48);
    }

    .play-icon.is-locked > svg {
      opacity: 0.78;
    }

    .play-lock-badge {
      position: absolute;
      top: -5px;
      right: -5px;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: linear-gradient(135deg, #f59e0b, #ea580c);
      border: 2px solid #ffffff;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(234, 88, 12, 0.5);
      pointer-events: none;
      transition: transform 0.25s ease, opacity 0.25s ease;
    }

    .play-lock-badge svg {
      width: 14px;
      height: 14px;
      margin: 0;
      fill: none;
      stroke: currentColor;
      filter: none;
    }

    .play-icon.is-unlocked .play-lock-badge {
      opacity: 0;
      transform: scale(0.4);
      pointer-events: none;
    }

    .play-icon.is-just-unlocked {
      animation: lockUnlockPop 0.65s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    @keyframes lockUnlockPop {
      0% { transform: scale(0.92); }
      45% { transform: scale(1.16); box-shadow: 0 0 38px rgba(16, 185, 129, 0.85), 0 12px 28px rgba(0, 0, 0, 0.42); }
      100% { transform: scale(1); }
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

    .play-icon > svg {
      width: 30px;
      height: 30px;
      margin-left: 4px;
      fill: currentColor;
      filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.25));
      transition: opacity 0.25s ease;
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
      max-width: min(92%, 360px);
      padding: 6px 14px;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.76);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.22);
      color: #ffffff;
      font-size: 13px;
      font-weight: 600;
      text-align: center;
      line-height: 1.4;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.28);
      animation: bnFadeSlideUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.12s both;
      transition: opacity 0.2s ease, background-color 0.25s ease;
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

    /* Ad-Gated Video Unlock Panel */
    .ad-gate-panel {
      width: 100%;
      margin: 4px auto 18px;
      padding: 18px 18px 16px;
      border-radius: 14px;
      border: 1px solid #dbe4ff;
      background: linear-gradient(180deg, #ffffff 0%, #f8faff 100%);
      box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
      transition: border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease, transform 0.25s ease;
    }

    .ad-gate-panel.is-prompt-highlight {
      border-color: #6e8efb;
      box-shadow: 0 0 0 4px rgba(110, 142, 251, 0.18), 0 14px 32px rgba(110, 142, 251, 0.14);
      transform: translateY(-1px);
    }

    .ad-gate-panel.is-unlocked {
      border-color: #bbf7d0;
      background: linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%);
      box-shadow: 0 8px 22px rgba(16, 185, 129, 0.08);
    }

    .ad-gate-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 10px;
    }

    .ad-gate-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 999px;
      font-size: 12.5px;
      font-weight: 700;
      background: #fff7ed;
      color: #c2410c;
      border: 1px solid #fed7aa;
    }

    .ad-gate-panel.is-verifying .ad-gate-badge {
      background: #eef2ff;
      color: #4338ca;
      border-color: #c7d2fe;
    }

    .ad-gate-panel.is-unlocked .ad-gate-badge {
      background: #dcfce7;
      color: #15803d;
      border-color: #86efac;
    }

    .ad-gate-counter {
      font-size: 13px;
      font-weight: 700;
      color: #334155;
      background: #f1f5f9;
      padding: 5px 11px;
      border-radius: 999px;
      border: 1px solid #e2e8f0;
    }

    .ad-gate-panel.is-unlocked .ad-gate-counter {
      background: #ecfdf5;
      color: #047857;
      border-color: #a7f3d0;
    }

    .ad-gate-title {
      margin: 0 0 4px;
      font-size: 16.5px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.4;
    }

    .ad-gate-subtitle {
      margin: 0 0 12px;
      font-size: 13.5px;
      color: #475569;
      line-height: 1.55;
    }

    .ad-gate-progress-track {
      width: 100%;
      height: 10px;
      border-radius: 999px;
      background-color: #e2e8f0;
      overflow: hidden;
      margin-bottom: 12px;
    }

    .ad-gate-progress-fill {
      width: 0%;
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, #6e8efb 0%, #a777e3 60%, #10b981 100%);
      transition: width 0.45s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .ad-gate-steps {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 12px;
    }

    .ad-gate-step {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      background-color: #ffffff;
      transition: border-color 0.25s ease, background-color 0.25s ease, box-shadow 0.25s ease;
    }

    .ad-gate-step.is-active {
      border-color: #6e8efb;
      background-color: #f5f7ff;
      box-shadow: 0 4px 12px rgba(110, 142, 251, 0.12);
    }

    .ad-gate-step.is-done {
      border-color: #86efac;
      background-color: #f0fdf4;
    }

    .ad-gate-step-num {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 700;
      background-color: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
      transition: all 0.25s ease;
    }

    .ad-gate-step.is-active .ad-gate-step-num {
      background: linear-gradient(135deg, #6e8efb, #a777e3);
      color: #ffffff;
      border-color: transparent;
    }

    .ad-gate-step.is-done .ad-gate-step-num {
      background-color: #10b981;
      color: #ffffff;
      border-color: transparent;
    }

    .ad-gate-step-meta {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .ad-gate-step-label {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.3;
    }

    .ad-gate-step-state {
      font-size: 12px;
      color: #64748b;
      line-height: 1.3;
    }

    .ad-gate-step.is-active .ad-gate-step-state {
      color: #4338ca;
      font-weight: 600;
    }

    .ad-gate-step.is-done .ad-gate-step-state {
      color: #15803d;
      font-weight: 600;
    }

    .ad-gate-timer-box {
      display: none;
      align-items: center;
      gap: 14px;
      padding: 12px 14px;
      margin-bottom: 12px;
      border-radius: 12px;
      background: linear-gradient(135deg, #eef2ff, #f5f3ff);
      border: 1px solid #c7d2fe;
      animation: bnFadeSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .ad-gate-timer-box.is-visible {
      display: flex;
    }

    .ad-gate-ring-wrap {
      position: relative;
      width: 50px;
      height: 50px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .ad-gate-ring-svg {
      width: 50px;
      height: 50px;
      transform: rotate(-90deg);
    }

    .ad-gate-ring-bg {
      fill: none;
      stroke: #dbe4ff;
      stroke-width: 4.5;
    }

    .ad-gate-ring-progress {
      fill: none;
      stroke: #6e8efb;
      stroke-width: 4.5;
      stroke-linecap: round;
      stroke-dasharray: 125.66;
      stroke-dashoffset: 0;
      transition: stroke-dashoffset 0.25s linear;
    }

    .ad-gate-timer-number {
      position: absolute;
      font-size: 15px;
      font-weight: 700;
      color: #312e81;
      font-variant-numeric: tabular-nums;
    }

    .ad-gate-timer-copy {
      min-width: 0;
    }

    .ad-gate-timer-title {
      font-size: 14px;
      font-weight: 700;
      color: #1e1b4b;
      line-height: 1.35;
      margin-bottom: 2px;
    }

    .ad-gate-timer-sub {
      font-size: 12.5px;
      color: #4338ca;
      line-height: 1.4;
    }

    .ad-gate-notice {
      display: none;
      padding: 10px 12px;
      margin-bottom: 12px;
      border-radius: 10px;
      font-size: 13px;
      line-height: 1.5;
      font-weight: 500;
    }

    .ad-gate-notice.is-visible {
      display: block;
    }

    .ad-gate-notice.is-warning {
      background-color: #fff7ed;
      border: 1px solid #fdba74;
      color: #9a3412;
    }

    .ad-gate-notice.is-info {
      background-color: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
    }

    .ad-gate-notice.is-success {
      background-color: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #065f46;
    }

    .ad-gate-actions {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .ad-gate-panel .ad-gate-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 22px;
      border-radius: 50px;
      border: none;
      background: linear-gradient(135deg, #6e8efb, #a777e3);
      color: #ffffff;
      font-family: inherit;
      font-size: 14.5px;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
      box-shadow: 0 6px 16px rgba(110, 142, 251, 0.28);
      transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
    }

    .ad-gate-panel .ad-gate-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(110, 142, 251, 0.38);
    }

    .ad-gate-panel .ad-gate-btn:disabled {
      opacity: 0.7;
      cursor: wait;
      transform: none;
    }

    .ad-gate-panel .ad-gate-btn--unlock-play {
      background: linear-gradient(135deg, #10b981, #059669);
      box-shadow: 0 6px 16px rgba(16, 185, 129, 0.28);
    }

    .ad-gate-panel .ad-gate-btn--direct {
      background: linear-gradient(135deg, #f59e0b, #ea580c);
      box-shadow: 0 6px 16px rgba(234, 88, 12, 0.28);
    }

    .ad-gate-panel .ad-gate-btn--safe {
      background: #ffffff;
      color: #334155;
      border: 1px solid #cbd5e1;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
    }

    .ad-gate-panel .ad-gate-btn--safe:hover {
      background: #f8fafc;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.1);
    }

    .ad-slot-wrapper.is-gate-highlighted {
      border-color: #6e8efb;
      box-shadow: 0 0 0 4px rgba(110, 142, 251, 0.22);
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

      .play-icon > svg {
        width: 24px;
        height: 24px;
      }

      .play-lock-badge {
        width: 23px;
        height: 23px;
        top: -4px;
        right: -4px;
      }

      .play-lock-badge svg {
        width: 12px;
        height: 12px;
      }

      .bn-play-hint {
        top: calc(50% + 42px);
        font-size: 12px;
        padding: 5px 12px;
      }

      .ad-gate-panel {
        padding: 14px;
      }

      .ad-gate-steps {
        grid-template-columns: 1fr;
        gap: 8px;
      }

      .ad-gate-panel .ad-gate-btn {
        width: 100%;
        padding: 11px 16px;
        font-size: 14px;
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
      .play-icon.is-just-unlocked,
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
  <div class="video-container is-locked" id="videoContainer">
    <div class="live-viewer-badge" aria-live="off">
      <span class="live-viewer-dot" aria-hidden="true"></span>
      <span class="live-viewer-count" id="liveViewerCount">2,840</span>
      <span>জন দেখছেন</span>
    </div>

    <img alt="{{TITLE}}" decoding="async" id="videoThumbnail" loading="eager" src="{{IMAGE_URL}}" />
    <div class="video-scrim" aria-hidden="true"></div>

    <video id="videoPlayer" playsinline controls preload="none" poster="{{IMAGE_URL}}"></video>

    <div class="play-center-group" id="playCenterGroup">
      <div class="play-icon is-locked" id="playIcon" role="button" tabindex="0" aria-label="ভিডিও আনলক করতে ২টি বিজ্ঞাপন দেখুন">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 5.14v14l11-7-11-7z"></path>
        </svg>
        <span class="play-lock-badge" id="playLockBadge" aria-hidden="true">
          <svg viewBox="0 0 24 24" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </span>
      </div>
      <div class="bn-play-hint" id="bnPlayHint">ভিডিও আনলক করতে ২টি বিজ্ঞাপন ধাপ সম্পন্ন করুন (০/২)</div>
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

  <!-- AD-GATED VIDEO UNLOCK SYSTEM PANEL -->
  <section class="ad-gate-panel" id="adGatePanel" aria-live="polite" aria-label="ভিডিও আনলক নির্দেশনা">
    <div class="ad-gate-header">
      <span class="ad-gate-badge" id="adGateStatusPill">🔒 ভিডিও লক করা আছে</span>
      <span class="ad-gate-counter" id="adGateStepCounter">০/২টি বিজ্ঞাপন সম্পন্ন</span>
    </div>

    <h3 class="ad-gate-title" id="adGateTitle">ভিডিওটি দেখতে ২টি বিজ্ঞাপন ধাপ সম্পন্ন করুন</h3>
    <p class="ad-gate-subtitle" id="adGateSubtitle">প্রতিটি বিজ্ঞাপন দেখার পর কয়েক সেকেন্ড অপেক্ষা করলেই প্লে বাটনটি স্বয়ংক্রিয়ভাবে আনলক হয়ে যাবে।</p>

    <div class="ad-gate-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="2" aria-valuenow="0" id="adGateProgressBar">
      <div class="ad-gate-progress-fill" id="adGateProgressFill"></div>
    </div>

    <div class="ad-gate-steps">
      <div class="ad-gate-step" id="adGateStep1">
        <span class="ad-gate-step-num" id="adGateStep1Icon">১</span>
        <div class="ad-gate-step-meta">
          <div class="ad-gate-step-label">বিজ্ঞাপন ধাপ ১</div>
          <div class="ad-gate-step-state" id="adGateStep1State">অপেক্ষমান (শুরু করতে চাপ দিন)</div>
        </div>
      </div>
      <div class="ad-gate-step" id="adGateStep2">
        <span class="ad-gate-step-num" id="adGateStep2Icon">২</span>
        <div class="ad-gate-step-meta">
          <div class="ad-gate-step-label">বিজ্ঞাপন ধাপ ২</div>
          <div class="ad-gate-step-state" id="adGateStep2State">ধাপ ১-এর পর আনলক হবে</div>
        </div>
      </div>
    </div>

    <div class="ad-gate-timer-box" id="adGateTimerBox">
      <div class="ad-gate-ring-wrap" aria-hidden="true">
        <svg class="ad-gate-ring-svg" viewBox="0 0 48 48">
          <circle class="ad-gate-ring-bg" cx="24" cy="24" r="20"></circle>
          <circle class="ad-gate-ring-progress" id="adGateTimerRing" cx="24" cy="24" r="20"></circle>
        </svg>
        <span class="ad-gate-timer-number" id="adGateTimerNumber">৬</span>
      </div>
      <div class="ad-gate-timer-copy">
        <div class="ad-gate-timer-title" id="adGateTimerTitle">বিজ্ঞাপন যাচাই চলছে...</div>
        <div class="ad-gate-timer-sub" id="adGateTimerSub">অনুগ্রহ করে বিজ্ঞাপনটি দেখুন এবং কাউন্টডাউন শেষ হওয়া পর্যন্ত অপেক্ষা করুন।</div>
      </div>
    </div>

    <div class="ad-gate-notice" id="adGateNotice"></div>

    <div class="ad-gate-actions">
      <button type="button" class="ad-gate-btn" id="adGateActionBtn">১ম বিজ্ঞাপন দেখুন (১/২)</button>
      <a class="ad-gate-btn ad-gate-btn--direct" id="adGateFallbackLink" href="#" target="_blank" rel="noopener noreferrer sponsored" style="display: none;">সরাসরি বিজ্ঞাপন খুলুন</a>
      <button type="button" class="ad-gate-btn ad-gate-btn--safe" id="adGateSafeContinueBtn" style="display: none;">বিকল্প নিরাপদ যাচাই করুন</button>
    </div>
  </section>

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

    function decodeNonAsciiEntities(input) {
      if (typeof input !== 'string' || input.indexOf('#') === -1) return input || '';
      return input.replace(/&(?:amp;){0,3}(?:#(\d{1,7})|#x([0-9a-fA-F]{1,6}));/gi, function (m, dec, hex) {
        const cp = dec ? parseInt(dec, 10) : parseInt(hex, 16);
        if (!Number.isFinite(cp) || cp < 0x0100 || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff) || cp === 0x2028 || cp === 0x2029) {
          return m;
        }
        return String.fromCodePoint(cp);
      });
    }

    function setSafeText(el, text) {
      if (!el) return;
      el.textContent = decodeNonAsciiEntities(text);
    }

    function setSafeAttr(el, attrName, value) {
      if (!el) return;
      el.setAttribute(attrName, decodeNonAsciiEntities(value));
    }

    function repairBengaliEntitiesInUi() {
      if (document.title && document.title.indexOf('#') !== -1) {
        document.title = decodeNonAsciiEntities(document.title);
      }
      if (!document.body || !document.createTreeWalker || typeof NodeFilter === 'undefined') return;
      try {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
        let node = walker.nextNode();
        while (node) {
          const parentTag = node.parentNode && node.parentNode.nodeName ? node.parentNode.nodeName.toUpperCase() : '';
          if (parentTag !== 'SCRIPT' && parentTag !== 'STYLE' && parentTag !== 'CODE' && parentTag !== 'PRE') {
            const val = node.nodeValue || '';
            if (val.indexOf('#') !== -1) {
              const decoded = decodeNonAsciiEntities(val);
              if (decoded !== val) {
                node.nodeValue = decoded;
              }
            }
          }
          node = walker.nextNode();
        }
        document.querySelectorAll('[aria-label]').forEach(function (el) {
          const lbl = el.getAttribute('aria-label') || '';
          if (lbl.indexOf('#') !== -1) {
            setSafeAttr(el, 'aria-label', lbl);
          }
        });
      } catch (_) {}
    }

    function showLoadingState(messageText) {
      if (loadingMessage && messageText) {
        setSafeText(loadingMessage, messageText);
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
          setSafeText(errorTitle, 'দুঃখিত, বারবার চেষ্টা করেও ভিডিওটি চালু করা যায়নি');
        }
        if (errorSubtitle) {
          setSafeText(
            errorSubtitle,
            'অনুগ্রহ করে আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন অথবা কিছুক্ষণ পর পুনরায় চেষ্টা করুন।'
          );
        }
        if (retryPlayBtn) {
          setSafeText(retryPlayBtn, 'পুনরায় চেষ্টা করুন');
        }
      } else {
        if (errorTitle) {
          setSafeText(errorTitle, 'ভিডিওটি লোড হতে ব্যর্থ হয়েছে');
        }
        if (errorSubtitle) {
          setSafeText(errorSubtitle, 'সংযোগে সাময়িক ত্রুটি দেখা দিয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
        }
        if (retryPlayBtn) {
          setSafeText(retryPlayBtn, 'আবার চেষ্টা করুন');
        }
      }

      if (playbackErrorScreen) {
        playbackErrorScreen.style.display = 'flex';
      }
    }

    function isUnresolvedPlaceholder(val) {
      return typeof val === 'string' && /^\{\{[A-Z0-9_]+\}\}$/.test(val.trim());
    }

    function isUnwantedInlineAsset(url) {
      if (typeof url !== 'string') return true;
      const clean = url.split('#')[0].split('?')[0].trim().toLowerCase();
      if (!clean) return true;
      if (/\.(svg|bmp|ico)(\?|#|$)/i.test(url)) return true;
      if (/(doubleclick\.net|googlesyndication\.com|googleadservices\.com|adsterra\.com|effectivecpmnetwork\.com|highperformanceformat\.com|flaticon\.com|icons8\.com|iconfinder\.com)/i.test(url)) {
        return true;
      }
      if (/(^|[\/_\-.])(ad[-_]?banner|adsense|ad[-_]?slot|promo[-_]?banner|play[-_]?(btn|button|icon|overlay)|119514|favicon|site[-_]?logo|spacer|blank|pixel|1x1|728x90|300x250|468x60|160x600|320x50)([\/_\-.]|$)/i.test(clean)) {
        return true;
      }
      if (/\/(?:logo|favicon|play|play-button|play-icon|arrow|share|spinner|loader|spacer|blank|pixel|ad|ads)\.(?:png|gif|svg|ico|webp)$/i.test(clean)) {
        return true;
      }
      return false;
    }

    function isSupportedImageAsset(url) {
      if (typeof url !== 'string') return false;
      const trimmed = url.trim();
      if (!trimmed || isUnresolvedPlaceholder(trimmed)) return false;
      if (/^(?:file|content|javascript|vbscript):/i.test(trimmed)) return false;
      if (/^data:image\/gif;base64,R0lGOD/i.test(trimmed)) return false;
      if (/^data:image\/(jpe?g|png|webp|avif)/i.test(trimmed)) return true;
      if (/^data:image\//i.test(trimmed)) return false;
      if (isUnwantedInlineAsset(trimmed)) return false;
      if (/\.(jpe?g|png|webp|avif)(\?|#|$)/i.test(trimmed)) return true;
      if (/[?&](?:format|fm|ext)=(?:jpe?g|png|webp|avif)(?:&|$)/i.test(trimmed)) return true;
      if (/\.gif(\?|#|$)/i.test(trimmed)) return false;
      return /^(?:https?:)?\/\/|^(?:blob:|\/|\.\/|\.\.\/)/i.test(trimmed);
    }

    function isJpgOnlyAsset(url) {
      return isSupportedImageAsset(url);
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
      let resolvedThumbUrl = isSupportedImageAsset(CUSTOM_THUMBNAIL_URL) ? CUSTOM_THUMBNAIL_URL.trim() : '';
      let separatorFallbackUrl = '';

      // Preserve genuine JPG, JPEG, PNG, and WebP images while excluding ad/icon assets inside Blogger post separators
      document.querySelectorAll('.separator img').forEach(function (img) {
        const src = getImageCandidateSrc(img);
        if (!src || isUnresolvedPlaceholder(src)) return;
        if (isSupportedImageAsset(src)) {
          if (img.getAttribute('src') !== src) {
            img.setAttribute('src', src);
          }
          if (!resolvedThumbUrl) {
            resolvedThumbUrl = src;
          } else if (!separatorFallbackUrl && src !== resolvedThumbUrl) {
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
        if (!resolvedThumbUrl && isSupportedImageAsset(directThumbSrc)) {
          resolvedThumbUrl = directThumbSrc;
        }

        if (separatorFallbackUrl && separatorFallbackUrl !== resolvedThumbUrl) {
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

        if (resolvedThumbUrl) {
          if (videoThumbnail.getAttribute('loading') === 'lazy') {
            videoThumbnail.setAttribute('loading', 'eager');
          }
          if (videoThumbnail.getAttribute('src') !== resolvedThumbUrl) {
            videoThumbnail.src = resolvedThumbUrl;
          }
          if (videoPlayer) videoPlayer.setAttribute('poster', resolvedThumbUrl);
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
      repairBengaliEntitiesInUi();
      enforceJpgOnlyImages();
      initSmoothScrollIndicator();
      initAdGateSystem();

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

    // =========================================================================
    // 2B. AD-GATED VIDEO UNLOCK SYSTEM (2-STEP GENUINE AD VERIFICATION)
    // =========================================================================
    const AD_GATE_CONFIG = {
      requiredSteps: 2,
      countdownSeconds: 6,
      safeRecoverySeconds: 3,
      minDwellMs: 2500,
      maxFailuresBeforeSafeRecovery: 2,
      ringCircumference: 125.66,
      sessionKeyPrefix: 'bap_video_gate_v1_'
    };

    const bnPlayHint = document.getElementById('bnPlayHint');
    const adGatePanel = document.getElementById('adGatePanel');
    const adGateStatusPill = document.getElementById('adGateStatusPill');
    const adGateStepCounter = document.getElementById('adGateStepCounter');
    const adGateTitle = document.getElementById('adGateTitle');
    const adGateSubtitle = document.getElementById('adGateSubtitle');
    const adGateProgressBar = document.getElementById('adGateProgressBar');
    const adGateProgressFill = document.getElementById('adGateProgressFill');
    const adGateStep1 = document.getElementById('adGateStep1');
    const adGateStep1Icon = document.getElementById('adGateStep1Icon');
    const adGateStep1State = document.getElementById('adGateStep1State');
    const adGateStep2 = document.getElementById('adGateStep2');
    const adGateStep2Icon = document.getElementById('adGateStep2Icon');
    const adGateStep2State = document.getElementById('adGateStep2State');
    const adGateTimerBox = document.getElementById('adGateTimerBox');
    const adGateTimerRing = document.getElementById('adGateTimerRing');
    const adGateTimerNumber = document.getElementById('adGateTimerNumber');
    const adGateTimerTitle = document.getElementById('adGateTimerTitle');
    const adGateTimerSub = document.getElementById('adGateTimerSub');
    const adGateNotice = document.getElementById('adGateNotice');
    const adGateActionBtn = document.getElementById('adGateActionBtn');
    const adGateFallbackLink = document.getElementById('adGateFallbackLink');
    const adGateSafeContinueBtn = document.getElementById('adGateSafeContinueBtn');

    const adGateState = {
      unlocked: false,
      completedSources: [],
      stepFailures: [0, 0],
      activeVerification: null,
      fallbackTarget: null,
      recoveryUnlockedForStep: -1,
      justUnlocked: false
    };

    function toBengaliDigits(value) {
      const digits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
      return String(value).replace(/\d/g, function (d) {
        return digits[Number(d)] || d;
      });
    }

    function getGateStorageKey() {
      const pathPart = (window.location && window.location.pathname) ? window.location.pathname : 'preview';
      const thumbPart = (CUSTOM_THUMBNAIL_URL && !isUnresolvedPlaceholder(CUSTOM_THUMBNAIL_URL))
        ? CUSTOM_THUMBNAIL_URL.slice(-48)
        : '';
      const titlePart = (document.title || '').slice(0, 48);
      return AD_GATE_CONFIG.sessionKeyPrefix + encodeURIComponent(pathPart + '|' + thumbPart + '|' + titlePart);
    }

    function readSessionUnlockState() {
      try {
        if (!window.sessionStorage) return null;
        const raw = window.sessionStorage.getItem(getGateStorageKey());
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          parsed.unlocked === true &&
          Array.isArray(parsed.completedSources) &&
          parsed.completedSources.length >= AD_GATE_CONFIG.requiredSteps
        ) {
          return parsed;
        }
      } catch (_) {
        // Ignore sandboxed sessionStorage errors cleanly
      }
      return null;
    }

    function writeSessionUnlockState() {
      try {
        if (!window.sessionStorage) return;
        window.sessionStorage.setItem(
          getGateStorageKey(),
          JSON.stringify({
            unlocked: true,
            completedSources: adGateState.completedSources.slice(0, AD_GATE_CONFIG.requiredSteps),
            unlockedAt: Date.now()
          })
        );
      } catch (_) {
        // Ignore storage quota or sandbox restrictions
      }
    }

    function isVideoUnlocked() {
      return (
        adGateState.unlocked === true &&
        adGateState.completedSources.length >= AD_GATE_CONFIG.requiredSteps
      );
    }

    function hasCompletedSourceKey(sourceKey) {
      return adGateState.completedSources.indexOf(sourceKey) !== -1;
    }

    function getConfiguredAdTargets() {
      const targets = [];
      const btns = BUTTON_CLICK_CONFIG && BUTTON_CLICK_CONFIG.buttons ? BUTTON_CLICK_CONFIG.buttons : {};

      if (btns.btn1 && btns.btn1.enabled && isValidDestinationUrl(btns.btn1.url)) {
        targets.push({
          key: 'btn1',
          type: 'external-link',
          label: 'বিজ্ঞাপন ১ (Smart Link)',
          url: btns.btn1.url.trim(),
          openInNewTab: btns.btn1.openInNewTab !== false
        });
      }
      if (btns.btn2 && btns.btn2.enabled && isValidDestinationUrl(btns.btn2.url)) {
        targets.push({
          key: 'btn2',
          type: 'external-link',
          label: 'বিজ্ঞাপন ২ (Direct Link)',
          url: btns.btn2.url.trim(),
          openInNewTab: btns.btn2.openInNewTab !== false
        });
      }
      if (POPUP_AD_CONFIG && POPUP_AD_CONFIG.enabled && isValidDestinationUrl(POPUP_AD_CONFIG.url)) {
        targets.push({
          key: 'popup',
          type: 'external-link',
          label: 'স্পনসরড বিজ্ঞাপন (Pop-up Link)',
          url: POPUP_AD_CONFIG.url.trim(),
          openInNewTab: true
        });
      }
      if (btns.btn3 && btns.btn3.enabled && isValidDestinationUrl(btns.btn3.url)) {
        targets.push({
          key: 'btn3',
          type: 'external-link',
          label: 'স্পনসরড বিজ্ঞাপন (Play & Watch)',
          url: btns.btn3.url.trim(),
          openInNewTab: btns.btn3.openInNewTab !== false
        });
      }

      const bannerLink = document.querySelector('[data-app-ad="banner"] a[href]');
      if (bannerLink && isValidDestinationUrl(bannerLink.getAttribute('href') || '')) {
        targets.push({
          key: 'banner',
          type: 'external-link',
          label: 'ব্যানার বিজ্ঞাপন',
          url: (bannerLink.getAttribute('href') || '').trim(),
          openInNewTab: true
        });
      }

      return targets;
    }

    function getAvailableOnPageAdSlots() {
      const slots = [];
      document.querySelectorAll('.ad-slot-wrapper[data-ad-slot]').forEach(function (wrapper) {
        if (wrapper.classList.contains('is-fallback')) return;
        const inner = wrapper.querySelector('.ad-slot-inner');
        if (!inner) return;
        const hasVisibleUnit = inner.querySelector('iframe, img, ins, [data-app-ad="banner"]');
        if (hasVisibleUnit) {
          slots.push({
            key: 'slot-' + (wrapper.getAttribute('data-ad-slot') || 'ad'),
            type: 'onpage-ad',
            label: 'পৃষ্ঠার স্পনসরড বিজ্ঞাপন',
            element: wrapper
          });
        }
      });
      return slots;
    }

    function resolveNextAdTarget() {
      const stepIndex = adGateState.completedSources.length;
      const targets = getConfiguredAdTargets();
      const usedKeys = adGateState.completedSources;

      for (let i = 0; i < targets.length; i += 1) {
        if (usedKeys.indexOf(targets[i].key) === -1) {
          return targets[i];
        }
      }

      const onPageSlots = getAvailableOnPageAdSlots();
      for (let j = 0; j < onPageSlots.length; j += 1) {
        if (usedKeys.indexOf(onPageSlots[j].key) === -1) {
          return onPageSlots[j];
        }
      }

      return {
        key: 'safe-recovery-' + (stepIndex + 1),
        type: 'safe-recovery',
        label: 'নিরাপদ বিকল্প যাচাই'
      };
    }

    function setGateNotice(tone, message) {
      if (!adGateNotice) return;
      if (!message) {
        adGateNotice.textContent = '';
        adGateNotice.className = 'ad-gate-notice';
        return;
      }
      setSafeText(adGateNotice, message);
      adGateNotice.className = 'ad-gate-notice is-visible ' + (tone || 'is-info');
    }

    function hideFallbackControls() {
      adGateState.fallbackTarget = null;
      if (adGateFallbackLink) {
        adGateFallbackLink.style.display = 'none';
        adGateFallbackLink.setAttribute('href', '#');
      }
      if (adGateSafeContinueBtn) {
        adGateSafeContinueBtn.style.display = 'none';
      }
    }

    function revealSafeRecoveryOption(stepIndex, reasonMessage) {
      adGateState.recoveryUnlockedForStep = stepIndex;
      if (reasonMessage) {
        setGateNotice('is-warning', reasonMessage);
      }
      if (adGateSafeContinueBtn) {
        setSafeText(
          adGateSafeContinueBtn,
          'নিরাপদভাবে ধাপ ' + toBengaliDigits(stepIndex + 1) + ' সম্পন্ন করুন'
        );
        adGateSafeContinueBtn.style.display = 'inline-flex';
      }
    }

    function showPopupBlockedFallback(target, stepIndex) {
      adGateState.fallbackTarget = { target: target, stepIndex: stepIndex };
      if (adGateFallbackLink && target && isValidDestinationUrl(target.url)) {
        adGateFallbackLink.setAttribute('href', target.url);
        setSafeText(
          adGateFallbackLink,
          'সরাসরি বিজ্ঞাপন খুলুন (ধাপ ' + toBengaliDigits(stepIndex + 1) + ')'
        );
        adGateFallbackLink.style.display = 'inline-flex';
      }
      setGateNotice(
        'is-warning',
        'আপনার ব্রাউজারে পপ-আপ ব্লক করা হয়েছে। উপরের "সরাসরি বিজ্ঞাপন খুলুন" বাটনে চাপ দিয়ে বিজ্ঞাপনটি দেখুন।'
      );
      if (adGateState.stepFailures[stepIndex] >= AD_GATE_CONFIG.maxFailuresBeforeSafeRecovery) {
        revealSafeRecoveryOption(
          stepIndex,
          'পপ-আপ বা বিজ্ঞাপন নেটওয়ার্ক বারবার ব্লক হচ্ছে। কোনো ঝামেলা ছাড়াই এগোতে "নিরাপদভাবে ধাপ সম্পন্ন করুন" বাটন ব্যবহার করুন।'
        );
      }
    }

    function updateGateUi() {
      const doneCount = Math.min(AD_GATE_CONFIG.requiredSteps, adGateState.completedSources.length);
      const unlocked = isVideoUnlocked();
      const verifying = Boolean(adGateState.activeVerification);

      if (videoContainer) {
        videoContainer.classList.toggle('is-locked', !unlocked);
        videoContainer.classList.toggle('is-unlocked', unlocked);
      }
      if (playIcon) {
        playIcon.classList.toggle('is-locked', !unlocked);
        playIcon.classList.toggle('is-unlocked', unlocked);
        if (adGateState.justUnlocked) {
          playIcon.classList.add('is-just-unlocked');
        } else {
          playIcon.classList.remove('is-just-unlocked');
        }
        setSafeAttr(
          playIcon,
          'aria-label',
          unlocked ? 'ভিডিও চালু করুন' : 'ভিডিও আনলক করতে ২টি বিজ্ঞাপন দেখুন'
        );
      }
      if (bnPlayHint) {
        if (unlocked) {
          setSafeText(bnPlayHint, 'আনলক সম্পন্ন! ভিডিও চালু করতে উপরের প্লে বাটনে চাপ দিন');
        } else if (doneCount === 1) {
          setSafeText(bnPlayHint, 'বিজ্ঞাপন ১/২ সম্পন্ন — আর ১টি ধাপ বাকি');
        } else {
          setSafeText(bnPlayHint, 'ভিডিও আনলক করতে নিচের ২টি বিজ্ঞাপন ধাপ সম্পন্ন করুন (০/২)');
        }
      }

      if (!adGatePanel) return;
      adGatePanel.classList.toggle('is-unlocked', unlocked);
      adGatePanel.classList.toggle('is-verifying', !unlocked && verifying);

      if (adGateProgressBar) {
        adGateProgressBar.setAttribute('aria-valuenow', String(doneCount));
      }
      if (adGateProgressFill) {
        const pct = unlocked ? 100 : (doneCount / AD_GATE_CONFIG.requiredSteps) * 100;
        adGateProgressFill.style.width = pct + '%';
      }

      if (adGateStatusPill) {
        if (unlocked) {
          setSafeText(adGateStatusPill, '🔓 আনলক সম্পন্ন');
        } else if (verifying) {
          setSafeText(adGateStatusPill, '⏳ বিজ্ঞাপন যাচাই চলছে');
        } else {
          setSafeText(adGateStatusPill, '🔒 ভিডিও লক করা আছে');
        }
      }

      if (adGateStepCounter) {
        setSafeText(
          adGateStepCounter,
          toBengaliDigits(doneCount) + '/' + toBengaliDigits(AD_GATE_CONFIG.requiredSteps) + 'টি বিজ্ঞাপন সম্পন্ন'
        );
      }

      if (adGateTitle) {
        if (unlocked) {
          setSafeText(adGateTitle, 'অভিনন্দন! ভিডিওটি এখন আনলক হয়েছে');
        } else if (doneCount === 1) {
          setSafeText(adGateTitle, 'বিজ্ঞাপন ১/২ সম্পন্ন — আনলক করতে আর ১টি ধাপ বাকি');
        } else {
          setSafeText(adGateTitle, 'ভিডিওটি দেখতে ২টি বিজ্ঞাপন ধাপ সম্পন্ন করুন');
        }
      }

      if (adGateSubtitle) {
        if (unlocked) {
          setSafeText(
            adGateSubtitle,
            '২/২টি বিজ্ঞাপন সঠিকভাবে সম্পন্ন হয়েছে। এখন প্লে বাটনে চাপ দিয়ে সম্পূর্ণ ভিডিও উপভোগ করুন।'
          );
        } else if (verifying && adGateState.activeVerification) {
          const secLeft = adGateState.activeVerification.remainingSec;
          setSafeText(
            adGateSubtitle,
            'বিজ্ঞাপন ধাপ ' +
              toBengaliDigits(doneCount + 1) +
              ' যাচাই হচ্ছে — আনলকের দিকে এগোতে আর ' +
              toBengaliDigits(secLeft) +
              ' সেকেন্ড অপেক্ষা করুন।'
          );
        } else if (doneCount === 1) {
          setSafeText(
            adGateSubtitle,
            '১ম বিজ্ঞাপন সফলভাবে যাচাই হয়েছে। প্লে বাটনটি আনলক করতে নিচের ২য় বিজ্ঞাপনটি দেখুন।'
          );
        } else {
          setSafeText(
            adGateSubtitle,
            'প্রতিটি বিজ্ঞাপন দেখার পর নির্ধারিত কয়েক সেকেন্ড অপেক্ষা করলেই ভিডিওটি স্বয়ংক্রিয়ভাবে আনলক হবে।'
          );
        }
      }

      // Step 1 Card
      if (adGateStep1) {
        const s1Done = doneCount >= 1;
        const s1Active = !s1Done && verifying;
        adGateStep1.classList.toggle('is-done', s1Done);
        adGateStep1.classList.toggle('is-active', s1Active);
        if (adGateStep1Icon) setSafeText(adGateStep1Icon, s1Done ? '✓' : '১');
        if (adGateStep1State) {
          setSafeText(
            adGateStep1State,
            s1Done
              ? 'সম্পন্ন হয়েছে ✓'
              : s1Active
                ? 'যাচাই চলছে...'
                : 'প্রস্তুত (১ম বিজ্ঞাপন দেখুন)'
          );
        }
      }

      // Step 2 Card
      if (adGateStep2) {
        const s2Done = doneCount >= 2;
        const s2Active = doneCount === 1 && verifying;
        adGateStep2.classList.toggle('is-done', s2Done);
        adGateStep2.classList.toggle('is-active', s2Active);
        if (adGateStep2Icon) setSafeText(adGateStep2Icon, s2Done ? '✓' : '২');
        if (adGateStep2State) {
          setSafeText(
            adGateStep2State,
            s2Done
              ? 'সম্পন্ন হয়েছে ✓'
              : s2Active
                ? 'যাচাই চলছে...'
                : doneCount === 1
                  ? 'প্রস্তুত (২য় বিজ্ঞাপন দেখুন)'
                  : 'ধাপ ১-এর পর প্রস্তুত হবে'
          );
        }
      }

      // Countdown Timer Box
      if (adGateTimerBox) {
        adGateTimerBox.classList.toggle('is-visible', Boolean(!unlocked && verifying));
      }

      // Primary Action Button
      if (adGateActionBtn) {
        if (unlocked) {
          setSafeText(adGateActionBtn, 'এখনই ভিডিও চালু করুন ▶');
          adGateActionBtn.classList.add('ad-gate-btn--unlock-play');
          adGateActionBtn.disabled = false;
        } else if (verifying && adGateState.activeVerification) {
          adGateActionBtn.classList.remove('ad-gate-btn--unlock-play');
          setSafeText(
            adGateActionBtn,
            'যাচাই চলছে (' + toBengaliDigits(adGateState.activeVerification.remainingSec) + ' সেকেন্ড বাকি)...'
          );
          adGateActionBtn.disabled = true;
        } else {
          adGateActionBtn.classList.remove('ad-gate-btn--unlock-play');
          adGateActionBtn.disabled = false;
          if (doneCount === 1) {
            setSafeText(adGateActionBtn, '২য় বিজ্ঞাপন দেখুন (২/২)');
          } else {
            setSafeText(adGateActionBtn, '১ম বিজ্ঞাপন দেখুন (১/২)');
          }
        }
      }

      if (unlocked) {
        hideFallbackControls();
      }
    }

    function stopActiveVerification(clearHighlightOnly) {
      const active = adGateState.activeVerification;
      if (!active) return;
      if (active.intervalId) {
        clearInterval(active.intervalId);
      }
      if (active.onPageElement) {
        active.onPageElement.classList.remove('is-gate-highlighted');
      }
      if (active.cleanupListeners) {
        active.cleanupListeners();
      }
      if (!clearHighlightOnly) {
        adGateState.activeVerification = null;
      }
    }

    function abortActiveVerification(reasonCode, messageBn) {
      const active = adGateState.activeVerification;
      if (!active) return;
      const stepIdx = active.stepIndex;
      stopActiveVerification(false);
      adGateState.stepFailures[stepIdx] = (adGateState.stepFailures[stepIdx] || 0) + 1;
      setGateNotice('is-warning', messageBn);

      if (
        adGateState.stepFailures[stepIdx] >= AD_GATE_CONFIG.maxFailuresBeforeSafeRecovery ||
        reasonCode === 'network-unavailable'
      ) {
        revealSafeRecoveryOption(
          stepIdx,
          messageBn + ' বারবার সমস্যা হলে নিচের নিরাপদ বিকল্প বাটনে চাপ দিয়ে ধাপটি সম্পন্ন করুন।'
        );
      }
      updateGateUi();
    }

    function completeVerificationStep(stepIndex, sourceKey) {
      stopActiveVerification(false);
      hideFallbackControls();

      if (!hasCompletedSourceKey(sourceKey)) {
        adGateState.completedSources.push(sourceKey);
      }
      adGateState.stepFailures[stepIndex] = 0;
      adGateState.recoveryUnlockedForStep = -1;

      if (adGateState.completedSources.length >= AD_GATE_CONFIG.requiredSteps) {
        unlockVideoPlayer(true);
        return;
      }

      setGateNotice(
        'is-success',
        'বিজ্ঞাপন ১/২ সফলভাবে সম্পন্ন হয়েছে! ভিডিও আনলক করতে এখন ২য় বিজ্ঞাপনটি দেখুন।'
      );
      updateGateUi();
    }

    function unlockVideoPlayer(isFreshUnlock) {
      stopActiveVerification(false);
      hideFallbackControls();
      adGateState.unlocked = true;
      adGateState.justUnlocked = Boolean(isFreshUnlock);
      writeSessionUnlockState();

      if (isFreshUnlock) {
        setGateNotice(
          'is-success',
          'অভিনন্দন! ২টি বিজ্ঞাপন ধাপ সম্পন্ন হওয়ায় ভিডিওটি আনলক হয়েছে — এখন প্লে বাটনে চাপ দিন।'
        );
      } else {
        setGateNotice(
          'is-success',
          'এই সেশনে আপনার ভিডিওটি ইতিমধ্যেই আনলক করা আছে। প্লে বাটনে চাপ দিয়ে দেখুন।'
        );
      }
      updateGateUi();
    }

    function startStepVerificationCountdown(stepIndex, target, adWindowRef, isSafeRecovery) {
      stopActiveVerification(false);
      const durationSec = isSafeRecovery
        ? AD_GATE_CONFIG.safeRecoverySeconds
        : AD_GATE_CONFIG.countdownSeconds;
      const minRequiredMs = isSafeRecovery
        ? Math.max(1800, (durationSec - 0.5) * 1000)
        : Math.max(AD_GATE_CONFIG.minDwellMs, (durationSec - 0.5) * 1000);
      const startedAt = Date.now();

      if (target.type === 'onpage-ad' && target.element) {
        target.element.classList.add('is-gate-highlighted');
        try {
          target.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (_) {}
      }

      const activeObj = {
        stepIndex: stepIndex,
        target: target,
        startedAt: startedAt,
        durationSec: durationSec,
        remainingSec: durationSec,
        adWindowRef: adWindowRef || null,
        onPageElement: target.type === 'onpage-ad' ? target.element : null,
        sawBlurOrHidden: Boolean(document.hidden || (typeof document.hasFocus === 'function' && !document.hasFocus())),
        intervalId: null,
        cleanupListeners: null
      };

      const onVisibilityOrBlur = function () {
        if (document.hidden || (typeof document.hasFocus === 'function' && !document.hasFocus())) {
          activeObj.sawBlurOrHidden = true;
        }
      };
      document.addEventListener('visibilitychange', onVisibilityOrBlur);
      window.addEventListener('blur', onVisibilityOrBlur);
      activeObj.cleanupListeners = function () {
        document.removeEventListener('visibilitychange', onVisibilityOrBlur);
        window.removeEventListener('blur', onVisibilityOrBlur);
      };

      adGateState.activeVerification = activeObj;
      setGateNotice(
        'is-info',
        isSafeRecovery
          ? 'নিরাপদ যাচাই চলছে — অনুগ্রহ করে ' + toBengaliDigits(durationSec) + ' সেকেন্ড অপেক্ষা করুন।'
          : 'বিজ্ঞাপন খোলা হয়েছে — ধাপ ' +
              toBengaliDigits(stepIndex + 1) +
              ' সম্পন্ন হতে ' +
              toBengaliDigits(durationSec) +
              ' সেকেন্ড অপেক্ষা করুন।'
      );

      const renderCountdownTick = function () {
        const now = Date.now();
        const elapsedMs = Math.max(0, now - startedAt);
        const totalMs = durationSec * 1000;
        const remainingMs = Math.max(0, totalMs - elapsedMs);
        const remainingSec = Math.ceil(remainingMs / 1000);
        activeObj.remainingSec = remainingSec;

        // Detect genuine early tab close before minimum dwell time
        if (activeObj.adWindowRef) {
          let wasClosed = false;
          try {
            wasClosed = Boolean(activeObj.adWindowRef.closed);
          } catch (_) {
            wasClosed = false;
          }
          if (wasClosed && elapsedMs < AD_GATE_CONFIG.minDwellMs) {
            abortActiveVerification(
              'early-close',
              'বিজ্ঞাপনটি খুব দ্রুত বন্ধ করা হয়েছে! ধাপটি সম্পূর্ণ করতে কমপক্ষে ' +
                toBengaliDigits(durationSec) +
                ' সেকেন্ড অপেক্ষা করুন।'
            );
            return;
          }
        }

        if (adGateTimerNumber) {
          setSafeText(adGateTimerNumber, toBengaliDigits(remainingSec));
        }
        if (adGateTimerRing) {
          const ratio = Math.min(1, elapsedMs / totalMs);
          const offset = AD_GATE_CONFIG.ringCircumference * ratio;
          adGateTimerRing.style.strokeDashoffset = String(offset.toFixed(2));
        }
        if (adGateTimerTitle) {
          setSafeText(
            adGateTimerTitle,
            'বিজ্ঞাপন ধাপ ' + toBengaliDigits(stepIndex + 1) + ' যাচাই হচ্ছে (' + toBengaliDigits(remainingSec) + ' সেকেন্ড)'
          );
        }
        if (adGateTimerSub) {
          setSafeText(
            adGateTimerSub,
            remainingSec > 0
              ? 'বিজ্ঞাপনটি চালু রাখুন — আর মাত্র ' + toBengaliDigits(remainingSec) + ' সেকেন্ড বাকি'
              : 'যাচাই সম্পন্ন হয়েছে!'
          );
        }

        updateGateUi();

        if (elapsedMs >= totalMs && elapsedMs >= minRequiredMs) {
          completeVerificationStep(stepIndex, target.key);
        }
      };

      renderCountdownTick();
      activeObj.intervalId = setInterval(renderCountdownTick, 250);
    }

    function launchAdStep(stepIndex, target, event) {
      if (isVideoUnlocked()) {
        handleAction();
        return;
      }
      if (!event || event.isTrusted === false) return;
      if (adGateState.activeVerification) return;

      if (hasCompletedSourceKey(target.key)) {
        setGateNotice(
          'is-warning',
          'এই বিজ্ঞাপনটি ইতিমধ্যেই সম্পন্ন হয়েছে। ভিডিও আনলক করতে ২য় আলাদা বিজ্ঞাপনটি দেখুন।'
        );
        return;
      }

      if (target.type === 'external-link' && isValidDestinationUrl(target.url)) {
        let openedWin = null;
        try {
          openedWin = window.open(target.url, '_blank');
          if (openedWin) {
            try {
              openedWin.opener = null;
            } catch (_) {}
          }
        } catch (_) {
          openedWin = null;
        }

        let popupBlocked = !openedWin;
        if (openedWin) {
          try {
            if (openedWin.closed) popupBlocked = true;
          } catch (_) {}
        }

        if (popupBlocked) {
          adGateState.stepFailures[stepIndex] = (adGateState.stepFailures[stepIndex] || 0) + 1;
          showPopupBlockedFallback(target, stepIndex);
          updateGateUi();
          return;
        }

        hideFallbackControls();
        startStepVerificationCountdown(stepIndex, target, openedWin, false);
        return;
      }

      if (target.type === 'onpage-ad') {
        hideFallbackControls();
        startStepVerificationCountdown(stepIndex, target, null, false);
        return;
      }

      // Safe bounded fallback when no external URL or ad network is available
      hideFallbackControls();
      startStepVerificationCountdown(stepIndex, target, null, true);
    }

    function promptLockedGate() {
      if (adGatePanel) {
        try {
          adGatePanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (_) {}
        adGatePanel.classList.add('is-prompt-highlight');
        setTimeout(function () {
          adGatePanel.classList.remove('is-prompt-highlight');
        }, 1200);
      }

      const doneCount = adGateState.completedSources.length;
      if (adGateState.activeVerification) {
        setGateNotice(
          'is-info',
          'বিজ্ঞাপন যাচাই চলছে — কাউন্টডাউন শেষ হওয়া পর্যন্ত একটু অপেক্ষা করুন।'
        );
      } else {
        setGateNotice(
          'is-info',
          doneCount === 1
            ? 'ভিডিওটি আনলক করতে আর মাত্র ১টি বিজ্ঞাপন দেখুন — নিচের বাটনে চাপ দিন।'
            : 'ভিডিও প্লে বাটনটি লক করা আছে। আনলক করতে নিচের বাটনে চাপ দিয়ে ২টি বিজ্ঞাপন দেখুন।'
        );
      }
      if (adGateActionBtn && !adGateActionBtn.disabled) {
        try {
          adGateActionBtn.focus({ preventScroll: true });
        } catch (_) {}
      }
    }

    function handleButtonLinkedAdInteraction(buttonId, destinationUrl, openedWindow, wasBlocked) {
      if (isVideoUnlocked()) return;
      if (adGateState.activeVerification) {
        setGateNotice(
          'is-info',
          'এখন একটি বিজ্ঞাপন যাচাই চলছে — এটি শেষ হওয়ার পর পরবর্তী ধাপ শুরু করুন।'
        );
        promptLockedGate();
        return;
      }
      const stepIndex = adGateState.completedSources.length;
      const target = {
        key: buttonId,
        type: 'external-link',
        label: buttonId === 'btn1' ? 'বিজ্ঞাপন ১ (Smart Link)' : 'বিজ্ঞাপন ২ (Direct Link)',
        url: destinationUrl,
        openInNewTab: true
      };

      if (hasCompletedSourceKey(buttonId)) {
        setGateNotice(
          'is-warning',
          'ধাপ ১ ইতিমধ্যেই সম্পন্ন! ভিডিও আনলক করতে এখন অন্য একটি বিজ্ঞাপন ধাপ সম্পন্ন করুন।'
        );
        promptLockedGate();
        return;
      }

      if (wasBlocked) {
        adGateState.stepFailures[stepIndex] = (adGateState.stepFailures[stepIndex] || 0) + 1;
        showPopupBlockedFallback(target, stepIndex);
        updateGateUi();
        return;
      }

      hideFallbackControls();
      startStepVerificationCountdown(stepIndex, target, openedWindow, false);
    }

    function initAdGateSystem() {
      const savedSession = readSessionUnlockState();
      if (savedSession) {
        adGateState.completedSources = savedSession.completedSources.slice(0, AD_GATE_CONFIG.requiredSteps);
        unlockVideoPlayer(false);
      } else {
        adGateState.unlocked = false;
        adGateState.completedSources = [];
        updateGateUi();
      }

      if (adGateActionBtn) {
        adGateActionBtn.addEventListener('click', function (event) {
          if (!event || event.isTrusted === false) return;
          if (isVideoUnlocked()) {
            handleAction();
            return;
          }
          const stepIndex = adGateState.completedSources.length;
          const nextTarget = resolveNextAdTarget();
          launchAdStep(stepIndex, nextTarget, event);
        });
      }

      if (adGateFallbackLink) {
        adGateFallbackLink.addEventListener('click', function (event) {
          if (!event || event.isTrusted === false) return;
          const fb = adGateState.fallbackTarget;
          if (!fb || !fb.target || !isValidDestinationUrl(fb.target.url)) {
            event.preventDefault();
            return;
          }
          // Native anchor opens URL directly in new tab without window.open popup blocking
          if (adGateFallbackLink) {
            adGateFallbackLink.style.display = 'none';
          }
          startStepVerificationCountdown(fb.stepIndex, fb.target, null, false);
        });
      }

      if (adGateSafeContinueBtn) {
        adGateSafeContinueBtn.addEventListener('click', function (event) {
          if (!event || event.isTrusted === false) return;
          if (adGateState.activeVerification) return;
          if (isVideoUnlocked()) {
            handleAction();
            return;
          }
          const stepIndex = adGateState.completedSources.length;
          const safeTarget = {
            key: 'safe-recovery-' + (stepIndex + 1),
            type: 'safe-recovery',
            label: 'নিরাপদ বিকল্প যাচাই'
          };
          hideFallbackControls();
          startStepVerificationCountdown(stepIndex, safeTarget, null, true);
        });
      }
    }

    // Real video playback handler (gated cleanly until 2 ad steps are unlocked)
    function handleAction() {
      if (!isVideoUnlocked()) {
        promptLockedGate();
        return;
      }
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
          let openedWin = null;
          try {
            openedWin = window.open(destinationUrl, '_blank');
            if (openedWin) {
              try {
                openedWin.opener = null;
              } catch (_) {}
            }
          } catch (_) {
            openedWin = null;
          }

          let wasBlocked = !openedWin;
          if (openedWin) {
            try {
              if (openedWin.closed) wasBlocked = true;
            } catch (_) {}
          }

          if (!isVideoUnlocked()) {
            handleButtonLinkedAdInteraction(buttonId, destinationUrl, openedWin, wasBlocked);
            return;
          }

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
        if (!isVideoUnlocked()) {
          promptLockedGate();
          return;
        }
        triggerConfiguredPopupAd(e);
        handleAction();
      });
      playIcon.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (!isVideoUnlocked()) {
            promptLockedGate();
            return;
          }
          triggerConfiguredPopupAd(e);
          handleAction();
        }
      });
    }

    if (retryPlayBtn) {
      retryPlayBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (!isVideoUnlocked()) {
          promptLockedGate();
          return;
        }
        triggerConfiguredPopupAd(e);
        handleAction();
      });
    }

    if (videoContainer) {
      videoContainer.addEventListener('click', function (e) {
        if (!videoContainer.classList.contains('is-playing')) {
          if (!isVideoUnlocked()) {
            promptLockedGate();
            return;
          }
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
</html>
""".trim();

    private const val IMPORTED_ARTICLE_SCOPED_CSS = """
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
"""

    fun escapeHtml(text: String): String {
        return text
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#39;")
    }

    private fun sanitizeUrl(url: String?): String {
        return (url ?: "")
            .trim()
            .replace("\"", "")
            .replace("'", "")
            .replace("<", "")
            .replace(">", "")
    }

    private fun normalizeComparableUrl(url: String): String {
        return url.trim().replace("&amp;", "&", ignoreCase = true)
    }

    private fun escapeJsString(value: String): String {
        return value
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("'", "\\'")
            .replace("<", "\\u003c")
            .replace(">", "\\u003e")
    }

    private fun isScriptAdUrl(url: String): Boolean {
        return try {
            val path = URI(url).path.orEmpty().lowercase(Locale.US)
            path.endsWith(".js")
        } catch (_: Exception) {
            Regex("\\.js(\\?|#|$)", RegexOption.IGNORE_CASE).containsMatchIn(url)
        }
    }

    fun deduplicateAdScriptsAndContainers(html: String): String {
        if (html.isBlank()) return html

        val seenScriptSrcs = HashSet<String>()
        val seenContainerIds = HashSet<String>()
        var seenPlayerConfig = false
        var seenAppBanner = false

        val scriptWithOptionalAtOptionsRx = Regex(
            "(?:<script\\b(?![^>]*\\bsrc=)[^>]*>\\s*atOptions\\s*=[\\s\\S]*?</script>\\s*)?<script\\b([^>]*\\bsrc\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)')[^>]*)>[\\s\\S]*?</script>",
            RegexOption.IGNORE_CASE
        )

        var output = scriptWithOptionalAtOptionsRx.replace(html) { match ->
            val rawSrc = match.groupValues[2].ifEmpty { match.groupValues[3] }.trim()
            val normSrc = rawSrc.replace("&amp;", "&", ignoreCase = true).lowercase(Locale.US)
            if (normSrc.isEmpty() || seenScriptSrcs.add(normSrc)) {
                match.value
            } else {
                ""
            }
        }

        val containerDivRx = Regex(
            "<div\\b[^>]*\\bid\\s*=\\s*(?:\"(container-[^\"]+)\"|'(container-[^']+)')[^>]*>\\s*</div>",
            RegexOption.IGNORE_CASE
        )
        output = containerDivRx.replace(output) { match ->
            val containerId = match.groupValues[1].ifEmpty { match.groupValues[2] }.trim().lowercase(Locale.US)
            if (containerId.isEmpty() || seenContainerIds.add(containerId)) {
                match.value
            } else {
                ""
            }
        }

        val appBannerRx = Regex(
            "<div\\b[^>]*\\bdata-app-ad\\s*=\\s*[\"']banner[\"'][^>]*>[\\s\\S]*?</div>",
            RegexOption.IGNORE_CASE
        )
        output = appBannerRx.replace(output) { match ->
            if (!seenAppBanner) {
                seenAppBanner = true
                match.value
            } else {
                ""
            }
        }

        val playerConfigRx = Regex(
            "<script\\b(?![^>]*\\bsrc=)[^>]*>[\\s\\S]*?(?:\\bBUTTON_CLICK_CONFIG\\b|\\bMAIN_AD_LINK\\b)[\\s\\S]*?</script>",
            RegexOption.IGNORE_CASE
        )
        output = playerConfigRx.replace(output) { match ->
            if (!seenPlayerConfig) {
                seenPlayerConfig = true
                match.value
            } else {
                ""
            }
        }

        return HtmlEntityCodec.repairNonAsciiHtmlEntities(
            output.replace(Regex("\\n{3,}"), "\n\n").trim()
        )
    }

    fun applyAdsSettings(
        html: String,
        rawAdsSettings: AdsSettings = AdsSettings.DEFAULT
    ): String {
        if (html.isBlank()) return html

        val settings = AdsSettings.sanitize(rawAdsSettings)
        val smartActive = settings.smartLink.enabled && AdsSettings.isValidUrl(settings.smartLink.url)
        val directActive = settings.directLink.enabled && AdsSettings.isValidUrl(settings.directLink.url)
        val popupActive = settings.popupAd.enabled && AdsSettings.isValidUrl(settings.popupAd.url)
        val bannerActive = settings.bannerAd.enabled && AdsSettings.isValidUrl(settings.bannerAd.imageUrl)
        val bannerClickActive = bannerActive && AdsSettings.isValidUrl(settings.bannerAd.clickUrl)

        var output = html
            .replace(Regex("<script\\b[^>]*\\bdata-app-ad=[\"'][^\"']*[\"'][^>]*>[\\s\\S]*?</script>\\s*", RegexOption.IGNORE_CASE), "")
            .replace(Regex("<script\\b[^>]*\\bsrc=[\"']https://pl30161573\\.effectivecpmnetwork\\.com/bc/17/d1/bc17d177bcada949929a7511850a6cf0\\.js[\"'][^>]*>[\\s\\S]*?</script>\\s*", RegexOption.IGNORE_CASE), "")
            .replace(Regex("<div\\b[^>]*\\bdata-app-ad=[\"']banner[\"'][^>]*>[\\s\\S]*?</div>\\s*", RegexOption.IGNORE_CASE), "")

        val smartLiteral = if (smartActive) "\"${escapeJsString(settings.smartLink.url)}\"" else "\"\""
        val directLiteral = if (directActive) "\"${escapeJsString(settings.directLink.url)}\"" else "\"\""

        if (Regex("\\bBUTTON_CLICK_CONFIG\\b").containsMatchIn(output)) {
            output = Regex(
                "(btn1\\s*:\\s*\\{[\\s\\S]*?\\benabled\\s*:\\s*)(?:true|false)([\\s\\S]*?\\burl\\s*:\\s*)(?:\"[^\"]*\"|'[^']*')([\\s\\S]*?\\btriggerPlayback\\s*:\\s*)(?:true|false)"
            ).replaceFirst(output) { m ->
                Regex.escapeReplacement("${m.groupValues[1]}${if (smartActive) "true" else "false"}${m.groupValues[2]}$smartLiteral${m.groupValues[3]}true")
            }

            output = Regex(
                "(btn2\\s*:\\s*\\{[\\s\\S]*?\\benabled\\s*:\\s*)(?:true|false)([\\s\\S]*?\\burl\\s*:\\s*)(?:\"[^\"]*\"|'[^']*')([\\s\\S]*?\\btriggerPlayback\\s*:\\s*)(?:true|false)"
            ).replaceFirst(output) { m ->
                Regex.escapeReplacement("${m.groupValues[1]}${if (directActive) "true" else "false"}${m.groupValues[2]}$directLiteral${m.groupValues[3]}${if (directActive) "false" else "true"}")
            }
        } else {
            if (Regex("\\bMAIN_AD_LINK\\b").containsMatchIn(output)) {
                output = Regex("(\\bconst\\s+MAIN_AD_LINK\\s*=\\s*)(?:\"[^\"]*\"|'[^']*')").replace(output) { m ->
                    Regex.escapeReplacement("${m.groupValues[1]}$smartLiteral")
                }
            }
            if (Regex("\\bconst\\s+LINKS\\s*=").containsMatchIn(output)) {
                val linksLiteral = if (directActive) """["${escapeJsString(settings.directLink.url)}"]""" else "[]"
                output = Regex("\\bconst\\s+LINKS\\s*=\\s*\\[[\\s\\S]*?\\]").replace(output) {
                    Regex.escapeReplacement("const LINKS = $linksLiteral")
                }
            }
        }

        val isPopupJsScript = popupActive && isScriptAdUrl(settings.popupAd.url)
        val isPopupPageUrl = popupActive && !isPopupJsScript

        if (Regex("\\bPOPUP_AD_CONFIG\\b").containsMatchIn(output)) {
            val popupLiteral = if (isPopupPageUrl) "\"${escapeJsString(settings.popupAd.url)}\"" else "\"\""
            output = Regex(
                "(\\bPOPUP_AD_CONFIG\\s*=\\s*\\{[\\s\\S]*?\\benabled\\s*:\\s*)(?:true|false)([\\s\\S]*?\\burl\\s*:\\s*)(?:\"[^\"]*\"|'[^']*')"
            ).replaceFirst(output) { m ->
                Regex.escapeReplacement("${m.groupValues[1]}${if (isPopupPageUrl) "true" else "false"}${m.groupValues[2]}$popupLiteral")
            }
        } else if (isPopupPageUrl) {
            val customPopupScript = """<script data-app-ad="popup-runtime">
(function(){
  if (window.__appPopupBound) return;
  window.__appPopupBound = true;
  var lastPopupAt = 0;
  var popupUrl = "${escapeJsString(settings.popupAd.url)}";
  document.addEventListener('click', function(e) {
    if (!e || e.isTrusted === false) return;
    var target = e.target && e.target.closest ? e.target.closest('#playIcon, #videoContainer, #retryPlayBtn, .play-icon') : null;
    if (!target) return;
    var now = Date.now();
    if (now - lastPopupAt < 15000) return;
    lastPopupAt = now;
    window.open(popupUrl, '_blank', 'noopener,noreferrer');
  });
})();
</script>"""
            output = if (Regex("</body>", RegexOption.IGNORE_CASE).containsMatchIn(output)) {
                Regex("</body>", RegexOption.IGNORE_CASE).replaceFirst(output, Regex.escapeReplacement("  $customPopupScript\n</body>"))
            } else {
                "$output\n$customPopupScript"
            }
        }

        if (isPopupJsScript) {
            val safePopupSrc = escapeHtml(settings.popupAd.url)
            val popupScriptTag = """<script src="$safePopupSrc" data-app-ad="popup-script"></script>"""
            output = if (Regex("<head\\b[^>]*>", RegexOption.IGNORE_CASE).containsMatchIn(output)) {
                Regex("<head\\b[^>]*>", RegexOption.IGNORE_CASE).replaceFirst(output) { m ->
                    Regex.escapeReplacement("${m.value}\n  $popupScriptTag")
                }
            } else {
                "$popupScriptTag\n$output"
            }
        }

        if (bannerActive) {
            val safeImgUrl = escapeHtml(settings.bannerAd.imageUrl)
            val imgHtml = """<img src="$safeImgUrl" alt="Sponsored Banner" loading="lazy" style="max-width:100%;height:auto;display:block;margin:0 auto;border-radius:8px;" />"""
            val bannerInner = if (bannerClickActive) {
                """<div data-app-ad="banner" style="width:100%;text-align:center;"><a href="${escapeHtml(settings.bannerAd.clickUrl)}" target="_blank" rel="noopener noreferrer sponsored" style="display:inline-block;max-width:100%;">$imgHtml</a></div>"""
            } else {
                """<div data-app-ad="banner" style="width:100%;text-align:center;">$imgHtml</div>"""
            }

            val bottomSlotRx = Regex(
                "(<aside\\b[^>]*\\bdata-ad-slot=[\"']bottom-banner[\"'][^>]*>[\\s\\S]*?<div\\b[^>]*\\bid=[\"']ad-bottom-banner[\"'][^>]*>)([\\s\\S]*?)(</div>\\s*</aside>)",
                RegexOption.IGNORE_CASE
            )
            output = if (bottomSlotRx.containsMatchIn(output)) {
                bottomSlotRx.replaceFirst(output) { m ->
                    Regex.escapeReplacement("${m.groupValues[1]}\n      $bannerInner\n    ${m.groupValues[3]}")
                }
            } else {
                val standalone = """<aside class="ad-slot-wrapper ad-slot--banner" data-app-ad="banner" aria-label="Sponsored Banner" style="margin:18px auto;text-align:center;">$bannerInner</aside>"""
                if (Regex("</body>", RegexOption.IGNORE_CASE).containsMatchIn(output)) {
                    Regex("</body>", RegexOption.IGNORE_CASE).replaceFirst(output, Regex.escapeReplacement("  $standalone\n</body>"))
                } else {
                    "$output\n$standalone"
                }
            }
        }

        return output.replace(Regex("\\n{3,}"), "\n\n").trim()
    }

    fun ensureMasterAdConfiguration(
        candidateHtml: String,
        masterTemplate: String = DEFAULT_MASTER_TEMPLATE,
        adsSettings: AdsSettings = AdsSettings.DEFAULT
    ): String {
        val deduplicated = deduplicateAdScriptsAndContainers(candidateHtml)
        return applyAdsSettings(deduplicated, adsSettings)
    }

    fun ensureMainImageFirstInPostHtml(
        html: String,
        mainImageUrl: String,
        altText: String? = null
    ): String {
        var cleanUrl = sanitizeUrl(mainImageUrl)
        if (cleanUrl.isEmpty() || MainImageSelector.isDisallowedNonThumbnailFormat(cleanUrl)) {
            val htmlCandidate = MainImageSelector.selectMainThumbnailImageFromHtml(html)
            if (!htmlCandidate.isNullOrBlank() && !MainImageSelector.isDisallowedNonThumbnailFormat(htmlCandidate)) {
                cleanUrl = sanitizeUrl(htmlCandidate)
            }
        }
        if (cleanUrl.isEmpty() || MainImageSelector.isDisallowedNonThumbnailFormat(cleanUrl)) return html

        val comparableTarget = normalizeComparableUrl(cleanUrl)
        val bodyMatch = Regex("<body\\b[^>]*>", RegexOption.IGNORE_CASE).find(html)
        val bodyStartOffset = if (bodyMatch != null) bodyMatch.range.last + 1 else 0
        val bodyContent = html.substring(bodyStartOffset)

        val firstImgRegex = Regex("<img\\b([^>]*)>", RegexOption.IGNORE_CASE)
        val srcAttrRegex = Regex("\\bsrc\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))", RegexOption.IGNORE_CASE)
        val competingBeforeRegex = Regex("<(?:iframe|video|embed|object|ins|script)\\b", RegexOption.IGNORE_CASE)

        val firstImgMatch = firstImgRegex.find(bodyContent)
        if (firstImgMatch != null) {
            val attrs = firstImgMatch.groupValues.getOrElse(1) { "" }
            val srcMatch = srcAttrRegex.find(attrs)
            val firstImgSrc = srcMatch?.let {
                it.groupValues[1].ifEmpty { it.groupValues[2].ifEmpty { it.groupValues[3] } }
            }.orEmpty()
            val isTargetFirstImg = normalizeComparableUrl(firstImgSrc) == comparableTarget
            val prefixBeforeImg = bodyContent.substring(0, firstImgMatch.range.first)
            val hasCompetingBeforeImg = competingBeforeRegex.containsMatchIn(prefixBeforeImg)

            if (isTargetFirstImg && !hasCompetingBeforeImg) {
                return html
            }
        }

        val normalizedAlt = HtmlEntityCodec.decodePlainTextEntities(
            altText?.trim().orEmpty(),
            preserveNewlines = false
        )
        val safeAlt = escapeHtml(normalizedAlt)
        val heroBlock = """<div class="separator" style="clear: both;"><a href="$cleanUrl" style="display: block; padding: 1em 0px; text-align: center;"><img alt="$safeAlt" border="0" data-original-height="1350" data-original-width="1080" height="320" src="$cleanUrl" /></a></div>"""
        return if (bodyMatch != null) {
            "${html.substring(0, bodyStartOffset)}\n  $heroBlock\n${html.substring(bodyStartOffset)}"
        } else {
            "$heroBlock\n$html"
        }
    }

    fun normalizeMetaDescription(raw: String?): String {
        if (raw.isNullOrBlank()) return ""
        return HtmlEntityCodec.decodePlainTextEntities(raw, preserveNewlines = false)
            .replace(Regex("\\{\\{\\s*(TITLE|IMAGE_URL|THUMBNAIL_URL|CAPTION|PUBLISHED_DATE|META_DESCRIPTION)\\s*\\}\\}", RegexOption.IGNORE_CASE), "")
            .replace(Regex("\\s+"), " ")
            .trim()
    }

    fun applyMetaDescriptionToTemplate(html: String, metaDescription: String?): String {
        val normalized = normalizeMetaDescription(metaDescription)
        val emptyPlaceholderMetaLineRx = Regex(
            "[ \\t]*<meta\\b(?=[^>]*\\bname\\s*=\\s*[\"']description[\"'])(?=[^>]*\\bcontent\\s*=\\s*[\"']\\s*\\{\\{META_DESCRIPTION\\}\\}\\s*[\"'])[^>]*\\/?>[ \\t]*\\r?\\n?",
            RegexOption.IGNORE_CASE
        )

        if (normalized.isEmpty()) {
            return html
                .replace(emptyPlaceholderMetaLineRx, "")
                .replace("{{META_DESCRIPTION}}", "")
        }

        val escapedMeta = escapeHtml(normalized)
        if (html.contains("{{META_DESCRIPTION}}")) {
            return html.replace("{{META_DESCRIPTION}}", escapedMeta)
        }

        val existingMetaDescRx = Regex("<meta\\b([^>]*\\bname\\s*=\\s*[\"']description[\"'][^>]*)>", RegexOption.IGNORE_CASE)
        if (existingMetaDescRx.containsMatchIn(html)) {
            return existingMetaDescRx.replaceFirst(html) { m ->
                val full = m.value
                val attrs = m.groupValues[1]
                val replaced = if (Regex("\\bcontent\\s*=", RegexOption.IGNORE_CASE).containsMatchIn(attrs)) {
                    Regex("\\bcontent\\s*=\\s*(?:\"[^\"]*\"|'[^']*'|[^\\s>]+)", RegexOption.IGNORE_CASE)
                        .replaceFirst(full, Regex.escapeReplacement("""content="$escapedMeta""""))
                } else {
                    """<meta$attrs content="$escapedMeta" />"""
                }
                Regex.escapeReplacement(replaced)
            }
        }

        val metaTag = """<meta name="description" content="$escapedMeta" />"""
        val titleCloseRx = Regex("</title>", RegexOption.IGNORE_CASE)
        if (titleCloseRx.containsMatchIn(html)) {
            return titleCloseRx.replaceFirst(html) { m -> Regex.escapeReplacement("${m.value}\n  $metaTag") }
        }
        val headOpenRx = Regex("<head\\b[^>]*>", RegexOption.IGNORE_CASE)
        if (headOpenRx.containsMatchIn(html)) {
            return headOpenRx.replaceFirst(html) { m -> Regex.escapeReplacement("${m.value}\n  $metaTag") }
        }
        return "$metaTag\n$html"
    }

    fun renderTemplate(
        template: String?,
        title: String,
        imageUrl: String,
        thumbnailUrl: String?,
        caption: String,
        publishedDate: String? = null,
        adsSettings: AdsSettings = AdsSettings.DEFAULT,
        metaDescription: String? = null
    ): String {
        val safeTemplate = HtmlEntityCodec.repairNonAsciiHtmlEntities(
            if (!template.isNullOrBlank()) {
                template
            } else {
                DEFAULT_MASTER_TEMPLATE
            }
        )
        val rawMain = sanitizeUrl(imageUrl)
        val rawThumb = sanitizeUrl(thumbnailUrl)
        var safeImageUrl = when {
            rawMain.isNotEmpty() && !MainImageSelector.isDisallowedNonThumbnailFormat(rawMain) -> rawMain
            rawThumb.isNotEmpty() && !MainImageSelector.isDisallowedNonThumbnailFormat(rawThumb) -> rawThumb
            else -> ""
        }
        if (safeImageUrl.isEmpty()) {
            val recoveredFromTemplate = MainImageSelector.selectMainThumbnailImageFromHtml(safeTemplate)
            if (!recoveredFromTemplate.isNullOrBlank() && !MainImageSelector.isDisallowedNonThumbnailFormat(recoveredFromTemplate)) {
                safeImageUrl = sanitizeUrl(recoveredFromTemplate)
            }
        }
        val formattedDate = publishedDate ?: SimpleDateFormat("MMM d, yyyy, h:mm a", Locale.US).format(Date())

        val normalizedTitle = HtmlEntityCodec.decodePlainTextEntities(title, preserveNewlines = false)
        val normalizedCaption = HtmlEntityCodec.decodePlainTextEntities(caption, preserveNewlines = true)
        val escapedTitle = escapeHtml(normalizedTitle)
        val formattedCaption = escapeHtml(normalizedCaption)
            .replace("\n", "<br/>")

        val renderedWithVars = safeTemplate
            .replace("{{TITLE}}", escapedTitle)
            .replace("{{IMAGE_URL}}", safeImageUrl)
            .replace("{{THUMBNAIL_URL}}", safeImageUrl)
            .replace("{{CAPTION}}", formattedCaption)
            .replace("{{PUBLISHED_DATE}}", formattedDate)

        val rendered = applyMetaDescriptionToTemplate(renderedWithVars, metaDescription)
        val secured = ensureMasterAdConfiguration(rendered, DEFAULT_MASTER_TEMPLATE, adsSettings)
        return ensureMainImageFirstInPostHtml(secured, safeImageUrl, normalizedTitle)
    }

    fun renderImportedTemplate(
        template: String?,
        title: String,
        articleHtml: String,
        imageUrl: String? = null,
        firstImageAlt: String? = null,
        firstImageSrcset: String? = null,
        publishedDate: String? = null,
        sourceUrl: String? = null,
        adsSettings: AdsSettings = AdsSettings.DEFAULT,
        metaDescription: String? = null
    ): String {
        val safeTemplate = HtmlEntityCodec.repairNonAsciiHtmlEntities(
            if (!template.isNullOrBlank()) {
                deduplicateAdScriptsAndContainers(template)
            } else {
                DEFAULT_MASTER_TEMPLATE
            }
        )

        val sanitized = ImportedHtmlSanitizer.sanitize(articleHtml, sourceUrl)
        val normalizedTitle = HtmlEntityCodec.decodePlainTextEntities(title, preserveNewlines = false)
        val escapedTitle = escapeHtml(normalizedTitle)
        val plainSummary = HtmlEntityCodec.decodePlainTextEntities(
            sanitized.html.replace(Regex("<[^>]*>"), " "),
            preserveNewlines = false
        )
        val shortSummary = escapeHtml(
            when {
                plainSummary.length > 110 -> plainSummary.substring(0, 107).trim() + "..."
                plainSummary.isNotEmpty() -> plainSummary
                else -> normalizedTitle
            }
        )

        var safeImageUrl = sanitizeUrl(imageUrl)
        if (safeImageUrl.isEmpty() || MainImageSelector.isDisallowedNonThumbnailFormat(safeImageUrl)) {
            val fromCandidates = MainImageSelector.selectMainThumbnailImage(sanitized.images)
                ?: MainImageSelector.selectMainThumbnailImageFromHtml(sanitized.html)
            safeImageUrl = if (!fromCandidates.isNullOrBlank() && !MainImageSelector.isDisallowedNonThumbnailFormat(fromCandidates)) {
                sanitizeUrl(fromCandidates)
            } else {
                ""
            }
        }

        val formattedDate = publishedDate ?: SimpleDateFormat("MMM d, yyyy, h:mm a", Locale.US).format(Date())
        val articleContainer = """<div class="imported-article-content">${sanitized.html}</div>"""

        var output = safeTemplate
        if (Regex("</style>", RegexOption.IGNORE_CASE).containsMatchIn(output)) {
            output = Regex("</style>", RegexOption.IGNORE_CASE).replaceFirst(output) {
                Regex.escapeReplacement("$IMPORTED_ARTICLE_SCOPED_CSS  </style>")
            }
        }

        val postDescCaptionRx = Regex(
            "(<section\\b[^>]*id=[\"']postDescription[\"'][^>]*>[\\s\\S]*?)<p>\\s*\\{\\{CAPTION\\}\\}\\s*</p>",
            RegexOption.IGNORE_CASE
        )
        if (postDescCaptionRx.containsMatchIn(output)) {
            output = postDescCaptionRx.replaceFirst(output) { m ->
                Regex.escapeReplacement("${m.groupValues[1]}$articleContainer")
            }
            output = Regex("<a\\b[^>]*>\\s*\\{\\{CAPTION\\}\\}\\s*</a>", RegexOption.IGNORE_CASE)
                .replace(output, Regex.escapeReplacement("""<a href="{{IMAGE_URL}}">$escapedTitle</a>"""))
            output = output.replace("{{CAPTION}}", shortSummary)
        } else {
            val captionAnchorRx = Regex("<a\\b[^>]*>\\s*\\{\\{CAPTION\\}\\}\\s*</a>", RegexOption.IGNORE_CASE)
            var articleInserted = false
            if (captionAnchorRx.containsMatchIn(output)) {
                output = captionAnchorRx.replaceFirst(output, Regex.escapeReplacement(articleContainer))
                articleInserted = true
            }
            if (!articleInserted && output.contains("{{CAPTION}}")) {
                output = output.replaceFirst("{{CAPTION}}", articleContainer)
                articleInserted = true
            }
            if (output.contains("{{CAPTION}}")) {
                output = output.replace("{{CAPTION}}", shortSummary)
            } else if (!articleInserted && !output.contains("""class="imported-article-content"""")) {
                val videoContainerRx = Regex("<div\\b[^>]*class=[\"'][^\"']*video-container[^\"']*[\"'][^>]*>", RegexOption.IGNORE_CASE)
                output = if (videoContainerRx.containsMatchIn(output)) {
                    videoContainerRx.replaceFirst(output) { Regex.escapeReplacement("$articleContainer\n${it.value}") }
                } else {
                    "$articleContainer\n$output"
                }
            }
        }

        val normalizedFirstAlt = if (!firstImageAlt.isNullOrBlank()) {
            HtmlEntityCodec.decodePlainTextEntities(firstImageAlt, preserveNewlines = false)
        } else {
            ""
        }

        if (safeImageUrl.isEmpty()) {
            output = output.replace(
                Regex("<a\\b[^>]*href=[\"']\\{\\{IMAGE_URL\\}\\}[\"'][^>]*>\\s*<img\\b[^>]*src=[\"']\\{\\{IMAGE_URL\\}\\}[\"'][^>]*>\\s*</a>", RegexOption.IGNORE_CASE),
                ""
            )
            output = output.replace(Regex("<img\\b([^>]*id=[\"']videoThumbnail[\"'][^>]*)>", RegexOption.IGNORE_CASE)) { m ->
                val withoutSrc = m.groupValues[1].replace(Regex("\\s*src=[\"']\\{\\{(?:THUMBNAIL_URL|IMAGE_URL)\\}\\}[\"']", RegexOption.IGNORE_CASE), "")
                """<img$withoutSrc style="display: none;">"""
            }
            output = output.replace(Regex("<video\\b([^>]*poster=[\"']\\{\\{(?:IMAGE_URL|THUMBNAIL_URL)\\}\\}[\"'][^>]*)>", RegexOption.IGNORE_CASE)) { m ->
                "<video${m.groupValues[1].replace(Regex("\\s*poster=[\"']\\{\\{(?:IMAGE_URL|THUMBNAIL_URL)\\}\\}[\"']", RegexOption.IGNORE_CASE), "")}>"
            }
            output = output.replace(Regex("<img\\b[^>]*src=[\"']\\{\\{(?:IMAGE_URL|THUMBNAIL_URL)\\}\\}[\"'][^>]*>", RegexOption.IGNORE_CASE), "")
        } else {
            output = output.replace(Regex("<img\\b([^>]*src=[\"']\\{\\{IMAGE_URL\\}\\}[\"'][^>]*)>", RegexOption.IGNORE_CASE)) { m ->
                var updated = m.groupValues[1]
                if (normalizedFirstAlt.isNotEmpty() && Regex("\\balt=[\"']\\s*[\"']", RegexOption.IGNORE_CASE).containsMatchIn(updated)) {
                    updated = Regex("\\balt=[\"']\\s*[\"']", RegexOption.IGNORE_CASE)
                        .replaceFirst(updated, Regex.escapeReplacement("""alt="${escapeHtml(normalizedFirstAlt)}""""))
                }
                if (!firstImageSrcset.isNullOrBlank() && !Regex("\\bsrcset=", RegexOption.IGNORE_CASE).containsMatchIn(updated)) {
                    updated = """$updated srcset="${escapeHtml(firstImageSrcset)}""""
                }
                "<img$updated>"
            }
        }

        val renderedWithVars = output
            .replace("{{TITLE}}", escapedTitle)
            .replace("{{IMAGE_URL}}", safeImageUrl)
            .replace("{{THUMBNAIL_URL}}", safeImageUrl)
            .replace("{{PUBLISHED_DATE}}", formattedDate)

        val rendered = applyMetaDescriptionToTemplate(renderedWithVars, metaDescription)
        val secured = ensureMasterAdConfiguration(rendered, DEFAULT_MASTER_TEMPLATE, adsSettings)
        return ensureMainImageFirstInPostHtml(
            secured,
            safeImageUrl,
            normalizedFirstAlt.ifEmpty { normalizedTitle }
        )
    }
}

