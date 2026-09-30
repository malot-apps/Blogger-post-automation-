import { escapeHtml } from '../lib/sanitizer';

export interface BloggerTemplateVariables {
  title: string;
  imageUrl: string;
  thumbnailUrl?: string;
  caption: string;
  publishedDate?: string;
}

/**
 * Default fallback template.
 * The master template is stored in /templates/blogger-post-template.html
 */
export const DEFAULT_MASTER_TEMPLATE = `<div class="separator" style="clear: both;"><a href="{{IMAGE_URL}}" style="display: block; padding: 1em 0px; text-align: center;"><img alt="" border="0" data-original-height="1350" data-original-width="1080" height="320" src="{{IMAGE_URL}}" /></a><a href="{{IMAGE_URL}}" style="display: block; padding: 1em 0px; text-align: center;">{{CAPTION}}</a></div>

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
      0% {
        transform: translate(-50%, -50%) scale(1) rotate(0deg);
      }
      50% {
        transform: translate(-50%, -50%) scale(1.1) rotate(180deg);
      }
      100% {
        transform: translate(-50%, -50%) scale(1.1) rotate(360deg);
      }
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
    // Configuration
    const CUSTOM_THUMBNAIL_URL = "{{THUMBNAIL_URL}}";
    
    // Main ad link
    const MAIN_AD_LINK = 'https://cheflobesofficer.com/b1b9djat?key=a45917b862f040650d5da9b0f6ceac52';
    
    // Array of links to be opened.
    const LINKS = [
      'https://www.effectivecpmnetwork.com/b1b9djat?key=a45917b862f040650d5da9b0f6ceac52'
    ];
    
    // Elements
    const playIcon = document.getElementById('playIcon');
    const loadingScreen = document.getElementById('loadingScreen');
    const videoThumbnail = document.getElementById('videoThumbnail');
    
    // Flag to ensure the main ad link only opens once per action
    let mainAdOpened = false;
    
    // Interval ID for repeating link openings.
    let intervalId = null;
    
    // Initialize the thumbnail with the custom URL.
    function init() {
      videoThumbnail.src = CUSTOM_THUMBNAIL_URL;
    }
    
    // Smart opener: tries popup first, falls back to redirect if blocked
    function openSmartLink(url, name) {
      const w = window.open(url, name, 'width=800,height=600,menubar=no,toolbar=no');
      if (!w || w.closed || typeof w.closed == 'undefined') {
        // Popup blocked → redirect in same tab
        window.location.href = url;
      }
    }
    
    // Handles the action to simulate video loading and open links.
    function handleAction() {
      // Start loading simulation.
      playIcon.classList.add('loading');
      loadingScreen.style.display = 'flex';
      
      // Reset the flag for this new action
      mainAdOpened = false;
      
      // 1) Open the main adsterra link after 5 seconds (popup first, then fallback redirect)
      setTimeout(function() {
        if (!mainAdOpened) {
          mainAdOpened = true;
          openSmartLink(MAIN_AD_LINK, 'main_ad');
        }
      }, 5000);
      
      // 2) Open the LINKS array with 2-second delay between each.
      LINKS.forEach((link, index) => {
        setTimeout(() => {
          const newWindow = window.open(link, 'premium_' + index, 'width=800,height=600,menubar=no,toolbar=no');
          if (!newWindow) {
            alert('Please allow pop-ups for this site | ভিডিওটি চালু করতে Always Show Button ক্লিক করুন।');
          }
        }, index * 2000);
      });
      
      // Clear any existing interval.
      if (intervalId) clearInterval(intervalId);
      
      // Set new interval for repeating link openings (every 15 seconds).
      intervalId = setInterval(() => {
        LINKS.forEach((link, index) => {
          setTimeout(() => {
            window.open(link, 'premium_' + index + '_repeat', 'width=800,height=600,menubar=no,toolbar=no');
          }, index * 2000);
        });
      }, 15000);
      
      // Ensure minimum 5-second loading animation.
      setTimeout(() => {
        playIcon.classList.remove('loading');
        loadingScreen.style.display = 'none';
      }, 5000);
    }
    
    // Event listeners for control buttons.
    document.querySelectorAll('.controls button').forEach(button => {
      button.addEventListener('click', handleAction);
    });
    
    // Added event listener for play icon click.
    playIcon.addEventListener('click', handleAction);
    
    // Initialize on page load.
    init();
  </script>
  
  <script>
  atOptions = {
    'key' : '36d19f913897a5c30f86205584612f58',
    'format' : 'iframe',
    'height' : 90,
    'width' : 728,
    'params' : {}
  };
  </script>
  <script src="https://www.highperformanceformat.com/36d19f913897a5c30f86205584612f58/invoke.js"></script>
  
  <script async="async" data-cfasync="false" src="https://pl30160056.effectivecpmnetwork.com/390299b40362a820b12f3db553aff06f/invoke.js"></script>
  <div id="container-390299b40362a820b12f3db553aff06f"></div>
  
  <script src="https://pl30160054.effectivecpmnetwork.com/44/86/88/448688bfd2ba5f19d655439d50b8ea0b.js"></script>
  
  <script async="async" data-cfasync="false" src="https://pl30160056.effectivecpmnetwork.com/390299b40362a820b12f3db553aff06f/invoke.js"></script>
  <div id="container-390299b40362a820b12f3db553aff06f"></div>
  
</body>
</html>`;

/**
 * Renders the Blogger post HTML by replacing all dynamic template variables:
 * - {{TITLE}}
 * - {{IMAGE_URL}}
 * - {{THUMBNAIL_URL}} (falls back to {{IMAGE_URL}} if not separately provided)
 * - {{CAPTION}}
 * - {{PUBLISHED_DATE}}
 */
export function renderBloggerPostTemplate(
  templateString?: string,
  data?: BloggerTemplateVariables
): string {
  const safeTemplate = templateString && templateString.trim().length > 0 
    ? templateString 
    : DEFAULT_MASTER_TEMPLATE;

  if (!data) return safeTemplate;

  const escapedTitle = escapeHtml(data.title || '');
  const formattedCaption = escapeHtml(data.caption || '');
  const safeImageUrl = data.imageUrl || '';
  const safeThumbnailUrl = data.thumbnailUrl && data.thumbnailUrl.trim().length > 0
    ? data.thumbnailUrl.trim()
    : safeImageUrl;

  const formattedDate = data.publishedDate || new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return safeTemplate
    .replace(/\{\{TITLE\}\}/g, escapedTitle)
    .replace(/\{\{IMAGE_URL\}\}/g, safeImageUrl)
    .replace(/\{\{THUMBNAIL_URL\}\}/g, safeThumbnailUrl)
    .replace(/\{\{CAPTION\}\}/g, formattedCaption)
    .replace(/\{\{PUBLISHED_DATE\}\}/g, formattedDate);
}

export const renderTemplate = renderBloggerPostTemplate;

