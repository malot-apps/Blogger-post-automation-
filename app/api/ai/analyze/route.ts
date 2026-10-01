import { NextRequest, NextResponse } from 'next/server';
import { analyzeImageUrlWithGemini } from '@/src/server/imageAnalysisService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, imageUrl, language = 'bn' } = body;
    const targetUrl = imageUrl || image;

    if (!targetUrl || typeof targetUrl !== 'string') {
      return NextResponse.json(
        { error: 'Please select, upload, or provide an image URL first to generate with AI.' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured on the server. Please check your environment variables.' },
        { status: 500 }
      );
    }

    const analysis = await analyzeImageUrlWithGemini({
      imageUrl: targetUrl,
      language: language === 'en' ? 'en' : 'bn',
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
