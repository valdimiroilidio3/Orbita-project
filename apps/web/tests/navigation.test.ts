import { describe, expect, it } from 'vitest';

import { NAV_ITEMS } from '../components/layout/nav-config';
import { buildBreadcrumbs, readSidebarCollapsed, writeSidebarCollapsed } from '../lib/navigation';

describe('buildBreadcrumbs', () => {
  it('deriva o trilho do pathname e da navegação tipada', () => {
    expect(buildBreadcrumbs('/overview')).toEqual([{ label: 'Overview' }]);
    expect(buildBreadcrumbs('/')).toEqual([{ label: 'Overview' }]);
    expect(buildBreadcrumbs('/calls')).toEqual([{ label: 'Calls' }]);
    expect(buildBreadcrumbs('/agents/new')).toEqual([
      { label: 'Agents', href: '/agents' },
      { label: 'Novo' },
    ]);
    expect(buildBreadcrumbs('/agents')).toEqual([{ label: 'Agents' }]);
  });

  it('funciona com secções upcoming (sem link ativo)', () => {
    // /automations não tem página própria — o trilho identifica a secção.
    expect(buildBreadcrumbs('/automations')).toEqual([{ label: 'Automations' }]);
  });

  it('normaliza barras finais e caminhos desconhecidos', () => {
    expect(buildBreadcrumbs('/calls/')).toEqual([{ label: 'Calls' }]);
    const crumbs = buildBreadcrumbs('/foo/bar');
    expect(crumbs[crumbs.length - 1]?.label).toBe('bar');
  });

  it('usa exatamente a configuração de navegação definida', () => {
    const labels = NAV_ITEMS.map((item) => item.label);
    expect(labels).toEqual([
      'Overview',
      'Agents',
      'Calls',
      'Contacts',
      'Automations',
      'Ferramentas',
      'Analytics',
      'Integrations',
      'Billing',
      'Settings',
    ]);
  });
});

describe('persistência da sidebar (guardas de ambiente)', () => {
  it('devolve false sem window (SSR/ambiente node)', () => {
    expect(readSidebarCollapsed()).toBe(false);
  });

  it('writeSidebarCollapsed não lança sem window', () => {
    expect(() => writeSidebarCollapsed(true)).not.toThrow();
  });
});
