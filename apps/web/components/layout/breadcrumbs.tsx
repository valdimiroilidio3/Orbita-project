import { ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

/** Trilho de navegação (WCAG: navegação + aria-current no item atual). */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Navegação estrutural" className={cn('flex items-center gap-1.5', className)}>
      <Link
        href="/overview"
        className="inline-flex items-center gap-1 text-caption text-muted transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        aria-label="Início"
      >
        <Home className="h-3.5 w-3.5" aria-hidden />
      </Link>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={`${item.label}-${index}`}>
            <ChevronRight className="h-3.5 w-3.5 text-muted/60" aria-hidden />
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-caption text-muted transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                {item.label}
              </Link>
            ) : (
              <span
                aria-current={isLast ? 'page' : undefined}
                className={cn('text-caption', isLast ? 'font-medium text-text' : 'text-muted')}
              >
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
