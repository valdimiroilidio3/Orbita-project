import { FilterX } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface FilterBarProps {
  /** Barra de filtros: pesquisa + controlos + limpar. */
  children: React.ReactNode;
  onClear?: () => void;
  showClear?: boolean;
  clearLabel?: string;
  className?: string;
}

/** Contentor de filtros consistente para listagens e tabelas. */
export function FilterBar({
  children,
  onClear,
  showClear = false,
  clearLabel = 'Limpar filtros',
  className,
}: FilterBarProps) {
  return (
    <div role="search" className={cn('flex flex-col gap-3 sm:flex-row sm:items-center', className)}>
      {children}
      {showClear && onClear ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="shrink-0 self-start sm:self-auto"
        >
          <FilterX className="h-4 w-4" aria-hidden />
          {clearLabel}
        </Button>
      ) : null}
    </div>
  );
}

export interface FilterSelectProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}

/** Slot de controlo dentro da FilterBar (label acessível + select nativo estilizado). */
export function FilterSelect({
  label,
  value,
  onValueChange,
  options,
  className,
}: FilterSelectProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <label className="sr-only" htmlFor={`filter-${label}`}>
        {label}
      </label>
      <select
        id={`filter-${label}`}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className="h-10 rounded-md border border-border bg-surface px-3 text-small text-text transition-colors duration-fast ease-out hover:border-muted/50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
