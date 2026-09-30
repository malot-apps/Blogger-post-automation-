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
        { error: 'Missing or invalid authentication session. Please sign in with Google.' },
        { status: 401 }
      );
    }

    const blogs = await fetchUserBlogs(token);
    return NextResponse.json({ blogs });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    const status = message.includes('expired') || message.includes('revoked') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
