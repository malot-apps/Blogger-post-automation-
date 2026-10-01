import { GoogleGenAI, Type } from '@google/genai';

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

let cachedGenAi: GoogleGenAI | null = null;

function getGenAiClient(): GoogleGenAI {
  if (cachedGenAi) return cachedGenAi;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured on the server.');
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
async function resolveImageToInlineData(imageUrl: string): Promise<{ data: string; mimeType: string }> {
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
3. Exact cropping and thumbnailing instructions for a 16:9 thumbnail (target 1200x675) matching the Blogger video player container.

SEO TITLE GUIDELINES:
- Must be written in ${languageLabel}.
- Truthful and grounded in what is visible. Avoid invented facts, fake names, or fabricated claims.
- Attention-grabbing and high click-through potential without cheap clickbait.
- Concise (under 75 characters) to avoid search snippet truncation.
- Example Bengali style: "বাংলাদেশে ভাইরাল হওয়া এই দৃশ্যটি নিয়ে কেন এত আলোচনা?"
- Never use cheap clickbait like "এটা দেখলে আপনি পাগল হয়ে যাবেন!".

CROPPING & THUMBNAILING GUIDELINES:
- Target aspect ratio is strictly 16:9 (1200px width by 675px height).
- Identify the focal point coordinates in percentage (0-100% X from left, 0-100% Y from top).
- Suggest crop origin (originXPercent, originYPercent) and crop span (widthPercent, heightPercent).
- Provide practical composition advice in ${languageLabel} explaining how to frame the subject without cutting off faces, key objects, or text.
- Recommend composition style: 'cinematic_focus' (centered rule), 'dramatic_close' (tight subject zoom), 'rule_of_thirds' (editorial offset), or 'vivid_editorial' (vibrant contrast).`;

  const promptText = `Analyze this image in detail.
Return:
1. An SEO title in ${languageLabel}.
2. Main subject and detected elements.
3. Cropping and thumbnailing instructions for a 16:9 (1200x675) Blogger thumbnail.

Respond in JSON adhering to the specified schema.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
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

  const rawJson = response.text?.trim() || '{}';
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
