'use client';

import { AlertCircle, Loader2, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useActionState } from 'react';

import { signUpAction } from '@/lib/server/actions';
import { INITIAL_AUTH_STATE } from '@/lib/server/auth-form-state';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(signUpAction, INITIAL_AUTH_STATE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1">Criar conta</h1>
        <p className="mt-1 text-small text-muted">
          Cria a tua conta para configurar o workspace e os agentes de voz.
        </p>
      </div>

      <form action={formAction} className="space-y-4" noValidate>
        <FormField label="Nome" hint="Opcional — como queres ser apresentado.">
          {({ id, describedBy }) => (
            <Input
              id={id}
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Ana Silva"
              maxLength={80}
              aria-describedby={describedBy}
            />
          )}
        </FormField>

        <FormField label="Email" required>
          {({ id, describedBy, required }) => (
            <Input
              id={id}
              name="email"
              type="email"
              autoComplete="email"
              placeholder="tu@empresa.pt"
              required={required}
              aria-describedby={describedBy}
            />
          )}
        </FormField>

        <FormField label="Palavra-passe" hint="Mínimo de 8 caracteres." required>
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

        {state.success ? (
          <p
            role="status"
            className="flex items-start gap-2 rounded-lg border border-success/40 bg-success-soft px-3.5 py-2.5 text-caption text-success-text"
          >
            {state.success}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />A
              criar conta…
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4" aria-hidden />
              Criar conta
            </>
          )}
        </Button>
      </form>

      <Link href="/login" className="block text-small text-primary hover:underline">
        ← Já tenho conta
      </Link>
    </div>
  );
}
