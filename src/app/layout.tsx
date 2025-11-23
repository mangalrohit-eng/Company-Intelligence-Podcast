/**
 * Root Layout Component
 */

import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { LayoutContent } from '@/components/LayoutContent';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'AI Podcast Platform',
  description: 'Generate AI-powered company intelligence podcasts',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Prevent FOUC (Flash of Unstyled Content) */}
        <style dangerouslySetInnerHTML={{
          __html: `
            html { color-scheme: dark light; }
            body { background: var(--background); color: var(--foreground); }
          `
        }} />
      </head>
      <body className={inter.className}>
        <Providers>
          <LayoutContent>{children}</LayoutContent>
        </Providers>
      </body>
    </html>
  );
}

