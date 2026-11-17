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
        transform: translate(-50%, -50%) scale(1) rotate(360deg);
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
    <img alt="Video Thumbnail" id="videoThumbnail" src="{{IMAGE_URL}}" />
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
    const CUSTOM_THUMBNAIL_URL = "{{IMAGE_URL}}";
    
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
    
    // Initialize the thumbnail with the main post image URL.
    function init() {
      if (CUSTOM_THUMBNAIL_URL && videoThumbnail) {
        videoThumbnail.src = CUSTOM_THUMBNAIL_URL;
      }
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
  
</body>
</html>`;

function normalizeComparableUrl(url: string): string {
  return url.trim().replace(/&amp;/gi, '&');
}

/**
 * Guarantees that {{IMAGE_URL}} is the VERY FIRST <img> in the published Blogger HTML
 * and precedes any other images, ads, scripts, iframes, videos, or embeds so Blogger
 * always selects the Main Post Image as the post thumbnail.
 */
export function ensureMainImageFirstInPostHtml(
  html: string,
  mainImageUrl: string,
  altText?: string
): string {
  let cleanUrl = sanitizeTemplateUrlValue(mainImageUrl);

  // Never allow a PNG or empty image as the hero thumbnail if a valid JPG/non-PNG image exists in HTML
  if (!cleanUrl || isPngImageUrl(cleanUrl)) {
    const htmlCandidate = selectMainThumbnailImageFromHtml(html);
    if (htmlCandidate && !isPngImageUrl(htmlCandidate)) {
      cleanUrl = sanitizeTemplateUrlValue(htmlCandidate);
    }
  }

  if (!cleanUrl || isPngImageUrl(cleanUrl)) return html;

  const comparableTarget = normalizeComparableUrl(cleanUrl);
  const firstImgMatch = /<img\b([^>]*)>/i.exec(html);
  const competingBeforeRegex = /<(?:iframe|video|embed|object|ins|script)\b/i;

  if (firstImgMatch && firstImgMatch.index !== undefined) {
    const attrs = firstImgMatch[1] || '';
    const srcMatch = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
    const firstImgSrc = srcMatch ? (srcMatch[1] || srcMatch[2] || srcMatch[3] || '') : '';
    const isTargetFirstImg = normalizeComparableUrl(firstImgSrc) === comparableTarget;
    const prefixBeforeImg = html.slice(0, firstImgMatch.index);
    const hasCompetingBeforeImg = competingBeforeRegex.test(prefixBeforeImg);

    if (isTargetFirstImg && !hasCompetingBeforeImg) {
      return html;
    }
  }

  const safeAlt = escapeHtml((altText || '').trim());
  const heroBlock = `<div class="separator" style="clear: both;"><a href="${cleanUrl}" style="display: block; padding: 1em 0px; text-align: center;"><img alt="${safeAlt}" border="0" data-original-height="1350" data-original-width="1080" height="320" src="${cleanUrl}" /></a></div>`;
  return `${heroBlock}\n${html}`;
}

/**
 * Renders the Blogger post HTML by replacing all dynamic template variables:
 * - {{TITLE}}
 * - {{IMAGE_URL}} (always used as the Blogger post thumbnail & first image)
 * - {{CAPTION}}
 * - {{PUBLISHED_DATE}}
 * Note: Any legacy {{THUMBNAIL_URL}} placeholder in user-saved templates maps directly to {{IMAGE_URL}}.
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
  let safeImageUrl = sanitizeTemplateUrlValue(data.imageUrl);
  if (!safeImageUrl || isPngImageUrl(safeImageUrl)) {
    const recoveredFromTemplate = selectMainThumbnailImageFromHtml(safeTemplate);
    if (recoveredFromTemplate && !isPngImageUrl(recoveredFromTemplate)) {
      safeImageUrl = sanitizeTemplateUrlValue(recoveredFromTemplate);
    }
  }

  const formattedDate = data.publishedDate || new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const rendered = safeTemplate
    .replace(/\{\{TITLE\}\}/g, () => escapedTitle)
    .replace(/\{\{IMAGE_URL\}\}/g, () => safeImageUrl)
    .replace(/\{\{THUMBNAIL_URL\}\}/g, () => safeImageUrl)
    .replace(/\{\{CAPTION\}\}/g, () => formattedCaption)
    .replace(/\{\{PUBLISHED_DATE\}\}/g, () => formattedDate);

  const secured = ensureMasterAdConfiguration(rendered, DEFAULT_MASTER_TEMPLATE);
  return ensureMainImageFirstInPostHtml(secured, safeImageUrl, data.title);
}

export interface ImportedTemplateVariables {
  title: string;
  articleHtml: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  firstImageAlt?: string;
  firstImageSrcset?: string;
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
    .imported-article-content table {
      max-width: 100%;
      overflow-x: auto;
      border-collapse: collapse;
    }
`;

function sanitizeTemplateUrlValue(url?: string): string {
  if (!url) return '';
  return url.trim().replace(/["'<>]/g, '');
}

/**
 * Converts a sanitized imported article (title, cleaned HTML body, original images)
 * into the existing Master HTML Template without bypassing its design, CSS, scripts,
 * or interactive player/control sections.
 */
export function renderImportedPostTemplate(
  templateString?: string | null,
  data?: ImportedTemplateVariables,
  masterAdSourceTemplate?: string | null
): string {
  const authoritativeMaster =
    masterAdSourceTemplate && masterAdSourceTemplate.trim().length > 0
      ? masterAdSourceTemplate
      : DEFAULT_MASTER_TEMPLATE;

  const safeTemplate =
    templateString && templateString.trim().length > 0
      ? deduplicateAdScriptsAndContainers(templateString)
      : authoritativeMaster;

  if (!data) return safeTemplate;

  // Always sanitize imported HTML strictly before merging so imported content
  // can never execute scripts, inject ads/smart links, keep clickable banners, or override Master Template ad config.
  const cleanedArticleHtml = sanitizeImportedArticleFragment(data.articleHtml || '', {
    baseUrl: data.sourceUrl,
  });

  const escapedTitle = escapeHtml(data.title || '');
  let safeImageUrl = sanitizeTemplateUrlValue(data.imageUrl);
  if (!safeImageUrl || isPngImageUrl(safeImageUrl)) {
    const recoveredFromArticle = selectMainThumbnailImageFromHtml(cleanedArticleHtml);
    safeImageUrl =
      recoveredFromArticle && !isPngImageUrl(recoveredFromArticle)
        ? sanitizeTemplateUrlValue(recoveredFromArticle)
        : '';
  }
  const formattedDate = data.publishedDate || new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const articleContainer = `<div class="imported-article-content">${cleanedArticleHtml}</div>`;

  let output = safeTemplate;

  // 1. Add scoped responsive rules for imported article elements without altering existing template CSS
  if (/<\/style>/i.test(output)) {
    output = output.replace(/<\/style>/i, () => `${IMPORTED_ARTICLE_SCOPED_CSS}  </style>`);
  }

  // 2. Replace {{CAPTION}} inside the Master Template without trapping rich HTML/images/links inside an <a> wrapper
  const captionAnchorRegex = /<a\b[^>]*>\s*\{\{CAPTION\}\}\s*<\/a>/gi;
  if (captionAnchorRegex.test(output)) {
    output = output.replace(captionAnchorRegex, () => articleContainer);
  }
  if (output.includes('{{CAPTION}}')) {
    output = output.replace(/\{\{CAPTION\}\}/g, () => articleContainer);
  } else if (!output.includes('class="imported-article-content"')) {
    // Fallback for custom templates omitting {{CAPTION}}: place article content before video-container or after <body>
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

  // 3. Handle hero {{IMAGE_URL}} and #videoThumbnail cleanly
  if (!safeImageUrl) {
    // Text-only imported post: remove empty hero image link and hide #videoThumbnail to prevent broken <img src="">
    output = output.replace(
      /<a\b[^>]*href=["']\{\{IMAGE_URL\}\}["'][^>]*>\s*<img\b[^>]*src=["']\{\{IMAGE_URL\}\}["'][^>]*>\s*<\/a>/gi,
      ''
    );
    output = output.replace(
      /<img\b([^>]*id=["']videoThumbnail["'][^>]*)>/gi,
      (_m, attrs: string) => {
        const withoutSrc = attrs.replace(/\s*src=["']\{\{(?:THUMBNAIL_URL|IMAGE_URL)\}\}["']/i, '');
        return `<img${withoutSrc} style="display: none;">`;
      }
    );
    output = output.replace(/<img\b[^>]*src=["']\{\{(?:IMAGE_URL|THUMBNAIL_URL)\}\}["'][^>]*>/gi, '');
  } else {
    // Preserve first image alt and responsive srcset on the Master Template hero <img> when available
    output = output.replace(/<img\b([^>]*src=["']\{\{IMAGE_URL\}\}["'][^>]*)>/gi, (_m, attrs: string) => {
      let updatedAttrs = attrs;
      if (data.firstImageAlt && /\balt=["']\s*["']/i.test(updatedAttrs)) {
        updatedAttrs = updatedAttrs.replace(/\balt=["']\s*["']/i, () => `alt="${escapeHtml(data.firstImageAlt!)}"`);
      }
      if (data.firstImageSrcset && !/\bsrcset=/i.test(updatedAttrs)) {
        updatedAttrs = `${updatedAttrs} srcset="${escapeHtml(data.firstImageSrcset)}"`;
      }
      return `<img${updatedAttrs}>`;
    });
  }

  // 4. Substitute all remaining Master Template placeholders safely (legacy {{THUMBNAIL_URL}} maps to {{IMAGE_URL}})
  const rendered = output
    .replace(/\{\{TITLE\}\}/g, () => escapedTitle)
    .replace(/\{\{IMAGE_URL\}\}/g, () => safeImageUrl)
    .replace(/\{\{THUMBNAIL_URL\}\}/g, () => safeImageUrl)
    .replace(/\{\{PUBLISHED_DATE\}\}/g, () => formattedDate);

  // 5. Ensure ONLY Master Template's configured ad scripts/links are injected & deduplicated
  const secured = ensureMasterAdConfiguration(rendered, authoritativeMaster);

  return ensureMainImageFirstInPostHtml(secured, safeImageUrl, data.firstImageAlt || data.title);
}

export const renderTemplate = renderBloggerPostTemplate;

