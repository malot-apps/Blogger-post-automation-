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
  Layers,
  Sparkles,
  AlertCircle,
  Film,
} from 'lucide-react';
import {
  processAndCompressImage,
  formatFileSize,
  type ImageProcessingResult,
} from '@/src/lib/imageUtils';

interface ImageUploaderProps {
  // Main Image
  mainImageResult: ImageProcessingResult | null;
  mainImageUrlOverride: string | null;
  onMainImageSelected: (result: ImageProcessingResult | null, urlOverride?: string | null) => void;

  // Thumbnail Image
  thumbnailResult: ImageProcessingResult | null;
  thumbnailUrlOverride: string | null;
  onThumbnailSelected: (result: ImageProcessingResult | null, urlOverride?: string | null) => void;

  isProcessing: boolean;
  setIsProcessing: (loading: boolean) => void;
}

export function ImageUploader({
  mainImageResult,
  mainImageUrlOverride,
  onMainImageSelected,
  thumbnailResult,
  thumbnailUrlOverride,
  onThumbnailSelected,
  isProcessing,
  setIsProcessing,
}: ImageUploaderProps) {
  const [showMainUrlInput, setShowMainUrlInput] = useState(false);
  const [mainUrlInputValue, setMainUrlInputValue] = useState('');

  const [useSeparateThumbnail, setUseSeparateThumbnail] = useState(false);
  const [showThumbUrlInput, setShowThumbUrlInput] = useState(false);
  const [thumbUrlInputValue, setThumbUrlInputValue] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mainFileInputRef = useRef<HTMLInputElement>(null);
  const mainCameraInputRef = useRef<HTMLInputElement>(null);
  const thumbFileInputRef = useRef<HTMLInputElement>(null);
  const thumbCameraInputRef = useRef<HTMLInputElement>(null);

  const handleProcessFile = async (file: File, isThumb = false) => {
    if (!file) return;
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const processed = await processAndCompressImage(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.82,
      });
      if (isThumb) {
        onThumbnailSelected(processed, null);
      } else {
        onMainImageSelected(processed, null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to process image';
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyMainUrl = () => {
    const trimmed = mainUrlInputValue.trim();
    if (!trimmed || (!trimmed.startsWith('http://') && !trimmed.startsWith('https://'))) {
      setErrorMessage('Please enter a valid HTTP/HTTPS image URL');
      return;
    }
    setErrorMessage(null);
    onMainImageSelected(null, trimmed);
    setShowMainUrlInput(false);
  };

  const handleApplyThumbUrl = () => {
    const trimmed = thumbUrlInputValue.trim();
    if (!trimmed || (!trimmed.startsWith('http://') && !trimmed.startsWith('https://'))) {
      setErrorMessage('Please enter a valid HTTP/HTTPS thumbnail URL');
      return;
    }
    setErrorMessage(null);
    onThumbnailSelected(null, trimmed);
    setShowThumbUrlInput(false);
  };

  const activeMainSrc = mainImageUrlOverride || mainImageResult?.dataUrl;
  const activeThumbSrc = thumbnailUrlOverride || thumbnailResult?.dataUrl;
  const effectiveThumbSrc = activeThumbSrc || activeMainSrc;

  return (
    <div className="space-y-3.5">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={mainFileInputRef}
        onChange={(e) => {
          if (e.target.files?.[0]) handleProcessFile(e.target.files[0], false);
          e.target.value = '';
        }}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={mainCameraInputRef}
        onChange={(e) => {
          if (e.target.files?.[0]) handleProcessFile(e.target.files[0], false);
          e.target.value = '';
        }}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      <input
        type="file"
        ref={thumbFileInputRef}
        onChange={(e) => {
          if (e.target.files?.[0]) handleProcessFile(e.target.files[0], true);
          e.target.value = '';
        }}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={thumbCameraInputRef}
        onChange={(e) => {
          if (e.target.files?.[0]) handleProcessFile(e.target.files[0], true);
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

      {/* 2. Separate Video Thumbnail / Cover (Optional) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1.5">
            <Film className="w-4 h-4 text-orange-600" />
            <span className="text-xs font-bold text-slate-800">
              Video Player Thumbnail
            </span>
          </div>
          <span className="text-[11px] font-mono text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
            &#123;&#123;THUMBNAIL_URL&#125;&#125;
          </span>
        </div>

        {!useSeparateThumbnail && !activeThumbSrc ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
            <div className="text-xs text-slate-600">
              <span className="font-semibold text-slate-800">Auto-using Main Image</span>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Default: thumbnail uses the same photo as the main image
              </p>
            </div>
            <button
              type="button"
              onClick={() => setUseSeparateThumbnail(true)}
              className="text-xs bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold px-3 py-1.5 rounded-lg shadow-2xs transition-colors shrink-0 ml-2"
            >
              + Use Custom Thumbnail
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {activeThumbSrc ? (
              <div className="relative bg-slate-900 rounded-xl overflow-hidden border border-slate-200 shadow-xs">
                <div className="relative h-28 w-full bg-slate-950 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeThumbSrc}
                    alt="Custom Thumbnail"
                    className="max-h-full max-w-full object-contain mx-auto"
                  />
                  <div className="absolute top-2 right-2 flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => thumbFileInputRef.current?.click()}
                      className="bg-black/60 text-white text-[11px] px-2.5 py-1 rounded-full flex items-center space-x-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Change</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onThumbnailSelected(null, null);
                        setUseSeparateThumbnail(false);
                      }}
                      className="bg-black/60 text-white p-1 rounded-full hover:bg-red-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-purple-300 bg-purple-50/40 rounded-xl p-3 text-center">
                <p className="text-xs font-bold text-slate-800 mb-2">
                  Select Custom Thumbnail Image
                </p>
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <button
                    type="button"
                    onClick={() => thumbFileInputRef.current?.click()}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold py-1.5 px-3 rounded-lg shadow-2xs"
                  >
                    Upload Thumbnail
                  </button>
                  <button
                    type="button"
                    onClick={() => thumbCameraInputRef.current?.click()}
                    className="bg-white border border-slate-300 text-slate-700 text-xs font-semibold py-1.5 px-3 rounded-lg"
                  >
                    Camera
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUseSeparateThumbnail(false);
                      onThumbnailSelected(null, null);
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 py-1.5 px-2"
                  >
                    Cancel
                  </button>
                </div>

                {!showThumbUrlInput ? (
                  <button
                    type="button"
                    onClick={() => setShowThumbUrlInput(true)}
                    className="text-[10px] text-purple-700 underline"
                  >
                    or paste thumbnail URL
                  </button>
                ) : (
                  <div className="max-w-xs mx-auto flex items-center space-x-1 mt-1.5">
                    <input
                      type="url"
                      placeholder="https://example.com/thumb.jpg"
                      value={thumbUrlInputValue}
                      onChange={(e) => setThumbUrlInputValue(e.target.value)}
                      className="flex-1 text-[11px] border border-slate-200 rounded p-1"
                    />
                    <button
                      type="button"
                      onClick={handleApplyThumbUrl}
                      className="bg-purple-600 text-white p-1 rounded"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
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
