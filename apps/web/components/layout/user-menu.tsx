'use client';

import { Building2, CreditCard, LogOut, Settings, UserRound } from 'lucide-react';
import Link from 'next/link';

import { signOutAction } from '@/lib/server/actions';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface UserMenuProps {
  /** Sessão real; `null` em modo demonstração. */
  user?: { email: string; name?: string | null } | null;
  organizationName?: string | null;
  demoMode?: boolean;
}

/** Menu de utilizador — sessão real (logout) ou modo demo identificado. */
export function UserMenu({ user = null, organizationName = null, demoMode = false }: UserMenuProps) {
  const displayName = user?.name || user?.email || 'Utilizador Demo';
  const initials = (user?.name || user?.email || 'D')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-md p-1.5 transition-colors duration-fast ease-out hover:bg-neutral-soft/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          aria-label="Abrir menu de utilizador"
          aria-haspopup="menu"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initials || 'D'}</AvatarFallback>
          </Avatar>
          <span className="hidden text-left leading-tight md:block">
            <span className="block max-w-40 truncate text-small font-medium">{displayName}</span>
            <span className="block text-caption text-muted">
              {demoMode ? 'Modo demo' : (organizationName ?? 'Sem organização')}
            </span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <p className="truncate text-small font-medium text-text">{displayName}</p>
          <p className="truncate text-caption font-normal text-muted">
            {demoMode ? 'Sessão não disponível (demo)' : (user?.email ?? '')}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Building2 aria-hidden />
            Organização
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <UserRound aria-hidden />
            Perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings aria-hidden />
            Definições
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/integrations">
            <CreditCard aria-hidden />
            Plano e faturação
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {demoMode ? (
          <DropdownMenuItem asChild>
            <Link href="/login">
              <LogOut aria-hidden />
              Ir para o login
            </Link>
          </DropdownMenuItem>
        ) : (
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 py-2 text-small text-text transition-colors duration-fast ease-out hover:bg-soft-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <LogOut className="h-4 w-4 text-muted" aria-hidden />
              Terminar sessão
            </button>
          </form>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
