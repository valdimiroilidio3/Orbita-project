import { redirect } from 'next/navigation';

import { AppShell } from '@/components/layout/app-shell';
import { isSupabaseConfigured } from '@/lib/env';
import { getActiveOrganization, listMyOrganizations } from '@/lib/server/organizations';
import { getUser } from '@/lib/server/session';

/**
 * Layout das páginas privadas — verificação de sessão NO SERVIDOR
 * (defesa em profundidade além do middleware; a autorização de dados
 * continua a ser imposta pelo RLS na base de dados).
 */
// Rotas privadas: conteúdo depende da sessão — nunca pré-renderizar.
export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) {
    // Modo demonstração — sem Supabase não há sessão real e não é simulada.
    return <AppShell demoMode>{children}</AppShell>;
  }

  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  const organizations = await listMyOrganizations();
  if (organizations.length === 0) {
    redirect('/onboarding');
  }

  const organization = await getActiveOrganization();

  return (
    <AppShell
      user={{ email: user.email ?? '', name: user.user_metadata?.name ?? null }}
      organization={organization}
    >
      {children}
    </AppShell>
  );
}
