import * as cheerio from 'cheerio';
import type { AnyNode, Element } from 'domhandler';
import {
  TRACKING_OR_AD_HOST_PATTERNS,
  AFFILIATE_AND_SHORTENER_HOST_PATTERNS,
  AFFILIATE_AND_AD_QUERY_PARAMS,
  AD_URL_PATH_REGEX,
  PROMO_CTA_TEXT_REGEX,
  PLAYER_OR_AD_CONTAINER_ID_REGEX,
  PLAYER_OR_AD_MARKER_REGEX,
  FOREIGN_TEMPLATE_NOISE_TEXT_REGEX,
  isExternalBloggerSiteHref,
  neutralizeTemplatePlaceholders,
  stripSchemaOrgJsonLdFromText,
} from '../lib/importedHtmlCleaner';
import { isUnwantedUiOrAdImage } from '../lib/mainImageSelector';

export interface SanitizedArticleImage {
  src: string;
  srcset?: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface SanitizeImportedHtmlResult {
  html: string;
  images: SanitizedArticleImage[];
  plainText: string;
}

const TRACKING_QUERY_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'fbclid',
  'gclid',
  'dclid',
  'msclkid',
  'mc_cid',
  'mc_eid',
  '_hsenc',
  '_hsmi',
  'igshid',
]);

const HTTPS_UPGRADE_CDN_HOSTS = [
  'bp.blogspot.com',
  'blogger.googleusercontent.com',
  'googleusercontent.com',
  'ggpht.com',
  'wp.com',
  'wordpress.com',
];

const REMOVE_COMPLETELY_SELECTOR = [
  'script',
  'style',
  'noscript',
  'iframe',
  'frame',
  'frameset',
  'object',
  'embed',
  'applet',
  'param',
  'form',
  'input',
  'textarea',
  'button',
  'select',
  'option',
  'svg',
  'canvas',
  'track',
  'map',
  'area',
  'template',
  'link',
  'meta',
  'base',
  'title',
  'head',
  'ins.adsbygoogle',
  '[type="application/ld+json"]',
  '[type="application/schema+json"]',
  '[data-ad-client]',
  '[data-ad-slot]',
  '[data-app-ad]',
].join(', ');

const ALLOWED_TAGS = new Set([
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'br',
  'hr',
  'blockquote',
  'pre',
  'code',
  'figure',
  'figcaption',
  'ul',
  'ol',
  'li',
  'dl',
  'dt',
  'dd',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'del',
  'ins',
  'mark',
  'small',
  'sub',
  'sup',
  'kbd',
  'samp',
  'var',
  'abbr',
  'cite',
  'q',
  'time',
  'a',
  'img',
  'video',
  'audio',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'caption',
  'colgroup',
  'col',
]);

const BLOCK_LEVEL_TAGS = new Set([
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'blockquote',
  'pre',
  'figure',
  'figcaption',
  'ul',
  'ol',
  'li',
  'dl',
  'table',
  'hr',
  'div',
  'section',
  'article',
]);

const GENUINE_CDN_HINTS = [
  'blogger.googleusercontent.com',
  'bp.blogspot.com',
  'googleusercontent.com',
  'ggpht.com',
  'wp.com',
  'wordpress.com',
  'cloudinary.com',
  'imgur.com',
  'unsplash.com',
  'pexels.com',
];

/**
 * Decodes common HTML entities cleanly into readable UTF-8 text.
 */
export function decodeHtmlEntities(input: string): string {
  if (!input) return '';
  const $ = cheerio.load(`<span>${input}</span>`);
  return $('span').text().replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function isPlaceholderImageSrc(src: string): boolean {
  const lower = src.trim().toLowerCase();
  if (!lower) return true;
  if (lower.startsWith('data:image/svg+xml')) return true;
  if (lower.startsWith('data:image/gif;base64,r0lgod')) return true;
  if (lower.startsWith('data:image/') && lower.length < 180) return true;
  if (
    /\/(blank|spacer|transparent|pixel|1x1|loading|spinner|placeholder)\.(gif|png|jpg|webp|svg)(\?|$)/i.test(
      lower
    )
  ) {
    return true;
  }
  return false;
}

function hostMatchesPatterns(hostname: string, patterns: RegExp[]): boolean {
  const cleanHost = hostname.toLowerCase();
  return patterns.some((rx) => rx.test(cleanHost));
}

function isTrackingOrAdImageUrl(urlString: string): boolean {
  const lower = urlString.toLowerCase();
  if (lower.startsWith('data:image/svg+xml')) return true;
  if (
    /\/(spacer|blank|pixel|1x1|beacon|impression|pageview)\.(gif|png|jpg|webp)(\?|$)/i.test(lower)
  ) {
    return true;
  }
  try {
    const parsed = new URL(urlString);
    if (hostMatchesPatterns(parsed.hostname, TRACKING_OR_AD_HOST_PATTERNS)) {
      return true;
    }
    if (
      parsed.hostname.toLowerCase().includes('facebook.com') &&
      parsed.pathname.toLowerCase().startsWith('/tr')
    ) {
      return true;
    }
    if (
      parsed.hostname.toLowerCase().includes('feedburner.com') &&
      parsed.pathname.includes('/~r/')
    ) {
      return true;
    }
    if (
      (parsed.hostname.toLowerCase().includes('blogger.googleusercontent.com') ||
        parsed.hostname.toLowerCase().includes('blogspot.com')) &&
      parsed.pathname.toLowerCase().includes('/tracker/')
    ) {
      return true;
    }
  } catch {
    return true;
  }
  return false;
}

function isGenuineContentCdnUrl(urlString: string): boolean {
  try {
    const host = new URL(urlString).hostname.toLowerCase();
    return GENUINE_CDN_HINTS.some((hint) => host === hint || host.endsWith(`.${hint}`));
  } catch {
    return false;
  }
}

/**
 * Normalizes an image URL:
 * - Rejects javascript:, vbscript:, data:text/html, blob:, file:
 * - Resolves protocol-relative // URLs to https://
 * - Resolves relative paths against baseUrl if provided
 * - Upgrades known CDN http:// URLs to https://
 */
export function normalizeImageUrl(rawUrl: string, baseUrl?: string): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  let candidate = rawUrl.trim();
  if (!candidate) return null;

  const lower = candidate.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('blob:') ||
    lower.startsWith('file:') ||
    lower.startsWith('data:text/')
  ) {
    return null;
  }

  if (lower.startsWith('data:image/')) {
    if (lower.startsWith('data:image/svg+xml')) return null;
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
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    if (parsed.protocol === 'http:') {
      const host = parsed.hostname.toLowerCase();
      if (HTTPS_UPGRADE_CDN_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
        parsed.protocol = 'https:';
      }
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Parses and normalizes an img srcset attribute, preserving valid width/density descriptors.
 */
export function normalizeSrcset(rawSrcset?: string | null, baseUrl?: string): string | undefined {
  if (!rawSrcset || typeof rawSrcset !== 'string') return undefined;

  const entries: string[] = [];
  // Split srcset on commas that precede a URL (handle URLs containing commas like Blogger/CDN transforms)
  const parts = rawSrcset.split(/,(?=\s*(?:https?:\/\/|\/\/|\/|data:image\/))/i);

  for (const rawPart of parts) {
    const trimmed = rawPart.trim();
    if (!trimmed) continue;

    const whitespaceMatch = trimmed.match(/^(\S+)(?:\s+(.+))?$/);
    if (!whitespaceMatch) continue;

    const rawUrl = whitespaceMatch[1];
    const descriptor = whitespaceMatch[2]?.trim();

    if (isPlaceholderImageSrc(rawUrl)) continue;
    const normalized = normalizeImageUrl(rawUrl, baseUrl);
    if (!normalized || isTrackingOrAdImageUrl(normalized)) continue;

    if (descriptor && /^(\d+w|\d+(\.\d+)?x)$/i.test(descriptor)) {
      entries.push(`${normalized} ${descriptor}`);
    } else {
      entries.push(normalized);
    }
  }

  return entries.length > 0 ? entries.join(', ') : undefined;
}

function firstUrlFromSrcset(srcset?: string): string | null {
  if (!srcset) return null;
  const firstEntry = srcset.split(',')[0]?.trim();
  if (!firstEntry) return null;
  const url = firstEntry.split(/\s+/)[0]?.trim();
  return url || null;
}

function isAffiliateOrAdHref(href: string): boolean {
  try {
    const parsed = new URL(href);
    const host = parsed.hostname.toLowerCase();
    if (
      hostMatchesPatterns(host, AFFILIATE_AND_SHORTENER_HOST_PATTERNS) ||
      hostMatchesPatterns(host, TRACKING_OR_AD_HOST_PATTERNS)
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
    for (const key of parsed.searchParams.keys()) {
      const lowerKey = key.toLowerCase();
      if (AFFILIATE_AND_AD_QUERY_PARAMS.has(lowerKey) || (isAmazonHost && lowerKey === 'tag')) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

function cleanEditorialHref(rawHref: string, baseUrl?: string): string | null {
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
    for (const key of Array.from(parsed.searchParams.keys())) {
      if (TRACKING_QUERY_PARAMS.has(key.toLowerCase())) {
        parsed.searchParams.delete(key);
      }
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function parseStyleDimensions(styleAttr?: string): { width?: number; height?: number; hidden: boolean } {
  if (!styleAttr) return { hidden: false };
  const lower = styleAttr.toLowerCase();
  const hidden =
    /display\s*:\s*none/i.test(lower) ||
    /visibility\s*:\s*hidden/i.test(lower) ||
    /opacity\s*:\s*0(\.0+)?\s*(;|$)/i.test(lower);

  const wMatch = lower.match(/(?:^|;)\s*width\s*:\s*(\d+(?:\.\d+)?)\s*px/i);
  const hMatch = lower.match(/(?:^|;)\s*height\s*:\s*(\d+(?:\.\d+)?)\s*px/i);

  return {
    width: wMatch ? parseFloat(wMatch[1]) : undefined,
    height: hMatch ? parseFloat(hMatch[1]) : undefined,
    hidden,
  };
}

function parseNumericAttr(val?: string): number | undefined {
  if (!val) return undefined;
  const cleaned = val.trim().replace(/px$/i, '');
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return undefined;
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : undefined;
}

function containsGenuineArticleContent($: cheerio.CheerioAPI, el: Element): boolean {
  const $el = $(el);
  // Check for genuine images
  let hasGenuineImg = false;
  $el.find('img').each((_, img) => {
    const src =
      $(img).attr('src') ||
      $(img).attr('data-src') ||
      $(img).attr('data-original') ||
      $(img).attr('data-lazy-src') ||
      '';
    const norm = normalizeImageUrl(src);
    if (norm && !isPlaceholderImageSrc(norm) && !isTrackingOrAdImageUrl(norm)) {
      if (isGenuineContentCdnUrl(norm)) {
        hasGenuineImg = true;
        return false;
      }
      const parentHref = $(img).closest('a').attr('href') || '';
      if (parentHref && isAffiliateOrAdHref(parentHref)) {
        return;
      }
      const w = parseNumericAttr($(img).attr('width'));
      const h = parseNumericAttr($(img).attr('height'));
      if ((!w || w > 50) && (!h || h > 50)) {
        hasGenuineImg = true;
        return false;
      }
    }
  });
  if (hasGenuineImg) return true;

  // Check for substantial article prose or headings
  if ($el.find('h1, h2, h3, h4').length > 0) return true;
  const textLen = $el.text().replace(/\s+/g, ' ').trim().length;
  if (textLen > 160 && $el.find('p').length > 0) return true;

  return false;
}

function unwrapElementPreservingBlocks($: cheerio.CheerioAPI, el: Element): void {
  const $el = $(el);
  const children = $el.contents().toArray();
  if (children.length === 0) {
    $el.remove();
    return;
  }

  const tagName = el.tagName?.toLowerCase() || '';
  const isContainerBlock = ['div', 'section', 'article', 'main', 'center', 'header', 'footer', 'aside'].includes(
    tagName
  );

  if (!isContainerBlock) {
    $el.replaceWith($el.contents());
    return;
  }

  // If container has no nested block elements and has meaningful inline text/images, wrap as <p>
  const hasBlockChild = children.some(
    (node) => node.type === 'tag' && BLOCK_LEVEL_TAGS.has((node as Element).tagName.toLowerCase())
  );

  if (!hasBlockChild) {
    const hasImg = $el.find('img').length > 0;
    const text = $el.text().replace(/\u00a0/g, ' ').trim();
    if (hasImg && !text && $el.children().length === 1 && $el.children('img').length === 1) {
      const $fig = $('<figure></figure>');
      $fig.append($el.children('img').first());
      $el.replaceWith($fig);
      return;
    }
    if (text.length > 0 || hasImg) {
      const $p = $('<p></p>');
      $p.append($el.contents());
      $el.replaceWith($p);
      return;
    }
  }

  $el.replaceWith($el.contents());
}

/**
 * Sanitizes imported Blogger HTML:
 * - Preserves headings, paragraphs, lists, tables, blockquotes, and text formatting
 * - Preserves all genuine article images (src, srcset, alt) in their original positions
 * - Removes scripts, styles, iframes, embeds, tracking pixels, ads, affiliate links, and promo banners
 * - Strips unnecessary inline CSS/HTML clutter
 */
export function sanitizeImportedHtml(
  rawHtml: string,
  options: { baseUrl?: string } = {}
): SanitizeImportedHtmlResult {
  if (!rawHtml || typeof rawHtml !== 'string') {
    return { html: '', images: [], plainText: '' };
  }

  const baseUrl = options.baseUrl;
  let sourceBlogHost: string | undefined;
  if (baseUrl) {
    try {
      const normalizedBase = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
      sourceBlogHost = new URL(normalizedBase).hostname.toLowerCase();
    } catch {
      // ignore malformed baseUrl
    }
  }

  const $ = cheerio.load(`<div id="__import_root__">${rawHtml}</div>`);
  const $root = $('#__import_root__');

  // Preserve hero image metadata from imported .video-container / #videoThumbnail if needed later as fallback
  const rescuedVideoContainerImages: SanitizedArticleImage[] = [];
  $root.find('.video-container img, img#videoThumbnail').each((_, imgEl) => {
    const $img = $(imgEl);
    const rawCandidate =
      $img.attr('src') ||
      $img.attr('data-src') ||
      $img.attr('data-original') ||
      $img.attr('data-lazy-src') ||
      '';
    const norm = normalizeImageUrl(rawCandidate, baseUrl);
    if (norm && !isPlaceholderImageSrc(norm) && !isTrackingOrAdImageUrl(norm)) {
      rescuedVideoContainerImages.push({
        src: norm,
        srcset: normalizeSrcset($img.attr('srcset') || $img.attr('data-srcset'), baseUrl),
        alt: ($img.attr('alt') || '').trim(),
        width: parseNumericAttr($img.attr('width')),
        height: parseNumericAttr($img.attr('height')),
      });
    }
  });

  // 1. Remove HTML comments recursively
  const removeComments = (node: AnyNode) => {
    const $node = $(node);
    $node.contents().each((_, child) => {
      if (child.type === 'comment') {
        $(child).remove();
      } else if (child.type === 'tag') {
        removeComments(child);
      }
    });
  };
  if ($root[0]) removeComments($root[0]);

  // 2. Remove dangerous / executable / embed elements completely
  $root.find(REMOVE_COMPLETELY_SELECTOR).remove();

  // 2b. Strip residual Schema.org JSON-LD serialized text nodes outside <pre>/<code>/<kbd>/<samp>
  const stripJsonLdInNode = (node: AnyNode) => {
    const $node = $(node);
    $node.contents().each((_, child) => {
      if (child.type === 'text') {
        const textVal = child.data || '';
        if (textVal.includes('@context') || textVal.includes('@type') || /application\/ld\+json/i.test(textVal)) {
          const cleanedText = stripSchemaOrgJsonLdFromText(textVal);
          if (cleanedText !== textVal) {
            child.data = cleanedText;
          }
        }
      } else if (child.type === 'tag') {
        const tag = child.tagName?.toLowerCase() || '';
        if (tag === 'pre' || tag === 'code' || tag === 'kbd' || tag === 'samp') {
          return;
        }
        stripJsonLdInNode(child);
      }
    });
  };
  if ($root[0]) stripJsonLdInNode($root[0]);

  // 2c. Remove pure Schema.org microdata metadata blocks (never remove [itemprop="articleBody"] or genuine content)
  $root.find('[itemtype*="schema.org"]').each((_, el) => {
    const $el = $(el);
    if ($el.closest('#__import_root__').length === 0) return;
    const itemtype = ($el.attr('itemtype') || '').toLowerCase();
    const isArticleContainer =
      $el.attr('itemprop') === 'articleBody' ||
      $el.find('[itemprop="articleBody"]').length > 0;
    if (isArticleContainer) return;

    const isPureMetaSchema =
      itemtype.includes('breadcrumblist') ||
      itemtype.includes('imageobject') ||
      itemtype.includes('organization') ||
      itemtype.includes('person');
    if (isPureMetaSchema || !containsGenuineArticleContent($, el)) {
      $el.remove();
    }
  });

  // 3. Remove explicit ad / promo / player / social-share / related-posts / hidden widget containers
  // Always remove strict ad-network slots & imported video-player widgets (never let them leak duplicate #videoThumbnail / #container-* / Play buttons).
  // For general ambiguous containers, keep containsGenuineArticleContent guard so genuine article content is never dropped.
  $root.find('[class], [id], [aria-label], [data-ad-client], [data-ad-slot], [style], [hidden]').each((_, el) => {
    const $el = $(el);
    if ($el.closest('#__import_root__').length === 0) return;
    const tag = el.tagName?.toLowerCase();
    if (tag === 'img' || tag === 'body' || tag === 'html') return;

    const styleInfo = parseStyleDimensions($el.attr('style'));
    const isHiddenContainer = styleInfo.hidden || $el.attr('hidden') !== undefined;

    const idVal = ($el.attr('id') || '').trim();
    const classVal = ($el.attr('class') || '').trim();
    const ariaVal = ($el.attr('aria-label') || '').trim();

    const hasAdAttr =
      $el.attr('data-ad-client') !== undefined ||
      $el.attr('data-ad-slot') !== undefined ||
      $el.attr('data-app-ad') !== undefined;
    const isStrictAdOrPlayerWidget =
      hasAdAttr ||
      PLAYER_OR_AD_CONTAINER_ID_REGEX.test(idVal) ||
      /(^|\s)(video-container|controls|play-icon|loading-screen|playback-error-screen|play-center-group|bn-player-heading-wrap|live-viewer-badge|scroll-indicator-wrap|related-section|ad-slot-wrapper|ad-fallback|adsbygoogle|adsterra|effectivecpmnetwork|schema-markup|post-schema)(\s|$)/i.test(
        classVal
      );

    if (isStrictAdOrPlayerWidget || isHiddenContainer) {
      $el.remove();
      return;
    }

    const marker = [classVal, idVal, ariaVal].join(' ');
    if (PLAYER_OR_AD_MARKER_REGEX.test(marker)) {
      if (!containsGenuineArticleContent($, el)) {
        $el.remove();
      }
    }
  });

  // 3b. Clean article <video>/<audio> elements (strip ad/empty/malicious media, preserve legitimate media with safe controls)
  $root.find('video, audio').each((_, mediaEl) => {
    const $media = $(mediaEl);
    const rawSrc =
      $media.attr('src') ||
      $media.find('source[src]').first().attr('src') ||
      '';
    const cleanSrc = cleanEditorialHref(rawSrc, baseUrl);
    if (!cleanSrc || isAffiliateOrAdHref(cleanSrc)) {
      $media.remove();
      return;
    }
    const rawPoster = $media.attr('poster') || '';
    const cleanPoster = rawPoster ? normalizeImageUrl(rawPoster, baseUrl) : null;
    for (const attr of Object.keys(mediaEl.attribs || {})) {
      $media.removeAttr(attr);
    }
    $media.attr('src', cleanSrc);
    $media.attr('controls', 'controls');
    $media.attr('preload', 'metadata');
    if (cleanPoster && !isTrackingOrAdImageUrl(cleanPoster)) {
      $media.attr('poster', cleanPoster);
    }
    $media.find('source').remove();
  });

  // 4. Convert Blogger image caption tables (table.tr-caption-container) into clean <figure>
  $root.find('table.tr-caption-container').each((_, tableEl) => {
    const $table = $(tableEl);
    const $img = $table.find('img').first();
    if ($img.length === 0) return;

    const captionHtml = $table.find('.tr-caption').first().html()?.trim();
    const $figure = $('<figure></figure>');
    $figure.append($img.clone());
    if (captionHtml) {
      const $figcaption = $('<figcaption></figcaption>').html(captionHtml);
      $figure.append($figcaption);
    }
    $table.replaceWith($figure);
  });

  // 5. Unwrap <picture> into its <img> while inheriting <source srcset> if needed
  $root.find('picture').each((_, picEl) => {
    const $pic = $(picEl);
    const $img = $pic.find('img').first();
    if ($img.length === 0) {
      $pic.remove();
      return;
    }
    if (!$img.attr('srcset')) {
      const sourceSrcset = $pic.find('source[srcset]').first().attr('srcset');
      if (sourceSrcset) {
        $img.attr('srcset', sourceSrcset);
      }
    }
    $pic.replaceWith($img);
  });

  // 6. Clean and validate every <img> in-place (preserving exact DOM position)
  const collectedImages: SanitizedArticleImage[] = [];
  const seenImageUrls = new Set<string>();

  $root.find('img').each((_, imgEl) => {
    const $img = $(imgEl);
    const styleInfo = parseStyleDimensions($img.attr('style'));
    const attrWidth = parseNumericAttr($img.attr('width'));
    const attrHeight = parseNumericAttr($img.attr('height'));
    const origWidth = parseNumericAttr($img.attr('data-original-width'));
    const origHeight = parseNumericAttr($img.attr('data-original-height'));
    const effectiveWidth = attrWidth ?? origWidth ?? styleInfo.width;
    const effectiveHeight = attrHeight ?? origHeight ?? styleInfo.height;
    const imgClass = ($img.attr('class') || '').trim();
    const imgId = ($img.attr('id') || '').trim();

    // Hidden or 1x1 / 2x2 tracking pixels
    if (
      styleInfo.hidden ||
      (effectiveWidth !== undefined && effectiveWidth <= 2) ||
      (effectiveHeight !== undefined && effectiveHeight <= 2)
    ) {
      $img.remove();
      return;
    }

    // Resolve lazy-loaded attributes if src is absent or a placeholder
    const candidateSrcs = [
      $img.attr('src'),
      $img.attr('data-src'),
      $img.attr('data-original'),
      $img.attr('data-original-src'),
      $img.attr('data-lazy-src'),
      $img.attr('data-lazyload'),
      $img.attr('data-url'),
      $img.attr('data-hi-res-src'),
    ];

    let resolvedSrc: string | null = null;
    for (const candidate of candidateSrcs) {
      if (!candidate || isPlaceholderImageSrc(candidate)) continue;
      const norm = normalizeImageUrl(candidate, baseUrl);
      if (norm) {
        resolvedSrc = norm;
        break;
      }
    }

    const rawSrcset = $img.attr('srcset') || $img.attr('data-srcset');
    const normalizedSrcset = normalizeSrcset(rawSrcset, baseUrl);

    if (!resolvedSrc && normalizedSrcset) {
      resolvedSrc = firstUrlFromSrcset(normalizedSrcset);
    }

    if (!resolvedSrc || isTrackingOrAdImageUrl(resolvedSrc)) {
      $img.remove();
      return;
    }

    const altText = ($img.attr('alt') || '').trim();
    const titleText = ($img.attr('title') || '').trim();

    // Remove unwanted PNG icons, play buttons, logos, social badges, tracking pixels, and ad banner images
    // while preserving genuine large article PNGs (infographics, charts, screenshots)
    if (
      isUnwantedUiOrAdImage({
        src: resolvedSrc,
        alt: altText,
        title: titleText,
        className: imgClass,
        id: imgId,
        width: effectiveWidth,
        height: effectiveHeight,
      })
    ) {
      $img.remove();
      return;
    }

    // Promotional/clickable ad banner detection inside affiliate/smart-link <a>
    const parentAnchor = $img.closest('a');
    const parentHref = parentAnchor.length ? parentAnchor.attr('href') || '' : '';
    const cleanedParentHref = parentHref ? cleanEditorialHref(parentHref, baseUrl) || parentHref : '';
    const isBannerDimensions =
      (effectiveWidth !== undefined && effectiveHeight !== undefined && effectiveWidth <= 180 && effectiveHeight <= 60);
    const isPromoFilename =
      /(buy[-_]?now|shop[-_]?now|download[-_]?btn|subscribe[-_]?banner|ad[-_]?banner)/i.test(
        `${resolvedSrc} ${altText}`
      );

    if (
      parentHref &&
      isAffiliateOrAdHref(cleanedParentHref) &&
      (isBannerDimensions || isPromoFilename || !isGenuineContentCdnUrl(resolvedSrc))
    ) {
      $img.remove();
      return;
    }

    // Rebuild clean attributes on <img>
    const allAttrs = Object.keys(imgEl.attribs || {});
    for (const attr of allAttrs) {
      $img.removeAttr(attr);
    }

    $img.attr('src', resolvedSrc);
    if (normalizedSrcset) {
      $img.attr('srcset', normalizedSrcset);
    }
    $img.attr('alt', altText);
    if (titleText) {
      $img.attr('title', titleText);
    }
    if (attrWidth && attrWidth > 2) {
      $img.attr('width', String(Math.round(attrWidth)));
    }
    if (attrHeight && attrHeight > 2) {
      $img.attr('height', String(Math.round(attrHeight)));
    }

    if (!seenImageUrls.has(resolvedSrc)) {
      seenImageUrls.add(resolvedSrc);
      collectedImages.push({
        src: resolvedSrc,
        srcset: normalizedSrcset,
        alt: altText,
        width: effectiveWidth,
        height: effectiveHeight,
      });
    }
  });

  // 7. Clean links <a>:
  // - ALWAYS unwrap clickable <a> links wrapping imported <img> elements (preserving JPG & PNG images non-clickable)
  // - Remove popup/onclick/javascript/Smart/Direct/ad/CTA links & foreign Blogger website links
  $root.find('a').each((_, anchorEl) => {
    const $a = $(anchorEl);
    const rawHref = $a.attr('href') || '';
    const titleAttr = ($a.attr('title') || '').trim();
    const hasImgChild = $a.find('img').length > 0;
    const textContent = $a.text().replace(/\s+/g, ' ').trim();
    const hasInlineEventHandler = Object.keys(anchorEl.attribs || {}).some((attr) =>
      attr.toLowerCase().startsWith('on')
    );

    // Clickable <a> wrapping ANY image (JPG, PNG banner, etc.): strip <a> wrapper so image stays preserved & non-clickable
    if (hasImgChild) {
      // Remove any promo CTA text inside the anchor alongside the image
      $a.contents().each((_, childNode) => {
        if (childNode.type === 'text') {
          const t = $(childNode).text().trim();
          if (t && PROMO_CTA_TEXT_REGEX.test(t)) {
            $(childNode).remove();
          }
        }
      });
      $a.replaceWith($a.contents());
      return;
    }

    // Remove popup/inline-JS anchors or CTA-only anchors pointing to javascript:/#
    const cleanedHref = cleanEditorialHref(rawHref, baseUrl);
    if (
      !cleanedHref ||
      isAffiliateOrAdHref(cleanedHref) ||
      isExternalBloggerSiteHref(cleanedHref, sourceBlogHost)
    ) {
      if (
        !textContent ||
        PROMO_CTA_TEXT_REGEX.test(textContent) ||
        (!cleanedHref && hasInlineEventHandler)
      ) {
        $a.remove();
      } else {
        // Inline article text wrapped in ad/external-Blogger link -> unwrap <a>, keep text
        $a.replaceWith($a.contents());
      }
      return;
    }

    // Standalone promo CTA link (even if host wasn't on a static blocklist)
    if (PROMO_CTA_TEXT_REGEX.test(textContent)) {
      $a.remove();
      return;
    }

    // Strip all unsafe/unnecessary attributes (including onclick/ping) from kept editorial <a>
    for (const attr of Object.keys(anchorEl.attribs || {})) {
      $a.removeAttr(attr);
    }
    $a.attr('href', cleanedHref);
    if (titleAttr) $a.attr('title', titleAttr);
    $a.attr('target', '_blank');
    $a.attr('rel', 'noopener noreferrer');
  });

  // 8. Unwrap disallowed tags bottom-up while preserving block separation and readable content
  const unwrapDisallowed = () => {
    // Repeat bottom-up until only allowed tags remain inside #__import_root__
    let changed = true;
    let passes = 0;
    while (changed && passes < 12) {
      changed = false;
      passes++;
      const elements = $root.find('*').toArray().reverse();
      for (const el of elements) {
        const tag = el.tagName?.toLowerCase();
        if (!tag || ALLOWED_TAGS.has(tag)) continue;
        unwrapElementPreservingBlocks($, el);
        changed = true;
      }
    }
  };
  unwrapDisallowed();

  // 9. Strip all disallowed attributes from remaining allowed tags
  $root.find('*').each((_, el) => {
    const tag = el.tagName?.toLowerCase();
    const $el = $(el);
    const attrs = Object.keys(el.attribs || {});

    for (const attr of attrs) {
      const lowerAttr = attr.toLowerCase();
      if (tag === 'img' && ['src', 'srcset', 'alt', 'title', 'width', 'height'].includes(lowerAttr)) {
        continue;
      }
      if (tag === 'a' && ['href', 'title', 'target', 'rel'].includes(lowerAttr)) {
        continue;
      }
      if ((tag === 'th' || tag === 'td') && ['colspan', 'rowspan'].includes(lowerAttr)) {
        continue;
      }
      if ((tag === 'video' || tag === 'audio') && ['src', 'controls', 'preload', 'poster'].includes(lowerAttr)) {
        continue;
      }
      if (tag === 'ol' && ['start', 'type'].includes(lowerAttr)) {
        continue;
      }
      if ((tag === 'blockquote' || tag === 'q') && lowerAttr === 'cite') {
        continue;
      }
      $el.removeAttr(attr);
    }
  });

  // 10. Remove leftover foreign template overlay noise & empty elements bottom-up
  const voidOrSelfContent = new Set(['img', 'br', 'hr', 'video', 'audio']);
  const elementsForPruning = $root.find('*').toArray().reverse();
  for (const el of elementsForPruning) {
    const tag = el.tagName?.toLowerCase() || '';
    if (voidOrSelfContent.has(tag)) continue;
    const $el = $(el);
    if ($el.find('img, hr, video, audio').length > 0) continue;
    const rawText = $el.text().replace(/\s+/g, ' ').trim();
    if (rawText && FOREIGN_TEMPLATE_NOISE_TEXT_REGEX.test(rawText)) {
      $el.remove();
      continue;
    }
    const text = $el.text().replace(/[\s\u00a0\u200b]+/g, '');
    if (!text) {
      $el.remove();
    }
  }

  // If the source post ONLY had its hero image inside a removed .video-container, keep it in collectedImages
  for (const rescued of rescuedVideoContainerImages) {
    if (!seenImageUrls.has(rescued.src)) {
      seenImageUrls.add(rescued.src);
      collectedImages.push(rescued);
    }
  }

  // 11. Serialize, collapse excessive <br> runs/blank lines, and neutralize any {{PLACEHOLDER}} tokens
  let cleanedHtml = neutralizeTemplatePlaceholders(
    ($root.html() || '')
      .replace(/(?:<br\s*\/?>\s*){3,}/gi, '<br /><br />')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );

  const plainText = $root
    .text()
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    html: cleanedHtml,
    images: collectedImages,
    plainText,
  };
}
