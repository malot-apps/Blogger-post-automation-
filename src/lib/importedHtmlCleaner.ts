/**
 * Shared, isomorphic utilities for:
 * 1. Detecting external ad networks, Smart Links, Direct Links, popup/redirect URLs,
 *    affiliate/shortener domains, and external Blogger site links.
 * 2. Cleaning imported article HTML before merging into the Master HTML Template
 *    (even in client-side preview or direct template rendering).
 * 3. Protecting, injecting, and deduplicating the Master HTML Template's ad scripts
 *    and ad containers so only the Master Template's configured ads run.
 */

export const TRACKING_OR_AD_HOST_PATTERNS: RegExp[] = [
  /(^|\.)doubleclick\.net$/i,
  /(^|\.)googlesyndication\.com$/i,
  /(^|\.)googleadservices\.com$/i,
  /(^|\.)google-analytics\.com$/i,
  /(^|\.)googletagmanager\.com$/i,
  /(^|\.)googletagservices\.com$/i,
  /(^|\.)facebook\.com$/i,
  /(^|\.)connect\.facebook\.net$/i,
  /(^|\.)statcounter\.com$/i,
  /(^|\.)histats\.com$/i,
  /(^|\.)feedburner\.com$/i,
  /(^|\.)quantserve\.com$/i,
  /(^|\.)scorecardresearch\.com$/i,
  /(^|\.)adnxs\.com$/i,
  /(^|\.)criteo\.(com|net)$/i,
  /(^|\.)pubmatic\.com$/i,
  /(^|\.)rubiconproject\.com$/i,
  /(^|\.)openx\.net$/i,
  /(^|\.)taboola\.com$/i,
  /(^|\.)outbrain\.com$/i,
  /(^|\.)mgid\.com$/i,
  /(^|\.)adsterra\.com$/i,
  /(^|\.)effectivecpmnetwork\.com$/i,
  /(^|\.)highperformanceformat\.com$/i,
  /(^|\.)cheflobesofficer\.com$/i,
  /(^|\.)profitablegatecpm\.com$/i,
  /(^|\.)profitablecpmrate\.com$/i,
  /(^|\.)effectiveratecpm\.com$/i,
  /(^|\.)highcpmgate\.com$/i,
  /(^|\.)highrevenuegate\.com$/i,
  /(^|\.)toprevenuegate\.com$/i,
  /(^|\.)topcreativeformat\.com$/i,
  /(^|\.)gatetocpm\.com$/i,
  /(^|\.)wayfarerorthodox\.com$/i,
  /(^|\.)cpmnetwork\.[a-z]{2,}$/i,
  /(^|\.)propellerads\.com$/i,
  /(^|\.)onclickalgo\.[a-z]{2,}$/i,
  /(^|\.)onclickads\.[a-z]{2,}$/i,
  /(^|\.)popads\.net$/i,
  /(^|\.)popcash\.net$/i,
  /(^|\.)adcash\.com$/i,
  /(^|\.)monetag\.com$/i,
  /(^|\.)hilltopads\.[a-z]{2,}$/i,
  /(^|\.)exoclick\.com$/i,
  /(^|\.)trafficjunky\.[a-z]{2,}$/i,
  /(^|\.)juicyads\.com$/i,
  /(^|\.)clickadu\.[a-z]{2,}$/i,
  /(^|\.)galaksion\.[a-z]{2,}$/i,
  /(^|\.)admaven\.[a-z]{2,}$/i,
  /(^|\.)evadav\.[a-z]{2,}$/i,
  /(^|\.)richads\.[a-z]{2,}$/i,
  /(^|\.)amazon-adsystem\.com$/i,
  /(^|\.)assoc-amazon\.com$/i,
  /(^|\.)media\.net$/i,
  /(^|\.)revcontent\.com$/i,
];

export const AFFILIATE_AND_SHORTENER_HOST_PATTERNS: RegExp[] = [
  /(^|\.)amzn\.to$/i,
  /(^|\.)amzn\.eu$/i,
  /(^|\.)amzn\.in$/i,
  /(^|\.)a\.co$/i,
  /(^|\.)click\.linksynergy\.com$/i,
  /(^|\.)anrdoezrs\.net$/i,
  /(^|\.)dpbolvw\.net$/i,
  /(^|\.)jdoqocy\.com$/i,
  /(^|\.)tkqlhce\.com$/i,
  /(^|\.)kqzyfj\.com$/i,
  /(^|\.)shareasale\.com$/i,
  /(^|\.)awin1\.com$/i,
  /(^|\.)gopjn\.com$/i,
  /(^|\.)pntra\.com$/i,
  /(^|\.)pjatr\.com$/i,
  /(^|\.)pjtra\.com$/i,
  /(^|\.)avantlink\.com$/i,
  /(^|\.)go\.redirectingat\.com$/i,
  /(^|\.)go\.skimresources\.com$/i,
  /(^|\.)rstyle\.me$/i,
  /(^|\.)howl\.me$/i,
  /(^|\.)shop-links\.co$/i,
  /(^|\.)magik\.ly$/i,
  /(^|\.)bit\.ly$/i,
  /(^|\.)tinyurl\.com$/i,
  /(^|\.)goo\.gl$/i,
  /(^|\.)t\.co$/i,
  /(^|\.)ow\.ly$/i,
  /(^|\.)is\.gd$/i,
  /(^|\.)buff\.ly$/i,
  /(^|\.)rebrand\.ly$/i,
  /(^|\.)cutt\.ly$/i,
  /(^|\.)shorturl\.at$/i,
  /(^|\.)rb\.gy$/i,
  /(^|\.)ouo\.(io|press)$/i,
  /(^|\.)shrinkme\.io$/i,
  /(^|\.)exe\.io$/i,
  /(^|\.)linkvertise\.com$/i,
  /(^|\.)adf\.ly$/i,
  /(^|\.)bc\.vc$/i,
  /(^|\.)za\.gl$/i,
  /(^|\.)gplinks\.co$/i,
  /(^|\.)droplink\.co$/i,
  /(^|\.)mdisk\.me$/i,
];

export const AFFILIATE_AND_AD_QUERY_PARAMS = new Set([
  'aff',
  'aff_id',
  'affiliate',
  'affiliate_id',
  'ascsubtag',
  'irclickid',
  'clickid',
  'ranmid',
  'raneaid',
  'ransiteid',
  'skimlinks',
  'zoneid',
  'bannerid',
  'subid',
  'pubid',
  'adurl',
  'ad_id',
  'pop',
  'popunder',
  'smartlink',
  'directlink',
]);

export const AD_URL_PATH_REGEX =
  /(\/smart[-_]?link|\/direct[-_]?link|\/afu\.php|\/pop\.php|\/popunder|\/popup|\/adclick|\/ad[-_]?redirect|\/invoke\.js|\/click[-_]?track)/i;

export const PROMO_CTA_TEXT_REGEX =
  /^(buy now|shop now|check price|get deal|claim offer|download now|free download|download|play now|watch now|play\s*&\s*watch|watch full video|full video|watch video|click here|continue|open link|skip ad|visit link|subscribe now|join telegram|follow us|advertisement|sponsored|loading premium content\.{0,3}|▶\ufe0f?|ভিডিওটি চালু করুন|এখনই দেখুন|পুরো ভিডিও দেখুন|ডাউনলোড করুন|ক্লিক করুন)$/i;

export const PLAYER_OR_AD_CONTAINER_ID_REGEX =
  /^(container-[a-z0-9_-]{6,}|playIcon|loadingScreen|videoThumbnail|btn\d+|ads?|ad[-_]?(?:box|slot|unit|banner|container|wrapper)|sidebar[-_]?ads?)$/i;

export const PLAYER_OR_AD_MARKER_REGEX =
  /(^|[-_\s])(ad|ads|advert|advertisement|ad-slot|ad-box|ad-unit|ad-banner|ad-container|ad-wrapper|adsense|adsbygoogle|adsterra|effectivecpmnetwork|mgid|taboola|outbrain|propeller|popads|popcash|monetag|smartlink|direct-link|directlink|sponsored-box|sponsor-banner|promo-banner|promotional-banner|affiliate-box|affiliate-banner|related-posts|share-buttons|social-share|newsletter-box|subscribe-box|cookie-banner|popup-overlay|blogger-post-footer|video-container|controls|play-icon|loading-screen)([-_\s]|$)/i;

export const FOREIGN_TEMPLATE_NOISE_TEXT_REGEX =
  /^(loading premium content\.{0,3}|please allow pop-ups for this site.*|▶\ufe0f?)$/i;

function hostMatches(hostname: string, patterns: RegExp[]): boolean {
  const clean = hostname.toLowerCase();
  return patterns.some((rx) => rx.test(clean));
}

export function isExternalBloggerSiteHref(href: string, sourceBlogHost?: string): boolean {
  try {
    const parsed = new URL(href);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();

    // Direct CDN image URLs on blogger.googleusercontent.com / bp.blogspot.com are handled separately
    if (host.includes('googleusercontent.com') || host.endsWith('bp.blogspot.com')) {
      return false;
    }

    if (sourceBlogHost) {
      const normalizedSource = sourceBlogHost.toLowerCase().replace(/^www\./, '');
      const normalizedHrefHost = host.replace(/^www\./, '');
      if (normalizedHrefHost === normalizedSource) {
        return true;
      }
    }

    if (host.endsWith('.blogspot.com') || host === 'blogger.com' || host.endsWith('.blogger.com')) {
      return true;
    }

    // Standard Blogger post/category link paths when importing from a custom-domain Blogger site
    if (path.startsWith('/search/label/') || path === '/feeds/posts/default') {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export function isAdOrSmartLinkUrl(rawHref: string): boolean {
  if (!rawHref) return false;
  const trimmed = rawHref.trim();
  const lower = trimmed.toLowerCase();

  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('data:text/')
  ) {
    return true;
  }

  try {
    const parsed = new URL(trimmed.startsWith('//') ? `https:${trimmed}` : trimmed);
    const host = parsed.hostname.toLowerCase();

    if (
      hostMatches(host, TRACKING_OR_AD_HOST_PATTERNS) ||
      hostMatches(host, AFFILIATE_AND_SHORTENER_HOST_PATTERNS)
    ) {
      return true;
    }

    if (AD_URL_PATH_REGEX.test(parsed.pathname)) {
      return true;
    }

    // Rotating smart-link / direct-link pattern: ?key=<16+ hex/alnum>
    const keyParam = parsed.searchParams.get('key');
    if (keyParam && /^[a-f0-9_-]{16,}$/i.test(keyParam)) {
      return true;
    }

    const isAmazonHost = /(^|\.)amazon\.[a-z.]{2,}$/i.test(host);
    for (const paramKey of parsed.searchParams.keys()) {
      const lk = paramKey.toLowerCase();
      if (AFFILIATE_AND_AD_QUERY_PARAMS.has(lk) || (isAmazonHost && lk === 'tag')) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

export function normalizeExternalHref(rawHref: string, baseUrl?: string): string | null {
  if (!rawHref) return null;
  let candidate = rawHref.trim();
  const lower = candidate.toLowerCase();
  if (
    !candidate ||
    lower.startsWith('#') ||
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('data:')
  ) {
    return null;
  }
  if (lower.startsWith('mailto:')) {
    return candidate;
  }
  if (candidate.startsWith('//')) {
    candidate = `https:${candidate}`;
  } else if (!/^https?:\/\//i.test(candidate)) {
    if (!baseUrl) return null;
    try {
      const normalizedBase = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
      candidate = new URL(candidate, normalizedBase).toString();
    } catch {
      return null;
    }
  }
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Neutralizes any accidental {{PLACEHOLDER}} tokens in imported HTML
 * so imported content cannot hijack Master Template variables.
 */
export function neutralizeTemplatePlaceholders(html: string): string {
  if (!html) return '';
  return html.replace(/\{\{\s*(TITLE|IMAGE_URL|THUMBNAIL_URL|CAPTION|PUBLISHED_DATE)\s*\}\}/gi, '');
}

/**
 * Isomorphic sanitizer for imported article HTML fragments before merging with the Master HTML Template.
 * Runs cleanly in both browser (using DOMParser) and server/Node (using deterministic HTML pass).
 * Guarantees that even client-side callers (like ImportPostsModal preview) strip:
 * - all <script>, <style>, <iframe>, <object>, <embed>, <button>, <form>, inline JS handlers
 * - imported .video-container / .controls / .play-icon / .loading-screen / #container-* blocks
 * - all external Smart Links, Direct Links, popup links, ad URLs, and foreign Blogger site links
 * - all clickable <a> links wrapping <img> tags (making preserved JPG & PNG images non-clickable)
 */
export function sanitizeImportedArticleFragment(
  rawHtml: string,
  options: { baseUrl?: string } = {}
): string {
  if (!rawHtml || typeof rawHtml !== 'string') return '';

  let sourceBlogHost: string | undefined;
  if (options.baseUrl) {
    try {
      const normalizedBase = options.baseUrl.startsWith('http')
        ? options.baseUrl
        : `https://${options.baseUrl}`;
      sourceBlogHost = new URL(normalizedBase).hostname.toLowerCase();
    } catch {
      // ignore invalid baseUrl
    }
  }

  // Browser DOM path (used during client-side preview & template rendering)
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<div id="__clean_root__">${rawHtml}</div>`, 'text/html');
      const root = doc.getElementById('__clean_root__');
      if (root) {
        // 1. Remove dangerous/executable/interactive elements completely
        const removeTags =
          'script, style, noscript, iframe, frame, frameset, object, embed, applet, param, form, input, textarea, button, select, option, svg, canvas, audio, video, track, map, area, template, link, meta, base, title, head, ins.adsbygoogle, [data-ad-client], [data-ad-slot]';
        root.querySelectorAll(removeTags).forEach((el) => el.remove());

        // 2. Remove imported player & ad containers
        root.querySelectorAll('[id], [class], [aria-label], [hidden], [style]').forEach((el) => {
          if (!el.isConnected) return;
          const id = el.getAttribute('id') || '';
          const cls = el.getAttribute('class') || '';
          const aria = el.getAttribute('aria-label') || '';
          const style = (el.getAttribute('style') || '').toLowerCase();
          const isHidden =
            el.hasAttribute('hidden') ||
            /display\s*:\s*none/i.test(style) ||
            /visibility\s*:\s*hidden/i.test(style);
          const isPlayerOrAdContainer =
            PLAYER_OR_AD_CONTAINER_ID_REGEX.test(id) ||
            /(^|\s)(video-container|controls|play-icon|loading-screen|adsbygoogle|adsterra)(\s|$)/i.test(cls);

          if (isPlayerOrAdContainer || isHidden || PLAYER_OR_AD_MARKER_REGEX.test(`${id} ${cls} ${aria}`)) {
            if (isPlayerOrAdContainer || isHidden) {
              el.remove();
            } else {
              const textLen = (el.textContent || '').replace(/\s+/g, ' ').trim().length;
              const hasHeading = el.querySelector('h1, h2, h3, h4') !== null;
              if (!hasHeading && textLen < 160 && el.querySelector('img') === null) {
                el.remove();
              }
            }
          }
        });

        // 3. Clean <a> elements: unwrap all <a> wrapping <img>, remove popup/ad/smart/direct/CTA links
        root.querySelectorAll('a').forEach((a) => {
          const hasImg = a.querySelector('img') !== null;
          const hasOnClick = Array.from(a.attributes).some((attr) =>
            attr.name.toLowerCase().startsWith('on')
          );
          const rawHref = a.getAttribute('href') || '';
          const normalizedHref = normalizeExternalHref(rawHref, options.baseUrl);
          const text = (a.textContent || '').replace(/\s+/g, ' ').trim();

          if (hasImg) {
            // Strip CTA text nodes inside image links if linking to ad/external site, keep clean <img> non-clickable
            if (isAdOrSmartLinkUrl(normalizedHref || rawHref) || isExternalBloggerSiteHref(normalizedHref || rawHref, sourceBlogHost)) {
              a.childNodes.forEach((child) => {
                if (child.nodeType === 3 && PROMO_CTA_TEXT_REGEX.test((child.textContent || '').trim())) {
                  child.textContent = '';
                }
              });
            }
            const frag = doc.createDocumentFragment();
            while (a.firstChild) {
              frag.appendChild(a.firstChild);
            }
            a.replaceWith(frag);
            return;
          }

          if (
            hasOnClick ||
            !normalizedHref ||
            isAdOrSmartLinkUrl(normalizedHref) ||
            isExternalBloggerSiteHref(normalizedHref, sourceBlogHost)
          ) {
            if (!text || PROMO_CTA_TEXT_REGEX.test(text) || hasOnClick) {
              a.remove();
            } else {
              const frag = doc.createDocumentFragment();
              while (a.firstChild) {
                frag.appendChild(a.firstChild);
              }
              a.replaceWith(frag);
            }
            return;
          }

          // Safe editorial link: keep href cleanly without event handlers or inline CSS
          const safeTitle = a.getAttribute('title');
          Array.from(a.attributes).forEach((attr) => a.removeAttribute(attr.name));
          a.setAttribute('href', normalizedHref);
          if (safeTitle) a.setAttribute('title', safeTitle);
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener noreferrer');
        });

        // 4. Strip event handlers, ids, classes, styles, and tracking pixels from remaining elements
        root.querySelectorAll('*').forEach((el) => {
          const tag = el.tagName.toLowerCase();
          if (tag === 'img') {
            const src =
              el.getAttribute('src') ||
              el.getAttribute('data-src') ||
              el.getAttribute('data-original') ||
              '';
            const cleanSrc = normalizeExternalHref(src, options.baseUrl) || (src.startsWith('data:image/') && !src.startsWith('data:image/svg+xml') ? src : null);
            if (!cleanSrc || isAdOrSmartLinkUrl(cleanSrc)) {
              el.remove();
              return;
            }
            const alt = el.getAttribute('alt') || '';
            const srcset = el.getAttribute('srcset');
            const title = el.getAttribute('title');
            const width = el.getAttribute('width');
            const height = el.getAttribute('height');
            Array.from(el.attributes).forEach((attr) => el.removeAttribute(attr.name));
            el.setAttribute('src', cleanSrc);
            el.setAttribute('alt', alt);
            if (srcset) el.setAttribute('srcset', srcset);
            if (title) el.setAttribute('title', title);
            if (width) el.setAttribute('width', width);
            if (height) el.setAttribute('height', height);
          } else {
            const keepHref = tag === 'a' ? el.getAttribute('href') : null;
            const keepTitle = tag === 'a' ? el.getAttribute('title') : null;
            const keepTarget = tag === 'a' ? el.getAttribute('target') : null;
            const keepRel = tag === 'a' ? el.getAttribute('rel') : null;
            Array.from(el.attributes).forEach((attr) => el.removeAttribute(attr.name));
            if (tag === 'a' && keepHref) {
              el.setAttribute('href', keepHref);
              if (keepTitle) el.setAttribute('title', keepTitle);
              if (keepTarget) el.setAttribute('target', keepTarget);
              if (keepRel) el.setAttribute('rel', keepRel);
            }
          }
        });

        // 5. Prune leftover foreign template overlay text paragraphs
        root.querySelectorAll('p, div, span').forEach((el) => {
          if (el.querySelector('img')) return;
          const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
          if (FOREIGN_TEMPLATE_NOISE_TEXT_REGEX.test(txt)) {
            el.remove();
          }
        });

        return neutralizeTemplatePlaceholders(root.innerHTML.trim());
      }
    } catch {
      // fallback to regex cleaner below
    }
  }

  // Regex fallback for non-DOM environments (Node SSR / fallback before Cheerio)
  let cleaned = rawHtml
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|noscript|iframe|frame|frameset|object|embed|applet|form|button|svg|canvas|audio|video|head|title)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(script|style|noscript|iframe|frame|embed|object|input|textarea|button|meta|link|base)\b[^>]*\/?>/gi, '')
    .replace(/<div\b[^>]*\b(?:class=["'][^"']*\b(?:video-container|controls|play-icon|loading-screen)\b[^"']*["']|id=["']container-[^"']+["'])[^>]*>[\s\S]*?<\/div>/gi, '')
    // Unwrap clickable <a> wrapping <img> so images stay preserved and non-clickable
    .replace(/<a\b[^>]*>(\s*<img\b[^>]*>\s*)<\/a>/gi, '$1')
    // Strip inline event handlers
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // Remove javascript:/vbscript: hrefs
    .replace(/<a\b[^>]*href\s*=\s*["']\s*(?:javascript|vbscript|data):[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi, '$1')
    // Remove id/class/style attrs to prevent Master Template CSS/JS collision
    .replace(/\s+(?:id|class|style)\s*=\s*(?:"[^"]*"|'[^']*')/gi, '');

  // Clean remaining <a> tags with ad/smart/direct/source-blog hrefs
  cleaned = cleaned.replace(
    /<a\b([^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*)>([\s\S]*?)<\/a>/gi,
    (fullMatch, _attrs, dqHref: string | undefined, sqHref: string | undefined, innerHtml: string) => {
      const href = dqHref || sqHref || '';
      if (/<img\b/i.test(innerHtml)) {
        // Keep image non-clickable, remove anchor wrapper
        return innerHtml;
      }
      const norm = normalizeExternalHref(href, options.baseUrl) || href;
      if (isAdOrSmartLinkUrl(norm) || isExternalBloggerSiteHref(norm, sourceBlogHost)) {
        const plain = innerHtml.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        if (!plain || PROMO_CTA_TEXT_REGEX.test(plain)) {
          return '';
        }
        return innerHtml;
      }
      return fullMatch;
    }
  );

  return neutralizeTemplatePlaceholders(cleaned.trim());
}

/**
 * Prevents duplicate ad scripts and duplicate ad containers across the final rendered HTML.
 * - Deduplicates repeated <script src="...">...</script> tags (also stripping any immediately preceding duplicate `atOptions` inline script).
 * - Deduplicates repeated <div id="container-..."></div> containers.
 * - Deduplicates repeated Master Player config script blocks if duplicated.
 */
export function deduplicateAdScriptsAndContainers(html: string): string {
  if (!html) return html;

  const seenScriptSrcs = new Set<string>();
  const seenContainerIds = new Set<string>();
  let seenMainPlayerConfig = false;

  // 1. Remove duplicate `atOptions = {...}; <script src="..."></script>` or duplicate `<script src="..."></script>`
  let output = html.replace(
    /(?:<script\b(?![^>]*\bsrc=)[^>]*>\s*atOptions\s*=[\s\S]*?<\/script>\s*)?<script\b([^>]*\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*)>[\s\S]*?<\/script>/gi,
    (fullMatch, _attrs, dqSrc: string | undefined, sqSrc: string | undefined) => {
      const rawSrc = (dqSrc || sqSrc || '').trim();
      const normSrc = rawSrc.replace(/&amp;/gi, '&').toLowerCase();
      if (!normSrc) return fullMatch;
      if (seenScriptSrcs.has(normSrc)) {
        return '';
      }
      seenScriptSrcs.add(normSrc);
      return fullMatch;
    }
  );

  // 2. Deduplicate ad container divs (<div id="container-..."></div>)
  output = output.replace(
    /<div\b([^>]*\bid\s*=\s*(?:"(container-[^"]+)"|'(container-[^']+)')[^>]*)>\s*<\/div>/gi,
    (fullMatch, _attrs, dqId: string | undefined, sqId: string | undefined) => {
      const containerId = (dqId || sqId || '').trim().toLowerCase();
      if (!containerId) return fullMatch;
      if (seenContainerIds.has(containerId)) {
        return '';
      }
      seenContainerIds.add(containerId);
      return fullMatch;
    }
  );

  // 3. Deduplicate repeated Master player Smart Link config scripts if pasted twice
  output = output.replace(
    /<script\b(?![^>]*\bsrc=)[^>]*>[\s\S]*?\bMAIN_AD_LINK\b[\s\S]*?<\/script>/gi,
    (fullMatch) => {
      if (seenMainPlayerConfig) {
        return '';
      }
      seenMainPlayerConfig = true;
      return fullMatch;
    }
  );

  return output.replace(/\n{3,}/g, '\n\n').trim();
}

export interface MasterAdSections {
  headAdScript: string;
  playerAdScript: string;
  bodyBannerScripts: string;
}

/**
 * Extracts the Master HTML Template's authoritative ad configuration sections
 * so they can be automatically preserved/injected even if a custom template omitted them.
 */
export function extractMasterAdSections(masterTemplate: string): MasterAdSections {
  const headSectionMatch = /<head\b[^>]*>([\s\S]*?)<\/head>/i.exec(masterTemplate);
  const headContent = headSectionMatch ? headSectionMatch[1] : '';
  const headAdScripts: string[] = [];
  const headScriptRx = /<script\b[^>]*\bsrc\s*=\s*["'][^"']+["'][^>]*>[\s\S]*?<\/script>/gi;
  let hm: RegExpExecArray | null;
  while ((hm = headScriptRx.exec(headContent)) !== null) {
    headAdScripts.push(hm[0].trim());
  }

  const playerScriptMatch =
    /<script\b(?![^>]*\bsrc=)[^>]*>[\s\S]*?\bMAIN_AD_LINK\b[\s\S]*?<\/script>/i.exec(masterTemplate);
  const playerAdScript = playerScriptMatch ? playerScriptMatch[0].trim() : '';

  const bodySectionMatch = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(masterTemplate);
  const bodyContent = bodySectionMatch ? bodySectionMatch[1] : masterTemplate;
  const bodyParts: string[] = [];

  // Extract banner/native ad scripts (`atOptions`, external invoke/ad scripts, and `#container-...` divs) from body
  const bodyAdRx =
    /(?:<script\b(?![^>]*\bsrc=)[^>]*>\s*atOptions\s*=[\s\S]*?<\/script>\s*)?<script\b[^>]*\bsrc\s*=\s*["'][^"']+["'][^>]*>[\s\S]*?<\/script>(?:\s*<div\b[^>]*\bid\s*=\s*["']container-[^"']+["'][^>]*>\s*<\/div>)?/gi;
  let bm: RegExpExecArray | null;
  while ((bm = bodyAdRx.exec(bodyContent)) !== null) {
    const snippet = bm[0].trim();
    if (!headAdScripts.includes(snippet)) {
      bodyParts.push(snippet);
    }
  }

  return {
    headAdScript: headAdScripts.join('\n  '),
    playerAdScript,
    bodyBannerScripts: bodyParts.join('\n  '),
  };
}

/**
 * Ensures the rendered/active template contains all configured Master Template ad links/scripts
 * (injecting any missing Master Template head/player/body ad blocks automatically)
 * and removes any duplicate ad scripts or ad containers.
 */
export function ensureMasterAdConfiguration(
  candidateHtml: string,
  masterTemplate: string
): string {
  const sections = extractMasterAdSections(masterTemplate);
  let output = candidateHtml;

  // Ensure head ad script is present
  if (sections.headAdScript) {
    const srcMatch = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(sections.headAdScript);
    const headSrc = srcMatch?.[1];
    if (headSrc && !output.includes(headSrc)) {
      if (/<head\b[^>]*>/i.test(output)) {
        output = output.replace(/<head\b[^>]*>/i, (m) => `${m}\n  ${sections.headAdScript}`);
      } else {
        output = `${sections.headAdScript}\n${output}`;
      }
    }
  }

  // Ensure Master MAIN_AD_LINK & LINKS script is present
  if (sections.playerAdScript && !/\bMAIN_AD_LINK\b/.test(output)) {
    if (/<\/body>/i.test(output)) {
      output = output.replace(/<\/body>/i, () => `  ${sections.playerAdScript}\n</body>`);
    } else {
      output = `${output}\n${sections.playerAdScript}`;
    }
  }

  // Ensure body banner/native ad scripts & containers from Master Template are present
  if (sections.bodyBannerScripts) {
    const missingSnippets: string[] = [];
    const snippetRx =
      /(?:<script\b(?![^>]*\bsrc=)[^>]*>\s*atOptions\s*=[\s\S]*?<\/script>\s*)?<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>[\s\S]*?<\/script>(?:\s*<div\b[^>]*\bid\s*=\s*["']container-[^"']+["'][^>]*>\s*<\/div>)?/gi;
    let sm: RegExpExecArray | null;
    while ((sm = snippetRx.exec(sections.bodyBannerScripts)) !== null) {
      const scriptSrc = sm[1];
      if (scriptSrc && !output.includes(scriptSrc)) {
        missingSnippets.push(sm[0].trim());
      }
    }
    if (missingSnippets.length > 0) {
      const block = missingSnippets.join('\n  ');
      if (/<\/body>/i.test(output)) {
        output = output.replace(/<\/body>/i, () => `  ${block}\n</body>`);
      } else {
        output = `${output}\n${block}`;
      }
    }
  }

  return deduplicateAdScriptsAndContainers(output);
}
