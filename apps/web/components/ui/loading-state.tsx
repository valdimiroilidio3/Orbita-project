import * as React from 'react';

import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

export interface LoadingStateProps {
  /** Rótulo anunciado a leitores de ecrã (ex.: "A carregar chamadas"). */
  label?: string;
  className?: string;
}

/** Estado de carregamento centrado, com anúncio acessível. */
export function LoadingState({ label = 'A carregar', className }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex flex-col items-center justify-center gap-3 py-12', className)}
    >
      <Spinner className="h-6 w-6" />
      <p className="text-small text-muted">{label}…</p>
    </div>
  );
}
