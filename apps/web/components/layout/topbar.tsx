'use client';

import { Bell, ChevronDown, Menu, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export interface TopbarProps {
  onMenuClick: () => void;
}

/** Barra superior: pesquisa, notificações e seletor de organização. */
export function Topbar({ onMenuClick }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface hover:text-text lg:hidden"
        aria-label="Abrir navegação"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>

      <div className="relative hidden flex-1 sm:block">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <Input
          type="search"
          placeholder="Pesquisar agentes, chamadas…"
          className="max-w-md bg-surface pl-9"
          aria-label="Pesquisar"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          className="hidden items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2 text-sm font-medium transition-colors hover:bg-surface sm:inline-flex"
          aria-label="Selecionar organização"
        >
          ORBITA Demo
          <Badge variant="accent">Demo</Badge>
          <ChevronDown className="h-4 w-4 text-muted" aria-hidden />
        </button>

        <button
          type="button"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface hover:text-text"
          aria-label="Notificações"
        >
          <Bell className="h-5 w-5" aria-hidden />
          <span
            className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-primary"
            aria-hidden
          />
        </button>

        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-soft-blue text-sm font-semibold text-primary">
          D
        </span>
      </div>
    </header>
  );
}
