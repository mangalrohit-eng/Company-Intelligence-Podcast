/**
 * Client-side providers wrapper
 */

'use client';

import { useEffect, ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { configureAmplify } from '@/lib/amplify-config';

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Initialize Amplify on client side
    configureAmplify();
  }, []);

  return <AuthProvider>{children}</AuthProvider>;
}

