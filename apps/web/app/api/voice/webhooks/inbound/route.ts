import { NextResponse, type NextRequest } from 'next/server';

import { getTelephonyProvider } from '@/lib/voice/adapters';
import {
  DEFAULT_WEBHOOK_LIMITS,
  SlidingWindowRateLimiter,
  normalizeHeaders,
  processWebhookRequest,
  webhookErrorResponse,
} from '@/lib/voice/webhooks';
import { ingestInboundCall } from '@/lib/voice/ingestion';

/**
 * Webhook de chamada recebida (PROMPT 07 §10).
 *
 * Entrada externa não confiável: assinatura verificada (fail-closed),
 * payload validado, deduplicação persistente e resposta tipada.
 * Sem fornecedor configurado → 503 explícito (nada é simulado).
 */

import { log, newCorrelationId } from '@/lib/observability/logger';

export const runtime = 'nodejs';

const rateLimiter = new SlidingWindowRateLimiter(60, 60);

export async function POST(request: NextRequest) {
  const correlationId = request.headers.get('x-request-id') ?? newCorrelationId();
  const nowSeconds = Math.floor(Date.now() / 1000);
  const sourceIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

  if (sourceIp && !rateLimiter.check(sourceIp, nowSeconds)) {
    const response = webhookErrorResponse('rate_limited', 'Demais pedidos. Tenta mais tarde.');
    return NextResponse.json(response.body, { status: response.status });
  }

  const rawBody = await request.text();
  const headers = normalizeHeaders(request.headers);
  const secret = process.env.TELEPHONY_WEBHOOK_SECRET ?? '';

  const result = processWebhookRequest({
    request: { rawBody, headers, sourceIp },
    adapter: getTelephonyProvider(),
    secret,
    limits: DEFAULT_WEBHOOK_LIMITS,
    nowSeconds,
    kind: 'inbound',
  });

  if (!result.ok) {
    log('warn', 'webhook.rejected', {
      kind: 'inbound',
      correlationId,
      code: result.code,
      sourceIp,
    });
    const response = webhookErrorResponse(result.code, result.detail);
    return NextResponse.json(response.body, {
      status: response.status,
      headers: { 'x-request-id': correlationId },
    });
  }

  if (result.parsed.kind !== 'inbound') {
    const response = webhookErrorResponse('invalid_payload', 'Tipo de webhook inesperado.');
    return NextResponse.json(response.body, { status: response.status });
  }

  const outcome = await ingestInboundCall({
    provider: getTelephonyProvider().name,
    info: result.parsed.info,
  });

  if (!outcome.ok) {
    log('error', 'webhook.persistence_failed', {
      kind: 'inbound',
      correlationId,
      code: outcome.code,
    });
    const response = webhookErrorResponse(outcome.code, outcome.detail);
    return NextResponse.json(response.body, {
      status: response.status,
      headers: { 'x-request-id': correlationId },
    });
  }

  log('info', 'webhook.processed', {
    kind: 'inbound',
    correlationId,
    outcome: outcome.kind,
    callId: outcome.callId,
  });

  // Resposta mínima — sem detalhes internos.
  return NextResponse.json(
    { received: true, outcome: outcome.kind },
    { headers: { 'x-request-id': correlationId } },
  );
}
