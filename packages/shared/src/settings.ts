import { z } from 'zod';

import type { OrganizationRole } from './domain';

/* ------------------------------------------------------------------ */
/* Entidades (migração 0006)                                            */
/* ------------------------------------------------------------------ */

export const UI_LOCALES = ['pt-PT', 'en'] as const;
export type UiLocale = (typeof UI_LOCALES)[number];

export const THEMES = ['light', 'dark', 'system'] as const;
export type Theme = (typeof THEMES)[number];

export const DATE_FORMATS = ['dd/MM/yyyy', 'yyyy-MM-dd'] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];

export const TIME_FORMATS = ['24h', '12h'] as const;
export type TimeFormat = (typeof TIME_FORMATS)[number];

export const VOICE_LANGUAGES = ['pt-PT', 'pt-BR', 'en-US', 'en-GB', 'es-ES', 'fr-FR'] as const;
export type VoiceLanguage = (typeof VOICE_LANGUAGES)[number];

export interface UserPreferences {
  user_id: string;
  locale: UiLocale;
  timezone: string;
  theme: Theme;
  date_format: DateFormat;
  time_format: TimeFormat;
  notify_failed_calls: boolean;
  notify_activity_digest: boolean;
  notify_usage_reports: boolean;
  notify_integration_alerts: boolean;
  notify_platform_updates: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationSettings {
  organization_id: string;
  website: string | null;
  country: string | null;
  default_language: VoiceLanguage;
  max_call_duration_seconds: number | null;
  recording_enabled: boolean;
  retention_days: number | null;
  notify_failed_calls: boolean;
  notify_integration_alerts: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  user_id: string;
  email: string;
  display_name: string | null;
  role: OrganizationRole;
  joined_at: string;
}

export const DEFAULT_USER_PREFERENCES: Omit<
  UserPreferences,
  'user_id' | 'created_at' | 'updated_at'
> = {
  locale: 'pt-PT',
  timezone: 'Europe/Lisbon',
  theme: 'system',
  date_format: 'dd/MM/yyyy',
  time_format: '24h',
  notify_failed_calls: true,
  notify_activity_digest: false,
  notify_usage_reports: false,
  notify_integration_alerts: true,
  notify_platform_updates: true,
};

export const DEFAULT_ORGANIZATION_SETTINGS: Omit<
  OrganizationSettings,
  'organization_id' | 'updated_by' | 'created_at' | 'updated_at'
> = {
  website: null,
  country: null,
  default_language: 'pt-PT',
  max_call_duration_seconds: null,
  recording_enabled: false,
  retention_days: null,
  notify_failed_calls: true,
  notify_integration_alerts: true,
};

/* ------------------------------------------------------------------ */
/* Validação                                                            */
/* ------------------------------------------------------------------ */

export function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('pt-PT', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export const timezoneSchema = z
  .string()
  .trim()
  .min(1, 'Fuso horário obrigatório')
  .max(64)
  .refine(isValidTimeZone, 'Fuso horário IANA inválido (ex.: Europe/Lisbon)');

export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Mínimo 2 caracteres')
    .max(80, 'Máximo 80 caracteres')
    .regex(/^[^<>{}]*$/, 'Caracteres não permitidos'),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const changeEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email inválido').max(254),
});

export const changePasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .max(72, 'Máximo 72 caracteres')
      .regex(/[A-Za-z]/, 'Tem de incluir letras')
      .regex(/\d/, 'Tem de incluir números'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As palavras-passe não coincidem',
    path: ['confirmPassword'],
  });

export const userPreferencesSchema = z.object({
  locale: z.enum(UI_LOCALES),
  timezone: timezoneSchema,
  theme: z.enum(THEMES),
  date_format: z.enum(DATE_FORMATS),
  time_format: z.enum(TIME_FORMATS),
});
export type UserPreferencesInput = z.infer<typeof userPreferencesSchema>;

export const userNotificationSchema = z.object({
  notify_failed_calls: z.boolean(),
  notify_activity_digest: z.boolean(),
  notify_usage_reports: z.boolean(),
  notify_integration_alerts: z.boolean(),
  notify_platform_updates: z.boolean(),
});
export type UserNotificationInput = z.infer<typeof userNotificationSchema>;

export const organizationGeneralSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Mínimo 2 caracteres')
    .max(80, 'Máximo 80 caracteres')
    .regex(/^[^<>{}]*$/, 'Caracteres não permitidos'),
  website: z
    .string()
    .trim()
    .max(250)
    .transform((value) => (value === '' ? null : value))
    .refine((value) => value === null || /^https?:\/\/[^\s]{1,250}$/i.test(value), {
      message: 'Website deve começar por http:// ou https://',
    })
    .nullable()
    .optional(),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .transform((value) => (value === '' ? null : value))
    .refine((value) => value === null || /^[A-Z]{2}$/.test(value), {
      message: 'Código de país ISO-3166 de 2 letras (ex.: PT)',
    })
    .nullable()
    .optional(),
});
export type OrganizationGeneralInput = z.infer<typeof organizationGeneralSchema>;

export const organizationVoiceSchema = z.object({
  default_language: z.enum(VOICE_LANGUAGES),
  max_call_duration_seconds: z
    .union([z.literal(''), z.coerce.number().int().min(60).max(3600)])
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional(),
  recording_enabled: z.boolean(),
  retention_days: z
    .union([z.literal(''), z.coerce.number().int().min(1).max(3650)])
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional(),
});
export type OrganizationVoiceInput = z.infer<typeof organizationVoiceSchema>;

export const organizationNotificationSchema = z.object({
  notify_failed_calls: z.boolean(),
  notify_integration_alerts: z.boolean(),
});

/* ------------------------------------------------------------------ */
/* Regras de membros (espelham memberships_guard — avaliadas no servidor */
/* ANTES da BD para mensagens claras; a BD continua a ser a barreira)     */
/* ------------------------------------------------------------------ */

export type MemberActionDenial =
  | 'not_authorized'
  | 'self_role_change'
  | 'owner_only_assigns_owner'
  | 'owner_only_edits_owner'
  | 'last_owner'
  | 'owner_only_removes_owner';

export interface MemberActionContext {
  actorRole: OrganizationRole;
  actorId: string;
  target: { userId: string; role: OrganizationRole };
  ownerCount: number;
}

export function evaluateRoleChange(
  context: MemberActionContext,
  newRole: OrganizationRole,
): { allowed: true } | { allowed: false; reason: MemberActionDenial } {
  if (context.actorRole === 'member') return { allowed: false, reason: 'not_authorized' };
  if (context.target.userId === context.actorId) {
    return { allowed: false, reason: 'self_role_change' };
  }
  if (newRole === 'owner' && context.actorRole !== 'owner') {
    return { allowed: false, reason: 'owner_only_assigns_owner' };
  }
  if (context.target.role === 'owner' && context.actorRole !== 'owner') {
    return { allowed: false, reason: 'owner_only_edits_owner' };
  }
  if (context.target.role === 'owner' && newRole !== 'owner' && context.ownerCount <= 1) {
    return { allowed: false, reason: 'last_owner' };
  }
  return { allowed: true };
}

export function evaluateRemoval(
  context: MemberActionContext,
): { allowed: true } | { allowed: false; reason: MemberActionDenial } {
  const isSelf = context.target.userId === context.actorId;
  if (!isSelf && context.actorRole === 'member') {
    return { allowed: false, reason: 'not_authorized' };
  }
  if (context.target.role === 'owner') {
    if (context.ownerCount <= 1) return { allowed: false, reason: 'last_owner' };
    if (context.actorRole !== 'owner')
      return { allowed: false, reason: 'owner_only_removes_owner' };
  }
  return { allowed: true };
}

export const MEMBER_DENIAL_MESSAGES: Record<MemberActionDenial, string> = {
  not_authorized: 'Sem permissão para gerir membros.',
  self_role_change: 'Não é possível alterar o teu próprio papel.',
  owner_only_assigns_owner: 'Apenas um owner pode atribuir o papel owner.',
  owner_only_edits_owner: 'Apenas um owner pode alterar o papel de outro owner.',
  last_owner: 'A organização tem de manter pelo menos um owner.',
  owner_only_removes_owner: 'Apenas um owner pode remover outro owner.',
};

export const ROLE_LABELS: Record<OrganizationRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Membro',
};
