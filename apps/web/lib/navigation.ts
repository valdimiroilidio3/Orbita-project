/**
 * Navegação persistente (Prompt 03).
 *
 * - `buildBreadcrumbs`: trilho derivado do pathname + configuração tipada
 *   da navegação (função pura, testada).
 * - Colapso da sidebar persistido em localStorage (com guardas para SSR
 *   e ambientes sem storage).
 */

import { NAV_ITEMS, type NavItem } from '@/components/layout/nav-config';

export interface Crumb {
  label: string;
  href?: string;
}

/** Rótulos PT-PT para segmentos de URL sem entrada na navegação. */
const SEGMENT_LABELS: Record<string, string> = {
  new: 'Novo',
  overview: 'Overview',
  agents: 'Agents',
  calls: 'Calls',
  contacts: 'Contacts',
  automations: 'Automations',
  analytics: 'Analytics',
  integrations: 'Integrations',
  billing: 'Billing',
  settings: 'Settings',
};

/**
 * Constrói breadcrumbs a partir do pathname.
 * Ex.: '/agents/new' → [{ label: 'Agents', href: '/agents' }, { label: 'Novo' }]
 *      '/overview'   → [{ label: 'Overview' }]
 */
export function buildBreadcrumbs(pathname: string, items: readonly NavItem[] = NAV_ITEMS): Crumb[] {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/' || path === '/overview') {
    return [{ label: 'Overview' }];
  }

  // Encontrar a entrada de navegação com prefixo mais longo.
  const match = items
    .filter((item) => path === item.href || path.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];

  const rest = match ? path.slice(match.href.length).replace(/^\//, '') : path.replace(/^\//, '');

  const crumbs: Crumb[] = [];
  if (match) {
    // O último crumb nunca é link (página atual).
    crumbs.push(rest === '' ? { label: match.label } : { label: match.label, href: match.href });
  }

  if (rest !== '') {
    const segments = rest.split('/').filter(Boolean);
    segments.forEach((segment, index) => {
      const label = SEGMENT_LABELS[segment] ?? decodeURIComponent(segment).replace(/-/g, ' ');
      const isLast = index === segments.length - 1;
      crumbs.push(
        isLast
          ? { label }
          : {
              label,
              href: `${match ? match.href : ''}/${segments.slice(0, index + 1).join('/')}`,
            },
      );
    });
  }

  return crumbs;
}

/* ── Persistência do estado da sidebar ─────────────────────── */

const SIDEBAR_STORAGE_KEY = 'orbita-chat:sidebar';
const SIDEBAR_EVENT = 'orbita-chat:sidebar-change';

export function readSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (raw === null) return false;
    return JSON.parse(raw)?.collapsed === true;
  } catch {
    return false;
  }
}

export function writeSidebarCollapsed(collapsed: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify({ collapsed }));
    window.dispatchEvent(new Event(SIDEBAR_EVENT));
  } catch {
    // Storage indisponível (modo privado) — a preferência simplesmente não persiste.
  }
}

/**
 * Subscrição para `useSyncExternalStore`: reage a alterações locais
 * (evento próprio) e entre separadores (evento `storage`).
 */
export function subscribeSidebarCollapsed(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(SIDEBAR_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(SIDEBAR_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

/** Snapshot do servidor (SSR) para `useSyncExternalStore`. */
export function getSidebarCollapsedServerSnapshot(): boolean {
  return false;
}
