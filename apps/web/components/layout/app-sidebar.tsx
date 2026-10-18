'use client';

import { Orbit, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { NAV_ITEMS, type NavItem } from '@/components/layout/nav-config';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface AppSidebarProps {
  /** Variante: 'desktop' suporta colapso persistente; 'drawer' é sempre expandida. */
  variant?: 'desktop' | 'drawer';
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onNavigate?: () => void;
  /** Organização ativa validada no servidor. */
  organization?: { id: string; name: string; slug: string; role: string } | null;
  /** Sem Supabase configurado: identificação de modo demo. */
  demoMode?: boolean;
}

/**
 * Sidebar principal — navegação por secções (configuração tipada em nav-config).
 * Secções "upcoming" aparecem como "Em breve", sem simular funcionalidade.
 * Em modo colapsado mostra apenas ícones (com tooltip) e mantém aria-labels.
 */
export function AppSidebar({
  variant = 'desktop',
  collapsed = false,
  onToggleCollapsed,
  onNavigate,
  organization = null,
  demoMode = false,
}: AppSidebarProps) {
  const pathname = usePathname();
  const isCollapsed = variant === 'desktop' && collapsed;
  const workspaceName = organization ? organization.name : 'ORBITA Demo';

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full flex-col bg-surface">
        <div
          className={cn(
            'flex items-center gap-2.5 px-5 py-5',
            isCollapsed && 'justify-center px-0',
          )}
        >
          <Link
            href="/overview"
            onClick={onNavigate}
            className="flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            aria-label="ORBITA CHAT — início"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white shadow-xs">
              <Orbit className="h-5 w-5" aria-hidden />
            </span>
            {!isCollapsed ? (
              <span className="leading-tight">
                <span className="block text-small font-bold tracking-tight">ORBITA CHAT</span>
                <span className="block text-caption text-muted">Workspace</span>
              </span>
            ) : null}
          </Link>
        </div>

        {!isCollapsed ? (
          <div className="mx-4 rounded-lg border border-border bg-background px-3.5 py-2.5">
            <p className="text-caption text-muted">Organização</p>
            <p className="mt-0.5 flex items-center gap-2 text-small font-semibold">
              <span className="max-w-36 truncate">{workspaceName}</span>
              {organization ? (
                <Badge variant="neutral" className="capitalize">
                  {organization.role}
                </Badge>
              ) : (
                <Badge variant="accent">Demo</Badge>
              )}
            </p>
          </div>
        ) : (
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-small font-semibold text-primary">
            {organization
              ? organization.name
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0]?.toUpperCase() ?? '')
                  .join('')
              : 'OD'}
          </div>
        )}

        <nav
          aria-label="Navegação principal"
          className={cn(
            'mt-4 flex-1 space-y-1 overflow-y-auto pb-4',
            isCollapsed ? 'px-2' : 'px-3',
          )}
        >
          {NAV_ITEMS.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              pathname={pathname}
              collapsed={isCollapsed}
              onNavigate={onNavigate}
            />
          ))}
        </nav>

        {!isCollapsed ? (
          <div className="m-4 rounded-lg border border-border bg-background p-3.5">
            <p className="text-small font-semibold">
              {demoMode ? 'Utilizador Demo' : 'Sessão ativa'}
            </p>
            <p className="text-caption text-muted">
              {demoMode ? 'demo@orbita.chat' : 'Autenticado via Supabase Auth'}
            </p>
            <p className="mt-2 text-caption leading-relaxed text-muted">
              {demoMode
                ? 'Sessão e perfil serão ligados à autenticação quando o Supabase estiver configurado.'
                : 'Perfil e membros da equipa serão geridos numa fase seguinte.'}
            </p>
          </div>
        ) : null}

        {variant === 'desktop' && onToggleCollapsed ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expandir navegação' : 'Colapsar navezação'}
            aria-expanded={!collapsed}
            className={cn(
              'flex items-center gap-3 border-t border-border px-4 py-3.5 text-small font-medium text-muted',
              'transition-colors duration-fast ease-out hover:bg-background hover:text-text',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
              isCollapsed && 'justify-center px-0',
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4.5 w-4.5" aria-hidden />
            ) : (
              <>
                <PanelLeftClose className="h-4.5 w-4.5" aria-hidden />
                Colapsar navegação
              </>
            )}
          </button>
        ) : null}
      </div>
    </TooltipProvider>
  );
}

function SidebarLink({
  item,
  pathname,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const upcoming = item.status === 'upcoming';
  const active = !upcoming && (pathname === item.href || pathname.startsWith(`${item.href}/`));

  const className = cn(
    'flex items-center gap-3 rounded-md text-small font-medium transition-colors duration-fast ease-out',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
    collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5',
    active && 'bg-primary text-white shadow-xs',
    !active && !upcoming && 'text-muted hover:bg-background hover:text-text',
    upcoming && 'cursor-not-allowed text-muted/70',
  );

  const icon = <item.icon className="h-4.5 w-4.5 shrink-0" aria-hidden />;

  if (upcoming) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={className} aria-disabled="true" role="link">
            {icon}
            {!collapsed ? (
              <>
                <span className="flex-1">{item.label}</span>
                <Badge variant="neutral" className="text-[10px]">
                  Em breve
                </Badge>
              </>
            ) : null}
            {collapsed ? <span className="sr-only">{item.label} (em breve)</span> : null}
          </span>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p className="font-medium">{item.label}</p>
          <p className="opacity-80">{item.description} — planeado para uma fase seguinte.</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={className}
    >
      {icon}
      {!collapsed ? <span className="flex-1">{item.label}</span> : null}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return link;
}
