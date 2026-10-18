import { describe, expect, it } from 'vitest';

import { sanitizeCallEventMetadata, type CallLifecycleEvent } from '@orbita/shared';

import {
  computeHmacSignature,
  isWithinReplayWindow,
  verifyHmacSignature,
} from '@/lib/voice/adapters/hmac';
import { PendingTelephonyProvider, PendingVoiceProvider } from '@/lib/voice/adapters/pending';
import { buildHardenedSystemInstructions, resolveVoiceSessionConfig } from '@/lib/voice/config';
import { deriveVoiceDiagnostics } from '@/lib/voice/diagnostics';
import { readVoiceEnv } from '@/lib/voice/env';
import { buildCallEventInsert, isDuplicateEventError } from '@/lib/voice/events';
import { computeLifecyclePatch, reconcileStaleCall, type CallLifecycleState } from '@/lib/voice/lifecycle';
import {
  DEFAULT_WEBHOOK_LIMITS,
  SlidingWindowRateLimiter,
  processWebhookRequest,
} from '@/lib/voice/webhooks';
import { VoiceIntegrationError, type TelephonyProvider } from '@/lib/voice/contracts';

/**
 * Testes unitários do motor de voz (PROMPT 07 §15).
 * NOTA: usam mocks/adaptadores de teste — NÃO contam como prova de
 * integração real (docs/voice-testing.md).
 */

function event(overrides: Partial<CallLifecycleEvent> & { type: CallLifecycleEvent['type'] }): CallLifecycleEvent {
  return {
    occurredAt: '2026-10-18T10:00:05.000Z',
    providerEventId: `evt-${overrides.type}`,
    ...overrides,
  };
}

const baseState: CallLifecycleState = {
  status: 'queued',
  startedAt: '2026-10-18T10:00:00.000Z',
  lastOccurredAt: '2026-10-18T10:00:00.000Z',
  voiceSessionId: null,
};

/* ── Ciclo de vida ─────────────────────────────────────────── */

describe('computeLifecyclePatch — ciclo de vida', () => {
  it('criação: received não altera queued (evento de criação)', () => {
    const outcome = computeLifecyclePatch(baseState, event({ type: 'call.received' }), '2026-10-18T10:00:06.000Z');
    expect(outcome.kind).toBe('noop');
  });

  it('início de sessão: answered → in_progress com answered_at e sessão de voz', () => {
    const outcome = computeLifecyclePatch(
      { ...baseState, status: 'ringing', lastOccurredAt: '2026-10-18T10:00:03.000Z' },
      event({ type: 'call.answered', voiceSessionId: 'vs-1' }),
      '2026-10-18T10:00:06.000Z',
    );
    expect(outcome.kind).toBe('applied');
    if (outcome.kind === 'applied') {
      expect(outcome.status).toBe('in_progress');
      expect(outcome.patch.answeredAt).toBe('2026-10-18T10:00:05.000Z');
      expect(outcome.patch.voiceSessionId).toBe('vs-1');
    }
  });

  it('terminação normal: ended → completed com duração coerente', () => {
    const outcome = computeLifecyclePatch(
      { ...baseState, status: 'in_progress', lastOccurredAt: '2026-10-18T10:00:03.000Z' },
      event({ type: 'call.ended', occurredAt: '2026-10-18T10:01:00.000Z' }),
      '2026-10-18T10:01:01.000Z',
    );
    expect(outcome.kind).toBe('applied');
    if (outcome.kind === 'applied') {
      expect(outcome.patch.status).toBe('completed');
      expect(outcome.patch.durationSeconds).toBe(60);
      expect(outcome.patch.endedAt).toBe('2026-10-18T10:01:00.000Z');
    }
  });

  it('falha na criação da sessão: failed com razão sanitizada', () => {
    const outcome = computeLifecyclePatch(
      { ...baseState, status: 'initiating', lastOccurredAt: '2026-10-18T10:00:03.000Z' },
      event({ type: 'call.failed', failureCode: 'session_failed', failureReason: 'Sessão recusada pelo fornecedor' }),
      '2026-10-18T10:00:06.000Z',
    );
    expect(outcome.kind).toBe('applied');
    if (outcome.kind === 'applied') {
      expect(outcome.patch.status).toBe('failed');
      expect(outcome.patch.failureCode).toBe('session_failed');
      expect(outcome.patch.failureReason).toBe('Sessão recusada pelo fornecedor');
    }
  });

  it('desconexão inesperada: failed é terminal e idempotente', () => {
    const state: CallLifecycleState = { ...baseState, status: 'failed', lastOccurredAt: '2026-10-18T10:00:04.000Z' };
    const again = computeLifecyclePatch(state, event({ type: 'call.failed' }), '2026-10-18T10:00:06.000Z');
    expect(again.kind).toBe('noop');
  });

  it('evento fora de ordem NÃO reverte o estado final', () => {
    const state: CallLifecycleState = { ...baseState, status: 'completed', lastOccurredAt: '2026-10-18T10:01:00.000Z' };
    const late = computeLifecyclePatch(
      state,
      event({ type: 'call.ringing', occurredAt: '2026-10-18T10:00:59.000Z' }),
      '2026-10-18T10:01:05.000Z',
    );
    expect(late.kind).toBe('noop');
  });

  it('evento stale (occurredAt anterior) é ignorado', () => {
    const state: CallLifecycleState = { ...baseState, status: 'in_progress', lastOccurredAt: '2026-10-18T10:00:30.000Z' };
    const stale = computeLifecyclePatch(
      state,
      event({ type: 'call.ended', occurredAt: '2026-10-18T10:00:10.000Z' }),
      '2026-10-18T10:00:31.000Z',
    );
    expect(stale.kind).toBe('noop');
    if (stale.kind === 'noop') expect(stale.reason).toBe('stale_event');
  });

  it('repetição de ended é idempotente', () => {
    const state: CallLifecycleState = { ...baseState, status: 'completed', lastOccurredAt: '2026-10-18T10:01:00.000Z' };
    const repeat = computeLifecyclePatch(
      state,
      event({ type: 'call.ended', occurredAt: '2026-10-18T10:01:00.000Z' }),
      '2026-10-18T10:01:05.000Z',
    );
    expect(repeat.kind).toBe('noop');
  });

  it('resultados alternativos: busy e no_answer', () => {
    for (const type of ['call.busy', 'call.no_answer'] as const) {
      const outcome = computeLifecyclePatch(
        { ...baseState, status: 'ringing', lastOccurredAt: '2026-10-18T10:00:03.000Z' },
        event({ type }),
        '2026-10-18T10:00:06.000Z',
      );
      expect(outcome.kind).toBe('applied');
      if (outcome.kind === 'applied') {
        expect(outcome.patch.status).toBe(type === 'call.busy' ? 'busy' : 'no_answer');
      }
    }
  });
});

describe('reconcileStaleCall — timeout e limpeza', () => {
  it('falha chamadas transitórias abandonadas (sem duplicar)', () => {
    const outcome = reconcileStaleCall(
      { ...baseState, status: 'ringing', lastOccurredAt: '2026-10-18T10:00:00.000Z' },
      { now: '2026-10-18T11:00:00.000Z', timeoutMinutes: 15 },
    );
    expect(outcome?.kind).toBe('applied');
    if (outcome?.kind === 'applied') {
      expect(outcome.patch.status).toBe('failed');
      expect(outcome.patch.failureCode).toBe('timeout_reconciliation');
    }
  });

  it('não toca em chamadas dentro do prazo nem terminais', () => {
    expect(
      reconcileStaleCall(baseState, { now: '2026-10-18T10:05:00.000Z', timeoutMinutes: 15 }),
    ).toBeNull();
    expect(
      reconcileStaleCall(
        { ...baseState, status: 'completed', lastOccurredAt: '2026-10-18T10:00:00.000Z' },
        { now: '2026-10-18T12:00:00.000Z', timeoutMinutes: 15 },
      ),
    ).toBeNull();
  });
});

/* ── Webhooks ──────────────────────────────────────────────── */

/** Adaptador de teste (mock unitário) com assinatura HMAC-SHA256 genérica. */
class MockTelephonyProvider implements TelephonyProvider {
  readonly name = 'mock';

  verifyWebhookSignature(params: {
    rawBody: string;
    headers: Record<string, string>;
    secret: string;
  }): boolean {
    return verifyHmacSignature({
      rawBody: params.rawBody,
      signature: params.headers['x-mock-signature'],
      secret: params.secret,
      algorithm: 'sha256',
    });
  }

  parseInboundWebhook(rawBody: string) {
    const parsed = JSON.parse(rawBody) as Record<string, unknown>;
    if (!parsed.providerCallId || !parsed.inboundNumber) {
      throw new VoiceIntegrationError('invalid_payload', 'payload de entrada inválido');
    }
    return {
      providerCallId: String(parsed.providerCallId),
      inboundNumber: String(parsed.inboundNumber),
      fromNumber: parsed.fromNumber ? String(parsed.fromNumber) : null,
      occurredAt: String(parsed.occurredAt ?? '2026-10-18T10:00:00.000Z'),
      providerEventId: String(parsed.providerEventId ?? 'evt-1'),
    };
  }

  parseStatusWebhook(rawBody: string) {
    const parsed = JSON.parse(rawBody) as Record<string, unknown>;
    if (!parsed.type || !parsed.callRef) {
      throw new VoiceIntegrationError('invalid_payload', 'payload de estado inválido');
    }
    return {
      callRef: String(parsed.callRef),
      type: parsed.type as never,
      occurredAt: String(parsed.occurredAt ?? '2026-10-18T10:00:05.000Z'),
      providerEventId: String(parsed.providerEventId ?? 'evt-2'),
    };
  }

  async checkReadiness(): Promise<{ ready: boolean; detail: string }> {
    return { ready: true, detail: 'mock' };
  }
}

function signedRequest(rawBody: string, secret: string, extraHeaders: Record<string, string> = {}) {
  return {
    rawBody,
    headers: {
      'x-mock-signature': computeHmacSignature({ rawBody, secret, algorithm: 'sha256' }),
      ...extraHeaders,
    },
    sourceIp: '203.0.113.1',
  };
}

describe('processWebhookRequest — webhooks', () => {
  const secret = 'segredo-teste';
  const adapter = new MockTelephonyProvider();
  const nowSeconds = 1_760_000_000;

  it('assinatura inválida é rejeitada (401)', () => {
    const result = processWebhookRequest({
      request: {
        rawBody: '{"providerCallId":"c1","inboundNumber":"+351210000001"}',
        headers: { 'x-mock-signature': 'forjada' },
        sourceIp: null,
      },
      adapter,
      secret,
      nowSeconds,
      kind: 'inbound',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('invalid_signature');
      expect(result.status).toBe(401);
    }
  });

  it('payload inválido é rejeitado (400) mesmo com assinatura válida', () => {
    const rawBody = '{"sem":"campos obrigatorios"}';
    const result = processWebhookRequest({
      request: signedRequest(rawBody, secret),
      adapter,
      secret,
      nowSeconds,
      kind: 'inbound',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('invalid_payload');
      expect(result.status).toBe(400);
    }
  });

  it('payload acima do limite é rejeitado (413)', () => {
    const rawBody = 'x'.repeat(DEFAULT_WEBHOOK_LIMITS.maxPayloadBytes + 1);
    const result = processWebhookRequest({
      request: signedRequest(rawBody, secret),
      adapter,
      secret,
      nowSeconds,
      kind: 'status',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('payload_too_large');
  });

  it('evento válido é normalizado', () => {
    const rawBody = JSON.stringify({
      type: 'call.answered',
      callRef: 'call-1',
      providerEventId: 'evt-9',
      occurredAt: '2026-10-18T10:00:05.000Z',
    });
    const result = processWebhookRequest({
      request: signedRequest(rawBody, secret),
      adapter,
      secret,
      nowSeconds,
      kind: 'status',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.parsed.kind).toBe('status');
      if (result.parsed.kind === 'status') {
        expect(result.parsed.event.type).toBe('call.answered');
        expect(result.parsed.callRef).toBe('call-1');
      }
    }
  });

  it('timestamp fora da janela anti-replay é rejeitado (409)', () => {
    const rawBody = JSON.stringify({ type: 'call.ended', callRef: 'c1' });
    const result = processWebhookRequest({
      request: signedRequest(rawBody, secret, { 'x-webhook-timestamp': String(nowSeconds - 10_000) }),
      adapter,
      secret,
      nowSeconds,
      kind: 'status',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('replay_detected');
  });

  it('evento repetido é tratado como duplicado (dedup persistente)', () => {
    const insert = buildCallEventInsert({
      organizationId: '00000000-0000-4000-8000-000000000009',
      callId: '00000000-0000-4000-8000-000000000008',
      provider: 'mock',
      event: event({ type: 'call.ended', providerEventId: 'evt-dup' }),
    });
    expect(insert.kind).toBe('insert');
    // Unicidade (provider, provider_event_id) → 23505 = duplicado idempotente.
    expect(isDuplicateEventError({ code: '23505' })).toBe(true);
    expect(isDuplicateEventError({ code: '42P01' })).toBe(false);
  });

  it('evento desconhecido é tratado em segurança (parse tipado falha)', () => {
    const rawBody = JSON.stringify({ tipo: 'desconhecido' });
    const result = processWebhookRequest({
      request: signedRequest(rawBody, secret),
      adapter,
      secret,
      nowSeconds,
      kind: 'status',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('invalid_payload');
  });

  it('adaptador pendente rejeita tudo (fail-closed)', () => {
    const pending = new PendingTelephonyProvider();
    const result = processWebhookRequest({
      request: {
        rawBody: '{"providerCallId":"c1","inboundNumber":"+351"}',
        headers: {},
        sourceIp: null,
      },
      adapter: pending,
      secret,
      nowSeconds,
      kind: 'inbound',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('invalid_signature');
  });
});

describe('rate limiting e replay', () => {
  it('limita pedidos por IP na janela', () => {
    const limiter = new SlidingWindowRateLimiter(3, 60);
    expect(limiter.check('ip-1', 1_000)).toBe(true);
    expect(limiter.check('ip-1', 1_010)).toBe(true);
    expect(limiter.check('ip-1', 1_020)).toBe(true);
    expect(limiter.check('ip-1', 1_030)).toBe(false);
    expect(limiter.check('ip-2', 1_030)).toBe(true);
    expect(limiter.check('ip-1', 1_100)).toBe(true);
  });

  it('janela anti-replay', () => {
    expect(isWithinReplayWindow(1_000, 1_100, 300)).toBe(true);
    expect(isWithinReplayWindow(1_000, 2_000, 300)).toBe(false);
    expect(isWithinReplayWindow(undefined, 1_000, 300)).toBe(false);
  });
});

/* ── Configuração do agente ────────────────────────────────── */

describe('resolveVoiceSessionConfig — configuração', () => {
  const validInput = {
    name: 'Rececionista',
    language: 'pt-PT',
    instructions: 'És um assistente telefónico.',
    status: 'active' as const,
    voiceConfig: { voiceId: 'pt-female-01', greeting: 'Olá!' },
  };

  it('configuração válida produz sessão com instruções', () => {
    const result = resolveVoiceSessionConfig(validInput);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.voice).toBe('pt-female-01');
      expect(result.config.greeting).toBe('Olá!');
    }
  });

  it('agente sem voz configurada é recusado', () => {
    const result = resolveVoiceSessionConfig({ ...validInput, voiceConfig: {} });
    expect(result).toEqual({ ok: false, reason: 'missing_voice' });
  });

  it('agente pausado/arquivado/inativo é recusado', () => {
    expect(resolveVoiceSessionConfig({ ...validInput, status: 'paused' })).toEqual({
      ok: false,
      reason: 'agent_paused',
    });
    expect(resolveVoiceSessionConfig({ ...validInput, status: 'archived' })).toEqual({
      ok: false,
      reason: 'agent_archived',
    });
  });

  it('credenciais ausentes/integração pendente: nada é criado nem simulado', async () => {
    await expect(new PendingVoiceProvider().startSession()).rejects.toThrow(/pendente/i);
    const readiness = await new PendingVoiceProvider().checkReadiness();
    expect(readiness.ready).toBe(false);
  });

  it('instruções endurecidas protegem contra alteração falada', () => {
    const result = resolveVoiceSessionConfig(validInput);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const hardened = buildHardenedSystemInstructions(result.config);
      expect(hardened).toContain('entrada não confiável');
      expect(hardened).toContain('INSTRUÇÕES DO AGENTE');
    }
  });
});

/* ── Metadados e diagnóstico ───────────────────────────────── */

describe('sanitizeCallEventMetadata', () => {
  it('mantém apenas chaves permitidas e escalares', () => {
    const result = sanitizeCallEventMetadata({
      reason: 'ocupado',
      error_code: 'busy',
      session_id: 'vs-1',
      segredo: 'não deve ficar',
      payload: { enorme: true },
    });
    expect(result).toEqual({ reason: 'ocupado', error_code: 'busy', session_id: 'vs-1' });
  });
});

describe('deriveVoiceDiagnostics — diagnóstico', () => {
  const base = {
    envPresent: true,
    envValid: true,
    integrationImplemented: true,
    providerCheck: { ready: true, detail: 'ok' },
    hasVerifiedRealCall: false,
  };

  it('sem credenciais → não configurado', () => {
    expect(deriveVoiceDiagnostics({ ...base, envPresent: false }).state).toBe('nao_configurado');
  });

  it('configuração inválida → falha de configuração', () => {
    expect(deriveVoiceDiagnostics({ ...base, envValid: false }).state).toBe('falha_configuracao');
  });

  it('integração pendente → configurado, mas não testado', () => {
    expect(deriveVoiceDiagnostics({ ...base, integrationImplemented: false }).state).toBe(
      'configurado_nao_testado',
    );
  });

  it('sem teste real → nunca «ligação verificada»', () => {
    expect(deriveVoiceDiagnostics(base).state).toBe('pronto_para_teste');
  });

  it('«ligação verificada» só com chamada real concluída', () => {
    expect(deriveVoiceDiagnostics({ ...base, hasVerifiedRealCall: true }).state).toBe(
      'ligacao_verificada',
    );
  });

  it('fornecedor em falha → indisponível', () => {
    expect(
      deriveVoiceDiagnostics({ ...base, providerCheck: { ready: false, detail: 'sem resposta' } }).state,
    ).toBe('indisponivel');
  });
});

describe('readVoiceEnv', () => {
  it('sem seleção de fornecedor → não presente', () => {
    const facts = readVoiceEnv({});
    expect(facts.envPresent).toBe(false);
    expect(facts.voiceProvider).toBeNull();
  });

  it('openai-realtime sem OPENAI_API_KEY → variável em falta', () => {
    const facts = readVoiceEnv({ VOICE_PROVIDER: 'openai-realtime' });
    expect(facts.missing).toContain('OPENAI_API_KEY');
    expect(facts.envPresent).toBe(false);
  });

  it('valor de fornecedor desconhecido → inválido', () => {
    const facts = readVoiceEnv({ VOICE_PROVIDER: 'fornecedor-inventado' });
    expect(facts.invalid).toContain('VOICE_PROVIDER');
    expect(facts.envValid).toBe(false);
  });

  it('configuração completa → presente e válida', () => {
    const facts = readVoiceEnv({
      VOICE_PROVIDER: 'openai-realtime',
      OPENAI_API_KEY: 'valor-teste',
      TELEPHONY_PROVIDER: 'sip',
      TELEPHONY_WEBHOOK_SECRET: 'segredo-teste',
    });
    expect(facts.envPresent).toBe(true);
    expect(facts.envValid).toBe(true);
  });
});

describe('verificação de assinaturas HMAC', () => {
  it('aceita assinatura correta e rejeita segredo errado', () => {
    const rawBody = '{"a":1}';
    const signature = computeHmacSignature({ rawBody, secret: 'certo', algorithm: 'sha256' });
    expect(
      verifyHmacSignature({ rawBody, signature, secret: 'certo', algorithm: 'sha256' }),
    ).toBe(true);
    expect(
      verifyHmacSignature({ rawBody, signature, secret: 'errado', algorithm: 'sha256' }),
    ).toBe(false);
  });
});
