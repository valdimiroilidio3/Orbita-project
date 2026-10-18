import { Loader2 } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Rótulo acessível obrigatório — icon buttons nunca comunicam só por ícone. */
  label: string;
  loading?: boolean;
  variant?: 'ghost' | 'outline' | 'primary';
}

/** Botão quadrado para ações com ícone. Requer `label` para leitores de ecrã. */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      label,
      loading = false,
      variant = 'ghost',
      disabled,
      type = 'button',
      children,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-colors duration-fast ease-out',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
        'disabled:pointer-events-none disabled:opacity-50',
        variant === 'ghost' && 'text-muted hover:bg-neutral-soft/70 hover:text-text',
        variant === 'outline' &&
          'border border-border bg-surface text-muted shadow-xs hover:bg-background hover:text-text',
        variant === 'primary' && 'bg-primary text-white shadow-xs hover:bg-primary-hover',
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4.5 w-4.5 animate-spin motion-reduce:animate-none" aria-hidden />
      ) : (
        children
      )}
    </button>
  ),
);
IconButton.displayName = 'IconButton';
