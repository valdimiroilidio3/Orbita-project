'use client';

import {
  Bot,
  LayoutDashboard,
  type LucideIcon,
  PhoneCall,
  Plug,
  Settings,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/overview', label: 'Overview', icon: LayoutDashboard },
  { href: '/agents', label: 'Agentes', icon: Bot },
  { href: '/calls', label: 'Chamadas', icon: PhoneCall },
  { href: '/contacts', label: 'Contactos', icon: Users },
  { href: '/integrations', label: 'Integrações', icon: Plug },
  { href: '/settings', label: 'Definições', icon: Settings },
];

export interface AppSidebarProps {
  onNavigate?: () => void;
}

/** Navegação principal: workspace, secções e perfil. */
export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
          <Bot className="h-5 w-5" aria-hidden />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-bold tracking-tight">ORBITA CHAT</p>
          <p className="text-xs text-muted">Workspace</p>
        </div>
      </div>

      <div className="mx-4 rounded-xl border border-border bg-background px-3.5 py-2.5">
        <p className="text-xs text-muted">Organização</p>
        <p className="mt-0.5 flex items-center gap-2 text-sm font-semibold">
          ORBITA Demo
          <Badge variant="accent">Demo</Badge>
        </p>
      </div>

      <nav aria-label="Navegação principal" className="mt-4 flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
                active ? 'bg-primary text-white' : 'text-muted hover:bg-background hover:text-text',
              )}
            >
              <item.icon className="h-4.5 w-4.5" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="m-4 rounded-xl border border-border bg-background p-3.5">
        <p className="text-sm font-semibold">Utilizador Demo</p>
        <p className="text-xs text-muted">demo@orbita.chat</p>
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          Perfil e sessão serão ligados ao Supabase Auth no próximo sprint.
        </p>
      </div>
    </div>
  );
}
