import type { SupabaseClient } from '@supabase/supabase-js';

import {
  TOOL_ARGS_MAX_BYTES,
  TOOL_ARGS_SCHEMAS,
  TOOL_DEFINITIONS,
  effectiveToolRisk,
  isToolId,
  type ToolId,
  type ToolResult,
  type ToolRiskLevel,
} from '@orbita/shared';

import { getSupabaseServiceClient } from '@/lib/supabase/service';
import {
  countRecentExecutions,
  createPendingApproval,
  finalizeToolExecution,
  findExecutionByIdempotencyKey,
  insertToolExecution,
} from '@/lib/tools/repository';
import {
  handleAppointmentCreate,
  handleAvailabilityCheck,
  handleBusinessInfoLookup,
  handleCallTransfer,
  handleContactRequestCreate,
  type ToolHandlerContext,
} from '@/lib/tools/handlers';

/**
 * ToolExecutor — execução centralizada e validada de tool calls (PROMPT 08 §6).
 *
 * Pipeline: validar estrutura → ferramenta existe/ativa → argumentos no
 * servidor → contexto autenticado → permissões → limites → aprovação →
 * execução → resultado estruturado → auditoria.
 *
 * NUNCA confia em organization_id/agent_id/user_id/call_id/permisões vindos
 * dos argumentos do modelo — o contexto é derivado e validado pelo servidor.
 * Ferramentas não invocam outras ferramentas (sem profundidade de recursão).
 */

export interface ToolExecutionContext {
  organizationId: string;
  agentId: string | null;
  callId: string | null;
  /** Utilizador autenticado (UI) ou `null` (sistema/chamada). */
  actorUserId: string | null;
  /** Execução vinda de um workflow — suprime aprovações configuradas nele? Não: aprovações mantêm-se. */
  fromWorkflow: boolean;
  /** Chave de idempotência (obrigatória para operações não idempotentes). */
  idempotencyKey?: string;
}

export interface ExecuteToolOutcome {
  executionId: string | null;
  result: ToolResult;
  /** true quando uma execução anterior com a mesma chave foi reutilizada. */
  replayed: boolean;
}

const TOOL_TIMEOUT_DEFAULT_MS = 10_000;
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_PER_CALL = 20;
const RATE_LIMIT_MAX_PER_ORG = 120;
const APPROVAL_TTL_SECONDS = 24 * 60 * 60;

function validationError(message: string): ToolResult {
  return { status: 'validation_error', message };
}

function unauthorized(message = 'Não autorizado para esta ferramenta.'): ToolResult {
  return { status: 'unauthorized', message };
}

function rateLimited(): ToolResult {
  return { status: 'rate_limited', message: 'Demais execuções neste momento. Tenta mais tarde.' };
}

function timeoutResult(): ToolResult {
  return { status: 'timeout', message: 'A operação demorou demasiado tempo.' };
}

function internalError(): ToolResult {
  return { status: 'internal_error', message: 'Erro interno ao executar a ferramenta.' };
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | 'timeout'> {
  return Promise.race([
    promise,
    new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), ms)),
  ]);
}

function serializeArgs(args: Record<string, unknown>): string {
  try {
    return JSON.stringify(args);
  } catch {
    return '';
  }
}

/** Deriva uma chave de idempotência determinística quando não fornecida. */
export function deriveIdempotencyKey(
  toolId: ToolId,
  context: { callId: string | null },
  args: Record<string, unknown>,
): string | null {
  if (context.callId) {
    const serialized = serializeArgs(args);
    return `${toolId}:${context.callId}:${hashString(serialized)}`.slice(0, 128);
  }
  return null;
}

function hashString(input: string): string {
  // Hash não criográfico estável para deduplicação interna (não é segurança).
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

async function isToolEnabledForAgent(
  client: SupabaseClient,
  organizationId: string,
  agentId: string,
  toolId: ToolId,
): Promise<{ enabled: boolean; requireApproval: boolean }> {
  const { data } = await client
    .from('agent_tools')
    .select('enabled, config')
    .eq('organization_id', organizationId)
    .eq('agent_id', agentId)
    .eq('tool_id', toolId)
    .maybeSingle();

  if (!data) return { enabled: false, requireApproval: false };
  const config = (data.config ?? {}) as { requireApproval?: boolean };
  return { enabled: Boolean(data.enabled), requireApproval: config.requireApproval === true };
}

/**
 * Executa uma ferramenta do catálogo com o contexto VALIDADO pelo servidor.
 * A persistência usa o cliente de serviço (verificação explícita de
 * autorização aqui — docs/tool-security.md).
 */
export async function executeTool(params: {
  context: ToolExecutionContext;
  toolId: string;
  rawArgs: unknown;
}): Promise<ExecuteToolOutcome> {
  const { context, toolId } = params;

  // 1–2. Estrutura e existência da ferramenta (catálogo allowlisted).
  if (!isToolId(toolId)) {
    return { executionId: null, result: { status: 'not_found', message: 'Ferramenta desconhecida.' }, replayed: false };
  }
  const definition = TOOL_DEFINITIONS[toolId];

  // 3. Argumentos validados no servidor (Zod + tamanho) — antes de qualquer
  // infraestrutura: erros de validação são sempre reportados.
  const serialized = serializeArgs((params.rawArgs ?? {}) as Record<string, unknown>);
  if (serialized.length > TOOL_ARGS_MAX_BYTES) {
    return { executionId: null, result: validationError('Argumentos demasiado grandes.'), replayed: false };
  }

  const schema = TOOL_ARGS_SCHEMAS[toolId];
  const parsedArgs = schema.safeParse(params.rawArgs ?? {});
  if (!parsedArgs.success) {
    const message = parsedArgs.error.issues.map((issue) => issue.message).join(' · ');
    return { executionId: null, result: validationError(message), replayed: false };
  }
  const args = parsedArgs.data as Record<string, unknown>;

  const client = getSupabaseServiceClient();
  if (!client) {
    return {
      executionId: null,
      result: {
        status: 'internal_error',
        message: 'Persistência de execuções não configurada (service role em falta).',
      },
      replayed: false,
    };
  }

  // 4–6. Contexto validado + autorização por organização/agente.
  if (!context.organizationId) {
    return { executionId: null, result: unauthorized('Contexto de organização em falta.'), replayed: false };
  }
  if (context.agentId) {
    const agentAccess = await isToolEnabledForAgent(client, context.organizationId, context.agentId, toolId);
    if (!agentAccess.enabled) {
      return {
        executionId: null,
        result: unauthorized('Ferramenta não autorizada para este agente.'),
        replayed: false,
      };
    }
  }

  // 7. Limites de utilização (por chamada e por organização).
  const [countCall, countOrg] = await Promise.all([
    context.callId
      ? countRecentExecutions(client, context.organizationId, context.callId, RATE_LIMIT_WINDOW_SECONDS)
      : Promise.resolve(0),
    countRecentExecutions(client, context.organizationId, null, RATE_LIMIT_WINDOW_SECONDS),
  ]);
  if (countCall >= RATE_LIMIT_MAX_PER_CALL || countOrg >= RATE_LIMIT_MAX_PER_ORG) {
    return { executionId: null, result: rateLimited(), replayed: false };
  }

  // Idempotência: replay devolve a execução anterior sem repetir efeitos.
  const idempotencyKey =
    context.idempotencyKey ??
    (definition.idempotent ? null : deriveIdempotencyKey(toolId, context, args));

  if (idempotencyKey) {
    const existing = await findExecutionByIdempotencyKey(client, context.organizationId, idempotencyKey);
    if (existing && (existing.status === 'succeeded' || existing.status === 'running')) {
      return {
        executionId: existing.id,
        result: {
          status: 'success',
          message: existing.resultMessage ?? 'Operação já executada (idempotente).',
          data: { replayed: 'true' },
        },
        replayed: true,
      };
    }
  }

  // Persistência inicial (auditoria) — risco efetivo nunca abaixo do mínimo.
  const risk: ToolRiskLevel = effectiveToolRisk(toolId, null);
  const inserted = await insertToolExecution(client, {
    organizationId: context.organizationId,
    agentId: context.agentId,
    callId: context.callId,
    toolId,
    status: 'running',
    risk,
    args,
    idempotencyKey: idempotencyKey ?? null,
  });

  if ('error' in inserted) {
    return { executionId: null, result: internalError(), replayed: false };
  }
  if ('duplicateOf' in inserted) {
    return { executionId: inserted.duplicateOf, result: { status: 'success', message: 'Operação já executada.', data: { replayed: 'true' } }, replayed: true };
  }
  const executionId = inserted.id;

  // 8. Aprovação humana independente do modelo (nunca auto-aprovada).
  const needsApproval =
    definition.confirmation === 'human_approval' ||
    (context.agentId
      ? (await isToolEnabledForAgent(client, context.organizationId, context.agentId, toolId)).requireApproval
      : false);

  if (needsApproval) {
    const expiresAt = new Date(Date.now() + APPROVAL_TTL_SECONDS * 1000).toISOString();
    const approval = await createPendingApproval(client, {
      organizationId: context.organizationId,
      toolExecutionId: executionId,
      expiresAt,
    });
    await finalizeToolExecution(client, executionId, context.organizationId, {
      status: 'awaiting_approval',
      result: null,
      resultMessage: 'A aguardar aprovação humana.',
      errorCode: null,
      errorMessage: null,
    });
    return {
      executionId,
      result: {
        status: 'approval_required',
        message: 'A operação precisa de aprovação humana antes de avançar.',
        data: { approvalId: 'error' in approval ? '' : approval.id },
      },
      replayed: false,
    };
  }

  // 9–10. Execução do handler com limite de tempo (profundidade = 0).
  const handlerCtx: ToolHandlerContext = {
    client,
    organizationId: context.organizationId,
    callId: context.callId,
    fromWorkflow: context.fromWorkflow,
    createdBy: context.actorUserId,
  };

  let outcome: ToolResult;
  const definitionTimeout = Math.min(definition.timeoutMs, TOOL_TIMEOUT_DEFAULT_MS * 2);
  try {
    const handlerPromise = (async (): Promise<ToolResult> => {
      switch (toolId) {
        case 'business_info.lookup':
          return handleBusinessInfoLookup(handlerCtx, args as never);
        case 'availability.check':
          return handleAvailabilityCheck(handlerCtx, args as never);
        case 'contact_request.create':
          return handleContactRequestCreate(handlerCtx, args as never, idempotencyKey ?? `auto-${executionId}`);
        case 'appointment.create':
          return handleAppointmentCreate(handlerCtx, args as never, idempotencyKey ?? `auto-${executionId}`);
        case 'call.transfer':
          return handleCallTransfer(handlerCtx, args as never);
      }
    })();

    const raced = await withTimeout(handlerPromise, definitionTimeout);
    outcome = raced === 'timeout' ? timeoutResult() : raced;
  } catch {
    outcome = internalError();
  }

  // 11–12. Auditoria + resultado estruturado (sem internos/segredos).
  await finalizeToolExecution(client, executionId, context.organizationId, {
    status: outcome.status === 'success' ? 'succeeded' : outcome.status === 'timeout' ? 'timed_out' : 'failed',
    result: sanitizeResultData(outcome.data),
    resultMessage: outcome.message.slice(0, 500),
    errorCode: outcome.status === 'success' ? null : outcome.status,
    errorMessage: outcome.status === 'success' ? null : outcome.message.slice(0, 500),
  });

  return { executionId, result: outcome, replayed: false };
}

/** Resultado com apenas escalares curtos — nunca dados sensíveis. */
function sanitizeResultData(
  data: Record<string, string | number | boolean> | undefined,
): Record<string, unknown> | null {
  if (!data) return null;
  const result: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') result[key] = value.slice(0, 500);
    else if (typeof value === 'number' || typeof value === 'boolean') result[key] = value;
  }
  return result;
}
