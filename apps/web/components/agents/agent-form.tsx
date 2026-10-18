'use client';

import { AlertCircle, CheckCircle2, Loader2, Save, UserPlus } from 'lucide-react';
import { useActionState, useState } from 'react';

import type { VoiceConfigInput } from '@orbita/shared';

import { AGENT_LANGUAGES, INSTRUCTIONS_MAX_LENGTH } from '@/lib/agents';
import { createAgentAction, updateAgentAction } from '@/lib/server/agent-actions';
import { INITIAL_AGENT_STATE, type AgentFormState } from '@/lib/server/agent-form-state';
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

export interface AgentFormValues {
  id: string;
  name: string;
  description: string | null;
  instructions: string;
  language: string;
  voiceConfig: VoiceConfigInput;
  inboundPhoneNumber: string | null;
}

export type AgentFormProps =
  | { mode: 'create'; disabled?: boolean }
  | { mode: 'edit'; agent: AgentFormValues; disabled?: boolean };

/**
 * Formulário do Agent Studio (criação e edição).
 * A validação do servidor é sempre reexecutada — o cliente só guia o utilizador.
 */
export function AgentForm(props: AgentFormProps) {
  const disabled = props.disabled ?? false;
  const initial = props.mode === 'edit' ? props.agent : null;
  const action = props.mode === 'create' ? createAgentAction : updateAgentAction;
  const [state, formAction, pending] = useActionState<AgentFormState, FormData>(
    action,
    INITIAL_AGENT_STATE,
  );

  const [language, setLanguage] = useState(initial?.language ?? 'pt-PT');
  const [instructionsLength, setInstructionsLength] = useState(initial?.instructions.length ?? 0);

  const voice: VoiceConfigInput = initial?.voiceConfig ?? {};

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}

      <FormField label="Nome" hint="Como o agente é identificado na plataforma." required>
        {({ id, describedBy, invalid, required }) => (
          <Input
            id={id}
            name="name"
            defaultValue={initial?.name ?? ''}
            maxLength={120}
            required={required}
            disabled={disabled}
            placeholder="Rececionista Virtual"
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
          />
        )}
      </FormField>

      <FormField
        label="Descrição"
        hint="Opcional — resumo do papel do agente (máx. 2000 caracteres)."
      >
        {({ id, describedBy }) => (
          <Textarea
            id={id}
            name="description"
            defaultValue={initial?.description ?? ''}
            rows={2}
            maxLength={2000}
            disabled={disabled}
            placeholder="Atende chamadas de entrada e encaminha para a equipa certa."
            aria-describedby={describedBy}
          />
        )}
      </FormField>

      <FormField
        label="Instruções"
        hint={`Comportamento do agente — máximo de ${INSTRUCTIONS_MAX_LENGTH.toLocaleString('pt-PT')} caracteres.`}
      >
        {({ id, describedBy }) => (
          <div className="space-y-1.5">
            <Textarea
              id={id}
              name="instructions"
              defaultValue={initial?.instructions ?? ''}
              rows={8}
              maxLength={INSTRUCTIONS_MAX_LENGTH}
              disabled={disabled}
              placeholder="És um assistente telefónico da clínica. Cumprimenta o cliente, identifica a necessidade e agenda ou transfere a chamada…"
              aria-describedby={describedBy}
              onChange={(event) => setInstructionsLength(event.target.value.length)}
            />
            <p className="text-right text-caption text-muted" aria-live="polite">
              {instructionsLength.toLocaleString('pt-PT')} /{' '}
              {INSTRUCTIONS_MAX_LENGTH.toLocaleString('pt-PT')}
            </p>
          </div>
        )}
      </FormField>

      <FormField label="Idioma" hint="Idioma principal da conversa do agente.">
        {({ id, describedBy }) => (
          <>
            <Select value={language} onValueChange={setLanguage} disabled={disabled}>
              <SelectTrigger id={id} aria-describedby={describedBy}>
                <SelectValue placeholder="Seleciona o idioma" />
              </SelectTrigger>
              <SelectContent>
                {AGENT_LANGUAGES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="language" value={language} />
          </>
        )}
      </FormField>

      <fieldset className="space-y-4 rounded-xl border border-border p-4" disabled={disabled}>
        <legend className="px-1 text-small font-semibold text-text">Configuração de voz</legend>
        <p className="text-caption text-muted">
          Apenas configuração estruturada. Nunca introduzas chaves de API ou segredos de
          fornecedores — pertencem às variáveis de ambiente do servidor.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Identificador de voz"
            hint="Opcional — voz do fornecedor (sem segredos)."
          >
            {({ id, describedBy }) => (
              <Input
                id={id}
                name="voiceId"
                defaultValue={voice.voiceId ?? ''}
                maxLength={64}
                placeholder="pt-female-01"
                aria-describedby={describedBy}
              />
            )}
          </FormField>

          <FormField label="Estilo" hint="Opcional — tom pretendido (máx. 120 caracteres).">
            {({ id, describedBy }) => (
              <Input
                id={id}
                name="style"
                defaultValue={voice.style ?? ''}
                maxLength={120}
                placeholder="empático e objetivo"
                aria-describedby={describedBy}
              />
            )}
          </FormField>

          <FormField label="Velocidade" hint="Opcional — entre 0.5 e 2.">
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="speed"
                type="number"
                step="0.1"
                min="0.5"
                max="2"
                defaultValue={voice.speed ?? ''}
                placeholder="1"
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
              />
            )}
          </FormField>

          <FormField label="Tom" hint="Opcional — entre -1 e 1.">
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="pitch"
                type="number"
                step="0.1"
                min="-1"
                max="1"
                defaultValue={voice.pitch ?? ''}
                placeholder="0"
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
              />
            )}
          </FormField>
        </div>

        <FormField
          label="Saudação inicial"
          hint="Opcional — primeira frase do agente (máx. 500 caracteres)."
        >
          {({ id, describedBy }) => (
            <Input
              id={id}
              name="greeting"
              defaultValue={voice.greeting ?? ''}
              maxLength={500}
              placeholder="Bem-vindo à Clínica X, em que posso ajudar?"
              aria-describedby={describedBy}
            />
          )}
        </FormField>

        <FormField
          label="Número de entrada (telefonia)"
          hint="Opcional — número que encaminha chamadas recebidas para este agente (único na organização)."
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name="inboundPhoneNumber"
              type="tel"
              defaultValue={initial?.inboundPhoneNumber ?? ''}
              maxLength={32}
              placeholder="+351 210 000 001"
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
            />
          )}
        </FormField>
      </fieldset>

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

      <Button type="submit" disabled={pending || disabled} aria-busy={pending}>
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />A
            guardar…
          </>
        ) : props.mode === 'create' ? (
          <>
            <UserPlus className="h-4 w-4" aria-hidden />
            Criar agente
          </>
        ) : (
          <>
            <Save className="h-4 w-4" aria-hidden />
            Guardar alterações
          </>
        )}
      </Button>
    </form>
  );
}
