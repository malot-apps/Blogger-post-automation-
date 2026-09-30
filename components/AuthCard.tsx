'use client';

import React from 'react';
import { ShieldCheck, Zap, Image as ImageIcon, FileText, CheckCircle2 } from 'lucide-react';

interface AuthCardProps {
  onSignIn: () => void;
  isLoading: boolean;
  error: string | null;
}

export function AuthCard({ onSignIn, isLoading, error }: AuthCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 text-center max-w-md mx-auto">
      {/* Icon Badge */}
      <div className="w-16 h-16 bg-linear-to-tr from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center text-white mx-auto shadow-md shadow-orange-500/20 mb-4">
        <Zap className="w-8 h-8" />
      </div>

      <h2 className="text-xl font-bold text-slate-900 mb-2">
        Connect Your Blogger Account
      </h2>
      <p className="text-sm text-slate-600 mb-6 leading-relaxed">
        Publish high-quality image posts with captions straight to your Blogger blog in one click from your phone.
      </p>

      {/* Feature Bullet Points */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-left mb-6 space-y-2.5 text-xs text-slate-700">
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
          <span>Customizable post HTML templates &amp; labels</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 text-left">
          <p className="font-semibold mb-0.5">Connection Error</p>
          <p>{error}</p>
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
              <svg className="w-5 h-5" viewBox="0 0 48 48">
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

      <div className="mt-4 flex items-center justify-center space-x-1 text-[11px] text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Permissions are strictly limited to Blogger publishing</span>
      </div>
    </div>
  );
}
