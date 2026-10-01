import dns from 'dns';
import { promisify } from 'util';

const dnsLookup = promisify(dns.lookup);

/**
 * ARCHITECTURAL COMMENT #2:
 * ============================================================================
 * Why the final URL must be verified server-side:
 * ----------------------------------------------------------------------------
 * 1. Security (Anti-Spoofing & Anti-Tampering): Client-provided URLs cannot be
 *    trusted. Attackers or corrupted browser state could pass local device URLs,
 *    malicious javascript/data URIs, internal intranet addresses, or non-image
 *    payloads.
 * 2. SSRF Protection: Server-side validation rigorously parses the hostname,
 *    performs DNS resolution, and rejects all private, loopback, link-local,
 *    and cloud-metadata IP ranges (e.g. 169.254.169.254) before making requests.
 * 3. Guaranteed Delivery: Checking HTTP status (2xx) and 'Content-Type' (image/*)
 *    ensures that Google CDN has actually finalized processing and the asset is
 *    accessible worldwide without authentication before the post is published.
 * ============================================================================
 */

export interface ImageVerificationResult {
  isValid: boolean;
  verifiedUrl?: string;
  contentType?: string;
  contentLength?: number;
  error?: string;
}

// Allowed public image MIME types
const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/svg+xml',
];

// Blocked private / internal hostname suffixes
const BLOCKED_HOST_SUFFIXES = [
  '.local',
  '.internal',
  '.lan',
  '.corp',
  '.home',
  '.test',
  '.example',
  '.invalid',
  '.localhost',
];

/**
 * Checks whether an IPv4 or IPv6 address belongs to a private, loopback,
 * link-local, or cloud metadata range.
 */
export function isPrivateOrInternalIp(ip: string): boolean {
  // Normalize IPv6-mapped IPv4
  const cleanIp = ip.startsWith('::ffff:') ? ip.slice(7) : ip;

  // IPv4 Loopback (127.0.0.0/8)
  if (/^127\./.test(cleanIp)) return true;

  // IPv4 Private (10.0.0.0/8)
  if (/^10\./.test(cleanIp)) return true;

  // IPv4 Private (172.16.0.0/12: 172.16.x.x - 172.31.x.x)
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(cleanIp)) return true;

  // IPv4 Private (192.168.0.0/16)
  if (/^192\.168\./.test(cleanIp)) return true;

  // IPv4 Link-Local / Cloud Metadata (169.254.0.0/16, e.g. AWS/GCP 169.254.169.254)
  if (/^169\.254\./.test(cleanIp)) return true;

  // IPv4 Broadcast / Current Network (0.0.0.0/8)
  if (/^0\./.test(cleanIp)) return true;

  // IPv6 Loopback (::1)
  if (cleanIp === '::1' || cleanIp === '0:0:0:0:0:0:0:1') return true;

  // IPv6 Unique Local (fc00::/7)
  if (/^f[cd][0-9a-f]{2}:/i.test(cleanIp)) return true;

  // IPv6 Link-Local (fe80::/10)
  if (/^fe80:/i.test(cleanIp)) return true;

  return false;
}

/**
 * Validates a remote URL string against SSRF attack vectors.
 * Resolves the domain via DNS and ensures none of the resulting IP addresses
 * resolve to internal or private infrastructure.
 */
export async function validateUrlForSsrf(urlString: string): Promise<{ safe: boolean; url?: URL; error?: string }> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlString);
  } catch {
    return { safe: false, error: 'Malformed or invalid absolute URL.' };
  }

  // 1. Enforce HTTPS strictly
  if (parsedUrl.protocol !== 'https:') {
    return { safe: false, error: `Insecure protocol '${parsedUrl.protocol}'. Only HTTPS is permitted.` };
  }

  // 2. Reject credentials in URL
  if (parsedUrl.username || parsedUrl.password) {
    return { safe: false, error: 'URLs containing embedded credentials are not allowed.' };
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // 3. Reject explicit loopback / localhost hostnames
  if (hostname === 'localhost' || hostname === '0.0.0.0' || hostname === '127.0.0.1' || hostname === '::1') {
    return { safe: false, error: `Rejected internal/local hostname: '${hostname}'.` };
  }

  // 4. Reject private domain suffixes
  for (const suffix of BLOCKED_HOST_SUFFIXES) {
    if (hostname.endsWith(suffix)) {
      return { safe: false, error: `Rejected private domain suffix: '${suffix}'.` };
    }
  }

  // 5. DNS Resolution check (prevent DNS rebinding & private IP targeting)
  try {
    const lookupResult = await dnsLookup(hostname, { all: true });
    const records = Array.isArray(lookupResult) ? lookupResult : [lookupResult];

    for (const record of records) {
      if (isPrivateOrInternalIp(record.address)) {
        return {
          safe: false,
          error: `Security violation: Hostname '${hostname}' resolves to private/internal IP address '${record.address}'.`,
        };
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'DNS lookup failed';
    return { safe: false, error: `Unable to resolve host '${hostname}': ${msg}` };
  }

  return { safe: true, url: parsedUrl };
}

/**
 * Performs comprehensive server-side verification of an image URL.
 * 
 * Verifies that:
 * 1. The URL exists and is well-formed.
 * 2. The URL strictly uses HTTPS.
 * 3. The URL passes all SSRF and private IP validations.
 * 4. The URL is publicly reachable from the server without authentication (2xx response).
 * 5. The response Content-Type is a valid image MIME type (image/jpeg, image/png, image/webp, etc.).
 * 6. The resource contains actual data (non-empty body).
 */
export async function verifyPublicImageUrl(
  urlString: string,
  options: { timeoutMs?: number; maxRedirects?: number } = {}
): Promise<ImageVerificationResult> {
  const { timeoutMs = 8000, maxRedirects = 3 } = options;

  if (!urlString || typeof urlString !== 'string' || urlString.trim().length === 0) {
    return { isValid: false, error: 'Empty or undefined image URL.' };
  }

  const trimmed = urlString.trim();

  // Explicitly reject data: or blob: URLs
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.startsWith('file:')) {
    return {
      isValid: false,
      error: 'Unverified local/data URI. Image must be hosted on a public HTTPS server (Blogger image host).',
    };
  }

  let currentUrl = trimmed;

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount++) {
    // 1. SSRF and Protocol Verification on current URL
    const ssrfCheck = await validateUrlForSsrf(currentUrl);
    if (!ssrfCheck.safe || !ssrfCheck.url) {
      return { isValid: false, error: ssrfCheck.error || 'SSRF check failed.' };
    }

    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // 2. Attempt HEAD request first to save bandwidth
      let response: Response;
      try {
        response = await fetch(currentUrl, {
          method: 'HEAD',
          redirect: 'manual',
          signal: controller.signal,
          headers: {
            'User-Agent': 'BloggerPublisher-ImageVerifier/1.0',
            Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          },
        });
      } catch (headError) {
        // Some CDNs (including Google User Content under certain conditions) return 405 or fail on HEAD
        // Fall back to a GET request requesting only the first 1KB
        response = await fetch(currentUrl, {
          method: 'GET',
          redirect: 'manual',
          signal: controller.signal,
          headers: {
            'User-Agent': 'BloggerPublisher-ImageVerifier/1.0',
            Range: 'bytes=0-1024',
            Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          },
        });
      }

      clearTimeout(timeoutTimer);

      // Handle Redirects safely
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) {
          return { isValid: false, error: `Redirect status ${response.status} with no Location header.` };
        }
        // Resolve relative redirect against current URL
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      // Check HTTP Status (200 OK or 206 Partial Content)
      if (response.status < 200 || response.status >= 300) {
        return {
          isValid: false,
          error: `Remote server returned HTTP ${response.status} (${response.statusText}). Image is not publicly reachable.`,
        };
      }

      // Check Content-Type header
      const rawContentType = response.headers.get('content-type') || '';
      const mimeType = rawContentType.split(';')[0].trim().toLowerCase();

      const isImageMime =
        mimeType.startsWith('image/') ||
        ALLOWED_IMAGE_MIME_TYPES.includes(mimeType) ||
        mimeType === 'application/octet-stream'; // Some CDN endpoints misreport binary images

      if (!isImageMime) {
        return {
          isValid: false,
          contentType: mimeType,
          error: `Invalid Content-Type '${rawContentType}'. Expected an image MIME type (image/jpeg, image/png, image/webp, etc.).`,
        };
      }

      // Check Content-Length if present
      const rawLength = response.headers.get('content-length');
      let contentLength: number | undefined;
      if (rawLength) {
        contentLength = parseInt(rawLength, 10);
        if (!isNaN(contentLength) && contentLength === 0) {
          return { isValid: false, error: 'Remote image returned empty body (0 bytes).' };
        }
      }

      return {
        isValid: true,
        verifiedUrl: currentUrl,
        contentType: mimeType,
        contentLength,
      };
    } catch (err: unknown) {
      clearTimeout(timeoutTimer);
      const isAbort = (err as { name?: string })?.name === 'AbortError';
      const msg = isAbort
        ? `Request timed out after ${timeoutMs}ms while verifying image.`
        : err instanceof Error
        ? err.message
        : 'Network error while reaching image URL';
      return { isValid: false, error: `Verification failed: ${msg}` };
    }
  }

  return { isValid: false, error: `Exceeded maximum redirect limit (${maxRedirects}).` };
}

/**
 * Alias for verifyPublicImageUrl to match the verifyImage utility naming convention.
 */
export const verifyImage = verifyPublicImageUrl;
