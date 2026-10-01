import { GoogleGenAI } from '@google/genai';

let cachedGenAi: GoogleGenAI | null = null;

/**
 * Returns a singleton instance of the Google GenAI client configured with server-side GEMINI_API_KEY.
 * Never exposes the API key to client browsers.
 */
export function getGenAiClient(): GoogleGenAI {
  if (cachedGenAi) return cachedGenAi;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server. Please check your environment variables.');
  }
  cachedGenAi = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
  return cachedGenAi;
}

/**
 * Downloads or parses an image from an HTTP/HTTPS URL or data URL and returns its base64 and MIME type.
 */
export async function resolveImageToInlineData(
  imageUrl: string
): Promise<{ data: string; mimeType: string }> {
  const trimmed = imageUrl.trim();

  // If already a base64 data URL
  if (trimmed.startsWith('data:')) {
    const match = trimmed.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      return {
        mimeType: match[1],
        data: match[2],
      };
    }
  }

  // If standard HTTP/HTTPS URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const response = await fetch(trimmed, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch image from URL: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const cleanMime = contentType.split(';')[0].trim().toLowerCase();
    const arrayBuffer = await response.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    return {
      mimeType: cleanMime.startsWith('image/') ? cleanMime : 'image/jpeg',
      data: base64Data,
    };
  }

  throw new Error('Invalid image URL. Must be an HTTP/HTTPS URL or base64 data URL.');
}

/**
 * Checks whether an error represents a temporary 503, UNAVAILABLE, or high-demand spike.
 */
export function is503OrUnavailable(err: unknown): boolean {
  if (!err) return false;
  const status =
    (err as { status?: number; code?: number })?.status ||
    (err as { code?: number })?.code;

  if (status === 503 || status === 429) return true;

  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  return (
    lower.includes('503') ||
    lower.includes('unavailable') ||
    lower.includes('high demand') ||
    lower.includes('spikes in demand') ||
    lower.includes('overloaded') ||
    lower.includes('resource exhausted') ||
    lower.includes('rate limit') ||
    lower.includes('temporarily')
  );
}

/**
 * Executes an async function with automatic exponential backoff retry for 503/UNAVAILABLE errors.
 */
export async function withGeminiRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    backoffFactor?: number;
    onRetry?: (error: unknown, attempt: number) => void;
  } = {}
): Promise<T> {
  const { maxRetries = 2, initialDelayMs = 1200, backoffFactor = 2, onRetry } = options;
  let attempt = 0;
  let delay = initialDelayMs;

  while (true) {
    try {
      return await fn();
    } catch (err: unknown) {
      attempt++;
      const isUnavailable = is503OrUnavailable(err);

      if (attempt > maxRetries || !isUnavailable) {
        throw err;
      }

      onRetry?.(err, attempt);

      // Exponential backoff with small random jitter
      const jitter = Math.floor(Math.random() * 400);
      await new Promise((resolve) => setTimeout(resolve, delay + jitter));
      delay *= backoffFactor;
    }
  }
}
