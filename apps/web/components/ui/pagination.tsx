import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Cálculo de itens de paginação com reticências.
 * Ex.: (1, 5, 1) → [1, '…', 2, 3, 4, 5, '…', 9] quando pageCount=9, page=5.
 */
export function getPageItems(page: number, pageCount: number, siblingCount = 1): (number | '…')[] {
  if (pageCount <= 1) return [1];
  // Poucas páginas: mostrar todas, sem reticências.
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
  const pages = new Set<number>([1, pageCount]);
  for (let i = page - siblingCount; i <= page + siblingCount; i += 1) {
    if (i >= 1 && i <= pageCount) pages.add(i);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const items: (number | '…')[] = [];
  let previous = 0;
  for (const current of sorted) {
    if (previous !== 0 && current - previous > 1) items.push('…');
    items.push(current);
    previous = current;
  }
  return items;
}

export interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** Texto de contexto (ex.: "Página 2 de 9"). */
  label?: string;
  className?: string;
}

/** Paginação acessível: anterior, páginas com reticências e seguinte. */
export function Pagination({ page, pageCount, onPageChange, label, className }: PaginationProps) {
  if (pageCount <= 1) return null;
  const items = getPageItems(page, pageCount);

  return (
    <nav
      role="navigation"
      aria-label="Paginação"
      className={cn('flex items-center gap-1', className)}
    >
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Página anterior"
        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface text-muted transition-colors hover:bg-background hover:text-text disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>

      {items.map((item, index) =>
        item === '…' ? (
          <span
            key={`ellipsis-${index}`}
            className="inline-flex h-10 w-8 items-center justify-center text-muted"
            aria-hidden
          >
            <MoreHorizontal className="h-4 w-4" />
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            aria-label={`Ir para a página ${item}`}
            aria-current={item === page ? 'page' : undefined}
            className={cn(
              'inline-flex h-10 min-w-10 items-center justify-center rounded-md border px-2 text-small font-medium transition-colors duration-fast ease-out',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
              item === page
                ? 'border-primary bg-primary text-white'
                : 'border-border bg-surface text-muted hover:bg-background hover:text-text',
            )}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pageCount}
        aria-label="Página seguinte"
        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface text-muted transition-colors hover:bg-background hover:text-text disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>

      {label ? (
        <span className="ml-3 text-caption text-muted" aria-live="polite">
          {label}
        </span>
      ) : null}
    </nav>
  );
}
