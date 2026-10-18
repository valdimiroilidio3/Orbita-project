'use client';

import { AlertCircle, CheckCircle2, Loader2, Save } from 'lucide-react';
import { useActionState } from 'react';

import { AUTOMATION_TRIGGERS, TOOL_DEFINITIONS, TOOL_IDS } from '@orbita/shared';

import { saveWorkflowAction } from '@/lib/server/tool-actions';
import { INITIAL_TOOL_STATE } from '@/lib/server/tool-form-state';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';

export interface WorkflowFormValues {
  id?: string;
  name: string;
  description: string | null;
  trigger: string;
  active: boolean;
  steps: { toolId: string; args: Record<string, unknown> }[];
  timeoutSeconds: number;
}

const TRIGGER_LABELS: Record<string, string> = {
  'call.received': 'Chamada recebida',
  'call.completed': 'Chamada terminada (completa)',
  'call.failed': 'Chamada falhada',
  'call.no_answer': 'Chamada não atendida',
  'call.busy': 'Linha ocupada',
  'contact_request.created': 'Pedido de contacto criado',
  'appointment.created': 'Marcação criada',
};

/** Formulário controlado de workflow — apenas gatilhos e ações suportados. */
export function WorkflowForm({ values }: { values: WorkflowFormValues }) {
  const [state, formAction, pending] = useActionState(saveWorkflowAction, INITIAL_TOOL_STATE);
  const [trigger, setTrigger] = useState(values.trigger || AUTOMATION_TRIGGERS[0]);
  const [stepsJson, setStepsJson] = useState(JSON.stringify(values.steps, null, 2));

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      <FormField label="Nome" required>
        {({ id, describedBy, required }) => (
          <Input
            id={id}
            name="name"
            defaultValue={values.name}
            maxLength={120}
            required={required}
            aria-describedby={describedBy}
          />
        )}
      </FormField>

      <FormField label="Descrição" hint="Opcional — o que este workflow faz.">
        {({ id, describedBy }) => (
          <Textarea
            id={id}
            name="description"
            rows={2}
            defaultValue={values.description ?? ''}
            maxLength={500}
            aria-describedby={describedBy}
          />
        )}
      </FormField>

      <FormField label="Gatilho" hint="Apenas eventos reais suportados." required>
        {({ id, describedBy }) => (
          <>
            <Select value={trigger} onValueChange={setTrigger}>
              <SelectTrigger id={id} aria-describedby={describedBy}>
                <SelectValue placeholder="Seleciona o gatilho" />
              </SelectTrigger>
              <SelectContent>
                {AUTOMATION_TRIGGERS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {TRIGGER_LABELS[value] ?? value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="trigger" value={trigger} />
          </>
        )}
      </FormField>

      <FormField
        label="Passos (JSON)"
        hint='Array até 5 passos: [{"toolId": "contact_request.create", "args": {...}}]. Placeholders: {{call.fromNumber}}, {{contact.phone}}…'
      >
        {({ id, describedBy }) => (
          <Textarea
            id={id}
            name="steps"
            rows={8}
            value={stepsJson}
            onChange={(event) => setStepsJson(event.target.value)}
            aria-describedby={describedBy}
            className="font-mono text-caption"
          />
        )}
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Timeout (segundos)" hint="5–120.">
          {({ id, describedBy }) => (
            <Input
              id={id}
              name="timeoutSeconds"
              type="number"
              min={5}
              max={120}
              defaultValue={values.timeoutSeconds}
              aria-describedby={describedBy}
            />
          )}
        </FormField>

        <FormField label="Estado" hint="Ativo = processa novos eventos.">
          {({ id, describedBy }) => (
            <select
              id={id}
              name="active"
              defaultValue={values.active ? 'true' : 'false'}
              aria-describedby={describedBy}
              className="h-10 w-full rounded-md border border-border bg-surface px-3 text-small"
            >
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          )}
        </FormField>
      </div>

      <p className="text-caption text-muted">
        Ferramentas disponíveis: {TOOL_IDS.map((id) => TOOL_DEFINITIONS[id].name).join(' · ')}.
        Sempre validado no servidor — nunca é aceite código arbitrário.
      </p>

      {state.error ? (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger-soft px-3.5 py-2.5 text-caption text-danger-text">
          <AlertCircle className="mr-1 inline h-4 w-4 align-middle" aria-hidden />
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="rounded-lg border border-success/40 bg-success-soft px-3.5 py-2.5 text-caption text-success-text">
          <CheckCircle2 className="mr-1 inline h-4 w-4 align-middle" aria-hidden />
          {state.success}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} aria-busy={pending}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
        ) : (
          <Save className="h-4 w-4" aria-hidden />
        )}
        Guardar workflow
      </Button>
    </form>
  );
}
