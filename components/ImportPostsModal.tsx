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
} from 'lucide-react';
import type { ImportedPostItem } from '@/src/server/bloggerService';
import { getAccessToken } from '@/src/lib/firebase';

interface ImportPostsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetBlogId: string;
  targetBlogName?: string;
  onPostPublished?: () => void;
}

export function ImportPostsModal({
  isOpen,
  onClose,
  targetBlogId,
  targetBlogName,
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

      const imageUrl = post.images[0] || post.thumbnailUrl || 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1200';
      const postTitle = customTitle || post.title;
      const postHtml = customContent || post.content;

      const res = await fetch('/api/blogger/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          blogId: targetBlogId,
          title: postTitle,
          imageUrl,
          thumbnailUrl: post.thumbnailUrl || imageUrl,
          caption: postHtml,
          labels: post.labels.join(', '),
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

    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Signed-in session required.');

      for (let i = 0; i < toPublish.length; i++) {
        const post = toPublish[i];
        setBulkProgress({ current: i + 1, total: toPublish.length });

        const imageUrl = post.images[0] || post.thumbnailUrl || 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1200';

        try {
          const res = await fetch('/api/blogger/publish', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              blogId: targetBlogId,
              title: post.title,
              imageUrl,
              thumbnailUrl: post.thumbnailUrl || imageUrl,
              caption: post.content,
              labels: post.labels.join(', '),
            }),
          });
          const data = await res.json();
          if (data.success && data.post?.url) {
            setPublishedSuccessMap((prev) => ({
              ...prev,
              [post.id]: data.post.url,
            }));
          }
        } catch (e) {
          console.warn(`Could not bulk publish post ${post.id}:`, e);
        }
        // Small rate limit delay between posts
        await new Promise((r) => setTimeout(r, 600));
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
                      {post.thumbnailUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={post.thumbnailUrl}
                          alt={post.title}
                          className="w-16 h-12 object-cover rounded-lg bg-slate-100 shrink-0 border border-slate-200"
                        />
                      ) : (
                        <div className="w-16 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400 text-[10px]">
                          No Img
                        </div>
                      )}

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

              {/* Rendered HTML content */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 max-h-96 overflow-y-auto prose prose-sm max-w-none text-slate-800">
                <div
                  dangerouslySetInnerHTML={{
                    __html: aiEnhancedContent || previewingPost.content,
                  }}
                />
              </div>
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
