'use client';

import { AlertCircle, Building2, Loader2 } from 'lucide-react';
import { useActionState, useState } from 'react';

import { createOrganizationAction } from '@/lib/server/actions';
import { INITIAL_AUTH_STATE } from '@/lib/server/auth-form-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

/**
 * Onboarding: criar a primeira organização.
 * O fluxo é transacional no servidor (RPC create_organization):
 * o criador fica sempre como owner, atribuído pela base de dados.
 */
export default function OnboardingPage() {
  const [state, formAction, pending] = useActionState(createOrganizationAction, INITIAL_AUTH_STATE);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <p className="flex items-center gap-2 text-caption font-semibold uppercase tracking-widest text-primary">
          <Badge variant="accent">Passo 1 de 1</Badge>
          Configuração inicial
        </p>
        <h1 className="mt-3 text-h1">Cria a tua organização</h1>
        <p className="mt-1 text-small text-muted">
          Uma organização (workspace) agrupa a tua equipa, os agentes de voz e as chamadas. Ficas
          como <strong>owner</strong> — podes convidar membros mais tarde.
        </p>
      </div>

      <form action={formAction} className="space-y-4" noValidate>
        <FormField label="Nome da organização" hint="Visível para todos os membros." required>
          {({ id, describedBy, required }) => (
            <Input
              id={id}
              name="name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (!slugTouched) setSlug(slugify(event.target.value));
              }}
              placeholder="Ex.: Clínica São João"
              maxLength={120}
              required={required}
              aria-describedby={describedBy}
            />
          )}
        </FormField>

        <FormField
          label="Slug"
          hint="Identificador único (letras minúsculas, números e hífens). Usado em URLs."
          required
        >
          {({ id, describedBy, required }) => (
            <Input
              id={id}
              name="slug"
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value);
              }}
              placeholder="clinica-sao-joao"
              maxLength={48}
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

        <Button type="submit" size="lg" className="w-full" disabled={pending} aria-busy={pending}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />A criar organização…
            </>
          ) : (
            <>
              <Building2 className="h-4 w-4" aria-hidden />
              Criar organização
            </>
          )}
        </Button>

        <p className="text-caption leading-relaxed text-muted">
          A criação é atómica no servidor: a organização e o teu acesso como owner são criados na
          mesma transação — ou nada é criado.
        </p>
      </form>
    </div>
  );
}
