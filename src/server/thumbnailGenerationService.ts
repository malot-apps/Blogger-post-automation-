import { getGenAiClient, resolveImageToInlineData, withGeminiRetry, is503OrUnavailable } from './geminiUtils';

/**
 * Service for native Gemini AI thumbnail generation.
 * Uses a currently supported Gemini native image-generation model (gemini-3.1-flash-lite-image)
 * with the user's uploaded Main Image as reference, producing a 16:9 high-impact thumbnail.
 */

export interface GenerateThumbnailParams {
  mainImageSrc: string;
  subjectContext?: string;
  style?: string;
  language?: 'bn' | 'en';
}

export interface GeneratedThumbnailResult {
  success: boolean;
  thumbnailUrl: string; // Base64 data URL ready for {{THUMBNAIL_URL}} and Blogger image host
  mimeType: string;
  modelUsed: string;
}

export async function generateNativeThumbnailWithGemini({
  mainImageSrc,
  subjectContext,
  style = 'cinematic',
  language = 'bn',
}: GenerateThumbnailParams): Promise<GeneratedThumbnailResult> {
  const ai = getGenAiClient();
  const { data: base64Data, mimeType } = await resolveImageToInlineData(mainImageSrc);

  // Construct a prompt specifically instructing the image generation model to use the reference image
  const isBengali = language === 'bn';
  const contextNote = subjectContext?.trim() ? `Context: ${subjectContext.trim()}. ` : '';

  const promptText = `Generate a high-resolution, professional 16:9 video thumbnail based directly on this reference image. ${contextNote}
CRITICAL REQUIREMENTS:
- Preserve the primary subject, faces, character, and key focal elements from the reference image accurately.
- Frame the composition in a 16:9 landscape aspect ratio suitable for a high-click-through Blogger/YouTube video player card.
- Apply high-impact ${style} lighting, rich color grading, deep contrast, sharp focal focus, and vivid editorial polish.
- Do NOT generate random unrelated content; the subject from the input image MUST be the hero of this 16:9 thumbnail.`;

  // Currently supported Gemini native image models
  const primaryModel = 'gemini-3.1-flash-lite-image';
  const fallbackModel = 'gemini-3.1-flash-image';
  const modelsToTry = [primaryModel, fallbackModel];

  let lastError: unknown = null;

  for (const model of modelsToTry) {
    try {
      const response = await withGeminiRetry(
        async () => {
          return await ai.models.generateContent({
            model,
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: base64Data,
                  },
                },
                {
                  text: promptText,
                },
              ],
            },
            config: {
              imageConfig: {
                aspectRatio: '16:9',
              },
            },
          });
        },
        {
          maxRetries: 2,
          initialDelayMs: 1500,
          onRetry: (err, attempt) => {
            console.warn(`[Thumbnail Generation] Model ${model} returned 503/UNAVAILABLE on attempt ${attempt}. Retrying...`);
          },
        }
      );

      // Iterate through candidates and parts to locate the generated image inlineData
      const candidate = response.candidates?.[0];
      const parts = candidate?.content?.parts || [];

      for (const part of parts) {
        if (part.inlineData?.data) {
          const outMime = part.inlineData.mimeType || 'image/png';
          const outBase64 = part.inlineData.data;

          // Verify the returned data is non-empty before accepting
          if (outBase64.length < 100) {
            throw new Error('Received malformed or empty image payload from Gemini.');
          }

          const thumbnailUrl = `data:${outMime};base64,${outBase64}`;

          return {
            success: true,
            thumbnailUrl,
            mimeType: outMime,
            modelUsed: model,
          };
        }
      }

      throw new Error(`Model ${model} did not include an image payload in the candidate response.`);
    } catch (err: unknown) {
      lastError = err;
      if (is503OrUnavailable(err)) {
        console.warn(`[Thumbnail Generation] Model ${model} unavailable (503). Attempting fallback model...`);
        continue;
      }
      // Non-503 error (e.g. invalid key or bad payload) should fail immediately
      throw err;
    }
  }

  // If both models failed with 503 / high demand:
  if (lastError && is503OrUnavailable(lastError)) {
    throw new Error('AI thumbnail service is temporarily busy. Please try again.');
  }

  const message = lastError instanceof Error ? lastError.message : 'AI thumbnail generation failed.';
  throw new Error(message);
}
