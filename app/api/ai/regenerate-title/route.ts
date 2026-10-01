import { NextRequest, NextResponse } from 'next/server';
import { regenerateSeoTitle } from '@/src/server/geminiService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, mimeType = 'image/jpeg', language = 'bn', previousTitles = [], contextSummary = '' } = body;

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured on the server.' },
        { status: 500 }
      );
    }

    const title = await regenerateSeoTitle({
      imageBase64: image || undefined,
      mimeType: mimeType || 'image/jpeg',
      language: language === 'en' ? 'en' : 'bn',
      previousTitles: Array.isArray(previousTitles) ? previousTitles : [],
      contextSummary: typeof contextSummary === 'string' ? contextSummary : '',
    });

    return NextResponse.json({
      success: true,
      title,
    });
  } catch (error: unknown) {
    console.error('AI Title Regeneration error:', error);
    const message = error instanceof Error ? error.message : 'Failed to regenerate title.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
