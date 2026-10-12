package com.aistudio.bloggerautopublisher.template

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object BloggerTemplateEngine {

    val DEFAULT_MASTER_TEMPLATE: String = """
<div class="separator" style="clear: both;"><a href="{{IMAGE_URL}}" style="display: block; padding: 1em 0px; text-align: center;"><img alt="" border="0" data-original-height="1350" data-original-width="1080" height="320" src="{{IMAGE_URL}}" /></a><a href="{{IMAGE_URL}}" style="display: block; padding: 1em 0px; text-align: center;">{{CAPTION}}</a></div>

<html lang="en">
<head>
  <script src="https://pl30161573.effectivecpmnetwork.com/bc/17/d1/bc17d177bcada949929a7511850a6cf0.js"></script>
  <meta charset="UTF-8">
  <meta content="width=device-width, initial-scale=1.0" name="viewport">
  <title>{{TITLE}}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    .video-container {
      position: relative;
      width: 100%;
      height: 450px;
      margin: 20px 0;
      background-color: #000;
      overflow: hidden;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
    #videoThumbnail {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .play-icon {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 70px;
      color: rgba(255, 255, 255, 0.9);
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
      cursor: pointer;
      transition: all 0.3s;
      z-index: 10;
    }
    .play-icon.loading {
      animation: pulseSpin 1.5s ease-in-out infinite;
    }
    .controls {
      display: flex;
      justify-content: center;
      gap: 15px;
      margin: 25px 0;
      flex-wrap: wrap;
    }
    button {
      padding: 12px 25px;
      background: linear-gradient(135deg, #6e8efb, #a777e3);
      color: white;
      border: none;
      border-radius: 50px;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
      transition: all 0.3s;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
    }
    @keyframes pulseSpin {
      0% { transform: translate(-50%, -50%) scale(1) rotate(0deg); }
      50% { transform: translate(-50%, -50%) scale(1.1) rotate(180deg); }
      100% { transform: translate(-50%, -50%) scale(1.1) rotate(360deg); }
    }
    .loading-screen {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      color: white;
      font-size: 24px;
      z-index: 5;
    }
  </style>
</head>
<body>
  <div class="video-container">
    <img alt="Video Thumbnail" id="videoThumbnail" src="{{THUMBNAIL_URL}}" />
    <div class="play-icon" id="playIcon">▶️</div>
    <div class="loading-screen" id="loadingScreen" style="display: none;">
      <div>Loading premium content...</div>
    </div>
  </div>

  <div class="controls">
    <button id="btn1">Play Now</button>
    <button id="btn2">Watch Now</button>
    <button id="btn3">Play &amp; Watch</button>
  </div>

  <script>
    const CUSTOM_THUMBNAIL_URL = "{{THUMBNAIL_URL}}";
    const MAIN_AD_LINK = 'https://cheflobesofficer.com/b1b9djat?key=a45917b862f040650d5da9b0f6ceac52';
    const LINKS = ['https://www.effectivecpmnetwork.com/b1b9djat?key=a45917b862f040650d5da9b0f6ceac52'];
    const playIcon = document.getElementById('playIcon');
    const loadingScreen = document.getElementById('loadingScreen');
    const videoThumbnail = document.getElementById('videoThumbnail');
    let mainAdOpened = false;
    let intervalId = null;

    function init() { videoThumbnail.src = CUSTOM_THUMBNAIL_URL; }
    function openSmartLink(url, name) {
      const w = window.open(url, name, 'width=800,height=600,menubar=no,toolbar=no');
      if (!w || w.closed || typeof w.closed == 'undefined') { window.location.href = url; }
    }
    function handleAction() {
      playIcon.classList.add('loading');
      loadingScreen.style.display = 'flex';
      mainAdOpened = false;
      setTimeout(function() {
        if (!mainAdOpened) { mainAdOpened = true; openSmartLink(MAIN_AD_LINK, 'main_ad'); }
      }, 5000);
      LINKS.forEach((link, index) => {
        setTimeout(() => {
          const newWindow = window.open(link, 'premium_' + index, 'width=800,height=600,menubar=no,toolbar=no');
          if (!newWindow) { alert('Please allow pop-ups for this site'); }
        }, index * 2000);
      });
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        LINKS.forEach((link, index) => {
          setTimeout(() => {
            window.open(link, 'premium_' + index + '_repeat', 'width=800,height=600,menubar=no,toolbar=no');
          }, index * 2000);
        });
      }, 15000);
      setTimeout(() => {
        playIcon.classList.remove('loading');
        loadingScreen.style.display = 'none';
      }, 5000);
    }
    document.querySelectorAll('.controls button').forEach(b => b.addEventListener('click', handleAction));
    playIcon.addEventListener('click', handleAction);
    init();
  </script>
</body>
</html>
""".trimIndent()

    fun escapeHtml(text: String): String {
        return text
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#39;")
    }

    fun renderTemplate(
        template: String?,
        title: String,
        imageUrl: String,
        thumbnailUrl: String?,
        caption: String,
        publishedDate: String? = null
    ): String {
        val safeTemplate = if (!template.isNullOrBlank()) template else DEFAULT_MASTER_TEMPLATE
        val effectiveThumbnail = if (!thumbnailUrl.isNullOrBlank()) thumbnailUrl else imageUrl
        val formattedDate = publishedDate ?: SimpleDateFormat("MMM d, yyyy, h:mm a", Locale.US).format(Date())

        val escapedTitle = escapeHtml(title)
        val formattedCaption = escapeHtml(caption)
            .replace("\n", "<br/>")

        return safeTemplate
            .replace("{{TITLE}}", escapedTitle)
            .replace("{{IMAGE_URL}}", imageUrl)
            .replace("{{THUMBNAIL_URL}}", effectiveThumbnail)
            .replace("{{CAPTION}}", formattedCaption)
            .replace("{{PUBLISHED_DATE}}", formattedDate)
    }
}
