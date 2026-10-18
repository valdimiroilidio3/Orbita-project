import { isSupabaseConfigured } from '@/lib/env';
import { CallsList } from '@/components/calls/calls-list';
import { demoCalls } from '@/lib/demo-data';
import type { CallRecord } from '@/lib/dashboard/types';
import { listMyCalls } from '@/lib/server/calls';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Chamadas',
};

const NOTICE_BY_ERROR: Record<string, string> = {
  nao_encontrado: 'Chamada não encontrada na tua organização.',
  nao_configurado:
    'Supabase não configurado — a operação não foi executada nem simulada. Ver apps/web/.env.example.',
  transicao_invalida: 'Transição de estado inválida para esta chamada.',
  atualizacao_falhou: 'Não foi possível atualizar a chamada. Tenta novamente.',
};

/** Chamadas de demonstração no formato da camada de dados (identificadas como demo). */
const demoRecords: CallRecord[] = demoCalls.map((call) => ({
  id: call.id,
  direction: call.direction,
  status: call.status,
  toNumber: call.toNumber,
  fromNumber: call.fromNumber,
  agentName: call.agentName,
  durationSeconds: call.durationSeconds,
  estimatedCost: call.estimatedCost,
  currency: call.currency,
  startedAt: call.startedAt,
  createdAt: call.createdAt,
  isDemo: true,
}));

/** Histórico de chamadas — dados reais (org da sessão) ou demonstração rotulada. */
export default async function CallsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const notice = params.error
    ? {
        type: 'error' as const,
        message: NOTICE_BY_ERROR[params.error] ?? 'Ocorreu um erro. Tenta novamente.',
      }
    : null;

  if (!isSupabaseConfigured()) {
    return <CallsList records={demoRecords} demoMode canStart={false} notice={notice} />;
  }

  const { calls } = await listMyCalls({ limit: 100 });

  const records: CallRecord[] = calls.map((call) => ({
    id: call.id,
    direction: call.direction,
    status: call.status,
    toNumber: call.toNumber,
    fromNumber: call.fromNumber,
    agentName: call.agentName,
    durationSeconds: call.durationSeconds,
    estimatedCost: call.estimatedCost,
    currency: call.currency,
    startedAt: call.startedAt,
    createdAt: call.createdAt,
    isDemo: false,
  }));

  return <CallsList records={records} demoMode={false} canStart notice={notice} />;
}
