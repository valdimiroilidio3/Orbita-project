import type { CallLifecycleEvent, CallStatus } from '@orbita/shared';

import {
  buildCallEventInsert,
  isDuplicateEventError,
  type CallEventInsert,
} from '@/lib/voice/events';
import { computeLifecyclePatch, type CallLifecycleState } from '@/lib/voice/lifecycle';
import { getSupabaseServiceClient } from '@/lib/supabase/service';
import { dispatchCallAutomations } from '@/lib/tools/call-triggers';
import type { InboundCallInfo } from '@/lib/voice/contracts';

/**
 * Ingestão de eventos de fornecedor (PROMPT 07 §6/§9).
 *
 * Executa SEMPRE no servidor com o cliente de serviço (caminho privilegiado
 * de sistema — ver docs/voice-security.md). Nunca confia em identificadores
 * recebidos: a organização é resolvida por associações persistidas
 * (provider_call_id → calls; inbound_phone_number → agents).
 */

export type IngestOutcome =
  | { ok: true; kind: 'processed'; callId: string; status: CallStatus }
  | { ok: true; kind: 'duplicate'; callId: string | null }
  | {
      ok: true;
      kind: 'ignored';
      reason: 'unknown_call' | 'unmapped_number' | 'noop_event';
      callId: string | null;
    }
  | { ok: false; code: 'persistence_failed' | 'integration_not_configured'; detail: string };

function nowIso(): string {
  return new Date().toISOString();
}

async function persistEvent(
  insert: CallEventInsert,
): Promise<{ duplicate: boolean } | { error: string }> {
  if (insert.kind === 'duplicate') return { duplicate: true };
  if (insert.kind === 'rejected') return { error: insert.detail };

  const supabase = getSupabaseServiceClient();
  if (!supabase) return { error: 'persistência privilegiada não configurada' };

  const { error } = await supabase.from('call_events').insert({
    organization_id: insert.organization_id,
    call_id: insert.call_id,
    provider: insert.provider,
    provider_event_id: insert.provider_event_id,
    event_type: insert.event_type,
    occurred_at: insert.occurred_at,
    metadata: insert.metadata,
  });

  if (error) {
    if (isDuplicateEventError(error)) return { duplicate: true };
    return { error: error.message };
  }
  return { duplicate: false };
}

interface CallStateRow {
  id: string;
  organization_id: string;
  status: CallStatus;
  started_at: string | null;
  answered_at: string | null;
  voice_session_id: string | null;
  from_number?: string | null;
  to_number?: string | null;
}

function toLifecycleState(row: CallStateRow, lastOccurredAt: string | null): CallLifecycleState {
  return {
    status: row.status,
    startedAt: row.started_at,
    lastOccurredAt,
    voiceSessionId: row.voice_session_id,
  };
}

/**
 * Processa um evento de estado: dedup persistente + patch monotónico.
 * Idempotente: o mesmo evento repetido não altera nada.
 */
export async function ingestStatusEvent(params: {
  provider: string;
  event: CallLifecycleEvent;
  callRef: string;
}): Promise<IngestOutcome> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return {
      ok: false,
      code: 'integration_not_configured',
      detail: 'Persistência privilegiada (service role) não configurada.',
    };
  }

  const { data: call, error: callError } = await supabase
    .from('calls')
    .select(
      'id, organization_id, status, started_at, answered_at, voice_session_id, from_number, to_number',
    )
    .eq('provider', params.provider)
    .eq('provider_call_id', params.callRef)
    .maybeSingle();

  if (callError) {
    return { ok: false, code: 'persistence_failed', detail: callError.message };
  }
  if (!call) {
    // Evento desconhecido: ignorado em segurança, sem crash nem escrita.
    return { ok: true, kind: 'ignored', reason: 'unknown_call', callId: null };
  }

  const callRow = call as CallStateRow;

  const insert = buildCallEventInsert({
    organizationId: callRow.organization_id,
    callId: callRow.id,
    provider: params.provider,
    event: params.event,
  });

  const persisted = await persistEvent(insert);
  if ('error' in persisted) {
    return { ok: false, code: 'persistence_failed', detail: persisted.error };
  }
  if (persisted.duplicate) {
    // Deduplicação persistente: já processado — resposta idempotente.
    return { ok: true, kind: 'duplicate', callId: callRow.id };
  }

  const { data: lastEvent } = await supabase
    .from('call_events')
    .select('occurred_at')
    .eq('call_id', callRow.id)
    .neq('provider_event_id', params.event.providerEventId)
    .order('occurred_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const state = toLifecycleState(callRow, lastEvent?.occurred_at ?? callRow.answered_at ?? null);
  const outcome = computeLifecyclePatch(state, params.event, nowIso());

  if (outcome.kind === 'noop') {
    return { ok: true, kind: 'ignored', reason: 'noop_event', callId: callRow.id };
  }

  const patch: Record<string, unknown> = { status: outcome.patch.status };
  if (outcome.patch.answeredAt !== undefined) patch.answered_at = outcome.patch.answeredAt;
  if (outcome.patch.endedAt !== undefined) patch.ended_at = outcome.patch.endedAt;
  if (outcome.patch.durationSeconds !== undefined)
    patch.duration_seconds = outcome.patch.durationSeconds;
  if (outcome.patch.failureCode !== undefined) patch.failure_code = outcome.patch.failureCode;
  if (outcome.patch.failureReason !== undefined) patch.failure_reason = outcome.patch.failureReason;
  if (outcome.patch.voiceSessionId !== undefined)
    patch.voice_session_id = outcome.patch.voiceSessionId;

  const { error: updateError } = await supabase
    .from('calls')
    .update(patch)
    .eq('id', callRow.id)
    .eq('organization_id', callRow.organization_id);

  if (updateError) {
    return { ok: false, code: 'persistence_failed', detail: updateError.message };
  }

  // Workflows (Prompt 08) — após persistência real do estado; nunca quebra a ingestão.
  await dispatchCallAutomations({
    organizationId: callRow.organization_id,
    callId: callRow.id,
    status: outcome.status,
    fromNumber: callRow.from_number ?? null,
    toNumber: callRow.to_number ?? null,
  });

  return { ok: true, kind: 'processed', callId: callRow.id, status: outcome.status };
}

/**
 * Processa uma chamada recebida: resolve agente/organização pelo número de
 * entrada PERSISTIDO e cria o registo de forma idempotente.
 */
export async function ingestInboundCall(params: {
  provider: string;
  info: InboundCallInfo;
}): Promise<IngestOutcome> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return {
      ok: false,
      code: 'integration_not_configured',
      detail: 'Persistência privilegiada (service role) não configurada.',
    };
  }

  const { data: agent } = await supabase
    .from('agents')
    .select('id, organization_id')
    .eq('inbound_phone_number', params.info.inboundNumber)
    .eq('status', 'active')
    .maybeSingle();

  if (!agent) {
    return { ok: true, kind: 'ignored', reason: 'unmapped_number', callId: null };
  }

  const startedAt = params.info.occurredAt || nowIso();

  const { data: existing } = await supabase
    .from('calls')
    .select(
      'id, organization_id, status, started_at, answered_at, voice_session_id, from_number, to_number',
    )
    .eq('provider', params.provider)
    .eq('provider_call_id', params.info.providerCallId)
    .maybeSingle();

  let callId: string;
  if (existing) {
    callId = (existing as CallStateRow).id;
  } else {
    const { data: created, error } = await supabase
      .from('calls')
      .insert({
        organization_id: agent.organization_id,
        agent_id: agent.id,
        direction: 'inbound',
        status: 'queued',
        from_number: params.info.fromNumber,
        to_number: params.info.inboundNumber,
        provider: params.provider,
        provider_call_id: params.info.providerCallId,
        started_at: startedAt,
      })
      .select('id')
      .single();

    if (error) {
      if (isDuplicateEventError(error)) {
        const { data: raced } = await supabase
          .from('calls')
          .select('id')
          .eq('provider', params.provider)
          .eq('provider_call_id', params.info.providerCallId)
          .maybeSingle();
        if (raced) callId = raced.id;
        else return { ok: false, code: 'persistence_failed', detail: error.message };
      } else {
        return { ok: false, code: 'persistence_failed', detail: error.message };
      }
    } else {
      callId = created.id;
    }
  }

  const insert = buildCallEventInsert({
    organizationId: agent.organization_id,
    callId,
    provider: params.provider,
    event: {
      type: 'call.received',
      occurredAt: startedAt,
      providerEventId: params.info.providerEventId,
    },
  });

  const persisted = await persistEvent(insert);
  if ('error' in persisted) {
    return { ok: false, code: 'persistence_failed', detail: persisted.error };
  }

  if (persisted.duplicate) {
    return { ok: true, kind: 'duplicate', callId };
  }

  await dispatchCallAutomations({
    organizationId: agent.organization_id,
    callId,
    status: 'queued',
    fromNumber: params.info.fromNumber,
    toNumber: params.info.inboundNumber,
    kind: 'received',
  });

  return { ok: true, kind: 'processed', callId, status: 'queued' };
}
