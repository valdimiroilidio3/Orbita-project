import type { AgentStatus, VoiceConfigInput } from '@orbita/shared';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getActiveOrganization } from '@/lib/server/organizations';
import { requireUser } from '@/lib/server/session';

/**
 * Camada de acesso a dados de agentes (lado do servidor).
 *
 * Regras:
 *   • a organização vem SEMPRE da sessão validada (nunca do cliente);
 *   • as queries são limitadas pelo RLS (a matriz de papéis está em
 *     docs/security.md) — aqui não há bypass com service role;
 *   • paginação pronta (limit/offset + total), para listagens futuras.
 */

export interface AgentRecord {
  id: string;
  name: string;
  description: string | null;
  instructions: string;
  language: string;
  status: AgentStatus;
  voiceConfig: VoiceConfigInput;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListAgentsOptions {
  status?: AgentStatus;
  limit?: number;
  offset?: number;
}

export interface ListAgentsResult {
  agents: AgentRecord[];
  total: number;
  hasMore: boolean;
}

export const AGENTS_PAGE_SIZE = 50;

const AGENT_COLUMNS =
  'id, name, description, instructions, language, status, voice_config, created_by, created_at, updated_at';

interface AgentRow {
  id: string;
  name: string;
  description: string | null;
  instructions: string | null;
  language: string | null;
  status: AgentStatus | null;
  voice_config: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function mapAgentRow(row: AgentRow): AgentRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    instructions: row.instructions ?? '',
    language: row.language ?? 'pt-PT',
    status: (row.status ?? 'draft') as AgentStatus,
    voiceConfig: (row.voice_config ?? {}) as VoiceConfigInput,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Lista os agentes da organização ativa (RLS limita aos membros). */
export async function listMyAgents(options: ListAgentsOptions = {}): Promise<ListAgentsResult> {
  await requireUser();
  const organization = await getActiveOrganization();
  if (!organization) {
    return { agents: [], total: 0, hasMore: false };
  }

  const limit = Math.min(Math.max(options.limit ?? AGENTS_PAGE_SIZE, 1), 100);
  const offset = Math.max(options.offset ?? 0, 0);
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from('agents')
    .select(AGENT_COLUMNS, { count: 'exact' })
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (options.status) {
    query = query.eq('status', options.status);
  }

  const { data, error, count } = await query;
  if (error) {
    throw new Error(`Não foi possível carregar os agentes: ${error.message}`);
  }

  const agents = ((data ?? []) as AgentRow[]).map(mapAgentRow);
  const total = count ?? agents.length;
  return { agents, total, hasMore: offset + agents.length < total };
}

/** Obtém um agente da organização ativa, ou `null` (inexistente/fora da org). */
export async function getMyAgent(id: string): Promise<AgentRecord | null> {
  await requireUser();
  const organization = await getActiveOrganization();
  if (!organization) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('agents')
    .select(AGENT_COLUMNS)
    .eq('id', id)
    .eq('organization_id', organization.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Não foi possível carregar o agente: ${error.message}`);
  }
  return data ? mapAgentRow(data as AgentRow) : null;
}
