import { NextResponse, type NextRequest } from 'next/server';

import { getTelephonyProvider } from '@/lib/voice/adapters';
import {
  DEFAULT_WEBHOOK_LIMITS,
  SlidingWindowRateLimiter,
  normalizeHeaders,
  processWebhookRequest,
  webhookErrorResponse,
} from '@/lib/voice/webhooks';
import { ingestStatusEvent } from '@/lib/voice/ingestion';

/**
 * Webhook de estado da chamada (PROMPT 07 §10).
 *
 * Eventos de ciclo de vida: deduplicação persistente, monotonia de estado
 * (fora de ordem não reverte), atualizações finais idempotentes.
 */

export const runtime = 'nodejs';

const rateLimiter = new SlidingWindowRateLimiter(120, 60);

export async function POST(request: NextRequest) {
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
    kind: 'status',
  });

  if (!result.ok) {
    const response = webhookErrorResponse(result.code, result.detail);
    return NextResponse.json(response.body, { status: response.status });
  }

  if (result.parsed.kind !== 'status') {
    const response = webhookErrorResponse('invalid_payload', 'Tipo de webhook inesperado.');
    return NextResponse.json(response.body, { status: response.status });
  }

  const outcome = await ingestStatusEvent({
    provider: getTelephonyProvider().name,
    event: result.parsed.event,
    callRef: result.parsed.callRef,
  });

  if (!outcome.ok) {
    const response = webhookErrorResponse(outcome.code, outcome.detail);
    return NextResponse.json(response.body, { status: response.status });
  }

  return NextResponse.json({
    received: true,
    outcome: outcome.kind,
  });
}
