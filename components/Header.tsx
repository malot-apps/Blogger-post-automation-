'use client';

import React from 'react';
import type { User } from 'firebase/auth';
import {
  Globe,
  Sliders,
  HelpCircle,
  LogOut,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import type { BloggerBlog } from '@/src/server/bloggerService';

interface HeaderProps {
  user: User | null;
  blogs: BloggerBlog[];
  selectedBlogId: string;
  onSelectBlog: (blogId: string) => void;
  onRefreshBlogs: () => void;
  isLoadingBlogs: boolean;
  onOpenSettings: () => void;
  onOpenGuide: () => void;
  onOpenHistory?: () => void;
  onLogout: () => void;
}

export function Header({
  user,
  blogs,
  selectedBlogId,
  onSelectBlog,
  onRefreshBlogs,
  isLoadingBlogs,
  onOpenSettings,
  onOpenGuide,
  onOpenHistory,
  onLogout,
}: HeaderProps) {
  const currentBlog = blogs.find((b) => b.id === selectedBlogId);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-xl mx-auto px-4 py-3">
        {/* Top Row: Brand & Tools */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-sm shadow-orange-500/20 font-bold text-lg">
              <span>B</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight flex items-center gap-1.5">
                Blogger Auto Publisher
              </h1>
              <p className="text-xs text-slate-500">Fast 1-Tap Mobile Publishing</p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {user && onOpenHistory && (
              <button
                onClick={onOpenHistory}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                title="Published Post History (Firestore)"
                aria-label="Post History"
              >
                <Clock className="w-4.5 h-4.5 text-orange-600" />
              </button>
            )}
            <button
              onClick={onOpenSettings}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Post Template Settings"
              aria-label="Template Settings"
            >
              <Sliders className="w-4.5 h-4.5" />
            </button>
            <button
              onClick={onOpenGuide}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Setup & Troubleshooting Guide"
              aria-label="Setup Guide"
            >
              <HelpCircle className="w-4.5 h-4.5" />
            </button>
            {user && (
              <button
                onClick={onLogout}
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="w-4.5 h-4.5" />
              </button>
            )}
          </div>
        </div>

        {/* User Account & Blog Picker Row */}
        {user && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2 min-w-0">
              {user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-6 h-6 rounded-full border border-slate-200 shrink-0"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center shrink-0">
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div className="truncate text-xs font-medium text-slate-700">
                {user.displayName || user.email}
              </div>
              <span className="inline-flex items-center text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium border border-emerald-200">
                <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Connected
              </span>
            </div>

            {/* Selected Blog Dropdown */}
            {blogs.length > 0 ? (
              <div className="flex items-center space-x-1.5 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-56">
                  <select
                    value={selectedBlogId}
                    onChange={(e) => onSelectBlog(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-2.5 py-1.5 pr-7 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 truncate font-medium appearance-none"
                  >
                    {blogs.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.url.replace(/^https?:\/\//, '').replace(/\/$/, '')})
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <Globe className="w-3.5 h-3.5" />
                  </div>
                </div>
                <button
                  onClick={onRefreshBlogs}
                  disabled={isLoadingBlogs}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                  title="Refresh blog list"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isLoadingBlogs ? 'animate-spin text-orange-600' : ''}`}
                  />
                </button>
              </div>
            ) : (
              <div className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200 flex items-center justify-between w-full">
                <span>No blogs detected on this account.</span>
                <button
                  onClick={onRefreshBlogs}
                  className="underline font-semibold ml-2 hover:text-amber-900"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
