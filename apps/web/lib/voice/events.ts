import {
  sanitizeCallEventMetadata,
  type CallEvent,
  type CallLifecycleEvent,
} from '@orbita/shared';

import type { VoiceErrorCode, VoiceIntegrationError } from '@/lib/voice/contracts';

/**
 * CallEventService — validação, deduplicação e persistência de eventos
 * (PROMPT 07 §5/§9).
 *
 * A deduplicação persistente usa a unicidade `(provider, provider_event_id)`
 * (migração 0004): inserções repetidas do mesmo evento são ignoradas.
 * A escrita é feita pelo servidor (service role) — nunca por cliente.
 */

export interface CallEventRowInput {
  organizationId: string;
  callId: string;
  provider: string;
  event: CallLifecycleEvent;
}

export type CallEventInsert =
  | {
      kind: 'insert';
      organization_id: string;
      call_id: string;
      provider: string;
      provider_event_id: string;
      event_type: string;
      occurred_at: string;
      metadata: Record<string, string | number | boolean>;
    }
  | { kind: 'duplicate' }
  | { kind: 'rejected'; code: VoiceErrorCode; detail: string };

/** Constrói a linha a inserir (ou sinaliza duplicado/inválido) — puro. */
export function buildCallEventInsert(input: CallEventRowInput): CallEventInsert {
  const { event } = input;

  if (!event.providerEventId || event.providerEventId.length > 128) {
    return { kind: 'rejected', code: 'invalid_payload', detail: 'provider_event_id inválido' };
  }

  const occurredAt = new Date(event.occurredAt);
  if (!Number.isFinite(occurredAt.getTime())) {
    return { kind: 'rejected', code: 'invalid_payload', detail: 'occurred_at inválido' };
  }

  return {
    kind: 'insert',
    organization_id: input.organizationId,
    call_id: input.callId,
    provider: input.provider.slice(0, 64),
    provider_event_id: event.providerEventId,
    event_type: event.type,
    occurred_at: event.occurredAt,
    metadata: sanitizeCallEventMetadata({
      reason: event.failureReason ?? undefined,
      error_code: event.failureCode ?? undefined,
      session_id: event.voiceSessionId ?? undefined,
    }),
  };
}

/** Conflito de unicidade do Postgres (deduplicação persistente). */
export function isDuplicateEventError(error: { code?: string | null }): boolean {
  return error.code === '23505';
}

/** Metadados persistidos → forma de domínio (para UI/tests). */
export function callEventFromRow(row: {
  id: string;
  organization_id: string;
  call_id: string;
  provider: string;
  provider_event_id: string;
  event_type: string;
  occurred_at: string;
  processed_at: string;
  metadata: Record<string, unknown>;
}): CallEvent {
  return {
    id: row.id,
    organizationId: row.organization_id,
    callId: row.call_id,
    provider: row.provider,
    providerEventId: row.provider_event_id,
    eventType: row.event_type,
    occurredAt: row.occurred_at,
    processedAt: row.processed_at,
    metadata: sanitizeCallEventMetadata(row.metadata),
  };
}

export function isVoiceIntegrationError(error: unknown): error is VoiceIntegrationError {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as VoiceIntegrationError).name === 'VoiceIntegrationError'
  );
}
