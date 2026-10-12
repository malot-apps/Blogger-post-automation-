import { Type } from '@google/genai';
import { getGenAiClient, withGeminiRetry, is503OrUnavailable } from './geminiUtils';

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
  customApiKey,
}: {
  imageBase64: string;
  mimeType?: string;
  language?: 'bn' | 'en';
  customApiKey?: string;
}): Promise<ImageAnalysisResult> {
  const ai = getGenAiClient(customApiKey);

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

CRITICAL RULES FOR TITLE & TRUTHFULNESS:
- Written strictly in natural, evocative ${isBengali ? 'Bengali (বাংলা)' : 'English'}.
- DISTINGUISH VISUAL FACT FROM USER CONTEXT: Infer only what is visibly seen.
- NEVER invent claims: do NOT claim viral (ভাইরাল), trending (ট্রেন্ডিং), social media sensation (সামাজিক মাধ্যমে নজর কাড়ল), breaking news, famous, or unverified people/places without user confirmation.
- Do NOT repeat generic phrases like "সামাজিক মাধ্যমে নজর কাড়ল...".
- If context is ambiguous, frame an honest, curiosity-driven description of the actual visible composition, expression, or atmosphere.
- Concise (under 75 characters) so it looks clean on search results, Blogger layouts, and social previews.
- DO NOT use cheap sensational clickbait like "এটা দেখলে আপনি পাগল হয়ে যাবেন!!!".

CRITICAL RULES FOR THUMBNAIL FOCAL POINT:
- Identify where the primary subject or face/focal action is located in percentages (x: 0-100 from left, y: 0-100 from top).
- Default center is x: 50, y: 50. If the subject is higher up (like a portrait or standing figure), y might be 35-45.`;

  const promptText = `Analyze this image thoroughly.
Identify:
1. Main subject and visible context.
2. An eye-catching, SEO-friendly Blogger post title in ${isBengali ? 'Bengali (বাংলা)' : 'English'}.
3. The focal point (x, y percentage 0-100) and recommended zoom factor for creating a 16:9 (1200x675) Blogger thumbnail.

Respond in JSON according to the schema.`;

  const textModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
  let lastError: unknown = null;
  let responseText: string | undefined;

  for (const model of textModels) {
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
        },
        { maxRetries: 2, initialDelayMs: 1200 }
      );

      responseText = response.text;
      if (responseText) break;
    } catch (err: unknown) {
      lastError = err;
      if (is503OrUnavailable(err)) {
        console.warn(`[geminiService] Model ${model} returned 503, trying fallback:`, err);
        continue;
      }
      throw err;
    }
  }

  if (!responseText) {
    if (lastError && is503OrUnavailable(lastError)) {
      throw new Error('AI service is temporarily busy. Please try again.');
    }
    throw lastError instanceof Error ? lastError : new Error('AI analysis produced invalid response format.');
  }

  const rawText = responseText.trim() || '{}';
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
  const ai = getGenAiClient();
  const isBengali = language === 'bn';

  const systemInstruction = `You are an expert SEO title specialist for Google Blogger.
Generate an alternative, fresh, attention-grabbing SEO title in natural ${isBengali ? 'Bengali (বাংলা)' : 'English'}.
Rules:
- Must be different in phrasing and angle from any previously generated titles: ${JSON.stringify(previousTitles)}
- Grounded strictly in VISUAL FACT and provided context. Do NOT invent claims: no unverified "viral", "trending", "social media sensation", or fake events.
- Natural, concise (under 75 characters), suitable for search and social clicks.
- No cheap misleading clickbait, no generic filler like "সামাজিক মাধ্যমে নজর কাড়ল...".
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

  const textModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
  let lastError: unknown = null;
  let responseText: string | undefined;

  for (const model of textModels) {
    try {
      const response = await withGeminiRetry(
        async () => {
          return await ai.models.generateContent({
            model,
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
        },
        { maxRetries: 2, initialDelayMs: 1200 }
      );

      responseText = response.text;
      if (responseText) break;
    } catch (err: unknown) {
      lastError = err;
      if (is503OrUnavailable(err)) {
        console.warn(`[geminiService] Title model ${model} returned 503, trying fallback:`, err);
        continue;
      }
      throw err;
    }
  }

  if (!responseText) {
    if (lastError && is503OrUnavailable(lastError)) {
      throw new Error('AI title service is temporarily busy. Please try again.');
    }
    throw lastError instanceof Error ? lastError : new Error('Failed to generate alternative title.');
  }

  const rawText = responseText.trim() || '{}';
  try {
    const parsed = JSON.parse(rawText);
    return parsed.title?.trim() || '';
  } catch (err) {
    console.error('Failed to parse regenerated title JSON:', rawText, err);
    throw new Error('Failed to generate alternative title.');
  }
}

export interface CaptionsResult {
  shortCaption: string;
  engagingStoryCaption: string;
  callToActionCaption: string;
  hashtags: string[];
  suggestedLabels: string[];
}

/**
 * Generate engaging Bengali & English captions for Blogger posts and social distribution.
 */
export async function generateCaptions({
  topicOrContext,
  language = 'bn',
  customApiKey,
}: {
  topicOrContext: string;
  language?: 'bn' | 'en';
  customApiKey?: string;
}): Promise<CaptionsResult> {
  const ai = getGenAiClient(customApiKey);
  const isBengali = language === 'bn';

  const systemInstruction = `You are a professional social media and Blogger copywriter.
Generate engaging captions in natural, grammatically flawless ${isBengali ? 'Bengali (বাংলা)' : 'English'}.
Provide:
1. shortCaption: 1-2 punchy sentences.
2. engagingStoryCaption: 3-5 sentences evocative narrative.
3. callToActionCaption: Caption ending with an engaging question/call-to-action to encourage comments.
4. hashtags: 5-8 relevant hashtags with '#' prefix.
5. suggestedLabels: 3-5 category names suitable for Blogger labels (without '#').`;

  const promptText = `Context / Topic: ${topicOrContext}\nLanguage: ${isBengali ? 'Bengali (বাংলা)' : 'English'}`;

  const textModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
  let lastError: unknown = null;
  let responseText: string | undefined;

  for (const model of textModels) {
    try {
      const response = await withGeminiRetry(async () => {
        return await ai.models.generateContent({
          model,
          contents: { text: promptText },
          config: {
            systemInstruction,
            temperature: 0.75,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                shortCaption: { type: Type.STRING },
                engagingStoryCaption: { type: Type.STRING },
                callToActionCaption: { type: Type.STRING },
                hashtags: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                suggestedLabels: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ['shortCaption', 'engagingStoryCaption', 'callToActionCaption', 'hashtags', 'suggestedLabels'],
            },
          },
        });
      });
      responseText = response.text;
      if (responseText) break;
    } catch (err: unknown) {
      lastError = err;
      if (is503OrUnavailable(err)) continue;
      throw err;
    }
  }

  if (!responseText) {
    throw lastError instanceof Error ? lastError : new Error('Failed to generate captions.');
  }

  return JSON.parse(responseText.trim());
}

export interface ArticleRewriteResult {
  enhancedTitle: string;
  metaDescription: string;
  enhancedContentHtml: string;
  enhancedContentText: string;
  labels: string[];
  readingTimeMinutes: number;
  changesSummary: string;
}

/**
 * Rewrites, enhances, proofreads, and formats an article for Google Blogger.
 */
export async function generateSeoArticleAndProofread({
  originalTitle,
  originalContent,
  language = 'bn',
  tone = 'informative',
  customApiKey,
}: {
  originalTitle: string;
  originalContent: string;
  language?: 'bn' | 'en';
  tone?: 'informative' | 'storytelling' | 'journalistic';
  customApiKey?: string;
}): Promise<ArticleRewriteResult> {
  const ai = getGenAiClient(customApiKey);
  const isBengali = language === 'bn';

  const systemInstruction = `You are a senior editor and SEO architect for Google Blogger.
Your job is to rewrite, enhance, proofread, and format the provided article into clean, mobile-responsive HTML suitable for Blogger.
Guidelines:
- Language: Natural, expressive, grammatically immaculate ${isBengali ? 'Bengali (বাংলা)' : 'English'}.
- Tone: ${tone}.
- Structure:
  - An eye-catching, SEO-optimized title (under 75 characters).
  - A compelling meta description (120-155 characters).
  - Clean HTML body with <h2> and <h3> subheadings, well-spaced <p> paragraphs, and where appropriate <ul>/<li> bullet points.
  - DO NOT wrap in <html>, <head>, or <body> tags. Output only post body inner HTML.
  - Highlight key takeaways cleanly.
  - Fix any spelling, punctuation, or grammar issues from the original draft.
- Return structured JSON according to the schema.`;

  const promptText = `Original Title: ${originalTitle}\n\nOriginal Content:\n${originalContent}`;

  const textModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
  let lastError: unknown = null;
  let responseText: string | undefined;

  for (const model of textModels) {
    try {
      const response = await withGeminiRetry(async () => {
        return await ai.models.generateContent({
          model,
          contents: { text: promptText },
          config: {
            systemInstruction,
            temperature: 0.7,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                enhancedTitle: { type: Type.STRING },
                metaDescription: { type: Type.STRING },
                enhancedContentHtml: { type: Type.STRING },
                enhancedContentText: { type: Type.STRING },
                labels: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                readingTimeMinutes: { type: Type.INTEGER },
                changesSummary: { type: Type.STRING },
              },
              required: [
                'enhancedTitle',
                'metaDescription',
                'enhancedContentHtml',
                'enhancedContentText',
                'labels',
                'readingTimeMinutes',
                'changesSummary',
              ],
            },
          },
        });
      });
      responseText = response.text;
      if (responseText) break;
    } catch (err: unknown) {
      lastError = err;
      if (is503OrUnavailable(err)) continue;
      throw err;
    }
  }

  if (!responseText) {
    throw lastError instanceof Error ? lastError : new Error('Failed to rewrite article.');
  }

  return JSON.parse(responseText.trim());
}

export interface SeoAuditResult {
  seoScore: number;
  readabilityScore: number;
  wordCount: number;
  strengths: string[];
  improvements: string[];
  suggestedKeywords: string[];
  isMobileOptimized: boolean;
}

/**
 * Audits article content quality, readability, and search-engine readiness.
 */
export async function checkContentQualityAndSeo({
  title,
  content,
  language = 'bn',
  customApiKey,
}: {
  title: string;
  content: string;
  language?: 'bn' | 'en';
  customApiKey?: string;
}): Promise<SeoAuditResult> {
  const ai = getGenAiClient(customApiKey);
  const isBengali = language === 'bn';

  const systemInstruction = `You are an SEO auditor and readability specialist for web articles.
Analyze the provided title and article content for:
1. SEO readiness (title length, keyword clarity, structure).
2. Readability in ${isBengali ? 'Bengali (বাংলা)' : 'English'}.
3. Strengths and actionable improvements.
Score each metric from 0 to 100.
Respond in JSON according to the schema.`;

  const promptText = `Title: ${title}\nContent:\n${content.slice(0, 4000)}`;

  const textModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
  let lastError: unknown = null;
  let responseText: string | undefined;

  for (const model of textModels) {
    try {
      const response = await withGeminiRetry(async () => {
        return await ai.models.generateContent({
          model,
          contents: { text: promptText },
          config: {
            systemInstruction,
            temperature: 0.3,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                seoScore: { type: Type.INTEGER, description: 'Score between 0 and 100' },
                readabilityScore: { type: Type.INTEGER, description: 'Score between 0 and 100' },
                wordCount: { type: Type.INTEGER },
                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
                suggestedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                isMobileOptimized: { type: Type.BOOLEAN },
              },
              required: ['seoScore', 'readabilityScore', 'wordCount', 'strengths', 'improvements', 'suggestedKeywords', 'isMobileOptimized'],
            },
          },
        });
      });
      responseText = response.text;
      if (responseText) break;
    } catch (err: unknown) {
      lastError = err;
      if (is503OrUnavailable(err)) continue;
      throw err;
    }
  }

  if (!responseText) {
    throw lastError instanceof Error ? lastError : new Error('Failed to audit content.');
  }

  return JSON.parse(responseText.trim());
}

