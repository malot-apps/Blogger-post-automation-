import { NextRequest, NextResponse } from 'next/server';
import { analyzeImageUrlWithGemini } from '@/src/server/imageAnalysisService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, imageUrl, language = 'bn', customApiKey: bodyApiKey } = body;
    const targetUrl = imageUrl || image;

    if (!targetUrl || typeof targetUrl !== 'string') {
      return NextResponse.json(
        { error: 'Please select, upload, or provide an image URL first to generate with AI.' },
        { status: 400 }
      );
    }

    const headerKey = req.headers.get('x-gemini-key');
    const customApiKey = (bodyApiKey || headerKey || '').trim() || undefined;

    if (!customApiKey && !process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured. Please enter your Gemini API key in Settings or configure GEMINI_API_KEY on the server.' },
        { status: 400 }
      );
    }

    const analysis = await analyzeImageUrlWithGemini({
      imageUrl: targetUrl,
      language: language === 'en' ? 'en' : 'bn',
      customApiKey,
    });

    return NextResponse.json({
      success: true,
      data: {
        title: analysis.title,
        summary: analysis.summary,
        mainSubject: analysis.mainSubject,
        detectedElements: analysis.detectedElements,
        focalPoint: {
          xPercent: analysis.croppingInstructions.focalPoint.xPercent,
          yPercent: analysis.croppingInstructions.focalPoint.yPercent,
          recommendedZoom: analysis.croppingInstructions.recommendedZoom,
        },
        croppingInstructions: analysis.croppingInstructions,
      },
    });
  } catch (error: unknown) {
    console.error('AI Image Analysis error:', error);
    const message = error instanceof Error ? error.message : 'Failed to analyze image with AI.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
