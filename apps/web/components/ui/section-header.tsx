import * as React from 'react';

import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export interface SectionHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  /** Separação inferior entre a secção e o conteúdo. */
  separated?: boolean;
  className?: string;
}

/** Cabeçalho de secção dentro de uma página (título, descrição, ações). */
export function SectionHeader({
  title,
  description,
  actions,
  separated = true,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-h3">{title}</h2>
          {description ? <p className="text-small text-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      {separated ? <Separator /> : null}
    </div>
  );
}
