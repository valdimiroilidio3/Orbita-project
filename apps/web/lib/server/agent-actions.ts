'use server';

import { redirect } from 'next/navigation';

import {
  canTransitionAgentStatus,
  createAgentSchema,
  updateAgentSchema,
  voiceConfigSchema,
  type AgentStatus,
  type VoiceConfigInput,
} from '@orbita/shared';
import type { ZodError } from 'zod';

import { isSupabaseConfigured } from '@/lib/env';
import { agentPermissions } from '@/lib/agents';
import { getActiveOrganization } from '@/lib/server/organizations';
import { requireUser } from '@/lib/server/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { AgentFormState } from '@/lib/server/agent-form-state';

/**
 * Server actions do Agent Studio.
 *
 * Regras:
 * • Validação SEMPRE no servidor (Zod), além do cliente.
 * • `organization_id` vem da sessão validada — nunca de campos do cliente.
 * • Transições de estado validadas contra a máquina de estados do produto.
 * • A autoridade de autorização é o RLS (docs/security.md); as permissões
 *   aqui apenas evitam operações que falhariam.
 * • Sem Supabase configurado NADA é criado/simulado — erro claro.
 */

function zodIssues(error: ZodError): string {
  return error.issues.map((issue) => issue.message).join(' · ');
}

function notConfigured(): AgentFormState {
  return {
    error:
      'Supabase não configurado: copia apps/web/.env.example para apps/web/.env.local e preenche NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY. A criação de agentes não é simulada.',
    success: null,
  };
}

function emptyToUndefined(value: FormDataEntryValue | null): string | undefined {
  const text = typeof value === 'string' ? value.trim() : '';
  return text.length > 0 ? text : undefined;
}

/**
 * Constrói a configuração de voz a partir dos campos do formulário.
 * Rejeita números inválidos; campos vazios são omitidos; chaves de segredo
 * são impossíveis — o objeto é montado apenas com campos conhecidos.
 */
function parseVoiceConfigFields(formData: FormData):
  | { ok: true; value: VoiceConfigInput }
  | { ok: false; error: string } {
  const voiceId = emptyToUndefined(formData.get('voiceId'));
  const greeting = emptyToUndefined(formData.get('greeting'));
  const style = emptyToUndefined(formData.get('style'));

  const rawSpeed = emptyToUndefined(formData.get('speed'));
  const rawPitch = emptyToUndefined(formData.get('pitch'));

  let speed: number | undefined;
  if (rawSpeed !== undefined) {
    speed = Number(rawSpeed);
    if (!Number.isFinite(speed)) return { ok: false, error: 'Velocidade inválida.' };
  }

  let pitch: number | undefined;
  if (rawPitch !== undefined) {
    pitch = Number(rawPitch);
    if (!Number.isFinite(pitch)) return { ok: false, error: 'Tom inválido.' };
  }

  const parsed = voiceConfigSchema.safeParse({ voiceId, speed, pitch, greeting, style });
  if (!parsed.success) return { ok: false, error: zodIssues(parsed.error) };
  return { ok: true, value: parsed.data };
}

export async function createAgentAction(
  _prevState: AgentFormState,
  formData: FormData,
): Promise<AgentFormState> {
  if (!isSupabaseConfigured()) return notConfigured();

  const user = await requireUser();
  const organization = await getActiveOrganization();
  if (!organization) redirect('/onboarding');

  const voice = parseVoiceConfigFields(formData);
  if (!voice.ok) return { error: voice.error, success: null };

  const parsed = createAgentSchema.safeParse({
    name: formData.get('name'),
    description: emptyToUndefined(formData.get('description')) ?? null,
    instructions: formData.get('instructions') ?? '',
    language: formData.get('language') ?? undefined,
    voiceConfig: voice.value,
    inboundPhoneNumber: emptyToUndefined(formData.get('inboundPhoneNumber')) ?? null,
  });
  if (!parsed.success) return { error: zodIssues(parsed.error), success: null };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('agents')
    .insert({
      organization_id: organization.id,
      created_by: user.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      instructions: parsed.data.instructions,
      language: parsed.data.language,
      status: parsed.data.status,
      voice_config: parsed.data.voiceConfig,
      inbound_phone_number: parsed.data.inboundPhoneNumber ?? null,
    })
    .select('id')
    .single();

  if (error || !data) {
    return { error: `Não foi possível criar o agente: ${error?.message ?? 'erro desconhecido'}`, success: null };
  }

  redirect(`/agents/${data.id}?created=1`);
}

export async function updateAgentAction(
  _prevState: AgentFormState,
  formData: FormData,
): Promise<AgentFormState> {
  if (!isSupabaseConfigured()) return notConfigured();

  await requireUser();
  const organization = await getActiveOrganization();
  if (!organization) redirect('/onboarding');

  const voice = parseVoiceConfigFields(formData);
  if (!voice.ok) return { error: voice.error, success: null };

  const parsed = updateAgentSchema.safeParse({
    id: formData.get('id'),
    name: formData.get('name'),
    description: emptyToUndefined(formData.get('description')) ?? null,
    instructions: formData.get('instructions') ?? '',
    language: formData.get('language') ?? undefined,
    voiceConfig: voice.value,
    inboundPhoneNumber: emptyToUndefined(formData.get('inboundPhoneNumber')) ?? null,
  });
  if (!parsed.success) return { error: zodIssues(parsed.error), success: null };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('agents')
    .update({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      instructions: parsed.data.instructions,
      language: parsed.data.language,
      voice_config: parsed.data.voiceConfig,
      inbound_phone_number: parsed.data.inboundPhoneNumber ?? null,
    })
    .eq('id', parsed.data.id)
    .eq('organization_id', organization.id);

  if (error) {
    return { error: `Não foi possível guardar o agente: ${error.message}`, success: null };
  }

  return { error: null, success: 'Alterações guardadas.' };
}

export async function setAgentStatusAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const next = String(formData.get('status') ?? '') as AgentStatus;

  if (!isSupabaseConfigured()) {
    redirect(`/agents/${id}?error=nao_configurado`);
  }

  await requireUser();
  const organization = await getActiveOrganization();
  if (!organization) redirect('/onboarding');

  const supabase = await createSupabaseServerClient();
  const { data: current } = await supabase
    .from('agents')
    .select('status')
    .eq('id', id)
    .eq('organization_id', organization.id)
    .maybeSingle();

  if (!current) {
    redirect(`/agents?error=nao_encontrado`);
  }

  const currentStatus = current.status as AgentStatus;
  if (!canTransitionAgentStatus(currentStatus, next)) {
    redirect(`/agents/${id}?error=transicao_invalida`);
  }

  const { error } = await supabase
    .from('agents')
    .update({ status: next })
    .eq('id', id)
    .eq('organization_id', organization.id);

  redirect(error ? `/agents/${id}?error=atualizacao_falhou` : `/agents/${id}?status=updated`);
}

export async function deleteAgentAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');

  if (!isSupabaseConfigured()) {
    redirect(`/agents/${id}?error=nao_configurado`);
  }

  await requireUser();
  const organization = await getActiveOrganization();
  if (!organization) redirect('/onboarding');

  if (!agentPermissions(organization.role).canDelete) {
    redirect(`/agents/${id}?error=sem_permissao`);
  }

  const supabase = await createSupabaseServerClient();
  // O histórico de chamadas é retido (agent_id fica NULL) — ver docs/data-model.md.
  const { error } = await supabase
    .from('agents')
    .delete()
    .eq('id', id)
    .eq('organization_id', organization.id);

  redirect(error ? `/agents/${id}?error=eliminacao_falhou` : '/agents?deleted=1');
}
