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
