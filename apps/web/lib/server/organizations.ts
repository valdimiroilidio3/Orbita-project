import { cookies } from 'next/headers';

import type { OrganizationRole } from '@orbita/shared';

import { ACTIVE_ORG_COOKIE, pickActiveOrganization } from '@/lib/active-org';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/server/session';

/**
 * Camada de acesso a dados de organizações (lado do servidor).
 *
 * Estratégia de organização ativa:
 *   • cookie `orbita_active_org` guarda a PREFERÊNCIA do utilizador;
 *   • a preferência é VALIDADA no servidor em cada request contra as
 *     memberships do utilizador (query sujeita a RLS);
 *   • o cookie NUNCA é prova de autorização — o RLS na base de dados é a
 *     autoridade (manipular o cookie não concede acesso a dados alheios).
 */

export { ACTIVE_ORG_COOKIE, pickActiveOrganization };

export interface ActiveOrganization {
  id: string;
  name: string;
  slug: string;
  role: OrganizationRole;
}

/** Lista as organizações do utilizador autenticado (RLS limita aos membros). */
export async function listMyOrganizations(): Promise<ActiveOrganization[]> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('memberships')
    .select('role, organization:organizations(id, name, slug)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Não foi possível carregar as organizações: ${error.message}`);
  }

  return (data ?? []).flatMap((row) => {
    const organization = Array.isArray(row.organization) ? row.organization[0] : row.organization;
    if (!organization?.id) return [];
    return [
      {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        role: (row.role ?? 'member') as OrganizationRole,
      },
    ];
  });
}

/** Organização ativa (preferência validada) ou `null` — estado de onboarding. */
export async function getActiveOrganization(): Promise<ActiveOrganization | null> {
  const organizations = await listMyOrganizations();
  const cookieStore = await cookies();
  const preferredId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
  return pickActiveOrganization(organizations, preferredId);
}
