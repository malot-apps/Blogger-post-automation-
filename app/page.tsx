'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  savePublishedPost,
  fetchPublishedPosts,
  syncUserProfile,
  loadUserProfile,
  type StoredPublishedPost,
} from '@/src/lib/firebase';
import type { BloggerBlog } from '@/src/server/bloggerService';
import { DEFAULT_MASTER_TEMPLATE } from '@/src/templates/BloggerPostTemplate';
import { generateTitleFromCaption } from '@/src/lib/titleGenerator';
import type { ImageProcessingResult } from '@/src/lib/imageUtils';

import { Header } from '@/components/Header';
import { AuthCard } from '@/components/AuthCard';
import { ImageUploader } from '@/components/ImageUploader';
import { PostForm } from '@/components/PostForm';
import { PostPreviewModal } from '@/components/PostPreviewModal';
import { TemplateSettingsModal } from '@/components/TemplateSettingsModal';
import { PublishProgressModal } from '@/components/PublishProgressModal';
import { SuccessScreen, type PublishedPostData } from '@/components/SuccessScreen';
import { SetupGuideModal } from '@/components/SetupGuideModal';
import { PostHistoryModal } from '@/components/PostHistoryModal';
import { AlertCircle } from 'lucide-react';

const STORAGE_KEY_BLOG_ID = 'blogger_auto_publisher_blog_id';
const STORAGE_KEY_TEMPLATE = 'blogger_auto_publisher_template';

export default function Home() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Blogger blogs state
  const [blogs, setBlogs] = useState<BloggerBlog[]>([]);
  const [selectedBlogId, setSelectedBlogId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY_BLOG_ID) || '';
    }
    return '';
  });
  const [isLoadingBlogs, setIsLoadingBlogs] = useState(false);
  const [blogsError, setBlogsError] = useState<string | null>(null);

  // Main Image state
  const [mainImageResult, setMainImageResult] = useState<ImageProcessingResult | null>(null);
  const [mainImageUrlOverride, setMainImageUrlOverride] = useState<string | null>(null);

  // Thumbnail Image state
  const [thumbnailResult, setThumbnailResult] = useState<ImageProcessingResult | null>(null);
  const [thumbnailUrlOverride, setThumbnailUrlOverride] = useState<string | null>(null);

  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [caption, setCaption] = useState('');
  const [title, setTitle] = useState('');
  const [labels, setLabels] = useState('');

  // Template & Settings state
  const [customTemplate, setCustomTemplate] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY_TEMPLATE) || DEFAULT_MASTER_TEMPLATE;
    }
    return DEFAULT_MASTER_TEMPLATE;
  });

  // Modals state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Firestore post history state
  const [postHistory, setPostHistory] = useState<StoredPublishedPost[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Load history from Firestore
  const loadHistory = useCallback(async (userId: string) => {
    setIsLoadingHistory(true);
    try {
      const items = await fetchPublishedPosts(userId);
      setPostHistory(items);
    } catch (err) {
      console.warn('Could not load history from Firestore:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // Publishing state
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStep, setPublishStep] = useState(1);
  const [publishedPost, setPublishedPost] = useState<PublishedPostData | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Fetch initial master template from server if not cached
  const reloadTemplateFromFile = useCallback(async () => {
    try {
      const res = await fetch('/api/blogger/template');
      const data = await res.json();
      if (data.template) {
        setCustomTemplate(data.template);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_TEMPLATE, data.template);
        }
      }
    } catch (err) {
      console.error('Failed to load master template:', err);
    }
  }, []);

  // Fetch blogs from API
  const loadBlogs = useCallback(async (token: string) => {
    setIsLoadingBlogs(true);
    setBlogsError(null);
    try {
      const res = await fetch('/api/blogger/blogs', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load blogs from Blogger');
      }

      const blogList: BloggerBlog[] = data.blogs || [];
      setBlogs(blogList);

      if (blogList.length > 0) {
        const savedId = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_BLOG_ID) : null;
        const exists = blogList.some((b) => b.id === savedId);
        if (savedId && exists) {
          setSelectedBlogId(savedId);
        } else {
          setSelectedBlogId(blogList[0].id);
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY_BLOG_ID, blogList[0].id);
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching blogs';
      setBlogsError(msg);
    } finally {
      setIsLoadingBlogs(false);
    }
  }, []);

  // Initialize auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (authedUser, token) => {
        setUser(authedUser);
        setIsAuthChecking(false);
        loadBlogs(token);
        loadHistory(authedUser.uid);
        // Sync user profile to Firestore
        syncUserProfile({
          userId: authedUser.uid,
          email: authedUser.email || '',
          displayName: authedUser.displayName || undefined,
        }).catch(() => {});
        // Check saved default blog from Firestore
        loadUserProfile(authedUser.uid)
          .then((prof) => {
            if (prof?.defaultBlogId) {
              setSelectedBlogId((curr) => curr || prof.defaultBlogId || '');
            }
          })
          .catch(() => {});
      },
      () => {
        setUser(null);
        setIsAuthChecking(false);
        setPostHistory([]);
      }
    );
    return () => unsubscribe();
  }, [loadBlogs, loadHistory]);

  // Handle Google Sign In
  const handleSignIn = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        await loadBlogs(result.accessToken);
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      setAuthError(msg);
    } finally {
      setIsSigningIn(false);
    }
  };

  // Handle Sign out
  const handleLogout = async () => {
    await logout();
    setUser(null);
    setBlogs([]);
    setSelectedBlogId('');
  };

  // Blog select handler
  const handleSelectBlog = (blogId: string) => {
    setSelectedBlogId(blogId);
    try {
      localStorage.setItem(STORAGE_KEY_BLOG_ID, blogId);
    } catch {
      // ignore
    }
    if (user) {
      syncUserProfile({
        userId: user.uid,
        email: user.email || '',
        defaultBlogId: blogId,
      }).catch(() => {});
    }
  };

  // Save custom template handler
  const handleSaveTemplate = (newTemplate: string) => {
    setCustomTemplate(newTemplate);
    try {
      localStorage.setItem(STORAGE_KEY_TEMPLATE, newTemplate);
    } catch {
      // ignore
    }
  };

  // Refresh blogs
  const handleRefreshBlogs = async () => {
    const token = await getAccessToken();
    if (token) {
      await loadBlogs(token);
    } else {
      setAuthError('Session expired. Please sign in again.');
    }
  };

  // Active image sources
  const activeMainImageSrc = mainImageUrlOverride || mainImageResult?.dataUrl || null;
  const activeThumbnailSrc = thumbnailUrlOverride || thumbnailResult?.dataUrl || null;
  const canPublish = Boolean(activeMainImageSrc && caption.trim().length > 0 && selectedBlogId);

  // Active post title
  const effectiveTitle = title.trim().length > 0
    ? title.trim()
    : generateTitleFromCaption(caption);

  const selectedBlog = blogs.find((b) => b.id === selectedBlogId);

  // Handle Publish Post
  const handlePublish = async () => {
    if (!canPublish || !activeMainImageSrc) {
      setPublishError('Please ensure you have selected a main image, entered a caption, and chosen a blog.');
      return;
    }

    setPublishError(null);
    setIsPublishing(true);
    setPublishStep(1);

    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('You must be signed in to publish. Please sign in again.');
      }

      // Step 1: Processing
      await new Promise((r) => setTimeout(r, 350));
      setPublishStep(2);

      // Step 2: Formatting
      await new Promise((r) => setTimeout(r, 350));
      setPublishStep(3);

      // Step 3: API Request
      const response = await fetch('/api/blogger/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          blogId: selectedBlogId,
          imageUrl: activeMainImageSrc,
          thumbnailUrl: activeThumbnailSrc || activeMainImageSrc,
          caption: caption.trim(),
          title: title.trim() || undefined,
          labels: labels.trim() || undefined,
          customTemplate,
        }),
      });

      setPublishStep(4);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to publish post to Blogger.');
      }

      // Successful publish
      const newPostData = {
        id: data.post.id,
        blogId: data.post.blogId,
        title: data.post.title,
        url: data.post.url,
        thumbnailUrl: data.post.thumbnailUrl,
        published: data.post.published,
        labels: data.post.labels,
        imageUrl: activeMainImageSrc,
      };
      setPublishedPost(newPostData);

      // Save to Firestore history
      if (user) {
        const historyRecord: StoredPublishedPost = {
          id: data.post.id,
          userId: user.uid,
          blogId: data.post.blogId,
          title: data.post.title,
          caption: caption.trim() || undefined,
          url: data.post.url,
          thumbnailUrl: data.post.thumbnailUrl || activeMainImageSrc,
          labels: data.post.labels || labels.trim() || undefined,
          publishedAt: new Date().toISOString(),
        };
        savePublishedPost(historyRecord).catch((err) =>
          console.warn('Firestore history save notice:', err)
        );
        setPostHistory((prev) => [historyRecord, ...prev.filter((p) => p.id !== historyRecord.id)]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Publish failed. Please try again.';
      setPublishError(msg);
    } finally {
      setIsPublishing(false);
    }
  };

  // Reset form to publish another post
  const handleResetForm = () => {
    setMainImageResult(null);
    setMainImageUrlOverride(null);
    setThumbnailResult(null);
    setThumbnailUrlOverride(null);
    setCaption('');
    setTitle('');
    setLabels('');
    setPublishedPost(null);
    setPublishError(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800 antialiased selection:bg-orange-500 selection:text-white pb-12">
      {/* Top Header */}
      <Header
        user={user}
        blogs={blogs}
        selectedBlogId={selectedBlogId}
        onSelectBlog={handleSelectBlog}
        onRefreshBlogs={handleRefreshBlogs}
        isLoadingBlogs={isLoadingBlogs}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-4 sm:py-6">
        {/* Loading Auth State */}
        {isAuthChecking ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Checking Blogger connection...</p>
          </div>
        ) : !user ? (
          /* Sign-in prompt */
          <div className="py-4 sm:py-8">
            <AuthCard
              onSignIn={handleSignIn}
              isLoading={isSigningIn}
              error={authError}
            />
          </div>
        ) : publishedPost ? (
          /* Post Published Success Screen */
          <SuccessScreen
            post={publishedPost}
            blogName={selectedBlog?.name}
            onReset={handleResetForm}
          />
        ) : (
          /* Main Workflow Screen: IMAGE -> CAPTION -> PUBLISH */
          <div className="space-y-4">
            {/* Blog Warning if none found */}
            {blogs.length === 0 && !isLoadingBlogs && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-start justify-between">
                <div>
                  <p className="font-bold">No Blogger Blogs Found</p>
                  <p className="mt-0.5 text-amber-700">
                    Your Google account doesn&apos;t have any active Blogger blogs yet. Create one at blogger.com then tap refresh.
                  </p>
                </div>
                <button
                  onClick={handleRefreshBlogs}
                  className="bg-amber-200 hover:bg-amber-300 text-amber-900 font-semibold px-2.5 py-1.5 rounded-lg shrink-0 ml-2"
                >
                  Refresh
                </button>
              </div>
            )}

            {blogsError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{blogsError}</span>
              </div>
            )}

            {publishError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Publishing Error</p>
                  <p>{publishError}</p>
                </div>
              </div>
            )}

            {/* Step 1: Image Uploader Area (Main Image & Thumbnail Image) */}
            <ImageUploader
              mainImageResult={mainImageResult}
              mainImageUrlOverride={mainImageUrlOverride}
              onMainImageSelected={(res, url) => {
                setMainImageResult(res);
                setMainImageUrlOverride(url || null);
              }}
              thumbnailResult={thumbnailResult}
              thumbnailUrlOverride={thumbnailUrlOverride}
              onThumbnailSelected={(res, url) => {
                setThumbnailResult(res);
                setThumbnailUrlOverride(url || null);
              }}
              isProcessing={isProcessingImage}
              setIsProcessing={setIsProcessingImage}
            />

            {/* Step 2 & 3: Caption, Options & Publish Action */}
            <PostForm
              caption={caption}
              setCaption={setCaption}
              title={title}
              setTitle={setTitle}
              labels={labels}
              setLabels={setLabels}
              onPreview={() => setIsPreviewOpen(true)}
              onPublish={handlePublish}
              isPublishing={isPublishing}
              canPublish={canPublish}
              selectedBlogName={selectedBlog?.name}
            />
          </div>
        )}
      </main>

      {/* Post Preview Modal */}
      <PostPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={effectiveTitle}
        imageUrl={activeMainImageSrc || ''}
        thumbnailUrl={activeThumbnailSrc || activeMainImageSrc || ''}
        caption={caption}
        labels={labels}
        templateString={customTemplate}
        onPublishNow={handlePublish}
        isPublishing={isPublishing}
        blogName={selectedBlog?.name}
      />

      {/* Template Settings Modal */}
      <TemplateSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentTemplate={customTemplate}
        onSaveTemplate={handleSaveTemplate}
        onReloadFromFile={reloadTemplateFromFile}
      />

      {/* Setup & Help Guide Modal */}
      <SetupGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      {/* Animated Publishing Progress */}
      <PublishProgressModal
        isOpen={isPublishing}
        step={publishStep}
        blogName={selectedBlog?.name}
      />

      {/* Published Post History Modal (Firestore) */}
      <PostHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        posts={postHistory}
        isLoading={isLoadingHistory}
        onRefresh={() => {
          if (user) loadHistory(user.uid);
        }}
        blogName={selectedBlog?.name}
      />
    </div>
  );
}
