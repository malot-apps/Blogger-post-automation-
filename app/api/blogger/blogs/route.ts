import { NextRequest, NextResponse } from 'next/server';
import { fetchUserBlogs } from '@/src/server/bloggerService';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header. Please sign in.' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return NextResponse.json(
        { error: 'Empty access token.' },
        { status: 401 }
      );
    }

    const blogs = await fetchUserBlogs(token);
    return NextResponse.json({ blogs });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
