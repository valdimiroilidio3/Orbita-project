import * as React from 'react';

import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  title: string;
  description?: string;
  /** Slot de breadcrumbs (componente Breadcrumbs do layout). */
  breadcrumbs?: React.ReactNode;
  /** Ações principais (canto superior direito). */
  children?: React.ReactNode;
  className?: string;
}

/** Cabeçalho de página: breadcrumbs, título, descrição e ação principal. */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {breadcrumbs}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-h1">{title}</h1>
          {description ? <p className="text-small text-muted">{description}</p> : null}
        </div>
        {children ? <div className="flex shrink-0 items-center gap-2">{children}</div> : null}
      </div>
    </div>
  );
}
