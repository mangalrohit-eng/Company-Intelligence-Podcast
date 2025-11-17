/**
 * Client-side providers wrapper
 */

'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { configureAmplify } from '@/lib/amplify-config';

// Configure Amplify immediately when this module loads (before any components render)
if (typeof window !== 'undefined') {
  configureAmplify();
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </AuthProvider>
  );
}

