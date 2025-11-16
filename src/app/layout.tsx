/**
 * Root Layout Component
 */

import { Inter } from 'next/font/google';
import './globals.css';
import { Navigation } from '@/components/Navigation';
import { Providers } from '@/components/Providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'AI Podcast Platform',
  description: 'Generate AI-powered company intelligence podcasts',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="flex min-h-screen">
            <Navigation />
            <main className="flex-1 lg:ml-64 pt-16 lg:pt-0">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}

