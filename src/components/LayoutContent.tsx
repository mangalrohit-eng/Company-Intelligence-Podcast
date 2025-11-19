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
    <div className="flex min-h-screen overflow-x-hidden">
      <Navigation />
      <main className={`flex-1 overflow-x-hidden ${isAuthenticated ? 'lg:ml-64 pt-16 lg:pt-0' : ''}`}>
        <div className="w-full max-w-full overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}




