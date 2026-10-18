import { Users } from 'lucide-react';

import { ROLE_LABELS } from '@orbita/shared';

import { MembersTable } from '@/components/settings/members-table';
import { PendingNotice, SettingsSection } from '@/components/settings/settings-section';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { isSupabaseConfigured } from '@/lib/env';
import { getActiveOrganization } from '@/lib/server/organizations';
import { requireUser } from '@/lib/server/session';
import { listOrganizationMembers } from '@/lib/server/settings';

export const metadata = { title: 'Membros · Definições' };

export default async function MembersSettingsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <EmptyState
        icon={Users}
        title="Membros indisponíveis"
        description="Supabase não configurado — não existe organização real nem equipa para gerir."
      />
    );
  }

  const user = await requireUser();
  const organization = await getActiveOrganization();
  if (!organization) {
    return (
      <EmptyState icon={Users} title="Sem organização ativa" description="Conclui o onboarding." />
    );
  }

  const result = await listOrganizationMembers(organization.id);

  return (
    <>
      <SettingsSection
        title="Membros e permissões"
        description="Owner gere a organização e os papéis; Admin gere funcionalidades sem ultrapassar o owner; Membro utiliza o que lhe é concedido. Todas as alterações são validadas no servidor e pela base de dados."
        badge={<Badge variant="outline">O teu papel: {ROLE_LABELS[organization.role]}</Badge>}
      >
        {result.ok ? (
          <MembersTable members={result.members} actorId={user.id} actorRole={organization.role} />
        ) : result.reason === 'rpc_missing' ? (
          <PendingNotice
            title="Listagem de membros indisponível"
            requirement="aplicar a migração 0006_settings.sql (função list_organization_members) no projeto Supabase."
          />
        ) : (
          <ErrorState description="Não foi possível carregar os membros. Tenta novamente." />
        )}
      </SettingsSection>

      <SettingsSection
        title="Convidar membros"
        description="Adicionar pessoas à organização."
        badge={<Badge variant="neutral">Pendente de configuração</Badge>}
      >
        <PendingNotice
          title="Convites por email ainda não implementados"
          requirement="serviço de envio de email e RPC de convite com expiração (sem política INSERT em memberships, por desenho). Nenhum convite fictício é criado."
        />
      </SettingsSection>
    </>
  );
}
