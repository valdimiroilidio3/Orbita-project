import {
  BarChart3,
  Bot,
  CreditCard,
  LayoutDashboard,
  type LucideIcon,
  PhoneCall,
  Plug,
  Settings,
  Users,
  Workflow,
  Wrench,
} from 'lucide-react';

/**
 * Configuração tipada da navegação principal.
 *
 * `status`:
 * - 'available' — secção já existe (pode ser um placeholder honesto da Fase 01);
 * - 'upcoming'  — planeada para fases futuras; apresentada como "Em breve",
 *                 sem simular funcionalidade.
 */
export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  status: 'available' | 'upcoming';
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: '/overview',
    label: 'Overview',
    icon: LayoutDashboard,
    status: 'available',
    description: 'Métricas e atividade recente',
  },
  {
    href: '/agents',
    label: 'Agents',
    icon: Bot,
    status: 'available',
    description: 'Gestão de agentes de voz',
  },
  {
    href: '/calls',
    label: 'Calls',
    icon: PhoneCall,
    status: 'available',
    description: 'Histórico de chamadas',
  },
  {
    href: '/contacts',
    label: 'Contacts',
    icon: Users,
    status: 'available',
    description: 'Base de contactos',
  },
  {
    href: '/automations',
    label: 'Automations',
    icon: Workflow,
    status: 'available',
    description: 'Fluxos e automações',
  },
  {
    href: '/tools',
    label: 'Ferramentas',
    icon: Wrench,
    status: 'available',
    description: 'Catálogo de ferramentas do agente',
  },
  {
    href: '/analytics',
    label: 'Analytics',
    icon: BarChart3,
    status: 'available',
    description: 'Relatórios avançados',
  },
  {
    href: '/integrations',
    label: 'Integrations',
    icon: Plug,
    status: 'available',
    description: 'Voz, IA e billing',
  },
  {
    href: '/billing',
    label: 'Billing',
    icon: CreditCard,
    status: 'available',
    description: 'Plano e faturação',
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: Settings,
    status: 'available',
    description: 'Configuração do workspace',
  },
] as const;
