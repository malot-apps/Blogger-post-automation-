import { GoogleGenAI, Type } from '@google/genai';

let cachedAiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (cachedAiClient) {
    return cachedAiClient;
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured.');
  }
  cachedAiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
  return cachedAiClient;
}

export interface ImageAnalysisResult {
  title: string;
  summary: string;
  mainSubject: string;
  context: string;
  focalPoint: {
    xPercent: number; // 0 - 100
    yPercent: number; // 0 - 100
    recommendedZoom: number; // 1.0 - 1.3
  };
  suggestedBadge?: string;
}

export async function analyzeImageForBlogger({
  imageBase64,
  mimeType = 'image/jpeg',
  language = 'bn',
}: {
  imageBase64: string;
  mimeType?: string;
  language?: 'bn' | 'en';
}): Promise<ImageAnalysisResult> {
  const ai = getAiClient();

  // Strip data URL header if present
  let cleanBase64 = imageBase64;
  if (cleanBase64.includes('base64,')) {
    cleanBase64 = cleanBase64.split('base64,')[1];
  }

  const isBengali = language === 'bn';

  const systemInstruction = `You are an expert SEO content strategist and visual photojournalist for Google Blogger.
Your task is to analyze an uploaded image and generate:
1. An SEO-friendly, attention-grabbing, natural, concise title in ${isBengali ? 'Bengali (বাংলা)' : 'English'}.
2. Analysis of the visual subject and focal point coordinates for a 16:9 thumbnail crop.

CRITICAL RULES FOR TITLE:
- Written strictly in ${isBengali ? 'Bengali (বাংলা)' : 'English'}.
- Attention-grabbing and curiosity-driven while remaining truthful and grounded in the image.
- Avoid fake claims, fabricated names, unrelated clickbait, keyword stuffing, and excessive emojis.
- Keep the title concise (under 75 characters) so it looks great on search results, Blogger layouts, and social previews.
- Example Bengali style: "বাংলাদেশে ভাইরাল হওয়া এই দৃশ্যটি নিয়ে কেন এত আলোচনা?"
- DO NOT use cheap sensational clickbait like "এটা দেখলে আপনি পাগল হয়ে যাবেন!!!".
- If the image context is ambiguous, frame an honest, curiosity-driven question or descriptive statement about the visible scene.

CRITICAL RULES FOR THUMBNAIL FOCAL POINT:
- Identify where the primary subject or face/focal action is located in percentages (x: 0-100 from left, y: 0-100 from top).
- Default center is x: 50, y: 50. If the subject is higher up (like a portrait or standing figure), y might be 35-45.`;

  const promptText = `Analyze this image thoroughly.
Identify:
1. Main subject and visible context.
2. An eye-catching, SEO-friendly Blogger post title in ${isBengali ? 'Bengali (বাংলা)' : 'English'}.
3. The focal point (x, y percentage 0-100) and recommended zoom factor for creating a 16:9 (1200x675) Blogger thumbnail.

Respond in JSON according to the schema.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType,
            data: cleanBase64,
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
            description: `SEO-friendly title in ${isBengali ? 'Bengali (বাংলা)' : 'English'}.`,
          },
          summary: {
            type: Type.STRING,
            description: 'Brief description of the image content and topic.',
          },
          mainSubject: {
            type: Type.STRING,
            description: 'The main subject or object seen in the image.',
          },
          context: {
            type: Type.STRING,
            description: 'The setting, action, or context.',
          },
          focalXPercent: {
            type: Type.NUMBER,
            description: 'Horizontal center of the main subject (0 to 100).',
          },
          focalYPercent: {
            type: Type.NUMBER,
            description: 'Vertical center of the main subject (0 to 100).',
          },
          recommendedZoom: {
            type: Type.NUMBER,
            description: 'Zoom level between 1.0 and 1.3.',
          },
          suggestedBadge: {
            type: Type.STRING,
            description: 'Optional 1-2 word category tag (e.g. ভাইরাল, খবর, Special, Trending).',
          },
        },
        required: ['title', 'summary', 'focalXPercent', 'focalYPercent'],
      },
    },
  });

  const rawText = response.text?.trim() || '{}';
  try {
    const parsed = JSON.parse(rawText);
    return {
      title: parsed.title || (isBengali ? 'ছবিটির বিস্তারিত বিবরণ' : 'Featured Image Highlights'),
      summary: parsed.summary || '',
      mainSubject: parsed.mainSubject || '',
      context: parsed.context || '',
      focalPoint: {
        xPercent: typeof parsed.focalXPercent === 'number' ? Math.max(0, Math.min(100, parsed.focalXPercent)) : 50,
        yPercent: typeof parsed.focalYPercent === 'number' ? Math.max(0, Math.min(100, parsed.focalYPercent)) : 50,
        recommendedZoom: typeof parsed.recommendedZoom === 'number' ? Math.max(1.0, Math.min(1.3, parsed.recommendedZoom)) : 1.05,
      },
      suggestedBadge: parsed.suggestedBadge || undefined,
    };
  } catch (err) {
    console.error('Failed to parse Gemini analysis JSON:', rawText, err);
    throw new Error('AI analysis produced invalid response format.');
  }
}

export async function regenerateSeoTitle({
  imageBase64,
  mimeType = 'image/jpeg',
  language = 'bn',
  previousTitles = [],
  contextSummary = '',
}: {
  imageBase64?: string;
  mimeType?: string;
  language?: 'bn' | 'en';
  previousTitles?: string[];
  contextSummary?: string;
}): Promise<string> {
  const ai = getAiClient();
  const isBengali = language === 'bn';

  const systemInstruction = `You are an expert SEO title specialist for Google Blogger.
Generate an alternative, fresh, attention-grabbing SEO title in ${isBengali ? 'Bengali (বাংলা)' : 'English'}.
Rules:
- Must be different in phrasing and angle from any previously generated titles: ${JSON.stringify(previousTitles)}
- Honest, grounded in the actual image/context.
- Natural, concise (under 75 characters), suitable for search and social clicks.
- No cheap misleading clickbait or exaggerated claims.
- Return ONLY JSON with a "title" string field.`;

  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

  if (imageBase64) {
    let cleanBase64 = imageBase64;
    if (cleanBase64.includes('base64,')) {
      cleanBase64 = cleanBase64.split('base64,')[1];
    }
    parts.push({
      inlineData: {
        mimeType,
        data: cleanBase64,
      },
    });
  }

  parts.push({
    text: `Generate a new alternative SEO title in ${isBengali ? 'Bengali (বাংলা)' : 'English'}. Context: ${contextSummary || 'Uploaded photo'}. Do not repeat: ${previousTitles.join(' | ')}.`,
  });

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: { parts },
    config: {
      systemInstruction,
      temperature: 0.85,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: `New alternative title in ${isBengali ? 'Bengali' : 'English'}`,
          },
        },
        required: ['title'],
      },
    },
  });

  const rawText = response.text?.trim() || '{}';
  try {
    const parsed = JSON.parse(rawText);
    return parsed.title?.trim() || '';
  } catch (err) {
    console.error('Failed to parse regenerated title JSON:', rawText, err);
    throw new Error('Failed to generate alternative title.');
  }
}
