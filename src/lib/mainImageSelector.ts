/**
 * Centralized Blogger Main Post Image & Thumbnail Selection Logic.
 *
 * Rules enforced:
 * 1. Always select the actual Main Post Image (JPG/JPEG) as the Blogger thumbnail.
 * 2. NEVER select PNG images (e.g., icons, overlays, buttons like "119514.png") as the post thumbnail.
 * 3. Ignore advertisement images, tracking pixels, badges/buttons, and unrelated embedded images.
 * 4. Preserve all images inside the post content (selection does NOT delete body images).
 */

export interface ThumbnailCandidate {
  src: string;
  alt?: string;
  srcset?: string;
  width?: number;
  height?: number;
  isAdOrUnrelated?: boolean;
  index?: number;
}

const AD_OR_TRACKER_URL_PATTERN =
  /(doubleclick\.net|googlesyndication\.com|googleadservices\.com|google-analytics\.com|googletagmanager\.com|adnxs\.com|criteo\.|taboola\.com|outbrain\.com|mgid\.com|adsterra\.com|effectivecpmnetwork\.com|highperformanceformat\.com|cheflobesofficer\.com|propellerads\.com|popads\.net|monetag\.com|amazon-adsystem\.com|revcontent\.com|media\.net|feedburner\.com\/~r\/|\/tracker\/)/i;

const AD_OR_UNRELATED_FILENAME_PATTERN =
  /(^|[\/_\-.])(ad[-_]?banner|adsense|ad[-_]?slot|ad[-_]?unit|sponsored|promo[-_]?banner|buy[-_]?now|shop[-_]?now|download[-_]?(btn|button)|play[-_]?(btn|button|icon)|watch[-_]?(btn|button|now)|subscribe[-_]?(btn|banner)|favicon|sprite|emoji|smilies|spacer|blank|pixel|1x1|beacon|loading|spinner|728x90|300x250|468x60|160x600|320x50)([\/_\-.]|$)/i;

const GENUINE_CDN_HOST_PATTERN =
  /(^|\.)(blogger\.googleusercontent\.com|bp\.blogspot\.com|googleusercontent\.com|ggpht\.com|wp\.com|wordpress\.com|imgur\.com|cloudinary\.com|unsplash\.com|pexels\.com)$/i;

function stripQueryAndHash(url: string): string {
  return url.split('#')[0].split('?')[0].trim().toLowerCase();
}

export function isPngImageUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  if (!trimmed) return false;

  if (trimmed.startsWith('data:image/png')) return true;

  const cleanPath = stripQueryAndHash(trimmed);
  if (cleanPath.endsWith('.png')) return true;

  try {
    const parsed = new URL(trimmed.startsWith('//') ? `https:${trimmed}` : trimmed);
    const fmt = (
      parsed.searchParams.get('format') ||
      parsed.searchParams.get('fm') ||
      parsed.searchParams.get('ext') ||
      ''
    ).toLowerCase();
    if (fmt === 'png') return true;
  } catch {
    // Non-absolute URL handled by path suffix above
  }

  return false;
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

  try {
    const parsed = new URL(trimmed.startsWith('//') ? `https:${trimmed}` : trimmed);
    const fmt = (
      parsed.searchParams.get('format') ||
      parsed.searchParams.get('fm') ||
      parsed.searchParams.get('ext') ||
      ''
    ).toLowerCase();
    if (fmt === 'jpg' || fmt === 'jpeg') return true;
  } catch {
    // Non-absolute URL handled by path suffix above
  }

  return false;
}

export function isDisallowedNonThumbnailFormat(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim().toLowerCase();
  if (!trimmed) return true;

  if (
    trimmed.startsWith('data:image/svg+xml') ||
    trimmed.startsWith('data:image/gif;base64,r0lgod') ||
    trimmed.startsWith('data:text/')
  ) {
    return true;
  }

  if (isPngImageUrl(trimmed)) return true;

  const cleanPath = stripQueryAndHash(trimmed);
  if (cleanPath.endsWith('.svg') || cleanPath.endsWith('.ico')) {
    return true;
  }

  return false;
}

export function isAdOrUnrelatedImageCandidate(candidate: ThumbnailCandidate): boolean {
  if (candidate.isAdOrUnrelated) return true;
  const src = (candidate.src || '').trim();
  if (!src) return true;

  if (AD_OR_TRACKER_URL_PATTERN.test(src)) return true;
  if (AD_OR_UNRELATED_FILENAME_PATTERN.test(src)) return true;

  const alt = (candidate.alt || '').trim();
  if (alt && /^(advertisement|sponsored|ad|buy now|shop now|download now|play button)$/i.test(alt)) {
    return true;
  }

  return false;
}

function inferDimensionsFromUrl(url: string): { width?: number; height?: number } {
  const whMatch = url.match(/\/w(\d+)-h(\d+)(?:-[^/]*)?\//i);
  if (whMatch) {
    return { width: parseInt(whMatch[1], 10), height: parseInt(whMatch[2], 10) };
  }
  const sMatch = url.match(/\/s(\d+)(?:-c)?(?:-[^/]*)?\//i);
  if (sMatch) {
    const size = parseInt(sMatch[1], 10);
    return { width: size, height: size };
  }
  return {};
}

function scoreCandidate(candidate: ThumbnailCandidate, orderIndex: number): number {
  const src = candidate.src.trim();
  let score = 0;

  // Format priority: JPG/JPEG strongly preferred; non-JPG non-PNG (e.g. WebP) fallback only
  if (isJpgImageUrl(src)) {
    score += 10_000;
  } else {
    const cleanPath = stripQueryAndHash(src);
    if (cleanPath.endsWith('.gif')) {
      score -= 500;
    } else {
      score += 1_000;
    }
  }

  // Known Blogger / genuine content CDN bonus
  try {
    const parsed = new URL(src.startsWith('//') ? `https:${src}` : src);
    if (GENUINE_CDN_HOST_PATTERN.test(parsed.hostname)) {
      score += 500;
    }
  } catch {
    // ignore URL parse errors for relative or data URLs
  }

  // Dimension scoring (explicit dimensions or Blogger path size like /w640-h534/)
  const inferred = inferDimensionsFromUrl(src);
  const w = candidate.width ?? inferred.width;
  const h = candidate.height ?? inferred.height;

  if (w !== undefined && h !== undefined) {
    if (w <= 80 || h <= 80) {
      score -= 3_000; // Likely icon/badge/avatar
    } else if (w >= 300 && h >= 200) {
      score += 1_500 + Math.min(2_000, Math.round((w * h) / 1000));
    } else {
      score += Math.min(1_000, Math.round((w * h) / 500));
    }
  } else if (w !== undefined) {
    score += w <= 80 ? -3_000 : Math.min(1_500, w);
  }

  // Slight tie-breaker preferring earlier DOM position among equivalent candidates
  score -= orderIndex * 0.01;

  return score;
}

/**
 * Selects the best Main Post Image URL to serve as the Blogger post thumbnail.
 * - Never selects PNG images (e.g., "119514.png").
 * - Ignores ads, tracking pixels, icons, and unrelated embedded images.
 * - Prefers JPG/JPEG images from genuine Blogger/CDN sources.
 */
export function selectMainThumbnailImage(
  candidates: Array<string | ThumbnailCandidate | null | undefined>,
  options: { jpgOnly?: boolean } = {}
): string | null {
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

    // Strict Rule: NEVER select PNG images or disallowed formats as post thumbnail
    if (isDisallowedNonThumbnailFormat(src)) continue;

    // Strict Rule: Ignore ads, trackers, badges, and unrelated images
    if (isAdOrUnrelatedImageCandidate(candidate)) continue;

    if (options.jpgOnly && !isJpgImageUrl(src)) continue;

    normalizedList.push(candidate);
  }

  if (normalizedList.length === 0) return null;

  // If any JPG/JPEG candidate exists, restrict winner pool to JPG/JPEG only
  const jpgCandidates = normalizedList.filter((c) => isJpgImageUrl(c.src));
  const pool = jpgCandidates.length > 0 ? jpgCandidates : normalizedList;

  let bestCandidate = pool[0];
  let bestScore = scoreCandidate(bestCandidate, 0);

  for (let i = 1; i < pool.length; i++) {
    const score = scoreCandidate(pool[i], i);
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = pool[i];
    }
  }

  return bestCandidate.src.trim();
}

/**
 * Extracts image candidates directly from an HTML fragment (skipping <script>, <style>, <iframe>, <noscript>,
 * ad/promo/footer containers) and returns the best JPG/JPEG Main Post Image URL.
 */
export function selectMainThumbnailImageFromHtml(html?: string | null): string | null {
  if (!html || typeof html !== 'string') return null;

  // Strip executable/embed/hidden blocks before scanning <img> tags
  const cleanedHtml = html
    .replace(/<(script|style|noscript|iframe|svg|template)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<ins\b[^>]*adsbygoogle[\s\S]*?<\/ins>/gi, ' ');

  const candidates: ThumbnailCandidate[] = [];
  const imgRegex = /<img\b([^>]*)>/gi;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = imgRegex.exec(cleanedHtml)) !== null) {
    const attrs = match[1] || '';
    const srcMatch = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
    const src = (srcMatch?.[1] || srcMatch?.[2] || srcMatch?.[3] || '').trim();
    if (!src || src.includes('{{')) continue;

    const altMatch = /\balt\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs);
    const classMatch = /\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs);
    const idMatch = /\bid\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs);
    const wMatch = /\b(?:data-original-)?width\s*=\s*(?:"(\d+)"|'(\d+)'|(\d+))/i.exec(attrs);
    const hMatch = /\b(?:data-original-)?height\s*=\s*(?:"(\d+)"|'(\d+)'|(\d+))/i.exec(attrs);

    const marker = `${classMatch?.[1] || classMatch?.[2] || ''} ${idMatch?.[1] || idMatch?.[2] || ''}`;
    const isAdOrUi = /(^|[-_\s])(ad|ads|advert|banner|promo|sponsor|play-icon|badge|avatar|emoji)([-_\s]|$)/i.test(
      marker
    );

    candidates.push({
      src,
      alt: altMatch?.[1] || altMatch?.[2] || '',
      width: wMatch ? parseInt(wMatch[1] || wMatch[2] || wMatch[3], 10) : undefined,
      height: hMatch ? parseInt(hMatch[1] || hMatch[2] || hMatch[3], 10) : undefined,
      isAdOrUnrelated: isAdOrUi,
      index: idx++,
    });
  }

  return selectMainThumbnailImage(candidates);
}
