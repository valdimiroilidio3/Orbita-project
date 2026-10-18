import { FlaskConical } from 'lucide-react';
import { notFound } from 'next/navigation';

import {
  CALL_DIRECTION_LABELS,
  CALL_STATUS_LABELS,
  formatCurrency,
  formatDateTime,
  formatDuration,
} from '@orbita/shared';

import { CallControls } from '@/components/calls/call-controls';
import { CallTimeline } from '@/components/calls/call-timeline';
import { DemoBanner } from '@/components/dashboard/demo-banner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { isSupabaseConfigured } from '@/lib/env';
import { isSimulatedProvider } from '@/lib/calls';
import { demoCalls } from '@/lib/demo-data';
import { getMyCall } from '@/lib/server/calls';

export const dynamic = 'force-dynamic';

const NOTICE_BY_ERROR: Record<string, string> = {
  nao_configurado:
    'Supabase não configurado — a operação não foi executada nem simulada. Ver apps/web/.env.example.',
  nao_encontrado: 'Chamada não encontrada na tua organização.',
  transicao_invalida: 'Transição de estado inválida para esta chamada.',
  atualizacao_falhou: 'Não foi possível atualizar a chamada. Tenta novamente.',
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-2 last:border-b-0">
      <dt className="text-caption text-muted">{label}</dt>
      <dd className="text-right text-small text-text">{value}</dd>
    </div>
  );
}

/** Detalhe de chamada — motor de chamadas (simulador local). */
export default async function CallDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ started?: string; status?: string; error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;

  const notice = query.error
    ? {
        type: 'error' as const,
        message: NOTICE_BY_ERROR[query.error] ?? 'Ocorreu um erro. Tenta novamente.',
      }
    : query.started
      ? { type: 'success' as const, message: 'Chamada iniciada (simulada). Termina quando quiseres.' }
      : query.status === 'updated'
        ? { type: 'success' as const, message: 'Chamada atualizada.' }
        : null;

  if (!isSupabaseConfigured()) {
    const demo = demoCalls.find((call) => call.id === id);
    if (!demo) notFound();

    return (
      <div className="space-y-6">
        <PageHeader title={`Chamada ${demo.toNumber ?? ''}`.trim()} description="Chamada de demonstração — leitura apenas.">
          <StatusBadge status={demo.status} kind="call" />
        </PageHeader>

        <DemoBanner />

        <Card>
          <CardHeader>
            <CardTitle>Detalhes</CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <DetailRow label="Direção" value={CALL_DIRECTION_LABELS[demo.direction]} />
              <DetailRow label="Agente" value={<span className="inline-flex items-center gap-2">{demo.agentName}<Badge variant="accent">Demo</Badge></span>} />
              <DetailRow label="Destino" value={demo.toNumber ?? '—'} />
              <DetailRow label="Origem" value={demo.fromNumber ?? '—'} />
              <DetailRow label="Estado" value={CALL_STATUS_LABELS[demo.status]} />
              <DetailRow label="Início" value={formatDateTime(demo.startedAt)} />
              <DetailRow label="Duração" value={formatDuration(demo.durationSeconds)} />
              <DetailRow label="Custo estimado" value={formatCurrency(demo.estimatedCost, demo.currency)} />
            </dl>
          </CardContent>
        </Card>
      </div>
    );
  }

  const call = await getMyCall(id);
  if (!call) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Chamada ${call.toNumber ?? ''}`.trim()}
        description={`${CALL_DIRECTION_LABELS[call.direction]} · ${call.agentName ?? 'Sem agente'} · iniciada ${formatDateTime(call.startedAt)}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={call.status} kind="call" />
          {isSimulatedProvider(call.provider) ? (
            <Badge variant="accent">
              <FlaskConical className="h-3 w-3" aria-hidden />
              Simulada
            </Badge>
          ) : null}
          <CallControls id={call.id} status={call.status} />
        </div>
      </PageHeader>

      {notice ? (
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
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Ciclo de vida</CardTitle>
        </CardHeader>
        <CardContent>
          <CallTimeline status={call.status} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalhes</CardTitle>
        </CardHeader>
        <CardContent>
          <dl>
            <DetailRow label="Direção" value={CALL_DIRECTION_LABELS[call.direction]} />
            <DetailRow
              label="Agente"
              value={call.agentName ?? '— (agente eliminado — histórico retido)'}
            />
            <DetailRow label="Destino" value={call.toNumber ?? '—'} />
            <DetailRow label="Origem" value={call.fromNumber ?? '—'} />
            <DetailRow label="Estado" value={CALL_STATUS_LABELS[call.status]} />
            <DetailRow label="Fornecedor" value={call.provider ?? '—'} />
            <DetailRow label="ID do fornecedor" value={<span className="font-mono text-caption">{call.providerCallId ?? '—'}</span>} />
            <DetailRow label="Início" value={formatDateTime(call.startedAt)} />
            <DetailRow label="Fim" value={formatDateTime(call.endedAt)} />
            <DetailRow label="Duração" value={formatDuration(call.durationSeconds)} />
            <DetailRow label="Custo estimado" value={formatCurrency(call.estimatedCost, call.currency)} />
          </dl>
          {isSimulatedProvider(call.provider) ? (
            <p className="mt-3 text-caption text-muted">
              Chamada criada pelo simulador local — não houve telefonia real. O custo é uma
              estimativa do simulador (0,02 €/min).
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
