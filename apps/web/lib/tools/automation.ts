import type { SupabaseClient } from '@supabase/supabase-js';

import {
  automationWorkflowSchema,
  isToolId,
  renderWorkflowArgs,
  type AutomationTrigger,
  type WorkflowTriggerContext,
} from '@orbita/shared';

import { getSupabaseServiceClient } from '@/lib/supabase/service';
import { executeTool } from '@/lib/tools/executor';
import { isUniqueViolation } from '@/lib/tools/repository';

/**
 * AutomationService — workflows empresariais iniciais (PROMPT 08 §8).
 *
 * • apenas ações do catálogo autorizado de ferramentas (sem código do cliente);
 * • gatilhos suportados por eventos REAIS (ciclo de vida + contactos/marcações);
 * • dedup `(workflow_id, trigger_key)` — sem ciclos, reentrada nem reativação;
 * • limites: máx. 5 passos, timeout total, execuções de ferramenta limitadas;
 * • execução sequencial simples (sem filas/Redis — limitações documentadas).
 */

export interface AutomationRunOutcome {
  workflowId: string;
  runId: string | null;
  status: 'succeeded' | 'partial' | 'failed' | 'timed_out' | 'skipped';
  detail: string;
}

const WORKFLOW_STEP_TIMEOUT_MS = 15_000;

interface WorkflowRow {
  id: string;
  organization_id: string;
  name: string;
  trigger: string;
  steps: unknown;
  timeout_seconds: number;
}

/**
 * Dispara workflows para um evento. Chamado pelos caminhos REAIS de eventos
 * (webhooks, simulador, criação de contactos/marcações). Suprimido dentro de
 * execuções de workflow (`fromWorkflow`) — anti-recursão.
 */
export async function runAutomationsForTrigger(params: {
  organizationId: string;
  trigger: AutomationTrigger;
  /** Identificador do evento — dedup por (workflow, trigger_key). */
  triggerKey: string;
  context: WorkflowTriggerContext;
}): Promise<AutomationRunOutcome[]> {
  const client = getSupabaseServiceClient();
  if (!client) return [];

  const { data: workflows, error } = await client
    .from('automation_workflows')
    .select('id, organization_id, name, trigger, steps, timeout_seconds')
    .eq('organization_id', params.organizationId)
    .eq('trigger', params.trigger)
    .eq('active', true);

  if (error || !workflows || workflows.length === 0) return [];

  const outcomes: AutomationRunOutcome[] = [];
  for (const workflow of workflows as WorkflowRow[]) {
    const outcome = await runWorkflow(client, workflow, params);
    outcomes.push(outcome);
  }
  return outcomes;
}

async function runWorkflow(
  client: SupabaseClient,
  workflow: WorkflowRow,
  params: { trigger: AutomationTrigger; triggerKey: string; context: WorkflowTriggerContext },
): Promise<AutomationRunOutcome> {
  // Dedup/anti-reentrada: um evento dispara cada workflow no máximo uma vez.
  const { data: run, error: runError } = await client
    .from('automation_runs')
    .insert({
      organization_id: workflow.organization_id,
      workflow_id: workflow.id,
      trigger: params.trigger,
      trigger_key: params.triggerKey.slice(0, 160),
      status: 'running',
    })
    .select('id')
    .single();

  if (runError) {
    if (isUniqueViolation(runError)) {
      return {
        workflowId: workflow.id,
        runId: null,
        status: 'skipped',
        detail: 'Evento já processado para este workflow.',
      };
    }
    return {
      workflowId: workflow.id,
      runId: null,
      status: 'failed',
      detail: 'Não foi possível iniciar a execução.',
    };
  }

  const parsed = automationWorkflowSchema.safeParse({
    name: workflow.name,
    trigger: workflow.trigger,
    steps: workflow.steps,
    timeoutSeconds: workflow.timeout_seconds,
    active: true,
  });

  if (!parsed.success) {
    await finishRun(
      client,
      run.id,
      workflow.organization_id,
      'failed',
      [],
      'Definição de workflow inválida.',
    );
    return {
      workflowId: workflow.id,
      runId: run.id,
      status: 'failed',
      detail: 'Definição inválida.',
    };
  }

  const deadline = Date.now() + parsed.data.timeoutSeconds * 1000;
  const stepsResult: { toolId: string; status: string; message: string }[] = [];
  let status: 'succeeded' | 'partial' | 'failed' | 'timed_out' = 'succeeded';

  for (const step of parsed.data.steps) {
    if (Date.now() > deadline) {
      status = 'timed_out';
      stepsResult.push({
        toolId: step.toolId,
        status: 'timed_out',
        message: 'Tempo limite do workflow excedido.',
      });
      break;
    }

    if (!isToolId(step.toolId)) {
      status = 'failed';
      stepsResult.push({
        toolId: step.toolId,
        status: 'not_found',
        message: 'Ferramenta desconhecida no passo.',
      });
      break;
    }

    const args = renderWorkflowArgs(step.args, params.context) as Record<string, unknown>;

    const outcome = await executeTool({
      context: {
        organizationId: workflow.organization_id,
        agentId: null,
        callId: params.context.callId,
        actorUserId: null,
        fromWorkflow: true,
        idempotencyKey: `wf:${workflow.id}:${params.triggerKey}:${step.toolId}`.slice(0, 128),
      },
      toolId: step.toolId,
      rawArgs: args,
    });

    stepsResult.push({
      toolId: step.toolId,
      status: outcome.result.status,
      message: outcome.result.message.slice(0, 200),
    });

    if (outcome.result.status !== 'success') {
      // Política: falha num passo interrompe a sequência (sem retries não seguros).
      status = stepsResult.length === parsed.data.steps.length ? 'partial' : 'failed';
      break;
    }
    if (stepsResult.length === parsed.data.steps.length) status = 'succeeded';
    void WORKFLOW_STEP_TIMEOUT_MS;
  }

  await finishRun(client, run.id, workflow.organization_id, status, stepsResult, null);
  return {
    workflowId: workflow.id,
    runId: run.id,
    status,
    detail: `Passos executados: ${stepsResult.length}`,
  };
}

async function finishRun(
  client: SupabaseClient,
  runId: string,
  organizationId: string,
  status: 'succeeded' | 'partial' | 'failed' | 'timed_out',
  stepsResult: { toolId: string; status: string; message: string }[],
  errorMessage: string | null,
): Promise<void> {
  await client
    .from('automation_runs')
    .update({
      status,
      steps_result: stepsResult,
      error_message: errorMessage,
      finished_at: new Date().toISOString(),
    })
    .eq('id', runId)
    .eq('organization_id', organizationId);
}

/**
 * Emite os gatilhos de contacto/marcação após execuções REAIS de ferramentas
 * (fora de workflows — anti-recursão). Chamado pelos server actions.
 */
export async function emitToolAutomationTrigger(params: {
  organizationId: string;
  trigger: 'contact_request.created' | 'appointment.created';
  triggerKey: string;
  context: WorkflowTriggerContext;
}): Promise<AutomationRunOutcome[]> {
  return runAutomationsForTrigger(params);
}

/** Valida um workflow com o schema partilhado (cliente e servidor). */
export function validateWorkflowDefinition(input: unknown) {
  return automationWorkflowSchema.safeParse(input);
}

export type { SupabaseClient };
