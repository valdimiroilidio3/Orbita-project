import { BarChart3 } from 'lucide-react';

import { formatDateTime, formatDuration } from '@orbita/shared';

import {
  PendingNotice,
  SettingRow,
  SettingsSection,
  Unavailable,
} from '@/components/settings/settings-section';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { isSupabaseConfigured } from '@/lib/env';
import { getActiveOrganization } from '@/lib/server/organizations';
import { getOrganizationSettings, getUsageSummary } from '@/lib/server/settings';

export const metadata = { title: 'Utilização · Definições' };

const PERIOD_DAYS = 30;

export default async function UsageSettingsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Sem dados de utilização"
        description="Supabase não configurado. A utilização é calculada apenas a partir de chamadas reais da organização."
      />
    );
  }
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
  const [usage, settings] = await Promise.all([
    getUsageSummary(organization.id, PERIOD_DAYS),
    getOrganizationSettings(organization.id),
  ]);

  if (!usage) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Não foi possível calcular a utilização"
        description="Tenta novamente mais tarde."
      />
    );
  }

  const minutes = Math.round(usage.completedSeconds / 60);

  return (
    <>
      <SettingsSection
        title={`Utilização — últimos ${PERIOD_DAYS} dias`}
        description={`Período desde ${formatDateTime(usage.periodStart)}. Apenas chamadas registadas nesta organização.`}
        badge={
          usage.simulated > 0 ? (
            <Badge variant="warning">{usage.simulated} do simulador</Badge>
          ) : undefined
        }
      >
        {usage.totalCalls === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="Ainda sem chamadas neste período"
            description="Os valores aparecem assim que existirem chamadas registadas (reais ou do simulador, sempre identificadas)."
          />
        ) : (
          <>
            <SettingRow label="Chamadas recebidas" value={usage.inbound} />
            <SettingRow label="Chamadas efetuadas" value={usage.outbound} />
            <SettingRow
              label="Minutos consumidos (chamadas concluídas)"
              value={`${minutes} min (${formatDuration(usage.completedSeconds)})`}
            />
            <SettingRow
              label="Limite da organização por chamada"
              value={
                settings.max_call_duration_seconds ? (
                  formatDuration(settings.max_call_duration_seconds)
                ) : (
                  <Unavailable label="Sem limite definido" />
                )
              }
              hint="Definido em Voz e agentes."
            />
          </>
        )}
      </SettingsSection>

      {usage.perAgent.length > 0 ? (
        <SettingsSection title="Por agente" description="Chamadas e minutos por agente no período.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-small">
              <thead className="text-left text-caption font-semibold uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="py-2 pr-4">
                    Agente
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right">
                    Chamadas
                  </th>
                  <th scope="col" className="py-2 text-right">
                    Minutos
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {usage.perAgent.map((row) => (
                  <tr key={row.agentId ?? 'none'}>
                    <td className="py-2 pr-4 font-medium text-text">{row.name}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{row.calls}</td>
                    <td className="py-2 text-right tabular-nums">{Math.round(row.seconds / 60)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SettingsSection>
      ) : null}

      <SettingsSection
        title="Limites de plano e custos"
        description="Não inventamos limites nem custos."
      >
        <div className="space-y-2">
          <PendingNotice
            title="Limites de plano"
            requirement="integração de faturação com planos definidos — não existe."
          />
          <PendingNotice
            title="Custos e avisos de consumo"
            requirement="tarifas do fornecedor de telefonia/voz e faturação ligada."
          />
        </div>
      </SettingsSection>
    </>
  );
}
