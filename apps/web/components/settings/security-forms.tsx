'use client';

import { LogOut } from 'lucide-react';
import * as React from 'react';

import { SettingsForm, useFieldError } from '@/components/settings/settings-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FormField } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { signOutAction } from '@/lib/server/actions';
import { changePasswordAction, signOutEverywhereAction } from '@/lib/server/settings-actions';

function PasswordFields() {
  const passwordError = useFieldError('password');
  const confirmError = useFieldError('confirmPassword');
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        label="Nova palavra-passe"
        required
        error={passwordError}
        hint="Mínimo 8 caracteres, com letras e números."
      >
        {({ id, describedBy, invalid, required }) => (
          <Input
            id={id}
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            required={required}
            aria-invalid={invalid}
            aria-describedby={describedBy}
          />
        )}
      </FormField>
      <FormField label="Confirmar palavra-passe" required error={confirmError}>
        {({ id, describedBy, invalid, required }) => (
          <Input
            id={id}
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            required={required}
            aria-invalid={invalid}
            aria-describedby={describedBy}
          />
        )}
      </FormField>
    </div>
  );
}

export function ChangePasswordForm({ readOnly }: { readOnly: boolean }) {
  return (
    <SettingsForm
      action={changePasswordAction}
      submitLabel="Alterar palavra-passe"
      readOnly={readOnly}
      readOnlyReason="Supabase não configurado."
      cancelable={false}
    >
      <PasswordFields />
    </SettingsForm>
  );
}

/** Ações críticas com confirmação explícita. */
export function CriticalActions({ configured }: { configured: boolean }) {
  return (
    <div className="divide-y divide-border">
      <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-small font-medium text-text">Terminar sessão neste dispositivo</p>
          <p className="text-caption text-muted">Voltas ao ecrã de início de sessão.</p>
        </div>
        <form action={signOutAction}>
          <Button type="submit" variant="outline">
            <LogOut className="h-4 w-4" aria-hidden />
            Terminar sessão
          </Button>
        </form>
      </div>

      <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-small font-medium text-text">
            Terminar sessão em todos os dispositivos
          </p>
          <p className="text-caption text-muted">
            Revoga todos os tokens de sessão da tua conta (Supabase Auth, âmbito global).
          </p>
        </div>
        <ConfirmDialog
          title="Terminar todas as sessões?"
          description="Todos os dispositivos onde tens sessão iniciada terão de voltar a autenticar-se, incluindo este."
          triggerLabel="Terminar todas"
          confirmLabel="Sim, terminar todas"
          action={signOutEverywhereAction}
          disabled={!configured}
        />
      </div>
    </div>
  );
}

function ConfirmDialog({
  title,
  description,
  triggerLabel,
  confirmLabel,
  action,
  disabled,
}: {
  title: string;
  description: string;
  triggerLabel: string;
  confirmLabel: string;
  action: () => Promise<void>;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="destructive" disabled={disabled}>
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form action={action}>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive">
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
