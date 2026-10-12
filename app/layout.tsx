import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Blogger Post Automation AI',
  description: 'Smart AI-powered Blogger publishing and automation tool to create, enhance with Gemini, and publish articles directly to Blogger blogs with one tap.',
  openGraph: {
    title: 'Blogger Post Automation AI',
    description: 'Smart AI-powered Blogger publishing and automation tool to create, enhance with Gemini, and publish articles directly to Blogger blogs with one tap.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blogger Post Automation AI',
    description: 'Smart AI-powered Blogger publishing and automation tool to create, enhance with Gemini, and publish articles directly to Blogger blogs with one tap.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
