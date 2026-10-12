import { NextRequest, NextResponse } from 'next/server';
import {
  generateCaptions,
  generateSeoArticleAndProofread,
  checkContentQualityAndSeo,
} from '@/src/server/geminiService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, language = 'bn', customApiKey: bodyApiKey } = body;

    // Header or body custom API key
    const headerKey = req.headers.get('x-gemini-key');
    const customApiKey = (bodyApiKey || headerKey || '').trim() || undefined;

    if (!action) {
      return NextResponse.json({ error: 'Missing action parameter.' }, { status: 400 });
    }

    if (action === 'caption') {
      const { topicOrContext } = body;
      if (!topicOrContext || typeof topicOrContext !== 'string') {
        return NextResponse.json({ error: 'topicOrContext is required for caption generation.' }, { status: 400 });
      }
      const result = await generateCaptions({
        topicOrContext: topicOrContext.trim(),
        language: language === 'en' ? 'en' : 'bn',
        customApiKey,
      });
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'rewrite') {
      const { originalTitle = '', originalContent = '', tone = 'informative' } = body;
      if (!originalContent || typeof originalContent !== 'string') {
        return NextResponse.json({ error: 'originalContent is required for article rewrite.' }, { status: 400 });
      }
      const result = await generateSeoArticleAndProofread({
        originalTitle: String(originalTitle).trim(),
        originalContent: String(originalContent).trim(),
        language: language === 'en' ? 'en' : 'bn',
        tone,
        customApiKey,
      });
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'seo-audit') {
      const { title = '', content = '' } = body;
      if (!content || typeof content !== 'string') {
        return NextResponse.json({ error: 'content is required for SEO audit.' }, { status: 400 });
      }
      const result = await checkContentQualityAndSeo({
        title: String(title).trim(),
        content: String(content).trim(),
        language: language === 'en' ? 'en' : 'bn',
        customApiKey,
      });
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI tool operation failed.';
    console.error('AI tools route error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
