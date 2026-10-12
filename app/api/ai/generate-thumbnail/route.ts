import { NextRequest, NextResponse } from 'next/server';
import { generateNativeThumbnailWithGemini } from '@/src/server/thumbnailGenerationService';
import { is503OrUnavailable } from '@/src/server/geminiUtils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, imageUrl, subjectContext, style = 'cinematic', language = 'bn', customApiKey: bodyApiKey } = body;
    const targetImage = imageUrl || image;

    if (!targetImage || typeof targetImage !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Please supply a main image to generate a thumbnail.' },
        { status: 400 }
      );
    }

    const headerKey = req.headers.get('x-gemini-key');
    const customApiKey = (bodyApiKey || headerKey || '').trim() || undefined;

    if (!customApiKey && !process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Gemini API key is not configured. Please enter your Gemini API key in Settings or configure GEMINI_API_KEY on the server.' },
        { status: 400 }
      );
    }

    const result = await generateNativeThumbnailWithGemini({
      mainImageSrc: targetImage,
      subjectContext,
      style,
      language: language === 'en' ? 'en' : 'bn',
      customApiKey,
    });

    if (!result.success || !result.thumbnailUrl) {
      return NextResponse.json(
        { success: false, error: 'AI thumbnail generation did not return a valid image.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      thumbnailUrl: result.thumbnailUrl,
      modelUsed: result.modelUsed,
    });
  } catch (error: unknown) {
    console.error('AI Thumbnail Generation route error:', error);

    const isBusy = is503OrUnavailable(error);
    const message = isBusy
      ? 'AI thumbnail generation is temporarily unavailable. Your title was generated successfully. Please try the thumbnail again.'
      : error instanceof Error
      ? error.message
      : 'AI thumbnail could not be generated. Please try again.';

    const status = isBusy ? 503 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
