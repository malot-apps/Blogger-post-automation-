'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  PlusCircle,
  Share2,
  Globe,
  Film,
  Image as ImageIcon,
  Tag,
} from 'lucide-react';

export interface PublishedPostData {
  id: string;
  blogId: string;
  title: string;
  url: string;
  thumbnailUrl?: string;
  published: string;
  labels?: string[];
  imageUrl?: string;
}

interface SuccessScreenProps {
  post: PublishedPostData;
  blogName?: string;
  onReset: () => void;
}

export function SuccessScreen({ post, blogName, onReset }: SuccessScreenProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(post.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = post.url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          url: post.url,
        });
      } catch {
        // User cancelled share
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 text-center max-w-lg mx-auto animate-in zoom-in-95 duration-200">
      {/* Success Badge */}
      <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50">
        <CheckCircle2 className="w-9 h-9" />
      </div>

      <h2 className="text-xl font-bold text-slate-900 mb-1">
        Published Successfully!
      </h2>
      <p className="text-xs text-slate-500 mb-5">
        Your post is live on <span className="font-semibold text-slate-700">{blogName || 'Blogger'}</span>
      </p>

      {/* Post Summary Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left mb-6 space-y-3">
        {/* Images Preview Row */}
        <div className="grid grid-cols-2 gap-2">
          {post.imageUrl && (
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 flex items-center space-x-1">
                <ImageIcon className="w-3 h-3 text-orange-500" />
                <span>Main Image</span>
              </span>
              <div className="h-28 bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.imageUrl}
                  alt={post.title}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </div>
          )}

          {post.thumbnailUrl && (
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 flex items-center space-x-1">
                <Film className="w-3 h-3 text-purple-500" />
                <span>Thumbnail / Cover</span>
              </span>
              <div className="h-28 bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.thumbnailUrl}
                  alt="Thumbnail"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </div>
          )}
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-wider font-bold text-orange-600">
            Post Title
          </p>
          <h3 className="text-sm font-bold text-slate-900 mt-0.5 leading-snug">
            {post.title}
          </h3>
        </div>

        {post.labels && post.labels.length > 0 && (
          <div className="flex items-center space-x-1 flex-wrap gap-1">
            <Tag className="w-3 h-3 text-slate-400" />
            {post.labels.map((l) => (
              <span
                key={l}
                className="bg-white border border-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full"
              >
                {l}
              </span>
            ))}
          </div>
        )}

        {/* URL Box */}
        <div>
          <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-1">
            Live URL
          </p>
          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-2 text-xs">
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-orange-600 hover:text-orange-700 font-medium underline flex items-center space-x-1 mr-2"
            >
              <Globe className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{post.url}</span>
            </a>
            <button
              type="button"
              onClick={handleCopyLink}
              className="p-1 text-slate-500 hover:text-slate-800 shrink-0"
              title="Copy URL"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2.5">
        {/* Open Live Post */}
        <a
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center space-x-2 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-bold py-3.5 px-4 rounded-xl text-sm shadow-md shadow-orange-600/20 transition-all"
        >
          <span>Open Live Post</span>
          <ExternalLink className="w-4 h-4" />
        </a>

        <div className="grid grid-cols-2 gap-2">
          {/* Copy Link Button */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center justify-center space-x-1.5 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 text-slate-700 font-semibold py-2.5 px-3 rounded-xl text-xs transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-600" />
                <span>Copy Link</span>
              </>
            )}
          </button>

          {/* Share Button (Native Mobile Share) */}
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center justify-center space-x-1.5 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 text-slate-700 font-semibold py-2.5 px-3 rounded-xl text-xs transition-colors"
          >
            <Share2 className="w-4 h-4 text-slate-600" />
            <span>Share</span>
          </button>
        </div>

        {/* Publish Another Post */}
        <button
          type="button"
          onClick={onReset}
          className="w-full mt-2 flex items-center justify-center space-x-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold py-2.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Publish Another Post</span>
        </button>
      </div>
    </div>
  );
}
