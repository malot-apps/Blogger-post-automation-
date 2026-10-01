import { Type } from '@google/genai';
import { getGenAiClient, resolveImageToInlineData, withGeminiRetry, is503OrUnavailable } from './geminiUtils';

export interface ImageCroppingInstructions {
  targetAspectRatio: string; // "16:9" matching the Blogger master template
  targetDimensions: {
    width: number;
    height: number;
  };
  focalPoint: {
    xPercent: number; // 0 - 100 horizontal center of main subject
    yPercent: number; // 0 - 100 vertical center of main subject
    description: string;
  };
  cropCoordinatesSuggestion: {
    originXPercent: number; // 0 - 100 top-left X
    originYPercent: number; // 0 - 100 top-left Y
    widthPercent: number; // width span
    heightPercent: number; // height span
  };
  recommendedZoom: number; // 1.0 - 1.3
  compositionAdvice: string;
  recommendedStyle: 'cinematic_focus' | 'dramatic_close' | 'rule_of_thirds' | 'vivid_editorial';
}

export interface ImageUrlAnalysisResult {
  title: string;
  summary: string;
  mainSubject: string;
  detectedElements: string[];
  croppingInstructions: ImageCroppingInstructions;
  language: string;
}

/**
 * Server-side service: Analyzes an image from a URL using Gemini API and returns
 * an SEO-friendly title and cropping/thumbnailing instructions based on the selected language.
 */
export async function analyzeImageUrlWithGemini({
  imageUrl,
  language = 'bn',
}: {
  imageUrl: string;
  language?: string;
}): Promise<ImageUrlAnalysisResult> {
  const ai = getGenAiClient();
  const { data: base64Data, mimeType } = await resolveImageToInlineData(imageUrl);

  const isBengali = language === 'bn' || language.toLowerCase().includes('bengali') || language.includes('বাংলা');
  const languageLabel = isBengali ? 'Bengali (বাংলা)' : 'English';

  const systemInstruction = `You are a professional photojournalist, SEO specialist, and art director for Google Blogger.
Your job is to analyze an image provided by URL and produce:
1. An SEO-friendly, attention-grabbing, concise title in ${languageLabel}.
2. Visual understanding of the scene (main subject, key elements, context).
3. Composition and focal-point instructions for a landscape thumbnail optimized for a responsive video container (width: 100%; height: 450px; object-fit: cover).

SEO TITLE & FACTUAL GROUNDING RULES:
- Must be written in natural, eloquent ${languageLabel}.
- DISTINGUISH BETWEEN VISUAL FACT AND USER CONTEXT: Infer only what is visibly evident in the image.
- NEVER claim or assume: "viral" (ভাইরাল), "trending" (ট্রেন্ডিং), "social media sensation" (সামাজিক মাধ্যমে নজর কাড়ল), "breaking news", "famous", or specific unverified identities/events/locations UNLESS supplied by the user.
- Avoid repetitive generic filler phrases like "সামাজিক মাধ্যমে নজর কাড়ল...", "আলোড়ন সৃষ্টি করল...", or "ভাইরাল দৃশ্য...".
- If the image alone is insufficient to establish an external fact, craft a curiosity-driven, truthful title describing the visible atmosphere, emotion, elements, or scene.
- Concise (under 75 characters) to fit search snippets and mobile layouts without truncation.
- Examples of authentic Bengali titles based on visible facts:
  * Nature: "কুয়াশায় ঘেরা ভোরের এক শান্ত নদীর মায়াবী রূপ"
  * Wildlife: "গাছের ডালে বসে থাকা দুর্লভ নীলকণ্ঠ পাখির অপরূপ ভঙ্গি"
  * Urban/Life: "বৃষ্টিভেজা বিকেলে ব্যস্ত শহরের এক জীবন্ত মুহূর্ত"
  * Portrait: "চোখের গভীরতায় লুকিয়ে থাকা না-বলা হাজারো অনুভূতির গল্প"
- Never use cheap sensational clickbait like "এটা দেখলে আপনি পাগল হয়ে যাবেন!".

RESPONSIVE CONTAINER & SAFE-ZONE GUIDELINES:
- The video container is responsive: width 100%, height 450px, with CSS object-fit: cover.
- Do NOT assume a fixed 1200x675 rendering size; the image scales and crops across diverse mobile and desktop screen widths.
- On mobile devices, object-fit: cover crops the left and right outer sides. On wide desktop screens, it may trim top/bottom.
- Always identify the primary subject and ensure composition recommendations keep the subject strictly centered within the central safe area (middle 50%-60% horizontal, 60%-70% vertical).
- Outer margins must be background/atmosphere so edge cropping never cuts off the subject.
- Identify the focal point coordinates in percentage (0-100% X from left, 0-100% Y from top).
- Recommend composition style: 'cinematic_focus' (centered safe rule), 'dramatic_close' (centered subject zoom), 'rule_of_thirds', or 'vivid_editorial'.`;

  const promptText = `Analyze this image in detail.
Return:
1. An SEO title in ${languageLabel}.
2. Main subject and detected elements.
3. Composition and focal-point instructions optimized for a responsive landscape video container (width: 100%; height: 450px; object-fit: cover) with the subject centered in the safe zone.

Respond in JSON adhering to the specified schema.`;

  // Models to attempt: primary gemini-3.8-flash with fallback to gemini-3.1-flash-lite on 503 high demand
  const textModelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
  let lastError: unknown = null;
  let responseText: string | undefined;

  for (const model of textModelsToTry) {
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
              systemInstruction,
              temperature: 0.7,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  title: {
                    type: Type.STRING,
                    description: `SEO-friendly title in ${languageLabel}.`,
                  },
                  summary: {
                    type: Type.STRING,
                    description: `Summary of the image in ${languageLabel}.`,
                  },
                  mainSubject: {
                    type: Type.STRING,
                    description: 'The primary subject identified.',
                  },
                  detectedElements: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Key visible objects or elements.',
                  },
                  focalXPercent: {
                    type: Type.NUMBER,
                    description: 'Horizontal center of the focal area (0-100).',
                  },
                  focalYPercent: {
                    type: Type.NUMBER,
                    description: 'Vertical center of the focal area (0-100).',
                  },
                  focalDescription: {
                    type: Type.STRING,
                    description: `Description of the focal area in ${languageLabel}.`,
                  },
                  originXPercent: {
                    type: Type.NUMBER,
                    description: 'Suggested crop origin X in percentage (0-100).',
                  },
                  originYPercent: {
                    type: Type.NUMBER,
                    description: 'Suggested crop origin Y in percentage (0-100).',
                  },
                  widthPercent: {
                    type: Type.NUMBER,
                    description: 'Suggested crop width in percentage of original (0-100).',
                  },
                  heightPercent: {
                    type: Type.NUMBER,
                    description: 'Suggested crop height in percentage of original (0-100).',
                  },
                  recommendedZoom: {
                    type: Type.NUMBER,
                    description: 'Recommended zoom factor between 1.0 and 1.3.',
                  },
                  compositionAdvice: {
                    type: Type.STRING,
                    description: `Instructions and advice for cropping/framing in ${languageLabel}.`,
                  },
                  recommendedStyle: {
                    type: Type.STRING,
                    description: 'One of: cinematic_focus, dramatic_close, rule_of_thirds, vivid_editorial.',
                  },
                },
                required: [
                  'title',
                  'summary',
                  'mainSubject',
                  'detectedElements',
                  'focalXPercent',
                  'focalYPercent',
                  'compositionAdvice',
                ],
              },
            },
          });
        },
        {
          maxRetries: 2,
          initialDelayMs: 1200,
        }
      );

      responseText = response.text;
      if (responseText) break;
    } catch (err: unknown) {
      lastError = err;
      if (is503OrUnavailable(err)) {
        console.warn(`[Image Analysis] Model ${model} returned 503, attempting fallback:`, err);
        continue;
      }
      throw err;
    }
  }

  if (!responseText) {
    if (lastError && is503OrUnavailable(lastError)) {
      throw new Error('AI analysis service is temporarily busy. Please try again.');
    }
    throw lastError instanceof Error ? lastError : new Error('Failed to analyze image with AI.');
  }

  const rawJson = responseText.trim() || '{}';
  const parsed = JSON.parse(rawJson);

  const focalX = typeof parsed.focalXPercent === 'number' ? Math.max(0, Math.min(100, parsed.focalXPercent)) : 50;
  const focalY = typeof parsed.focalYPercent === 'number' ? Math.max(0, Math.min(100, parsed.focalYPercent)) : 50;

  const validStyles = ['cinematic_focus', 'dramatic_close', 'rule_of_thirds', 'vivid_editorial'] as const;
  const recommendedStyle = validStyles.includes(parsed.recommendedStyle)
    ? parsed.recommendedStyle
    : 'cinematic_focus';

  return {
    title: parsed.title || (isBengali ? 'ছবিটির বিস্তারিত বিবরণ' : 'Featured Post Highlights'),
    summary: parsed.summary || '',
    mainSubject: parsed.mainSubject || '',
    detectedElements: Array.isArray(parsed.detectedElements) ? parsed.detectedElements : [],
    croppingInstructions: {
      targetAspectRatio: '16:9',
      targetDimensions: {
        width: 1200,
        height: 675,
      },
      focalPoint: {
        xPercent: focalX,
        yPercent: focalY,
        description: parsed.focalDescription || (isBengali ? 'মূল কেন্দ্রবিন্দু' : 'Primary focal point'),
      },
      cropCoordinatesSuggestion: {
        originXPercent: typeof parsed.originXPercent === 'number' ? Math.max(0, Math.min(100, parsed.originXPercent)) : 0,
        originYPercent: typeof parsed.originYPercent === 'number' ? Math.max(0, Math.min(100, parsed.originYPercent)) : 0,
        widthPercent: typeof parsed.widthPercent === 'number' ? Math.max(10, Math.min(100, parsed.widthPercent)) : 100,
        heightPercent: typeof parsed.heightPercent === 'number' ? Math.max(10, Math.min(100, parsed.heightPercent)) : 100,
      },
      recommendedZoom: typeof parsed.recommendedZoom === 'number' ? Math.max(1.0, Math.min(1.3, parsed.recommendedZoom)) : 1.05,
      compositionAdvice: parsed.compositionAdvice || (isBengali ? 'মূল বিষয়বস্তু ১৬:৯ অনুপাতে ঠিক রেখে ফ্রেম করুন।' : 'Frame the subject preserving 16:9 aspect ratio.'),
      recommendedStyle,
    },
    language,
  };
}
