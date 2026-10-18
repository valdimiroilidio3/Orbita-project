import { BarChart3 } from 'lucide-react';

import {
  CALL_DIRECTION_LABELS,
  CALL_STATUS_LABELS,
  formatDuration,
  type CallDirection,
  type CallStatus,
} from '@orbita/shared';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { isSupabaseConfigured } from '@/lib/env';
import { getActiveOrganization } from '@/lib/server/organizations';
import { requireUser } from '@/lib/server/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Analytics',
};

const WINDOW_DAYS = 30;

/** Início da janela de análise (função separada — regra react-hooks/purity). */
function windowStartIso(): string {
  return new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

interface CallAggRow {
  status: CallStatus;
  direction: CallDirection;
  duration_seconds: number | null;
  provider: string;
}

/**
 * Agregações REAIS dos últimos 30 dias (contagens por estado/direção, duração
 * média de chamadas concluídas). Sem Supabase não há dados — nenhum valor é
 * inventado. Métricas de áudio/latência: «não medidas».
 */
export default async function AnalyticsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="space-y-6">
        <PageHeader title="Analytics" description="Métricas reais de chamadas e agentes." />
        <EmptyState
          icon={BarChart3}
          title="Analytics indisponível"
          description="Supabase não configurado — as métricas são calculadas apenas a partir de dados reais da organização."
        />
      </div>
    );
  }

  await requireUser();
  const organization = await getActiveOrganization();
  if (!organization) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Sem organização ativa"
        description="Conclui o onboarding."
      />
    );
  }

  const since = windowStartIso();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('calls')
    .select('status, direction, duration_seconds, provider')
    .eq('organization_id', organization.id)
    .gte('created_at', since)
    .limit(5000);

  if (error) {
    throw new Error(`Não foi possível carregar métricas: ${error.message}`);
  }

  const rows = (data ?? []) as CallAggRow[];
  const byStatus = new Map<CallStatus, number>();
  const byDirection = new Map<CallDirection, number>();
  let completedDuration = 0;
  let completedCount = 0;
  let simulated = 0;

  for (const row of rows) {
    byStatus.set(row.status, (byStatus.get(row.status) ?? 0) + 1);
    byDirection.set(row.direction, (byDirection.get(row.direction) ?? 0) + 1);
    if (row.provider === 'simulado') simulated += 1;
    if (row.status === 'completed' && row.duration_seconds != null) {
      completedDuration += row.duration_seconds;
      completedCount += 1;
    }
  }

  const total = rows.length;
  const successRate =
    total > 0 ? Math.round(((byStatus.get('completed') ?? 0) / total) * 100) : null;
  const averageDuration =
    completedCount > 0 ? Math.round(completedDuration / completedCount) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description={`Métricas calculadas a partir das chamadas reais da organização nos últimos ${WINDOW_DAYS} dias.`}
      >
        {simulated > 0 ? (
          <Badge variant="warning">{simulated} chamada(s) do simulador incluídas</Badge>
        ) : null}
      </PageHeader>

      {total === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Ainda sem chamadas neste período"
          description="As métricas aparecem assim que existirem chamadas registadas."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardDescription>Chamadas ({WINDOW_DAYS} dias)</CardDescription>
                <CardTitle className="text-h2 tabular-nums">{total}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Taxa de conclusão</CardDescription>
                <CardTitle className="text-h2 tabular-nums">
                  {successRate === null ? '—' : `${successRate}%`}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Duração média (concluídas)</CardDescription>
                <CardTitle className="text-h2 tabular-nums">
                  {averageDuration === null ? '—' : formatDuration(averageDuration)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Por estado</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2">
                  {[...byStatus.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between gap-3">
                        <dt className="text-small">{CALL_STATUS_LABELS[status]}</dt>
                        <dd className="flex items-center gap-3">
                          <span
                            className="h-2 rounded-full bg-primary/70"
                            style={{ width: `${Math.max(8, Math.round((count / total) * 160))}px` }}
                            aria-hidden
                          />
                          <span className="w-10 text-right text-small tabular-nums">{count}</span>
                        </dd>
                      </div>
                    ))}
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Por direção</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2">
                  {[...byDirection.entries()].map(([direction, count]) => (
                    <div key={direction} className="flex items-center justify-between gap-3">
                      <dt className="text-small">{CALL_DIRECTION_LABELS[direction]}</dt>
                      <dd className="text-small tabular-nums">{count}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-4 text-caption text-muted">
                  Latência de áudio, interrupções e qualidade de voz: <strong>não medidas</strong>{' '}
                  (sem fornecedor de voz ativo).
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
