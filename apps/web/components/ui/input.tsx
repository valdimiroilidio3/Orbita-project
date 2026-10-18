import * as React from 'react';

import { cn } from '@/lib/utils';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg';
  /** Estado inválido: borda e aria-invalid (comunicado não só por cor). */
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', size = 'md', invalid = false, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      aria-invalid={invalid || undefined}
      className={cn(
        'w-full rounded-md border bg-surface px-3.5 text-small text-text placeholder:text-muted',
        'transition-colors duration-fast ease-out',
        'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus',
        'disabled:cursor-not-allowed disabled:bg-neutral-soft/50 disabled:text-muted',
        size === 'sm' && 'h-8',
        size === 'md' && 'h-10',
        size === 'lg' && 'h-12 text-body',
        invalid ? 'border-danger' : 'border-border hover:border-muted/50',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
