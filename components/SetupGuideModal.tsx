'use client';

import React from 'react';
import {
  X,
  HelpCircle,
  Smartphone,
  Globe,
  ShieldCheck,
  ExternalLink,
  Code,
  Sparkles,
  Layers,
} from 'lucide-react';

interface SetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SetupGuideModal({ isOpen, onClose }: SetupGuideModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center space-x-2">
            <HelpCircle className="w-5 h-5 text-orange-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-none">
                Blogger Auto Publisher Guide
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Setup, tips &amp; troubleshooting
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            aria-label="Close guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs text-slate-700 bg-slate-50">
          {/* Quick Workflow */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
              <span>🚀 2-Step Publishing Workflow</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1">
              <li>
                <strong className="text-slate-800">1. Select photo:</strong> Pick an image from your gallery or take a picture. The app automatically compresses it for ultra-fast loading.
              </li>
              <li>
                <strong className="text-slate-800">2. Enter caption:</strong> Type your story or update. Line breaks are cleanly preserved.
              </li>
              <li>
                <strong className="text-slate-800">Tap Publish:</strong> The app formats your Blogger HTML template and publishes live to your blog immediately.
              </li>
            </ol>
          </div>

          {/* Blogger Account Setup */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
              <Globe className="w-4 h-4 text-orange-600" />
              <span>Blogger Blog Setup</span>
            </h4>
            <p className="text-slate-600 leading-relaxed">
              If your account shows &quot;No blogs found&quot;, make sure you have created at least one blog on your Google account at{' '}
              <a
                href="https://www.blogger.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-600 font-semibold underline inline-flex items-center space-x-0.5"
              >
                <span>Blogger.com</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>.
            </p>
          </div>

          {/* Android Chrome Tip */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
              <Smartphone className="w-4 h-4 text-orange-600" />
              <span>Android Chrome 1-Tap App Setup</span>
            </h4>
            <p className="text-slate-600 leading-relaxed">
              In Android Chrome, tap the <strong>⋮ (Menu)</strong> button at the top right and select <strong className="text-slate-800">&quot;Add to Home screen&quot;</strong> or <strong className="text-slate-800">&quot;Install app&quot;</strong>. This adds a direct icon to your phone home screen for instant access like a native app.
            </p>
          </div>

          {/* Production Domain Notice */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Production Domain &amp; Auth</span>
            </h4>
            <p className="text-slate-600 leading-relaxed">
              Authorized production domain: <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono text-[11px]">blogger-post-automation.vercel.app</code>. Both popup and seamless redirect authentication are supported on Android Chrome.
            </p>
          </div>

          {/* Google OAuth Testing Mode Note */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>OAuth Testing Mode &amp; Error 403</span>
            </h4>
            <p className="text-slate-600 leading-relaxed">
              If Google shows <strong className="text-slate-800">&quot;has not completed the Google verification process (Error 403)&quot;</strong>, your app is in <strong>Testing</strong> mode in Google Cloud Console. Simply add your Gmail account to <strong>Test users</strong> under <em className="text-slate-800">APIs &amp; Services &gt; OAuth consent screen &gt; Test users</em>.
            </p>
          </div>

          {/* Template Placeholders */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
              <Code className="w-4 h-4 text-orange-600" />
              <span>Template Variables</span>
            </h4>
            <p className="text-slate-600 leading-relaxed mb-2">
              You can customize your Blogger post HTML structure in Settings using these variables:
            </p>
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="bg-slate-100 p-2 rounded-lg border border-slate-200">
                <code className="text-orange-700 font-bold">&#123;&#123;TITLE&#125;&#125;</code>
                <p className="text-slate-500 font-sans text-[10px] mt-0.5">Post headline</p>
              </div>
              <div className="bg-slate-100 p-2 rounded-lg border border-slate-200">
                <code className="text-orange-700 font-bold">&#123;&#123;IMAGE_URL&#125;&#125;</code>
                <p className="text-slate-500 font-sans text-[10px] mt-0.5">Post image source</p>
              </div>
              <div className="bg-slate-100 p-2 rounded-lg border border-slate-200">
                <code className="text-orange-700 font-bold">&#123;&#123;CAPTION&#125;&#125;</code>
                <p className="text-slate-500 font-sans text-[10px] mt-0.5">Formatted text</p>
              </div>
              <div className="bg-slate-100 p-2 rounded-lg border border-slate-200">
                <code className="text-orange-700 font-bold">&#123;&#123;PUBLISHED_DATE&#125;&#125;</code>
                <p className="text-slate-500 font-sans text-[10px] mt-0.5">Date string</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-white border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-5 rounded-xl text-xs"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
