/**
 * Client-side providers wrapper
 */

'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { configureAmplify } from '@/lib/amplify-config';

// Configure Amplify immediately when this module loads (before any components render)
if (typeof window !== 'undefined') {
  configureAmplify();
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

