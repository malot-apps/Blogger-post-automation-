import { NextRequest, NextResponse } from 'next/server';
import { fetchUserBlogs, createAndPublishBloggerPost } from '@/src/server/bloggerService';
import { renderTemplate } from '@/src/server/templateService';
import { generateTitleFromCaption } from '@/src/lib/titleGenerator';

function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith('blob:') || trimmed.startsWith('file:') || trimmed.startsWith('content:')) {
    return false;
  }
  return (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('data:image/')
  );
}

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

    // Step 3: Validate image
    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json(
        { error: 'Please select or upload a main image for the post.' },
        { status: 400 }
      );
    }

    if (!isValidImageUrl(imageUrl)) {
      return NextResponse.json(
        { error: 'Invalid main image format. Local device or blob: URLs cannot be used. Please upload the image or provide an HTTPS link.' },
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

    // Rule: If separate thumbnail not provided, automatically fallback to main imageUrl
    let effectiveThumbnailUrl = imageUrl.trim();
    if (thumbnailUrl && typeof thumbnailUrl === 'string' && thumbnailUrl.trim().length > 0) {
      if (!isValidImageUrl(thumbnailUrl)) {
        return NextResponse.json(
          { error: 'Invalid thumbnail image format. Local device or blob: URLs cannot be used.' },
          { status: 400 }
        );
      }
      effectiveThumbnailUrl = thumbnailUrl.trim();
    }

    // Step 5 & 6: Render /templates/blogger-post-template.html with all 5 dynamic placeholders
    const postHtml = renderTemplate(customTemplate, {
      title: finalTitle,
      imageUrl: imageUrl.trim(),
      thumbnailUrl: effectiveThumbnailUrl,
      caption: caption.trim(),
    });

    // Step 7 & 8: Call Blogger API v3 to create and publish post to THAT USER's selected blog
    const publishedPost = await createAndPublishBloggerPost(token, {
      blogId,
      title: finalTitle,
      content: postHtml,
      labels: parsedLabels.length > 0 ? parsedLabels : undefined,
      isDraft: Boolean(isDraft),
    });

    // Step 9: Return the real published URL
    return NextResponse.json({
      success: true,
      post: {
        id: publishedPost.id,
        blogId: publishedPost.blog?.id || blogId,
        title: publishedPost.title,
        url: publishedPost.url,
        thumbnailUrl: effectiveThumbnailUrl,
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
