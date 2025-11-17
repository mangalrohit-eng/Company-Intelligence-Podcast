/**
 * Toast Hook - For managing toast notifications
 */

'use client';

import { useState, useCallback } from 'react';
import type { ToastType, ToastProps } from '@/components/ui/toast';

interface ToastOptions {
  title: string;
  message?: string;
  duration?: number;
}

let toastIdCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const showToast = useCallback((type: ToastType, options: ToastOptions) => {
    const id = `toast-${++toastIdCounter}`;
    const newToast: ToastProps = {
      id,
      type,
      title: options.title,
      message: options.message,
      duration: options.duration,
      onClose: (toastId) => {
        setToasts((prev) => prev.filter((t) => t.id !== toastId));
      },
    };
    
    setToasts((prev) => [...prev, newToast]);
    return id;
  }, []);

  const success = useCallback((title: string, message?: string, duration?: number) => {
    return showToast('success', { title, message, duration });
  }, [showToast]);

  const error = useCallback((title: string, message?: string, duration?: number) => {
    return showToast('error', { title, message, duration });
  }, [showToast]);

  const warning = useCallback((title: string, message?: string, duration?: number) => {
    return showToast('warning', { title, message, duration });
  }, [showToast]);

  const info = useCallback((title: string, message?: string, duration?: number) => {
    return showToast('info', { title, message, duration });
  }, [showToast]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    success,
    error,
    warning,
    info,
    dismiss,
    dismissAll,
  };
}

