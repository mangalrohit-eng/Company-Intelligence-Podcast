/**
 * Root Layout Component
 */

import { Inter } from 'next/font/google';
import './globals.css';
import { Navigation } from '@/components/Navigation';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'AI Podcast Platform',
  description: 'Generate AI-powered company intelligence podcasts',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex min-h-screen">
          <Navigation />
          <main className="flex-1 lg:ml-64 pt-16 lg:pt-0">{children}</main>
        </div>
      </body>
    </html>
  );
}

