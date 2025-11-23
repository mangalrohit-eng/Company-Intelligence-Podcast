import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'danger';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-full font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation',
          {
            'bg-primary text-background hover:bg-accent active:bg-accent/90': variant === 'default',
            'border-2 border-border hover:border-primary bg-transparent active:bg-border/20': variant === 'outline',
            'hover:bg-border bg-transparent active:bg-border/40': variant === 'ghost',
            'bg-red-500 text-white hover:bg-red-600 active:bg-red-700': variant === 'danger',
            // Mobile-first: minimum 44x44px touch targets, responsive padding
            'px-4 py-3 text-sm min-h-[44px] min-w-[44px] sm:px-6 sm:py-3 sm:text-base': size === 'default',
            'px-4 py-2.5 text-sm min-h-[44px] min-w-[44px] sm:px-4 sm:py-2 sm:text-sm': size === 'sm',
            'px-6 py-4 text-base min-h-[48px] sm:px-8 sm:py-4 sm:text-lg': size === 'lg',
            'p-3 min-w-[44px] min-h-[44px] sm:p-3 sm:w-12 sm:h-12': size === 'icon',
          },
          className
        )}
        ref={ref}
        aria-label={props['aria-label'] || (size === 'icon' ? 'Button' : undefined)}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };




