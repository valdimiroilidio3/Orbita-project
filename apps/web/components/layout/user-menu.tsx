import { CreditCard, LogOut, Settings, UserRound } from 'lucide-react';
import Link from 'next/link';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * Menu de utilizador — infraestrutura visual da Fase 02.
 * Os itens de sessão/perfil não estão ligados a autenticação real;
 * ao interagir, o utilizador é informado pela página de destino.
 */
export function UserMenu() {
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
            <AvatarFallback>UD</AvatarFallback>
          </Avatar>
          <span className="hidden text-left leading-tight md:block">
            <span className="block text-small font-medium">Utilizador Demo</span>
            <span className="block text-caption text-muted">demo@orbita.chat</span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <p className="text-small font-medium text-text">Utilizador Demo</p>
          <p className="text-caption font-normal text-muted">demo@orbita.chat · Demo</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
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
            <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/integrations">
            <CreditCard aria-hidden />
            Plano e faturação
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/login">
            <LogOut aria-hidden />
            Terminar sessão
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
