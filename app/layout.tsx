import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Blogger Auto Publisher',
  description: 'Mobile-first Blogger publishing tool to create and post image and caption articles directly to your Blogger blogs with one tap.',
  openGraph: {
    title: 'Blogger Auto Publisher',
    description: 'Mobile-first Blogger publishing tool to create and post image and caption articles directly to your Blogger blogs with one tap.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blogger Auto Publisher',
    description: 'Mobile-first Blogger publishing tool to create and post image and caption articles directly to your Blogger blogs with one tap.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
