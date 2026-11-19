/**
 * Centralized Blogger Main Post Image & Thumbnail Selection Logic.
 *
 * Rules enforced:
 * 1. Prioritize original Blogger post thumbnail metadata (og:image, twitter:image, JSON-LD image)
 *    and the source article hero image; use media$thumbnail strictly as a fallback.
 * 2. Support valid JPG, JPEG, PNG, and WebP images. Prefer JPG/JPEG when available,
 *    but NEVER reject valid PNG or WebP images.
 * 3. Ignore advertisement images, tracking pixels, logos, icons, play buttons, badges, and UI assets.
 * 4. Preserve genuine article PNG images (infographics, charts, screenshots) inside post content.
 */

export type ThumbnailCandidateRole =
  | 'og_image'
  | 'metadata'
  | 'hero'
  | 'article'
  | 'media_thumbnail';

export interface ThumbnailCandidate {
  src: string;
  alt?: string;
  title?: string;
  srcset?: string;
  className?: string;
  id?: string;
  width?: number;
  height?: number;
  isAdOrUnrelated?: boolean;
  role?: ThumbnailCandidateRole;
  index?: number;
}

export const SUPPORTED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
] as const;

const AD_OR_TRACKER_URL_PATTERN =
  /(doubleclick\.net|googlesyndication\.com|googleadservices\.com|google-analytics\.com|googletagmanager\.com|googletagservices\.com|adnxs\.com|criteo\.|taboola\.com|outbrain\.com|mgid\.com|adsterra\.com|effectivecpmnetwork\.com|highperformanceformat\.com|cheflobesofficer\.com|profitablegatecpm\.com|profitablecpmrate\.com|effectiveratecpm\.com|highcpmgate\.com|highrevenuegate\.com|toprevenuegate\.com|topcreativeformat\.com|gatetocpm\.com|wayfarerorthodox\.com|propellerads\.com|popads\.net|popcash\.net|adcash\.com|monetag\.com|hilltopads\.|exoclick\.com|trafficjunky\.|juicyads\.com|clickadu\.|galaksion\.|admaven\.|evadav\.|richads\.|amazon-adsystem\.com|media\.net|revcontent\.com|statcounter\.com|histats\.com|quantserve\.com|scorecardresearch\.com|feedburner\.com\/~r\/|\/tracker\/)/i;

const ICON_CDN_HOST_PATTERN =
  /(^|\.)(flaticon\.com|icons8\.com|iconfinder\.com|twemoji\.maxcdn\.com)$/i;

const AD_OR_UNRELATED_FILENAME_PATTERN =
  /(^|[\/_\-.])(ad[-_]?banner|adsense|ad[-_]?slot|ad[-_]?unit|sponsored|promo[-_]?banner|promotional[-_]?banner|affiliate[-_]?banner|buy[-_]?now|shop[-_]?now|download[-_]?(btn|button|icon)|play[-_]?(btn|button|icon|overlay|circle|triangle)|video[-_]?play|youtube[-_]?play|btn[-_]?play|119514|watch[-_]?(btn|button|now)|subscribe[-_]?(btn|banner|button)|join[-_]?telegram|favicon|site[-_]?logo|header[-_]?logo|footer[-_]?logo|brand[-_]?logo|logo[-_]?icon|sprite|emoji|smilies|smiley|spacer|blank|pixel|1x1|beacon|impression|loading|spinner|loader|share[-_]?icon|social[-_]?icon|follow[-_]?icon|facebook[-_]?icon|fb[-_]?icon|twitter[-_]?icon|whatsapp[-_]?icon|telegram[-_]?icon|instagram[-_]?icon|pinterest[-_]?icon|linkedin[-_]?icon|youtube[-_]?icon|arrow[-_]?(icon|btn|left|right|up|down)|bullet[-_]?icon|checkmark|verified[-_]?badge|star[-_]?rating|rating[-_]?star|divider[-_]?line|separator[-_]?line|728x90|300x250|468x60|160x600|320x50|336x280|300x600|120x600|970x90|970x250|250x250|200x200)([\/_\-.]|$)/i;

const EXACT_UI_ICON_FILENAME_PATTERN =
  /\/(?:logo|favicon|play|play-button|playbutton|play_button|play-icon|playicon|arrow|share|facebook|twitter|whatsapp|telegram|instagram|pinterest|linkedin|youtube|subscribe|download|watermark|badge|avatar|spinner|loader|spacer|blank|pixel|ad|ads)\.(?:png|gif|svg|ico|webp)$/i;

const NON_IMAGE_EXTENSION_PATTERN =
  /\.(?:svg|ico|html?|xhtml|js|mjs|cjs|css|json|xml|txt|pdf|mp4|webm|mkv|avi|mov|mp3|wav|woff2?|ttf|eot)$/i;

const STANDARD_AD_DIMENSION_PAIRS: ReadonlyArray<[number, number]> = [
  [728, 90],
  [468, 60],
  [320, 50],
  [320, 100],
  [300, 250],
  [336, 280],
  [300, 600],
  [160, 600],
  [120, 600],
  [970, 90],
  [970, 250],
  [250, 250],
  [200, 200],
];

const GENUINE_CDN_HOST_PATTERN =
  /(^|\.)(blogger\.googleusercontent\.com|bp\.blogspot\.com|googleusercontent\.com|ggpht\.com|wp\.com|wordpress\.com|imgur\.com|cloudinary\.com|unsplash\.com|pexels\.com)$/i;

function stripQueryAndHash(url: string): string {
  return url.split('#')[0].split('?')[0].trim().toLowerCase();
}

function getFormatQueryParam(url: string): string {
  try {
    const parsed = new URL(url.startsWith('//') ? `https:${url}` : url);
    return (
      parsed.searchParams.get('format') ||
      parsed.searchParams.get('fm') ||
      parsed.searchParams.get('ext') ||
      ''
    ).toLowerCase();
  } catch {
    return '';
  }
}

export function normalizeImageMimeType(mimeType?: string | null): string {
  if (!mimeType || typeof mimeType !== 'string') return '';
  const base = mimeType.split(';')[0].trim().toLowerCase();
  if (base === 'image/jpg') return 'image/jpeg';
  return base;
}

export function isSupportedImageMimeType(
  mimeType?: string | null,
  options: { allowGif?: boolean } = { allowGif: true }
): boolean {
  const normalized = normalizeImageMimeType(mimeType);
  if (!normalized) return false;
  if (normalized === 'image/svg+xml') return false;
  if (normalized === 'image/gif') return options.allowGif !== false;
  return (
    normalized === 'image/jpeg' ||
    normalized === 'image/png' ||
    normalized === 'image/webp' ||
    normalized === 'image/avif'
  );
}

export function isPngImageUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  if (!trimmed) return false;

  if (trimmed.startsWith('data:image/png')) return true;

  const cleanPath = stripQueryAndHash(trimmed);
  if (cleanPath.endsWith('.png')) return true;

  return getFormatQueryParam(trimmed) === 'png';
}

export function isJpgImageUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  if (!trimmed) return false;

  if (trimmed.startsWith('data:image/jpeg') || trimmed.startsWith('data:image/jpg')) {
    return true;
  }

  const cleanPath = stripQueryAndHash(trimmed);
  if (cleanPath.endsWith('.jpg') || cleanPath.endsWith('.jpeg')) return true;

  const fmt = getFormatQueryParam(trimmed);
  return fmt === 'jpg' || fmt === 'jpeg';
}

export function isWebpImageUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  if (!trimmed) return false;

  if (trimmed.startsWith('data:image/webp')) return true;

  const cleanPath = stripQueryAndHash(trimmed);
  if (cleanPath.endsWith('.webp')) return true;

  return getFormatQueryParam(trimmed) === 'webp';
}

export function isAvifImageUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  if (!trimmed) return false;

  if (trimmed.startsWith('data:image/avif')) return true;

  const cleanPath = stripQueryAndHash(trimmed);
  if (cleanPath.endsWith('.avif')) return true;

  return getFormatQueryParam(trimmed) === 'avif';
}

export function isGenuinePhotoCdnUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url.startsWith('//') ? `https:${url}` : url);
    return GENUINE_CDN_HOST_PATTERN.test(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function isDisallowedNonThumbnailFormat(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim();
  if (!trimmed) return true;
  const lower = trimmed.toLowerCase();

  if (lower.includes('{{') && lower.includes('}}')) return true;

  // Never allow local filesystem URIs, app content URIs, blob URLs, or executable schemes
  if (
    lower.startsWith('file:') ||
    lower.startsWith('content:') ||
    lower.startsWith('blob:') ||
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:')
  ) {
    return true;
  }

  if (lower.startsWith('data:')) {
    if (
      lower.startsWith('data:image/svg+xml') ||
      lower.startsWith('data:image/gif;base64,r0lgod') ||
      lower.startsWith('data:text/')
    ) {
      return true;
    }
    // Allow valid raster data URLs (jpeg, jpg, png, webp, avif, non-tracking gif)
    return !/^data:image\/(?:jpe?g|png|webp|avif|gif);base64,/i.test(lower);
  }

  const cleanPath = stripQueryAndHash(lower);
  if (NON_IMAGE_EXTENSION_PATTERN.test(cleanPath)) {
    return true;
  }

  return false;
}

export function validateImageUrlSyntax(
  url?: string | null,
  options: { allowDataUri?: boolean; allowHttpUpgrade?: boolean } = {}
): { valid: boolean; normalizedUrl?: string; reason?: string } {
  const { allowDataUri = false, allowHttpUpgrade = true } = options;
  if (!url || typeof url !== 'string' || !url.trim()) {
    return { valid: false, reason: 'Image URL is empty.' };
  }

  const trimmed = url.trim();
  if (trimmed.includes('{{') || /["'<>\\\r\n]/.test(trimmed)) {
    return { valid: false, reason: 'Image URL contains invalid or unresolved characters.' };
  }

  if (trimmed.startsWith('data:')) {
    if (!allowDataUri) {
      return { valid: false, reason: 'Data URI must be uploaded to obtain a public HTTPS image URL.' };
    }
    if (isDisallowedNonThumbnailFormat(trimmed)) {
      return { valid: false, reason: 'Unsupported data URI image format (allowed: JPG, JPEG, PNG, WebP, AVIF).' };
    }
    return { valid: true, normalizedUrl: trimmed };
  }

  if (isDisallowedNonThumbnailFormat(trimmed)) {
    return { valid: false, reason: 'Unsupported or local image URI format.' };
  }

  let candidate = trimmed;
  if (candidate.startsWith('//')) {
    candidate = `https:${candidate}`;
  } else if (allowHttpUpgrade && candidate.startsWith('http://')) {
    candidate = `https://${candidate.slice(7)}`;
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { valid: false, reason: `Unsupported protocol '${parsed.protocol}'.` };
    }
    if (!parsed.hostname || parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return { valid: false, reason: 'Local/loopback image hostnames cannot be published to Blogger.' };
    }
    return { valid: true, normalizedUrl: parsed.toString() };
  } catch {
    return { valid: false, reason: 'Malformed image URL.' };
  }
}

export function inferDimensionsFromUrl(url: string): { width?: number; height?: number } {
  const whMatch = url.match(/\/w(\d+)-h(\d+)(?:-[^/]*)?\//i);
  if (whMatch) {
    return { width: parseInt(whMatch[1], 10), height: parseInt(whMatch[2], 10) };
  }
  const eqWhMatch = url.match(/=w(\d+)-h(\d+)(?:-[^&#/?]*)?(?:[?#]|$)/i);
  if (eqWhMatch) {
    return { width: parseInt(eqWhMatch[1], 10), height: parseInt(eqWhMatch[2], 10) };
  }
  const sMatch = url.match(/\/s(\d+)(?:-[^/]*)?\//i);
  if (sMatch) {
    const size = parseInt(sMatch[1], 10);
    return { width: size, height: size };
  }
  const eqSMatch = url.match(/=s(\d+)(?:-[^&#/?]*)?(?:[?#]|$)/i);
  if (eqSMatch) {
    const size = parseInt(eqSMatch[1], 10);
    return { width: size, height: size };
  }
  try {
    const parsed = new URL(url.startsWith('//') ? `https:${url}` : url);
    const wParam = parsed.searchParams.get('w') || parsed.searchParams.get('width');
    const hParam = parsed.searchParams.get('h') || parsed.searchParams.get('height');
    const qw = wParam && /^\d+$/.test(wParam) ? parseInt(wParam, 10) : undefined;
    const qh = hParam && /^\d+$/.test(hParam) ? parseInt(hParam, 10) : undefined;
    if (qw !== undefined || qh !== undefined) {
      return { width: qw, height: qh };
    }
  } catch {
    // ignore URL parse errors
  }
  return {};
}

export function isStandardAdBannerDimensions(width?: number, height?: number): boolean {
  if (!width || !height) return false;
  return STANDARD_AD_DIMENSION_PAIRS.some(
    ([aw, ah]) => (width === aw && height === ah) || (width <= 180 && height <= 60)
  );
}

/**
 * Identifies unwanted UI icons, play buttons, logos, social share icons, tracking pixels,
 * and advertisement banners inside imported HTML or candidate lists — while preserving
 * genuine large article PNGs (infographics, charts, screenshots).
 */
export function isUnwantedUiOrAdImage(candidate: {
  src: string;
  alt?: string;
  title?: string;
  className?: string;
  id?: string;
  width?: number;
  height?: number;
}): boolean {
  const src = (candidate.src || '').trim();
  if (!src) return true;

  const cleanPath = stripQueryAndHash(src);
  if (cleanPath.endsWith('.ico') || cleanPath.endsWith('.svg')) {
    return true;
  }

  if (AD_OR_TRACKER_URL_PATTERN.test(src)) return true;

  try {
    const parsed = new URL(src.startsWith('//') ? `https:${src}` : src);
    const host = parsed.hostname.toLowerCase();
    if (ICON_CDN_HOST_PATTERN.test(host) || parsed.pathname.toLowerCase().includes('/images/core/emoji/')) {
      return true;
    }
  } catch {
    // ignore URL parse errors
  }

  if (AD_OR_UNRELATED_FILENAME_PATTERN.test(cleanPath) || EXACT_UI_ICON_FILENAME_PATTERN.test(cleanPath)) {
    return true;
  }

  const alt = (candidate.alt || '').trim();
  const title = (candidate.title || '').trim();
  const labelText = `${alt} ${title}`.trim();
  if (
    labelText &&
    /^(advertisement|sponsored(\s+(ad|banner|content))?|ad\s*banner|promo\s*banner|ads|buy\s+now|shop\s+now|download(\s+now)?|play(\s+button|\s+icon|\s+video)?|watch(\s+now|\s+video)?|logo|site\s+logo|favicon|share\s+(on\s+)?(facebook|twitter|whatsapp|telegram|pinterest|linkedin)|▶\ufe0f?)$/i.test(
      labelText
    )
  ) {
    return true;
  }

  const marker = `${candidate.className || ''} ${candidate.id || ''}`.trim();
  if (
    marker &&
    /(^|[-_\s])(ad|ads|advert|advertisement|ad-banner|promo-banner|sponsor-banner|adsense|adsterra|play[-_]?(btn|button|icon|overlay)|video-play|favicon|site-logo|brand-logo|header-logo|footer-logo|social[-_]?icon|share[-_]?icon|badge|avatar|emoji|smiley|spinner|loader|watermark)([-_\s]|$)/i.test(
      marker
    )
  ) {
    return true;
  }

  const inferred = inferDimensionsFromUrl(src);
  const w = candidate.width ?? inferred.width;
  const h = candidate.height ?? inferred.height;

  // Tracking pixels / tiny icons
  if ((w !== undefined && w <= 2) || (h !== undefined && h <= 2)) {
    return true;
  }

  // Standard IAB ad banner dimensions
  if (isStandardAdBannerDimensions(w, h)) {
    return true;
  }

  // Small PNG/GIF UI icon / badge / button heuristic (preserves large PNG infographics/screenshots!)
  const isIconFormat = isPngImageUrl(src) || cleanPath.endsWith('.gif');
  if (isIconFormat) {
    if (w !== undefined && h !== undefined && w <= 128 && h <= 128) {
      return true;
    }
    if ((w !== undefined && w <= 96) || (h !== undefined && h <= 96)) {
      return true;
    }
    if (/\/(?:icons?|emojis?|badges?|buttons?|logos?|assets\/ui)\//i.test(cleanPath)) {
      return true;
    }
  }

  return false;
}

export function isAdOrUnrelatedImageCandidate(candidate: ThumbnailCandidate): boolean {
  if (candidate.isAdOrUnrelated) return true;
  return isUnwantedUiOrAdImage(candidate);
}

function getRolePriorityBonus(role: ThumbnailCandidateRole | undefined, orderIndex: number): number {
  switch (role) {
    case 'og_image':
      return 24_000;
    case 'metadata':
      return 20_000;
    case 'hero':
      return 10_000;
    case 'article':
      return Math.max(2_000, 6_000 - orderIndex * 250);
    case 'media_thumbnail':
      return 1_000;
    default:
      return orderIndex === 0 ? 10_000 : Math.max(2_000, 6_000 - orderIndex * 250);
  }
}

function scoreCandidate(candidate: ThumbnailCandidate, orderIndex: number): number {
  const src = candidate.src.trim();
  let score = getRolePriorityBonus(candidate.role, orderIndex);

  // Format priority: JPG/JPEG gets highest bonus; extensionless CDN photos next; WebP/AVIF next; valid PNG preserved cleanly; GIF penalized
  if (isJpgImageUrl(src)) {
    score += 6_500;
  } else if (isWebpImageUrl(src) || isAvifImageUrl(src)) {
    score += 3_500;
  } else if (isPngImageUrl(src)) {
    score += 2_000;
  } else {
    const cleanPath = stripQueryAndHash(src);
    if (cleanPath.endsWith('.gif')) {
      score -= 2_000;
    } else if (isGenuinePhotoCdnUrl(src)) {
      score += 4_500;
    } else {
      score += 1_500;
    }
  }

  // Known Blogger / genuine content CDN bonus
  if (isGenuinePhotoCdnUrl(src)) {
    score += 500;
  }

  // Dimension scoring (explicit dimensions or Blogger path size like /w640-h534/)
  const inferred = inferDimensionsFromUrl(src);
  const w = candidate.width ?? inferred.width;
  const h = candidate.height ?? inferred.height;

  if (w !== undefined && h !== undefined) {
    if (w <= 120 || h <= 120) {
      score -= 4_000; // Likely icon/badge/avatar/micro-thumb
    } else if (w >= 300 && h >= 200) {
      score += 1_500 + Math.min(2_000, Math.round((w * h) / 1000));
    } else {
      score += Math.min(1_000, Math.round((w * h) / 500));
    }
  } else if (w !== undefined) {
    score += w <= 120 ? -4_000 : Math.min(1_500, w);
  }

  // Slight tie-breaker preferring earlier DOM/list position among equivalent candidates
  score -= orderIndex * 0.1;

  return score;
}

/**
 * Selects the ordered list of valid Main Post Image candidates (best first).
 * - Prioritizes og:image / source post thumbnail metadata & top hero image; media$thumbnail is strictly fallback.
 * - Supports valid JPG, JPEG, PNG, and WebP images; prefers JPG/JPEG when available without rejecting valid PNGs.
 * - Ignores ads, tracking pixels, icons, logos, play buttons, and unrelated embedded images.
 */
export function rankMainThumbnailCandidates(
  candidates: Array<string | ThumbnailCandidate | null | undefined>,
  options: { jpgOnly?: boolean } = {}
): string[] {
  const normalizedList: ThumbnailCandidate[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < candidates.length; i++) {
    const item = candidates[i];
    if (!item) continue;
    const candidate: ThumbnailCandidate =
      typeof item === 'string' ? { src: item, index: i } : { ...item, index: item.index ?? i };

    const src = (candidate.src || '').trim();
    if (!src || seen.has(src)) continue;
    seen.add(src);

    if (isDisallowedNonThumbnailFormat(src)) continue;

    // Ignore ads, trackers, logos, play buttons, icons, and unrelated images
    if (isAdOrUnrelatedImageCandidate(candidate)) continue;

    if (options.jpgOnly && !isJpgImageUrl(src)) continue;

    normalizedList.push(candidate);
  }

  if (normalizedList.length === 0) return [];

  return normalizedList
    .map((candidate, idx) => ({
      src: candidate.src.trim(),
      score: scoreCandidate(candidate, idx),
    }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.src);
}

/**
 * Selects the best Main Post Image URL to serve as the Blogger post thumbnail.
 * - Prioritizes og:image / source post thumbnail metadata & top hero image; media$thumbnail is strictly fallback.
 * - Prefers JPG/JPEG images when available while preserving valid PNG and WebP images.
 * - Ignores ads, tracking pixels, icons, logos, play buttons, and unrelated embedded images.
 */
export function selectMainThumbnailImage(
  candidates: Array<string | ThumbnailCandidate | null | undefined>,
  options: { jpgOnly?: boolean } = {}
): string | null {
  const ranked = rankMainThumbnailCandidates(candidates, options);
  return ranked.length > 0 ? ranked[0] : null;
}

function extractFirstSrcFromSrcset(srcset?: string | null): string {
  if (!srcset) return '';
  const parts = srcset.split(/,(?=\s*(?:https?:\/\/|\/\/|\/|data:image\/))/i);
  for (const part of parts) {
    const url = part.trim().split(/\s+/)[0]?.trim();
    if (url && !url.startsWith('data:image/svg+xml') && !url.startsWith('data:image/gif;base64,r0lgod')) {
      return url;
    }
  }
  return '';
}

function isPlaceholderUrl(url?: string | null): boolean {
  if (!url) return true;
  const lower = url.trim().toLowerCase();
  if (!lower) return true;
  if (lower.startsWith('data:image/svg+xml')) return true;
  if (lower.startsWith('data:image/gif;base64,r0lgod')) return true;
  if (/\/(blank|spacer|transparent|pixel|1x1|loading|spinner|placeholder)\.(gif|png|jpg|webp|svg)(\?|$)/i.test(lower)) {
    return true;
  }
  return false;
}

/**
 * Extracts image candidates directly from an HTML fragment (skipping <script>, <style>, <iframe>, <noscript>,
 * ad/promo/footer containers), recovering lazy-loaded attributes, and returns the best Main Post Image URL.
 */
export function selectMainThumbnailImageFromHtml(html?: string | null): string | null {
  if (!html || typeof html !== 'string') return null;

  // Strip executable/embed/hidden/ad/player blocks before scanning <img> tags
  const cleanedHtml = html
    .replace(/<(script|style|noscript|iframe|svg|template)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<aside\b[^>]*\b(?:ad-slot-wrapper|data-ad-slot|data-app-ad)\b[^>]*>[\s\S]*?<\/aside>/gi, ' ')
    .replace(/<ins\b[^>]*adsbygoogle[\s\S]*?<\/ins>/gi, ' ');

  const candidates: ThumbnailCandidate[] = [];
  const imgRegex = /<img\b([^>]*)>/gi;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = imgRegex.exec(cleanedHtml)) !== null) {
    const attrs = match[1] || '';
    const getAttr = (name: string): string => {
      const rx = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
      const m = rx.exec(attrs);
      return (m?.[1] || m?.[2] || m?.[3] || '').trim();
    };

    const lazyCandidates = [
      getAttr('src'),
      getAttr('data-src'),
      getAttr('data-original'),
      getAttr('data-lazy-src'),
      getAttr('data-lazyload'),
      getAttr('data-url'),
      getAttr('data-hi-res-src'),
      extractFirstSrcFromSrcset(getAttr('srcset')),
      extractFirstSrcFromSrcset(getAttr('data-srcset')),
    ];

    const src = lazyCandidates.find((c) => c && !isPlaceholderUrl(c)) || '';
    if (!src || src.includes('{{')) continue;

    const alt = getAttr('alt');
    const title = getAttr('title');
    const className = getAttr('class');
    const id = getAttr('id');
    const wStr = getAttr('width') || getAttr('data-original-width');
    const hStr = getAttr('height') || getAttr('data-original-height');
    const w = /^\d+$/.test(wStr) ? parseInt(wStr, 10) : undefined;
    const h = /^\d+$/.test(hStr) ? parseInt(hStr, 10) : undefined;

    const marker = `${className} ${id}`;
    const isAdOrUi = /(^|[-_\s])(ad|ads|advert|advertisement|ad-banner|promo|sponsor|play-icon|play-btn|play-button|badge|avatar|emoji|logo)([-_\s]|$)/i.test(
      marker
    );

    candidates.push({
      src,
      alt,
      title,
      className,
      id,
      width: w,
      height: h,
      isAdOrUnrelated: isAdOrUi,
      role: idx === 0 ? 'hero' : 'article',
      index: idx++,
    });
  }

  return selectMainThumbnailImage(candidates);
}
