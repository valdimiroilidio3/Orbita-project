'use client';

import {
  BarChart3,
  Bell,
  Building2,
  CreditCard,
  LayoutGrid,
  Mic,
  Plug,
  Shield,
  SlidersHorizontal,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

export interface SettingsNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const SETTINGS_NAV: SettingsNavItem[] = [
  {
    href: '/settings',
    label: 'Visão geral',
    icon: LayoutGrid,
    description: 'Estado da conta e da organização',
  },
  {
    href: '/settings/profile',
    label: 'Perfil',
    icon: UserRound,
    description: 'Nome, email e conta',
  },
  {
    href: '/settings/organization',
    label: 'Organização',
    icon: Building2,
    description: 'Dados da empresa',
  },
  { href: '/settings/members', label: 'Membros', icon: Users, description: 'Equipa e permissões' },
  {
    href: '/settings/security',
    label: 'Segurança',
    icon: Shield,
    description: 'Palavra-passe e sessões',
  },
  {
    href: '/settings/notifications',
    label: 'Notificações',
    icon: Bell,
    description: 'Alertas e resumos',
  },
  {
    href: '/settings/voice',
    label: 'Voz e agentes',
    icon: Mic,
    description: 'Defaults globais de voz',
  },
  {
    href: '/settings/integrations',
    label: 'Integrações',
    icon: Plug,
    description: 'Estado real das ligações',
  },
  {
    href: '/settings/usage',
    label: 'Utilização',
    icon: BarChart3,
    description: 'Consumo do período',
  },
  {
    href: '/settings/billing',
    label: 'Faturação',
    icon: CreditCard,
    description: 'Plano e faturas',
  },
  {
    href: '/settings/preferences',
    label: 'Preferências',
    icon: SlidersHorizontal,
    description: 'Idioma, fuso e formatos',
  },
];

export function isSettingsItemActive(pathname: string, href: string): boolean {
  return href === '/settings' ? pathname === '/settings' : pathname.startsWith(href);
}

/** Navegação lateral das definições (lista vertical ≥ lg; scroll horizontal abaixo). */
export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Secções das definições" className="lg:sticky lg:top-20">
      <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        {SETTINGS_NAV.map((item) => {
          const active = isSettingsItemActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-small font-medium transition-colors duration-fast ease-out',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
                  active
                    ? 'bg-soft-blue text-primary'
                    : 'text-muted hover:bg-surface hover:text-text',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
