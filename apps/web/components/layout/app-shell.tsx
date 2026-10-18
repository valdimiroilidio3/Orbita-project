'use client';

import { X } from 'lucide-react';
import * as React from 'react';

import { AppSidebar } from '@/components/layout/app-sidebar';
import { Container } from '@/components/layout/container';
import { Topbar } from '@/components/layout/topbar';
import { cn } from '@/lib/utils';

export interface AppShellProps {
  children: React.ReactNode;
  /** Breadcrumbs apresentados na topbar (alinhados com a página atual). */
  breadcrumbs?: React.ReactNode;
}

/**
 * Shell da aplicação: sidebar + topbar + área de conteúdo.
 * Desktop: sidebar fixa. Mobile/tablet: sidebar em drawer com overlay.
 * Área de conteúdo com Container consistente (--container-content).
 */
export function AppShell({ children, breadcrumbs }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar fixa (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        <AppSidebar />
      </aside>

      {/* Drawer (mobile/tablet) */}
      <div
        className={cn(
          'fixed inset-0 z-50 lg:hidden',
          sidebarOpen ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        aria-hidden={!sidebarOpen}
      >
        <div
          className={cn(
            'absolute inset-0 bg-text/40 transition-opacity duration-normal ease-out',
            sidebarOpen ? 'opacity-100' : 'opacity-0',
          )}
          onClick={() => setSidebarOpen(false)}
        />
        <aside
          className={cn(
            'absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-surface shadow-xl transition-transform duration-slow ease-out motion-reduce:transition-none',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-neutral-soft hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            aria-label="Fechar navegação"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
          <AppSidebar onNavigate={() => setSidebarOpen(false)} />
        </aside>
      </div>

      <div className="flex min-h-screen flex-col lg:pl-64">
        <Topbar onMenuClick={() => setSidebarOpen(true)} breadcrumbs={breadcrumbs} />
        <main className="flex-1 py-8">
          <Container>{children}</Container>
        </main>
      </div>
    </div>
  );
}
