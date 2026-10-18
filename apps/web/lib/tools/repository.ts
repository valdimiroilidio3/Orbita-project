import type { SupabaseClient } from '@supabase/supabase-js';

import type { ToolExecutionStatus, ToolRiskLevel } from '@orbita/shared';

/**
 * ToolExecutionRepository / ToolApprovalRepository — persistência das
 * execuções, aprovações e registros de negócio.
 *
 * ⚠️ Escrita em `tool_executions`/`automation_runs` usa o cliente de SERVIÇO
 * (caminho privilegiado de sistema, com verificação explícita de autorização
 * no executor — docs/tool-security.md). Nunca no browser.
 */

export interface ExecutionInsert {
  organizationId: string;
  agentId: string | null;
  callId: string | null;
  toolId: string;
  status: ToolExecutionStatus;
  risk: ToolRiskLevel;
  args: Record<string, unknown>;
  idempotencyKey: string | null;
}

export function isUniqueViolation(error: { code?: string | null }): boolean {
  return error.code === '23505';
}

export async function insertToolExecution(
  client: SupabaseClient,
  insert: ExecutionInsert,
): Promise<{ id: string } | { duplicateOf: string } | { error: string }> {
  const { data, error } = await client
    .from('tool_executions')
    .insert({
      organization_id: insert.organizationId,
      agent_id: insert.agentId,
      call_id: insert.callId,
      tool_id: insert.toolId,
      status: insert.status,
      risk: insert.risk,
      args: insert.args,
      idempotency_key: insert.idempotencyKey,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    if (isUniqueViolation(error) && insert.idempotencyKey) {
      const { data: existing } = await client
        .from('tool_executions')
        .select('id')
        .eq('organization_id', insert.organizationId)
        .eq('idempotency_key', insert.idempotencyKey)
        .maybeSingle();
      if (existing) return { duplicateOf: existing.id };
    }
    return { error: error.message };
  }
  if (!data) return { error: 'execução não registada' };
  return { id: data.id };
}

export async function findExecutionByIdempotencyKey(
  client: SupabaseClient,
  organizationId: string,
  key: string,
): Promise<{ id: string; status: string; result: Record<string, unknown> | null; resultMessage: string | null } | null> {
  const { data } = await client
    .from('tool_executions')
    .select('id, status, result, result_message')
    .eq('organization_id', organizationId)
    .eq('idempotency_key', key)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    status: data.status,
    result: data.result ?? null,
    resultMessage: data.result_message ?? null,
  };
}

export async function finalizeToolExecution(
  client: SupabaseClient,
  executionId: string,
  organizationId: string,
  patch: {
    status: ToolExecutionStatus;
    result: Record<string, unknown> | null;
    resultMessage: string | null;
    errorCode: string | null;
    errorMessage: string | null;
  },
): Promise<void> {
  await client
    .from('tool_executions')
    .update({
      status: patch.status,
      result: patch.result,
      result_message: patch.resultMessage,
      error_code: patch.errorCode,
      error_message: patch.errorMessage,
      finished_at: new Date().toISOString(),
    })
    .eq('id', executionId)
    .eq('organization_id', organizationId);
}

export async function countRecentExecutions(
  client: SupabaseClient,
  organizationId: string,
  callId: string | null,
  windowSeconds: number,
): Promise<number> {
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();
  let query = client
    .from('tool_executions')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .gte('created_at', since);
  if (callId) query = query.eq('call_id', callId);
  const { count } = await query;
  return count ?? 0;
}

export async function createPendingApproval(
  client: SupabaseClient,
  params: { organizationId: string; toolExecutionId: string; expiresAt: string },
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await client
    .from('tool_approvals')
    .insert({
      organization_id: params.organizationId,
      tool_execution_id: params.toolExecutionId,
      status: 'pending',
      expires_at: params.expiresAt,
    })
    .select('id')
    .single();
  if (error || !data) return { error: error?.message ?? 'erro desconhecido' };
  return { id: data.id };
}
