import { Search, X } from 'lucide-react';
import * as React from 'react';

import { Input, type InputProps } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface SearchInputProps extends Omit<InputProps, 'type' | 'value' | 'onChange'> {
  value: string;
  onValueChange: (value: string) => void;
  /** Rótulo acessível (visível em sr-only). */
  label?: string;
}

/** Campo de pesquisa com ícone e ação de limpar. */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    { className, value, onValueChange, label = 'Pesquisar', placeholder = 'Pesquisar…', ...props },
    ref,
  ) => (
    <div className={cn('relative w-full', className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
      <Input
        ref={ref}
        type="search"
        role="searchbox"
        aria-label={label}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onValueChange(event.target.value)}
        className="pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
        {...props}
      />
      {value !== '' ? (
        <button
          type="button"
          onClick={() => onValueChange('')}
          aria-label="Limpar pesquisa"
          className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted transition-colors hover:bg-neutral-soft hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  ),
);
SearchInput.displayName = 'SearchInput';
