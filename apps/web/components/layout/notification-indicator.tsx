import { Bell } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * Indicador de notificações.
 * Fase 02: infraestrutura visual — sem feed real (não simula notificações).
 */
export function NotificationIndicator() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-md text-muted transition-colors duration-fast ease-out hover:bg-neutral-soft/70 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          aria-label="Notificações (sem novas)"
        >
          <Bell className="h-5 w-5" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Notificações</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <p className="px-2.5 py-6 text-center text-small text-muted">
          Sem notificações novas.
          <br />
          <span className="text-caption">
            O feed de notificações será ligado numa fase seguinte.
          </span>
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
