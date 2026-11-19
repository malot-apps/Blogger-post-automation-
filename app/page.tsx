'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  googleSignInWithRedirect,
  logout,
  getAccessToken,
  savePublishedPost,
  fetchPublishedPosts,
  syncUserProfile,
  loadUserProfile,
  saveAdsSettingsToFirestore,
  loadAdsSettingsFromFirestore,
  type StoredPublishedPost,
} from '@/src/lib/firebase';
import type { BloggerBlog } from '@/src/server/bloggerService';
import { DEFAULT_MASTER_TEMPLATE } from '@/src/templates/BloggerPostTemplate';
import { deduplicateAdScriptsAndContainers } from '@/src/lib/importedHtmlCleaner';
import {
  type AdsSettings,
  isLegacyDefaultTemplate,
  loadAdsSettings,
  saveAdsSettings,
} from '@/src/lib/adsSettings';
import { generateTitleFromCaption } from '@/src/lib/titleGenerator';
import { repairNonAsciiHtmlEntities } from '@/src/lib/sanitizer';
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
import { ImportPostsModal } from '@/components/ImportPostsModal';
import { AiToolsSuiteModal } from '@/components/AiToolsSuiteModal';
import { PostPerformanceDashboard } from '@/components/PostPerformanceDashboard';
import { AlertCircle, Shield, Lock, Eye, ExternalLink, HelpCircle, BarChart3, PenSquare } from 'lucide-react';

const STORAGE_KEY_TEMPLATE = 'blogger_auto_publisher_template';
const getBlogStorageKey = (uid: string) => `blogger_user_selected_blog_${uid}`;

export default function Home() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Blogger blogs state (strictly isolated per user)
  const [blogs, setBlogs] = useState<BloggerBlog[]>([]);
  const [selectedBlogId, setSelectedBlogId] = useState<string>('');
  const [isLoadingBlogs, setIsLoadingBlogs] = useState(false);
  const [blogsError, setBlogsError] = useState<string | null>(null);

  // Main Image state
  const [mainImageResult, setMainImageResult] = useState<ImageProcessingResult | null>(null);
  const [mainImageUrlOverride, setMainImageUrlOverride] = useState<string | null>(null);

  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [caption, setCaption] = useState('');
  const [title, setTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [labels, setLabels] = useState('');

  // Template & Settings state
  const [customTemplate, setCustomTemplate] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_TEMPLATE);
      if (saved) {
        if (isLegacyDefaultTemplate(saved)) {
          try {
            localStorage.setItem(STORAGE_KEY_TEMPLATE, DEFAULT_MASTER_TEMPLATE);
          } catch {
            // ignore
          }
          return DEFAULT_MASTER_TEMPLATE;
        }
        let migrated = repairNonAsciiHtmlEntities(
          deduplicateAdScriptsAndContainers(
            saved
              .replace(/id="videoThumbnail" src="\{\{THUMBNAIL_URL\}\}"/g, 'id="videoThumbnail" src="{{IMAGE_URL}}"')
              .replace(/CUSTOM_THUMBNAIL_URL = "\{\{THUMBNAIL_URL\}\}";/g, 'CUSTOM_THUMBNAIL_URL = "{{IMAGE_URL}}";')
          )
        );
        if (
          migrated.includes('<title>{{TITLE}}</title>') &&
          !migrated.includes('{{META_DESCRIPTION}}') &&
          migrated.includes('bn-player-heading')
        ) {
          migrated = migrated.replace(
            /<title>\{\{TITLE\}\}<\/title>/i,
            '<title>{{TITLE}}</title>\n  <meta name="description" content="{{META_DESCRIPTION}}" />'
          );
        }
        if (migrated !== saved) {
          try {
            localStorage.setItem(STORAGE_KEY_TEMPLATE, migrated);
          } catch {
            // ignore
          }
        }
        return migrated;
      }
      return DEFAULT_MASTER_TEMPLATE;
    }
    return DEFAULT_MASTER_TEMPLATE;
  });

  const [adsSettings, setAdsSettings] = useState<AdsSettings>(() => loadAdsSettings());

  // Modals state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAiSuiteOpen, setIsAiSuiteOpen] = useState(false);

  // Workspace view mode ('composer' | 'dashboard')
  const [activeView, setActiveView] = useState<'composer' | 'dashboard'>('composer');

  // Firestore post history state (strictly isolated per user)
  const [postHistory, setPostHistory] = useState<StoredPublishedPost[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Load history from Firestore
  const loadHistory = useCallback(async (userId: string) => {
    setIsLoadingHistory(true);
    setHistoryError(null);
    try {
      const items = await fetchPublishedPosts(userId, 100);
      setPostHistory(items);
    } catch (err) {
      console.warn('Could not load history from Firestore:', err);
      let message = 'Could not load publication history from Firestore.';
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message) as { error?: string };
          if (parsed?.error) message = parsed.error;
        } catch {
          if (err.message) message = err.message;
        }
      }
      setHistoryError(message);
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

  // Fetch blogs from API using the authenticated user's session
  const loadBlogs = useCallback(async (token: string, currentUserId?: string) => {
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
      if (data.warning && blogList.length === 0) {
        setBlogsError(data.warning);
      }

      if (blogList.length > 0) {
        let preferredId = '';
        if (currentUserId && typeof window !== 'undefined') {
          const userKey = getBlogStorageKey(currentUserId);
          const savedId = localStorage.getItem(userKey);
          if (savedId && blogList.some((b) => b.id === savedId)) {
            preferredId = savedId;
          }
        }

        if (!preferredId) {
          preferredId = blogList[0].id;
        }

        setSelectedBlogId(preferredId);
        if (currentUserId && typeof window !== 'undefined') {
          localStorage.setItem(getBlogStorageKey(currentUserId), preferredId);
        }
      } else {
        setSelectedBlogId('');
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
        loadBlogs(token, authedUser.uid);
        loadHistory(authedUser.uid);

        // Sync user profile to Firestore
        syncUserProfile({
          userId: authedUser.uid,
          email: authedUser.email || '',
          displayName: authedUser.displayName || undefined,
        }).catch(() => {});

        // Check saved default blog & Ads Settings from Firestore
        loadUserProfile(authedUser.uid)
          .then((prof) => {
            if (prof?.defaultBlogId) {
              setSelectedBlogId((curr) => curr || prof.defaultBlogId || '');
            }
          })
          .catch(() => {});

        const localAds = loadAdsSettings(authedUser.uid);
        setAdsSettings(localAds);
        loadAdsSettingsFromFirestore(authedUser.uid)
          .then((remoteAds) => {
            if (remoteAds) {
              const saved = saveAdsSettings(remoteAds, authedUser.uid);
              setAdsSettings(saved);
            }
          })
          .catch(() => {});
      },
      () => {
        setUser(null);
        setIsAuthChecking(false);
        setBlogs([]);
        setSelectedBlogId('');
        setPostHistory([]);
        setHistoryError(null);
        setActiveView('composer');
        setPublishedPost(null);
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
        await loadBlogs(result.accessToken, result.user.uid);
      }
    } catch (err: unknown) {
      const errCode = (err as { code?: string })?.code;
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      // If user voluntarily closed or cancelled popup, do not show error banner
      if (errCode === 'auth/popup-closed-by-user' || msg.includes('popup-closed-by-user')) {
        return;
      }
      console.warn('Sign in error:', err);
      setAuthError(msg);
    } finally {
      setIsSigningIn(false);
    }
  };

  // Handle direct Redirect Google Sign In (for mobile browsers / popup-restricted environments)
  const handleSignInWithRedirect = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      await googleSignInWithRedirect();
    } catch (err: unknown) {
      console.warn('Redirect sign in error:', err);
      const msg = err instanceof Error ? err.message : 'Redirect sign in failed';
      setAuthError(msg);
      setIsSigningIn(false);
    }
  };

  // Handle Sign out (Strict Session Cleanup)
  const handleLogout = async () => {
    await logout();
    setUser(null);
    setBlogs([]);
    setSelectedBlogId('');
    setPostHistory([]);
    setHistoryError(null);
    setActiveView('composer');
    setPublishedPost(null);
    setMainImageResult(null);
    setMainImageUrlOverride(null);
    setCaption('');
    setTitle('');
    setMetaDescription('');
    setLabels('');
  };

  // Blog select handler (stores per-user preference)
  const handleSelectBlog = (blogId: string) => {
    setSelectedBlogId(blogId);
    if (user && typeof window !== 'undefined') {
      try {
        localStorage.setItem(getBlogStorageKey(user.uid), blogId);
      } catch {
        // ignore
      }
      syncUserProfile({
        userId: user.uid,
        email: user.email || '',
        defaultBlogId: blogId,
      }).catch(() => {});
    }
  };

  // Save custom template handler
  const handleSaveTemplate = (newTemplate: string) => {
    const cleaned = repairNonAsciiHtmlEntities(deduplicateAdScriptsAndContainers(newTemplate));
    setCustomTemplate(cleaned);
    try {
      localStorage.setItem(STORAGE_KEY_TEMPLATE, cleaned);
    } catch {
      // ignore
    }
  };

  // Save Ads Settings handler (persistent in localStorage & Firestore)
  const handleSaveAdsSettings = (newSettings: AdsSettings) => {
    const saved = saveAdsSettings(newSettings, user?.uid);
    setAdsSettings(saved);
    if (user) {
      saveAdsSettingsToFirestore(user.uid, saved).catch((err) =>
        console.warn('Firestore ads settings save notice:', err)
      );
    }
  };

  // Refresh blogs
  const handleRefreshBlogs = async () => {
    const token = await getAccessToken();
    if (token && user) {
      await loadBlogs(token, user.uid);
    } else {
      setAuthError('Session expired. Please sign in again.');
    }
  };

  // Active image source (Main Post Image is always used as the Blogger post thumbnail)
  const activeMainImageSrc = mainImageUrlOverride || mainImageResult?.dataUrl || null;
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
          thumbnailUrl: activeMainImageSrc,
          caption: caption.trim(),
          title: title.trim() || undefined,
          metaDescription: metaDescription.trim() || undefined,
          labels: labels.trim() || undefined,
          customTemplate,
          adsSettings,
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
        thumbnailUrl: data.post.imageUrl || data.post.thumbnailUrl || activeMainImageSrc,
        published: data.post.published,
        labels: data.post.labels,
        imageUrl: data.post.imageUrl || activeMainImageSrc,
      };
      setPublishedPost(newPostData);

      // Save to Firestore history (strictly user-isolated)
      if (user) {
        const historyRecord: StoredPublishedPost = {
          id: data.post.id,
          userId: user.uid,
          blogId: data.post.blogId,
          title: data.post.title,
          caption: caption.trim() || undefined,
          url: data.post.url,
          thumbnailUrl: data.post.imageUrl || data.post.thumbnailUrl || activeMainImageSrc,
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
    setCaption('');
    setTitle('');
    setMetaDescription('');
    setLabels('');
    setPublishedPost(null);
  };

  const isDashboardWide = Boolean(user && !publishedPost && activeView === 'dashboard');

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800 antialiased selection:bg-orange-500 selection:text-white">
      {/* Sticky Top Header */}
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
        onOpenImport={() => setIsImportOpen(true)}
        onOpenAiTools={() => setIsAiSuiteOpen(true)}
        activeView={activeView}
        onChangeView={(view) => {
          setPublishedPost(null);
          setActiveView(view);
        }}
        wideLayout={isDashboardWide}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className={`flex-1 ${isDashboardWide ? 'max-w-5xl' : 'max-w-xl'} w-full mx-auto p-4 sm:p-5 transition-all duration-200`}>
        {isAuthChecking ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
            <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-medium text-slate-500">Initializing session...</p>
          </div>
        ) : !user ? (
          /* Public Unauthenticated State */
          <div className="space-y-6">
            <AuthCard
              onSignIn={handleSignIn}
              onSignInWithRedirect={handleSignInWithRedirect}
              isLoading={isSigningIn}
              error={authError}
            />

            {/* Public Overview & OAuth Transparency Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4 text-left">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">How Blogger Auto Publisher Works</h3>
                  <p className="text-xs text-slate-500">Public Multi-User &amp; Google Data Privacy</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 text-xs text-slate-600">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                  <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-orange-600" />
                    <span>What Google Data is Accessed</span>
                  </p>
                  <p className="leading-relaxed">
                    Only your email (for account identification) and Blogger API scope (<code className="font-mono text-[10px] text-orange-700 bg-white px-1 py-0.5 rounded border border-slate-200">https://www.googleapis.com/auth/blogger</code>) to retrieve your blogs and publish articles you approve.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                  <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-orange-600" />
                    <span>Strict Multi-User Isolation</span>
                  </p>
                  <p className="leading-relaxed">
                    User sessions, access tokens, blog selections, and post histories are strictly isolated per account. The backend validates blog ownership before publishing.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                  <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-orange-600" />
                    <span>Revoke Access Anytime</span>
                  </p>
                  <p className="leading-relaxed">
                    You can sign out at any time or revoke permissions directly from{' '}
                    <a
                      href="https://myaccount.google.com/permissions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-600 underline font-medium inline-flex items-center"
                    >
                      Google Security Settings
                      <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                    </a>.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Developer Contact: <a href="mailto:malotshome27@gmail.com" className="text-orange-600 underline font-medium">malotshome27@gmail.com</a></span>
                <Link href="/privacy" className="text-orange-600 underline font-medium">Read Privacy Policy</Link>
              </div>
            </div>
          </div>
        ) : publishedPost ? (
          /* Post Published Success Screen */
          <SuccessScreen
            post={publishedPost}
            blogName={selectedBlog?.name}
            onReset={handleResetForm}
          />
        ) : (
          /* Main Workspace: Compose Post | Performance Dashboard */
          <div className="space-y-4">
            {/* Workspace View Switcher */}
            <div className="bg-white border border-slate-200 rounded-xl p-1 inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveView('composer')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeView === 'composer'
                    ? 'bg-orange-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <PenSquare className="w-3.5 h-3.5" />
                <span>Compose Post</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('dashboard')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeView === 'dashboard'
                    ? 'bg-orange-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Performance Dashboard</span>
                <span
                  className={`tabular-nums text-[11px] ${
                    activeView === 'dashboard' ? 'text-orange-100' : 'text-slate-400'
                  }`}
                >
                  ({postHistory.length})
                </span>
              </button>
            </div>

            {activeView === 'dashboard' ? (
              <PostPerformanceDashboard
                posts={postHistory}
                blogs={blogs}
                selectedBlogId={selectedBlogId}
                isLoading={isLoadingHistory || isLoadingBlogs}
                error={historyError}
                onRefresh={() => {
                  if (user) loadHistory(user.uid);
                }}
                onCreatePost={() => setActiveView('composer')}
              />
            ) : (
              <>
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

                {/* Step 1: Image Uploader Area (Main Image -> used as Blogger Post Thumbnail) */}
                <ImageUploader
                  mainImageResult={mainImageResult}
                  mainImageUrlOverride={mainImageUrlOverride}
                  onMainImageSelected={(res, url) => {
                    setMainImageResult(res);
                    setMainImageUrlOverride(url || null);
                  }}
                  isProcessing={isProcessingImage}
                  setIsProcessing={setIsProcessingImage}
                  onApplyTitle={setTitle}
                  currentTitle={title}
                />

                {/* Step 2 & 3: Caption, Options & Publish Action */}
                <PostForm
                  caption={caption}
                  setCaption={setCaption}
                  title={title}
                  setTitle={setTitle}
                  metaDescription={metaDescription}
                  setMetaDescription={setMetaDescription}
                  labels={labels}
                  setLabels={setLabels}
                  onPreview={() => setIsPreviewOpen(true)}
                  onPublish={handlePublish}
                  isPublishing={isPublishing}
                  canPublish={canPublish}
                  selectedBlogName={selectedBlog?.name}
                />
              </>
            )}
          </div>
        )}
      </main>

      {/* Public Footer */}
      <footer className="mt-auto py-5 border-t border-slate-200 bg-white/70 text-center text-xs text-slate-500">
        <div className={`${isDashboardWide ? 'max-w-5xl' : 'max-w-xl'} mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 transition-all duration-200`}>
          <div>
            <span>© 2026 Blogger Auto Publisher</span> •{' '}
            <span className="font-mono text-[11px] text-slate-600">blogger-post-automation.vercel.app</span>
          </div>
          <div className="flex items-center space-x-3">
            <Link href="/privacy" className="hover:text-orange-600 underline">Privacy Policy</Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-orange-600 underline">Terms of Service</Link>
            <span>•</span>
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-orange-600 underline"
            >
              Google Permissions
            </a>
          </div>
        </div>
      </footer>

      {/* Post Preview Modal */}
      <PostPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={effectiveTitle}
        imageUrl={activeMainImageSrc || ''}
        thumbnailUrl={activeMainImageSrc || ''}
        caption={caption}
        metaDescription={metaDescription}
        labels={labels}
        templateString={customTemplate}
        adsSettings={adsSettings}
        onPublishNow={handlePublish}
        isPublishing={isPublishing}
        blogName={selectedBlog?.name}
      />

      {/* Template & Ads Settings Modal */}
      <TemplateSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentTemplate={customTemplate}
        onSaveTemplate={handleSaveTemplate}
        onReloadFromFile={reloadTemplateFromFile}
        currentAdsSettings={adsSettings}
        onSaveAdsSettings={handleSaveAdsSettings}
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

      {/* Blogger Site-to-Site Post Import Modal */}
      <ImportPostsModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        targetBlogId={selectedBlogId}
        targetBlogName={selectedBlog?.name}
        templateString={customTemplate}
        adsSettings={adsSettings}
        onPostPublished={() => {
          if (user) loadHistory(user.uid);
        }}
      />

      {/* Gemini AI Content Suite Modal */}
      <AiToolsSuiteModal
        isOpen={isAiSuiteOpen}
        onClose={() => setIsAiSuiteOpen(false)}
        initialTopic={caption || title}
        onApplyTitle={setTitle}
        onApplyCaption={setCaption}
        onApplyLabels={setLabels}
        onApplyMetaDescription={setMetaDescription}
      />
    </div>
  );
}
