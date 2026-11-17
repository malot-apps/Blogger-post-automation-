export interface BloggerBlog {
  id: string;
  name: string;
  description?: string;
  url: string;
  published?: string;
  updated?: string;
  posts?: {
    totalItems?: number;
  };
}

export interface BloggerPostResponse {
  id: string;
  blog: {
    id: string;
  };
  title: string;
  content: string;
  url: string;
  published: string;
  labels?: string[];
  author?: {
    displayName?: string;
    image?: { url?: string };
  };
}

export interface CreatePostParams {
  blogId: string;
  title: string;
  content: string;
  labels?: string[];
  isDraft?: boolean;
}

export interface GoogleTokenInfo {
  issued_to?: string;
  audience?: string;
  user_id?: string;
  scope?: string;
  expires_in?: number;
  email?: string;
  verified_email?: boolean;
  access_type?: string;
}

/**
 * Helper to parse Google API error responses and convert them into clear, production-ready messages.
 */
function parseGoogleApiError(status: number, errorBody: string, defaultAction: string): Error {
  let message = '';
  let reason = '';
  try {
    const parsed = JSON.parse(errorBody);
    if (parsed.error?.message) {
      message = parsed.error.message;
    }
    if (parsed.error?.errors?.[0]?.reason) {
      reason = parsed.error.errors[0].reason;
    }
  } catch {
    // ignore JSON parse error
  }

  // 1. Blogger API Disabled
  if (
    reason === 'accessNotConfigured' ||
    reason === 'SERVICE_DISABLED' ||
    message.toLowerCase().includes('blogger api has not been used') ||
    message.toLowerCase().includes('is disabled')
  ) {
    return new Error(
      'Blogger API disabled: Google Blogger API v3 is not enabled in your Google Cloud Project. Please enable it in Google Cloud Console > APIs & Services > Library > search "Blogger API v3".'
    );
  }

  // 2. Token Expired / Invalid
  if (status === 401 || reason === 'authError' || reason === 'invalid_grant') {
    return new Error(
      'Token expired: Your Google session or OAuth token has expired. Please sign in again.'
    );
  }

  // 3. Insufficient Blogger Permission
  if (
    reason === 'insufficientPermissions' ||
    (status === 403 && message.toLowerCase().includes('insufficient'))
  ) {
    return new Error(
      'Insufficient Blogger permission: Your Google account did not grant Blogger permissions or lacks author/admin rights for this blog. Please sign in again and check the box to allow Blogger management.'
    );
  }

  // 4. Rate limit
  if (reason === 'rateLimitExceeded' || reason === 'dailyLimitExceeded') {
    return new Error('Blogger API quota limit exceeded: Daily or rate limit reached. Please wait a moment or try again later.');
  }

  // 5. Blog not found
  if (status === 404 || reason === 'notFound') {
    return new Error('No Blogger blogs found: The specified Blogger blog was not found or was deleted. Please refresh your blog list.');
  }

  // 6. Unauthorized user / generic permission denied
  if (status === 403) {
    return new Error(
      `Unauthorized user: Blogger API permission denied (${message || 'Access denied'}). Ensure your Google account has permission to manage this blog.`
    );
  }

  return new Error(message || `${defaultAction} (${status})`);
}

/**
 * Validates a Google OAuth access token using Google's tokeninfo endpoint.
 * Ensures the token is active, not expired, and contains the required Blogger scope.
 */
export async function validateGoogleAccessToken(accessToken: string): Promise<GoogleTokenInfo> {
  if (!accessToken || typeof accessToken !== 'string') {
    throw new Error('OAuth not configured: No access token provided.');
  }

  const tokenUrl = `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`;
  const response = await fetch(tokenUrl, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    if (response.status === 400 || response.status === 401) {
      throw new Error('Token expired: Google OAuth token is invalid or has expired. Please sign in again.');
    }
    throw new Error(`Failed to validate Google token with OAuth provider (${response.status}).`);
  }

  const tokenInfo = (await response.json()) as GoogleTokenInfo;

  // Verify that required Blogger scope was granted
  const scopes = (tokenInfo.scope || '').split(' ');
  const hasBloggerScope = scopes.some(
    (s) => s === 'https://www.googleapis.com/auth/blogger'
  );

  if (!hasBloggerScope) {
    throw new Error(
      'Insufficient Blogger permission: The authenticated session is missing Blogger permission (https://www.googleapis.com/auth/blogger). Please sign in again and check the box to allow Blogger management.'
    );
  }

  return tokenInfo;
}

/**
 * Fetch all Blogger blogs owned or accessible by the authenticated user.
 */
export async function fetchUserBlogs(accessToken: string): Promise<BloggerBlog[]> {
  const url = 'https://www.googleapis.com/blogger/v3/users/self/blogs';
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw parseGoogleApiError(response.status, errorBody, 'Failed to fetch Blogger blogs');
  }

  const data = await response.json();
  return (data.items || []) as BloggerBlog[];
}

/**
 * Publish a new post to a specific Blogger blog on behalf of the authenticated user.
 */
export async function createAndPublishBloggerPost(
  accessToken: string,
  params: CreatePostParams
): Promise<BloggerPostResponse> {
  const isDraft = params.isDraft ?? false;
  const url = `https://www.googleapis.com/blogger/v3/blogs/${encodeURIComponent(
    params.blogId
  )}/posts?isDraft=${isDraft}`;

  const payload: Record<string, unknown> = {
    kind: 'blogger#post',
    title: params.title,
    content: params.content,
  };

  if (params.labels && params.labels.length > 0) {
    payload.labels = params.labels;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw parseGoogleApiError(response.status, errorBody, 'Blogger API post creation failed');
  }

  const data = (await response.json()) as BloggerPostResponse;
  return data;
}

import * as cheerio from 'cheerio';
import {
  decodeHtmlEntities,
  normalizeImageUrl,
  sanitizeImportedHtml,
  type SanitizedArticleImage,
} from './importedHtmlSanitizer';
import { selectMainThumbnailImage, type ThumbnailCandidate } from '../lib/mainImageSelector';
import { validateUrlForSsrf } from './imageVerificationService';

export interface ImportedPostItem {
  id: string;
  blogId?: string;
  title: string;
  content: string;
  summary: string;
  url: string;
  published: string;
  updated?: string;
  labels: string[];
  images: string[];
  imageDetails?: SanitizedArticleImage[];
  thumbnailUrl?: string;
  authorName?: string;
}

export interface ImportSourceBlogResult {
  blog: {
    id?: string;
    name: string;
    url: string;
    description?: string;
    totalPosts?: number;
  };
  posts: ImportedPostItem[];
  nextPageToken?: string;
}

export function extractImagesFromHtml(html: string, baseUrl?: string): string[] {
  return sanitizeImportedHtml(html, { baseUrl }).images.map((img) => img.src);
}

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
}

function cleanArticleTitle(rawTitle?: string): string {
  if (!rawTitle) return 'Untitled Post';
  const cleaned = decodeHtmlEntities(stripHtmlTags(rawTitle));
  return cleaned || 'Untitled Post';
}

function normalizeBloggerSourceUrl(sourceUrl: string): { normalizedUrl: string; blogRootUrl: string } {
  let candidate = sourceUrl.trim();
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }
  const parsed = new URL(candidate);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only HTTP/HTTPS Blogger URLs are supported.');
  }
  parsed.searchParams.delete('m');
  parsed.hash = '';
  const blogRootUrl = parsed.origin;
  const normalizedUrl = parsed.toString().replace(/\/+$/, '');
  return { normalizedUrl, blogRootUrl };
}

/**
 * Safely upgrades tiny Blogger `media$thumbnail` size tokens (e.g. `/s72-c/`, `/w72-h72-p-k-no-nu/`,
 * `=s72-c`, `=w72-h72-c`) to high-resolution `s1600`, while preserving full-size and non-Blogger URLs untouched.
 */
export function upgradeBloggerThumbnailUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return rawUrl;
  let upgraded = rawUrl.trim();

  // Path-based Blogger thumbnail tokens: /s72-c/, /s72-w400-h225-c/, /w72-h72-p-k-no-nu/
  upgraded = upgraded.replace(
    /\/(?:s(\d+)(?:-[a-z0-9]+)*|w(\d+)-h(\d+)(?:-[a-z0-9]+)*)\//gi,
    (fullMatch, sVal?: string, wVal?: string, hVal?: string) => {
      const sNum = sVal ? parseInt(sVal, 10) : 0;
      const wNum = wVal ? parseInt(wVal, 10) : 0;
      const hNum = hVal ? parseInt(hVal, 10) : 0;
      if ((sNum > 0 && sNum <= 320) || (wNum > 0 && hNum > 0 && wNum <= 320 && hNum <= 320)) {
        return '/s1600/';
      }
      return fullMatch;
    }
  );

  // Query/suffix Googleusercontent tokens: =s72-c, =w72-h72-p-k-no-nu
  upgraded = upgraded.replace(
    /=(?:s(\d+)(?:-[a-z0-9]+)*|w(\d+)-h(\d+)(?:-[a-z0-9]+)*)(?=[?#]|$)/gi,
    (fullMatch, sVal?: string, wVal?: string, hVal?: string) => {
      const sNum = sVal ? parseInt(sVal, 10) : 0;
      const wNum = wVal ? parseInt(wVal, 10) : 0;
      const hNum = hVal ? parseInt(hVal, 10) : 0;
      if ((sNum > 0 && sNum <= 320) || (wNum > 0 && hNum > 0 && wNum <= 320 && hNum <= 320)) {
        return '=s1600';
      }
      return fullMatch;
    }
  );

  return upgraded;
}

function collectJsonLdImageUrls(node: unknown, out: string[]): void {
  if (!node) return;
  if (typeof node === 'string') {
    out.push(node);
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      collectJsonLdImageUrls(item, out);
    }
    return;
  }
  if (typeof node === 'object') {
    const rec = node as Record<string, unknown>;
    if (typeof rec.url === 'string') out.push(rec.url);
    if (typeof rec.contentUrl === 'string') out.push(rec.contentUrl);
    if (typeof rec.thumbnailUrl === 'string') out.push(rec.thumbnailUrl);
    if (rec.image) collectJsonLdImageUrls(rec.image, out);
    if (rec.primaryImageOfPage) collectJsonLdImageUrls(rec.primaryImageOfPage, out);
    if (Array.isArray(rec['@graph'])) {
      for (const graphItem of rec['@graph']) {
        collectJsonLdImageUrls(graphItem, out);
      }
    }
  }
}

/**
 * Extracts `og:image`, `twitter:image`, `link[rel=image_src]`, and Schema.org JSON-LD `image`
 * from an HTML document or fragment BEFORE sanitization strips <meta> and <script> tags.
 */
export function extractEmbeddedPostMetadataImages(rawHtml: string, baseUrl?: string): ThumbnailCandidate[] {
  if (!rawHtml || typeof rawHtml !== 'string') return [];

  const candidates: ThumbnailCandidate[] = [];
  const seen = new Set<string>();
  const addCandidate = (
    rawUrl: string | undefined,
    role: ThumbnailCandidate['role'],
    width?: number,
    height?: number
  ) => {
    if (!rawUrl) return;
    const norm = normalizeImageUrl(rawUrl, baseUrl);
    if (!norm || seen.has(norm)) return;
    seen.add(norm);
    candidates.push({ src: norm, role, width, height, index: candidates.length });
  };

  try {
    const $ = cheerio.load(rawHtml);

    const ogSelectors = [
      'meta[property="og:image:secure_url"]',
      'meta[property="og:image:url"]',
      'meta[property="og:image"]',
      'meta[name="og:image"]',
      'meta[name="twitter:image:src"]',
      'meta[name="twitter:image"]',
      'meta[property="twitter:image"]',
    ];
    for (const sel of ogSelectors) {
      $(sel).each((_, el) => {
        const content = $(el).attr('content');
        addCandidate(content, 'og_image');
      });
    }

    $('link[rel="image_src"]').each((_, el) => {
      addCandidate($(el).attr('href'), 'metadata');
    });

    $('script[type="application/ld+json"]').each((_, el) => {
      const jsonText = $(el).html() || $(el).text() || '';
      if (!jsonText.trim()) return;
      try {
        const parsed = JSON.parse(jsonText);
        const urls: string[] = [];
        collectJsonLdImageUrls(parsed, urls);
        for (const u of urls) {
          addCandidate(u, 'metadata');
        }
      } catch {
        // ignore malformed JSON-LD in source HTML
      }
    });
  } catch {
    // ignore HTML parsing errors
  }

  return candidates;
}

async function fetchSourcePostPageMetaImages(postUrl?: string): Promise<ThumbnailCandidate[]> {
  if (!postUrl || !/^https?:\/\//i.test(postUrl)) return [];
  const httpsUrl = postUrl.startsWith('http://') ? `https://${postUrl.slice(7)}` : postUrl;

  try {
    const ssrf = await validateUrlForSsrf(httpsUrl);
    if (!ssrf.safe) return [];

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);

    try {
      const res = await fetch(httpsUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent': 'Blogger-Post-Automation-AI/1.0',
        },
      });
      if (!res.ok) return [];
      const html = await res.text();
      // Only inspect <head> + early hero section to stay fast and avoid footer/sidebar widgets
      const headEndIdx = html.search(/<\/head>/i);
      const headSlice = headEndIdx !== -1 ? html.slice(0, headEndIdx + 7) : html.slice(0, 65_536);
      return extractEmbeddedPostMetadataImages(headSlice, httpsUrl);
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return [];
  }
}

function buildMainThumbnailCandidatePool(params: {
  pageMetaImages?: ThumbnailCandidate[];
  embeddedMetaImages?: ThumbnailCandidate[];
  apiImages?: Array<{ url?: string }>;
  sanitizedImages: SanitizedArticleImage[];
  mediaThumbnailUrl?: string;
  baseUrl?: string;
}): ThumbnailCandidate[] {
  const pool: ThumbnailCandidate[] = [];
  let idx = 0;

  for (const cand of params.pageMetaImages || []) {
    pool.push({ ...cand, index: idx++ });
  }
  for (const cand of params.embeddedMetaImages || []) {
    pool.push({ ...cand, index: idx++ });
  }
  for (const apiImg of params.apiImages || []) {
    if (!apiImg?.url) continue;
    const norm = normalizeImageUrl(apiImg.url, params.baseUrl);
    if (norm) {
      pool.push({ src: norm, role: 'metadata', index: idx++ });
    }
  }

  params.sanitizedImages.forEach((img, imgIdx) => {
    pool.push({
      ...img,
      role: imgIdx === 0 ? 'hero' : 'article',
      index: idx++,
    });
  });

  if (params.mediaThumbnailUrl) {
    const normalizedThumb = normalizeImageUrl(params.mediaThumbnailUrl, params.baseUrl);
    if (normalizedThumb) {
      const upgraded = upgradeBloggerThumbnailUrl(normalizedThumb);
      pool.push({
        src: upgraded,
        role: 'media_thumbnail',
        index: idx++,
      });
    }
  }

  return pool;
}

/**
 * Imports posts from a source Blogger site URL using Blogger API v3 (if authenticated/available)
 * or via the public Blogger Atom/JSON feed.
 */
export async function importBloggerPostsFromSource({
  sourceUrl,
  accessToken,
  maxResults = 25,
  pageToken,
}: {
  sourceUrl: string;
  accessToken?: string;
  maxResults?: number;
  pageToken?: string;
}): Promise<ImportSourceBlogResult> {
  const { blogRootUrl } = normalizeBloggerSourceUrl(sourceUrl);
  const clampedMax = Math.max(1, Math.min(Number(maxResults) || 25, 50));

  // Attempt 1: Blogger API v3 by URL (if access token provided)
  if (accessToken) {
    try {
      const byUrlEndpoint = `https://www.googleapis.com/blogger/v3/blogs/byurl?url=${encodeURIComponent(blogRootUrl)}`;
      const blogRes = await fetch(byUrlEndpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      if (blogRes.ok) {
        const blogData = await blogRes.json();
        const blogId = blogData.id;
        const resolvedBlogUrl = blogData.url || blogRootUrl;

        let postsUrl = `https://www.googleapis.com/blogger/v3/blogs/${encodeURIComponent(blogId)}/posts?maxResults=${clampedMax}&fetchImages=true`;
        if (pageToken && !/^\d+$/.test(pageToken)) {
          postsUrl += `&pageToken=${encodeURIComponent(pageToken)}`;
        }

        const postsRes = await fetch(postsUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        });

        if (postsRes.ok) {
          const postsData = await postsRes.json();
          const rawItems = (postsData.items || []) as Array<{
            id: string;
            title: string;
            content?: string;
            url: string;
            published: string;
            updated?: string;
            labels?: string[];
            images?: Array<{ url?: string }>;
            author?: { displayName?: string };
          }>;

          // Fetch og:image/twitter:image page metadata in bounded batches
          const pageMetaList: ThumbnailCandidate[][] = new Array(rawItems.length).fill([]);
          const META_BATCH = 5;
          for (let i = 0; i < rawItems.length; i += META_BATCH) {
            const batch = rawItems.slice(i, i + META_BATCH);
            const results = await Promise.all(
              batch.map((item) => fetchSourcePostPageMetaImages(item.url))
            );
            results.forEach((res, offset) => {
              pageMetaList[i + offset] = res;
            });
          }

          const posts: ImportedPostItem[] = rawItems.map((item, idx) => {
            const rawHtml = item.content || '';
            const baseUrl = item.url || resolvedBlogUrl;
            const embeddedMetaImages = extractEmbeddedPostMetadataImages(rawHtml, baseUrl);
            const sanitized = sanitizeImportedHtml(rawHtml, { baseUrl });
            const images = sanitized.images.map((img) => img.src);

            const candidatePool = buildMainThumbnailCandidatePool({
              pageMetaImages: pageMetaList[idx],
              embeddedMetaImages,
              apiImages: item.images,
              sanitizedImages: sanitized.images,
              baseUrl,
            });
            const selectedThumb = selectMainThumbnailImage(candidatePool) || undefined;

            return {
              id: item.id,
              blogId,
              title: cleanArticleTitle(item.title),
              content: sanitized.html,
              summary: sanitized.plainText.slice(0, 240),
              url: item.url,
              published: item.published,
              updated: item.updated,
              labels: item.labels || [],
              images,
              imageDetails: sanitized.images,
              thumbnailUrl: selectedThumb,
              authorName: item.author?.displayName,
            };
          });

          return {
            blog: {
              id: blogData.id,
              name: decodeHtmlEntities(blogData.name || 'Imported Blog'),
              url: resolvedBlogUrl,
              description: blogData.description ? decodeHtmlEntities(blogData.description) : undefined,
              totalPosts: blogData.posts?.totalItems,
            },
            posts,
            nextPageToken: postsData.nextPageToken,
          };
        }
      }
    } catch (err) {
      console.warn('API v3 byurl attempt had error, falling back to public feed:', err);
    }
  }

  // Attempt 2: Public Blogger JSON Feed (works for any public Blogger site without extra credentials)
  try {
    const startIndex = pageToken && /^\d+$/.test(pageToken) ? parseInt(pageToken, 10) : 1;
    let feedUrl = `${blogRootUrl}/feeds/posts/default?alt=json&max-results=${clampedMax}`;
    if (startIndex > 1) {
      feedUrl += `&start-index=${startIndex}`;
    }

    const feedRes = await fetch(feedUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Blogger-Post-Automation-AI/1.0',
      },
    });

    if (!feedRes.ok) {
      throw new Error(`Could not access source blog feed (${feedRes.status}). Verify the URL is a valid Blogger blog.`);
    }

    const feedData = await feedRes.json();
    const feed = feedData.feed || {};
    const blogTitle = decodeHtmlEntities(feed.title?.$t || 'Blogger Blog') || 'Blogger Blog';
    const totalPostsStr = feed.openSearch$totalResults?.$t;
    const totalPosts = totalPostsStr ? parseInt(totalPostsStr, 10) : undefined;

    interface FeedCategory {
      term?: string;
    }
    interface FeedLink {
      rel?: string;
      href?: string;
    }
    interface FeedEntry {
      id?: { $t?: string };
      title?: { $t?: string };
      content?: { $t?: string };
      summary?: { $t?: string };
      published?: { $t?: string };
      updated?: { $t?: string };
      category?: FeedCategory[];
      link?: FeedLink[];
      media$thumbnail?: { url?: string };
      author?: Array<{ name?: { $t?: string } }>;
    }

    const feedLinks = (feed.link || []) as FeedLink[];
    const nextFeedHref = feedLinks.find((l) => l.rel === 'next')?.href;
    let nextPageToken: string | undefined;
    if (nextFeedHref) {
      try {
        const nextUrl = new URL(nextFeedHref);
        const nextStart = nextUrl.searchParams.get('start-index');
        if (nextStart && /^\d+$/.test(nextStart)) {
          nextPageToken = nextStart;
        }
      } catch {
        // ignore malformed next link
      }
    }

    const entries = (feed.entry || []) as FeedEntry[];

    // Fetch og:image / twitter:image metadata from post permalinks in bounded batches
    const pageMetaList: ThumbnailCandidate[][] = new Array(entries.length).fill([]);
    const META_BATCH = 5;
    for (let i = 0; i < entries.length; i += META_BATCH) {
      const batch = entries.slice(i, i + META_BATCH);
      const results = await Promise.all(
        batch.map((entry) => {
          const altHref = entry.link?.find((l) => l.rel === 'alternate')?.href;
          return fetchSourcePostPageMetaImages(altHref);
        })
      );
      results.forEach((res, offset) => {
        pageMetaList[i + offset] = res;
      });
    }

    const posts: ImportedPostItem[] = entries.map((entry, index) => {
      const rawHtml = entry.content?.$t || entry.summary?.$t || '';
      const altLink = entry.link?.find((l) => l.rel === 'alternate')?.href || blogRootUrl;

      const embeddedMetaImages = extractEmbeddedPostMetadataImages(rawHtml, altLink);
      const sanitized = sanitizeImportedHtml(rawHtml, { baseUrl: altLink });
      const images = sanitized.images.map((img) => img.src);

      const candidatePool = buildMainThumbnailCandidatePool({
        pageMetaImages: pageMetaList[index],
        embeddedMetaImages,
        sanitizedImages: sanitized.images,
        mediaThumbnailUrl: entry.media$thumbnail?.url,
        baseUrl: altLink,
      });

      const selectedThumb = selectMainThumbnailImage(candidatePool) || undefined;

      const labels = (entry.category || []).map((c) => c.term || '').filter(Boolean);
      const entryId = entry.id?.$t?.split('.post-')[1] || entry.id?.$t || `post_${index}_${Date.now()}`;

      return {
        id: entryId,
        title: cleanArticleTitle(entry.title?.$t),
        content: sanitized.html,
        summary: sanitized.plainText.slice(0, 240),
        url: altLink,
        published: entry.published?.$t || new Date().toISOString(),
        updated: entry.updated?.$t,
        labels,
        images,
        imageDetails: sanitized.images,
        thumbnailUrl: selectedThumb,
        authorName: entry.author?.[0]?.name?.$t,
      };
    });

    return {
      blog: {
        name: blogTitle,
        url: blogRootUrl,
        totalPosts,
      },
      posts,
      nextPageToken,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to import posts from source blog';
    throw new Error(`Import error: ${msg}. Please ensure the blog URL is accessible and active.`);
  }
}

