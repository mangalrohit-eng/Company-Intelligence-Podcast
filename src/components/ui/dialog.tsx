/**
 * Dialog Component - For confirmations and modals
 */

'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

interface DialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      {children}
    </div>
  );
}

export function DialogContent({ className, children, ...props }: DialogContentProps) {
  return (
    <div
      className={cn(
        'relative z-50 bg-secondary border border-border rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-md mx-2 sm:mx-4 max-h-[90vh] overflow-y-auto',
        className
      )}
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      {children}
    </div>
  );
}

export function DialogHeader({ className, ...props }: DialogHeaderProps) {
  return <div className={cn('mb-4', className)} {...props} />;
}

export function DialogTitle({ className, ...props }: DialogTitleProps) {
  return <h2 className={cn('text-xl font-semibold', className)} {...props} />;
}

export function DialogDescription({ className, ...props }: DialogDescriptionProps) {
  return <p className={cn('text-sm text-muted', className)} {...props} />;
}

export function DialogFooter({ className, ...props }: DialogFooterProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row gap-2 sm:gap-3 mt-6', className)} {...props} />
  );
}

export function DialogClose({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'absolute top-4 right-4 p-1 rounded-sm hover:bg-border transition-colors',
        className
      )}
      {...props}
    >
      <X className="w-4 h-4" />
    </button>
  );
}

/**
 * Confirmation Dialog Hook
 */
export function useConfirmDialog() {
  const [open, setOpen] = React.useState(false);
  const [config, setConfig] = React.useState<{
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    variant?: 'default' | 'danger';
  } | null>(null);

  const confirm = React.useCallback(
    (
      title: string,
      message: string,
      onConfirm: () => void,
      options?: {
        confirmText?: string;
        cancelText?: string;
        variant?: 'default' | 'danger';
      }
    ) => {
      setConfig({
        title,
        message,
        onConfirm,
        confirmText: options?.confirmText || 'Confirm',
        cancelText: options?.cancelText || 'Cancel',
        variant: options?.variant || 'default',
      });
      setOpen(true);
    },
    []
  );

  const handleConfirm = React.useCallback(() => {
    if (config?.onConfirm) {
      config.onConfirm();
    }
    setOpen(false);
    setConfig(null);
  }, [config]);

  const handleCancel = React.useCallback(() => {
    setOpen(false);
    setConfig(null);
  }, []);

  const ConfirmDialog = React.useMemo(
    () => (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogClose onClick={handleCancel} />
          <DialogHeader>
            <DialogTitle>{config?.title || 'Confirm'}</DialogTitle>
            <DialogDescription>{config?.message || ''}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} className="flex-1 sm:flex-initial">
              {config?.cancelText || 'Cancel'}
            </Button>
            <Button
              variant={config?.variant === 'danger' ? 'danger' : 'default'}
              onClick={handleConfirm}
              className="flex-1 sm:flex-initial"
            >
              {config?.confirmText || 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    ),
    [open, config, handleConfirm, handleCancel]
  );

  return { confirm, ConfirmDialog };
}

