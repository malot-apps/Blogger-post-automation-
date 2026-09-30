import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  getDocs,
  collection,
  query,
  limit,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { handleFirestoreError, OperationType } from './firestoreErrors';

/**
 * Authoritative production domain and origin configurations.
 * Used for origin matching, redirect URI verification, and session binding.
 */
export const PRODUCTION_DOMAIN = 'https://blogger-post-automation.vercel.app';
export const PRODUCTION_HOSTNAME = 'blogger-post-automation.vercel.app';
export const OAUTH_CALLBACK_PATH = '/__/auth/handler';
export const OAUTH_CALLBACK_URI = `https://${firebaseConfig.authDomain}${OAUTH_CALLBACK_PATH}`;

/**
 * Check if the active window is running on the authorized production domain.
 */
export function isProductionDomain(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname === PRODUCTION_HOSTNAME;
}

/**
 * Validates whether a given origin or the current runtime origin is authorized.
 */
export function isAuthorizedOrigin(origin?: string): boolean {
  if (typeof window === 'undefined') return true;
  const targetHostname = origin ? new URL(origin).hostname : window.location.hostname;
  return (
    targetHostname === PRODUCTION_HOSTNAME ||
    targetHostname.endsWith('.vercel.app') ||
    targetHostname.endsWith('.run.app') ||
    targetHostname === 'localhost' ||
    targetHostname === '127.0.0.1'
  );
}

/**
 * Returns the effective app origin for OAuth return flows.
 * Defaults strictly to PRODUCTION_DOMAIN in production contexts.
 */
export function getAppOrigin(): string {
  if (typeof window === 'undefined') return PRODUCTION_DOMAIN;
  if (isProductionDomain()) return PRODUCTION_DOMAIN;
  return window.location.origin;
}

// Initialize Firebase App singleton with standard project authDomain
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

/**
 * Validate Firestore connection as required by system architecture
 */
export async function testConnection() {
  try {
    if (auth.currentUser) {
      await getDocFromServer(doc(db, 'test', 'connection'));
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase connection notice: client is offline or database connecting.');
    }
  }
}

// Configure Google Auth Provider with Blogger v3 scopes
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/blogger');
provider.setCustomParameters({
  prompt: 'select_account',
});

// Flag to track ongoing sign in flow
let isSigningIn = false;
// In-memory access token cache
let cachedAccessToken: string | null = null;

// Session storage keys scoped strictly to blogger auto publisher
const SESSION_TOKEN_KEY = 'blogger_auth_access_token';
const SESSION_ORIGIN_KEY = 'blogger_auth_origin';
const SESSION_REDIRECT_URL_KEY = 'blogger_auth_redirect_return_url';

// Try to retrieve token from memory or active tab sessionStorage
function resolveToken(): string | null {
  if (cachedAccessToken) return cachedAccessToken;
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem(SESSION_TOKEN_KEY);
      if (stored) {
        cachedAccessToken = stored;
        return stored;
      }
    } catch {
      // sessionStorage unavailable
    }
  }
  return null;
}

async function persistToken(token: string | null): Promise<void> {
  cachedAccessToken = token;
  if (typeof window !== 'undefined') {
    try {
      if (token) {
        sessionStorage.setItem(SESSION_TOKEN_KEY, token);
        // Sync secure server-side session cookie
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: token }),
        }).catch((err) => console.warn('Server session sync notice:', err));
      } else {
        sessionStorage.removeItem(SESSION_TOKEN_KEY);
      }
    } catch {
      // ignore
    }
  }
}

async function clearAuthSession(): Promise<void> {
  await persistToken(null);
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(SESSION_ORIGIN_KEY);
      sessionStorage.removeItem(SESSION_REDIRECT_URL_KEY);
      // Clear server-side session cookie
      await fetch('/api/auth/session', { method: 'DELETE' }).catch(() => {});
    } catch {
      // ignore
    }
  }
}

/**
 * Initialize auth state listener.
 * Handles both standard sessions and mobile redirect returns from Google OAuth,
 * ensuring origin matching and session token synchronization.
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  // Check for redirect result when returning on mobile devices
  if (typeof window !== 'undefined') {
    const currentOrigin = window.location.origin;
    const isProd = isProductionDomain();

    getRedirectResult(auth)
      .then(async (result) => {
        if (result) {
          const storedOrigin = sessionStorage.getItem(SESSION_ORIGIN_KEY);
          if (storedOrigin && storedOrigin !== currentOrigin && !isProd) {
            console.info(`Origin noted during OAuth redirect recovery: ${storedOrigin} -> ${currentOrigin}`);
          }
          // Clean up redirect tracking keys
          sessionStorage.removeItem(SESSION_ORIGIN_KEY);
          sessionStorage.removeItem(SESSION_REDIRECT_URL_KEY);

          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (credential?.accessToken) {
            await persistToken(credential.accessToken);
            if (result.user && onAuthSuccess) {
              onAuthSuccess(result.user, credential.accessToken);
            }
          }
        }
      })
      .catch((err: unknown) => {
        const errCode = (err as { code?: string })?.code;
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errCode === 'auth/unauthorized-domain') {
          console.error(
            `Firebase Auth Error: Domain "${window.location.hostname}" is not authorized in Firebase Console. Authorized production domain is: "${PRODUCTION_HOSTNAME}". Callback URI: "${OAUTH_CALLBACK_URI}"`
          );
        } else if (
          errCode === 'auth/access-denied' ||
          errMsg.includes('access_denied') ||
          errMsg.includes('verification process') ||
          errMsg.includes('Access blocked')
        ) {
          console.error(
            'Google OAuth Error 403 (access_denied): The app is in Testing mode. Ensure your account is added as a Test User under Google Cloud Console > APIs & Services > OAuth consent screen > Test users.'
          );
        } else {
          console.warn('Redirect auth check notice:', err);
        }
      });
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      testConnection().catch(() => {});
      const token = resolveToken();
      if (token) {
        if (onAuthSuccess) onAuthSuccess(user, token);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      clearAuthSession().catch(() => {});
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Trigger Google Sign-In.
 * Tries popup first. If popups are blocked (e.g. Android Chrome or PWA mode),
 * smoothly falls back to redirect flow so the user can complete authentication.
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    if (typeof window !== 'undefined') {
      const activeOrigin = isProductionDomain() ? PRODUCTION_DOMAIN : window.location.origin;
      sessionStorage.setItem(SESSION_ORIGIN_KEY, activeOrigin);
      sessionStorage.setItem(SESSION_REDIRECT_URL_KEY, window.location.href);
    }

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Could not obtain Blogger access token from Google sign in.');
    }

    await persistToken(credential.accessToken);
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error: unknown) {
    const errCode = (error as { code?: string })?.code;

    if (errCode === 'auth/unauthorized-domain') {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'current domain';
      throw new Error(
        `Domain "${currentHost}" is not authorized. Please verify that "${PRODUCTION_HOSTNAME}" is registered in Firebase Console > Authentication > Settings > Authorized domains.`
      );
    }

    const rawMsg = error instanceof Error ? error.message : String(error);
    if (
      errCode === 'auth/access-denied' ||
      rawMsg.includes('access_denied') ||
      rawMsg.includes('verification process') ||
      rawMsg.includes('Access blocked')
    ) {
      throw new Error(
        'Google OAuth Error 403 (access_denied): The app is in Testing mode. Your Google email must be added to "Test users" in Google Cloud Console (APIs & Services > OAuth consent screen > Test users). Once added, you can sign in by clicking Advanced > Continue.'
      );
    }

    // Gracefully handle user cancelling or closing the popup
    if (errCode === 'auth/popup-closed-by-user') {
      console.info('Sign-in popup was closed by user.');
      return null;
    }

    // Fall back to redirect if popup is blocked or unsupported on mobile browser
    if (
      errCode === 'auth/popup-blocked' ||
      errCode === 'auth/cancelled-popup-request' ||
      errCode === 'auth/operation-not-supported-in-this-environment'
    ) {
      console.info('Popup blocked or unsupported; initiating redirect flow for mobile browser.');
      await signInWithRedirect(auth, provider);
      return null;
    }
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Trigger direct Google Sign-In with redirect.
 * Ideal for mobile browsers, PWAs, or embedded environments where popups are blocked or closed.
 */
export const googleSignInWithRedirect = async (): Promise<void> => {
  try {
    isSigningIn = true;
    if (typeof window !== 'undefined') {
      const activeOrigin = isProductionDomain() ? PRODUCTION_DOMAIN : window.location.origin;
      sessionStorage.setItem(SESSION_ORIGIN_KEY, activeOrigin);
      sessionStorage.setItem(SESSION_REDIRECT_URL_KEY, window.location.href);
    }
    await signInWithRedirect(auth, provider);
  } catch (error: unknown) {
    console.error('Redirect sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Get current access token.
 */
export const getAccessToken = async (): Promise<string | null> => {
  return resolveToken();
};

/**
 * Sign out and clear stored session token and redirect metadata.
 */
export const logout = async () => {
  await signOut(auth);
  await clearAuthSession();
};

// ==========================================
// Firestore Persistence Methods
// ==========================================

export interface StoredPublishedPost {
  id: string;
  userId: string;
  blogId: string;
  title: string;
  caption?: string;
  url: string;
  thumbnailUrl?: string;
  labels?: string;
  publishedAt: string;
}

export interface StoredUserProfile {
  userId: string;
  email: string;
  displayName?: string;
  defaultBlogId?: string;
  updatedAt?: string;
}

/**
 * Save user profile/settings to Firestore.
 */
export async function syncUserProfile(profile: StoredUserProfile): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== profile.userId) return;
  const path = `users/${profile.userId}`;
  try {
    const ref = doc(db, 'users', profile.userId);
    const sanitized: Record<string, string> = {
      userId: profile.userId,
      email: profile.email,
    };
    if (profile.displayName) sanitized.displayName = profile.displayName.slice(0, 256);
    if (profile.defaultBlogId) sanitized.defaultBlogId = profile.defaultBlogId.slice(0, 128);
    sanitized.updatedAt = new Date().toISOString();

    await setDoc(ref, sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Load user settings from Firestore.
 */
export async function loadUserProfile(userId: string): Promise<StoredUserProfile | null> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) return null;
  const path = `users/${userId}`;
  try {
    const ref = doc(db, 'users', userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as StoredUserProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Save a newly published post record in Firestore.
 */
export async function savePublishedPost(post: StoredPublishedPost): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== post.userId) return;
  const path = `users/${post.userId}/posts/${post.id}`;
  try {
    const ref = doc(db, 'users', post.userId, 'posts', post.id);
    const payload: Record<string, string> = {
      id: post.id,
      userId: post.userId,
      blogId: post.blogId,
      title: post.title.slice(0, 300),
      url: post.url.slice(0, 1000),
      publishedAt: post.publishedAt || new Date().toISOString(),
    };
    if (post.caption) payload.caption = post.caption.slice(0, 5000);
    if (post.thumbnailUrl) payload.thumbnailUrl = post.thumbnailUrl.slice(0, 2048);
    if (post.labels) payload.labels = post.labels.slice(0, 500);

    await setDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Fetch recent published posts from Firestore.
 */
export async function fetchPublishedPosts(userId: string, count = 20): Promise<StoredPublishedPost[]> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) return [];
  const path = `users/${userId}/posts`;
  try {
    const postsRef = collection(db, 'users', userId, 'posts');
    const q = query(postsRef, limit(count));
    const snap = await getDocs(q);
    const results: StoredPublishedPost[] = [];
    snap.forEach((docSnap) => {
      results.push(docSnap.data() as StoredPublishedPost);
    });
    // Sort descending by publishedAt client-side to prevent composite index requirement
    results.sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
