import * as React from 'react';

import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid = false, rows = 4, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        'w-full rounded-md border bg-surface px-3.5 py-2.5 text-small text-text placeholder:text-muted',
        'transition-colors duration-fast ease-out',
        'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus',
        'disabled:cursor-not-allowed disabled:bg-neutral-soft/50 disabled:text-muted',
        'resize-y min-h-24',
        invalid ? 'border-danger' : 'border-border hover:border-muted/50',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';
