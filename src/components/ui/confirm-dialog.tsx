/**
 * Confirmation Dialog Component
 * Replaces browser confirm() with a native dialog
 */

'use client';

import { useState, useCallback } from 'react';
import { Button } from './button';
import { Card } from './card';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

let confirmDialogResolve: ((value: boolean) => void) | null = null;
let setDialogState: ((options: ConfirmDialogOptions | null) => void) | null = null;

export function ConfirmDialogProvider() {
  const [dialogOptions, setDialogOptions] = useState<ConfirmDialogOptions | null>(null);

  setDialogState = setDialogOptions;

  const handleConfirm = () => {
    if (confirmDialogResolve) {
      confirmDialogResolve(true);
      confirmDialogResolve = null;
    }
    setDialogOptions(null);
  };

  const handleCancel = () => {
    if (confirmDialogResolve) {
      confirmDialogResolve(false);
      confirmDialogResolve = null;
    }
    setDialogOptions(null);
  };

  if (!dialogOptions) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4 p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-yellow-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">{dialogOptions.title}</h3>
            <p className="text-sm text-muted">{dialogOptions.message}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={handleCancel}
          >
            {dialogOptions.cancelText || 'Cancel'}
          </Button>
          <Button
            variant={dialogOptions.variant || 'default'}
            onClick={handleConfirm}
          >
            {dialogOptions.confirmText || 'Confirm'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function confirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
  return new Promise((resolve) => {
    confirmDialogResolve = resolve;
    if (setDialogState) {
      setDialogState(options);
    }
  });
}

