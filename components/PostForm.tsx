'use client';

import React, { useState } from 'react';
import {
  Send,
  Eye,
  ChevronDown,
  ChevronUp,
  Tag,
  Type,
  Sparkles,
  Layers,
  AlertCircle,
} from 'lucide-react';

interface PostFormProps {
  caption: string;
  setCaption: (caption: string) => void;
  title: string;
  setTitle: (title: string) => void;
  labels: string;
  setLabels: (labels: string) => void;
  onPreview: () => void;
  onPublish: () => void;
  isPublishing: boolean;
  canPublish: boolean;
  selectedBlogName?: string;
}

const POPULAR_LABEL_SUGGESTIONS = [
  'News',
  'Viral',
  'Entertainment',
  'Photos',
  'Updates',
  'Lifestyle',
  'Tech',
  'Stories',
];

export function PostForm({
  caption,
  setCaption,
  title,
  setTitle,
  labels,
  setLabels,
  onPreview,
  onPublish,
  isPublishing,
  canPublish,
  selectedBlogName,
}: PostFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleAddLabelChip = (tag: string) => {
    const existing = labels
      .split(',')
      .map((l) => l.trim())
      .filter(Boolean);
    if (!existing.includes(tag)) {
      const updated = existing.length > 0 ? `${existing.join(', ')}, ${tag}` : tag;
      setLabels(updated);
    }
  };

  const wordCount = caption.trim() ? caption.trim().split(/\s+/).length : 0;
  const charCount = caption.length;

  return (
    <div className="space-y-4">
      {/* 2. Caption Area */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="caption-input"
            className="text-sm font-bold text-slate-800 flex items-center space-x-1.5"
          >
            <span>2. Enter Caption</span>
            <span className="text-red-500">*</span>
          </label>
          <div className="text-[11px] text-slate-400">
            {wordCount} words · {charCount} chars
          </div>
        </div>

        <textarea
          id="caption-input"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write what happened, descriptions, story details, or thoughts. Line breaks and paragraphs are preserved..."
          rows={4}
          className="w-full text-sm text-slate-800 placeholder-slate-400 bg-slate-50/70 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all resize-y min-h-[110px]"
        />
      </div>

      {/* Optional Details Accordion (Title, Labels) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-orange-600" />
            <span className="text-xs font-bold text-slate-800">
              Optional Post Options
            </span>
            {(title.trim() || labels.trim()) && (
              <span className="bg-orange-100 text-orange-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                Customized
              </span>
            )}
          </div>
          <div className="text-slate-400">
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        {showAdvanced && (
          <div className="p-4 pt-1 space-y-3.5 border-t border-slate-100 bg-slate-50/50">
            {/* Optional Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center space-x-1">
                  <Type className="w-3.5 h-3.5 text-slate-400" />
                  <span>Custom Post Title (Optional)</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  Auto-generates if empty
                </span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Leave blank to auto-create from caption"
                className="w-full text-xs text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Optional Labels */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span>Blogger Labels / Categories (Optional)</span>
              </label>
              <input
                type="text"
                value={labels}
                onChange={(e) => setLabels(e.target.value)}
                placeholder="e.g. News, Viral, Entertainment"
                className="w-full text-xs text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 mb-2"
              />

              {/* Quick Label Chips */}
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] text-slate-400 mr-1">Quick add:</span>
                {POPULAR_LABEL_SUGGESTIONS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleAddLabelChip(tag)}
                    className="text-[11px] bg-white hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 active:bg-orange-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full transition-colors"
                  >
                    +{tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Primary Action Buttons */}
      <div className="space-y-2.5 pt-1">
        {/* Preview Button */}
        <button
          type="button"
          onClick={onPreview}
          disabled={!canPublish}
          className="w-full flex items-center justify-center space-x-2 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-xs shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Eye className="w-4 h-4 text-slate-600" />
          <span>Preview Blogger Post HTML</span>
        </button>

        {/* Big Publish to Blogger Button */}
        <button
          type="button"
          onClick={onPublish}
          disabled={!canPublish || isPublishing}
          className="w-full relative overflow-hidden flex items-center justify-center space-x-2 bg-linear-to-r from-orange-600 via-amber-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 active:scale-[0.99] text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-orange-600/25 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none text-base cursor-pointer"
        >
          {isPublishing ? (
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Publishing to Blogger...</span>
            </div>
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>PUBLISH TO BLOGGER</span>
            </>
          )}
        </button>

        {selectedBlogName && (
          <p className="text-center text-[11px] text-slate-400">
            Publishing to: <span className="font-semibold text-slate-600">{selectedBlogName}</span>
          </p>
        )}
      </div>
    </div>
  );
}
