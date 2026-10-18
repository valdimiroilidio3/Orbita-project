import {
  DEFAULT_ORGANIZATION_SETTINGS,
  DEFAULT_USER_PREFERENCES,
  type OrganizationMember,
  type OrganizationSettings,
  type UserPreferences,
} from '@orbita/shared';

import { isSupabaseConfigured } from '@/lib/env';
import { buildIntegrationStatuses } from '@/lib/integrations/status';
import { getActiveOrganization, type ActiveOrganization } from '@/lib/server/organizations';
import { getUser, requireUser } from '@/lib/server/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Leituras das definições. Tudo corre sob a sessão do utilizador (RLS);
 * nenhum valor é inventado — ausência devolve `null` ou defaults explícitos.
 */

export interface ProfileData {
  id: string;
  email: string | null;
  emailConfirmedAt: string | null;
  name: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  provider: string | null;
  /** Email novo pendente de confirmação (Supabase `new_email`). */
  pendingEmail: string | null;
}

export async function getProfile(): Promise<ProfileData | null> {
  const user = await getUser();
  if (!user) return null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  return {
    id: user.id,
    email: user.email ?? null,
    emailConfirmedAt: user.email_confirmed_at ?? null,
    name: typeof meta.name === 'string' && meta.name.trim() ? meta.name : null,
    createdAt: user.created_at ?? null,
    lastSignInAt: user.last_sign_in_at ?? null,
    provider: (user.app_metadata?.provider as string | undefined) ?? null,
    pendingEmail: user.new_email ?? null,
  };
}

export type UserPreferencesView = Omit<UserPreferences, 'user_id' | 'created_at' | 'updated_at'> & {
  persisted: boolean;
  updatedAt: string | null;
};

export async function getUserPreferences(): Promise<UserPreferencesView> {
  const defaults: UserPreferencesView = {
    ...DEFAULT_USER_PREFERENCES,
    persisted: false,
    updatedAt: null,
  };
  if (!isSupabaseConfigured()) return defaults;
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error || !data) return defaults;
  const row = data as UserPreferences;
  return {
    locale: row.locale,
    timezone: row.timezone,
    theme: row.theme,
    date_format: row.date_format,
    time_format: row.time_format,
    notify_failed_calls: row.notify_failed_calls,
    notify_activity_digest: row.notify_activity_digest,
    notify_usage_reports: row.notify_usage_reports,
    notify_integration_alerts: row.notify_integration_alerts,
    notify_platform_updates: row.notify_platform_updates,
    persisted: true,
    updatedAt: row.updated_at,
  };
}

export type OrganizationSettingsView = Omit<
  OrganizationSettings,
  'organization_id' | 'created_at' | 'updated_at' | 'updated_by'
> & { persisted: boolean; updatedAt: string | null };

export async function getOrganizationSettings(
  organizationId: string,
): Promise<OrganizationSettingsView> {
  const defaults: OrganizationSettingsView = {
    ...DEFAULT_ORGANIZATION_SETTINGS,
    persisted: false,
    updatedAt: null,
  };
  if (!isSupabaseConfigured()) return defaults;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('organization_settings')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (error || !data) return defaults;
  const row = data as OrganizationSettings;
  return {
    website: row.website,
    country: row.country,
    default_language: row.default_language,
    max_call_duration_seconds: row.max_call_duration_seconds,
    recording_enabled: row.recording_enabled,
    retention_days: row.retention_days,
    notify_failed_calls: row.notify_failed_calls,
    notify_integration_alerts: row.notify_integration_alerts,
    persisted: true,
    updatedAt: row.updated_at,
  };
}

export interface OrganizationDetails extends ActiveOrganization {
  createdAt: string | null;
  updatedAt: string | null;
}

export async function getOrganizationDetails(): Promise<OrganizationDetails | null> {
  const organization = await getActiveOrganization();
  if (!organization) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('organizations')
    .select('created_at, updated_at')
    .eq('id', organization.id)
    .maybeSingle();
  return {
    ...organization,
    createdAt: (data as { created_at?: string } | null)?.created_at ?? null,
    updatedAt: (data as { updated_at?: string } | null)?.updated_at ?? null,
  };
}

export type MembersResult =
  | { ok: true; members: OrganizationMember[] }
  | { ok: false; reason: 'rpc_missing' | 'error'; detail: string };

/**
 * Lista membros via RPC SECURITY DEFINER (migração 0006). Se a função não
 * existir na BD (migração não aplicada) devolve `rpc_missing` — a UI explica.
 */
export async function listOrganizationMembers(organizationId: string): Promise<MembersResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('list_organization_members', {
    p_organization_id: organizationId,
  });
  if (error) {
    const missing = /function .*list_organization_members|PGRST202|does not exist/i.test(
      `${error.code ?? ''} ${error.message}`,
    );
    return { ok: false, reason: missing ? 'rpc_missing' : 'error', detail: error.message };
  }
  return { ok: true, members: (data ?? []) as OrganizationMember[] };
}

export interface SettingsOverview {
  organization: OrganizationDetails | null;
  memberCount: number | null;
  agentCount: number | null;
  activeAgentCount: number | null;
  integrations: ReturnType<typeof buildIntegrationStatuses>;
  emailVerified: boolean | null;
  organizationSettingsUpdatedAt: string | null;
  preferencesUpdatedAt: string | null;
}

export async function getSettingsOverview(): Promise<SettingsOverview> {
  const integrations = buildIntegrationStatuses();
  if (!isSupabaseConfigured()) {
    return {
      organization: null,
      memberCount: null,
      agentCount: null,
      activeAgentCount: null,
      integrations,
      emailVerified: null,
      organizationSettingsUpdatedAt: null,
      preferencesUpdatedAt: null,
    };
  }

  const user = await requireUser();
  const organization = await getOrganizationDetails();
  const supabase = await createSupabaseServerClient();

  const [memberRes, agentRes, activeRes, orgSettings, prefs] = organization
    ? await Promise.all([
        supabase
          .from('memberships')
          .select('user_id', { count: 'exact', head: true })
          .eq('organization_id', organization.id),
        supabase
          .from('agents')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organization.id),
        supabase
          .from('agents')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organization.id)
          .eq('status', 'active'),
        getOrganizationSettings(organization.id),
        getUserPreferences(),
      ])
    : [null, null, null, null, await getUserPreferences()];

  return {
    organization,
    memberCount: memberRes?.error ? null : (memberRes?.count ?? null),
    agentCount: agentRes?.error ? null : (agentRes?.count ?? null),
    activeAgentCount: activeRes?.error ? null : (activeRes?.count ?? null),
    integrations,
    emailVerified: Boolean(user.email_confirmed_at),
    organizationSettingsUpdatedAt: orgSettings?.updatedAt ?? null,
    preferencesUpdatedAt: prefs.updatedAt,
  };
}

export interface UsageSummary {
  periodStart: string;
  totalCalls: number;
  inbound: number;
  outbound: number;
  completedSeconds: number;
  simulated: number;
  perAgent: Array<{ agentId: string | null; name: string; calls: number; seconds: number }>;
}

export async function getUsageSummary(
  organizationId: string,
  days = 30,
): Promise<UsageSummary | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  const periodStart = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from('calls')
    .select('direction, status, duration_seconds, provider, agent_id, agent:agents(name)')
    .eq('organization_id', organizationId)
    .gte('created_at', periodStart)
    .limit(5000);
  if (error) return null;

  type Row = {
    direction: 'inbound' | 'outbound';
    status: string;
    duration_seconds: number | null;
    provider: string;
    agent_id: string | null;
    agent: { name: string } | { name: string }[] | null;
  };
  const rows = (data ?? []) as Row[];
  const perAgent = new Map<
    string,
    { agentId: string | null; name: string; calls: number; seconds: number }
  >();
  let inbound = 0;
  let outbound = 0;
  let completedSeconds = 0;
  let simulated = 0;
  for (const row of rows) {
    if (row.direction === 'inbound') inbound += 1;
    else outbound += 1;
    if (row.provider === 'simulado') simulated += 1;
    const seconds = row.status === 'completed' ? (row.duration_seconds ?? 0) : 0;
    completedSeconds += seconds;
    const agentName = Array.isArray(row.agent) ? row.agent[0]?.name : row.agent?.name;
    const key = row.agent_id ?? '__none__';
    const entry = perAgent.get(key) ?? {
      agentId: row.agent_id,
      name: agentName ?? 'Sem agente',
      calls: 0,
      seconds: 0,
    };
    entry.calls += 1;
    entry.seconds += seconds;
    perAgent.set(key, entry);
  }
  return {
    periodStart,
    totalCalls: rows.length,
    inbound,
    outbound,
    completedSeconds,
    simulated,
    perAgent: [...perAgent.values()].sort((a, b) => b.calls - a.calls),
  };
}

/* ------------------------------------------------------------------ */
/* Verificação operacional (não só presença de variáveis)               */
/* ------------------------------------------------------------------ */

export type ProbeResult =
  | { state: 'verified'; checkedAt: string; latencyMs: number }
  | { state: 'error'; checkedAt: string; detail: string }
  | { state: 'skipped'; checkedAt: string; detail: string };

/**
 * Sonda real ao Supabase sob a sessão do utilizador: uma leitura mínima da
 * organização ativa (RLS). Distingue «configurado» de «ligado e verificado».
 */
export async function probeSupabase(): Promise<ProbeResult> {
  const checkedAt = new Date().toISOString();
  if (!isSupabaseConfigured()) {
    return { state: 'skipped', checkedAt, detail: 'Variáveis não configuradas.' };
  }
  const started = Date.now();
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('organizations')
      .select('id', { head: true, count: 'exact' })
      .limit(1);
    if (error) return { state: 'error', checkedAt, detail: error.message };
    return { state: 'verified', checkedAt, latencyMs: Date.now() - started };
  } catch (error) {
    return {
      state: 'error',
      checkedAt,
      detail: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}
