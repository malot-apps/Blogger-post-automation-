import { verifyPublicImageUrl, ImageVerificationResult } from './imageVerificationService';

/**
 * ARCHITECTURAL COMMENT #1:
 * ============================================================================
 * Why the secondary Blogger site is used as the image host:
 * ----------------------------------------------------------------------------
 * 1. Global Google CDN: Google Blogger automatically stores and optimizes images
 *    on Google's global Content Delivery Network (e.g., blogger.googleusercontent.com
 *    and bp.blogspot.com). These URLs are high-speed, cached globally, and free.
 * 2. Separation of Concerns: The secondary/host Blogger site serves exclusively
 *    as a media repository (draft/media assets). The main blog remains pristine,
 *    free from temporary test uploads or orphan artifacts.
 * 3. Prevention of Bloat & SEO Preservation: Direct base64 data URLs in Blogger posts
 *    cause multi-megabyte HTML payloads that crash RSS feeds, break email newsletters,
 *    and severely hurt mobile Google Search ranking. Using a dedicated image host
 *    ensures all images are lean, standard HTTPS CDN links.
 * ============================================================================
 */

export interface BloggerImageHostConfig {
  blogId: string;
  baseUrl?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
}

export interface HostedImageUploadResult {
  success: boolean;
  imageUrl?: string;
  verified: boolean;
  error?: string;
  details?: {
    contentType?: string;
    contentLength?: number;
    hostBlogId: string;
    postId?: string;
  };
}

/**
 * Reads server-side configuration for the dedicated Blogger image-host blog.
 */
export function getBloggerImageHostConfig(): BloggerImageHostConfig {
  const blogId = process.env.BLOGGER_IMAGE_HOST_BLOG_ID?.trim() || '';
  const baseUrl = process.env.BLOGGER_IMAGE_HOST_BASE_URL?.trim() || '';
  const clientId = process.env.BLOGGER_CLIENT_ID?.trim() || '';
  const clientSecret = process.env.BLOGGER_CLIENT_SECRET?.trim() || '';
  const refreshToken = process.env.BLOGGER_REFRESH_TOKEN?.trim() || '';

  return {
    blogId,
    baseUrl,
    clientId,
    clientSecret,
    refreshToken,
  };
}

/**
 * Exchanges a server-side OAuth refresh token for a fresh Google access token.
 */
async function refreshServerAccessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string> {
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to refresh Blogger image-host access token (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error('OAuth token response missing access_token.');
  }

  return data.access_token as string;
}

/**
 * Resolves an active Blogger API access token using either the dedicated
 * server-side refresh token or the authenticated admin's session Bearer token.
 */
export async function getEffectiveBloggerToken(callerBearerToken?: string | null): Promise<string> {
  const config = getBloggerImageHostConfig();

  // Priority 1: Dedicated server-side OAuth credentials
  if (config.clientId && config.clientSecret && config.refreshToken) {
    try {
      return await refreshServerAccessToken(config.clientId, config.clientSecret, config.refreshToken);
    } catch (err: unknown) {
      console.warn('Dedicated image-host refresh token exchange failed; falling back to caller token:', err);
    }
  }

  // Priority 2: Caller's authenticated Google OAuth Bearer token
  if (callerBearerToken && callerBearerToken.trim().length > 0) {
    return callerBearerToken.trim();
  }

  throw new Error(
    'Blogger authentication missing: Neither server BLOGGER_REFRESH_TOKEN nor user OAuth Bearer token was provided.'
  );
}

/**
 * Extracts all image URLs from a Blogger post's JSON response and HTML content.
 */
function extractBloggerImageUrls(postData: Record<string, unknown>): string[] {
  const urls: string[] = [];

  // Check `images` array returned by Blogger v3 API
  if (Array.isArray(postData.images)) {
    for (const img of postData.images) {
      if (img && typeof img === 'object' && typeof (img as { url?: string }).url === 'string') {
        const u = (img as { url: string }).url.trim();
        if (u.startsWith('https://')) urls.push(u);
      }
    }
  }

  // Also parse post content HTML for Google CDN image src
  if (typeof postData.content === 'string') {
    const regex = /<img[^>]+src=["'](https:\/\/[^"']+)["']/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(postData.content)) !== null) {
      const foundUrl = match[1].trim();
      if (!urls.includes(foundUrl)) {
        urls.push(foundUrl);
      }
    }
  }

  return urls;
}

/**
 * Uploads an image to the dedicated secondary Blogger image-host blog,
 * retrieves the Blogger-generated public Google CDN URL, and verifies
 * its public accessibility before returning.
 */
export async function uploadAndVerifyImageOnBloggerHost({
  imageBase64OrDataUrl,
  mimeType = 'image/jpeg',
  fileName = 'asset.jpg',
  callerBearerToken,
  targetHostBlogId,
}: {
  imageBase64OrDataUrl: string;
  mimeType?: string;
  fileName?: string;
  callerBearerToken?: string | null;
  targetHostBlogId?: string;
}): Promise<HostedImageUploadResult> {
  const config = getBloggerImageHostConfig();
  const hostBlogId = targetHostBlogId || config.blogId;

  if (!hostBlogId) {
    return {
      success: false,
      verified: false,
      error:
        'Blogger Image Host unconfigured: BLOGGER_IMAGE_HOST_BLOG_ID environment variable is missing and no target blog was specified.',
    };
  }

  // 1. Prepare clean base64 and data URL
  let cleanBase64 = imageBase64OrDataUrl.trim();
  let effectiveMime = mimeType.toLowerCase();

  if (cleanBase64.startsWith('data:')) {
    const match = cleanBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      effectiveMime = match[1].toLowerCase();
      cleanBase64 = match[2];
    }
  }

  // 2. Validate file type
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
  if (!allowedMimes.includes(effectiveMime)) {
    return {
      success: false,
      verified: false,
      error: `Unsupported image MIME type '${effectiveMime}'. Allowed types: ${allowedMimes.join(', ')}`,
    };
  }

  // 3. Validate file size (Max 20MB)
  const estimatedBytes = Math.round((cleanBase64.length * 3) / 4);
  const maxBytes = 20 * 1024 * 1024; // 20MB
  if (estimatedBytes > maxBytes) {
    return {
      success: false,
      verified: false,
      error: `Image size exceeds the maximum limit of 20MB (received ~${(estimatedBytes / (1024 * 1024)).toFixed(1)}MB).`,
    };
  }

  // 4. Acquire Blogger API Access Token
  let accessToken: string;
  try {
    accessToken = await getEffectiveBloggerToken(callerBearerToken);
  } catch (authErr: unknown) {
    const msg = authErr instanceof Error ? authErr.message : 'Authentication failed';
    return {
      success: false,
      verified: false,
      error: `Failed to authenticate with Blogger image host: ${msg}`,
    };
  }

  // 5. Upload image to the dedicated image-host Blogger site as a media draft
  const postTitle = `[IMAGE-HOST-ASSET] ${fileName} (${new Date().toISOString()})`;
  const fullDataUrl = `data:${effectiveMime};base64,${cleanBase64}`;
  const postHtmlContent = `<div class="separator" style="clear: both; text-align: center;"><a href="${fullDataUrl}" style="margin-left: 1em; margin-right: 1em;"><img border="0" data-original-name="${encodeURIComponent(
    fileName
  )}" src="${fullDataUrl}" /></a></div>`;

  const bloggerApiUrl = `https://www.googleapis.com/blogger/v3/blogs/${encodeURIComponent(hostBlogId)}/posts?isDraft=true`;

  let postResponse: Response;
  try {
    postResponse = await fetch(bloggerApiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        kind: 'blogger#post',
        title: postTitle,
        content: postHtmlContent,
        labels: ['image-host-media'],
      }),
    });
  } catch (networkErr: unknown) {
    const msg = networkErr instanceof Error ? networkErr.message : 'Network error';
    return {
      success: false,
      verified: false,
      error: `Failed to connect to Blogger API on image host blog: ${msg}`,
    };
  }

  if (!postResponse.ok) {
    const errorBody = await postResponse.text();
    return {
      success: false,
      verified: false,
      error: `Blogger image host rejected upload (${postResponse.status}): ${errorBody}`,
    };
  }

  const postData = (await postResponse.json()) as Record<string, unknown>;
  const postId = typeof postData.id === 'string' ? postData.id : undefined;

  // 6. Retrieve Blogger-generated public Google CDN image URL
  const extractedUrls = extractBloggerImageUrls(postData);

  if (extractedUrls.length === 0) {
    return {
      success: false,
      verified: false,
      error: 'Blogger image host processed the upload but did not return a public Google CDN image URL.',
      details: { hostBlogId, postId },
    };
  }

  // Select primary Blogger-generated CDN URL
  const candidateUrl = extractedUrls[0];

  // 7. Verify the Blogger-generated URL server-side (SSRF, HTTPS, 2xx, image/*)
  const verification: ImageVerificationResult = await verifyPublicImageUrl(candidateUrl, {
    timeoutMs: 10000,
    maxRedirects: 3,
  });

  if (!verification.isValid || !verification.verifiedUrl) {
    return {
      success: false,
      verified: false,
      imageUrl: candidateUrl,
      error: `Image URL was generated by Blogger but failed server-side public accessibility verification: ${
        verification.error || 'Resource unreachable'
      }`,
      details: {
        hostBlogId,
        postId,
        contentType: verification.contentType,
      },
    };
  }

  return {
    success: true,
    imageUrl: verification.verifiedUrl,
    verified: true,
    details: {
      contentType: verification.contentType,
      contentLength: verification.contentLength,
      hostBlogId,
      postId,
    },
  };
}
