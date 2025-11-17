/**
 * Layout Content - Client component to handle authenticated layout
 */

'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Navigation } from './Navigation';

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const isAuthenticated = !!user;

  return (
    <div className="flex min-h-screen">
      <Navigation />
      <main className={`flex-1 ${isAuthenticated ? 'lg:ml-64 pt-16 lg:pt-0' : ''}`}>
        {children}
      </main>
    </div>
  );
}

