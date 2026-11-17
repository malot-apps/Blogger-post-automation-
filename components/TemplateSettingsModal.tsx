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
  Key,
  Sparkles,
  Eye,
  EyeOff,
  ShieldCheck,
  Globe,
  Megaphone,
  Trash2,
  ExternalLink,
  Image as ImageIcon,
  Link2,
} from 'lucide-react';
import { DEFAULT_MASTER_TEMPLATE } from '@/src/templates/BloggerPostTemplate';
import {
  type AdsSettings,
  DEFAULT_ADS_SETTINGS,
  EMPTY_ADS_SETTINGS,
  sanitizeAdsSettings,
  validateAdUrl,
} from '@/src/lib/adsSettings';

const STORAGE_KEY_GEMINI = 'blogger_user_gemini_api_key';
const STORAGE_KEY_AI_LANG = 'blogger_user_ai_language';

interface TemplateSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTemplate: string;
  onSaveTemplate: (newTemplate: string) => void;
  onReloadFromFile: () => Promise<void>;
  currentAdsSettings: AdsSettings;
  onSaveAdsSettings: (newSettings: AdsSettings) => void;
  onGeminiKeySaved?: (key: string) => void;
  initialTab?: 'template' | 'ads' | 'gemini';
}

function TemplateSettingsDialog({
  onClose,
  currentTemplate,
  onSaveTemplate,
  onReloadFromFile,
  currentAdsSettings,
  onSaveAdsSettings,
  onGeminiKeySaved,
  initialTab = 'template',
}: Omit<TemplateSettingsModalProps, 'isOpen'>) {
  const [activeTab, setActiveTab] = useState<'template' | 'ads' | 'gemini'>(initialTab);
  const [templateText, setTemplateText] = useState(currentTemplate);
  const [isReloading, setIsReloading] = useState(false);

  // Ads Settings State
  const [adsDraft, setAdsDraft] = useState<AdsSettings>(() => ({
    smartLink: { ...currentAdsSettings.smartLink },
    directLink: { ...currentAdsSettings.directLink },
    popupAd: { ...currentAdsSettings.popupAd },
    bannerAd: { ...currentAdsSettings.bannerAd },
    updatedAt: currentAdsSettings.updatedAt,
  }));
  const [adsError, setAdsError] = useState<string | null>(null);
  const [adsStatus, setAdsStatus] = useState<string | null>(null);

  // Gemini Settings State
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY_GEMINI) || '';
    }
    return '';
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [aiLanguage, setAiLanguage] = useState<'bn' | 'en'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(STORAGE_KEY_AI_LANG) as 'bn' | 'en') || 'bn';
    }
    return 'bn';
  });
  const [keySavedStatus, setKeySavedStatus] = useState<string | null>(null);

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

  const validateDraftAds = (draft: AdsSettings): string | null => {
    const smartRes = validateAdUrl(draft.smartLink.url);
    if (!smartRes.valid) return `Smart Link URL: ${smartRes.error}`;
    if (draft.smartLink.enabled && !smartRes.normalized) {
      return 'Smart Link URL is enabled but empty. Enter a valid https:// URL or disable it.';
    }

    const directRes = validateAdUrl(draft.directLink.url);
    if (!directRes.valid) return `Direct Link URL: ${directRes.error}`;
    if (draft.directLink.enabled && !directRes.normalized) {
      return 'Direct Link URL is enabled but empty. Enter a valid https:// URL or disable it.';
    }

    const popupRes = validateAdUrl(draft.popupAd.url);
    if (!popupRes.valid) return `Pop-up Ad URL: ${popupRes.error}`;
    if (draft.popupAd.enabled && !popupRes.normalized) {
      return 'Pop-up Ad URL is enabled but empty. Enter a valid https:// URL or disable it.';
    }

    const bannerImgRes = validateAdUrl(draft.bannerAd.imageUrl);
    if (!bannerImgRes.valid) return `Banner Image URL: ${bannerImgRes.error}`;
    if (draft.bannerAd.enabled && !bannerImgRes.normalized) {
      return 'Banner Ad is enabled but Banner Image URL is empty. Enter a valid image URL or disable it.';
    }

    const bannerClickRes = validateAdUrl(draft.bannerAd.clickUrl);
    if (!bannerClickRes.valid) return `Banner Click URL: ${bannerClickRes.error}`;

    return null;
  };

  const handleSave = () => {
    const validationError = validateDraftAds(adsDraft);
    if (validationError) {
      setAdsError(validationError);
      setActiveTab('ads');
      return;
    }

    setAdsError(null);
    onSaveTemplate(templateText);
    onSaveAdsSettings(sanitizeAdsSettings(adsDraft));

    if (typeof window !== 'undefined') {
      const trimmedKey = geminiApiKey.trim();
      if (trimmedKey) {
        localStorage.setItem(STORAGE_KEY_GEMINI, trimmedKey);
      } else {
        localStorage.removeItem(STORAGE_KEY_GEMINI);
      }
      localStorage.setItem(STORAGE_KEY_AI_LANG, aiLanguage);
      if (onGeminiKeySaved) {
        onGeminiKeySaved(trimmedKey);
      }
    }
    onClose();
  };

  const handleSaveAdsQuick = () => {
    const validationError = validateDraftAds(adsDraft);
    if (validationError) {
      setAdsError(validationError);
      setAdsStatus(null);
      return;
    }
    setAdsError(null);
    const saved = sanitizeAdsSettings(adsDraft);
    setAdsDraft(saved);
    onSaveAdsSettings(saved);
    setAdsStatus('Ads settings saved and applied!');
    setTimeout(() => setAdsStatus(null), 3000);
  };

  const handleResetAdsDefaults = () => {
    setAdsError(null);
    setAdsDraft({
      smartLink: { ...DEFAULT_ADS_SETTINGS.smartLink },
      directLink: { ...DEFAULT_ADS_SETTINGS.directLink },
      popupAd: { ...DEFAULT_ADS_SETTINGS.popupAd },
      bannerAd: { ...DEFAULT_ADS_SETTINGS.bannerAd },
    });
    setAdsStatus('Reset to default template ads (click Save to apply).');
    setTimeout(() => setAdsStatus(null), 3000);
  };

  const handleClearAllAds = () => {
    setAdsError(null);
    setAdsDraft({
      smartLink: { ...EMPTY_ADS_SETTINGS.smartLink },
      directLink: { ...EMPTY_ADS_SETTINGS.directLink },
      popupAd: { ...EMPTY_ADS_SETTINGS.popupAd },
      bannerAd: { ...EMPTY_ADS_SETTINGS.bannerAd },
    });
    setAdsStatus('All ads cleared & disabled (click Save to apply).');
    setTimeout(() => setAdsStatus(null), 3000);
  };

  const handleSaveGeminiKeyQuick = () => {
    const trimmedKey = geminiApiKey.trim();
    if (typeof window !== 'undefined') {
      if (trimmedKey) {
        localStorage.setItem(STORAGE_KEY_GEMINI, trimmedKey);
        setKeySavedStatus('Key saved successfully!');
      } else {
        localStorage.removeItem(STORAGE_KEY_GEMINI);
        setKeySavedStatus('Key removed. Using server default.');
      }
      localStorage.setItem(STORAGE_KEY_AI_LANG, aiLanguage);
      if (onGeminiKeySaved) {
        onGeminiKeySaved(trimmedKey);
      }
      setTimeout(() => setKeySavedStatus(null), 3000);
    }
  };

  const hasTitle = templateText.includes('{{TITLE}}');
  const hasImage = templateText.includes('{{IMAGE_URL}}');
  const hasCaption = templateText.includes('{{CAPTION}}');
  const hasDate = templateText.includes('{{PUBLISHED_DATE}}');

  const activeAdsCount = [
    adsDraft.smartLink.enabled && adsDraft.smartLink.url.trim(),
    adsDraft.directLink.enabled && adsDraft.directLink.url.trim(),
    adsDraft.popupAd.enabled && adsDraft.popupAd.url.trim(),
    adsDraft.bannerAd.enabled && adsDraft.bannerAd.imageUrl.trim(),
  ].filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
        {/* Header with Tabs */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-orange-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-none">
                Settings &amp; Configuration
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Master Template, Separate Ads &amp; Gemini AI
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

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-white px-4 shrink-0 text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('template')}
            className={`py-2.5 px-3 border-b-2 flex items-center space-x-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'template'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Master Template</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ads')}
            className={`py-2.5 px-3 border-b-2 flex items-center space-x-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'ads'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Ads Settings ({activeAdsCount}/4)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('gemini')}
            className={`py-2.5 px-3 border-b-2 flex items-center space-x-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'gemini'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gemini AI</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
          {activeTab === 'template' ? (
            <>
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
                    Tip: Make sure your template contains <code className="font-bold">&#123;&#123;IMAGE_URL&#125;&#125;</code> and <code className="font-bold">&#123;&#123;CAPTION&#125;&#125;</code> placeholders.
                  </span>
                </div>
              )}
            </>
          ) : activeTab === 'ads' ? (
            /* Separate Ads Management Tab */
            <div className="space-y-3.5">
              {/* Top Action Strip */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                    <Megaphone className="w-4 h-4 text-orange-600" />
                    <span>App-Controlled Ads Management</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Strictly isolated from imported article HTML. Disabled or empty ads are never injected.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleResetAdsDefaults}
                    className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center space-x-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Defaults</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllAds}
                    className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 flex items-center space-x-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear All</span>
                  </button>
                </div>
              </div>

              {adsError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{adsError}</span>
                </div>
              )}

              {adsStatus && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center space-x-2 font-medium">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{adsStatus}</span>
                </div>
              )}

              {/* 1. Smart Link URL */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                      <Link2 className="w-3.5 h-3.5 text-orange-600" />
                      <span>Smart Link URL (Play Now)</span>
                    </label>
                    <p className="text-[10px] text-slate-500">Opens once on user click of Play Now (#btn1)</p>
                  </div>
                  <label className="inline-flex items-center cursor-pointer space-x-1.5">
                    <input
                      type="checkbox"
                      checked={adsDraft.smartLink.enabled}
                      onChange={(e) => {
                        setAdsError(null);
                        setAdsDraft((prev) => ({
                          ...prev,
                          smartLink: { ...prev.smartLink, enabled: e.target.checked },
                        }));
                      }}
                      className="w-4 h-4 accent-orange-600 rounded cursor-pointer"
                    />
                    <span className="text-[11px] font-semibold text-slate-700">
                      {adsDraft.smartLink.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </label>
                </div>
                <div className="flex items-center space-x-1.5">
                  <input
                    type="url"
                    value={adsDraft.smartLink.url}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAdsError(null);
                      setAdsDraft((prev) => ({
                        ...prev,
                        smartLink: {
                          url: val,
                          enabled: val.trim() ? prev.smartLink.enabled : false,
                        },
                      }));
                    }}
                    placeholder="https://example.com/smartlink?key=..."
                    className="flex-1 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  {adsDraft.smartLink.url && (
                    <button
                      type="button"
                      onClick={() =>
                        setAdsDraft((prev) => ({
                          ...prev,
                          smartLink: { enabled: false, url: '' },
                        }))
                      }
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-slate-200"
                      title="Delete Smart Link"
                      aria-label="Delete Smart Link"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Direct Link URL */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                      <ExternalLink className="w-3.5 h-3.5 text-orange-600" />
                      <span>Direct Link URL (Watch Now)</span>
                    </label>
                    <p className="text-[10px] text-slate-500">Opens cleanly on user click of Watch Now (#btn2)</p>
                  </div>
                  <label className="inline-flex items-center cursor-pointer space-x-1.5">
                    <input
                      type="checkbox"
                      checked={adsDraft.directLink.enabled}
                      onChange={(e) => {
                        setAdsError(null);
                        setAdsDraft((prev) => ({
                          ...prev,
                          directLink: { ...prev.directLink, enabled: e.target.checked },
                        }));
                      }}
                      className="w-4 h-4 accent-orange-600 rounded cursor-pointer"
                    />
                    <span className="text-[11px] font-semibold text-slate-700">
                      {adsDraft.directLink.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </label>
                </div>
                <div className="flex items-center space-x-1.5">
                  <input
                    type="url"
                    value={adsDraft.directLink.url}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAdsError(null);
                      setAdsDraft((prev) => ({
                        ...prev,
                        directLink: {
                          url: val,
                          enabled: val.trim() ? prev.directLink.enabled : false,
                        },
                      }));
                    }}
                    placeholder="https://example.com/directlink?key=..."
                    className="flex-1 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  {adsDraft.directLink.url && (
                    <button
                      type="button"
                      onClick={() =>
                        setAdsDraft((prev) => ({
                          ...prev,
                          directLink: { enabled: false, url: '' },
                        }))
                      }
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-slate-200"
                      title="Delete Direct Link"
                      aria-label="Delete Direct Link"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* 3. Pop-up Ad URL */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                      <span>Pop-up Ad URL</span>
                    </label>
                    <p className="text-[10px] text-slate-500">
                      Supports ad network <code className="font-mono">.js</code> script URLs or click-triggered destination URLs
                    </p>
                  </div>
                  <label className="inline-flex items-center cursor-pointer space-x-1.5">
                    <input
                      type="checkbox"
                      checked={adsDraft.popupAd.enabled}
                      onChange={(e) => {
                        setAdsError(null);
                        setAdsDraft((prev) => ({
                          ...prev,
                          popupAd: { ...prev.popupAd, enabled: e.target.checked },
                        }));
                      }}
                      className="w-4 h-4 accent-orange-600 rounded cursor-pointer"
                    />
                    <span className="text-[11px] font-semibold text-slate-700">
                      {adsDraft.popupAd.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </label>
                </div>
                <div className="flex items-center space-x-1.5">
                  <input
                    type="url"
                    value={adsDraft.popupAd.url}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAdsError(null);
                      setAdsDraft((prev) => ({
                        ...prev,
                        popupAd: {
                          url: val,
                          enabled: val.trim() ? prev.popupAd.enabled : false,
                        },
                      }));
                    }}
                    placeholder="https://cdn.example.com/popunder.js or https://..."
                    className="flex-1 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  {adsDraft.popupAd.url && (
                    <button
                      type="button"
                      onClick={() =>
                        setAdsDraft((prev) => ({
                          ...prev,
                          popupAd: { enabled: false, url: '' },
                        }))
                      }
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-slate-200"
                      title="Delete Pop-up Ad"
                      aria-label="Delete Pop-up Ad"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* 4. Banner Image URL + Banner Click URL */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-orange-600" />
                      <span>Custom Banner Ad (Bottom Slot)</span>
                    </label>
                    <p className="text-[10px] text-slate-500">
                      Rendered cleanly in bottom banner slot so Main Image stays Blogger&apos;s primary thumbnail
                    </p>
                  </div>
                  <label className="inline-flex items-center cursor-pointer space-x-1.5">
                    <input
                      type="checkbox"
                      checked={adsDraft.bannerAd.enabled}
                      onChange={(e) => {
                        setAdsError(null);
                        setAdsDraft((prev) => ({
                          ...prev,
                          bannerAd: { ...prev.bannerAd, enabled: e.target.checked },
                        }));
                      }}
                      className="w-4 h-4 accent-orange-600 rounded cursor-pointer"
                    />
                    <span className="text-[11px] font-semibold text-slate-700">
                      {adsDraft.bannerAd.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </label>
                </div>

                <div className="space-y-2">
                  <div>
                    <span className="block text-[10px] font-semibold text-slate-600 mb-1">Banner Image URL</span>
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="url"
                        value={adsDraft.bannerAd.imageUrl}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAdsError(null);
                          setAdsDraft((prev) => ({
                            ...prev,
                            bannerAd: {
                              ...prev.bannerAd,
                              imageUrl: val,
                              enabled: val.trim() ? prev.bannerAd.enabled : false,
                            },
                          }));
                        }}
                        placeholder="https://cdn.example.com/banner-728x90.jpg"
                        className="flex-1 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      {adsDraft.bannerAd.imageUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setAdsDraft((prev) => ({
                              ...prev,
                              bannerAd: { enabled: false, imageUrl: '', clickUrl: '' },
                            }))
                          }
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-slate-200"
                          title="Delete Banner Ad"
                          aria-label="Delete Banner Ad"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="block text-[10px] font-semibold text-slate-600 mb-1">Banner Click URL (Optional)</span>
                    <input
                      type="url"
                      value={adsDraft.bannerAd.clickUrl}
                      onChange={(e) => {
                        setAdsError(null);
                        setAdsDraft((prev) => ({
                          ...prev,
                          bannerAd: { ...prev.bannerAd, clickUrl: e.target.value },
                        }));
                      }}
                      placeholder="https://sponsor-destination.com/offer"
                      className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleSaveAdsQuick}
                  className="text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl"
                >
                  Apply Ads Settings Now
                </button>
              </div>
            </div>
          ) : (
            /* Gemini AI Key & Language Tab */
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center space-x-2">
                  <Key className="w-4 h-4 text-orange-600" />
                  <span className="text-xs font-bold text-slate-800">
                    Personal Gemini API Key
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Enter your Google Gemini API key to power AI content tools and thumbnail creation. Your key is stored locally in your browser and used securely for your own requests.
                </p>

                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg pl-3 pr-10 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    aria-label="Toggle API key visibility"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-orange-600 hover:underline font-medium"
                  >
                    Get a Gemini API Key from Google AI Studio &rarr;
                  </a>
                  <button
                    type="button"
                    onClick={handleSaveGeminiKeyQuick}
                    className="text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-lg"
                  >
                    Save Key
                  </button>
                </div>

                {keySavedStatus && (
                  <p className="text-[11px] font-semibold text-emerald-600 flex items-center space-x-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>{keySavedStatus}</span>
                  </p>
                )}
              </div>

              {/* Language Selection */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-orange-600" />
                  <span className="text-xs font-bold text-slate-800">Default AI Output Language</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAiLanguage('bn')}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium text-left flex items-center justify-between ${
                      aiLanguage === 'bn'
                        ? 'border-orange-500 bg-orange-50/80 text-orange-900 font-bold'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <span>বাংলা (Bengali)</span>
                    {aiLanguage === 'bn' && <Check className="w-3.5 h-3.5 text-orange-600" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiLanguage('en')}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium text-left flex items-center justify-between ${
                      aiLanguage === 'en'
                        ? 'border-orange-500 bg-orange-50/80 text-orange-900 font-bold'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <span>English</span>
                    {aiLanguage === 'en' && <Check className="w-3.5 h-3.5 text-orange-600" />}
                  </button>
                </div>
              </div>

              {/* Privacy and Security Callout */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs text-emerald-900 space-y-1">
                <p className="font-bold flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Strict API Key Protection</span>
                </p>
                <p className="text-[11px] leading-relaxed text-emerald-800">
                  Your custom Gemini API key is stored only in your local browser storage and passed exclusively in HTTPS headers to server-side endpoints. It is never logged, stored in source code, or visible to other users.
                </p>
              </div>
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
            Save All Changes
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
  currentAdsSettings,
  onSaveAdsSettings,
  onGeminiKeySaved,
  initialTab,
}: TemplateSettingsModalProps) {
  if (!isOpen) return null;

  return (
    <TemplateSettingsDialog
      onClose={onClose}
      currentTemplate={currentTemplate}
      onSaveTemplate={onSaveTemplate}
      onReloadFromFile={onReloadFromFile}
      currentAdsSettings={currentAdsSettings}
      onSaveAdsSettings={onSaveAdsSettings}
      onGeminiKeySaved={onGeminiKeySaved}
      initialTab={initialTab}
    />
  );
}
