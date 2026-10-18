import { AlertTriangle } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

export interface ErrorStateProps {
  title?: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Estado de erro — comunica o problema sem depender só da cor
 * (ícone + título + descrição) e oferece uma saída.
 */
export function ErrorState({
  title = 'Algo correu mal',
  description,
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-danger/30 bg-danger-soft/50 px-6 py-12 text-center',
        className,
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-danger-soft text-danger-text">
        <AlertTriangle className="h-6 w-6" aria-hidden />
      </span>
      <h2 className="text-h3 text-text">{title}</h2>
      <p className="max-w-md text-small text-muted">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
