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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <LayoutContent>{children}</LayoutContent>
        </Providers>
      </body>
    </html>
  );
}

