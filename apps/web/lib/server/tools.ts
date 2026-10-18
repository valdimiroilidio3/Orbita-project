import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getActiveOrganization } from '@/lib/server/organizations';
import { requireUser } from '@/lib/server/session';

/**
 * Consultas do catálogo de ferramentas, execuções, aprovações e workflows
 * (lado do servidor; RLS limita à organização da sessão).
 */

export interface ExecutionSummary {
  id: string;
  toolId: string;
  status: string;
  risk: string;
  resultMessage: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  finishedAt: string | null;
  callId: string | null;
  agentId: string | null;
}

interface ExecutionRow {
  id: string;
  tool_id: string;
  status: string;
  risk: string;
  result_message: string | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  finished_at: string | null;
  call_id: string | null;
  agent_id: string | null;
}

function mapExecution(row: ExecutionRow): ExecutionSummary {
  return {
    id: row.id,
    toolId: row.tool_id,
    status: row.status,
    risk: row.risk,
    resultMessage: row.result_message,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    finishedAt: row.finished_at,
    callId: row.call_id,
    agentId: row.agent_id,
  };
}

export async function listExecutions(options: {
  toolId?: string;
  callId?: string;
  limit?: number;
}): Promise<ExecutionSummary[]> {
  await requireUser();
  const organization = await getActiveOrganization();
  if (!organization) return [];

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('tool_executions')
    .select('id, tool_id, status, risk, result_message, error_code, error_message, created_at, finished_at, call_id, agent_id')
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: false })
    .limit(Math.min(options.limit ?? 25, 100));

  if (options.toolId) query = query.eq('tool_id', options.toolId);
  if (options.callId) query = query.eq('call_id', options.callId);

  const { data, error } = await query;
  if (error) throw new Error(`Não foi possível carregar execuções: ${error.message}`);
  return ((data ?? []) as ExecutionRow[]).map(mapExecution);
}

export interface ApprovalSummary {
  id: string;
  toolExecutionId: string;
  toolId: string;
  status: string;
  expiresAt: string;
  requestedAt: string;
}

export async function listPendingApprovals(): Promise<ApprovalSummary[]> {
  await requireUser();
  const organization = await getActiveOrganization();
  if (!organization) return [];

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('tool_approvals')
    .select('id, tool_execution_id, status, expires_at, requested_at, tool_executions(tool_id)')
    .eq('organization_id', organization.id)
    .eq('status', 'pending')
    .order('requested_at', { ascending: false })
    .limit(20);

  interface ApprovalRow {
    id: string;
    tool_execution_id: string;
    status: string;
    expires_at: string;
    requested_at: string;
    tool_executions: { tool_id: string } | { tool_id: string }[] | null;
  }

  return ((data ?? []) as unknown as ApprovalRow[]).map(
    (row) => {
      const execution = Array.isArray(row.tool_executions) ? row.tool_executions[0] : row.tool_executions;
      return {
        id: row.id,
        toolExecutionId: row.tool_execution_id,
        toolId: execution?.tool_id ?? '',
        status: row.status,
        expiresAt: row.expires_at,
        requestedAt: row.requested_at,
      };
    },
  );
}

export interface WorkflowSummary {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  trigger: string;
  stepsCount: number;
  runsCount: number;
  lastRunAt: string | null;
  lastRunStatus: string | null;
}

export async function listWorkflows(): Promise<WorkflowSummary[]> {
  await requireUser();
  const organization = await getActiveOrganization();
  if (!organization) return [];

  const supabase = await createSupabaseServerClient();
  const { data: workflows } = await supabase
    .from('automation_workflows')
    .select('id, name, description, active, trigger, steps, created_at')
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: false });

  const { data: runs } = await supabase
    .from('automation_runs')
    .select('workflow_id, status, started_at')
    .eq('organization_id', organization.id)
    .order('started_at', { ascending: false })
    .limit(200);

  return ((workflows ?? []) as { id: string; name: string; description: string | null; active: boolean; trigger: string; steps: unknown }[]).map(
    (workflow) => {
      const workflowRuns = ((runs ?? []) as { workflow_id: string; status: string; started_at: string }[]).filter(
        (run) => run.workflow_id === workflow.id,
      );
      const lastRun = workflowRuns[0];
      return {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        active: workflow.active,
        trigger: workflow.trigger,
        stepsCount: Array.isArray(workflow.steps) ? workflow.steps.length : 0,
        runsCount: workflowRuns.length,
        lastRunAt: lastRun?.started_at ?? null,
        lastRunStatus: lastRun?.status ?? null,
      };
    },
  );
}

export interface WorkflowDetail extends WorkflowSummary {
  steps: { toolId: string; args: Record<string, unknown> }[];
  timeoutSeconds: number;
}

export async function getWorkflow(id: string): Promise<WorkflowDetail | null> {
  await requireUser();
  const organization = await getActiveOrganization();
  if (!organization) return null;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('automation_workflows')
    .select('id, name, description, active, trigger, steps, timeout_seconds')
    .eq('id', id)
    .eq('organization_id', organization.id)
    .maybeSingle();

  if (!data) return null;
  const summary = (await listWorkflows()).find((workflow) => workflow.id === id);
  return {
    ...(summary ?? {
      id: data.id,
      name: data.name,
      description: data.description,
      active: data.active,
      trigger: data.trigger,
      stepsCount: 0,
      runsCount: 0,
      lastRunAt: null,
      lastRunStatus: null,
    }),
    steps: (Array.isArray(data.steps) ? data.steps : []) as { toolId: string; args: Record<string, unknown> }[],
    timeoutSeconds: data.timeout_seconds ?? 30,
  };
}

export interface WorkflowRunSummary {
  id: string;
  status: string;
  trigger: string;
  triggerKey: string;
  stepsResult: { toolId: string; status: string; message: string }[];
  startedAt: string;
  finishedAt: string | null;
}

export async function listWorkflowRuns(workflowId: string): Promise<WorkflowRunSummary[]> {
  await requireUser();
  const organization = await getActiveOrganization();
  if (!organization) return [];

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('automation_runs')
    .select('id, status, trigger, trigger_key, steps_result, started_at, finished_at')
    .eq('organization_id', organization.id)
    .eq('workflow_id', workflowId)
    .order('started_at', { ascending: false })
    .limit(25);

  return ((data ?? []) as { id: string; status: string; trigger: string; trigger_key: string; steps_result: unknown; started_at: string; finished_at: string | null }[]).map(
    (row) => ({
      id: row.id,
      status: row.status,
      trigger: row.trigger,
      triggerKey: row.trigger_key,
      stepsResult: (Array.isArray(row.steps_result) ? row.steps_result : []) as WorkflowRunSummary['stepsResult'],
      startedAt: row.started_at,
      finishedAt: row.finished_at,
    }),
  );
}

export interface AgentOption {
  id: string;
  name: string;
}

export async function listAgentsForTools(): Promise<AgentOption[]> {
  await requireUser();
  const organization = await getActiveOrganization();
  if (!organization) return [];

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('agents')
    .select('id, name')
    .eq('organization_id', organization.id)
    .order('name', { ascending: true });

  return (data ?? []) as AgentOption[];
}

export async function listAgentToolsFor(toolId: string): Promise<{ agentId: string; enabled: boolean }[]> {
  await requireUser();
  const organization = await getActiveOrganization();
  if (!organization) return [];

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('agent_tools')
    .select('agent_id, enabled')
    .eq('organization_id', organization.id)
    .eq('tool_id', toolId);

  return ((data ?? []) as { agent_id: string; enabled: boolean }[]).map((row) => ({
    agentId: row.agent_id,
    enabled: row.enabled,
  }));
}

export async function getBusinessProfile(): Promise<Record<string, string> | null> {
  await requireUser();
  const organization = await getActiveOrganization();
  if (!organization) return null;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('business_profiles')
    .select('*')
    .eq('organization_id', organization.id)
    .maybeSingle();

  return (data as Record<string, string> | null) ?? null;
}
