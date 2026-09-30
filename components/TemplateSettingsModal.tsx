'use client';

import React, { useState } from 'react';
import {
  X,
  Sliders,
  Check,
  RotateCcw,
  Code,
  AlertTriangle,
  FileCode,
} from 'lucide-react';
import { DEFAULT_MASTER_TEMPLATE } from '@/src/templates/BloggerPostTemplate';

interface TemplateSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTemplate: string;
  onSaveTemplate: (newTemplate: string) => void;
  onReloadFromFile: () => Promise<void>;
}

function TemplateSettingsDialog({
  onClose,
  currentTemplate,
  onSaveTemplate,
  onReloadFromFile,
}: Omit<TemplateSettingsModalProps, 'isOpen'>) {
  const [templateText, setTemplateText] = useState(currentTemplate);
  const [isReloading, setIsReloading] = useState(false);

  const handleResetToDefault = () => {
    setTemplateText(DEFAULT_MASTER_TEMPLATE);
  };

  const handleReloadMaster = async () => {
    setIsReloading(true);
    try {
      await onReloadFromFile();
      const res = await fetch('/api/blogger/template');
      const data = await res.json();
      if (data.template) {
        setTemplateText(data.template);
      }
    } catch {
      // ignore
    } finally {
      setIsReloading(false);
    }
  };

  const handleInsertTag = (tag: string) => {
    setTemplateText((prev) => `${prev} ${tag}`);
  };

  const handleSave = () => {
    onSaveTemplate(templateText);
    onClose();
  };

  const hasTitle = templateText.includes('{{TITLE}}');
  const hasImage = templateText.includes('{{IMAGE_URL}}');
  const hasThumbnail = templateText.includes('{{THUMBNAIL_URL}}');
  const hasCaption = templateText.includes('{{CAPTION}}');
  const hasDate = templateText.includes('{{PUBLISHED_DATE}}');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-orange-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-none">
                Blogger Post Master Template
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Saved in <code className="text-orange-700">/templates/blogger-post-template.html</code>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
          {/* Supported Template Variables Tags */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800">
                Dynamic Variables:
              </span>
              <span className="text-[10px] text-slate-400">Click to append</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleInsertTag('{{IMAGE_URL}}')}
                className={`text-[11px] font-mono px-2 py-1 rounded-md border flex items-center space-x-1 ${
                  hasImage
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-medium'
                    : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}
              >
                {hasImage && <Check className="w-3 h-3 text-emerald-600 mr-0.5" />}
                <span>&#123;&#123;IMAGE_URL&#125;&#125;</span>
              </button>

              <button
                type="button"
                onClick={() => handleInsertTag('{{THUMBNAIL_URL}}')}
                className={`text-[11px] font-mono px-2 py-1 rounded-md border flex items-center space-x-1 ${
                  hasThumbnail
                    ? 'bg-purple-50 border-purple-300 text-purple-800 font-medium'
                    : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}
              >
                {hasThumbnail && <Check className="w-3 h-3 text-purple-600 mr-0.5" />}
                <span>&#123;&#123;THUMBNAIL_URL&#125;&#125;</span>
              </button>

              <button
                type="button"
                onClick={() => handleInsertTag('{{CAPTION}}')}
                className={`text-[11px] font-mono px-2 py-1 rounded-md border flex items-center space-x-1 ${
                  hasCaption
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-medium'
                    : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}
              >
                {hasCaption && <Check className="w-3 h-3 text-emerald-600 mr-0.5" />}
                <span>&#123;&#123;CAPTION&#125;&#125;</span>
              </button>

              <button
                type="button"
                onClick={() => handleInsertTag('{{TITLE}}')}
                className={`text-[11px] font-mono px-2 py-1 rounded-md border flex items-center space-x-1 ${
                  hasTitle
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-medium'
                    : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}
              >
                {hasTitle && <Check className="w-3 h-3 text-emerald-600 mr-0.5" />}
                <span>&#123;&#123;TITLE&#125;&#125;</span>
              </button>

              <button
                type="button"
                onClick={() => handleInsertTag('{{PUBLISHED_DATE}}')}
                className={`text-[11px] font-mono px-2 py-1 rounded-md border flex items-center space-x-1 ${
                  hasDate
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-medium'
                    : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}
              >
                {hasDate && <Check className="w-3 h-3 text-emerald-600 mr-0.5" />}
                <span>&#123;&#123;PUBLISHED_DATE&#125;&#125;</span>
              </button>
            </div>
          </div>

          {/* HTML Template Code Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                <Code className="w-3.5 h-3.5 text-slate-400" />
                <span>Master HTML &amp; Script Content</span>
              </label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleReloadMaster}
                  disabled={isReloading}
                  className="text-[11px] text-slate-500 hover:text-orange-600 flex items-center space-x-1"
                >
                  <FileCode className="w-3 h-3" />
                  <span>{isReloading ? 'Loading...' : 'Reload File'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="text-[11px] text-slate-500 hover:text-orange-600 flex items-center space-x-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Default</span>
                </button>
              </div>
            </div>

            <textarea
              value={templateText}
              onChange={(e) => setTemplateText(e.target.value)}
              rows={11}
              className="w-full text-xs font-mono bg-slate-900 text-slate-100 border border-slate-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-orange-500 leading-relaxed resize-y"
              placeholder="Master Blogger HTML..."
            />
          </div>

          {(!hasImage || !hasCaption) && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Tip: Make sure your template contains <code className="font-bold">&#123;&#123;IMAGE_URL&#125;&#125;</code>, <code className="font-bold">&#123;&#123;THUMBNAIL_URL&#125;&#125;</code> and <code className="font-bold">&#123;&#123;CAPTION&#125;&#125;</code> placeholders.
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-5 rounded-xl text-xs shadow-sm shadow-orange-600/20"
          >
            Save Template
          </button>
        </div>
      </div>
    </div>
  );
}

export function TemplateSettingsModal({
  isOpen,
  onClose,
  currentTemplate,
  onSaveTemplate,
  onReloadFromFile,
}: TemplateSettingsModalProps) {
  if (!isOpen) return null;

  return (
    <TemplateSettingsDialog
      onClose={onClose}
      currentTemplate={currentTemplate}
      onSaveTemplate={onSaveTemplate}
      onReloadFromFile={onReloadFromFile}
    />
  );
}
