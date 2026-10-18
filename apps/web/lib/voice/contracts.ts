import type { CallLifecycleEvent, CallStatus, VoiceConfigInput } from '@orbita/shared';

/**
 * Contratos do motor de voz (PROMPT 07 §4).
 *
 * Camadas separadas:
 *   • contratos (aqui) — interfaces neutras do fornecedor;
 *   • serviços (lifecycle/events/webhooks/config) — lógica de negócio;
 *   • adaptadores (adapters/) — implementações de fornecedor;
 *   • persistência — Supabase (RLS; webhooks usam service role no servidor).
 *
 * Os contratos de fornecedor NUNCA contaminam componentes React nem o
 * modelo de domínio: cada adaptador mapeia payloads externos para os tipos
 * internos (`CallLifecycleEvent`, etc.).
 */

/* ── Erros tipados ─────────────────────────────────────────── */

export type VoiceErrorCode =
  | 'integration_not_configured'
  | 'invalid_signature'
  | 'invalid_payload'
  | 'payload_too_large'
  | 'replay_detected'
  | 'rate_limited'
  | 'agent_not_ready'
  | 'session_failed'
  | 'provider_unavailable'
  | 'persistence_failed';

export class VoiceIntegrationError extends Error {
  readonly code: VoiceErrorCode;

  constructor(code: VoiceErrorCode, message: string) {
    super(message);
    this.name = 'VoiceIntegrationError';
    this.code = code;
  }
}

/** Resposta HTTP sugerida por código de erro (webhooks). */
export const VOICE_ERROR_HTTP_STATUS: Record<VoiceErrorCode, number> = {
  integration_not_configured: 503,
  invalid_signature: 401,
  invalid_payload: 400,
  payload_too_large: 413,
  replay_detected: 409,
  rate_limited: 429,
  agent_not_ready: 422,
  session_failed: 502,
  provider_unavailable: 503,
  persistence_failed: 500,
};

/* ── Configuração de sessão de voz (após validação) ─────────── */

export interface VoiceSessionConfig {
  /** Nome apresentado ao interlocutor. */
  displayName: string;
  /** Instruções de sistema validadas (entrada não confiável é do interlocutor, não estas). */
  systemInstructions: string;
  language: string;
  /** Voz suportada pelo fornecedor (validada no adaptador). */
  voice: string | null;
  greeting: string | null;
  /** Política de interrupções. */
  interruptions: 'allow' | 'deny';
  /** Limite de duração da chamada em segundos, quando configurável. */
  maxDurationSeconds: number | null;
}

export interface VoiceReadinessConfig {
  voiceConfig: VoiceConfigInput;
  language: string;
  instructions: string;
  name: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
}

export type VoiceConfigResolution =
  | { ok: true; config: VoiceSessionConfig }
  | {
      ok: false;
      reason:
        | 'agent_inactive'
        | 'agent_paused'
        | 'agent_archived'
        | 'invalid_voice_config'
        | 'missing_voice';
    };

/* ── VoiceProvider — fornecedor de voz em tempo real ─────────── */

export interface VoiceSessionHandle {
  voiceSessionId: string;
  provider: string;
}

export interface VoiceProvider {
  readonly name: string;
  /** Cria a sessão de voz para uma chamada (config já validada). */
  startSession(params: {
    callRef: { callId: string; providerCallId: string | null };
    config: VoiceSessionConfig;
  }): Promise<VoiceSessionHandle>;
  /** Termina a sessão e liberta recursos (idempotente). */
  endSession(voiceSessionId: string): Promise<void>;
  /** Prontidão técnica do fornecedor (credenciais presentes e aceites). */
  checkReadiness(): Promise<{ ready: boolean; detail: string }>;
}

/* ── TelephonyProvider — fornecedor telefónico ──────────────── */

/** Informação normalizada de uma chamada recebida (webhook de entrada). */
export interface InboundCallInfo {
  providerCallId: string;
  /** Número de entrada atribuído à plataforma (resolve agente). */
  inboundNumber: string;
  fromNumber: string | null;
  occurredAt: string;
  providerEventId: string;
}

export interface TelephonyProvider {
  readonly name: string;
  /** Verifica a assinatura oficial do webhook (entrada não confiável). */
  verifyWebhookSignature(params: {
    rawBody: string;
    headers: Record<string, string>;
    secret: string;
  }): boolean;
  /** Analisa e normaliza um webhook de chamada recebida. */
  parseInboundWebhook(rawBody: string): InboundCallInfo;
  /** Analisa e normaliza um webhook de estado → evento de ciclo de vida. */
  parseStatusWebhook(rawBody: string): CallLifecycleEvent & { callRef: string };
  /** Estado operacional do fornecedor (conta/credenciais), sem segredos. */
  checkReadiness(): Promise<{ ready: boolean; detail: string }>;
}

/* ── Serviços (contratos) ───────────────────────────────────── */

export interface CallLifecycleSnapshot {
  callId: string;
  status: CallStatus;
  lastOccurredAt: string | null;
}

export type CallLifecycleApplyOutcome =
  | {
      kind: 'applied';
      status: CallStatus;
      patch: {
        status: CallStatus;
        answeredAt?: string | null;
        endedAt?: string | null;
        durationSeconds?: number | null;
        failureCode?: string | null;
        failureReason?: string | null;
        voiceSessionId?: string | null;
      };
    }
  | { kind: 'noop'; reason: string };
