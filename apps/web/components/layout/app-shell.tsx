'use client';

import { X } from 'lucide-react';
import * as React from 'react';

import { AppSidebar } from '@/components/layout/app-sidebar';
import { Topbar } from '@/components/layout/topbar';
import { cn } from '@/lib/utils';

/**
 * Shell autenticado: sidebar + topbar + conteúdo.
 * Desktop: sidebar fixa. Mobile: sidebar em drawer com overlay.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-surface">
      {/* Sidebar fixa (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border lg:block">
        <AppSidebar />
      </aside>

      {/* Drawer (mobile) */}
      <div
        className={cn(
          'fixed inset-0 z-40 lg:hidden',
          sidebarOpen ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        aria-hidden={!sidebarOpen}
      >
        <div
          className={cn(
            'absolute inset-0 bg-text/40 transition-opacity',
            sidebarOpen ? 'opacity-100' : 'opacity-0',
          )}
          onClick={() => setSidebarOpen(false)}
        />
        <aside
          className={cn(
            'absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-overlay transition-transform',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted hover:bg-background hover:text-text"
            aria-label="Fechar navegação"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
          <AppSidebar onNavigate={() => setSidebarOpen(false)} />
        </aside>
      </div>

      <div className="lg:pl-64">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
