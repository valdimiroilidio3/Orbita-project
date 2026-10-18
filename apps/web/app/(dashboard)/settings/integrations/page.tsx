import { AlertTriangle, CheckCircle2, CircleDashed, XCircle } from 'lucide-react';
import Link from 'next/link';

import { formatDateTime } from '@orbita/shared';

import { SettingsSection } from '@/components/settings/settings-section';
import { Badge } from '@/components/ui/badge';
import { buildIntegrationStatuses, type IntegrationState } from '@/lib/integrations/status';
import { probeSupabase, type ProbeResult } from '@/lib/server/settings';

export const metadata = { title: 'Integrações · Definições' };

/**
 * Estados apresentados (mapeados a partir de `IntegrationState` + sonda real):
 *  not_configured → «Não configurada»
 *  configured_untested → «Configurada» (presença de variáveis, sem verificação)
 *  available + sonda OK → «Ligada e verificada»
 *  available + sonda falha → «Erro de ligação»
 *  available sem sonda → «Configurada» (nunca «ligada» só por existir chave)
 *  not_implemented → «Funcionalidade não disponível»
 * «A verificar» só existe durante uma verificação em curso (não aplicável em SSR).
 */
type DisplayState = 'not_configured' | 'configured' | 'verified' | 'error' | 'unavailable';

const DISPLAY: Record<
  DisplayState,
  {
    label: string;
    variant: 'success' | 'warning' | 'neutral' | 'danger';
    icon: typeof CheckCircle2;
  }
> = {
  not_configured: { label: 'Não configurada', variant: 'danger', icon: XCircle },
  configured: { label: 'Configurada (não verificada)', variant: 'warning', icon: AlertTriangle },
  verified: { label: 'Ligada e verificada', variant: 'success', icon: CheckCircle2 },
  error: { label: 'Erro de ligação', variant: 'danger', icon: XCircle },
  unavailable: { label: 'Funcionalidade não disponível', variant: 'neutral', icon: CircleDashed },
};

const REQUIREMENTS: Record<string, string[]> = {
  supabase: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'Migrações 0001–0006 aplicadas',
  ],
  service_role: ['SUPABASE_SERVICE_ROLE_KEY (apenas servidor)'],
  telephony: [
    'TELEPHONY_PROVIDER',
    'TELEPHONY_WEBHOOK_SECRET',
    'Teste real documentado (docs/voice-testing.md)',
  ],
  voice_ai: [
    'VOICE_PROVIDER',
    'Credenciais do fornecedor (servidor)',
    'Capacidades confirmadas na documentação oficial',
  ],
  booking: ['Adaptador de sistema de reservas externo (atualmente dev-adapter)'],
  billing: ['Integração de faturação (não implementada) — sem variáveis em uso'],
};

function toDisplay(state: IntegrationState, probe: ProbeResult | null): DisplayState {
  if (state === 'not_implemented') return 'unavailable';
  if (state === 'not_configured') return 'not_configured';
  if (state === 'configured_untested') return 'configured';
  if (probe?.state === 'verified') return 'verified';
  if (probe?.state === 'error') return 'error';
  return 'configured';
}

export default async function IntegrationsSettingsPage() {
  const integrations = buildIntegrationStatuses();
  const supabaseProbe = await probeSupabase();

  return (
    <>
      <div className="rounded-xl border border-border bg-surface px-4 py-3 text-caption text-muted">
        Uma chave presente no ambiente <strong>não</strong> significa «ligada». Só o Supabase é
        verificado em tempo real (leitura mínima sob a tua sessão). Nenhum segredo é mostrado nem
        devolvido; a atualização de credenciais faz-se nas variáveis de ambiente do servidor
        (docs/environment-variables.md).
      </div>

      <ul className="grid gap-4 md:grid-cols-2">
        {integrations.map((item) => {
          const probe = item.id === 'supabase' ? supabaseProbe : null;
          const display = toDisplay(item.state, probe);
          const meta = DISPLAY[display];
          const Icon = meta.icon;
          const lastCheck =
            probe && probe.state !== 'skipped'
              ? `${formatDateTime(probe.checkedAt)}${probe.state === 'verified' ? ` · ${probe.latencyMs} ms` : ''}`
              : 'Sem verificação operacional';
          return (
            <li key={item.id}>
              <SettingsSection
                title={item.name}
                description={item.description}
                badge={
                  <Badge variant={meta.variant}>
                    <Icon className="h-3 w-3" aria-hidden />
                    {meta.label}
                  </Badge>
                }
                className="h-full"
              >
                <p className="text-small text-muted">
                  {probe?.state === 'error' ? `Falha na verificação: ${probe.detail}` : item.detail}
                </p>
                <dl className="mt-3 space-y-2 text-caption">
                  <div>
                    <dt className="font-medium text-text">Requisitos</dt>
                    <dd>
                      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted">
                        {(REQUIREMENTS[item.id] ?? []).map((req) => (
                          <li key={req}>
                            <code className="font-mono">{req}</code>
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="font-medium text-text">Última verificação</dt>
                    <dd className="text-muted">{lastCheck}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {item.id === 'telephony' || item.id === 'voice_ai' ? (
                    <Link
                      href="/settings/voice"
                      className="text-caption font-medium text-primary hover:underline"
                    >
                      Diagnóstico de voz →
                    </Link>
                  ) : null}
                  {item.docs ? (
                    <span className="text-caption text-muted">
                      Configurar: <code className="font-mono">{item.docs}</code>
                    </span>
                  ) : null}
                </div>
              </SettingsSection>
            </li>
          );
        })}
      </ul>
    </>
  );
}
