'use client';

import React, { useState, useRef } from 'react';
import {
  Upload,
  Camera,
  Image as ImageIcon,
  X,
  RefreshCw,
  Link as LinkIcon,
  Check,
  AlertCircle,
  Film,
} from 'lucide-react';
import {
  processAndCompressImage,
  formatFileSize,
  type ImageProcessingResult,
} from '@/src/lib/imageUtils';
import { AiContentAssistant } from './AiContentAssistant';

interface ImageUploaderProps {
  // Main Image (also used as Blogger Post Thumbnail & Video Player Image)
  mainImageResult: ImageProcessingResult | null;
  mainImageUrlOverride: string | null;
  onMainImageSelected: (result: ImageProcessingResult | null, urlOverride?: string | null) => void;

  isProcessing: boolean;
  setIsProcessing: (loading: boolean) => void;

  // AI Content Assistant integration
  onApplyTitle?: (title: string) => void;
  currentTitle?: string;
}

export function ImageUploader({
  mainImageResult,
  mainImageUrlOverride,
  onMainImageSelected,
  isProcessing,
  setIsProcessing,
  onApplyTitle,
  currentTitle,
}: ImageUploaderProps) {
  const [showMainUrlInput, setShowMainUrlInput] = useState(false);
  const [mainUrlInputValue, setMainUrlInputValue] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mainFileInputRef = useRef<HTMLInputElement>(null);
  const mainCameraInputRef = useRef<HTMLInputElement>(null);

  const handleProcessFile = async (file: File) => {
    if (!file) return;
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const processed = await processAndCompressImage(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.82,
      });
      onMainImageSelected(processed, null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to process image';
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyMainUrl = async () => {
    const trimmed = mainUrlInputValue.trim();
    if (!trimmed || !trimmed.startsWith('https://')) {
      setErrorMessage('Security requirement: Please enter a secure HTTPS image URL (http:// and local URLs are prohibited).');
      return;
    }
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      // Server-side verification for reachability, HTTPS, and image MIME type
      const res = await fetch('/api/images/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verifyUrl: trimmed }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.verified) {
        throw new Error(data.error || 'Server-side verification failed: Image is not publicly accessible.');
      }
      onMainImageSelected(null, data.imageUrl || trimmed);
      setShowMainUrlInput(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Image verification failed';
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const activeMainSrc = mainImageUrlOverride || mainImageResult?.dataUrl;

  return (
    <div className="space-y-3.5">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={mainFileInputRef}
        onChange={(e) => {
          if (e.target.files?.[0]) handleProcessFile(e.target.files[0]);
          e.target.value = '';
        }}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={mainCameraInputRef}
        onChange={(e) => {
          if (e.target.files?.[0]) handleProcessFile(e.target.files[0]);
          e.target.value = '';
        }}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* 1. Main Post Image (Required) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-bold text-slate-800 flex items-center space-x-1.5">
            <span>1. Main Post Image</span>
            <span className="text-red-500">*</span>
          </label>
          <span className="text-[11px] font-mono text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
            &#123;&#123;IMAGE_URL&#125;&#125;
          </span>
        </div>

        {activeMainSrc ? (
          <div className="relative bg-slate-900 rounded-xl overflow-hidden border border-slate-200 shadow-xs">
            <div className="relative aspect-16/10 sm:aspect-video w-full bg-slate-950 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeMainSrc}
                alt="Main Post Image"
                className="max-h-full max-w-full object-contain mx-auto"
              />

              <div className="absolute top-2.5 right-2.5 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => mainFileInputRef.current?.click()}
                  className="bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-medium px-3 py-1.5 rounded-full flex items-center space-x-1 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Replace</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onMainImageSelected(null, null);
                    setMainUrlInputValue('');
                  }}
                  className="bg-black/60 hover:bg-red-600/90 backdrop-blur-md text-white p-1.5 rounded-full transition-colors"
                  aria-label="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="absolute bottom-0 inset-x-0 bg-linear-to-t from-black/80 to-transparent p-2.5 text-white flex items-center justify-between text-xs">
                {mainImageResult ? (
                  <div className="flex items-center space-x-2">
                    <span className="bg-orange-500/90 px-1.5 py-0.5 rounded text-[10px] font-semibold text-white">
                      Auto-Optimized
                    </span>
                    <span className="text-slate-200 text-[11px]">
                      {mainImageResult.width}×{mainImageResult.height}px
                    </span>
                    <span className="text-emerald-400 font-medium text-[11px]">
                      {formatFileSize(mainImageResult.compressedSize)}
                    </span>
                  </div>
                ) : (
                  <span className="truncate max-w-[200px] text-[11px] text-slate-200">
                    {mainImageUrlOverride}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-slate-300 hover:border-orange-400 bg-slate-50/80 rounded-xl p-5 text-center transition-all">
            {isProcessing ? (
              <div className="py-6 flex flex-col items-center justify-center space-y-2">
                <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-semibold text-slate-700">Optimizing image...</p>
              </div>
            ) : (
              <div>
                <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mx-auto mb-2.5">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-800 mb-1">
                  Select Photo for Blogger Post
                </p>
                <p className="text-[11px] text-slate-500 mb-4">
                  Tap to pick from gallery or take a picture
                </p>

                <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto mb-2">
                  <button
                    type="button"
                    onClick={() => mainFileInputRef.current?.click()}
                    className="flex items-center justify-center space-x-1.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2.5 px-3 rounded-xl shadow-xs text-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choose Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => mainCameraInputRef.current?.click()}
                    className="flex items-center justify-center space-x-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-semibold py-2.5 px-3 rounded-xl text-xs"
                  >
                    <Camera className="w-3.5 h-3.5 text-slate-600" />
                    <span>Camera</span>
                  </button>
                </div>

                {!showMainUrlInput ? (
                  <button
                    type="button"
                    onClick={() => setShowMainUrlInput(true)}
                    className="text-[11px] text-slate-500 hover:text-orange-600 underline inline-flex items-center space-x-1"
                  >
                    <LinkIcon className="w-3 h-3" />
                    <span>or paste image URL</span>
                  </button>
                ) : (
                  <div className="mt-2 max-w-sm mx-auto p-2 bg-white rounded-lg border border-slate-200 flex items-center space-x-1.5">
                    <input
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      value={mainUrlInputValue}
                      onChange={(e) => setMainUrlInputValue(e.target.value)}
                      className="flex-1 text-xs border border-slate-200 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                    <button
                      type="button"
                      onClick={handleApplyMainUrl}
                      className="bg-orange-600 text-white p-1.5 rounded text-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowMainUrlInput(false)}
                      className="text-slate-400 p-1.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Assistant Section (SEO Title & Optional 16:9 Image Generator) */}
      <AiContentAssistant
        mainImageSrc={activeMainSrc || null}
        onSelectMainImageTrigger={() => mainFileInputRef.current?.click()}
        onApplyTitle={(newTitle) => onApplyTitle?.(newTitle)}
        onApplyAsMainImage={(dataUrl) => {
          onMainImageSelected(null, dataUrl);
        }}
        currentTitle={currentTitle || ''}
      />

      {/* 2. Blogger Post Thumbnail Indicator (Always uses {{IMAGE_URL}}) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1.5">
            <Film className="w-4 h-4 text-orange-600" />
            <span className="text-xs font-bold text-slate-800">
              Blogger Post Thumbnail
            </span>
          </div>
          <span className="text-[11px] font-mono text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
            &#123;&#123;IMAGE_URL&#125;&#125;
          </span>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
          <div className="text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Auto-using Main Post Image</span>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Main Post Image (&#123;&#123;IMAGE_URL&#125;&#125;) is automatically placed first and used as the Blogger post thumbnail.
            </p>
          </div>
          {activeMainSrc && (
            <span className="text-[11px] bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold px-2.5 py-1 rounded-lg shrink-0 ml-2 flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-600" />
              <span>Synced</span>
            </span>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
