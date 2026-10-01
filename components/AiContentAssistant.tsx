'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  Check,
  CheckCheck,
  Bot,
  Globe,
  Film,
  Type,
  AlertCircle,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import {
  composeAiThumbnail,
  COMPOSITION_STYLES,
  type CompositionStyle,
  type ComposedThumbnailResult,
} from '@/src/lib/thumbnailComposer';

interface AiContentAssistantProps {
  mainImageSrc: string | null;
  onSelectMainImageTrigger: () => void;
  onApplyTitle: (title: string) => void;
  onApplyThumbnail: (dataUrl: string) => void;
  currentTitle: string;
  currentThumbnailSrc: string | null;
}

interface ImageAnalysisData {
  title: string;
  summary: string;
  mainSubject: string;
  context: string;
  focalPoint: {
    xPercent: number;
    yPercent: number;
    recommendedZoom: number;
  };
  croppingInstructions?: {
    targetAspectRatio: string;
    compositionAdvice: string;
    recommendedStyle?: string;
  };
  suggestedBadge?: string;
}

export function AiContentAssistant({
  mainImageSrc,
  onSelectMainImageTrigger,
  onApplyTitle,
  onApplyThumbnail,
  currentTitle,
  currentThumbnailSrc,
}: AiContentAssistantProps) {
  // Language selector: 'bn' (বাংলা) or 'en' (English) - Default: বাংলা
  const [language, setLanguage] = useState<'bn' | 'en'>('bn');

  // AI Generation status
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStepText, setAnalysisStepText] = useState('Analyzing image...');
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // AI Results
  const [aiAnalysis, setAiAnalysis] = useState<ImageAnalysisData | null>(null);
  const [editableAiTitle, setEditableAiTitle] = useState('');
  const [aiThumbnailResult, setAiThumbnailResult] = useState<ComposedThumbnailResult | null>(null);

  // Regeneration state
  const [isRegeneratingTitle, setIsRegeneratingTitle] = useState(false);
  const [isRegeneratingThumbnail, setIsRegeneratingThumbnail] = useState(false);
  const [currentStyleIndex, setCurrentStyleIndex] = useState(0);
  const [previousTitles, setPreviousTitles] = useState<string[]>([]);

  // Derived feedback states (no effect needed)
  const isTitleApplied = Boolean(editableAiTitle && currentTitle === editableAiTitle);
  const isThumbnailApplied = Boolean(
    aiThumbnailResult && currentThumbnailSrc === aiThumbnailResult.dataUrl
  );

  /**
   * Main AI Generation: Understands image -> Generates SEO title + 1200x675 thumbnail
   */
  const handleGenerateWithAi = async () => {
    if (!mainImageSrc) {
      onSelectMainImageTrigger();
      return;
    }

    setAnalysisError(null);
    setIsAnalyzing(true);
    setAnalysisStepText('Analyzing image with AI...');

    try {
      // Step 1: Call server API to understand image and craft SEO title
      setAnalysisStepText(
        language === 'bn' ? 'ছবি ও বিষয়বস্তু বিশ্লেষণ করা হচ্ছে...' : 'Understanding image & subject...'
      );

      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: mainImageSrc,
          language,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to analyze image with AI');
      }

      const analysis: ImageAnalysisData = json.data;
      setAiAnalysis(analysis);
      setEditableAiTitle(analysis.title);
      setPreviousTitles([analysis.title]);

      // Step 2: Generate professional 16:9 thumbnail using native Gemini image model
      setAnalysisStepText(
        language === 'bn' ? 'জেমিনাই ১৬:৯ থাম্বনেইল তৈরি হচ্ছে...' : 'Generating 16:9 thumbnail with Gemini...'
      );

      const initialStyle = COMPOSITION_STYLES[0].id;
      setCurrentStyleIndex(0);

      let generatedThumbUrl: string | null = null;
      let thumbError: string | null = null;

      try {
        const thumbRes = await fetch('/api/ai/generate-thumbnail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: mainImageSrc,
            subjectContext: `${analysis.mainSubject}. ${analysis.summary}`,
            style: initialStyle,
            language,
          }),
        });

        const thumbJson = await thumbRes.json();
        if (!thumbRes.ok || !thumbJson.success || !thumbJson.thumbnailUrl) {
          if (thumbRes.status === 503 || thumbJson.error?.includes('503') || thumbJson.error?.includes('busy')) {
            thumbError = 'AI thumbnail service is temporarily busy. Please try again.';
          } else {
            thumbError = thumbJson.error || 'Failed to generate thumbnail with AI.';
          }
        } else {
          generatedThumbUrl = thumbJson.thumbnailUrl;
        }
      } catch (tErr: unknown) {
        thumbError = 'AI thumbnail service is temporarily busy. Please try again.';
      }

      if (generatedThumbUrl) {
        const composed: ComposedThumbnailResult = {
          dataUrl: generatedThumbUrl,
          width: 1200,
          height: 675,
          style: initialStyle,
          styleLabel: 'Gemini Native 16:9',
        };

        setAiThumbnailResult(composed);
        onApplyThumbnail(generatedThumbUrl);
      } else if (thumbError) {
        // If image generation failed, do NOT silently report success
        setAnalysisError(thumbError);
      }

      // Auto-apply title
      onApplyTitle(analysis.title);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI generation failed.';
      if (msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('busy')) {
        setAnalysisError('AI thumbnail service is temporarily busy. Please try again.');
      } else {
        setAnalysisError(msg);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Regenerate SEO Title only (keeping original image)
   */
  const handleRegenerateTitle = async () => {
    if (!mainImageSrc) return;
    setIsRegeneratingTitle(true);
    setAnalysisError(null);

    try {
      const res = await fetch('/api/ai/regenerate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: mainImageSrc,
          language,
          previousTitles,
          contextSummary: aiAnalysis ? `${aiAnalysis.mainSubject}. ${aiAnalysis.context}` : '',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to regenerate title');
      }

      const newTitle = json.title;
      setEditableAiTitle(newTitle);
      setPreviousTitles((prev) => [...prev, newTitle]);
      onApplyTitle(newTitle);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Title regeneration failed.';
      setAnalysisError(msg);
    } finally {
      setIsRegeneratingTitle(false);
    }
  };

  /**
   * Regenerate Thumbnail only:
   * Uses Gemini native image-generation model to generate an alternative 16:9 thumbnail
   */
  const handleRegenerateThumbnail = async () => {
    if (!mainImageSrc) return;
    setIsRegeneratingThumbnail(true);
    setAnalysisError(null);

    try {
      const nextIndex = (currentStyleIndex + 1) % COMPOSITION_STYLES.length;
      setCurrentStyleIndex(nextIndex);
      const nextStyle = COMPOSITION_STYLES[nextIndex].id;

      const thumbRes = await fetch('/api/ai/generate-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: mainImageSrc,
          subjectContext: aiAnalysis ? `${aiAnalysis.mainSubject}. ${aiAnalysis.summary}` : '',
          style: nextStyle,
          language,
        }),
      });

      const thumbJson = await thumbRes.json();
      if (!thumbRes.ok || !thumbJson.success || !thumbJson.thumbnailUrl) {
        if (thumbRes.status === 503 || thumbJson.error?.includes('busy') || thumbJson.error?.includes('503')) {
          throw new Error('AI thumbnail service is temporarily busy. Please try again.');
        }
        throw new Error(thumbJson.error || 'Failed to generate thumbnail with AI.');
      }

      const generatedDataUrl = thumbJson.thumbnailUrl;
      const thumbResult: ComposedThumbnailResult = {
        dataUrl: generatedDataUrl,
        width: 1200,
        height: 675,
        style: nextStyle,
        styleLabel: COMPOSITION_STYLES[nextIndex].label,
      };

      setAiThumbnailResult(thumbResult);
      onApplyThumbnail(generatedDataUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Thumbnail generation failed.';
      if (msg.includes('503') || msg.includes('busy')) {
        setAnalysisError('AI thumbnail service is temporarily busy. Please try again.');
      } else {
        setAnalysisError(msg);
      }
    } finally {
      setIsRegeneratingThumbnail(false);
    }
  };

  return (
    <div className="space-y-3 pt-1">
      {/* AI Controls Bar: Language Selector + Primary AI Button */}
      <div className="bg-linear-to-r from-orange-50 via-amber-50 to-orange-50/70 border border-orange-200/90 rounded-2xl p-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Language Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1 shrink-0">
              <Globe className="w-3.5 h-3.5 text-orange-600" />
              <span>Language:</span>
            </span>
            <div className="inline-flex rounded-xl bg-white p-0.5 border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setLanguage('bn')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  language === 'bn'
                    ? 'bg-orange-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                বাংলা
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  language === 'en'
                    ? 'bg-orange-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* 🤖 Generate with AI Button */}
          <button
            type="button"
            onClick={handleGenerateWithAi}
            disabled={isAnalyzing}
            className="flex items-center justify-center space-x-2 bg-linear-to-r from-orange-600 via-amber-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 active:scale-[0.98] text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-sm shadow-orange-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isAnalyzing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{analysisStepText}</span>
              </>
            ) : (
              <>
                <Bot className="w-4 h-4 text-orange-100" />
                <span>🤖 Generate with AI</span>
              </>
            )}
          </button>
        </div>

        {/* Informative Sub-text */}
        {!aiAnalysis && !isAnalyzing && (
          <p className="text-[11px] text-slate-500 mt-2 flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-orange-500 shrink-0" />
            <span>
              Select an image, then tap &apos;Generate with AI&apos; for an SEO title &amp; 16:9 thumbnail.
            </span>
          </p>
        )}
      </div>

      {/* Analyzing Progress State */}
      {isAnalyzing && (
        <div className="bg-white rounded-2xl border border-orange-200 p-5 shadow-xs text-center space-y-3">
          <div className="relative w-12 h-12 mx-auto">
            <div className="w-12 h-12 border-3 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-orange-600">
              <Bot className="w-5 h-5 animate-pulse" />
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">{analysisStepText}</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Analyzing visual elements, subject context, and creating 1200×675 composition...
            </p>
          </div>
        </div>
      )}

      {/* Analysis Error Alert */}
      {analysisError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">AI Assistant Notice</p>
            <p>{analysisError}</p>
          </div>
        </div>
      )}

      {/* Generated AI Results Box */}
      {aiAnalysis && !isAnalyzing && (
        <div className="bg-white rounded-2xl border border-orange-200 shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800">AI Generated Content</h3>
                <p className="text-[10px] text-slate-500">
                  Subject: <span className="font-medium text-slate-700">{aiAnalysis.mainSubject || 'Detected'}</span>
                </p>
              </div>
            </div>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-600" />
              <span>Ready</span>
            </span>
          </div>

          {/* 1. AI Generated Title (Editable) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <Type className="w-3.5 h-3.5 text-orange-600" />
                <span>AI Generated Title</span>
              </label>
              <span className="text-[10px] text-slate-400">
                {language === 'bn' ? 'বাংলা এসইও শিরোনাম' : 'SEO Title'}
              </span>
            </div>

            {/* Editable Title Input */}
            <input
              type="text"
              value={editableAiTitle}
              onChange={(e) => {
                setEditableAiTitle(e.target.value);
                onApplyTitle(e.target.value);
              }}
              placeholder="AI generated title..."
              className="w-full text-xs font-semibold text-slate-800 bg-slate-50/70 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
            />

            {/* Action Buttons for Title */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => {
                  onApplyTitle(editableAiTitle);
                }}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors ${
                  isTitleApplied
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                    : 'bg-orange-600 hover:bg-orange-700 text-white shadow-2xs'
                }`}
              >
                {isTitleApplied ? (
                  <>
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>✓ Title in Use</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>✓ Use AI Title</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleRegenerateTitle}
                disabled={isRegeneratingTitle}
                className="text-xs text-slate-600 hover:text-orange-600 bg-slate-100 hover:bg-orange-50 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRegeneratingTitle ? 'animate-spin text-orange-600' : ''}`} />
                <span>{isRegeneratingTitle ? 'Generating...' : '↻ Regenerate Title'}</span>
              </button>
            </div>
          </div>

          {/* 2. AI Thumbnail (Exact 1200×675 / 16:9) */}
          {aiThumbnailResult && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                  <Film className="w-3.5 h-3.5 text-purple-600" />
                  <span>AI Thumbnail</span>
                </label>
                <div className="flex items-center space-x-1.5 text-[10px]">
                  <span className="font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                    1200×675 • 16:9
                  </span>
                  <span className="text-slate-500">({aiThumbnailResult.styleLabel})</span>
                </div>
              </div>

              {/* Thumbnail Preview (Rendered at exact 16:9 aspect ratio matching Blogger video container) */}
              <div className="relative bg-slate-950 rounded-xl overflow-hidden border border-slate-300 shadow-xs">
                <div className="relative aspect-16/9 w-full flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={aiThumbnailResult.dataUrl}
                    alt="AI Composed Thumbnail"
                    className="w-full h-full object-cover"
                  />

                  {/* Play Button Simulation overlay (matches template) */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-xs text-white/90 flex items-center justify-center text-xl shadow-md border border-white/20">
                      ▶
                    </div>
                  </div>

                  {/* Bottom badge indicator */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white text-[10px] pointer-events-none">
                    <span className="bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-full font-semibold">
                      Exact Template Size (1200×675)
                    </span>
                    <span className="bg-purple-600/80 backdrop-blur-xs px-2 py-0.5 rounded-full font-mono">
                      &#123;&#123;THUMBNAIL_URL&#125;&#125;
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons for Thumbnail */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onApplyThumbnail(aiThumbnailResult.dataUrl);
                  }}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors ${
                    isThumbnailApplied
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                      : 'bg-purple-600 hover:bg-purple-700 text-white shadow-2xs'
                  }`}
                >
                  {isThumbnailApplied ? (
                    <>
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>✓ Thumbnail in Use</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>✓ Use AI Thumbnail</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleRegenerateThumbnail}
                  disabled={isRegeneratingThumbnail}
                  className="text-xs text-slate-600 hover:text-purple-600 bg-slate-100 hover:bg-purple-50 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                  title="Cycles through alternative 16:9 compositions of the same image"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isRegeneratingThumbnail ? 'animate-spin text-purple-600' : ''}`}
                  />
                  <span>
                    {isRegeneratingThumbnail ? 'Composing...' : '↻ Regenerate Thumbnail'}
                  </span>
                </button>
              </div>

              {aiAnalysis.croppingInstructions?.compositionAdvice && (
                <div className="bg-purple-50/70 border border-purple-200/80 rounded-lg p-2 text-[11px] text-purple-900 flex items-start space-x-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                  <p className="leading-snug">{aiAnalysis.croppingInstructions.compositionAdvice}</p>
                </div>
              )}

              <p className="text-[10px] text-slate-400 text-center pt-0.5">
                Regenerating cycles through distinct 16:9 compositions using the <strong>SAME</strong> source image.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
