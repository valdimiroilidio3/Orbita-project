import type { CallStatus } from './domain';

/**
 * Motor de voz — tipos e regras puras do ciclo de vida (domínio interno).
 *
 * Estes tipos são NEUTROS em relação ao fornecedor: cada adaptador de
 * telefonia/voz mapeia os eventos reais do fornecedor para estes tipos.
 * Nunca expor contratos de fornecedor no modelo de domínio.
 */

/** Eventos de ciclo de vida do domínio (mapeados a partir dos eventos do fornecedor). */
export const CALL_LIFECYCLE_EVENT_TYPES = [
  'call.received',
  'call.ringing',
  'call.answered',
  'call.ended',
  'call.failed',
  'call.busy',
  'call.no_answer',
  'call.cancelled',
] as const;

export type CallLifecycleEventType = (typeof CALL_LIFECYCLE_EVENT_TYPES)[number];

export function isCallLifecycleEventType(value: string): value is CallLifecycleEventType {
  return (CALL_LIFECYCLE_EVENT_TYPES as readonly string[]).includes(value);
}

/** Evento de ciclo de vida normalizado (após validação do webhook). */
export interface CallLifecycleEvent {
  type: CallLifecycleEventType;
  /** Momento em que o evento ocorreu no fornecedor (nunca o de processamento). */
  occurredAt: string;
  /** Identificador único do evento no fornecedor (deduplicação). */
  providerEventId: string;
  /** Código de falha sanitizado, quando aplicável. */
  failureCode?: string | null;
  /** Razão de falha sanitizada (sem segredos, sem payload integral). */
  failureReason?: string | null;
  /** ID da sessão de voz associada, quando conhecido. */
  voiceSessionId?: string | null;
}

/** Estado alvo de cada evento de ciclo de vida. */
export const LIFECYCLE_EVENT_TARGET_STATUS: Record<CallLifecycleEventType, CallStatus> = {
  'call.received': 'queued',
  'call.ringing': 'ringing',
  'call.answered': 'in_progress',
  'call.ended': 'completed',
  'call.failed': 'failed',
  'call.busy': 'busy',
  'call.no_answer': 'no_answer',
  'call.cancelled': 'cancelled',
};

export type LifecycleApplyResult =
  | { kind: 'applied'; status: CallStatus }
  | {
      kind: 'noop';
      reason: 'late_event' | 'terminal_immutable' | 'invalid_transition' | 'stale_event';
    };

/**
 * Aplica um evento de ciclo de vida ao estado atual de forma MONOTÓNICA:
 *
 * - eventos FORA DE ORDEM nunca fazem a chamada regredir de estado;
 * - estados terminais são imutáveis (repetições → noop idempotente);
 * - `occurredAt` anterior ao último aplicado é ignorado (stale_event);
 * - transições inválidas pela máquina de estados → noop (nunca corrompem).
 */
export function applyLifecycleEvent(
  current: CallStatus,
  event: CallLifecycleEvent,
  lastOccurredAt: string | null,
  isValidTransition: (from: CallStatus, to: CallStatus) => boolean,
): LifecycleApplyResult {
  const target = LIFECYCLE_EVENT_TARGET_STATUS[event.type];

  if (target === current) {
    return { kind: 'noop', reason: 'late_event' };
  }

  if (lastOccurredAt !== null && event.occurredAt < lastOccurredAt) {
    return { kind: 'noop', reason: 'stale_event' };
  }

  if (!isValidTransition(current, target)) {
    // Inclui estados terminais (imutáveis) e regressões proibidas.
    return {
      kind: 'noop',
      reason: target === current ? 'late_event' : 'invalid_transition',
    };
  }

  return { kind: 'applied', status: target };
}

/**
 * Metadados técnicos de eventos: apenas chaves estritamente necessárias,
 * com limite de tamanho. Nunca áudio, transcrições completas nem payloads
 * integrais do fornecedor.
 */
export const CALL_EVENT_METADATA_MAX_BYTES = 2048;

export const CALL_EVENT_METADATA_ALLOWED_KEYS = [
  'attempt',
  'duration_ms',
  'reason',
  'codec',
  'sip_code',
  'session_id',
  'error_code',
] as const;

export type CallEventMetadataKey = (typeof CALL_EVENT_METADATA_ALLOWED_KEYS)[number];

/**
 * Sanitiza metadados de evento: mantém apenas chaves permitidas, valores
 * escalares curtos; rejeita objetos/arrays e strings excessivas.
 */
export function sanitizeCallEventMetadata(
  input: Record<string, unknown> | null | undefined,
): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};
  if (!input || typeof input !== 'object') return result;

  for (const key of CALL_EVENT_METADATA_ALLOWED_KEYS) {
    const value = input[key];
    if (typeof value === 'string') {
      result[key] = value.slice(0, 256);
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      result[key] = value;
    } else if (typeof value === 'boolean') {
      result[key] = value;
    }
  }
  return result;
}
