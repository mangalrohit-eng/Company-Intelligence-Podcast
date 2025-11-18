import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'outline';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors',
        {
          'bg-primary/20 text-primary': variant === 'default',
          'bg-green-500/20 text-green-500': variant === 'success',
          'bg-yellow-500/20 text-yellow-500': variant === 'warning',
          'bg-red-500/20 text-red-500': variant === 'danger',
          'border border-border text-foreground': variant === 'outline',
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };




