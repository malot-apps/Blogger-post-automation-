import { NextRequest, NextResponse } from 'next/server';
import { fetchUserBlogs, createAndPublishBloggerPost } from '@/src/server/bloggerService';
import { renderTemplate, renderImportedTemplate } from '@/src/server/templateService';
import { generateTitleFromCaption } from '@/src/lib/titleGenerator';
import { verifyImage } from '@/src/server/imageVerificationService';
import { uploadAndVerifyImageOnBloggerHost } from '@/src/server/bloggerImageHostService';
import { sanitizeImportedHtml, decodeHtmlEntities } from '@/src/server/importedHtmlSanitizer';
import {
  resolveAndVerifyImportedArticleImages,
  verifyAndPreserveArticleImageUrl,
} from '@/src/server/importedImageResolver';
import { selectMainThumbnailImage, isPngImageUrl } from '@/src/lib/mainImageSelector';
import { sanitizeAdsSettings, isLegacyDefaultTemplate } from '@/src/lib/adsSettings';

/**
 * ARCHITECTURAL COMMENT #1:
 * ============================================================================
 * Why the secondary Blogger site is used as the image host:
 * ----------------------------------------------------------------------------
 * 1. CDN Efficiency: Blogger automatically caches images on Google's high-speed
 *    CDN (*.blogger.googleusercontent.com / *.bp.blogspot.com).
 * 2. Clean Separation: Uploads remain isolated on a media container blog without
 *    polluting the public editorial blog with temporary draft assets.
 * 3. Prevention of Bloat & Mixed-Content: Eliminates multi-megabyte base64
 *    payloads that bloat Blogger post bodies, hurt Core Web Vitals, and damage SEO.
 * ============================================================================
 *
 * ARCHITECTURAL COMMENT #2:
 * ============================================================================
 * Why the final URL must be verified server-side:
 * ----------------------------------------------------------------------------
 * 1. Zero Trust: Browser clients cannot be trusted to self-certify URL validity.
 * 2. SSRF Protection: Prevents attackers from supplying internal/private IP targets
 *    (e.g., cloud metadata 169.254.169.254 or localhost).
 * 3. Reachability Guarantee: Verifies that the Google CDN asset actually exists,
 *    returns HTTP 200, and has an image MIME type without requiring authentication.
 * ============================================================================
 *
 * ARCHITECTURAL COMMENT #3:
 * ============================================================================
 * Why publishing is blocked when verification fails:
 * ----------------------------------------------------------------------------
 * 1. Editorial Integrity: Broken image icons degrade website trust, reader retention,
 *    and brand reputation.
 * 2. SEO Penalty: Google Search penalizes pages containing broken media or mixed content.
 * 3. Atomic Safety: Blogger has no multi-step rollback. Once a post is published,
 *    it is immediately syndicated to RSS readers, social cards, and subscribers.
 *    Publishing MUST be aborted if even one image fails verification.
 * ============================================================================
 */

export async function POST(req: NextRequest) {
  try {
    let token: string | null = null;

    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '').trim();
    }

    if (!token) {
      const cookieToken = req.cookies.get('blogger_access_token')?.value;
      if (cookieToken) {
        token = cookieToken.trim();
      }
    }

    if (!token) {
      return NextResponse.json(
        { error: 'OAuth not configured: Authentication required. Please sign in with Google.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      blogId,
      imageUrl,
      thumbnailUrl,
      caption,
      contentHtml,
      sourceUrl,
      isImported,
      title,
      metaDescription,
      labels,
      customTemplate,
      adsSettings,
      isDraft,
    } = body;

    const customMetaDescription =
      typeof metaDescription === 'string' && metaDescription.trim().length > 0
        ? metaDescription.trim()
        : undefined;

    const validatedAdsSettings = adsSettings ? sanitizeAdsSettings(adsSettings) : undefined;
    const effectiveTemplateInput =
      typeof customTemplate === 'string' && !isLegacyDefaultTemplate(customTemplate)
        ? customTemplate
        : undefined;

    if (!blogId || typeof blogId !== 'string') {
      return NextResponse.json(
        { error: 'Please select a destination Blogger blog.' },
        { status: 400 }
      );
    }

    // Step 2: Strict Multi-User Isolation Check - Verify that the blog belongs to the authenticated user
    const userBlogs = await fetchUserBlogs(token);
    const targetBlog = userBlogs.find((b) => b.id === blogId);
    if (!targetBlog) {
      return NextResponse.json(
        { error: 'Unauthorized user: You do not have permission to publish to this Blogger blog (blog not owned by your authenticated Google account).' },
        { status: 403 }
      );
    }

    // Parse labels helper shared by both paths
    let parsedLabels: string[] = [];
    if (Array.isArray(labels)) {
      parsedLabels = labels.map((l) => String(l).trim()).filter(Boolean);
    } else if (typeof labels === 'string' && labels.trim().length > 0) {
      parsedLabels = labels
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean);
    }

    // ========================================================================
    // IMPORTED ARTICLE PUBLISHING MODE (Preserves full article HTML & images)
    // ========================================================================
    if (isImported === true) {
      const rawArticleHtml =
        typeof contentHtml === 'string' && contentHtml.trim().length > 0
          ? contentHtml
          : typeof caption === 'string'
            ? caption
            : '';

      if (!rawArticleHtml.trim()) {
        return NextResponse.json(
          { error: 'Imported post content is empty and cannot be published.' },
          { status: 400 }
        );
      }

      const safeBaseUrl =
        typeof sourceUrl === 'string' && sourceUrl.trim().length > 0 ? sourceUrl.trim() : undefined;

      // Server-side authoritative sanitization (strips scripts, ads, trackers, affiliate links, unnecessary CSS)
      const sanitized = sanitizeImportedHtml(rawArticleHtml, { baseUrl: safeBaseUrl });

      // Resolve and verify every <img> src / srcset so URLs remain valid on Blogger
      const resolved = await resolveAndVerifyImportedArticleImages(sanitized.html, {
        baseUrl: safeBaseUrl,
        callerToken: token,
      });

      if (!resolved.html || resolved.html.trim().length === 0) {
        return NextResponse.json(
          { error: 'No valid article content remained after sanitization.' },
          { status: 400 }
        );
      }

      const rawTitle =
        typeof title === 'string' && title.trim().length > 0
          ? decodeHtmlEntities(title.trim())
          : '';
      const finalImportedTitle = rawTitle || generateTitleFromCaption(sanitized.plainText || 'Imported Post');

      const rawExplicitCandidate =
        (typeof imageUrl === 'string' && imageUrl.trim().length > 0 ? imageUrl.trim() : '') ||
        (typeof thumbnailUrl === 'string' && thumbnailUrl.trim().length > 0 ? thumbnailUrl.trim() : '');
      const validExplicitCandidate =
        rawExplicitCandidate && !isPngImageUrl(rawExplicitCandidate)
          ? selectMainThumbnailImage([{ src: rawExplicitCandidate, role: 'metadata' }]) || ''
          : '';

      let primaryImg = '';

      if (validExplicitCandidate) {
        // If explicit main image already appears in verified article images, reuse its verified URL directly
        const alreadyVerifiedMatch = resolved.imageDetails.find(
          (img) => img.src === validExplicitCandidate
        );
        if (alreadyVerifiedMatch) {
          primaryImg = alreadyVerifiedMatch.src;
        } else {
          const verifiedExplicit = await verifyAndPreserveArticleImageUrl(validExplicitCandidate, {
            baseUrl: safeBaseUrl,
            callerToken: token,
          });
          if (
            verifiedExplicit.url &&
            !isPngImageUrl(verifiedExplicit.url) &&
            selectMainThumbnailImage([verifiedExplicit.url])
          ) {
            primaryImg = verifiedExplicit.url;
          } else if (verifiedExplicit.warning) {
            resolved.warnings.push(verifiedExplicit.warning);
          }
        }
      }

      if (!primaryImg) {
        primaryImg = selectMainThumbnailImage(resolved.imageDetails) || '';
      }

      const selectedImgMeta =
        resolved.imageDetails.find((img) => img.src === primaryImg) ||
        sanitized.images.find((img) => img.src === primaryImg);
      const templatedPostHtml = renderImportedTemplate(effectiveTemplateInput, {
        title: finalImportedTitle,
        articleHtml: resolved.html,
        imageUrl: primaryImg,
        thumbnailUrl: primaryImg,
        firstImageAlt: selectedImgMeta?.alt,
        firstImageSrcset: selectedImgMeta?.srcset,
        metaDescription: customMetaDescription,
        sourceUrl: safeBaseUrl,
        publishedDate:
          typeof body.publishedDate === 'string' && body.publishedDate.trim().length > 0
            ? body.publishedDate.trim()
            : undefined,
      }, validatedAdsSettings);

      const publishedPost = await createAndPublishBloggerPost(token, {
        blogId,
        title: finalImportedTitle,
        content: templatedPostHtml,
        labels: parsedLabels.length > 0 ? parsedLabels : undefined,
        isDraft: Boolean(isDraft),
      });

      return NextResponse.json({
        success: true,
        warnings: resolved.warnings,
        post: {
          id: publishedPost.id,
          blogId: publishedPost.blog?.id || blogId,
          title: publishedPost.title,
          url: publishedPost.url,
          imageUrl: primaryImg,
          thumbnailUrl: primaryImg,
          published: publishedPost.published,
          labels: publishedPost.labels || parsedLabels,
          content: templatedPostHtml,
        },
      });
    }

    // Step 3: Validate image presence
    if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim().length === 0) {
      return NextResponse.json(
        { error: 'Please select or upload a main image for the post.' },
        { status: 400 }
      );
    }

    // Step 4: Validate caption
    if (!caption || typeof caption !== 'string' || caption.trim().length === 0) {
      return NextResponse.json(
        { error: 'Please enter a caption for your post.' },
        { status: 400 }
      );
    }

    // Step 5: Ensure Main Image is uploaded to dedicated Blogger host if supplied as raw base64 data
    let verifiedMainImageUrl = imageUrl.trim();

    if (verifiedMainImageUrl.startsWith('data:image/')) {
      const hostUpload = await uploadAndVerifyImageOnBloggerHost({
        imageBase64OrDataUrl: verifiedMainImageUrl,
        fileName: 'main-post-image.jpg',
        callerBearerToken: token,
      });

      if (!hostUpload.success || !hostUpload.verified || !hostUpload.imageUrl) {
        return NextResponse.json(
          {
            success: false,
            verified: false,
            error: `Publishing blocked: Failed to host and verify Main Image on Blogger image host: ${
              hostUpload.error || 'Upload failed'
            }`,
          },
          { status: 400 }
        );
      }
      verifiedMainImageUrl = hostUpload.imageUrl;
    }

    // ========================================================================
    // MANDATORY SERVER-SIDE VERIFICATION LOOP:
    // Re-verify Main Post Image ({{IMAGE_URL}}) using 'verifyImage' to ensure it
    // remains publicly accessible. Main Post Image is always used as the Blogger
    // post thumbnail and placed as the first image in the published post HTML.
    // ========================================================================
    const verification = await verifyImage(verifiedMainImageUrl);

    if (!verification.isValid || !verification.verifiedUrl) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          failedImage: 'Main Post Image',
          failedUrl: verifiedMainImageUrl,
          error: `Publishing blocked: Server-side verification loop failed for Main Post Image. ${
            verification.error || 'The image URL is not publicly accessible.'
          } Never publish a post containing broken, unverified, or private image URLs.`,
        },
        { status: 400 }
      );
    }

    verifiedMainImageUrl = verification.verifiedUrl;

    // Determine final title
    const finalTitle = (title && typeof title === 'string' && title.trim().length > 0)
      ? title.trim()
      : generateTitleFromCaption(caption);

    // Step 6: Render /templates/blogger-post-template.html using Main Post Image ({{IMAGE_URL}}) as thumbnail
    const postHtml = renderTemplate(effectiveTemplateInput, {
      title: finalTitle,
      imageUrl: verifiedMainImageUrl,
      thumbnailUrl: verifiedMainImageUrl,
      caption: caption.trim(),
      metaDescription: customMetaDescription,
    }, validatedAdsSettings);

    // Step 7: Call Blogger API v3 to create and publish post to THAT USER's selected blog
    const publishedPost = await createAndPublishBloggerPost(token, {
      blogId,
      title: finalTitle,
      content: postHtml,
      labels: parsedLabels.length > 0 ? parsedLabels : undefined,
      isDraft: Boolean(isDraft),
    });

    // Step 8: Return the real published URL and verified Main Post Image
    return NextResponse.json({
      success: true,
      post: {
        id: publishedPost.id,
        blogId: publishedPost.blog?.id || blogId,
        title: publishedPost.title,
        url: publishedPost.url,
        imageUrl: verifiedMainImageUrl,
        thumbnailUrl: verifiedMainImageUrl,
        published: publishedPost.published,
        labels: publishedPost.labels || parsedLabels,
        content: postHtml,
      },
    });
  } catch (error: unknown) {
    console.error('Publishing error:', error);
    const message = error instanceof Error ? error.message : 'Failed to publish to Blogger';
    let status = 500;
    if (message.includes('expired') || message.includes('revoked') || message.includes('Token expired')) {
      status = 401;
    } else if (
      message.includes('permission') ||
      message.includes('Unauthorized') ||
      message.includes('disabled')
    ) {
      status = 403;
    }
    return NextResponse.json({ error: message }, { status });
  }
}
