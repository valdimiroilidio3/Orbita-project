import { isTerminalCallStatus, type CallStatus } from '@orbita/shared';

/**
 * Helpers puros do motor de chamadas (sem dependências de servidor) —
 * utilizados pelas server actions, pela UI e pelos testes.
 */

/**
 * Identificador do fornecedor simulado. Qualquer chamada criada pelo
 * simulador é registada com `provider = 'simulado'` e apresentada na UI
 * com badge "Simulada" — NUNCA é telefonia real.
 */
export const CALL_PROVIDER_SIMULADO = 'simulado';

export function isSimulatedProvider(provider: string | null): boolean {
  return provider === CALL_PROVIDER_SIMULADO;
}

/**
 * Custo estimado de uma chamada simulada: 0,02 €/minuto, proporcional aos
 * segundos. Valores de telefonia real virão do fornecedor — estes são
 * explicitamente estimativas do simulador.
 */
export const SIMULATED_COST_PER_MINUTE = 0.02;

export function estimateSimulatedCost(durationSeconds: number): number {
  const seconds = Math.max(0, durationSeconds);
  return Math.round((seconds / 60) * SIMULATED_COST_PER_MINUTE * 1_000_000) / 1_000_000;
}

/** Duração coerente entre timestamps (>= 0, arredondada a segundos). */
export function computeCallDurationSeconds(
  startedAt: string | Date,
  endedAt: string | Date,
): number {
  const start = startedAt instanceof Date ? startedAt.getTime() : new Date(startedAt).getTime();
  const end = endedAt instanceof Date ? endedAt.getTime() : new Date(endedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.round((end - start) / 1000));
}

/**
 * Sequência de estados que o simulador percorre após a criação (a chamada
 * nasce em `queued`): ligação iniciada → a tocar → atendida (em curso).
 * O fim (completed/cancelled) é sempre uma ação explícita do utilizador —
 * a duração resulta do tempo real entre início e fim.
 */
export const SIMULATED_CALL_PROGRESS: readonly CallStatus[] = [
  'initiating',
  'ringing',
  'in_progress',
];

/** Estado inicial de uma chamada criada pelo motor. */
export const INITIAL_CALL_STATUS: CallStatus = 'queued';

/** Determina se uma chamada pode ser terminada/cancelada pelo utilizador. */
export function canFinishCall(status: CallStatus): boolean {
  return status === 'in_progress';
}

export function canCancelCall(status: CallStatus): boolean {
  return !isTerminalCallStatus(status);
}
