import type { SupabaseClient } from '@supabase/supabase-js';

import {
  computeAvailableSlots,
  parseBusinessHours,
  parseServiceLines,
  weekdayOf,
  type BusinessInfoSection,
  type ToolResult,
} from '@orbita/shared';

import { getBookingProvider } from '@/lib/tools/booking';
import { isUniqueViolation } from '@/lib/tools/repository';

/**
 * Handlers das ferramentas empresariais (PROMPT 08 §4).
 *
 * Regras transversais:
 *   • dados APENAS da organização do contexto validado — nunca consultas
 *     arbitrárias nem informação interna;
 *   • resultados estruturados e previsíveis (§12) — nunca inventar horários,
 *     reservas nem sucesso;
 *   • falha distingue-se de indisponibilidade técnica.
 */

export interface ToolHandlerContext {
  client: SupabaseClient;
  organizationId: string;
  callId: string | null;
  fromWorkflow: boolean;
  createdBy: string | null;
}

function internalError(): ToolResult {
  return {
    status: 'internal_error',
    message: 'Ocorreu um erro técnico. Tenta novamente ou fala com a equipa.',
  };
}

async function loadProfile(client: SupabaseClient, organizationId: string) {
  const { data, error } = await client
    .from('business_profiles')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();
  return { profile: data, error };
}

/* ── A. business_info.lookup ───────────────────────────────── */

export async function handleBusinessInfoLookup(
  ctx: ToolHandlerContext,
  args: { section?: BusinessInfoSection },
): Promise<ToolResult> {
  const { profile, error } = await loadProfile(ctx.client, ctx.organizationId);
  if (error) return internalError();
  if (!profile) {
    return {
      status: 'not_found',
      message:
        'A empresa ainda não configurou a informação pública. Oferece encaminhar para a equipa.',
    };
  }

  const hours = parseBusinessHours(profile.hours_text ?? '');
  const services = parseServiceLines(profile.services_text ?? '');

  const all: Record<BusinessInfoSection, string> = {
    hours: hours.ok
      ? Object.entries(hours.value)
          .map(([day, ranges]) =>
            `${day}: ${ranges.length === 0 ? 'fechado' : ranges.map((r) => `${r.start}-${r.end}`).join(', ')}`,
          )
          .join('; ')
      : 'Horário não disponível.',
    services: services.ok
      ? services.value.map((s) => `${s.name} (${s.durationMinutes} min${s.price ? `, ${s.price}` : ''})`).join('; ')
      : 'Serviços não disponíveis.',
    prices: profile.prices ?? '',
    address: profile.address ?? '',
    contacts: [profile.phone ? `tel. ${profile.phone}` : '', profile.email ?? ''].filter(Boolean).join('; '),
    faq: profile.faq ?? '',
    policies: profile.policies ?? '',
  };

  const section = args.section;
  const data: Record<string, string> = section ? { [section]: all[section] } : all;

  // Seções vazias não são preenchidas com informação inventada.
  for (const [key, value] of Object.entries(data)) {
    if (value.trim() === '') delete data[key];
  }
  if (Object.keys(data).length === 0) {
    return { status: 'not_found', message: 'Sem informação disponível nessa categoria.' };
  }

  return {
    status: 'success',
    message: 'Informação consultada.',
    data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.slice(0, 2000)])),
  };
}

/* ── B. availability.check ─────────────────────────────────── */

function isSupportedTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('pt-PT', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export async function handleAvailabilityCheck(
  ctx: ToolHandlerContext,
  args: { service: string; date: string; timezone: string; durationMinutes: number },
): Promise<ToolResult> {
  if (!isSupportedTimezone(args.timezone)) {
    return { status: 'validation_error', message: 'Fuso horário inválido.' };
  }

  const { profile, error } = await loadProfile(ctx.client, ctx.organizationId);
  if (error) return internalError();
  if (!profile) {
    return { status: 'provider_unavailable', message: 'Horário da empresa não configurado.' };
  }

  const hours = parseBusinessHours(profile.hours_text ?? '');
  const services = parseServiceLines(profile.services_text ?? '');
  if (!hours.ok || !services.ok) {
    return { status: 'provider_unavailable', message: 'Configuração de horário/serviços inválida.' };
  }

  const service = services.value.find(
    (item) => item.name.toLowerCase() === args.service.trim().toLowerCase(),
  );
  if (!service) {
    return { status: 'not_found', message: 'Serviço não encontrado.' };
  }

  const day = weekdayOf(args.date);
  if (!day) return { status: 'validation_error', message: 'Data inválida.' };

  const dayHours = hours.value[day] ?? [];
  if (dayHours.length === 0) {
    return {
      status: 'success',
      message: `A empresa está fechada nesse dia (${day}).`,
      data: { available: 'false', slots: '' },
    };
  }

  // Marcações REAIS existentes — nunca horários inventados.
  const dayStart = `${args.date}T00:00:00`;
  const dayEnd = `${args.date}T23:59:59`;
  const { data: busyRows, error: busyError } = await ctx.client
    .from('appointments')
    .select('starts_at, ends_at')
    .eq('organization_id', ctx.organizationId)
    .eq('service', service.name)
    .eq('status', 'confirmed')
    .gte('starts_at', dayStart)
    .lte('starts_at', dayEnd);

  if (busyError) return internalError();

  const busy = (busyRows ?? []).map((row) => ({
    start: new Date(row.starts_at).toISOString().slice(11, 16),
    end: new Date(row.ends_at).toISOString().slice(11, 16),
  }));

  const slots = computeAvailableSlots({
    hours: dayHours,
    busy,
    durationMinutes: Math.min(args.durationMinutes, service.durationMinutes),
    limit: 8,
  });

  if (slots.length === 0) {
    return {
      status: 'success',
      message: 'Sem horários livres nesse dia.',
      data: { available: 'false', slots: '' },
    };
  }

  return {
    status: 'success',
    message: `${slots.length} horário(s) livre(is).`,
    data: { available: 'true', slots: slots.join(', ') },
  };
}

/* ── C. contact_request.create ─────────────────────────────── */

export async function handleContactRequestCreate(
  ctx: ToolHandlerContext,
  args: { name?: string; phone: string; reason: string; preferredPeriod?: string },
  idempotencyKey: string,
): Promise<ToolResult> {
  // Idempotência: repetir o mesmo pedido não cria duplicados.
  const { data: existing } = await ctx.client
    .from('contact_requests')
    .select('id')
    .eq('organization_id', ctx.organizationId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (existing) {
    return {
      status: 'success',
      message: 'Pedido de contacto já existente — confirmado sem duplicar.',
      data: { requestId: existing.id, duplicate: 'true' },
    };
  }

  const { data: created, error } = await ctx.client
    .from('contact_requests')
    .insert({
      organization_id: ctx.organizationId,
      call_id: ctx.callId,
      name: args.name ?? null,
      phone: args.phone,
      reason: args.reason,
      preferred_period: args.preferredPeriod ?? null,
      status: 'open',
      idempotency_key: idempotencyKey,
      created_by: ctx.createdBy,
    })
    .select('id')
    .single();

  if (error) {
    if (isUniqueViolation(error)) {
      return {
        status: 'success',
        message: 'Pedido de contacto já existente — confirmado sem duplicar.',
        data: { requestId: '', duplicate: 'true' },
      };
    }
    return internalError();
  }

  // Confirmação verbal APENAS depois de criado (política conversacional).
  return {
    status: 'success',
    message:
      'Pedido de contacto criado com sucesso — podes confirmar ao interlocutor que a equipa vai contactá-lo.',
    data: { requestId: created.id, duplicate: 'false' },
  };
}

/* ── D. appointment.create ─────────────────────────────────── */

export async function handleAppointmentCreate(
  ctx: ToolHandlerContext,
  args: {
    service: string;
    startsAt: string;
    timezone: string;
    durationMinutes: number;
    customerName?: string;
    customerPhone: string;
    confirmedByCaller: boolean;
  },
  idempotencyKey: string,
): Promise<ToolResult> {
  if (!isSupportedTimezone(args.timezone)) {
    return { status: 'validation_error', message: 'Fuso horário inválido.' };
  }
  if (!args.confirmedByCaller) {
    return {
      status: 'validation_error',
      message: 'Confirma primeiro com o interlocutor os dados da marcação.',
    };
  }

  const { profile, error } = await loadProfile(ctx.client, ctx.organizationId);
  if (error) return internalError();

  const services = parseServiceLines(profile?.services_text ?? '');
  const service = services.ok
    ? services.value.find((item) => item.name.toLowerCase() === args.service.trim().toLowerCase())
    : undefined;
  const durationMinutes = service?.durationMinutes ?? args.durationMinutes;

  const startsAt = new Date(args.startsAt);
  if (!Number.isFinite(startsAt.getTime())) {
    return { status: 'validation_error', message: 'Data/hora inválida.' };
  }
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

  // 1. Reverificação de disponibilidade antes de confirmar.
  const day = weekdayOf(startsAt.toISOString().slice(0, 10));
  const hours = parseBusinessHours(profile?.hours_text ?? '');
  if (hours.ok && day) {
    const dayHours = hours.value[day] ?? [];
    const startHHMM = startsAt.toISOString().slice(11, 16);
    const endHHMM = endsAt.toISOString().slice(11, 16);
    const withinHours = dayHours.some(
      (range) => startHHMM >= range.start && endHHMM <= range.end,
    );
    if (dayHours.length > 0 && !withinHours) {
      return {
        status: 'conflict',
        message: 'Fora do horário de funcionamento.',
      };
    }
  }

  const { data: conflict } = await ctx.client
    .from('appointments')
    .select('id')
    .eq('organization_id', ctx.organizationId)
    .eq('service', args.service.trim().slice(0, 120))
    .eq('status', 'confirmed')
    .eq('starts_at', startsAt.toISOString())
    .maybeSingle();

  if (conflict) {
    return { status: 'conflict', message: 'Esse horário já está marcado. Escolhe outro.' };
  }

  // 2. Reserva via adaptador — resultado real do sistema responsável.
  const booking = getBookingProvider();
  const outcome = await booking.createBooking(ctx.client, {
    organizationId: ctx.organizationId,
    callId: ctx.callId,
    service: args.service.trim().slice(0, 120),
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    timezone: args.timezone,
    customerName: args.customerName ?? null,
    customerPhone: args.customerPhone,
    idempotencyKey,
  });

  if (!outcome.ok) {
    if (outcome.code === 'conflict') {
      return { status: 'conflict', message: outcome.message };
    }
    return { status: 'internal_error', message: 'Não foi possível concluir a marcação.' };
  }

  return {
    status: 'success',
    message: outcome.duplicate
      ? 'Marcação já existente — confirmada sem duplicar.'
      : `Marcação registada com sucesso (adaptador de desenvolvimento «${outcome.source}» — não é um sistema de reservas externo).`,
    data: {
      reference: outcome.reference,
      source: outcome.source,
      duplicate: outcome.duplicate ? 'true' : 'false',
    },
  };
}

/* ── E. call.transfer ──────────────────────────────────────── */

const TRANSFER_ROUTE_PATTERN = /^[a-z][a-z0-9_-]{1,63}$/;

export async function handleCallTransfer(
  _ctx: ToolHandlerContext,
  args: { destination: string },
): Promise<ToolResult> {
  // Destinos arbitrários (números inventados pelo modelo) são rejeitados.
  if (!TRANSFER_ROUTE_PATTERN.test(args.destination)) {
    return {
      status: 'validation_error',
      message: 'Destino inválido — usa uma rota autorizada da empresa.',
    };
  }

  // Integração telefónica não suporta transferências nesta fase (Prompt 07
  // pendente) → `unsupported` + alternativa, nunca sucesso simulado.
  return {
    status: 'unsupported',
    message:
      'Transferências de chamada ainda não são suportadas. Posso registar um pedido de contacto para a equipa ligar de volta.',
  };
}
