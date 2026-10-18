import type { CallDirection, CallStatus } from '@orbita/shared';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getActiveOrganization } from '@/lib/server/organizations';
import { requireUser } from '@/lib/server/session';

/**
 * Camada de acesso a dados de chamadas (lado do servidor).
 *
 * Regras:
 *   • a organização vem SEMPRE da sessão validada (nunca do cliente);
 *   • números de telefone são privados — visíveis apenas a membros via RLS;
 *   • queries sujeitas a RLS (docs/security.md); sem bypass com service role;
 *   • paginação pronta (limit/offset + total).
 */

export interface CallDetailRecord {
  id: string;
  direction: CallDirection;
  status: CallStatus;
  toNumber: string | null;
  fromNumber: string | null;
  agentId: string | null;
  agentName: string | null;
  provider: string | null;
  providerCallId: string | null;
  voiceSessionId: string | null;
  durationSeconds: number | null;
  estimatedCost: number | null;
  currency: string;
  startedAt: string | null;
  answeredAt: string | null;
  endedAt: string | null;
  failureCode: string | null;
  failureReason: string | null;
  createdAt: string;
}

export interface ListCallsOptions {
  status?: CallStatus;
  direction?: CallDirection;
  /** Pesquisa por número (origem/destino). Sanitizada — sem wildcards do utilizador. */
  search?: string;
  limit?: number;
  offset?: number;
}

/** Remove caracteres especiais do padrão `ilike` e limita o tamanho. */
export function sanitizeSearchTerm(raw: string | undefined): string {
  if (!raw) return '';
  return raw
    .replace(/[%_\\,()]/g, '')
    .trim()
    .slice(0, 40);
}

export interface ListCallsResult {
  calls: CallDetailRecord[];
  total: number;
  hasMore: boolean;
}

export const CALLS_PAGE_SIZE = 50;

const CALL_COLUMNS =
  'id, direction, status, to_number, from_number, agent_id, agent:agents(name), voice_session_id, duration_seconds, estimated_cost, currency, provider, provider_call_id, started_at, answered_at, ended_at, failure_code, failure_reason, created_at';

interface CallRow {
  id: string;
  direction: CallDirection;
  status: CallStatus;
  to_number: string | null;
  from_number: string | null;
  agent_id: string | null;
  agent: { name: string } | { name: string }[] | null;
  voice_session_id: string | null;
  duration_seconds: number | null;
  // numeric chega do Supabase como string — normalizar com Number().
  estimated_cost: string | number | null;
  currency: string | null;
  provider: string | null;
  provider_call_id: string | null;
  started_at: string | null;
  answered_at: string | null;
  ended_at: string | null;
  failure_code: string | null;
  failure_reason: string | null;
  created_at: string;
}

function mapCallRow(row: CallRow): CallDetailRecord {
  const agent = Array.isArray(row.agent) ? row.agent[0] : row.agent;
  return {
    id: row.id,
    direction: row.direction,
    status: row.status,
    toNumber: row.to_number,
    fromNumber: row.from_number,
    agentId: row.agent_id,
    agentName: agent?.name ?? null,
    provider: row.provider,
    providerCallId: row.provider_call_id,
    voiceSessionId: row.voice_session_id,
    durationSeconds: row.duration_seconds,
    estimatedCost: row.estimated_cost === null ? null : Number(row.estimated_cost),
    currency: row.currency ?? 'EUR',
    startedAt: row.started_at,
    answeredAt: row.answered_at,
    endedAt: row.ended_at,
    failureCode: row.failure_code,
    failureReason: row.failure_reason,
    createdAt: row.created_at,
  };
}

/** Lista as chamadas da organização ativa (RLS limita aos membros). */
export async function listMyCalls(options: ListCallsOptions = {}): Promise<ListCallsResult> {
  await requireUser();
  const organization = await getActiveOrganization();
  if (!organization) {
    return { calls: [], total: 0, hasMore: false };
  }

  const limit = Math.min(Math.max(options.limit ?? CALLS_PAGE_SIZE, 1), 100);
  const offset = Math.max(options.offset ?? 0, 0);
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from('calls')
    .select(CALL_COLUMNS, { count: 'exact' })
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (options.status) query = query.eq('status', options.status);
  if (options.direction) query = query.eq('direction', options.direction);
  const term = sanitizeSearchTerm(options.search);
  if (term !== '') {
    query = query.or(`to_number.ilike.%${term}%,from_number.ilike.%${term}%`);
  }

  const { data, error, count } = await query;
  if (error) {
    throw new Error(`Não foi possível carregar as chamadas: ${error.message}`);
  }

  const calls = ((data ?? []) as CallRow[]).map(mapCallRow);
  const total = count ?? calls.length;
  return { calls, total, hasMore: offset + calls.length < total };
}

/** Obtém uma chamada da organização ativa, ou `null`. */
export async function getMyCall(id: string): Promise<CallDetailRecord | null> {
  await requireUser();
  const organization = await getActiveOrganization();
  if (!organization) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('calls')
    .select(CALL_COLUMNS)
    .eq('id', id)
    .eq('organization_id', organization.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Não foi possível carregar a chamada: ${error.message}`);
  }
  return data ? mapCallRow(data as CallRow) : null;
}

/** Agentes ativos da organização (para o formulário de nova chamada). */
export async function listMyActiveAgents(): Promise<{ id: string; name: string }[]> {
  await requireUser();
  const organization = await getActiveOrganization();
  if (!organization) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('agents')
    .select('id, name')
    .eq('organization_id', organization.id)
    .eq('status', 'active')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Não foi possível carregar os agentes: ${error.message}`);
  }
  return (data ?? []) as { id: string; name: string }[];
}
