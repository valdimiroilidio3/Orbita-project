'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  MEMBER_DENIAL_MESSAGES,
  ORGANIZATION_ROLES,
  changeEmailSchema,
  changePasswordSchema,
  evaluateRemoval,
  evaluateRoleChange,
  organizationGeneralSchema,
  organizationNotificationSchema,
  organizationVoiceSchema,
  profileSchema,
  userNotificationSchema,
  userPreferencesSchema,
  type OrganizationRole,
} from '@orbita/shared';
import type { ZodError } from 'zod';

import { isSupabaseConfigured } from '@/lib/env';
import { log } from '@/lib/observability/logger';
import { getActiveOrganization } from '@/lib/server/organizations';
import { requireUser } from '@/lib/server/session';
import type { SettingsFormState } from '@/lib/server/settings-form-state';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Server actions das definições.
 * Regras: sessão obrigatória → organização ativa (cookie validado por
 * membership) → papel verificado no servidor → Zod → Supabase sob RLS.
 * A UI nunca é barreira; a BD (RLS + triggers) é a última linha.
 */

const NOT_CONFIGURED = 'Supabase não configurado — não é possível guardar.';
const ADMIN_ROLES: OrganizationRole[] = ['owner', 'admin'];

function fieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

function bool(formData: FormData, key: string): boolean {
  return formData.get(key) === 'on' || formData.get(key) === 'true';
}

async function requireAdminOrganization() {
  const user = await requireUser();
  const organization = await getActiveOrganization();
  if (!organization) return { user, organization: null, allowed: false as const };
  return {
    user,
    organization,
    allowed: ADMIN_ROLES.includes(organization.role),
  };
}

/* ---------------- Perfil ---------------- */

export async function updateProfileAction(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED, success: null };
  await requireUser();
  const parsed = profileSchema.safeParse({ name: str(formData, 'name') });
  if (!parsed.success) {
    return {
      error: 'Corrige os campos assinalados.',
      success: null,
      fieldErrors: fieldErrors(parsed.error),
    };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ data: { name: parsed.data.name } });
  if (error) return { error: 'Não foi possível guardar o perfil.', success: null };
  revalidatePath('/', 'layout');
  return { error: null, success: 'Perfil atualizado.' };
}

/**
 * Alteração de email: o Supabase envia confirmação para o novo endereço
 * (e, conforme configuração do projeto, também para o atual). O email só
 * muda após confirmação — a UI explica isto; nunca é uma edição direta.
 */
export async function requestEmailChangeAction(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED, success: null };
  const user = await requireUser();
  const parsed = changeEmailSchema.safeParse({ email: str(formData, 'email') });
  if (!parsed.success) {
    return {
      error: 'Corrige os campos assinalados.',
      success: null,
      fieldErrors: fieldErrors(parsed.error),
    };
  }
  if (parsed.data.email === (user.email ?? '').toLowerCase()) {
    return { error: null, success: null, fieldErrors: { email: 'É o email atual.' } };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ email: parsed.data.email });
  if (error) {
    // Mensagem genérica: não revelar se o email já existe (enumeração).
    return {
      error: 'Não foi possível iniciar a alteração de email. Tenta mais tarde.',
      success: null,
    };
  }
  revalidatePath('/settings/profile');
  return {
    error: null,
    success: 'Enviámos um email de confirmação. O endereço só muda depois de confirmares.',
  };
}

/* ---------------- Segurança ---------------- */

export async function changePasswordAction(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED, success: null };
  await requireUser();
  const parsed = changePasswordSchema.safeParse({
    password: str(formData, 'password'),
    confirmPassword: str(formData, 'confirmPassword'),
  });
  if (!parsed.success) {
    return {
      error: 'Corrige os campos assinalados.',
      success: null,
      fieldErrors: fieldErrors(parsed.error),
    };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    // Supabase pode exigir reautenticação recente (AAL/`reauthentication`).
    return {
      error:
        'Não foi possível alterar a palavra-passe. Se iniciaste sessão há muito tempo, termina a sessão e volta a entrar.',
      success: null,
    };
  }
  return { error: null, success: 'Palavra-passe alterada.' };
}

export async function signOutEverywhereAction(): Promise<void> {
  if (!isSupabaseConfigured()) redirect('/login');
  const supabase = await createSupabaseServerClient();
  // `global` revoga todos os refresh tokens do utilizador (todas as sessões).
  await supabase.auth.signOut({ scope: 'global' });
  redirect('/login?notice=sessoes_terminadas');
}

/* ---------------- Preferências pessoais ---------------- */

export async function saveUserPreferencesAction(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED, success: null };
  const user = await requireUser();
  const parsed = userPreferencesSchema.safeParse({
    locale: str(formData, 'locale'),
    timezone: str(formData, 'timezone'),
    theme: str(formData, 'theme'),
    date_format: str(formData, 'date_format'),
    time_format: str(formData, 'time_format'),
  });
  if (!parsed.success) {
    return {
      error: 'Corrige os campos assinalados.',
      success: null,
      fieldErrors: fieldErrors(parsed.error),
    };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('user_preferences')
    .upsert({ user_id: user.id, ...parsed.data }, { onConflict: 'user_id' });
  if (error) return { error: persistenceMessage(error.message), success: null };
  revalidatePath('/settings', 'layout');
  return { error: null, success: 'Preferências guardadas.' };
}

export async function saveUserNotificationsAction(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED, success: null };
  const user = await requireUser();
  const parsed = userNotificationSchema.safeParse({
    notify_failed_calls: bool(formData, 'notify_failed_calls'),
    notify_activity_digest: bool(formData, 'notify_activity_digest'),
    notify_usage_reports: bool(formData, 'notify_usage_reports'),
    notify_integration_alerts: bool(formData, 'notify_integration_alerts'),
    notify_platform_updates: bool(formData, 'notify_platform_updates'),
  });
  if (!parsed.success) return { error: 'Dados inválidos.', success: null };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('user_preferences')
    .upsert({ user_id: user.id, ...parsed.data }, { onConflict: 'user_id' });
  if (error) return { error: persistenceMessage(error.message), success: null };
  revalidatePath('/settings/notifications');
  return { error: null, success: 'Preferências de notificação guardadas.' };
}

/* ---------------- Organização ---------------- */

export async function saveOrganizationGeneralAction(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED, success: null };
  const { user, organization, allowed } = await requireAdminOrganization();
  if (!organization) return { error: 'Sem organização ativa.', success: null };
  if (!allowed) return { error: 'Apenas owners e admins editam a organização.', success: null };

  const parsed = organizationGeneralSchema.safeParse({
    name: str(formData, 'name'),
    website: str(formData, 'website'),
    country: str(formData, 'country'),
  });
  if (!parsed.success) {
    return {
      error: 'Corrige os campos assinalados.',
      success: null,
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createSupabaseServerClient();
  if (parsed.data.name !== organization.name) {
    const { error } = await supabase
      .from('organizations')
      .update({ name: parsed.data.name })
      .eq('id', organization.id);
    if (error) return { error: persistenceMessage(error.message), success: null };
  }
  const { error } = await supabase.from('organization_settings').upsert(
    {
      organization_id: organization.id,
      website: parsed.data.website ?? null,
      country: parsed.data.country ?? null,
      updated_by: user.id,
    },
    { onConflict: 'organization_id' },
  );
  if (error) return { error: persistenceMessage(error.message), success: null };

  log('info', 'settings.organization_updated', {
    organizationId: organization.id,
    actorId: user.id,
  });
  revalidatePath('/', 'layout');
  return { error: null, success: 'Organização atualizada.' };
}

export async function saveOrganizationVoiceAction(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED, success: null };
  const { user, organization, allowed } = await requireAdminOrganization();
  if (!organization) return { error: 'Sem organização ativa.', success: null };
  if (!allowed)
    return { error: 'Apenas owners e admins editam as definições de voz.', success: null };

  const parsed = organizationVoiceSchema.safeParse({
    default_language: str(formData, 'default_language'),
    max_call_duration_seconds: str(formData, 'max_call_duration_seconds'),
    recording_enabled: bool(formData, 'recording_enabled'),
    retention_days: str(formData, 'retention_days'),
  });
  if (!parsed.success) {
    return {
      error: 'Corrige os campos assinalados.',
      success: null,
      fieldErrors: fieldErrors(parsed.error),
    };
  }
  // Gravação exige confirmação explícita adicional (checkbox separada).
  if (parsed.data.recording_enabled && !bool(formData, 'recording_consent')) {
    return {
      error: null,
      success: null,
      fieldErrors: {
        recording_enabled: 'Confirma que cumpres as obrigações legais de aviso e consentimento.',
      },
    };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('organization_settings').upsert(
    {
      organization_id: organization.id,
      default_language: parsed.data.default_language,
      max_call_duration_seconds: parsed.data.max_call_duration_seconds ?? null,
      recording_enabled: parsed.data.recording_enabled,
      retention_days: parsed.data.retention_days ?? null,
      updated_by: user.id,
    },
    { onConflict: 'organization_id' },
  );
  if (error) return { error: persistenceMessage(error.message), success: null };
  log('info', 'settings.voice_updated', {
    organizationId: organization.id,
    actorId: user.id,
    recordingEnabled: parsed.data.recording_enabled,
  });
  revalidatePath('/settings/voice');
  return { error: null, success: 'Definições de voz guardadas.' };
}

export async function saveOrganizationNotificationsAction(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED, success: null };
  const { user, organization, allowed } = await requireAdminOrganization();
  if (!organization) return { error: 'Sem organização ativa.', success: null };
  if (!allowed)
    return {
      error: 'Apenas owners e admins editam as notificações da organização.',
      success: null,
    };
  const parsed = organizationNotificationSchema.safeParse({
    notify_failed_calls: bool(formData, 'notify_failed_calls'),
    notify_integration_alerts: bool(formData, 'notify_integration_alerts'),
  });
  if (!parsed.success) return { error: 'Dados inválidos.', success: null };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('organization_settings')
    .upsert(
      { organization_id: organization.id, ...parsed.data, updated_by: user.id },
      { onConflict: 'organization_id' },
    );
  if (error) return { error: persistenceMessage(error.message), success: null };
  revalidatePath('/settings/notifications');
  return { error: null, success: 'Notificações da organização guardadas.' };
}

/* ---------------- Membros ---------------- */

async function memberContext(targetUserId: string) {
  const user = await requireUser();
  const organization = await getActiveOrganization();
  if (!organization) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('memberships')
    .select('user_id, role')
    .eq('organization_id', organization.id);
  if (error) return null;
  const rows = (data ?? []) as Array<{ user_id: string; role: OrganizationRole }>;
  const target = rows.find((row) => row.user_id === targetUserId);
  if (!target) return { user, organization, supabase, target: null, ownerCount: 0 };
  return {
    user,
    organization,
    supabase,
    target,
    ownerCount: rows.filter((row) => row.role === 'owner').length,
  };
}

export async function changeMemberRoleAction(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED, success: null };
  const targetUserId = str(formData, 'userId');
  const newRole = str(formData, 'role');
  if (!ORGANIZATION_ROLES.includes(newRole as OrganizationRole)) {
    return { error: 'Papel inválido.', success: null };
  }
  const ctx = await memberContext(targetUserId);
  if (!ctx) return { error: 'Sem organização ativa.', success: null };
  if (!ctx.target) return { error: 'Membro não encontrado nesta organização.', success: null };

  const decision = evaluateRoleChange(
    {
      actorRole: ctx.organization.role,
      actorId: ctx.user.id,
      target: { userId: ctx.target.user_id, role: ctx.target.role },
      ownerCount: ctx.ownerCount,
    },
    newRole as OrganizationRole,
  );
  if (!decision.allowed) return { error: MEMBER_DENIAL_MESSAGES[decision.reason], success: null };

  const { error } = await ctx.supabase
    .from('memberships')
    .update({ role: newRole as OrganizationRole })
    .eq('organization_id', ctx.organization.id)
    .eq('user_id', targetUserId);
  if (error) return { error: persistenceMessage(error.message), success: null };
  log('info', 'settings.member_role_changed', {
    organizationId: ctx.organization.id,
    actorId: ctx.user.id,
    targetId: targetUserId,
    role: newRole,
  });
  revalidatePath('/settings/members');
  return { error: null, success: 'Papel atualizado.' };
}

export async function removeMemberAction(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED, success: null };
  const targetUserId = str(formData, 'userId');
  if (str(formData, 'confirm') !== 'remover') {
    return { error: 'Confirmação em falta.', success: null };
  }
  const ctx = await memberContext(targetUserId);
  if (!ctx) return { error: 'Sem organização ativa.', success: null };
  if (!ctx.target) return { error: 'Membro não encontrado nesta organização.', success: null };

  const decision = evaluateRemoval({
    actorRole: ctx.organization.role,
    actorId: ctx.user.id,
    target: { userId: ctx.target.user_id, role: ctx.target.role },
    ownerCount: ctx.ownerCount,
  });
  if (!decision.allowed) return { error: MEMBER_DENIAL_MESSAGES[decision.reason], success: null };

  const { error } = await ctx.supabase
    .from('memberships')
    .delete()
    .eq('organization_id', ctx.organization.id)
    .eq('user_id', targetUserId);
  if (error) return { error: persistenceMessage(error.message), success: null };
  log('info', 'settings.member_removed', {
    organizationId: ctx.organization.id,
    actorId: ctx.user.id,
    targetId: targetUserId,
  });
  if (targetUserId === ctx.user.id) {
    redirect('/onboarding?notice=saiu_da_organizacao');
  }
  revalidatePath('/settings/members');
  return { error: null, success: 'Membro removido.' };
}

/* ---------------- util ---------------- */

function persistenceMessage(detail: string): string {
  if (/relation .* does not exist|schema cache/i.test(detail)) {
    return 'A migração 0006 (definições) ainda não foi aplicada na base de dados.';
  }
  if (/membership:/.test(detail)) {
    // Mensagens das triggers de integridade são seguras e úteis.
    return detail.replace(/^.*membership:\s*/, '');
  }
  return 'Não foi possível guardar. Tenta novamente.';
}
