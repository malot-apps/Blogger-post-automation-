import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { validateGoogleAccessToken } from '@/src/server/bloggerService';

const SESSION_COOKIE_NAME = 'blogger_access_token';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accessToken } = body;

    if (!accessToken || typeof accessToken !== 'string') {
      return NextResponse.json({ error: 'Valid accessToken string is required.' }, { status: 400 });
    }

    // Validate the token directly with Google OAuth servers
    const tokenInfo = await validateGoogleAccessToken(accessToken);

    const cookieStore = await cookies();
    const expiresInSeconds = tokenInfo.expires_in && tokenInfo.expires_in > 0 ? tokenInfo.expires_in : 3600;

    cookieStore.set(SESSION_COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: expiresInSeconds,
    });

    return NextResponse.json({
      success: true,
      user: {
        email: tokenInfo.email,
        sub: tokenInfo.user_id,
        expiresIn: expiresInSeconds,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to establish session';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!tokenCookie || !tokenCookie.value) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    const tokenInfo = await validateGoogleAccessToken(tokenCookie.value);
    return NextResponse.json({
      authenticated: true,
      user: {
        email: tokenInfo.email,
        sub: tokenInfo.user_id,
        expiresIn: tokenInfo.expires_in,
      },
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    return NextResponse.json({ success: true, message: 'Session cleared.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to clear session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
