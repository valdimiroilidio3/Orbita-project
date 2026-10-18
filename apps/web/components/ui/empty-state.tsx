import type { LucideIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

/** Estado vazio com orientação clara e ação opcional. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center',
        className,
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-soft-blue text-primary">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <h2 className="text-h3">{title}</h2>
      <p className="max-w-md text-small text-muted">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
