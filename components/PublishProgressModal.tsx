'use client';

import React from 'react';
import { Loader2, CheckCircle2, Sparkles, Send, Globe } from 'lucide-react';

interface PublishProgressModalProps {
  isOpen: boolean;
  step: number; // 1 to 4
  blogName?: string;
}

const STEPS = [
  { id: 1, title: 'Optimizing Image & Media', desc: 'Ensuring fast mobile loading' },
  { id: 2, title: 'Formatting Blogger Template', desc: 'Applying variables and HTML styling' },
  { id: 3, title: 'Connecting to Blogger API v3', desc: 'Authorizing with secure token' },
  { id: 4, title: 'Publishing Live Post', desc: 'Finalizing live article URL' },
];

export function PublishProgressModal({
  isOpen,
  step,
  blogName,
}: PublishProgressModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center border border-slate-100">
        {/* Animated Spinner Icon */}
        <div className="relative w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-orange-100 animate-ping opacity-30" />
          <div className="w-14 h-14 rounded-2xl bg-linear-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>
        </div>

        <h3 className="text-base font-bold text-slate-900 mb-1">
          Publishing to Blogger
        </h3>
        {blogName && (
          <p className="text-xs text-orange-600 font-medium mb-4 truncate">
            {blogName}
          </p>
        )}

        {/* Steps List */}
        <div className="space-y-3 text-left bg-slate-50 p-3.5 rounded-xl border border-slate-100 mb-2">
          {STEPS.map((s) => {
            const isDone = step > s.id;
            const isCurrent = step === s.id;
            return (
              <div key={s.id} className="flex items-start space-x-2.5">
                <div className="mt-0.5 shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : isCurrent ? (
                    <div className="w-4 h-4 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-slate-200 text-[9px] font-bold text-slate-400 flex items-center justify-center">
                      {s.id}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-xs font-semibold leading-none ${
                      isCurrent
                        ? 'text-orange-950 font-bold'
                        : isDone
                        ? 'text-slate-700'
                        : 'text-slate-400'
                    }`}
                  >
                    {s.title}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                    {s.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-slate-400 mt-2">
          Please keep this tab open while your post is being published.
        </p>
      </div>
    </div>
  );
}
