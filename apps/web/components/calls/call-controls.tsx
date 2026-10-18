import { PhoneOff, XCircle } from 'lucide-react';
import type { CallStatus } from '@orbita/shared';

import { canCancelCall, canFinishCall } from '@/lib/calls';
import { cancelCallAction, finishCallAction } from '@/lib/server/call-actions';
import { Button } from '@/components/ui/button';

/**
 * Controlos de chamada em curso (formulários com server action).
 * "Terminar" apenas em curso; "Cancelar" em qualquer estado não terminal.
 * A duração final é o tempo real decorrido desde o início.
 */
export function CallControls({ id, status }: { id: string; status: CallStatus }) {
  const showFinish = canFinishCall(status);
  const showCancel = canCancelCall(status);
  if (!showFinish && !showCancel) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Controlos da chamada">
      {showFinish ? (
        <form action={finishCallAction}>
          <input type="hidden" name="id" value={id} />
          <Button type="submit" size="sm">
            <PhoneOff className="h-3.5 w-3.5" aria-hidden />
            Terminar chamada
          </Button>
        </form>
      ) : null}
      {showCancel ? (
        <form action={cancelCallAction}>
          <input type="hidden" name="id" value={id} />
          <Button type="submit" variant="outline" size="sm">
            <XCircle className="h-3.5 w-3.5" aria-hidden />
            Cancelar chamada
          </Button>
        </form>
      ) : null}
    </div>
  );
}
