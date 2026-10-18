import { Archive, Pause, Play, RotateCcw } from 'lucide-react';

import type { AgentStatus } from '@orbita/shared';

import { agentStatusActions } from '@/lib/agents';
import { setAgentStatusAction } from '@/lib/server/agent-actions';
import { Button } from '@/components/ui/button';

const ICONS = {
  active: Play,
  paused: Pause,
  draft: RotateCcw,
  archived: Archive,
} as const;

/**
 * Ações de transição de estado (formulários com server action).
 * Apenas transições válidas — ver `canTransitionAgentStatus` no domínio.
 */
export function AgentStatusActions({ id, status }: { id: string; status: AgentStatus }) {
  const actions = agentStatusActions(status);
  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Alterar estado do agente">
      {actions.map((action) => {
        const Icon = ICONS[action.status];
        return (
          <form key={action.status} action={setAgentStatusAction}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="status" value={action.status} />
            <Button
              type="submit"
              variant={
                action.variant === 'primary' ? 'primary' : action.variant === 'danger' ? 'destructive' : 'outline'
              }
              size="sm"
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {action.label}
            </Button>
          </form>
        );
      })}
    </div>
  );
}
