import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, Lock, Eye, RefreshCw, Mail, ExternalLink } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy - Blogger Auto Publisher',
  description: 'Privacy Policy for Blogger Auto Publisher explaining how user data and Google permissions are handled.',
};

export default function PrivacyPolicyPage() {
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
              <Shield className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Privacy Policy</h1>
          </div>
          <p className="text-sm text-slate-500">
            Last updated: September 30, 2026 • Production Domain: <span className="font-mono text-slate-700">blogger-post-automation.vercel.app</span>
          </p>
        </div>

        {/* Introduction */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <span>1. Overview</span>
          </h2>
          <p className="text-slate-600 leading-relaxed text-sm">
            <strong>Blogger Auto Publisher</strong> (&quot;we&quot;, &quot;our&quot;, or &quot;the application&quot;) is a productivity tool created to help content creators publish image and caption posts directly to their own Google Blogger blogs with a single tap. This Privacy Policy describes how we collect, use, and protect your information when you access and use our application at <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-xs">https://blogger-post-automation.vercel.app</code>.
          </p>
        </section>

        {/* Google User Data Accessed */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Lock className="w-4 h-4 text-orange-600" />
            <span>2. Google User Data Accessed</span>
          </h2>
          <p className="text-slate-600 leading-relaxed text-sm">
            When you sign in using Google Sign-In, we request access only to the minimal necessary scopes required to perform the core functions of the application:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
            <li>
              <strong>Google Account Profile &amp; Email:</strong> Used exclusively to authenticate your identity, display your avatar/email in your session header, and isolate your database records.
            </li>
            <li>
              <strong>Blogger API Scope (<code className="text-orange-700 font-mono text-xs">https://www.googleapis.com/auth/blogger</code>):</strong>
              Used exclusively to:
              <ol className="list-decimal pl-5 mt-1 space-y-1">
                <li>Query the list of Blogger blogs that <em>you</em> own or administer via Blogger API v3 (<code className="text-xs">/users/self/blogs</code>).</li>
                <li>Create and publish draft or published posts to the specific blog you choose, using the title, image, and caption you provide.</li>
              </ol>
            </li>
          </ul>
          <p className="text-xs text-slate-500 bg-orange-50/70 border border-orange-200/80 p-3 rounded-xl">
            <strong>Minimal Scopes Guarantee:</strong> We do NOT request access to your Google Drive, Gmail, Google Contacts, Google Calendar, YouTube, or any unrelated Google services.
          </p>
        </section>

        {/* How Data is Used & Multi-User Isolation */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Eye className="w-4 h-4 text-orange-600" />
            <span>3. How We Use &amp; Isolate User Data</span>
          </h2>
          <p className="text-slate-600 leading-relaxed text-sm">
            We adhere to strict multi-user data isolation:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
            <li>
              <strong>Zero Cross-User Access:</strong> Each authenticated user operates in a segregated session. Access tokens and publishing requests are executed strictly on behalf of the user who signed in. No user can access or publish to another user&apos;s Blogger blog.
            </li>
            <li>
              <strong>No Secondary Use or Sale:</strong> Your Google user data is NEVER sold, rented, leased, or transferred to third parties or data brokers.
            </li>
            <li>
              <strong>No Advertising Use:</strong> Your Google user data is NEVER used for serving advertisements or training generalized AI models.
            </li>
            <li>
              <strong>Session Lifecycles:</strong> Access tokens are held in short-lived encrypted server cookies or memory during active sessions and are discarded immediately when you sign out or close your session.
            </li>
          </ul>
        </section>

        {/* Google API Services User Data Policy / Limited Use */}
        <section className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <h2 className="text-base font-bold text-slate-900">
            4. Google API Limited Use Disclosure
          </h2>
          <p className="text-slate-600 leading-relaxed text-xs">
            Blogger Auto Publisher&apos;s use and transfer to any other app of information received from Google APIs adheres to the{' '}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-600 underline font-semibold inline-flex items-center"
            >
              Google API Services User Data Policy
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </a>, including the Limited Use requirements.
          </p>
        </section>

        {/* Revoking Access & Data Deletion */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <RefreshCw className="w-4 h-4 text-orange-600" />
            <span>5. How to Revoke Access &amp; Request Data Deletion</span>
          </h2>
          <p className="text-slate-600 leading-relaxed text-sm">
            You retain complete control over your Google Account and Blogger permissions at all times:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
            <li>
              <strong>In-App Sign Out:</strong> Click the Sign Out icon in the top navigation bar at any time to clear your active session.
            </li>
            <li>
              <strong>Google Account Permissions:</strong> You can disconnect and revoke Blogger Auto Publisher&apos;s access immediately from your Google Account settings by visiting:{' '}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-600 font-semibold underline inline-flex items-center"
              >
                Google Security - Third-party apps with account access
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>.
            </li>
            <li>
              <strong>Data Deletion Request:</strong> You may request the deletion of any stored post history records or profile preferences by emailing us at{' '}
              <a href="mailto:tonmoymir9@gmail.com" className="text-orange-600 underline font-medium">
                tonmoymir9@gmail.com
              </a>.
            </li>
          </ul>
        </section>

        {/* Contact Information */}
        <section className="space-y-3 border-t border-slate-200 pt-6">
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Mail className="w-4 h-4 text-orange-600" />
            <span>6. Contact Us</span>
          </h2>
          <p className="text-slate-600 leading-relaxed text-sm">
            If you have questions, feedback, or privacy-related requests regarding Blogger Auto Publisher, please reach out to:
          </p>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm space-y-1">
            <p><strong>Application:</strong> Blogger Auto Publisher</p>
            <p><strong>Production Domain:</strong> https://blogger-post-automation.vercel.app</p>
            <p><strong>Developer Contact:</strong> <a href="mailto:tonmoymir9@gmail.com" className="text-orange-600 underline">tonmoymir9@gmail.com</a></p>
          </div>
        </section>

      </div>
    </div>
  );
}
