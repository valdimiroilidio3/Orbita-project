import * as React from 'react';

import { cn } from '@/lib/utils';

export interface DataColumn<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
  /** Classe da coluna em ecrãs pequenos (ex.: hidden sm:table-cell). */
  headerClassName?: string;
}

export interface DataTableProps<T> {
  columns: DataColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  /** Estado vazio quando `data` é vazio. */
  empty?: React.ReactNode;
  /** Linhas de skeleton durante carregamento. */
  loading?: boolean;
  loadingRows?: number;
  className?: string;
  rowClassName?: (row: T) => string | undefined;
  /** Descrição acessível da tabela. */
  caption?: string;
}

/**
 * Tabela de dados reutilizável e tipada.
 * Estratégia mobile: scroll horizontal com largura mínima por coluna,
 * sem overflow da página (container com overflow-x-auto).
 */
export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  empty,
  loading = false,
  loadingRows = 5,
  className,
  rowClassName,
  caption,
}: DataTableProps<T>) {
  if (!loading && data.length === 0 && empty) {
    return <>{empty}</>;
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-surface shadow-xs',
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-small">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr className="border-b border-border bg-background/60 text-left">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    'px-5 py-3.5 text-label font-medium text-muted',
                    column.align === 'right' && 'text-right',
                    column.headerClassName,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: loadingRows }, (_, rowIndex) => (
                  <tr
                    key={`skeleton-${rowIndex}`}
                    className="border-b border-border last:border-b-0"
                  >
                    {columns.map((column) => (
                      <td key={column.key} className="px-5 py-4">
                        <div className="h-4 w-full max-w-32 animate-skeleton rounded-md bg-neutral-soft motion-reduce:animate-none" />
                      </td>
                    ))}
                  </tr>
                ))
              : data.map((row) => (
                  <tr
                    key={keyExtractor(row)}
                    className={cn(
                      'border-b border-border transition-colors duration-fast ease-out last:border-b-0 hover:bg-background/70',
                      rowClassName?.(row),
                    )}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cn(
                          'px-5 py-4',
                          column.align === 'right' && 'text-right',
                          column.className,
                        )}
                      >
                        {column.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
