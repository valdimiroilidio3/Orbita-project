'use client';

import { AlertCircle, CheckCircle2, Loader2, Save } from 'lucide-react';
import * as React from 'react';
import { useActionState } from 'react';

import { Button } from '@/components/ui/button';
import { INITIAL_SETTINGS_STATE, type SettingsFormState } from '@/lib/server/settings-form-state';
import { cn } from '@/lib/utils';

type SettingsAction = (prev: SettingsFormState, formData: FormData) => Promise<SettingsFormState>;

interface SettingsFormContextValue {
  fieldErrors: Record<string, string>;
  pending: boolean;
  dirty: boolean;
  markDirty: () => void;
}

const SettingsFormContext = React.createContext<SettingsFormContextValue | null>(null);

export function useSettingsForm(): SettingsFormContextValue {
  const ctx = React.useContext(SettingsFormContext);
  if (!ctx) throw new Error('useSettingsForm deve ser usado dentro de <SettingsForm>');
  return ctx;
}

/** Erro de campo devolvido pelo servidor para `name` (ou undefined). */
export function useFieldError(name: string): string | undefined {
  return useSettingsForm().fieldErrors[name];
}

export interface SettingsFormProps {
  action: SettingsAction;
  children: React.ReactNode;
  submitLabel?: string;
  /** Desativa submissão (ex.: sem permissão). O formulário fica só de leitura. */
  readOnly?: boolean;
  readOnlyReason?: string;
  className?: string;
  /** Mostrar botão Cancelar (repõe os valores iniciais). */
  cancelable?: boolean;
}

/**
 * Casca comum dos formulários de definições:
 * - `useActionState` + estado pending;
 * - indicador de alterações não guardadas + confirmação ao abandonar;
 * - Guardar / Cancelar; mensagens de sucesso/erro com `role="status"/"alert"`;
 * - erros de campo do servidor via contexto (`useFieldError`).
 */
export function SettingsForm({
  action,
  children,
  submitLabel = 'Guardar alterações',
  readOnly = false,
  readOnlyReason,
  className,
  cancelable = true,
}: SettingsFormProps) {
  const [state, formAction, pending] = useActionState(action, INITIAL_SETTINGS_STATE);
  const [dirty, setDirty] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  const lastSuccess = React.useRef<string | null>(null);

  // Sucesso → limpa estado "sujo".
  React.useEffect(() => {
    if (state.success && state.success !== lastSuccess.current) {
      lastSuccess.current = state.success;
      setDirty(false);
    }
  }, [state.success]);

  // Confirmação ao abandonar com alterações não guardadas.
  React.useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const markDirty = React.useCallback(() => setDirty(true), []);
  const value = React.useMemo(
    () => ({ fieldErrors: state.fieldErrors ?? {}, pending, dirty, markDirty }),
    [state.fieldErrors, pending, dirty, markDirty],
  );

  const reset = () => {
    formRef.current?.reset();
    setDirty(false);
  };

  return (
    <SettingsFormContext.Provider value={value}>
      <form
        ref={formRef}
        action={formAction}
        onInput={markDirty}
        onChange={markDirty}
        className={cn('space-y-5', className)}
        noValidate
        aria-busy={pending}
      >
        <fieldset disabled={readOnly || pending} className="space-y-5 border-0 p-0">
          {children}
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
        {state.success && !dirty ? (
          <p
            role="status"
            className="flex items-start gap-2 rounded-lg border border-success/40 bg-success-soft px-3.5 py-2.5 text-caption text-success-text"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {state.success}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-caption text-muted" aria-live="polite">
            {readOnly
              ? (readOnlyReason ?? 'Sem permissão para editar.')
              : dirty
                ? 'Alterações não guardadas'
                : 'Sem alterações pendentes'}
          </p>
          {!readOnly ? (
            <div className="flex items-center gap-2">
              {cancelable ? (
                <Button type="button" variant="ghost" onClick={reset} disabled={!dirty || pending}>
                  Cancelar
                </Button>
              ) : null}
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Save className="h-4 w-4" aria-hidden />
                )}
                {submitLabel}
              </Button>
            </div>
          ) : null}
        </div>
      </form>
    </SettingsFormContext.Provider>
  );
}
