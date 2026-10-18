'use client';

import { AlertCircle, CheckCircle2, Loader2, Play } from 'lucide-react';
import { useActionState } from 'react';

import { runToolAction } from '@/lib/server/tool-actions';
import { INITIAL_TOOL_STATE } from '@/lib/server/tool-form-state';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';

/**
 * Execução controlada de uma ferramenta (apenas owners/admins no detalhe).
 * Os argumentos são validados no cliente e REVALIDADOS no servidor.
 */
export function ToolRunForm({ toolId }: { toolId: string }) {
  const [state, formAction, pending] = useActionState(runToolAction, INITIAL_TOOL_STATE);

  return (
    <form action={formAction} className="space-y-3" noValidate>
      <input type="hidden" name="toolId" value={toolId} />
      <FormField
        label="Argumentos (JSON)"
        hint='Ex.: {"section": "hours"} — validados no servidor.'
      >
        {({ id, describedBy }) => (
          <Textarea
            id={id}
            name="args"
            rows={4}
            defaultValue={'{\n  \n}'}
            aria-describedby={describedBy}
            className="font-mono text-caption"
          />
        )}
      </FormField>

      {state.error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-danger/40 bg-danger-soft px-3.5 py-2.5 text-caption text-danger-text"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg border border-success/40 bg-success-soft px-3.5 py-2.5 text-caption text-success-text"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {state.success}
        </p>
      ) : null}

      <Button type="submit" variant="outline" size="sm" disabled={pending} aria-busy={pending}>
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
        ) : (
          <Play className="h-3.5 w-3.5" aria-hidden />
        )}
        Executar ferramenta
      </Button>
    </form>
  );
}
