'use client';

import { Orbit } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { NAV_ITEMS, type NavItem } from '@/components/layout/nav-config';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface AppSidebarProps {
  onNavigate?: () => void;
}

/**
 * Sidebar principal — navegação por secções (configuração tipada em nav-config).
 * Secções "upcoming" aparecem como "Em breve", sem simular funcionalidade.
 */
export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full flex-col border-r border-border bg-surface">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white shadow-xs">
            <Orbit className="h-5 w-5" aria-hidden />
          </span>
          <div className="leading-tight">
            <p className="text-small font-bold tracking-tight">ORBITA CHAT</p>
            <p className="text-caption text-muted">Workspace</p>
          </div>
        </div>

        <div className="mx-4 rounded-lg border border-border bg-background px-3.5 py-2.5">
          <p className="text-caption text-muted">Organização</p>
          <p className="mt-0.5 flex items-center gap-2 text-small font-semibold">
            ORBITA Demo
            <Badge variant="accent">Demo</Badge>
          </p>
        </div>

        <nav
          aria-label="Navegação principal"
          className="mt-4 flex-1 space-y-1 overflow-y-auto px-3 pb-4"
        >
          {NAV_ITEMS.map((item) => (
            <SidebarLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </nav>

        <div className="m-4 rounded-lg border border-border bg-background p-3.5">
          <p className="text-small font-semibold">Utilizador Demo</p>
          <p className="text-caption text-muted">demo@orbita.chat</p>
          <p className="mt-2 text-caption leading-relaxed text-muted">
            Sessão e perfil serão ligados à autenticação numa fase seguinte.
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
}

function SidebarLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const upcoming = item.status === 'upcoming';
  const active = !upcoming && (pathname === item.href || pathname.startsWith(`${item.href}/`));

  const className = cn(
    'flex items-center gap-3 rounded-md px-3 py-2.5 text-small font-medium transition-colors duration-fast ease-out',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
    active && 'bg-primary text-white shadow-xs',
    !active && !upcoming && 'text-muted hover:bg-background hover:text-text',
    upcoming && 'cursor-not-allowed text-muted/70',
  );

  if (upcoming) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={className} aria-disabled="true" role="link">
            <item.icon className="h-4.5 w-4.5 shrink-0" aria-hidden />
            <span className="flex-1">{item.label}</span>
            <Badge variant="neutral" className="text-[10px]">
              Em breve
            </Badge>
          </span>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p className="font-medium">{item.label}</p>
          <p className="opacity-80">{item.description} — planeado para uma fase seguinte.</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={className}
    >
      <item.icon className="h-4.5 w-4.5 shrink-0" aria-hidden />
      <span className="flex-1">{item.label}</span>
    </Link>
  );
}
