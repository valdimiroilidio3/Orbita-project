'use client';

import { SettingsForm, useFieldError } from '@/components/settings/settings-form';
import { FormField } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { requestEmailChangeAction, updateProfileAction } from '@/lib/server/settings-actions';

function NameField({ defaultValue }: { defaultValue: string }) {
  const error = useFieldError('name');
  return (
    <FormField
      label="Nome de apresentação"
      required
      error={error}
      hint="Visível para a tua equipa."
    >
      {({ id, describedBy, invalid, required }) => (
        <Input
          id={id}
          name="name"
          defaultValue={defaultValue}
          maxLength={80}
          autoComplete="name"
          required={required}
          aria-invalid={invalid}
          aria-describedby={describedBy}
        />
      )}
    </FormField>
  );
}

export function ProfileNameForm({ name, readOnly }: { name: string; readOnly: boolean }) {
  return (
    <SettingsForm
      action={updateProfileAction}
      readOnly={readOnly}
      readOnlyReason="Supabase não configurado."
    >
      <NameField defaultValue={name} />
    </SettingsForm>
  );
}

function EmailField({ currentEmail }: { currentEmail: string }) {
  const error = useFieldError('email');
  return (
    <FormField
      label="Novo email"
      required
      error={error}
      hint={`Email atual: ${currentEmail}. A alteração só é aplicada após confirmação no novo endereço.`}
    >
      {({ id, describedBy, invalid, required }) => (
        <Input
          id={id}
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          required={required}
          aria-invalid={invalid}
          aria-describedby={describedBy}
        />
      )}
    </FormField>
  );
}

export function ProfileEmailForm({
  currentEmail,
  readOnly,
}: {
  currentEmail: string;
  readOnly: boolean;
}) {
  return (
    <SettingsForm
      action={requestEmailChangeAction}
      submitLabel="Enviar confirmação"
      readOnly={readOnly}
      readOnlyReason="Supabase não configurado."
    >
      <EmailField currentEmail={currentEmail} />
    </SettingsForm>
  );
}
