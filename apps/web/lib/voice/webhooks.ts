import type { CallLifecycleEvent } from '@orbita/shared';

import type { InboundCallInfo, TelephonyProvider, VoiceErrorCode } from '@/lib/voice/contracts';
import { VoiceIntegrationError } from '@/lib/voice/contracts';

/**
 * VoiceWebhookService — receção e processamento de webhooks autenticados
 * (PROMPT 07 §9).
 *
 * Todo o webhook é entrada externa NÃO CONFIÁVEL:
 *   1. limite de tamanho do payload;
 *   2. verificação de assinatura oficial (fail-closed);
 *   3. janela anti-replay (quando o fornecedor assina timestamps);
 *   4. parsing/validação por adaptador (payloads inválidos → 400);
 *   5. deduplicação persistente a jusante (unicidade do evento);
 *   6. respostas HTTP tipadas: auth ≠ validação ≠ falha interna.
 */

export interface WebhookRequest {
  rawBody: string;
  headers: Record<string, string>;
  /** Endereço IP de origem (rate limiting). */
  sourceIp: string | null;
}

export interface WebhookLimits {
  maxPayloadBytes: number;
  replayWindowSeconds: number;
}

export const DEFAULT_WEBHOOK_LIMITS: WebhookLimits = {
  maxPayloadBytes: 64 * 1024,
  replayWindowSeconds: 300,
};

export type WebhookParseResult =
  | { kind: 'inbound'; info: InboundCallInfo }
  | { kind: 'status'; event: CallLifecycleEvent; callRef: string };

export type WebhookProcessResult =
  | { ok: true; parsed: WebhookParseResult }
  | { ok: false; code: VoiceErrorCode; status: number; detail: string };

const ERROR_STATUS: Record<VoiceErrorCode, number> = {
  integration_not_configured: 503,
  invalid_signature: 401,
  invalid_payload: 400,
  payload_too_large: 413,
  replay_detected: 409,
  rate_limited: 429,
  agent_not_ready: 422,
  session_failed: 502,
  provider_unavailable: 503,
  persistence_failed: 500,
};

function fail(code: VoiceErrorCode, detail: string): WebhookProcessResult {
  return { ok: false, code, status: ERROR_STATUS[code], detail };
}

/**
 * Processa o pedido de webhook até à normalização do evento.
 * A persistência (dedup + ciclo de vida) acontece a jusante, no serviço de
 * ingestão — aqui garante-se autenticidade e validade do payload.
 */
export function processWebhookRequest(params: {
  request: WebhookRequest;
  adapter: TelephonyProvider;
  secret: string;
  limits?: WebhookLimits;
  nowSeconds: number;
  kind: 'inbound' | 'status';
}): WebhookProcessResult {
  const limits = params.limits ?? DEFAULT_WEBHOOK_LIMITS;
  const { request, adapter } = params;

  // 1. Tamanho do payload.
  if (request.rawBody.length > limits.maxPayloadBytes) {
    return fail('payload_too_large', 'Payload excede o limite permitido.');
  }
  if (request.rawBody.trim() === '') {
    return fail('invalid_payload', 'Payload vazio.');
  }

  // 2. Assinatura oficial — nunca confiar apenas em identificadores recebidos.
  let signatureOk = false;
  try {
    signatureOk = adapter.verifyWebhookSignature({
      rawBody: request.rawBody,
      headers: request.headers,
      secret: params.secret,
    });
  } catch {
    signatureOk = false;
  }
  if (!signatureOk) {
    return fail('invalid_signature', 'Assinatura do webhook inválida ou ausente.');
  }

  // 3. Janela anti-replay (quando aplicável ao esquema do fornecedor).
  const timestampHeader = request.headers['x-webhook-timestamp'];
  if (timestampHeader !== undefined) {
    const ts = Number(timestampHeader);
    if (!Number.isFinite(ts) || Math.abs(params.nowSeconds - ts) > limits.replayWindowSeconds) {
      return fail('replay_detected', 'Timestamp do webhook fora da janela aceite.');
    }
  }

  // 4. Parsing/validação por adaptador.
  try {
    if (params.kind === 'inbound') {
      return {
        ok: true,
        parsed: { kind: 'inbound', info: adapter.parseInboundWebhook(request.rawBody) },
      };
    }
    const event = adapter.parseStatusWebhook(request.rawBody);
    return { ok: true, parsed: { kind: 'status', event, callRef: event.callRef } };
  } catch (error) {
    if (error instanceof VoiceIntegrationError) {
      return fail(error.code, error.message);
    }
    return fail('invalid_payload', 'Payload de webhook inválido.');
  }
}

/**
 * Rate limiting simples por IP (best-effort, instância única).
 * Registo de janela deslizante — suficiente para V1; produção com
 * proxy/CDN deve acrescentar limites distribuídos (documentado).
 */
export class SlidingWindowRateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly maxPerWindow: number,
    private readonly windowSeconds: number,
  ) {}

  check(key: string, nowSeconds: number): boolean {
    const windowMs = this.windowSeconds * 1000;
    const cutoff = nowSeconds * 1000 - windowMs;
    const timestamps = (this.hits.get(key) ?? []).filter((t) => t > cutoff);

    if (timestamps.length >= this.maxPerWindow) {
      this.hits.set(key, timestamps);
      return false;
    }
    timestamps.push(nowSeconds * 1000);
    this.hits.set(key, timestamps);

    // Limpeza defensiva do mapa (não cresce sem limite).
    if (this.hits.size > 10_000) {
      for (const [k, v] of this.hits) {
        if (v.every((t) => t <= cutoff)) this.hits.delete(k);
      }
    }
    return true;
  }
}

export function webhookErrorResponse(
  code: VoiceErrorCode,
  detail: string,
): {
  status: number;
  body: { error: { code: string; message: string } };
} {
  return {
    status: ERROR_STATUS[code],
    body: { error: { code, message: detail } },
  };
}

/** Cabeçalhos de assinatura normalizados (minúsculos). */
export function normalizeHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key.toLowerCase()] = value;
  });
  return result;
}
