import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Interface de integração de reservas (PROMPT 08 §4.D).
 *
 * Sem sistema de reservas externo configurado, é usado o
 * DevBookingAdapter — adaptador de DESENVOLVIMENTO explicitamente
 * identificado (`source = 'dev-adapter'`). As reservas criadas por ele
 * NUNCA são apresentadas como reservas reais de um sistema externo.
 */

export interface BookingRequest {
  organizationId: string;
  callId: string | null;
  service: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  customerName: string | null;
  customerPhone: string;
  idempotencyKey: string;
}

export type BookingResult =
  | { ok: true; reference: string; source: string; duplicate: boolean }
  | { ok: false; code: 'conflict' | 'provider_unavailable' | 'internal_error'; message: string };

export interface BookingProvider {
  readonly name: string;
  readonly isDevelopment: boolean;
  createBooking(client: SupabaseClient, request: BookingRequest): Promise<BookingResult>;
  cancelBooking?(_client: SupabaseClient, _reference: string): Promise<{ ok: boolean }>;
}

/**
 * Adaptador de desenvolvimento — cria a marcação na base de dados local com
 * proteção contra duplicação (idempotência + horário único). Identificado
 * explicitamente em todos os resultados.
 */
export class DevBookingAdapter implements BookingProvider {
  readonly name = 'dev-adapter';
  readonly isDevelopment = true;

  async createBooking(client: SupabaseClient, request: BookingRequest): Promise<BookingResult> {
    // Idempotência: repetir o mesmo pedido devolve a referência existente.
    const { data: existing } = await client
      .from('appointments')
      .select('id, source')
      .eq('organization_id', request.organizationId)
      .eq('idempotency_key', request.idempotencyKey)
      .maybeSingle();

    if (existing) {
      return { ok: true, reference: existing.id, source: existing.source, duplicate: true };
    }

    const { data: created, error } = await client
      .from('appointments')
      .insert({
        organization_id: request.organizationId,
        call_id: request.callId,
        service: request.service,
        starts_at: request.startsAt,
        ends_at: request.endsAt,
        timezone: request.timezone,
        customer_name: request.customerName,
        customer_phone: request.customerPhone,
        status: 'confirmed',
        source: this.name,
        external_ref: `dev-${crypto.randomUUID()}`,
        idempotency_key: request.idempotencyKey,
      })
      .select('id')
      .single();

    if (error) {
      // Índice único de horário (org+serviço+início) → conflito real.
      if (error.code === '23505') {
        return {
          ok: false,
          code: 'conflict',
          message: 'Esse horário já está marcado. Escolhe outro.',
        };
      }
      return {
        ok: false,
        code: 'internal_error',
        message: 'Não foi possível registar a marcação.',
      };
    }

    return { ok: true, reference: created.id, source: this.name, duplicate: false };
  }
}

export function getBookingProvider(): BookingProvider {
  // Quando existir um sistema de reservas real, registar aqui o adaptador
  // respetivo (docs/tool-integrations.md). Nada é apresentado como real
  // sem essa integração.
  return new DevBookingAdapter();
}
