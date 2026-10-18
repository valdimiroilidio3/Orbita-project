'use client';

import { Trash2 } from 'lucide-react';

import { deleteAgentAction } from '@/lib/server/agent-actions';
import { Button } from '@/components/ui/button';

/**
 * Eliminação de agente (owner/admin). Confirmação no cliente; a autorização
 * real é o RLS + verificação de papel no servidor.
 */
export function AgentDeleteButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={deleteAgentAction}
      onSubmit={(event) => {
        if (!window.confirm(`Eliminar o agente “${name}”? O histórico de chamadas é retido.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="destructive" size="sm">
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
        Eliminar agente
      </Button>
    </form>
  );
}
