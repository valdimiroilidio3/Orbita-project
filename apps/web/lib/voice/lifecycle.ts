import {
  applyLifecycleEvent,
  canTransitionCallStatus,
  isTerminalCallStatus,
  type CallLifecycleEvent,
  type CallStatus,
} from '@orbita/shared';

import { computeCallDurationSeconds } from '@/lib/calls';
import type { CallLifecycleApplyOutcome } from '@/lib/voice/contracts';

/**
 * CallLifecycleService — gestão do estado das chamadas (PROMPT 07 §6).
 *
 * Regras:
 *   • eventos FORA DE ORDEM nunca revertem o estado (monotonia);
 *   • atualizações finais são idempotentes (repetição → noop);
 *   • um webhook NUNCA implica atendimento — só `call.answered`;
 *   • estados transitórios não ficam pendentes para sempre: `reconcile`
 *     falha chamadas abandonadas após timeout configurável.
 */

export interface CallLifecycleState {
  status: CallStatus;
  startedAt: string | null;
  lastOccurredAt: string | null;
  voiceSessionId: string | null;
}

export interface CallLifecyclePatch {
  status: CallStatus;
  answeredAt?: string | null;
  endedAt?: string | null;
  durationSeconds?: number | null;
  failureCode?: string | null;
  failureReason?: string | null;
  voiceSessionId?: string | null;
}

/**
 * Calcula o patch de persistência para um evento de ciclo de vida.
 * Função pura — testada exaustivamente em tests/voice-engine.test.ts.
 */
export function computeLifecyclePatch(
  state: CallLifecycleState,
  event: CallLifecycleEvent,
  now: string,
): CallLifecycleApplyOutcome {
  const result = applyLifecycleEvent(
    state.status,
    event,
    state.lastOccurredAt,
    canTransitionCallStatus,
  );

  if (result.kind === 'noop') {
    // Idempotência: sessão de voz associada a evento tardio ainda pode ser registada.
    if (event.voiceSessionId && !state.voiceSessionId) {
      return {
        kind: 'applied',
        status: state.status,
        patch: { status: state.status, voiceSessionId: event.voiceSessionId },
      };
    }
    return { kind: 'noop', reason: result.reason };
  }

  const patch: CallLifecyclePatch = { status: result.status };

  if (event.type === 'call.answered') {
    patch.answeredAt = event.occurredAt;
    patch.voiceSessionId = event.voiceSessionId ?? state.voiceSessionId;
  }

  if (event.voiceSessionId && !state.voiceSessionId) {
    patch.voiceSessionId = event.voiceSessionId;
  }

  if (isTerminalCallStatus(result.status)) {
    patch.endedAt = event.occurredAt;
    patch.durationSeconds = computeCallDurationSeconds(
      state.startedAt ?? event.occurredAt,
      event.occurredAt,
    );
    if (result.status === 'failed' || result.status === 'cancelled') {
      patch.failureCode = event.failureCode ?? null;
      patch.failureReason = event.failureReason ?? null;
    }
    if (result.status === 'completed' && event.type === 'call.ended') {
      patch.failureCode = null;
      patch.failureReason = null;
    }
  }

  // Garantir que `now` fica disponível para futuras regras de processamento.
  void now;

  return { kind: 'applied', status: result.status, patch };
}

/** Estados transitórios que a reconciliação vigia. */
export const TRANSIENT_CALL_STATUSES: readonly CallStatus[] = [
  'queued',
  'initiating',
  'ringing',
  'in_progress',
];

/**
 * Reconciliação de chamadas sem estado final (PROMPT 07 §6/§13):
 * chamadas transitórias mais velhas que o timeout passam a `failed` com
 * código `timeout_reconciliation` — sem criar chamadas duplicadas.
 */
export function reconcileStaleCall(
  state: CallLifecycleState,
  opts: { now: string; timeoutMinutes: number },
): CallLifecycleApplyOutcome | null {
  if (!TRANSIENT_CALL_STATUSES.includes(state.status)) return null;

  const reference = state.lastOccurredAt ?? state.startedAt;
  if (!reference) return null;

  const ageMs = new Date(opts.now).getTime() - new Date(reference).getTime();
  const timeoutMs = opts.timeoutMinutes * 60_000;
  if (!Number.isFinite(ageMs) || ageMs < timeoutMs) return null;

  return {
    kind: 'applied',
    status: 'failed',
    patch: {
      status: 'failed',
      endedAt: opts.now,
      durationSeconds: computeCallDurationSeconds(state.startedAt ?? reference, opts.now),
      failureCode: 'timeout_reconciliation',
      failureReason: 'Chamada sem estado final dentro do limite — reconciliada pelo servidor.',
    },
  };
}
