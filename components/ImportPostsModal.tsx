'use client';

import React, { useState } from 'react';
import {
  X,
  DownloadCloud,
  Globe,
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Eye,
  Calendar,
  Tag,
  Loader2,
  Search,
  Code,
  FileText,
} from 'lucide-react';
import type { ImportedPostItem } from '@/src/server/bloggerService';
import { getAccessToken } from '@/src/lib/firebase';
import { renderImportedPostTemplate } from '@/src/templates/BloggerPostTemplate';
import { selectMainThumbnailImage, isPngImageUrl } from '@/src/lib/mainImageSelector';
import { sanitizeImportedArticleFragment } from '@/src/lib/importedHtmlCleaner';

interface ImportPostsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetBlogId: string;
  targetBlogName?: string;
  templateString?: string;
  onPostPublished?: () => void;
}

export function ImportPostsModal({
  isOpen,
  onClose,
  targetBlogId,
  targetBlogName,
  templateString,
  onPostPublished,
}: ImportPostsModalProps) {
  const [sourceUrl, setSourceUrl] = useState('');
  const [maxResults, setMaxResults] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Imported results
  const [blogMeta, setBlogMeta] = useState<{ name: string; url: string; totalPosts?: number } | null>(null);
  const [posts, setPosts] = useState<ImportedPostItem[]>([]);
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Post detail preview / AI rewrite modal state
  const [previewingPost, setPreviewingPost] = useState<ImportedPostItem | null>(null);
  const [previewTab, setPreviewTab] = useState<'template' | 'article' | 'code'>('template');
  const [isEnhancingAi, setIsEnhancingAi] = useState(false);
  const [aiEnhancedContent, setAiEnhancedContent] = useState<string | null>(null);
  const [aiEnhancedTitle, setAiEnhancedTitle] = useState<string | null>(null);

  // Publishing state
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [isBulkPublishing, setIsBulkPublishing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [publishedSuccessMap, setPublishedSuccessMap] = useState<Record<string, string>>({}); // id -> url

  if (!isOpen) return null;

  const handleFetchPosts = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUrl = sourceUrl.trim();
    if (!cleanUrl) {
      setError('Please enter a Blogger blog URL (e.g. https://yourblog.blogspot.com).');
      return;
    }

    setIsLoading(true);
    setError(null);
    setPosts([]);
    setSelectedPostIds([]);
    setPublishedSuccessMap({});

    try {
      const token = await getAccessToken();
      const res = await fetch('/api/blogger/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          sourceUrl: cleanUrl,
          maxResults,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to import posts.');
      }

      setBlogMeta(data.blog);
      setPosts(data.posts || []);
      // Pre-select all
      setSelectedPostIds((data.posts || []).map((p: ImportedPostItem) => p.id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error importing posts from source blog.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedPostIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedPostIds.length === filteredPosts.length) {
      setSelectedPostIds([]);
    } else {
      setSelectedPostIds(filteredPosts.map((p) => p.id));
    }
  };

  // Publish a single post
  const handlePublishSingle = async (post: ImportedPostItem, customTitle?: string, customContent?: string) => {
    if (!targetBlogId) {
      setError('Please select a target Blogger blog from the header dropdown before publishing.');
      return;
    }

    setPublishingId(post.id);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Signed-in session required. Please sign in again.');

      const postTitle = customTitle || post.title;
      const postHtml = customContent || post.content;
      const formattedPublishedDate = post.published
        ? new Date(post.published).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
        : undefined;

      const safePrimaryImg =
        selectMainThumbnailImage(post.imageDetails || post.images) ||
        (!isPngImageUrl(post.thumbnailUrl) ? post.thumbnailUrl : undefined) ||
        undefined;

      const res = await fetch('/api/blogger/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          blogId: targetBlogId,
          title: postTitle,
          contentHtml: postHtml,
          imageUrl: safePrimaryImg,
          thumbnailUrl: safePrimaryImg,
          sourceUrl: post.url || blogMeta?.url,
          labels: post.labels.join(', '),
          customTemplate: templateString,
          publishedDate: formattedPublishedDate,
          isImported: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to publish post.');
      }

      setPublishedSuccessMap((prev) => ({
        ...prev,
        [post.id]: data.post.url,
      }));

      if (onPostPublished) onPostPublished();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to publish post.';
      setError(`Error publishing "${post.title}": ${msg}`);
    } finally {
      setPublishingId(null);
    }
  };

  // Bulk Publish Selected Posts
  const handleBulkPublish = async () => {
    if (!targetBlogId) {
      setError('Please select a target Blogger blog from the header before publishing.');
      return;
    }

    const toPublish = posts.filter((p) => selectedPostIds.includes(p.id));
    if (toPublish.length === 0) return;

    setIsBulkPublishing(true);
    setBulkProgress({ current: 0, total: toPublish.length });
    setError(null);

    const failedTitles: string[] = [];

    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Signed-in session required.');

      for (let i = 0; i < toPublish.length; i++) {
        const post = toPublish[i];
        setBulkProgress({ current: i + 1, total: toPublish.length });

        try {
          const formattedPublishedDate = post.published
            ? new Date(post.published).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
            : undefined;

          const safePrimaryImg =
            selectMainThumbnailImage(post.imageDetails || post.images) ||
            (!isPngImageUrl(post.thumbnailUrl) ? post.thumbnailUrl : undefined) ||
            undefined;

          const res = await fetch('/api/blogger/publish', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              blogId: targetBlogId,
              title: post.title,
              contentHtml: post.content,
              imageUrl: safePrimaryImg,
              thumbnailUrl: safePrimaryImg,
              sourceUrl: post.url || blogMeta?.url,
              labels: post.labels.join(', '),
              customTemplate: templateString,
              publishedDate: formattedPublishedDate,
              isImported: true,
            }),
          });
          const data = await res.json();
          if (res.ok && data.success && data.post?.url) {
            setPublishedSuccessMap((prev) => ({
              ...prev,
              [post.id]: data.post.url,
            }));
          } else {
            failedTitles.push(post.title);
          }
        } catch (e) {
          console.warn(`Could not bulk publish post ${post.id}:`, e);
          failedTitles.push(post.title);
        }
        // Small rate limit delay between posts
        await new Promise((r) => setTimeout(r, 600));
      }

      if (failedTitles.length > 0) {
        setError(
          `Published with ${failedTitles.length} failure(s): ${failedTitles.slice(0, 3).join(', ')}${failedTitles.length > 3 ? '...' : ''}`
        );
      }

      if (onPostPublished) onPostPublished();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Bulk publishing error.';
      setError(msg);
    } finally {
      setIsBulkPublishing(false);
      setBulkProgress(null);
    }
  };

  // AI Rewrite for currently previewed post
  const handleEnhanceWithAi = async () => {
    if (!previewingPost) return;
    setIsEnhancingAi(true);
    setError(null);
    try {
      const savedKey = typeof window !== 'undefined' ? localStorage.getItem('blogger_user_gemini_api_key') : null;
      const savedLang = typeof window !== 'undefined' ? localStorage.getItem('blogger_user_ai_language') || 'bn' : 'bn';

      const res = await fetch('/api/ai/tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(savedKey ? { 'x-gemini-key': savedKey } : {}),
        },
        body: JSON.stringify({
          action: 'rewrite',
          originalTitle: previewingPost.title,
          originalContent: previewingPost.content,
          sourceUrl: previewingPost.url || blogMeta?.url,
          language: savedLang,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'AI rewrite failed.');
      }

      setAiEnhancedTitle(data.enhancedTitle);
      setAiEnhancedContent(data.enhancedContentHtml);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI rewrite failed.';
      setError(msg);
    } finally {
      setIsEnhancingAi(false);
    }
  };

  const filteredPosts = posts.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.title.toLowerCase().includes(q) || p.labels.some((l) => l.toLowerCase().includes(q));
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
              <DownloadCloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                Import Blogger Posts (Site-to-Site)
              </h3>
              <p className="text-[11px] text-slate-500">
                Target Blog: <span className="font-semibold text-orange-700">{targetBlogName || 'Select in Header'}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* URL Input Form */}
        <div className="p-4 bg-slate-100/70 border-b border-slate-200 shrink-0">
          <form onSubmit={handleFetchPosts} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://source-blog.blogspot.com"
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>
            <select
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              className="text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value={10}>10 Posts</option>
              <option value={20}>20 Posts</option>
              <option value={35}>35 Posts</option>
              <option value={50}>50 Posts</option>
            </select>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center justify-center space-x-1.5 shrink-0 shadow-sm shadow-orange-600/20"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <DownloadCloud className="w-3.5 h-3.5" />
                  <span>Fetch Posts</span>
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="mt-2.5 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start space-x-1.5">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
          {blogMeta && (
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Source: {blogMeta.name}</span>
                  <a
                    href={blogMeta.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-400 hover:text-orange-600"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
                <p className="text-[11px] text-slate-500">
                  {posts.length} posts loaded from feed {blogMeta.totalPosts ? `(Total ${blogMeta.totalPosts} in blog)` : ''}
                </p>
              </div>

              {/* Filter and Select All */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search posts..."
                    className="pl-7 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg w-36 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs font-semibold px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700"
                >
                  {selectedPostIds.length === filteredPosts.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>
          )}

          {posts.length === 0 && !isLoading && !error && (
            <div className="text-center py-12 px-4 space-y-2 text-slate-400">
              <DownloadCloud className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
              <p className="text-xs font-semibold text-slate-600">No posts loaded yet</p>
              <p className="text-[11px] max-w-sm mx-auto text-slate-400">
                Enter any public or owned Google Blogger URL above and click Fetch Posts to inspect, rewrite with AI, and publish directly to your blog.
              </p>
            </div>
          )}

          {/* Posts List */}
          {filteredPosts.length > 0 && (
            <div className="space-y-2.5">
              {filteredPosts.map((post) => {
                const isSelected = selectedPostIds.includes(post.id);
                const isPublishingThis = publishingId === post.id;
                const publishedUrl = publishedSuccessMap[post.id];

                return (
                  <div
                    key={post.id}
                    className={`bg-white rounded-xl border p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                      isSelected ? 'border-orange-300 shadow-xs' : 'border-slate-200/90'
                    }`}
                  >
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(post.id)}
                        className="mt-1 w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500 cursor-pointer"
                      />

                      {/* Thumbnail */}
                      {(() => {
                        const displayThumb =
                          selectMainThumbnailImage(post.imageDetails || post.images) ||
                          (!isPngImageUrl(post.thumbnailUrl) ? post.thumbnailUrl : undefined);
                        return displayThumb ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={displayThumb}
                            alt={post.title}
                            referrerPolicy="no-referrer"
                            className="w-16 h-12 object-cover rounded-lg bg-slate-100 shrink-0 border border-slate-200"
                          />
                        ) : (
                          <div className="w-16 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400 text-[10px]">
                            No Img
                          </div>
                        );
                      })()}

                      <div className="min-w-0 flex-1 space-y-1">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {post.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {new Date(post.published).toLocaleDateString()}
                          </span>
                          {post.labels.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Tag className="w-3 h-3 text-slate-400" />
                              {post.labels.slice(0, 3).join(', ')}
                            </span>
                          )}
                          {post.images.length > 0 && (
                            <span className="text-orange-600 font-semibold">
                              {post.images.length} images
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions per post */}
                    <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                      {publishedUrl ? (
                        <a
                          href={publishedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-lg flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>View Live</span>
                        </a>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewingPost(post);
                              setAiEnhancedContent(null);
                              setAiEnhancedTitle(null);
                            }}
                            className="text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePublishSingle(post)}
                            disabled={isPublishingThis || isBulkPublishing}
                            className="text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 px-3 py-1 rounded-lg flex items-center gap-1 shadow-xs"
                          >
                            {isPublishingThis ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                            <span>Publish</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer / Bulk Actions */}
        <div className="px-5 py-3.5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600">
            {posts.length > 0 && (
              <span>
                <span className="font-bold text-orange-600">{selectedPostIds.length}</span> of {posts.length} posts selected
              </span>
            )}
            {bulkProgress && (
              <span className="ml-3 font-semibold text-orange-700">
                Publishing {bulkProgress.current} / {bulkProgress.total}...
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100"
            >
              Close
            </button>
            {posts.length > 0 && (
              <button
                type="button"
                onClick={handleBulkPublish}
                disabled={selectedPostIds.length === 0 || isBulkPublishing || !targetBlogId}
                className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold py-2 px-5 rounded-xl text-xs flex items-center space-x-1.5 shadow-sm shadow-orange-600/20"
              >
                {isBulkPublishing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Publish Selected ({selectedPostIds.length})</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Post Preview & AI Rewrite Sub-Modal */}
      {previewingPost && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden border border-slate-200">
            {/* Sub-Modal Header */}
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="min-w-0 pr-2">
                <h4 className="text-xs font-bold text-slate-900 truncate">
                  {aiEnhancedTitle || previewingPost.title}
                </h4>
                <p className="text-[10px] text-slate-500">
                  {aiEnhancedTitle ? 'AI Enhanced Version' : 'Original Source Post'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewingPost(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
              {/* AI Action banner */}
              <div className="p-3 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-orange-950 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                    <span>Gemini AI Post Enhancement</span>
                  </p>
                  <p className="text-[11px] text-orange-800">
                    Proofread, enhance formatting, generate SEO headings &amp; Bengali/English grammar
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleEnhanceWithAi}
                  disabled={isEnhancingAi}
                  className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-xs shrink-0"
                >
                  {isEnhancingAi ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Rewriting...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{aiEnhancedContent ? 'Re-Enhance' : 'AI Rewrite'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Preview Mode Tabs */}
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setPreviewTab('template')}
                    className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors ${
                      previewTab === 'template'
                        ? 'bg-white text-orange-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    <span>Master Template</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab('article')}
                    className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors ${
                      previewTab === 'article'
                        ? 'bg-white text-orange-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileText className="w-3 h-3" />
                    <span>Clean Article</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab('code')}
                    className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors ${
                      previewTab === 'code'
                        ? 'bg-white text-orange-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Code className="w-3 h-3" />
                    <span>HTML Output</span>
                  </button>
                </div>
                <span className="text-[10px] text-slate-500">
                  {previewingPost.images.length} genuine image(s) preserved
                </span>
              </div>

              {/* Rendered Preview Area */}
              {(() => {
                const activeTitle = aiEnhancedTitle || previewingPost.title;
                const activeSourceUrl = previewingPost.url || blogMeta?.url;
                const activeArticleHtml = sanitizeImportedArticleFragment(
                  aiEnhancedContent || previewingPost.content,
                  { baseUrl: activeSourceUrl }
                );
                const primaryImage =
                  selectMainThumbnailImage(previewingPost.imageDetails || previewingPost.images) ||
                  (!isPngImageUrl(previewingPost.thumbnailUrl) ? previewingPost.thumbnailUrl : '') ||
                  '';
                const selectedDetail =
                  previewingPost.imageDetails?.find((d) => d.src === primaryImage) ||
                  previewingPost.imageDetails?.[0];
                const templatedPreviewHtml = renderImportedPostTemplate(templateString, {
                  title: activeTitle,
                  articleHtml: activeArticleHtml,
                  imageUrl: primaryImage,
                  thumbnailUrl: primaryImage,
                  firstImageAlt: selectedDetail?.alt,
                  firstImageSrcset: selectedDetail?.srcset,
                  sourceUrl: activeSourceUrl,
                  publishedDate: previewingPost.published
                    ? new Date(previewingPost.published).toLocaleString('en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : undefined,
                });

                if (previewTab === 'template') {
                  return (
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                      <iframe
                        title="Master Template Post Preview"
                        srcDoc={templatedPreviewHtml}
                        className="w-full min-h-[400px] border-0"
                        sandbox="allow-same-origin"
                      />
                    </div>
                  );
                }

                if (previewTab === 'code') {
                  return (
                    <pre className="bg-slate-900 text-slate-100 p-3.5 rounded-xl text-[11px] font-mono overflow-x-auto whitespace-pre-wrap max-h-96 leading-relaxed border border-slate-800">
                      {templatedPreviewHtml}
                    </pre>
                  );
                }

                return (
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 max-h-96 overflow-y-auto text-sm text-slate-800 leading-relaxed">
                    <div
                      className="space-y-3 [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-slate-900 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:pt-1 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-slate-900 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_blockquote]:border-l-4 [&_blockquote]:border-orange-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_a]:text-orange-600 [&_a]:underline [&_figure]:my-3 [&_figcaption]:text-xs [&_figcaption]:text-slate-500 [&_figcaption]:mt-1 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-2 [&_pre]:bg-slate-900 [&_pre]:text-slate-100 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:text-xs"
                      dangerouslySetInnerHTML={{
                        __html: activeArticleHtml,
                      }}
                    />
                  </div>
                );
              })()}
            </div>

            {/* Sub-Modal Footer */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPreviewingPost(null)}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Back to List
              </button>
              <button
                type="button"
                onClick={() => {
                  handlePublishSingle(
                    previewingPost,
                    aiEnhancedTitle || undefined,
                    aiEnhancedContent || undefined
                  );
                  setPreviewingPost(null);
                }}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Publish This to Blogger</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
