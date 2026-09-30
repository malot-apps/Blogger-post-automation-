'use client';

import React from 'react';
import { X, ExternalLink, Calendar, Tag, FileText, RefreshCw, Clock } from 'lucide-react';
import type { StoredPublishedPost } from '@/src/lib/firebase';

interface PostHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  posts: StoredPublishedPost[];
  isLoading: boolean;
  onRefresh: () => void;
  blogName?: string;
}

export function PostHistoryModal({
  isOpen,
  onClose,
  posts,
  isLoading,
  onRefresh,
  blogName,
}: PostHistoryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Published Posts History</h3>
              <p className="text-xs text-slate-500">
                Synced in Firestore {blogName ? `• ${blogName}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
              title="Refresh History"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {isLoading && posts.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
              <p className="text-xs">Loading published history from Firestore...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <FileText className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-medium text-slate-600">No published posts yet</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Posts you publish to Blogger will be securely tracked and synchronized in your Firestore database.
              </p>
            </div>
          ) : (
            posts.map((post) => {
              const formattedDate = post.publishedAt
                ? new Date(post.publishedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Recently';

              return (
                <div
                  key={post.id}
                  className="p-3.5 bg-slate-50 hover:bg-orange-50/40 border border-slate-200/80 hover:border-orange-200 rounded-2xl transition-all text-left flex flex-col justify-between space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-900 text-sm line-clamp-2">
                        {post.title}
                      </h4>
                      {post.caption && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {post.caption}
                        </p>
                      )}
                    </div>
                    {post.url && (
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 p-2 text-orange-600 hover:text-orange-700 bg-white hover:bg-orange-100/70 border border-slate-200 rounded-xl transition-colors shadow-2xs flex items-center gap-1 text-xs font-medium"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">View</span>
                      </a>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {formattedDate}
                    </span>
                    {post.labels && (
                      <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100">
                        <Tag className="w-2.5 h-2.5" />
                        {post.labels}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium text-xs rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
