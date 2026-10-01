import { NextRequest, NextResponse } from 'next/server';
import { fetchUserBlogs, createAndPublishBloggerPost } from '@/src/server/bloggerService';
import { renderTemplate } from '@/src/server/templateService';
import { generateTitleFromCaption } from '@/src/lib/titleGenerator';
import { verifyImage } from '@/src/server/imageVerificationService';
import { uploadAndVerifyImageOnBloggerHost } from '@/src/server/bloggerImageHostService';

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
    const { blogId, imageUrl, thumbnailUrl, caption, title, labels, customTemplate, isDraft } = body;

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

    // Step 6: Ensure Thumbnail Image is uploaded to dedicated Blogger host if supplied as raw base64 data
    let rawThumbnailUrl = (thumbnailUrl && typeof thumbnailUrl === 'string' && thumbnailUrl.trim().length > 0)
      ? thumbnailUrl.trim()
      : verifiedMainImageUrl;

    let verifiedThumbnailUrl = rawThumbnailUrl;

    if (verifiedThumbnailUrl.startsWith('data:image/')) {
      const thumbUpload = await uploadAndVerifyImageOnBloggerHost({
        imageBase64OrDataUrl: verifiedThumbnailUrl,
        fileName: 'thumbnail-cover.jpg',
        callerBearerToken: token,
      });

      if (!thumbUpload.success || !thumbUpload.verified || !thumbUpload.imageUrl) {
        return NextResponse.json(
          {
            success: false,
            verified: false,
            error: `Publishing blocked: Failed to host and verify Video Player Thumbnail on Blogger image host: ${
              thumbUpload.error || 'Upload failed'
            }`,
          },
          { status: 400 }
        );
      }
      verifiedThumbnailUrl = thumbUpload.imageUrl;
    }

    // ========================================================================
    // MANDATORY SERVER-SIDE VERIFICATION LOOP:
    // Before creating the post on Blogger, re-verify EVERY image URL (main image
    // and thumbnail) present in the request using the same 'verifyImage' utility
    // to ensure they remain publicly accessible. Block publishing and return a
    // descriptive error if any image fails.
    // ========================================================================
    const imagesToVerify: Array<{
      key: 'main' | 'thumbnail';
      label: string;
      url: string;
    }> = [
      {
        key: 'main',
        label: 'Main Post Image',
        url: verifiedMainImageUrl,
      },
    ];

    if (verifiedThumbnailUrl && verifiedThumbnailUrl !== verifiedMainImageUrl) {
      imagesToVerify.push({
        key: 'thumbnail',
        label: 'Video Player Thumbnail',
        url: verifiedThumbnailUrl,
      });
    }

    for (const imageItem of imagesToVerify) {
      const verification = await verifyImage(imageItem.url);

      if (!verification.isValid || !verification.verifiedUrl) {
        return NextResponse.json(
          {
            success: false,
            verified: false,
            failedImage: imageItem.label,
            failedUrl: imageItem.url,
            error: `Publishing blocked: Server-side verification loop failed for ${imageItem.label}. ${
              verification.error || 'The image URL is not publicly accessible.'
            } Never publish a post containing broken, unverified, or private image URLs.`,
          },
          { status: 400 }
        );
      }

      if (imageItem.key === 'main') {
        verifiedMainImageUrl = verification.verifiedUrl;
      } else if (imageItem.key === 'thumbnail') {
        verifiedThumbnailUrl = verification.verifiedUrl;
      }
    }

    // Determine final title
    const finalTitle = (title && typeof title === 'string' && title.trim().length > 0)
      ? title.trim()
      : generateTitleFromCaption(caption);

    // Format labels
    let parsedLabels: string[] = [];
    if (Array.isArray(labels)) {
      parsedLabels = labels.map((l) => String(l).trim()).filter(Boolean);
    } else if (typeof labels === 'string' && labels.trim().length > 0) {
      parsedLabels = labels
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean);
    }

    // Step 7: Render /templates/blogger-post-template.html with VERIFIED HTTPS image URLs
    const postHtml = renderTemplate(customTemplate, {
      title: finalTitle,
      imageUrl: verifiedMainImageUrl,
      thumbnailUrl: verifiedThumbnailUrl,
      caption: caption.trim(),
    });

    // Step 8: Call Blogger API v3 to create and publish post to THAT USER's selected blog
    const publishedPost = await createAndPublishBloggerPost(token, {
      blogId,
      title: finalTitle,
      content: postHtml,
      labels: parsedLabels.length > 0 ? parsedLabels : undefined,
      isDraft: Boolean(isDraft),
    });

    // Step 9: Return the real published URL and verified images
    return NextResponse.json({
      success: true,
      post: {
        id: publishedPost.id,
        blogId: publishedPost.blog?.id || blogId,
        title: publishedPost.title,
        url: publishedPost.url,
        imageUrl: verifiedMainImageUrl,
        thumbnailUrl: verifiedThumbnailUrl,
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
