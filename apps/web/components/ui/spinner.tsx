import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface SpinnerProps {
  className?: string;
  /** Rótulo anunciado a leitores de ecrã (vazio para decorativo). */
  label?: string;
}

/** Indicador de progresso circular. */
export function Spinner({ className, label }: SpinnerProps) {
  return (
    <span
      role={label ? 'status' : undefined}
      aria-live={label ? 'polite' : undefined}
      className="inline-flex"
    >
      <Loader2
        className={cn('h-4 w-4 animate-spin text-primary motion-reduce:animate-none', className)}
        aria-hidden
      />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
