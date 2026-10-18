import { AlertTriangle, AudioLines, CheckCircle2, Phone } from 'lucide-react';

import {
  VOICE_CONFIG_STATUS_LABELS,
  voiceConfigStatus,
} from '@/lib/voice/config';
import type { VoiceConfigInput } from '@orbita/shared';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isSupabaseConfigured } from '@/lib/env';

export interface AgentVoicePanelProps {
  agent: {
    name: string;
    language: string;
    instructions: string;
    status: 'draft' | 'active' | 'paused' | 'archived';
    voiceConfig: VoiceConfigInput;
    inboundPhoneNumber: string | null;
  };
  /** Estado de telefonia separado do estado do agente (PROMPT 07 §11). */
  telephonyState: { label: string; detail: string };
}

/**
 * Estado da configuração de voz do agente (Agent Studio — PROMPT 07 §11):
 * voz, idioma, prontidão técnica e avisos — SEMPRE separado do estado de
 * telefonia (o `active` do agente não implica telefonia operacional).
 */
export function AgentVoicePanel({ agent, telephonyState }: AgentVoicePanelProps) {
  const status = voiceConfigStatus({
    name: agent.name,
    language: agent.language,
    instructions: agent.instructions,
    status: agent.status,
    voiceConfig: agent.voiceConfig,
  });

  const isValid = status === 'valid';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AudioLines className="h-4.5 w-4.5 text-primary" aria-hidden />
          Voz e telefonia
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={isValid ? 'success' : 'warning'}>
            {isValid ? (
              <CheckCircle2 className="h-3 w-3" aria-hidden />
            ) : (
              <AlertTriangle className="h-3 w-3" aria-hidden />
            )}
            {VOICE_CONFIG_STATUS_LABELS[status]}
          </Badge>
          <Badge variant="outline">Idioma: {agent.language}</Badge>
          <Badge variant="outline">Voz: {agent.voiceConfig.voiceId ?? 'não selecionada'}</Badge>
          {agent.voiceConfig.greeting ? <Badge variant="outline">Saudação definida</Badge> : null}
        </div>

        {!isValid ? (
          <p className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning-soft px-3.5 py-2.5 text-caption text-warning-text">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {VOICE_CONFIG_STATUS_LABELS[status]}. Sem configuração válida, o motor de voz recusa
            novas sessões com este agente (comportamento documentado em docs/voice-architecture.md).
          </p>
        ) : null}

        <dl className="grid gap-2 text-caption sm:grid-cols-2">
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
            <dt className="text-muted">Estado do agente</dt>
            <dd className="font-medium text-text">{agent.status}</dd>
          </div>
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
            <dt className="text-muted">Estado da telefonia</dt>
            <dd className="font-medium text-text">{telephonyState.label}</dd>
          </div>
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
            <dt className="text-muted">Número de entrada</dt>
            <dd className="inline-flex items-center gap-1.5 font-medium text-text">
              <Phone className="h-3.5 w-3.5" aria-hidden />
              {agent.inboundPhoneNumber ?? 'não associado'}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
            <dt className="text-muted">Fornecedor configurado</dt>
            <dd className="font-medium text-text">
              {isSupabaseConfigured() ? 'ver Definições → diagnóstico' : 'não configurado'}
            </dd>
          </div>
        </dl>

        <p className="text-caption text-muted">
          O estado «ativo» significa apenas que a configuração está ativa na plataforma — não que a
          telefonia ou o motor de voz estejam operacionais.
        </p>
      </CardContent>
    </Card>
  );
}
