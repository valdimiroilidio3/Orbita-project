'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  automationWorkflowSchema,
  businessProfileSchema,
  isToolId,
  parseBusinessHours,
  parseServiceLines,
} from '@orbita/shared';
import type { ZodError } from 'zod';

import { isSupabaseConfigured } from '@/lib/env';
import { APPROVAL_DECISION_ERROR_LABELS, evaluateApprovalDecision } from '@/lib/tools/approvals';
import { executeTool } from '@/lib/tools/executor';
import { emitToolAutomationTrigger } from '@/lib/tools/automation';
import { getActiveOrganization } from '@/lib/server/organizations';
import { requireUser } from '@/lib/server/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { ToolFormState } from '@/lib/server/tool-form-state';

/**
 * Server actions de ferramentas, aprovações, workflows e perfil público.
 *
 * Regras: validação sempre no servidor; organização/papel da sessão (nunca
 * do cliente); operações privilegiadas validam autorização explicitamente;
 * sem Supabase nada é executado nem simulado.
 */

function zodIssues(error: ZodError): string {
  return error.issues.map((issue) => issue.message).join(' · ');
}

function notConfigured(): ToolFormState {
  return {
    error:
      'Supabase não configurado: preenche apps/web/.env.local. Nada foi executado nem simulado.',
    success: null,
  };
}

async function requireManager() {
  const user = await requireUser();
  const organization = await getActiveOrganization();
  if (!organization) redirect('/onboarding');
  if (organization.role !== 'owner' && organization.role !== 'admin') {
    return { user, organization, allowed: false as const };
  }
  return { user, organization, allowed: true as const };
}

/* ── Perfil público da empresa ──────────────────────────────── */

export async function saveBusinessProfileAction(
  _prevState: ToolFormState,
  formData: FormData,
): Promise<ToolFormState> {
  if (!isSupabaseConfigured()) return notConfigured();
  const { organization, allowed } = await requireManager();
  if (!allowed)
    return { error: 'Apenas owners e admins podem editar o perfil público.', success: null };

  const parsed = businessProfileSchema.safeParse({
    displayName: formData.get('displayName') ?? '',
    timezone: formData.get('timezone') ?? 'Europe/Lisbon',
    address: formData.get('address') ?? null,
    phone: formData.get('phone') ?? null,
    email: formData.get('email') ?? null,
    prices: formData.get('prices') ?? null,
    faq: formData.get('faq') ?? null,
    policies: formData.get('policies') ?? null,
    hoursText: formData.get('hoursText') ?? '',
    servicesText: formData.get('servicesText') ?? '',
  });
  if (!parsed.success) return { error: zodIssues(parsed.error), success: null };

  const hours = parseBusinessHours(parsed.data.hoursText);
  if (!hours.ok) return { error: `Horário: ${hours.error}`, success: null };
  const services = parseServiceLines(parsed.data.servicesText);
  if (!services.ok) return { error: `Serviços: ${services.error}`, success: null };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('business_profiles').upsert(
    {
      organization_id: organization.id,
      display_name: parsed.data.displayName,
      timezone: parsed.data.timezone,
      address: parsed.data.address ?? null,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email ?? null,
      prices: parsed.data.prices ?? null,
      faq: parsed.data.faq ?? null,
      policies: parsed.data.policies ?? null,
      hours_text: parsed.data.hoursText,
      services_text: parsed.data.servicesText,
    },
    { onConflict: 'organization_id' },
  );

  if (error) return { error: `Não foi possível guardar: ${error.message}`, success: null };
  return { error: null, success: 'Perfil público guardado.' };
}

/* ── Autorização de ferramentas por agente ──────────────────── */

export async function setAgentToolAction(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) redirect('/tools?error=nao_configurado');

  const { user, organization, allowed } = await requireManager();
  if (!allowed) redirect('/tools?error=sem_permissao');

  const agentId = String(formData.get('agentId') ?? '');
  const toolId = String(formData.get('toolId') ?? '');
  const enabled = formData.get('enabled') === 'true';
  if (!agentId || !isToolId(toolId)) redirect('/tools?error=argumentos_invalidos');

  const supabase = await createSupabaseServerClient();
  void user;

  if (enabled) {
    await supabase
      .from('agent_tools')
      .upsert(
        { organization_id: organization.id, agent_id: agentId, tool_id: toolId, enabled: true },
        { onConflict: 'agent_id,tool_id' },
      );
  } else {
    await supabase
      .from('agent_tools')
      .delete()
      .eq('organization_id', organization.id)
      .eq('agent_id', agentId)
      .eq('tool_id', toolId);
  }

  revalidatePath(`/tools/${toolId}`);
  redirect(`/tools/${toolId}?updated=1`);
}

/* ── Aprovações ─────────────────────────────────────────────── */

export async function decideApprovalAction(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) redirect('/tools?error=nao_configurado');

  const { user, organization, allowed } = await requireManager();
  const approvalId = String(formData.get('approvalId') ?? '');
  const requestedExecutionId = String(formData.get('executionId') ?? '');
  const decision = formData.get('decision') === 'approve' ? 'approve' : 'reject';

  if (!allowed || !approvalId) redirect('/tools?error=sem_permissao');

  const supabase = await createSupabaseServerClient();
  const { data: approval } = await supabase
    .from('tool_approvals')
    .select('id, organization_id, tool_execution_id, status, expires_at')
    .eq('id', approvalId)
    .eq('organization_id', organization.id)
    .maybeSingle();

  if (!approval) redirect('/tools?error=aprovacao_nao_encontrada');

  const verdict = evaluateApprovalDecision({
    approvalId: approval.id,
    status: approval.status,
    organizationId: approval.organization_id,
    toolExecutionId: approval.tool_execution_id,
    expiresAt: approval.expires_at,
    actorOrganizationId: organization.id,
    actorRole: organization.role,
    requestedExecutionId,
    now: new Date().toISOString(),
    decision,
  });

  if (!verdict.ok) {
    redirect(
      `/tools?error=aprovacao&motivo=${encodeURIComponent(APPROVAL_DECISION_ERROR_LABELS[verdict.reason])}`,
    );
  }

  await supabase
    .from('tool_approvals')
    .update({
      status: decision === 'approve' ? 'approved' : 'rejected',
      decided_by: user.id,
      decided_at: new Date().toISOString(),
    })
    .eq('id', approvalId)
    .eq('organization_id', organization.id);

  // Aprovação válida → executa a operação exata que foi solicitada.
  if (decision === 'approve') {
    const { data: execution } = await supabase
      .from('tool_executions')
      .select('id, tool_id, args, call_id, agent_id')
      .eq('id', approval.tool_execution_id)
      .eq('organization_id', organization.id)
      .maybeSingle();

    if (execution && isToolId(execution.tool_id)) {
      await executeTool({
        context: {
          organizationId: organization.id,
          agentId: execution.agent_id,
          callId: execution.call_id,
          actorUserId: user.id,
          fromWorkflow: false,
          idempotencyKey: `approved:${execution.id}`.slice(0, 128),
        },
        toolId: execution.tool_id,
        rawArgs: execution.args ?? {},
      });
    }
  }

  revalidatePath('/tools');
  redirect('/tools?aprovacao=1');
}

/* ── Workflows de automação ─────────────────────────────────── */

export async function saveWorkflowAction(
  _prevState: ToolFormState,
  formData: FormData,
): Promise<ToolFormState> {
  if (!isSupabaseConfigured()) return notConfigured();
  const { user, organization, allowed } = await requireManager();
  if (!allowed) return { error: 'Apenas owners e admins podem gerir automações.', success: null };

  const rawSteps = String(formData.get('steps') ?? '[]');
  let steps: unknown;
  try {
    steps = JSON.parse(rawSteps);
  } catch {
    return { error: 'Passos: JSON inválido.', success: null };
  }

  const parsed = automationWorkflowSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') ?? null,
    trigger: formData.get('trigger'),
    active: formData.get('active') === 'true',
    steps,
    timeoutSeconds: formData.get('timeoutSeconds') || 30,
  });
  if (!parsed.success) return { error: zodIssues(parsed.error), success: null };

  // Apenas ferramentas do catálogo autorizado — nunca código do cliente.
  for (const step of parsed.data.steps) {
    if (!isToolId(step.toolId)) {
      return { error: `Ferramenta desconhecida: ${step.toolId}`, success: null };
    }
  }

  const supabase = await createSupabaseServerClient();
  const workflowId = String(formData.get('id') ?? '');

  const payload = {
    organization_id: organization.id,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    trigger: parsed.data.trigger,
    active: parsed.data.active,
    steps: parsed.data.steps,
    timeout_seconds: parsed.data.timeoutSeconds,
  };

  const { error } = workflowId
    ? await supabase
        .from('automation_workflows')
        .update(payload)
        .eq('id', workflowId)
        .eq('organization_id', organization.id)
    : await supabase.from('automation_workflows').insert({ ...payload, created_by: user.id });

  if (error) return { error: `Não foi possível guardar: ${error.message}`, success: null };

  revalidatePath('/automations');
  if (workflowId) return { error: null, success: 'Workflow atualizado.' };
  redirect('/automations?created=1');
}

export async function deleteWorkflowAction(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) redirect('/automations?error=nao_configurado');
  const { organization, allowed } = await requireManager();
  if (!allowed) redirect('/automations?error=sem_permissao');

  const workflowId = String(formData.get('id') ?? '');
  const supabase = await createSupabaseServerClient();
  await supabase
    .from('automation_workflows')
    .delete()
    .eq('id', workflowId)
    .eq('organization_id', organization.id);

  revalidatePath('/automations');
  redirect('/automations?deleted=1');
}

/* ── Execução manual de ferramenta (testes controlados) ─────── */

export async function runToolAction(
  _prevState: ToolFormState,
  formData: FormData,
): Promise<ToolFormState> {
  if (!isSupabaseConfigured()) return notConfigured();
  const { user, organization } = await requireManager();

  const toolId = String(formData.get('toolId') ?? '');
  const rawArgs = String(formData.get('args') ?? '{}');
  if (!isToolId(toolId)) return { error: 'Ferramenta desconhecida.', success: null };

  let args: unknown;
  try {
    args = JSON.parse(rawArgs);
  } catch {
    return { error: 'Argumentos: JSON inválido.', success: null };
  }

  const outcome = await executeTool({
    context: {
      organizationId: organization.id,
      agentId: null,
      callId: null,
      actorUserId: user.id,
      fromWorkflow: false,
      idempotencyKey: `manual:${user.id}:${toolId}:${Date.now()}`.slice(0, 128),
    },
    toolId,
    rawArgs: args,
  });

  // Gatilhos de automação pós-criação (fora de workflows).
  const data = outcome.result.data as { requestId?: string; reference?: string } | undefined;
  if (outcome.result.status === 'success' && !outcome.replayed) {
    if (toolId === 'contact_request.create' && data?.requestId) {
      await emitToolAutomationTrigger({
        organizationId: organization.id,
        trigger: 'contact_request.created',
        triggerKey: `contact:${data.requestId}`,
        context: {
          callId: null,
          callFromNumber: null,
          callToNumber: null,
          contactPhone: String((args as { phone?: string })?.phone ?? ''),
          contactName: String((args as { name?: string })?.name ?? ''),
        },
      });
    }
    if (toolId === 'appointment.create' && data?.reference) {
      await emitToolAutomationTrigger({
        organizationId: organization.id,
        trigger: 'appointment.created',
        triggerKey: `appointment:${data.reference}`,
        context: {
          callId: null,
          callFromNumber: null,
          callToNumber: null,
          contactPhone: String((args as { customerPhone?: string })?.customerPhone ?? ''),
          contactName: String((args as { customerName?: string })?.customerName ?? ''),
        },
      });
    }
  }

  return {
    error:
      outcome.result.status === 'success'
        ? null
        : `(${outcome.result.status}) ${outcome.result.message}`,
    success:
      outcome.result.status === 'success'
        ? `${outcome.result.message} [${outcome.executionId ?? 'sem execução'}]`
        : null,
  };
}

/* ── Pedidos de contacto: atualização de estado (membros) ───── */

export async function setContactRequestStatusAction(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) redirect('/contacts?error=nao_configurado');
  await requireUser();
  const organization = await getActiveOrganization();
  if (!organization) redirect('/onboarding');

  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!id || !['open', 'contacted', 'closed'].includes(status)) {
    redirect('/contacts?error=argumentos_invalidos');
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('contact_requests')
    .update({ status })
    .eq('id', id)
    .eq('organization_id', organization.id);

  revalidatePath('/contacts');
  redirect(error ? '/contacts?error=atualizacao_falhou' : '/contacts?updated=1');
}
