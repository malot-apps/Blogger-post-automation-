'use client';

import React, { useState } from 'react';
import {
  X,
  Eye,
  Code,
  Copy,
  Check,
  Smartphone,
  Monitor,
  Send,
  Tag,
  Image as ImageIcon,
  Film,
} from 'lucide-react';
import { renderBloggerPostTemplate } from '@/src/templates/BloggerPostTemplate';

interface PostPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  imageUrl: string;
  thumbnailUrl?: string;
  caption: string;
  labels: string;
  templateString: string;
  onPublishNow: () => void;
  isPublishing: boolean;
  blogName?: string;
}

export function PostPreviewModal({
  isOpen,
  onClose,
  title,
  imageUrl,
  thumbnailUrl,
  caption,
  labels,
  templateString,
  onPublishNow,
  isPublishing,
  blogName,
}: PostPreviewModalProps) {
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual');
  const [deviceMode, setDeviceMode] = useState<'mobile' | 'desktop'>('mobile');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const effectiveThumbnailUrl = thumbnailUrl && thumbnailUrl.trim().length > 0
    ? thumbnailUrl.trim()
    : imageUrl;

  const finalHtml = renderBloggerPostTemplate(templateString, {
    title,
    imageUrl,
    thumbnailUrl: effectiveThumbnailUrl,
    caption,
  });

  const parsedLabels = labels
    .split(',')
    .map((l) => l.trim())
    .filter(Boolean);

  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(finalHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center space-x-2">
            <Eye className="w-5 h-5 text-orange-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-none">
                Blogger Post Preview
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Target: {blogName || 'Selected Blog'}
              </p>
            </div>
          </div>

          {/* Tab switches */}
          <div className="flex items-center space-x-2">
            <div className="bg-slate-200/80 p-0.5 rounded-lg flex items-center text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('visual')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  activeTab === 'visual'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Visual
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('code')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  activeTab === 'code'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                HTML
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              aria-label="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Post Title & Images Meta Bar */}
        <div className="px-4 py-2 bg-slate-100/70 border-b border-slate-200 text-xs text-slate-700 shrink-0 flex flex-wrap items-center justify-between gap-2">
          <div className="font-semibold text-slate-900 truncate max-w-sm">
            Title: <span className="font-normal">{title}</span>
          </div>

          <div className="flex items-center space-x-3 text-[11px] text-slate-500">
            <span className="flex items-center space-x-1">
              <ImageIcon className="w-3 h-3 text-orange-500" />
              <span>Main Image: Set</span>
            </span>
            <span className="flex items-center space-x-1">
              <Film className="w-3 h-3 text-purple-500" />
              <span>Thumbnail: {thumbnailUrl ? 'Custom' : 'Sync'}</span>
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50">
          {activeTab === 'visual' ? (
            <div className="flex flex-col items-center">
              {/* Responsive Frame Controller */}
              <div className="flex items-center space-x-2 mb-3 self-end">
                <button
                  type="button"
                  onClick={() => setDeviceMode('mobile')}
                  className={`p-1.5 rounded-md text-xs flex items-center space-x-1 ${
                    deviceMode === 'mobile'
                      ? 'bg-orange-100 text-orange-700 font-semibold'
                      : 'text-slate-500 hover:bg-slate-200'
                  }`}
                  title="Mobile View"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeviceMode('desktop')}
                  className={`p-1.5 rounded-md text-xs flex items-center space-x-1 ${
                    deviceMode === 'desktop'
                      ? 'bg-orange-100 text-orange-700 font-semibold'
                      : 'text-slate-500 hover:bg-slate-200'
                  }`}
                  title="Desktop View"
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Desktop</span>
                </button>
              </div>

              {/* Rendered Blogger Post Container */}
              <div
                className={`bg-white rounded-xl shadow-sm border border-slate-200 p-4 transition-all duration-200 ${
                  deviceMode === 'mobile' ? 'w-full max-w-sm' : 'w-full max-w-xl'
                }`}
              >
                {/* Simulated Blogger Post Heading */}
                <h2 className="text-lg font-bold text-slate-900 mb-3 pb-2 border-b border-slate-100">
                  {title}
                </h2>

                {/* The Injected Blogger Template HTML via iframe or rendered html */}
                <iframe
                  title="Blogger Rendered Post"
                  srcDoc={finalHtml}
                  className="w-full min-h-[480px] border-0 rounded-lg overflow-hidden"
                  sandbox="allow-scripts allow-same-origin allow-popups"
                />
              </div>
            </div>
          ) : (
            /* Raw HTML View */
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-600">
                  Generated Blogger HTML Template Output
                </span>
                <button
                  type="button"
                  onClick={handleCopyHtml}
                  className="flex items-center space-x-1 text-xs bg-white border border-slate-300 text-slate-700 px-2.5 py-1 rounded-lg hover:bg-slate-50 shadow-xs"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-medium">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy HTML</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-[420px] leading-relaxed border border-slate-800">
                {finalHtml}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-3 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Back to Edit
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onPublishNow();
            }}
            disabled={isPublishing}
            className="flex items-center space-x-1.5 bg-linear-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs shadow-md shadow-orange-600/20 transition-all disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publish This Post Now</span>
          </button>
        </div>
      </div>
    </div>
  );
}
