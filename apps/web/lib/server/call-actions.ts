'use server';

import { redirect } from 'next/navigation';

import {
  canTransitionCallStatus,
  isTerminalCallStatus,
  startCallSchema,
  type CallStatus,
} from '@orbita/shared';
import type { ZodError } from 'zod';

import {
  CALL_PROVIDER_SIMULADO,
  INITIAL_CALL_STATUS,
  SIMULATED_CALL_PROGRESS,
  canCancelCall,
  canFinishCall,
  computeCallDurationSeconds,
  estimateSimulatedCost,
} from '@/lib/calls';
import { isSupabaseConfigured } from '@/lib/env';
import { getActiveOrganization } from '@/lib/server/organizations';
import { requireUser } from '@/lib/server/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { CallFormState } from '@/lib/server/call-form-state';
import { dispatchCallAutomations } from '@/lib/tools/call-triggers';

/**
 * Server actions do motor de chamadas.
 *
 * Nesta fase o fornecedor é sempre o SIMULADOR local (identificado como
 * `provider = 'simulado'`) — não existe telefonia real. A orquestração
 * valida cada transição com a máquina de estados do produto; a BD impõe
 * o piso (trigger `calls_guard`) e o RLS a autorização.
 *
 * A telefonia real (ex.: Twilio) entrará por uma implementação de
 * `CallProvider` — ver docs/call-engine.md. Nada é simulado como sucesso
 * quando o Supabase não está configurado.
 */

function zodIssues(error: ZodError): string {
  return error.issues.map((issue) => issue.message).join(' · ');
}

function notConfiguredRedirect(id = ''): never {
  redirect(id ? `/calls/${id}?error=nao_configurado` : '/calls?error=nao_configurado');
}

async function requireOrg() {
  const organization = await getActiveOrganization();
  if (!organization) redirect('/onboarding');
  return organization;
}

export async function startCallAction(
  _prevState: CallFormState,
  formData: FormData,
): Promise<CallFormState> {
  if (!isSupabaseConfigured()) {
    return {
      error:
        'Supabase não configurado: copia apps/web/.env.example para apps/web/.env.local e preenche as variáveis públicas. Chamadas não são criadas nem simuladas.',
      success: null,
    };
  }

  await requireUser();
  const organization = await requireOrg();

  const parsed = startCallSchema.safeParse({
    agentId: formData.get('agentId'),
    toNumber: formData.get('toNumber'),
  });
  if (!parsed.success) return { error: zodIssues(parsed.error), success: null };

  const supabase = await createSupabaseServerClient();

  // O agente tem de estar ATIVO e pertencer à organização (RLS + verificação).
  const { data: agent } = await supabase
    .from('agents')
    .select('id')
    .eq('id', parsed.data.agentId)
    .eq('organization_id', organization.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!agent) {
    return {
      error: 'Seleciona um agente ativo da tua organização para iniciar a chamada.',
      success: null,
    };
  }

  const startedAt = new Date().toISOString();
  const { data: call, error } = await supabase
    .from('calls')
    .insert({
      organization_id: organization.id,
      agent_id: parsed.data.agentId,
      direction: 'outbound',
      status: INITIAL_CALL_STATUS,
      to_number: parsed.data.toNumber,
      provider: CALL_PROVIDER_SIMULADO,
      provider_call_id: `sim-${crypto.randomUUID()}`,
      started_at: startedAt,
    })
    .select('id')
    .single();

  if (error || !call) {
    return {
      error: `Não foi possível criar a chamada: ${error?.message ?? 'erro desconhecido'}`,
      success: null,
    };
  }

  // O simulador percorre a sequência de ligação; cada transição é validada.
  let status: CallStatus = INITIAL_CALL_STATUS;
  for (const next of SIMULATED_CALL_PROGRESS) {
    if (!canTransitionCallStatus(status, next)) {
      redirect(`/calls/${call.id}?error=transicao_invalida`);
    }
    const { error: stepError } = await supabase
      .from('calls')
      .update({ status: next })
      .eq('id', call.id)
      .eq('organization_id', organization.id);
    if (stepError) redirect(`/calls/${call.id}?error=atualizacao_falhou`);
    status = next;
  }

  redirect(`/calls/${call.id}?started=1`);
}

export async function finishCallAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  if (!isSupabaseConfigured()) notConfiguredRedirect(id);

  await requireUser();
  const organization = await requireOrg();
  const supabase = await createSupabaseServerClient();

  const { data: call } = await supabase
    .from('calls')
    .select('status, started_at, from_number, to_number')
    .eq('id', id)
    .eq('organization_id', organization.id)
    .maybeSingle();

  if (!call) redirect(`/calls?error=nao_encontrado`);
  if (!canFinishCall(call.status as CallStatus)) {
    redirect(`/calls/${id}?error=transicao_invalida`);
  }

  const endedAt = new Date().toISOString();
  const duration = computeCallDurationSeconds(call.started_at ?? endedAt, endedAt);

  const { error } = await supabase
    .from('calls')
    .update({
      status: 'completed',
      ended_at: endedAt,
      duration_seconds: duration,
      estimated_cost: estimateSimulatedCost(duration),
    })
    .eq('id', id)
    .eq('organization_id', organization.id);

  if (!error) {
    // Gatilho real `call.completed` (simulador = chamada real na BD, sem telefonia).
    await dispatchCallAutomations({
      organizationId: organization.id,
      callId: id,
      status: 'completed',
      fromNumber: call.from_number ?? null,
      toNumber: call.to_number ?? null,
    });
  }

  redirect(error ? `/calls/${id}?error=atualizacao_falhou` : `/calls/${id}?status=updated`);
}

export async function cancelCallAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  if (!isSupabaseConfigured()) notConfiguredRedirect(id);

  await requireUser();
  const organization = await requireOrg();
  const supabase = await createSupabaseServerClient();

  const { data: call } = await supabase
    .from('calls')
    .select('status, started_at, from_number, to_number')
    .eq('id', id)
    .eq('organization_id', organization.id)
    .maybeSingle();

  if (!call) redirect(`/calls?error=nao_encontrado`);
  const status = call.status as CallStatus;
  if (isTerminalCallStatus(status) || !canCancelCall(status)) {
    redirect(`/calls/${id}?error=transicao_invalida`);
  }

  const endedAt = new Date().toISOString();
  const duration = computeCallDurationSeconds(call.started_at ?? endedAt, endedAt);

  const { error } = await supabase
    .from('calls')
    .update({
      status: 'cancelled',
      ended_at: endedAt,
      duration_seconds: duration,
      estimated_cost: estimateSimulatedCost(duration),
    })
    .eq('id', id)
    .eq('organization_id', organization.id);

  redirect(error ? `/calls/${id}?error=atualizacao_falhou` : `/calls/${id}?status=updated`);
}
