'use client';

import { AlertCircle, CheckCircle2, Loader2, Save } from 'lucide-react';
import { useActionState } from 'react';

import { saveBusinessProfileAction } from '@/lib/server/tool-actions';
import { INITIAL_TOOL_STATE } from '@/lib/server/tool-form-state';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export interface BusinessProfileValues {
  displayName: string;
  timezone: string;
  address: string;
  phone: string;
  email: string;
  prices: string;
  faq: string;
  policies: string;
  hoursText: string;
  servicesText: string;
}

/**
 * Perfil público da empresa — dados autorizados consultados pelas
 * ferramentas de informação/disponibilidade/marcações.
 */
export function BusinessProfileForm({ values }: { values: BusinessProfileValues }) {
  const [state, formAction, pending] = useActionState(saveBusinessProfileAction, INITIAL_TOOL_STATE);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Nome apresentado" required>
          {({ id, describedBy, required }) => (
            <Input id={id} name="displayName" defaultValue={values.displayName} maxLength={120} required={required} aria-describedby={describedBy} />
          )}
        </FormField>
        <FormField label="Fuso horário (IANA)" hint="Ex.: Europe/Lisbon">
          {({ id, describedBy }) => (
            <Input id={id} name="timezone" defaultValue={values.timezone || 'Europe/Lisbon'} maxLength={64} aria-describedby={describedBy} />
          )}
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Morada">
          {({ id }) => <Input id={id} name="address" defaultValue={values.address} maxLength={300} />}
        </FormField>
        <FormField label="Telefone público">
          {({ id }) => <Input id={id} name="phone" defaultValue={values.phone} maxLength={32} />}
        </FormField>
        <FormField label="Email público">
          {({ id }) => <Input id={id} name="email" type="email" defaultValue={values.email} maxLength={254} />}
        </FormField>
      </div>

      <FormField
        label="Horário (texto compacto)"
        hint="Ex.: seg:09:00-13:00,14:00-18:00; ter:09:00-18:00; sab:fechado; dom:fechado"
      >
        {({ id, describedBy }) => (
          <Textarea id={id} name="hoursText" rows={2} defaultValue={values.hoursText} maxLength={1000} aria-describedby={describedBy} className="font-mono text-caption" />
        )}
      </FormField>

      <FormField
        label="Serviços (uma linha por serviço)"
        hint="Nome | duração_min | preço — ex.: Consulta geral | 30 | 25€"
      >
        {({ id, describedBy }) => (
          <Textarea id={id} name="servicesText" rows={3} defaultValue={values.servicesText} maxLength={2000} aria-describedby={describedBy} className="font-mono text-caption" />
        )}
      </FormField>

      <FormField label="Preços publicados">
        {({ id }) => <Textarea id={id} name="prices" rows={2} defaultValue={values.prices} maxLength={2000} />}
      </FormField>
      <FormField label="Perguntas frequentes">
        {({ id }) => <Textarea id={id} name="faq" rows={3} defaultValue={values.faq} maxLength={4000} />}
      </FormField>
      <FormField label="Políticas de atendimento">
        {({ id }) => <Textarea id={id} name="policies" rows={2} defaultValue={values.policies} maxLength={2000} />}
      </FormField>

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
        Guardar perfil público
      </Button>
    </form>
  );
}
