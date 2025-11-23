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
          'inline-flex items-center justify-center rounded-full font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed',
          {
            'bg-primary text-background hover:bg-accent': variant === 'default',
            'border-2 border-border hover:border-primary bg-transparent': variant === 'outline',
            'hover:bg-border bg-transparent': variant === 'ghost',
            'bg-red-500 text-white hover:bg-red-600': variant === 'danger',
            'px-4 py-2 text-sm sm:px-6 sm:py-3 sm:text-base': size === 'default',
            'px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm': size === 'sm',
            'px-6 py-3 text-base sm:px-8 sm:py-4 sm:text-lg': size === 'lg',
            'p-2 w-8 h-8 sm:p-3 sm:w-10 sm:h-10': size === 'icon',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };




