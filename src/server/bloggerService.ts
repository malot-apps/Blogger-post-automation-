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
 * Validates a Google OAuth access token using Google's tokeninfo endpoint.
 * Ensures the token is active, not expired, and contains the required Blogger scope.
 */
export async function validateGoogleAccessToken(accessToken: string): Promise<GoogleTokenInfo> {
  if (!accessToken || typeof accessToken !== 'string') {
    throw new Error('No access token provided.');
  }

  const tokenUrl = `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`;
  const response = await fetch(tokenUrl, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    if (response.status === 400 || response.status === 401) {
      throw new Error('Google OAuth token is invalid or has expired. Please sign in again.');
    }
    throw new Error(`Failed to validate Google token with OAuth provider (${response.status}).`);
  }

  const tokenInfo = (await response.json()) as GoogleTokenInfo;

  // Verify that required Blogger scope was granted
  const scopes = (tokenInfo.scope || '').split(' ');
  const hasBloggerScope = scopes.some(
    (s) => s === 'https://www.googleapis.com/auth/blogger' || s === 'https://www.googleapis.com/auth/blogger.readonly'
  );

  if (!hasBloggerScope) {
    throw new Error(
      'The authenticated session is missing Blogger permission. Please sign in again and check the box to allow Blogger management.'
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
    let message = `Failed to fetch Blogger blogs (${response.status})`;
    try {
      const parsed = JSON.parse(errorBody);
      if (parsed.error?.message) {
        message = parsed.error.message;
      }
    } catch {
      // ignore
    }

    if (response.status === 401) {
      throw new Error('Google session expired or authorization was revoked. Please sign in again.');
    }
    if (response.status === 403) {
      throw new Error(
        `Blogger permission denied: ${message}. Ensure your Google account has Blogger enabled and permissions are granted.`
      );
    }
    throw new Error(message);
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
    let message = `Blogger API post creation failed (${response.status})`;
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
      // ignore
    }

    if (response.status === 401) {
      throw new Error('Google authorization expired or was revoked. Please sign in again.');
    }
    if (response.status === 403) {
      if (reason === 'rateLimitExceeded' || reason === 'dailyLimitExceeded') {
        throw new Error('Blogger API quota limit exceeded. Please wait a moment or try again later.');
      }
      throw new Error(`Permission denied: You do not have permission to post to this Blogger blog (${message}).`);
    }
    if (response.status === 404) {
      throw new Error('The specified Blogger blog was not found. Please refresh your blog list.');
    }
    throw new Error(message);
  }

  const data = (await response.json()) as BloggerPostResponse;
  return data;
}
