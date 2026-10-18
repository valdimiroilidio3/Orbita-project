import { CALL_STATUS_LABELS, type CallStatus, isTerminalCallStatus } from '@orbita/shared';

import { cn } from '@/lib/utils';

const FLOW: CallStatus[] = ['queued', 'initiating', 'ringing', 'in_progress', 'completed'];

const OUTCOMES: CallStatus[] = ['no_answer', 'busy', 'failed', 'cancelled', 'transferred'];

/**
 * Linha do tempo do ciclo de vida de uma chamada.
 * O fluxo principal é apresentado como etapas; resultados alternativos
 * (não atendida, ocupada, falhada, cancelada, transferida) aparecem à parte.
 */
export function CallTimeline({ status }: { status: CallStatus }) {
  return (
    <div className="space-y-3">
      <ol className="flex flex-wrap items-center gap-2">
        {FLOW.map((step, index) => {
          const isCurrent = step === status;
          const isOutcome = isTerminalCallStatus(status) && OUTCOMES.includes(status);
          return (
            <li key={step} className="flex items-center gap-2">
              <span
                aria-current={isCurrent && !isOutcome ? 'step' : undefined}
                className={cn(
                  'rounded-full px-3 py-1 text-caption font-medium',
                  isCurrent && !isOutcome
                    ? 'bg-primary text-white'
                    : 'border border-border bg-surface text-muted',
                )}
              >
                {CALL_STATUS_LABELS[step]}
              </span>
              {index < FLOW.length - 1 ? (
                <span className="text-muted" aria-hidden>
                  →
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>

      {OUTCOMES.includes(status) ? (
        <p className="text-caption text-muted">
          Resultado:{' '}
          <span className="rounded-full bg-neutral-soft px-2.5 py-0.5 font-medium text-text">
            {CALL_STATUS_LABELS[status]}
          </span>
        </p>
      ) : null}
    </div>
  );
}
