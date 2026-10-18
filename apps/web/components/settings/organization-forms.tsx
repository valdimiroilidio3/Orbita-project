'use client';

import * as React from 'react';

import {
  DATE_FORMATS,
  THEMES,
  TIME_FORMATS,
  UI_LOCALES,
  VOICE_LANGUAGES,
  type DateFormat,
  type Theme,
  type TimeFormat,
  type UiLocale,
  type VoiceLanguage,
} from '@orbita/shared';

import { SettingsForm, useFieldError, useSettingsForm } from '@/components/settings/settings-form';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  saveOrganizationGeneralAction,
  saveOrganizationVoiceAction,
  saveUserPreferencesAction,
} from '@/lib/server/settings-actions';

/* ---------- helpers ---------- */

function SelectField<T extends string>({
  name,
  label,
  hint,
  options,
  defaultValue,
}: {
  name: string;
  label: string;
  hint?: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  defaultValue: T;
}) {
  const [value, setValue] = React.useState<T>(defaultValue);
  const error = useFieldError(name);
  const { markDirty, pending } = useSettingsForm();
  return (
    <FormField label={label} hint={hint} error={error}>
      {({ id, describedBy, invalid }) => (
        <>
          <Select
            value={value}
            onValueChange={(next) => {
              setValue(next as T);
              markDirty();
            }}
            disabled={pending}
          >
            <SelectTrigger id={id} aria-describedby={describedBy} aria-invalid={invalid}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name={name} value={value} />
        </>
      )}
    </FormField>
  );
}

function SwitchRow({
  name,
  label,
  hint,
  defaultChecked,
  onChange,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked: boolean;
  onChange?: (checked: boolean) => void;
}) {
  const [checked, setChecked] = React.useState(defaultChecked);
  const { markDirty, pending } = useSettingsForm();
  const id = React.useId();
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-b-0">
      <div>
        <label htmlFor={id} className="text-small font-medium text-text">
          {label}
        </label>
        {hint ? <p className="text-caption text-muted">{hint}</p> : null}
      </div>
      <Switch
        id={id}
        checked={checked}
        disabled={pending}
        onCheckedChange={(next) => {
          setChecked(next);
          markDirty();
          onChange?.(next);
        }}
      />
      <input type="hidden" name={name} value={checked ? 'true' : 'false'} />
    </div>
  );
}

export { SelectField, SwitchRow };

/* ---------- Organização: geral ---------- */

const COUNTRY_HINT = 'Código ISO de 2 letras (ex.: PT, ES, BR).';

export function OrganizationGeneralForm({
  values,
  canEdit,
}: {
  values: { name: string; website: string; country: string };
  canEdit: boolean;
}) {
  return (
    <SettingsForm
      action={saveOrganizationGeneralAction}
      readOnly={!canEdit}
      readOnlyReason="Apenas owners e admins editam a organização."
    >
      <OrgNameField defaultValue={values.name} />
      <div className="grid gap-4 sm:grid-cols-2">
        <OrgWebsiteField defaultValue={values.website} />
        <OrgCountryField defaultValue={values.country} />
      </div>
    </SettingsForm>
  );
}

function OrgNameField({ defaultValue }: { defaultValue: string }) {
  const error = useFieldError('name');
  return (
    <FormField label="Nome da organização" required error={error}>
      {({ id, describedBy, invalid, required }) => (
        <Input
          id={id}
          name="name"
          defaultValue={defaultValue}
          maxLength={80}
          required={required}
          aria-invalid={invalid}
          aria-describedby={describedBy}
        />
      )}
    </FormField>
  );
}
function OrgWebsiteField({ defaultValue }: { defaultValue: string }) {
  const error = useFieldError('website');
  return (
    <FormField label="Website" hint="https://…" error={error}>
      {({ id, describedBy, invalid }) => (
        <Input
          id={id}
          name="website"
          type="url"
          defaultValue={defaultValue}
          maxLength={250}
          placeholder="https://exemplo.pt"
          aria-invalid={invalid}
          aria-describedby={describedBy}
        />
      )}
    </FormField>
  );
}
function OrgCountryField({ defaultValue }: { defaultValue: string }) {
  const error = useFieldError('country');
  return (
    <FormField label="País / região" hint={COUNTRY_HINT} error={error}>
      {({ id, describedBy, invalid }) => (
        <Input
          id={id}
          name="country"
          defaultValue={defaultValue}
          maxLength={2}
          placeholder="PT"
          className="uppercase"
          aria-invalid={invalid}
          aria-describedby={describedBy}
        />
      )}
    </FormField>
  );
}

/* ---------- Organização: voz ---------- */

const VOICE_LANGUAGE_OPTIONS = VOICE_LANGUAGES.map((value) => ({
  value,
  label: (
    {
      'pt-PT': 'Português (Portugal)',
      'pt-BR': 'Português (Brasil)',
      'en-US': 'Inglês (EUA)',
      'en-GB': 'Inglês (Reino Unido)',
      'es-ES': 'Espanhol (Espanha)',
      'fr-FR': 'Francês (França)',
    } as Record<VoiceLanguage, string>
  )[value],
}));

export function OrganizationVoiceForm({
  values,
  canEdit,
}: {
  values: {
    default_language: VoiceLanguage;
    max_call_duration_seconds: number | null;
    recording_enabled: boolean;
    retention_days: number | null;
  };
  canEdit: boolean;
}) {
  return (
    <SettingsForm
      action={saveOrganizationVoiceAction}
      readOnly={!canEdit}
      readOnlyReason="Apenas owners e admins editam as definições de voz."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          name="default_language"
          label="Idioma predefinido"
          hint="Usado quando um agente não define idioma próprio."
          options={VOICE_LANGUAGE_OPTIONS}
          defaultValue={values.default_language}
        />
        <DurationField defaultValue={values.max_call_duration_seconds} />
      </div>
      <RecordingFields
        recordingEnabled={values.recording_enabled}
        retentionDays={values.retention_days}
      />
    </SettingsForm>
  );
}

function DurationField({ defaultValue }: { defaultValue: number | null }) {
  const error = useFieldError('max_call_duration_seconds');
  return (
    <FormField
      label="Duração máxima por chamada (segundos)"
      hint="Entre 60 e 3600. Vazio = sem limite da organização."
      error={error}
    >
      {({ id, describedBy, invalid }) => (
        <Input
          id={id}
          name="max_call_duration_seconds"
          type="number"
          inputMode="numeric"
          min={60}
          max={3600}
          step={30}
          defaultValue={defaultValue ?? ''}
          aria-invalid={invalid}
          aria-describedby={describedBy}
        />
      )}
    </FormField>
  );
}

function RecordingFields({
  recordingEnabled,
  retentionDays,
}: {
  recordingEnabled: boolean;
  retentionDays: number | null;
}) {
  const [enabled, setEnabled] = React.useState(recordingEnabled);
  const error = useFieldError('recording_enabled');
  const retentionError = useFieldError('retention_days');
  const { markDirty } = useSettingsForm();
  const consentId = React.useId();
  return (
    <div className="rounded-xl border border-border p-4">
      <SwitchRow
        name="recording_enabled"
        label="Gravação de chamadas"
        hint="Desativada por defeito. Nenhuma gravação é feita enquanto não existir fornecedor de voz ativo — esta é a política da organização."
        defaultChecked={recordingEnabled}
        onChange={setEnabled}
      />
      {enabled ? (
        <div className="mt-3 space-y-3">
          <div className="flex items-start gap-2">
            <Checkbox id={consentId} name="recording_consent" onCheckedChange={markDirty} />
            <label htmlFor={consentId} className="text-caption text-text">
              Confirmo que a organização informa os interlocutores e cumpre as obrigações legais de
              consentimento aplicáveis à gravação.
            </label>
          </div>
          {error ? (
            <p className="text-caption font-medium text-danger-text" role="alert">
              {error}
            </p>
          ) : null}
          <FormField
            label="Retenção (dias)"
            hint="Entre 1 e 3650. Vazio = sem política definida."
            error={retentionError}
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="retention_days"
                type="number"
                inputMode="numeric"
                min={1}
                max={3650}
                defaultValue={retentionDays ?? ''}
                className="max-w-[200px]"
                aria-invalid={invalid}
                aria-describedby={describedBy}
              />
            )}
          </FormField>
        </div>
      ) : (
        <input type="hidden" name="retention_days" value={retentionDays ?? ''} />
      )}
    </div>
  );
}

/* ---------- Preferências pessoais ---------- */

const LOCALE_OPTIONS: ReadonlyArray<{ value: UiLocale; label: string }> = UI_LOCALES.map((v) => ({
  value: v,
  label: v === 'pt-PT' ? 'Português (Portugal)' : 'English (interface ainda em PT-PT)',
}));
const THEME_OPTIONS: ReadonlyArray<{ value: Theme; label: string }> = THEMES.map((v) => ({
  value: v,
  label: v === 'light' ? 'Claro' : v === 'dark' ? 'Escuro (ainda não aplicado)' : 'Sistema',
}));
const DATE_OPTIONS: ReadonlyArray<{ value: DateFormat; label: string }> = DATE_FORMATS.map((v) => ({
  value: v,
  label: v,
}));
const TIME_OPTIONS: ReadonlyArray<{ value: TimeFormat; label: string }> = TIME_FORMATS.map((v) => ({
  value: v,
  label: v === '24h' ? '24 horas' : '12 horas (AM/PM)',
}));

export function UserPreferencesForm({
  values,
  readOnly,
}: {
  values: {
    locale: UiLocale;
    timezone: string;
    theme: Theme;
    date_format: DateFormat;
    time_format: TimeFormat;
  };
  readOnly: boolean;
}) {
  return (
    <SettingsForm
      action={saveUserPreferencesAction}
      readOnly={readOnly}
      readOnlyReason="Supabase não configurado."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          name="locale"
          label="Idioma da interface"
          options={LOCALE_OPTIONS}
          defaultValue={values.locale}
          hint="A tradução para inglês ainda não está disponível; a preferência é guardada."
        />
        <TimezoneField defaultValue={values.timezone} />
        <SelectField
          name="theme"
          label="Tema"
          options={THEME_OPTIONS}
          defaultValue={values.theme}
          hint="O tema escuro ainda não é aplicado pela interface."
        />
        <SelectField
          name="date_format"
          label="Formato de data"
          options={DATE_OPTIONS}
          defaultValue={values.date_format}
        />
        <SelectField
          name="time_format"
          label="Formato de hora"
          options={TIME_OPTIONS}
          defaultValue={values.time_format}
        />
      </div>
    </SettingsForm>
  );
}

function TimezoneField({ defaultValue }: { defaultValue: string }) {
  const error = useFieldError('timezone');
  return (
    <FormField
      label="Fuso horário pessoal (IANA)"
      hint="Ex.: Europe/Lisbon. Afeta a apresentação de horas para ti; marcações usam o fuso da organização."
      error={error}
      required
    >
      {({ id, describedBy, invalid, required }) => (
        <Input
          id={id}
          name="timezone"
          defaultValue={defaultValue}
          maxLength={64}
          required={required}
          aria-invalid={invalid}
          aria-describedby={describedBy}
        />
      )}
    </FormField>
  );
}
