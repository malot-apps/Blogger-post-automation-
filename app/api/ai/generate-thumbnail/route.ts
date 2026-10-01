import { NextRequest, NextResponse } from 'next/server';
import { generateNativeThumbnailWithGemini } from '@/src/server/thumbnailGenerationService';
import { is503OrUnavailable } from '@/src/server/geminiUtils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, imageUrl, subjectContext, style = 'cinematic', language = 'bn' } = body;
    const targetImage = imageUrl || image;

    if (!targetImage || typeof targetImage !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Please supply a main image to generate a thumbnail.' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY is not configured on the server.' },
        { status: 500 }
      );
    }

    const result = await generateNativeThumbnailWithGemini({
      mainImageSrc: targetImage,
      subjectContext,
      style,
      language: language === 'en' ? 'en' : 'bn',
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
