import { NextRequest, NextResponse } from 'next/server';
import { importBloggerPostsFromSource } from '@/src/server/bloggerService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sourceUrl, maxResults = 25, pageToken } = body;

    if (!sourceUrl || typeof sourceUrl !== 'string' || sourceUrl.trim().length === 0) {
      return NextResponse.json(
        { error: 'Source Blogger URL is required (e.g. https://your-source-blog.blogspot.com)' },
        { status: 400 }
      );
    }

    // Optional OAuth Bearer token if user is importing their own private/accessible blog
    let token: string | undefined;
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '').trim();
    }

    const result = await importBloggerPostsFromSource({
      sourceUrl: sourceUrl.trim(),
      accessToken: token,
      maxResults: Number(maxResults) || 25,
      pageToken: pageToken ? String(pageToken) : undefined,
    });

    return NextResponse.json({
      success: true,
      blog: result.blog,
      posts: result.posts,
      totalCount: result.posts.length,
      nextPageToken: result.nextPageToken,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to import posts from source blog.';
    console.error('Import Blogger Posts API error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
