'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, Zap, CheckCircle2, Lock, ExternalLink, Copy, Check, AlertCircle } from 'lucide-react';
import firebaseConfig from '../firebase-applet-config.json';

interface AuthCardProps {
  onSignIn: () => void;
  onSignInWithRedirect?: () => void;
  isLoading: boolean;
  error: string | null;
}

export function AuthCard({ onSignIn, onSignInWithRedirect, isLoading, error }: AuthCardProps) {
  const [copied, setCopied] = useState(false);
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isDomainError = error && (error.includes('Authorized Domains') || error.includes('Domain') || error.includes('unauthorized-domain'));

  const handleCopyDomain = async () => {
    if (!currentHostname) return;
    try {
      await navigator.clipboard.writeText(currentHostname);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-7 text-center max-w-lg mx-auto space-y-5">
      {/* Icon Badge */}
      <div className="w-16 h-16 bg-linear-to-tr from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center text-white mx-auto shadow-md shadow-orange-500/20">
        <Zap className="w-8 h-8" />
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-1.5">
          Connect Your Blogger Account
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Publish high-quality image posts with custom titles and captions straight to your Blogger blog in one click from your phone.
        </p>
      </div>

      {/* Feature Bullet Points */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-left space-y-2 text-xs text-slate-700">
        <div className="flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Mobile-optimized automatic photo compression</span>
        </div>
        <div className="flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Instant Blogger API v3 secure integration</span>
        </div>
        <div className="flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Multi-user isolation: publishes strictly to your own selected blogs</span>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 text-left space-y-2">
          <div className="flex items-center space-x-1.5 font-semibold text-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>Connection Notice</span>
          </div>
          <p className="leading-relaxed text-[11px]">{error}</p>

          {isDomainError && currentHostname && (
            <div className="mt-2.5 pt-2.5 border-t border-red-200/70 space-y-2">
              <p className="font-semibold text-slate-800 text-[11px]">
                Quick 1-step fix in Firebase Console:
              </p>
              <div className="flex items-center space-x-1.5 bg-white p-1.5 rounded-lg border border-red-200 text-slate-700">
                <code className="text-[11px] font-mono flex-1 truncate px-1">{currentHostname}</code>
                <button
                  type="button"
                  onClick={handleCopyDomain}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md flex items-center space-x-1 shrink-0 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-500" />
                      <span>Copy Domain</span>
                    </>
                  )}
                </button>
              </div>

              <div className="pt-1 flex items-center justify-between">
                <a
                  href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 text-[11px] font-semibold text-orange-700 hover:text-orange-800 underline"
                >
                  <span>Open Firebase Settings</span>
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </a>
                <span className="text-[10px] text-slate-500">
                  Project: <strong className="font-mono">{firebaseConfig.projectId}</strong>
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Google Sign-in Button with official styling */}
      <div className="flex justify-center">
        <button
          onClick={onSignIn}
          disabled={isLoading}
          className="w-full flex items-center justify-center space-x-3 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-300 font-medium py-3 px-4 rounded-xl shadow-xs transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isLoading ? (
            <div className="flex items-center space-x-2 text-sm text-slate-600">
              <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <span>Connecting to Google...</span>
            </div>
          ) : (
            <>
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
                <path fill="none" d="M0 0h48v48H0z" />
              </svg>
              <span className="text-sm font-semibold text-slate-800">
                Sign in with Google
              </span>
            </>
          )}
        </button>
      </div>

      {onSignInWithRedirect && (
        <div className="text-center pt-0">
          <button
            type="button"
            onClick={onSignInWithRedirect}
            disabled={isLoading}
            className="text-xs text-slate-500 hover:text-orange-600 underline font-medium cursor-pointer transition-colors disabled:opacity-50"
          >
            Having trouble with popups? Sign in with full-page redirect
          </button>
        </div>
      )}

      {/* Permissions Transparency Breakdown */}
      <div className="pt-2 border-t border-slate-100 text-left space-y-2">
        <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700">
          <Lock className="w-3.5 h-3.5 text-orange-600" />
          <span>OAuth Transparency &amp; Minimum Permissions</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Requests strictly <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px] text-orange-800 font-mono">https://www.googleapis.com/auth/blogger</code> to list your blogs and publish posts you author. Never accesses Drive, Gmail, Contacts, or personal files.
        </p>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          You can revoke access anytime via{' '}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-600 underline font-medium inline-flex items-center"
          >
            Google Account Permissions
            <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
          </a>.
        </p>
      </div>

      {/* Privacy & Terms Links */}
      <div className="flex items-center justify-center space-x-3 text-xs text-slate-500 pt-1">
        <Link href="/privacy" className="hover:text-orange-600 underline font-medium">
          Privacy Policy
        </Link>
        <span>•</span>
        <Link href="/terms" className="hover:text-orange-600 underline font-medium">
          Terms of Service
        </Link>
        <span>•</span>
        <span className="text-[11px] text-slate-400">v1.0 Public</span>
      </div>
    </div>
  );
}
