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

  const promptText = `Generate a high-impact, professional landscape video thumbnail based directly on this reference image. ${contextNote}

CONTAINER & RESPONSIVE FRAMING SPECIFICATIONS:
- The target Blogger video player container has responsive CSS: "width: 100%; height: 450px; object-fit: cover;".
- Do NOT assume a fixed 1200x675 rendering size; the image will be dynamically scaled and cropped by the browser across diverse screen widths.
- On mobile devices (viewports 360px - 450px wide), the 450px-high container is taller than wide, so "object-fit: cover" will crop the outer left and right margins.
- On wider screens, "object-fit: cover" may trim top and bottom edges.
- CRITICAL CENTRAL SAFE-ZONE COMPOSITION: Keep the primary subject, faces, character, and key focal elements strictly CENTERED within the central safe area (the middle 50%-60% of the canvas horizontally, and middle 60%-70% vertically).
- Keep outer margins (left, right, top, bottom) filled with background environment, atmosphere, and cinematic depth so that when edge cropping occurs on any device, the hero subject is NEVER cut off and remains perfectly centered.
- Preserve the subject, identity, and facial likeness from the reference image with high fidelity.
- Apply professional ${style} lighting, vivid contrast, rich editorial color grading, and razor-sharp focal clarity.
- Do NOT place any important subjects, text, or focal details near the outer edges.`;

  // Currently supported Gemini native image models
  const primaryModel = 'gemini-3.1-flash-lite-image';
  const fallbackModel = 'gemini-3.1-flash-image';
  const modelsToTry = [primaryModel, fallbackModel, 'gemini-2.5-flash-image'];

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
          initialDelayMs: 1000,
          onRetry: (err, attempt) => {
            console.warn(`[Thumbnail Generation] Model ${model} returned 503/UNAVAILABLE on attempt ${attempt}. Retrying with exponential backoff...`);
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
        console.warn(`[Thumbnail Generation] Model ${model} unavailable (503/high demand). Trying fallback...`);
        continue;
      }
      // Non-503 error (e.g. invalid key or bad payload) should fail immediately
      throw err;
    }
  }

  // If all models failed with 503 / high demand:
  if (lastError && is503OrUnavailable(lastError)) {
    throw new Error('AI thumbnail generation is temporarily unavailable. Your title was generated successfully. Please try the thumbnail again.');
  }

  const message = lastError instanceof Error ? lastError.message : 'AI thumbnail could not be generated. Please try again.';
  throw new Error(message);
}
