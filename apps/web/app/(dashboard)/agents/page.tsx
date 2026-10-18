import { isSupabaseConfigured } from '@/lib/env';
import { toAgentSummary } from '@/lib/agents';
import { AgentsList } from '@/components/agents/agents-list';
import { demoAgents } from '@/lib/demo-data';
import { listMyAgents } from '@/lib/server/agents';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Agentes',
};

const NOTICE_BY_ERROR: Record<string, string> = {
  nao_encontrado: 'Agente não encontrado na tua organização.',
  nao_configurado:
    'Supabase não configurado — a operação não foi executada nem simulada. Ver apps/web/.env.example.',
  transicao_invalida: 'Transição de estado inválida para este agente.',
  sem_permissao: 'Não tens permissão para eliminar agentes (apenas owners e admins).',
  atualizacao_falhou: 'Não foi possível atualizar o agente. Tenta novamente.',
  eliminacao_falhou: 'Não foi possível eliminar o agente. Tenta novamente.',
};

/** Listagem de agentes — dados reais (org da sessão) ou demonstração rotulada. */
export default async function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; error?: string }>;
}) {
  const params = await searchParams;

  const notice = params.deleted
    ? {
        type: 'success' as const,
        message: 'Agente eliminado. O histórico de chamadas foi retido.',
      }
    : params.error
      ? {
          type: 'error' as const,
          message: NOTICE_BY_ERROR[params.error] ?? 'Ocorreu um erro. Tenta novamente.',
        }
      : null;

  if (!isSupabaseConfigured()) {
    return (
      <AgentsList agents={demoAgents.map(toAgentSummary)} demoMode canCreate notice={notice} />
    );
  }

  const { agents } = await listMyAgents({ limit: 50 });

  return (
    <AgentsList agents={agents.map(toAgentSummary)} demoMode={false} canCreate notice={notice} />
  );
}
