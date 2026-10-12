'use client';

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  FileText,
  Hash,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Search,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface AiToolsSuiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTitle?: (title: string) => void;
  onApplyCaption?: (caption: string) => void;
  onApplyLabels?: (labels: string) => void;
  initialTopic?: string;
}

export function AiToolsSuiteModal({
  isOpen,
  onClose,
  onApplyTitle,
  onApplyCaption,
  onApplyLabels,
  initialTopic = '',
}: AiToolsSuiteModalProps) {
  const [activeTab, setActiveTab] = useState<'captions' | 'rewrite' | 'labels' | 'seo'>('captions');
  const [language, setLanguage] = useState<'bn' | 'en'>('bn');

  // Captions state
  const [captionTopic, setCaptionTopic] = useState(initialTopic);
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  const [captionsResult, setCaptionsResult] = useState<{
    shortCaption: string;
    engagingStoryCaption: string;
    callToActionCaption: string;
    hashtags: string[];
    suggestedLabels: string[];
  } | null>(null);

  // Article Rewrite state
  const [rewriteTitle, setRewriteTitle] = useState('');
  const [rewriteContent, setRewriteContent] = useState('');
  const [rewriteTone, setRewriteTone] = useState<'informative' | 'storytelling' | 'journalistic'>('informative');
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteResult, setRewriteResult] = useState<{
    enhancedTitle: string;
    metaDescription: string;
    enhancedContentHtml: string;
    enhancedContentText: string;
    labels: string[];
    readingTimeMinutes: number;
    changesSummary: string;
  } | null>(null);

  // SEO Audit state
  const [auditTitle, setAuditTitle] = useState('');
  const [auditContent, setAuditContent] = useState('');
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<{
    seoScore: number;
    readabilityScore: number;
    wordCount: number;
    strengths: string[];
    improvements: string[];
    suggestedKeywords: string[];
    isMobileOptimized: boolean;
  } | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const getCustomApiKey = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('blogger_user_gemini_api_key') || undefined;
    }
    return undefined;
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Generate Captions
  const handleGenerateCaptions = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!captionTopic.trim()) {
      setError('Please enter a topic or description.');
      return;
    }

    setIsGeneratingCaptions(true);
    setError(null);
    try {
      const apiKey = getCustomApiKey();
      const res = await fetch('/api/ai/tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-gemini-key': apiKey } : {}),
        },
        body: JSON.stringify({
          action: 'caption',
          topicOrContext: captionTopic.trim(),
          language,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate captions.');
      }

      setCaptionsResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error generating captions.');
    } finally {
      setIsGeneratingCaptions(false);
    }
  };

  // Rewrite Article
  const handleRewrite = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!rewriteContent.trim()) {
      setError('Please provide article content to rewrite.');
      return;
    }

    setIsRewriting(true);
    setError(null);
    try {
      const apiKey = getCustomApiKey();
      const res = await fetch('/api/ai/tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-gemini-key': apiKey } : {}),
        },
        body: JSON.stringify({
          action: 'rewrite',
          originalTitle: rewriteTitle.trim(),
          originalContent: rewriteContent.trim(),
          language,
          tone: rewriteTone,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to rewrite article.');
      }

      setRewriteResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error rewriting article.');
    } finally {
      setIsRewriting(false);
    }
  };

  // Run SEO Audit
  const handleAudit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!auditContent.trim()) {
      setError('Please provide content to analyze.');
      return;
    }

    setIsAuditing(true);
    setError(null);
    try {
      const apiKey = getCustomApiKey();
      const res = await fetch('/api/ai/tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-gemini-key': apiKey } : {}),
        },
        body: JSON.stringify({
          action: 'seo-audit',
          title: auditTitle.trim(),
          content: auditContent.trim(),
          language,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to audit SEO.');
      }

      setAuditResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error auditing SEO.');
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                Gemini AI Content Suite
              </h3>
              <p className="text-[11px] text-slate-500">
                SEO Captions, Article Rewriter, Labels &amp; Quality Audit
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Language Toggle */}
            <div className="flex bg-slate-200/80 p-0.5 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setLanguage('bn')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  language === 'bn' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                বাংলা
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  language === 'en' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                English
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-4 shrink-0 text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('captions')}
            className={`py-3 px-3.5 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'captions'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Caption Generator</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rewrite')}
            className={`py-3 px-3.5 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'rewrite'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Article Rewriter &amp; Proofread</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('seo')}
            className={`py-3 px-3.5 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'seo'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>SEO &amp; Quality Audit</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: CAPTION GENERATOR */}
          {activeTab === 'captions' && (
            <div className="space-y-4">
              <form onSubmit={handleGenerateCaptions} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Topic, Scene or Keyword Description
                  </label>
                  <textarea
                    value={captionTopic}
                    onChange={(e) => setCaptionTopic(e.target.value)}
                    rows={3}
                    placeholder="Describe your article topic or paste an outline..."
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isGeneratingCaptions}
                  className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center space-x-1.5 shadow-sm shadow-orange-600/20"
                >
                  {isGeneratingCaptions ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating Captions...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate Multi-Style Captions ({language === 'bn' ? 'বাংলা' : 'English'})</span>
                    </>
                  )}
                </button>
              </form>

              {captionsResult && (
                <div className="space-y-3 pt-2">
                  {/* Punchy Short Caption */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">1. Punchy Short Caption</span>
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(captionsResult.shortCaption, 'short')}
                          className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
                        >
                          {copiedKey === 'short' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey === 'short' ? 'Copied' : 'Copy'}</span>
                        </button>
                        {onApplyCaption && (
                          <button
                            type="button"
                            onClick={() => {
                              onApplyCaption(captionsResult.shortCaption);
                              onClose();
                            }}
                            className="text-[11px] font-bold text-orange-600 hover:underline flex items-center gap-0.5 ml-2"
                          >
                            <span>Apply</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      {captionsResult.shortCaption}
                    </p>
                  </div>

                  {/* Engaging Story Caption */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">2. Engaging Narrative Caption</span>
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(captionsResult.engagingStoryCaption, 'story')}
                          className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
                        >
                          {copiedKey === 'story' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey === 'story' ? 'Copied' : 'Copy'}</span>
                        </button>
                        {onApplyCaption && (
                          <button
                            type="button"
                            onClick={() => {
                              onApplyCaption(captionsResult.engagingStoryCaption);
                              onClose();
                            }}
                            className="text-[11px] font-bold text-orange-600 hover:underline flex items-center gap-0.5 ml-2"
                          >
                            <span>Apply</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      {captionsResult.engagingStoryCaption}
                    </p>
                  </div>

                  {/* Hashtags & Blogger Labels */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                        <Hash className="w-3.5 h-3.5 text-orange-600" />
                        <span>Suggested Blogger Labels &amp; Hashtags</span>
                      </span>
                      {onApplyLabels && (
                        <button
                          type="button"
                          onClick={() => {
                            onApplyLabels(captionsResult.suggestedLabels.join(', '));
                            onClose();
                          }}
                          className="text-[11px] font-bold text-orange-600 hover:underline flex items-center gap-0.5"
                        >
                          <span>Apply Labels</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {captionsResult.suggestedLabels.map((lbl, idx) => (
                        <span key={idx} className="text-[11px] font-medium bg-orange-50 text-orange-800 border border-orange-200 px-2 py-0.5 rounded-md">
                          {lbl}
                        </span>
                      ))}
                      {captionsResult.hashtags.map((tag, idx) => (
                        <span key={`h_${idx}`} className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ARTICLE REWRITER */}
          {activeTab === 'rewrite' && (
            <div className="space-y-4">
              <form onSubmit={handleRewrite} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Article Draft Title (Optional)
                    </label>
                    <input
                      type="text"
                      value={rewriteTitle}
                      onChange={(e) => setRewriteTitle(e.target.value)}
                      placeholder="Original draft title..."
                      className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Tone
                    </label>
                    <select
                      value={rewriteTone}
                      onChange={(e) => setRewriteTone(e.target.value as 'informative' | 'storytelling' | 'journalistic')}
                      className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="informative">Informative &amp; SEO</option>
                      <option value="storytelling">Storytelling &amp; Narrative</option>
                      <option value="journalistic">Journalistic &amp; Direct</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Raw Article Content or Paste Draft
                  </label>
                  <textarea
                    value={rewriteContent}
                    onChange={(e) => setRewriteContent(e.target.value)}
                    rows={6}
                    placeholder="Paste article body or notes here..."
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 leading-relaxed font-mono"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isRewriting}
                  className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center space-x-1.5 shadow-sm shadow-orange-600/20"
                >
                  {isRewriting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Rewriting &amp; Proofreading...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Rewrite &amp; Enhance for Blogger ({language === 'bn' ? 'বাংলা' : 'English'})</span>
                    </>
                  )}
                </button>
              </form>

              {rewriteResult && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-2">
                    <div>
                      <span className="text-[10px] text-orange-600 font-bold uppercase tracking-wider">Enhanced Title</span>
                      <h4 className="text-sm font-bold text-slate-900 mt-0.5">{rewriteResult.enhancedTitle}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{rewriteResult.metaDescription}</p>
                    </div>
                    {onApplyTitle && (
                      <button
                        type="button"
                        onClick={() => {
                          onApplyTitle(rewriteResult.enhancedTitle);
                          if (onApplyCaption) onApplyCaption(rewriteResult.enhancedContentHtml);
                          if (onApplyLabels && rewriteResult.labels) onApplyLabels(rewriteResult.labels.join(', '));
                          onClose();
                        }}
                        className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1 shrink-0 self-start sm:self-center"
                      >
                        <span>Apply to Post</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span>Reading time: ~{rewriteResult.readingTimeMinutes} min</span>
                    <span>•</span>
                    <span className="text-emerald-700 font-medium">{rewriteResult.changesSummary}</span>
                  </div>

                  {/* HTML Output Preview */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-60 overflow-y-auto text-xs text-slate-800 leading-relaxed">
                    <div dangerouslySetInnerHTML={{ __html: rewriteResult.enhancedContentHtml }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SEO AUDIT */}
          {activeTab === 'seo' && (
            <div className="space-y-4">
              <form onSubmit={handleAudit} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Post Title</label>
                  <input
                    type="text"
                    value={auditTitle}
                    onChange={(e) => setAuditTitle(e.target.value)}
                    placeholder="Enter article title to audit..."
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Content / Body</label>
                  <textarea
                    value={auditContent}
                    onChange={(e) => setAuditContent(e.target.value)}
                    rows={5}
                    placeholder="Enter article body content..."
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 leading-relaxed font-mono"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isAuditing}
                  className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center space-x-1.5 shadow-sm shadow-orange-600/20"
                >
                  {isAuditing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Auditing SEO &amp; Content Quality...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      <span>Run SEO &amp; Readability Audit</span>
                    </>
                  )}
                </button>
              </form>

              {auditResult && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
                  {/* Scores Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-orange-50/70 border border-orange-200 rounded-xl text-center">
                      <span className="text-[11px] text-orange-700 font-semibold">SEO Score</span>
                      <p className="text-2xl font-black text-orange-900">{auditResult.seoScore}/100</p>
                    </div>
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-center">
                      <span className="text-[11px] text-emerald-700 font-semibold">Readability</span>
                      <p className="text-2xl font-black text-emerald-900">{auditResult.readabilityScore}/100</p>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center col-span-2 sm:col-span-1">
                      <span className="text-[11px] text-slate-600 font-semibold">Word Count</span>
                      <p className="text-2xl font-black text-slate-800">{auditResult.wordCount}</p>
                    </div>
                  </div>

                  {/* Strengths & Improvements */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1.5">
                      <p className="font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Strengths</span>
                      </p>
                      <ul className="space-y-1 list-disc list-inside text-slate-600">
                        {auditResult.strengths.map((str, i) => (
                          <li key={i}>{str}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-1.5">
                      <p className="font-bold text-amber-700 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Actionable Improvements</span>
                      </p>
                      <ul className="space-y-1 list-disc list-inside text-slate-600">
                        {auditResult.improvements.map((imp, i) => (
                          <li key={i}>{imp}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Keywords */}
                  {auditResult.suggestedKeywords.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-[11px] font-semibold text-slate-500">Key Keywords Detected: </span>
                      <span className="text-xs text-slate-800 font-medium">
                        {auditResult.suggestedKeywords.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Powered by Gemini 3.8 Flash &amp; 3.1 Flash-Lite</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
