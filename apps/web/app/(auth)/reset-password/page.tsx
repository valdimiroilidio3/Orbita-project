'use client';

import { AlertCircle, KeyRound, Loader2 } from 'lucide-react';
import { useActionState } from 'react';

import { resetPasswordAction } from '@/lib/server/actions';
import { INITIAL_AUTH_STATE } from '@/lib/server/auth-form-state';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

/**
 * Definir nova palavra-passe — acedida a partir do link de recuperação
 * (a sessão de recuperação é criada no /auth/callback).
 */
export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(resetPasswordAction, INITIAL_AUTH_STATE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1">Nova palavra-passe</h1>
        <p className="mt-1 text-small text-muted">Define a nova palavra-passe da tua conta.</p>
      </div>

      <form action={formAction} className="space-y-4" noValidate>
        <FormField label="Nova palavra-passe" hint="Mínimo de 8 caracteres." required>
          {({ id, describedBy, required }) => (
            <Input
              id={id}
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required={required}
              aria-describedby={describedBy}
            />
          )}
        </FormField>

        <FormField label="Confirmar palavra-passe" required>
          {({ id, describedBy, required }) => (
            <Input
              id={id}
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required={required}
              aria-describedby={describedBy}
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

        <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />A guardar…
            </>
          ) : (
            <>
              <KeyRound className="h-4 w-4" aria-hidden />
              Guardar palavra-passe
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
