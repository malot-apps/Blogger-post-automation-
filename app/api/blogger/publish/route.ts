import { NextRequest, NextResponse } from 'next/server';
import { createAndPublishBloggerPost } from '@/src/server/bloggerService';
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in with Google.' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return NextResponse.json(
        { error: 'Valid Blogger access token is required.' },
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

    // Injects all dynamic variables into the master HTML template before the API call
    const postHtml = renderTemplate(customTemplate, {
      title: finalTitle,
      imageUrl: imageUrl.trim(),
      thumbnailUrl: effectiveThumbnailUrl,
      caption: caption.trim(),
    });

    // Call Blogger API v3 to create and publish post
    const publishedPost = await createAndPublishBloggerPost(token, {
      blogId,
      title: finalTitle,
      content: postHtml,
      labels: parsedLabels.length > 0 ? parsedLabels : undefined,
      isDraft: Boolean(isDraft),
    });

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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
