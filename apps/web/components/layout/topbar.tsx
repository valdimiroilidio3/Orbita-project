'use client';

import { Check, ChevronsUpDown, Menu, Search } from 'lucide-react';

import { NotificationIndicator } from '@/components/layout/notification-indicator';
import { UserMenu, type UserMenuProps } from '@/components/layout/user-menu';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

export interface TopbarProps {
  onMenuClick: () => void;
  /** Slot de breadcrumbs (visível a partir de tablet). */
  breadcrumbs?: React.ReactNode;
  user?: UserMenuProps['user'];
  organization?: { id: string; name: string; slug: string; role: string } | null;
  demoMode?: boolean;
}

/**
 * Topbar: navegação mobile, pesquisa, seletor de organização,
 * notificações e menu de utilizador (sessão real ou demo identificado).
 */
export function Topbar({
  onMenuClick,
  breadcrumbs,
  user = null,
  organization = null,
  demoMode = false,
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur-sm sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted transition-colors duration-fast ease-out hover:bg-neutral-soft/70 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus lg:hidden"
        aria-label="Abrir navegação"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>

      {breadcrumbs ? <div className="hidden lg:block">{breadcrumbs}</div> : null}

      <div className="relative hidden flex-1 sm:block">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <Input
          type="search"
          placeholder="Pesquisar agentes, chamadas…"
          aria-label="Pesquisar"
          className="max-w-md border-transparent bg-background pl-9"
        />
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="hidden items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-small font-medium transition-colors duration-fast ease-out hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:inline-flex"
              aria-label="Selecionar organização"
              aria-haspopup="menu"
            >
              <span className="max-w-48 truncate">
                {organization ? organization.name : 'ORBITA Demo'}
              </span>
              {organization ? (
                <Badge variant="neutral" className="capitalize">
                  {organization.role}
                </Badge>
              ) : (
                <Badge variant="accent">Demo</Badge>
              )}
              <ChevronsUpDown className="h-3.5 w-3.5 text-muted" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Organização ativa</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <Check className="text-primary" aria-hidden />
              {organization ? organization.name : 'ORBITA Demo'}
            </DropdownMenuItem>
            {organization ? (
              <DropdownMenuItem disabled>
                <span className="text-caption text-muted">
                  Role: {organization.role} · troca de organização numa fase seguinte
                </span>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem disabled>Criar organização requer sessão</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <NotificationIndicator />
        <UserMenu user={user} organizationName={organization?.name} demoMode={demoMode} />
      </div>
    </header>
  );
}
