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
    throw new Error(message);
  }

  const data = await response.json();
  return (data.items || []) as BloggerBlog[];
}

/**
 * Publish a new post to a specific Blogger blog.
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
    try {
      const parsed = JSON.parse(errorBody);
      if (parsed.error?.message) {
        message = parsed.error.message;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const data = (await response.json()) as BloggerPostResponse;
  return data;
}
