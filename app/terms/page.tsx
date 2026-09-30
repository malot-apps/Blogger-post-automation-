import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileCheck, CheckCircle2, AlertTriangle, Mail } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service - Blogger Auto Publisher',
  description: 'Terms of Service for Blogger Auto Publisher web application.',
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-10 space-y-8">
        
        {/* Navigation & Header */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-orange-600 hover:text-orange-700 mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5 transition-transform group-hover:-translate-x-1" />
            Back to Blogger Auto Publisher
          </Link>
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Terms of Service</h1>
          </div>
          <p className="text-sm text-slate-500">
            Last updated: September 30, 2026 • Production Domain: <span className="font-mono text-slate-700">blogger-post-automation.vercel.app</span>
          </p>
        </div>

        {/* 1. Acceptance of Terms */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">1. Acceptance of Terms</h2>
          <p className="text-slate-600 leading-relaxed text-sm">
            By connecting your Google account and using <strong>Blogger Auto Publisher</strong> at <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-xs">https://blogger-post-automation.vercel.app</code>, you agree to comply with and be bound by these Terms of Service. If you do not agree, please do not use the application.
          </p>
        </section>

        {/* 2. Description of Service */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">2. Description of Service</h2>
          <p className="text-slate-600 leading-relaxed text-sm">
            Blogger Auto Publisher provides an interface for Google Blogger users to format articles with images, thumbnails, titles, and captions, and automatically publish them directly to their own Blogger blogs using the official Google Blogger API v3.
          </p>
        </section>

        {/* 3. User Responsibilities & Content */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>3. User Responsibilities and Content</span>
          </h2>
          <p className="text-slate-600 leading-relaxed text-sm">
            You are solely responsible for the content (images, titles, captions, and links) you create and publish to your Blogger blogs through this service. You agree not to publish content that:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600">
            <li>Violates Blogger&apos;s Content Policy or Google&apos;s Terms of Service.</li>
            <li>Infringes upon any third-party intellectual property or privacy rights.</li>
            <li>Contains malicious code, viruses, or misleading spam content.</li>
          </ul>
        </section>

        {/* 4. Google Account & API Access */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">4. Google Account &amp; API Usage</h2>
          <p className="text-slate-600 leading-relaxed text-sm">
            Our application connects to your Blogger account solely upon your explicit OAuth authorization. You may revoke this authorization at any time through Google Account Settings. We do not claim ownership of any content you publish.
          </p>
        </section>

        {/* 5. Disclaimer of Warranties */}
        <section className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>5. Disclaimer of Warranties</span>
          </h2>
          <p className="text-slate-600 leading-relaxed text-xs">
            Blogger Auto Publisher is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, whether express or implied. We do not guarantee that the service will be uninterrupted, error-free, or compatible with all devices or networks. Google Blogger API rate limits, downtime, or service changes are outside our control.
          </p>
        </section>

        {/* 6. Limitation of Liability */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">6. Limitation of Liability</h2>
          <p className="text-slate-600 leading-relaxed text-sm">
            In no event shall the developers of Blogger Auto Publisher be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of or inability to use the service.
          </p>
        </section>

        {/* 7. Contact */}
        <section className="space-y-3 border-t border-slate-200 pt-6">
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Mail className="w-4 h-4 text-orange-600" />
            <span>7. Contact</span>
          </h2>
          <p className="text-slate-600 leading-relaxed text-sm">
            For questions regarding these Terms, please contact us at: <a href="mailto:tonmoymir9@gmail.com" className="text-orange-600 underline font-medium">tonmoymir9@gmail.com</a>.
          </p>
        </section>

      </div>
    </div>
  );
}
