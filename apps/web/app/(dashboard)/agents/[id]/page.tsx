import { Info } from 'lucide-react';
import { notFound } from 'next/navigation';

import type { AgentStatus } from '@orbita/shared';

import { agentPermissions, agentStatusLabel } from '@/lib/agents';
import { AgentDeleteButton } from '@/components/agents/agent-delete-button';
import { AgentForm } from '@/components/agents/agent-form';
import { AgentStatusActions } from '@/components/agents/agent-status-actions';
import { DemoBanner } from '@/components/dashboard/demo-banner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { isSupabaseConfigured } from '@/lib/env';
import { demoAgents } from '@/lib/demo-data';
import { getActiveOrganization } from '@/lib/server/organizations';
import { getMyAgent } from '@/lib/server/agents';

export const dynamic = 'force-dynamic';

const NOTICE_BY_ERROR: Record<string, string> = {
  nao_configurado:
    'Supabase não configurado — a operação não foi executada nem simulada. Ver apps/web/.env.example.',
  transicao_invalida: 'Transição de estado inválida para este agente.',
  sem_permissao: 'Não tens permissão para eliminar agentes (apenas owners e admins).',
  atualizacao_falhou: 'Não foi possível atualizar o agente. Tenta novamente.',
  eliminacao_falhou: 'Não foi possível eliminar o agente. Tenta novamente.',
};

type SearchParams = Promise<{ created?: string; status?: string; error?: string }>;

function resolveNotice(query: Awaited<SearchParams>) {
  if (query.created) {
    return { type: 'success' as const, message: 'Agente criado em rascunho. Revê a configuração antes de publicar.' };
  }
  if (query.status === 'updated') {
    return { type: 'success' as const, message: 'Estado do agente atualizado.' };
  }
  if (query.error) {
    return {
      type: 'error' as const,
      message: NOTICE_BY_ERROR[query.error] ?? 'Ocorreu um erro. Tenta novamente.',
    };
  }
  return null;
}

function NoticeBanner({ notice }: { notice: ReturnType<typeof resolveNotice> }) {
  if (!notice) return null;
  return (
    <p
      role={notice.type === 'error' ? 'alert' : 'status'}
      className={
        notice.type === 'error'
          ? 'rounded-xl border border-danger/40 bg-danger-soft px-3.5 py-2.5 text-xs font-medium text-danger-text'
          : 'rounded-xl border border-success/40 bg-success-soft px-3.5 py-2.5 text-xs font-medium text-success-text'
      }
    >
      {notice.message}
    </p>
  );
}

/** Detalhe e edição de agente — Agent Studio. Leitura/escrita por RLS. */
export default async function AgentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const query = await searchParams;
  const notice = resolveNotice(query);

  if (!isSupabaseConfigured()) {
    const demo = demoAgents.find((agent) => agent.id === id);
    if (!demo) notFound();

    return (
      <div className="space-y-6">
        <PageHeader
          title={demo.name}
          description="Agente de demonstração — leitura apenas."
        >
          <div className="flex items-center gap-2">
            <StatusBadge status={demo.status} kind="agent" />
          </div>
        </PageHeader>

        <DemoBanner />

        <p
          role="status"
          className="flex items-start gap-2 rounded-xl border border-accent/40 bg-soft-blue px-3.5 py-2.5 text-xs font-medium text-primary"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            <strong>Dados de demonstração não são editáveis.</strong> Configura o Supabase
            (apps/web/.env.local) para criar e gerir agentes reais.
          </span>
        </p>

        <Card>
          <CardHeader>
            <CardTitle>Configuração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-small">
            <p>
              <span className="font-medium text-text">Descrição:</span>{' '}
              <span className="text-muted">{demo.description ?? 'Sem descrição.'}</span>
            </p>
            <p>
              <span className="font-medium text-text">Idioma:</span>{' '}
              <span className="text-muted">{demo.language}</span>
            </p>
            <p>
              <span className="font-medium text-text">Estado:</span>{' '}
              <span className="text-muted">{agentStatusLabel(demo.status)}</span>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const agent = await getMyAgent(id);
  if (!agent) notFound();

  const organization = await getActiveOrganization();
  const permissions = agentPermissions(organization?.role ?? null);

  return (
    <div className="space-y-6">
      <PageHeader
        title={agent.name}
        description={`Estado: ${agentStatusLabel(agent.status)} · Atualizado em ${new Date(agent.updatedAt).toLocaleDateString('pt-PT')}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={agent.status as AgentStatus} kind="agent" />
          <AgentStatusActions id={agent.id} status={agent.status} />
          {permissions.canDelete ? <AgentDeleteButton id={agent.id} name={agent.name} /> : null}
        </div>
      </PageHeader>

      <NoticeBanner notice={notice} />

      <Card>
        <CardHeader>
          <CardTitle>Editar agente</CardTitle>
        </CardHeader>
        <CardContent>
          <AgentForm
            mode="edit"
            agent={{
              id: agent.id,
              name: agent.name,
              description: agent.description,
              instructions: agent.instructions,
              language: agent.language,
              voiceConfig: agent.voiceConfig,
            }}
          />
        </CardContent>
      </Card>

      <p className="text-caption text-muted">
        As chamadas associadas a este agente são retidas no histórico, mesmo após eliminação do
        agente.
      </p>
    </div>
  );
}
