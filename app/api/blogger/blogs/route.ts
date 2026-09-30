import { NextRequest, NextResponse } from 'next/server';
import { fetchUserBlogs } from '@/src/server/bloggerService';

export async function GET(req: NextRequest) {
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
        { error: 'OAuth not configured: Missing or invalid authentication session. Please sign in with Google.' },
        { status: 401 }
      );
    }

    const blogs = await fetchUserBlogs(token);
    return NextResponse.json({
      blogs,
      warning:
        blogs.length === 0
          ? 'No Blogger blogs found: No active Blogger blogs were found for this Google account. Please create a blog at https://www.blogger.com first, then click Refresh.'
          : undefined,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
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
