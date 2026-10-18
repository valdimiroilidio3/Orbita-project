'use client';

import { AlertCircle, PhoneOutgoing } from 'lucide-react';
import { useActionState, useState } from 'react';

import { startCallAction } from '@/lib/server/call-actions';
import { INITIAL_CALL_STATE } from '@/lib/server/call-form-state';
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

export interface StartCallFormProps {
  agents: { id: string; name: string }[];
  disabled?: boolean;
  disabledReason?: string;
}

/** Formulário de início de chamada (simulador local — sem telefonia real). */
export function StartCallForm({ agents, disabled = false, disabledReason }: StartCallFormProps) {
  const [state, formAction, pending] = useActionState(startCallAction, INITIAL_CALL_STATE);
  const [agentId, setAgentId] = useState('');

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormField label="Agente" hint="Apenas agentes ativos da tua organização." required>
        {({ id, describedBy }) => (
          <>
            <Select
              value={agentId}
              onValueChange={setAgentId}
              disabled={disabled || agents.length === 0}
            >
              <SelectTrigger id={id} aria-describedby={describedBy}>
                <SelectValue placeholder="Seleciona um agente ativo" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="agentId" value={agentId} />
          </>
        )}
      </FormField>

      <FormField
        label="Número de destino"
        hint="Formato internacional, ex.: +351 210 000 000."
        required
      >
        {({ id, describedBy, invalid, required }) => (
          <Input
            id={id}
            name="toNumber"
            type="tel"
            autoComplete="tel"
            placeholder="+351 210 000 000"
            required={required}
            disabled={disabled}
            aria-describedby={describedBy}
            aria-invalid={invalid || Boolean(state.error) || undefined}
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

      {disabled && disabledReason ? (
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg border border-accent/40 bg-soft-blue px-3.5 py-2.5 text-caption text-primary"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {disabledReason}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pending || disabled || agents.length === 0}
        aria-busy={pending}
      >
        <PhoneOutgoing className="h-4 w-4" aria-hidden />
        {pending ? 'A iniciar…' : 'Iniciar chamada (simulada)'}
      </Button>
    </form>
  );
}
