'use client';

import { AlertCircle, CheckCircle2, Loader2, LogIn } from 'lucide-react';
import Link from 'next/link';
import { useActionState } from 'react';

import { signInAction } from '@/lib/server/actions';
import { INITIAL_AUTH_STATE } from '@/lib/server/auth-form-state';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export function LoginForm({ next, justRegistered }: { next?: string; justRegistered: boolean }) {
  const [state, formAction, pending] = useActionState(signInAction, INITIAL_AUTH_STATE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1">Iniciar sessão</h1>
        <p className="mt-1 text-small text-muted">Acede ao teu workspace ORBITA CHAT.</p>
      </div>

      {justRegistered ? (
        <p className="flex items-start gap-2 rounded-lg border border-success/40 bg-success-soft px-3.5 py-2.5 text-caption text-success-text">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Conta criada. Confirma o teu email (se solicitado) e inicia sessão.
        </p>
      ) : null}

      <form action={formAction} className="space-y-4" noValidate>
        {next ? <input type="hidden" name="next" value={next} /> : null}

        <FormField label="Email" required>
          {({ id, describedBy, invalid, required }) => (
            <Input
              id={id}
              name="email"
              type="email"
              autoComplete="email"
              placeholder="tu@empresa.pt"
              required={required}
              aria-describedby={describedBy}
              aria-invalid={invalid || Boolean(state.error) || undefined}
            />
          )}
        </FormField>

        <FormField label="Palavra-passe" required>
          {({ id, describedBy, invalid, required }) => (
            <Input
              id={id}
              name="password"
              type="password"
              autoComplete="current-password"
              required={required}
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

        <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />A
              entrar…
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" aria-hidden />
              Entrar
            </>
          )}
        </Button>
      </form>

      <div className="flex items-center justify-between text-small">
        <Link href="/forgot-password" className="text-primary hover:underline">
          Recuperar palavra-passe
        </Link>
        <Link href="/register" className="text-muted hover:text-text">
          Criar conta →
        </Link>
      </div>
    </div>
  );
}
