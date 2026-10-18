import type { AutomationTrigger } from '@orbita/shared';

import { log } from '@/lib/observability/logger';
import { runAutomationsForTrigger } from '@/lib/tools/automation';

/**
 * Ponte entre eventos REAIS do ciclo de vida das chamadas e os workflows.
 * Independente do fornecedor: recebe apenas o estado persistido da chamada.
 */

const STATUS_TO_TRIGGER: Record<string, AutomationTrigger> = {
  completed: 'call.completed',
  failed: 'call.failed',
  no_answer: 'call.no_answer',
  busy: 'call.busy',
};

export function triggerForCallStatus(status: string): AutomationTrigger | null {
  return STATUS_TO_TRIGGER[status] ?? null;
}

/**
 * Dispara workflows para uma transição de chamada. Nunca lança: falhas de
 * automação não podem quebrar a ingestão nem o Calls Center.
 */
export async function dispatchCallAutomations(params: {
  organizationId: string;
  callId: string;
  status: string;
  fromNumber: string | null;
  toNumber: string | null;
  /** 'received' força o gatilho call.received (chamada nova). */
  kind?: 'received' | 'status';
}): Promise<void> {
  const trigger =
    params.kind === 'received' ? 'call.received' : triggerForCallStatus(params.status);
  if (!trigger) return;

  try {
    await runAutomationsForTrigger({
      organizationId: params.organizationId,
      trigger,
      // Chave estável por chamada+gatilho → sem reexecução em eventos duplicados.
      triggerKey: `call:${params.callId}:${trigger}`,
      context: {
        callId: params.callId,
        callFromNumber: params.fromNumber,
        callToNumber: params.toNumber,
        contactPhone: params.fromNumber,
        contactName: null,
      },
    });
  } catch (error) {
    log('warn', 'automations.dispatch_failed', {
      callId: params.callId,
      trigger,
      error,
    });
  }
}
