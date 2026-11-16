import * as cheerio from 'cheerio';
import { verifyPublicImageUrl, validateUrlForSsrf } from './imageVerificationService';
import {
  getBloggerImageHostConfig,
  uploadAndVerifyImageOnBloggerHost,
} from './bloggerImageHostService';
import { normalizeImageUrl, normalizeSrcset } from './importedHtmlSanitizer';

export interface ImportedImageResolutionResult {
  html: string;
  verifiedUrls: string[];
  warnings: string[];
}

function isSecurityOrNonImageFailure(errorMsg?: string): boolean {
  if (!errorMsg) return false;
  const lower = errorMsg.toLowerCase();
  return (
    lower.includes('security violation') ||
    lower.includes('rejected internal') ||
    lower.includes('rejected private') ||
    lower.includes('insecure protocol') ||
    lower.includes('invalid content-type') ||
    lower.includes('malformed') ||
    lower.includes('embedded credentials')
  );
}

function isHardBrokenFailure(errorMsg?: string): boolean {
  if (!errorMsg) return false;
  const lower = errorMsg.toLowerCase();
  return (
    lower.includes('http 404') ||
    lower.includes('http 410') ||
    lower.includes('unable to resolve host') ||
    lower.includes('empty body')
  );
}

async function resolveSingleImageUrl(
  rawUrl: string,
  options: {
    baseUrl?: string;
    callerToken?: string;
    hasImageHost: boolean;
  }
): Promise<{ url: string | null; warning?: string }> {
  const normalized = normalizeImageUrl(rawUrl, options.baseUrl);
  if (!normalized) {
    return { url: null, warning: `Skipped invalid image URL: ${rawUrl}` };
  }

  // Handle inline data:image/* if present
  if (normalized.startsWith('data:image/')) {
    if (options.hasImageHost && options.callerToken) {
      const uploaded = await uploadAndVerifyImageOnBloggerHost({
        imageBase64OrDataUrl: normalized,
        fileName: 'imported-article-image.jpg',
        callerBearerToken: options.callerToken,
      });
      if (uploaded.success && uploaded.verified && uploaded.imageUrl) {
        return { url: uploaded.imageUrl };
      }
    }
    return { url: normalized };
  }

  // Upgrade http:// to https:// and test verification first
  const httpsCandidate = normalized.startsWith('http://')
    ? `https://${normalized.slice(7)}`
    : normalized;

  const verification = await verifyPublicImageUrl(httpsCandidate, {
    timeoutMs: 6000,
    maxRedirects: 3,
  });

  if (verification.isValid && verification.verifiedUrl) {
    return { url: verification.verifiedUrl };
  }

  // Reject immediately on SSRF / security / non-image MIME failures
  if (isSecurityOrNonImageFailure(verification.error)) {
    return {
      url: null,
      warning: `Blocked unsafe or non-image URL (${httpsCandidate}): ${verification.error}`,
    };
  }

  // If http:// -> https:// upgrade failed due to TLS/network error, try SSRF-safe check
  if (normalized.startsWith('http://')) {
    try {
      const parsedHttp = new URL(normalized);
      const ssrfCheckOnUpgrade = await validateUrlForSsrf(`https://${parsedHttp.host}${parsedHttp.pathname}`);
      if (!ssrfCheckOnUpgrade.safe) {
        return { url: null, warning: `Blocked unsafe HTTP image host: ${normalized}` };
      }
      // Keep original http:// only if TLS upgrade failed due to non-TLS host (not 404/ENOTFOUND)
      if (!isHardBrokenFailure(verification.error)) {
        return { url: normalized };
      }
    } catch {
      return { url: null };
    }
  }

  // For hard 404/410/DNS failures, report broken URL
  if (isHardBrokenFailure(verification.error)) {
    return {
      url: null,
      warning: `Unreachable image (${httpsCandidate}): ${verification.error}`,
    };
  }

  // For 403/429/timeout (e.g., third-party CDN blocking datacenter requests), verify SSRF safety and keep URL
  const ssrfCheck = await validateUrlForSsrf(httpsCandidate);
  if (ssrfCheck.safe) {
    return { url: httpsCandidate };
  }

  return { url: null, warning: ssrfCheck.error || `Invalid image URL: ${httpsCandidate}` };
}

/**
 * Ensures all <img> src and srcset URLs inside sanitized imported HTML are
 * SSRF-safe, HTTPS-upgraded where possible, and valid for Blogger publishing.
 */
export async function resolveAndVerifyImportedArticleImages(
  sanitizedHtml: string,
  options: {
    baseUrl?: string;
    callerToken?: string;
  } = {}
): Promise<ImportedImageResolutionResult> {
  if (!sanitizedHtml || !sanitizedHtml.includes('<img')) {
    return { html: sanitizedHtml, verifiedUrls: [], warnings: [] };
  }

  const hostConfig = getBloggerImageHostConfig();
  const hasImageHost = Boolean(hostConfig.blogId);

  const $ = cheerio.load(`<div id="__publish_root__">${sanitizedHtml}</div>`);
  const $root = $('#__publish_root__');
  const imgElements = $root.find('img').toArray();

  const verifiedUrls: string[] = [];
  const warnings: string[] = [];

  // Process images in bounded batches to avoid overwhelming network or timing out
  const BATCH_SIZE = 5;
  for (let i = 0; i < imgElements.length; i += BATCH_SIZE) {
    const batch = imgElements.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (imgEl) => {
        const $img = $(imgEl);
        const rawSrc = $img.attr('src') || '';
        const rawSrcset = $img.attr('srcset');

        const primaryRes = rawSrc
          ? await resolveSingleImageUrl(rawSrc, {
              baseUrl: options.baseUrl,
              callerToken: options.callerToken,
              hasImageHost,
            })
          : { url: null };

        let finalSrc = primaryRes.url;

        // Clean srcset entries and optionally recover src from a working srcset candidate
        let finalSrcset: string | undefined;
        if (rawSrcset) {
          const normSrcset = normalizeSrcset(rawSrcset, options.baseUrl);
          if (normSrcset) {
            const parts = normSrcset.split(',').map((p) => p.trim()).filter(Boolean);
            const cleanedParts: string[] = [];

            for (const part of parts) {
              const match = part.match(/^(\S+)(?:\s+(.+))?$/);
              if (!match) continue;
              const entryUrl = match[1];
              const descriptor = match[2];

              if (entryUrl.startsWith('data:image/')) {
                cleanedParts.push(part);
                continue;
              }

              const httpsEntry = entryUrl.startsWith('http://')
                ? `https://${entryUrl.slice(7)}`
                : entryUrl;
              const ssrf = await validateUrlForSsrf(httpsEntry);
              if (!ssrf.safe) continue;

              // If primary src failed (e.g. 404), try recovering from srcset
              if (!finalSrc) {
                const altCheck = await resolveSingleImageUrl(httpsEntry, {
                  baseUrl: options.baseUrl,
                  callerToken: options.callerToken,
                  hasImageHost,
                });
                if (altCheck.url) {
                  finalSrc = altCheck.url;
                }
              }

              cleanedParts.push(descriptor ? `${httpsEntry} ${descriptor}` : httpsEntry);
            }

            if (cleanedParts.length > 0) {
              finalSrcset = cleanedParts.join(', ');
            }
          }
        }

        if (!finalSrc) {
          if (primaryRes.warning) warnings.push(primaryRes.warning);
          // Do not leave a broken or SSRF-unsafe <img> tag
          $img.remove();
          return;
        }

        $img.attr('src', finalSrc);
        if (finalSrcset) {
          $img.attr('srcset', finalSrcset);
        } else {
          $img.removeAttr('srcset');
        }

        if (!verifiedUrls.includes(finalSrc)) {
          verifiedUrls.push(finalSrc);
        }
      })
    );
  }

  return {
    html: ($root.html() || '').trim(),
    verifiedUrls,
    warnings,
  };
}
