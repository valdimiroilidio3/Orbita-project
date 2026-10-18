'use client';

import { X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import * as React from 'react';

import { AppSidebar } from '@/components/layout/app-sidebar';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Container } from '@/components/layout/container';
import { Topbar } from '@/components/layout/topbar';
import {
  buildBreadcrumbs,
  getSidebarCollapsedServerSnapshot,
  readSidebarCollapsed,
  subscribeSidebarCollapsed,
  writeSidebarCollapsed,
} from '@/lib/navigation';
import { cn } from '@/lib/utils';

export interface ShellUser {
  email: string;
  name?: string | null;
}

export interface ShellOrganization {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export interface AppShellProps {
  children: React.ReactNode;
  /** Sessão real (Supabase). `null` em modo demonstração. */
  user?: ShellUser | null;
  /** Organização ativa validada no servidor. */
  organization?: ShellOrganization | null;
  /** Sem Supabase configurado: modo demo, sem sessão simulada. */
  demoMode?: boolean;
}

/**
 * Shell definitivo do produto.
 *
 * - Sidebar persistente: colapso guardado em localStorage e restaurado;
 * - Breadcrumbs automáticos derivados do pathname + nav-config;
 * - Drawer mobile/tablet com overlay;
 * - Skip link (WCAG) e Container consistente;
 * - Sessão/organização reais no topo (ou modo demo identificado).
 */
export function AppShell({
  children,
  user = null,
  organization = null,
  demoMode = false,
}: AppShellProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // Preferência persistente do estado da sidebar (localStorage + eventos),
  // com snapshot de SSR para evitar divergência de hidratação.
  const collapsed = React.useSyncExternalStore(
    subscribeSidebarCollapsed,
    readSidebarCollapsed,
    getSidebarCollapsedServerSnapshot,
  );

  const toggleCollapsed = React.useCallback(() => {
    writeSidebarCollapsed(!collapsed);
  }, [collapsed]);

  const crumbs = React.useMemo(() => buildBreadcrumbs(pathname), [pathname]);

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-70 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-small focus:font-medium focus:text-white"
      >
        Saltar para o conteúdo
      </a>

      {/* Sidebar fixa (desktop) — colapso persistente */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden border-r border-border bg-surface transition-[width] duration-slow ease-out motion-reduce:transition-none lg:block',
          collapsed ? 'w-20' : 'w-64',
        )}
      >
        <AppSidebar
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          variant="desktop"
          organization={organization}
          demoMode={demoMode}
        />
      </aside>

      {/* Drawer (mobile/tablet) */}
      <div
        className={cn(
          'fixed inset-0 z-50 lg:hidden',
          drawerOpen ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        aria-hidden={!drawerOpen}
      >
        <div
          className={cn(
            'absolute inset-0 bg-text/40 transition-opacity duration-normal ease-out',
            drawerOpen ? 'opacity-100' : 'opacity-0',
          )}
          onClick={() => setDrawerOpen(false)}
        />
        <aside
          className={cn(
            'absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-surface shadow-xl transition-transform duration-slow ease-out motion-reduce:transition-none',
            drawerOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-neutral-soft hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            aria-label="Fechar navegação"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
          <AppSidebar
            variant="drawer"
            onNavigate={() => setDrawerOpen(false)}
            organization={organization}
            demoMode={demoMode}
          />
        </aside>
      </div>

      <div
        className={cn(
          'flex min-h-screen flex-col transition-[padding] duration-slow ease-out motion-reduce:transition-none',
          collapsed ? 'lg:pl-20' : 'lg:pl-64',
        )}
      >
        <Topbar
          onMenuClick={() => setDrawerOpen(true)}
          breadcrumbs={<Breadcrumbs items={crumbs} />}
          user={user}
          organization={organization}
          demoMode={demoMode}
        />

        <main id="main-content" className="flex-1 py-8" tabIndex={-1}>
          <Container>{children}</Container>
        </main>

        <footer className="border-t border-border bg-surface">
          <Container className="flex flex-col gap-1 py-4 text-caption text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>
              ORBITA CHAT — protótipo.
              {demoMode
                ? ' Modo de demonstração (sem Supabase configurado).'
                : ' Nenhuma integração externa ativa.'}
            </p>
            <p>
              Design system{' '}
              <a
                href="/design-system"
                className="text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                /design-system
              </a>
            </p>
          </Container>
        </footer>
      </div>
    </div>
  );
}
