import { Activity, AlertTriangle, CheckCircle2, HelpCircle, Plug, XCircle } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { deriveVoiceDiagnostics, type VoiceDiagnosticsState } from '@/lib/voice/diagnostics';
import { readVoiceEnv } from '@/lib/voice/env';
import { isVoiceIntegrationImplemented } from '@/lib/voice/adapters';
import { cn } from '@/lib/utils';

const STATE_STYLE: Record<VoiceDiagnosticsState, { icon: typeof Plug; className: string }> = {
  nao_configurado: { icon: HelpCircle, className: 'text-muted' },
  falha_configuracao: { icon: XCircle, className: 'text-danger-text' },
  configurado_nao_testado: { icon: AlertTriangle, className: 'text-warning-text' },
  pronto_para_teste: { icon: Plug, className: 'text-primary' },
  ligacao_verificada: { icon: CheckCircle2, className: 'text-success-text' },
  indisponivel: { icon: XCircle, className: 'text-danger-text' },
};

/**
 * Área de diagnóstico do motor de voz (PROMPT 07 §11).
 * Estados reais derivados de configuração e registos — nunca indicadores
 * falsos de ligação, áudio ou atividade.
 */
export function VoiceDiagnosticsPanel() {
  const envFacts = readVoiceEnv();
  const integrationImplemented = isVoiceIntegrationImplemented();

  // "Ligação verificada" só com teste real documentado — nesta fase não há
  // chamadas reais (ver docs/voice-testing.md), logo `hasVerifiedRealCall` é
  // derivado no endpoint autenticado; no servidor de páginas assumimos false
  // quando a integração está pendente (sem chamadas reais possíveis).
  const diagnostics = deriveVoiceDiagnostics({
    envPresent: envFacts.envPresent,
    envValid: envFacts.envValid,
    integrationImplemented,
    providerCheck: null,
    hasVerifiedRealCall: false,
  });

  const { icon: Icon, className } = STATE_STYLE[diagnostics.state];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-4.5 w-4.5 text-primary" aria-hidden />
          Motor de voz — diagnóstico
        </CardTitle>
        <CardDescription>
          Estado técnico da integração de voz/telefonia. Não confundir com o estado dos agentes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="flex items-start gap-2.5">
          <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', className)} aria-hidden />
          <span>
            <span className="block text-small font-semibold text-text">{diagnostics.label}</span>
            <span className="block text-caption text-muted">{diagnostics.detail}</span>
          </span>
        </p>

        <dl className="grid gap-2 text-caption sm:grid-cols-2">
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
            <dt className="text-muted">Fornecedor de voz</dt>
            <dd>
              <Badge variant="outline">{envFacts.voiceProvider ?? 'não selecionado'}</Badge>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
            <dt className="text-muted">Fornecedor de telefonia</dt>
            <dd>
              <Badge variant="outline">{envFacts.telephonyProvider ?? 'não selecionado'}</Badge>
            </dd>
          </div>
        </dl>

        {envFacts.missing.length > 0 ? (
          <p className="text-caption text-danger-text">
            Variáveis em falta: {envFacts.missing.join(', ')} — ver docs/voice-setup.md.
          </p>
        ) : null}
        {envFacts.invalid.length > 0 ? (
          <p className="text-caption text-danger-text">
            Variáveis inválidas: {envFacts.invalid.join(', ')} — ver docs/voice-setup.md.
          </p>
        ) : null}

        <p className="text-caption text-muted">
          Estados possíveis: não configurado · configurado, mas não testado · pronto para teste ·
          ligação verificada · falha de configuração · indisponível. «Ligação verificada» só surge
          depois de um teste real bem-sucedido documentado.
        </p>
      </CardContent>
    </Card>
  );
}
