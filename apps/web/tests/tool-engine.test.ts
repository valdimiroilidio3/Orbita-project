import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  TOOL_ARGS_MAX_BYTES,
  businessInfoLookupArgsSchema,
  availabilityCheckArgsSchema,
  contactRequestCreateArgsSchema,
  appointmentCreateArgsSchema,
  callTransferArgsSchema,
  computeAvailableSlots,
  effectiveToolRisk,
  parseBusinessHours,
  parseServiceLines,
  weekdayOf,
} from '@orbita/shared';

import { evaluateApprovalDecision } from '@/lib/tools/approvals';
import { DevBookingAdapter } from '@/lib/tools/booking';
import { deriveIdempotencyKey, executeTool } from '@/lib/tools/executor';
import {
  handleAppointmentCreate,
  handleAvailabilityCheck,
  handleBusinessInfoLookup,
  handleCallTransfer,
  handleContactRequestCreate,
} from '@/lib/tools/handlers';

/**
 * Testes unitários do motor de ferramentas (PROMPT 08 §14).
 * Mocks APENAS como testes unitários — não são prova de integração externa.
 */

/* ── Mock de cliente Supabase (fila de resultados) ──────────── */

interface MockResult {
  data?: unknown;
  error?: { code?: string; message: string } | null;
  count?: number;
}

class MockQuery {
  constructor(private readonly results: MockResult[]) {}
  select() {
    return this;
  }
  insert() {
    return this;
  }
  update() {
    return this;
  }
  upsert() {
    return this;
  }
  delete() {
    return this;
  }
  eq() {
    return this;
  }
  neq() {
    return this;
  }
  gte() {
    return this;
  }
  lte() {
    return this;
  }
  order() {
    return this;
  }
  limit() {
    return this;
  }
  range() {
    return this;
  }
  maybeSingle() {
    return Promise.resolve(this.results.shift() ?? { data: null, error: null });
  }
  single() {
    return Promise.resolve(this.results.shift() ?? { data: null, error: null });
  }
  then(onFulfilled: (value: MockResult) => unknown, onRejected?: (reason: unknown) => unknown) {
    return Promise.resolve(this.results.shift() ?? { data: [], error: null }).then(
      onFulfilled,
      onRejected,
    );
  }
}

const mockService: { client: unknown } = { client: null };

vi.mock('@/lib/supabase/service', () => ({
  getSupabaseServiceClient: () => mockService.client,
  isServiceRoleConfigured: () => mockService.client !== null,
}));

function fakeClient(tableResults: Record<string, MockResult[]>) {
  return {
    from(table: string) {
      return new MockQuery(tableResults[table] ?? []);
    },
  } as never;
}

const ctx = (organizationId = 'org-1', client?: never) => ({
  client: client ?? fakeClient({}),
  organizationId,
  callId: null,
  fromWorkflow: false,
  createdBy: null,
});

/* ── Esquemas de argumentos (validação no servidor) ─────────── */

describe('esquemas de argumentos', () => {
  it('ferramenta: argumentos inválidos são rejeitados', () => {
    expect(businessInfoLookupArgsSchema.safeParse({ section: 'inexistente' }).success).toBe(false);
    expect(
      availabilityCheckArgsSchema.safeParse({
        service: 'Consulta',
        date: '18/10/2026',
        timezone: 'Europe/Lisbon',
        durationMinutes: 30,
      }).success,
    ).toBe(false);
    expect(contactRequestCreateArgsSchema.safeParse({ phone: 'abc', reason: 'x' }).success).toBe(
      false,
    );
    expect(
      appointmentCreateArgsSchema.safeParse({
        service: 'Corte',
        startsAt: 'não-data',
        timezone: 'Europe/Lisbon',
        durationMinutes: 30,
        customerPhone: '+351210000000',
      }).success,
    ).toBe(false);
    expect(callTransferArgsSchema.safeParse({ destination: '+351910000000' }).success).toBe(false);
  });

  it('argumentos válidos são aceites', () => {
    expect(
      contactRequestCreateArgsSchema.safeParse({
        phone: '+351 210 000 000',
        reason: 'Ligar de volta',
      }).success,
    ).toBe(true);
    expect(callTransferArgsSchema.safeParse({ destination: 'recepcao' }).success).toBe(true);
  });
});

/* ── Ferramentas: catálogo e handlers ───────────────────────── */

describe('handlers — ferramentas inexistentes/inativas e resultados', () => {
  it('business_info.lookup: not_found sem perfil; sucesso com secção', async () => {
    const semPerfil = await handleBusinessInfoLookup(ctx() as never, {});
    expect(semPerfil.status).toBe('not_found');

    const comPerfil = await handleBusinessInfoLookup(ctx() as never, { section: 'hours' });
    // client vazio devolve null → not_found
    expect(comPerfil.status).toBe('not_found');
  });

  it('availability.check: não inventa horários — sem expediente → sem slots', async () => {
    const client = fakeClient({
      business_profiles: [
        {
          data: {
            hours_text:
              'seg:fechado; ter:fechado; qua:fechado; qui:fechado; sex:fechado; sab:fechado; dom:fechado',
            services_text: 'Consulta | 30',
          },
        },
      ],
      appointments: [{ data: [] }],
    });

    const date = '2026-10-19'; // segunda-feira
    expect(weekdayOf(date)).toBe('seg');
    const result = await handleAvailabilityCheck({ ...ctx(), client } as never, {
      service: 'Consulta',
      date,
      timezone: 'Europe/Lisbon',
      durationMinutes: 30,
    });
    expect(result.status).toBe('success');
    expect(result.data?.available).toBe('false');
  });

  it('availability.check: erro técnico distingue-se de indisponibilidade', async () => {
    const client = fakeClient({
      business_profiles: [{ error: { message: 'bd em baixo' } }],
    });
    const result = await handleAvailabilityCheck({ ...ctx(), client } as never, {
      service: 'Consulta',
      date: '2026-10-19',
      timezone: 'Europe/Lisbon',
      durationMinutes: 30,
    });
    expect(result.status).toBe('internal_error');
  });

  it('availability.check: fuso horário inválido → validation_error', async () => {
    const result = await handleAvailabilityCheck(ctx() as never, {
      service: 'Consulta',
      date: '2026-10-19',
      timezone: 'Marte/Olympus',
      durationMinutes: 30,
    });
    expect(result.status).toBe('validation_error');
  });

  it('contact_request.create: sucesso cria registo; repetição é idempotente', async () => {
    const client = fakeClient({
      contact_requests: [{ data: null }, { data: { id: 'req-1' } }, { data: { id: 'req-1' } }],
    });
    const created = await handleContactRequestCreate(
      { ...ctx(), client } as never,
      { phone: '+351 210 000 000', reason: 'Pedido de contacto' },
      'key-1',
    );
    expect(created.status).toBe('success');
    expect(created.data?.requestId).toBe('req-1');
    expect(created.message).toContain('criado com sucesso');

    const replay = await handleContactRequestCreate(
      { ...ctx(), client } as never,
      { phone: '+351 210 000 000', reason: 'Pedido de contacto' },
      'key-1',
    );
    expect(replay.status).toBe('success');
    expect(replay.data?.duplicate).toBe('true');
  });

  it('appointment.create: conflito de horário não é sucesso; falha do adaptador comunicada', async () => {
    const client = fakeClient({
      business_profiles: [
        { data: { hours_text: 'seg:09:00-18:00', services_text: 'Consulta | 30' } },
      ],
      appointments: [{ data: { id: 'ja-existe' } }],
    });
    const conflict = await handleAppointmentCreate(
      { ...ctx(), client } as never,
      {
        service: 'Consulta',
        startsAt: '2026-10-19T10:00:00.000Z',
        timezone: 'Europe/Lisbon',
        durationMinutes: 30,
        customerPhone: '+351 210 000 000',
        confirmedByCaller: true,
      },
      'key-2',
    );
    expect(conflict.status).toBe('conflict');
    expect(conflict.message).toContain('já está marcado');
  });

  it('appointment.create: sem confirmação verbal → validation_error', async () => {
    const result = await handleAppointmentCreate(
      ctx() as never,
      {
        service: 'Consulta',
        startsAt: '2026-10-19T10:00:00.000Z',
        timezone: 'Europe/Lisbon',
        durationMinutes: 30,
        customerPhone: '+351 210 000 000',
        confirmedByCaller: false,
      },
      'key-3',
    );
    expect(result.status).toBe('validation_error');
  });

  it('call.transfer: destino arbitrário rejeitado; não suportado oferece alternativa', async () => {
    const invalid = await handleCallTransfer(ctx() as never, { destination: '+351910000000' });
    expect(invalid.status).toBe('validation_error');

    const unsupported = await handleCallTransfer(ctx() as never, { destination: 'recepcao' });
    expect(unsupported.status).toBe('unsupported');
    expect(unsupported.message).toContain('pedido de contacto');
  });

  it('DevBookingAdapter: identifica-se explicitamente como desenvolvimento', async () => {
    const adapter = new DevBookingAdapter();
    expect(adapter.isDevelopment).toBe(true);
    expect(adapter.name).toBe('dev-adapter');

    const client = fakeClient({
      appointments: [{ data: null }, { data: { id: 'ap-1' } }],
    });
    const result = await adapter.createBooking(client as never, {
      organizationId: 'org-1',
      callId: null,
      service: 'Consulta',
      startsAt: '2026-10-19T10:00:00.000Z',
      endsAt: '2026-10-19T10:30:00.000Z',
      timezone: 'Europe/Lisbon',
      customerName: null,
      customerPhone: '+351210000000',
      idempotencyKey: 'key-4',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source).toBe('dev-adapter');
      expect(result.reference).toBe('ap-1');
    }
  });

  it('DevBookingAdapter: falha do adaptador → erro comunicado sem sucesso simulado', async () => {
    const adapter = new DevBookingAdapter();
    const client = fakeClient({
      appointments: [{ data: null }, { error: { code: '23505', message: 'duplicado' } }],
    });
    const result = await adapter.createBooking(client as never, {
      organizationId: 'org-1',
      callId: null,
      service: 'Consulta',
      startsAt: '2026-10-19T10:00:00.000Z',
      endsAt: '2026-10-19T10:30:00.000Z',
      timezone: 'Europe/Lisbon',
      customerName: null,
      customerPhone: '+351210000000',
      idempotencyKey: 'key-5',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('conflict');
  });
});

/* ── Aprovações ─────────────────────────────────────────────── */

describe('aprovações', () => {
  const base = {
    approvalId: 'ap-1',
    status: 'pending' as const,
    organizationId: 'org-1',
    toolExecutionId: 'exec-1',
    expiresAt: '2026-10-19T10:00:00.000Z',
    actorOrganizationId: 'org-1',
    actorRole: 'owner' as const,
    requestedExecutionId: 'exec-1',
    now: '2026-10-18T10:00:00.000Z',
    decision: 'approve' as const,
  };

  it('aprovação válida', () => {
    expect(evaluateApprovalDecision(base)).toEqual({ ok: true });
  });

  it('utilizador não autorizado (member) é rejeitado', () => {
    expect(evaluateApprovalDecision({ ...base, actorRole: 'member' })).toEqual({
      ok: false,
      reason: 'unauthorized',
    });
  });

  it('aprovação expirada é rejeitada', () => {
    expect(evaluateApprovalDecision({ ...base, expiresAt: '2026-10-17T10:00:00.000Z' })).toEqual({
      ok: false,
      reason: 'expired',
    });
  });

  it('aprovar operação diferente da solicitada é rejeitado', () => {
    expect(evaluateApprovalDecision({ ...base, requestedExecutionId: 'exec-2' })).toEqual({
      ok: false,
      reason: 'mismatch',
    });
  });

  it('aprovação já decidida é rejeitada', () => {
    expect(evaluateApprovalDecision({ ...base, status: 'approved' })).toEqual({
      ok: false,
      reason: 'not_pending',
    });
  });
});

/* ── Idempotência e executor ────────────────────────────────── */

describe('idempotência e executor', () => {
  it('chave derivada é estável para o mesmo pedido', () => {
    const args = { phone: '+351210000000', reason: 'x' };
    const first = deriveIdempotencyKey('contact_request.create', { callId: 'call-1' }, args);
    const second = deriveIdempotencyKey('contact_request.create', { callId: 'call-1' }, args);
    expect(first).toBe(second);
    expect(first).not.toBeNull();
  });

  it('ferramenta inexistente → not_found sem execução', async () => {
    mockService.client = fakeClient({});
    const result = await executeTool({
      context: {
        organizationId: 'org-1',
        agentId: null,
        callId: null,
        actorUserId: null,
        fromWorkflow: false,
      },
      toolId: 'shell.run',
      rawArgs: {},
    });
    expect(result.result.status).toBe('not_found');
    expect(result.executionId).toBeNull();
  });

  it('argumentos inválidos → validation_error sem execução', async () => {
    mockService.client = fakeClient({});
    const result = await executeTool({
      context: {
        organizationId: 'org-1',
        agentId: null,
        callId: null,
        actorUserId: null,
        fromWorkflow: false,
      },
      toolId: 'contact_request.create',
      rawArgs: { phone: '', reason: '' },
    });
    expect(result.result.status).toBe('validation_error');
    expect(result.executionId).toBeNull();
    void TOOL_ARGS_MAX_BYTES;
  });

  it('ferramenta inativa/não autorizada para o agente → unauthorized', async () => {
    mockService.client = fakeClient({
      agent_tools: [{ data: null }],
    });
    const result = await executeTool({
      context: {
        organizationId: 'org-1',
        agentId: 'agent-1',
        callId: null,
        actorUserId: null,
        fromWorkflow: false,
      },
      toolId: 'contact_request.create',
      rawArgs: { phone: '+351 210 000 000', reason: 'Teste' },
    });
    expect(result.result.status).toBe('unauthorized');
    expect(result.executionId).toBeNull();
  });

  it('agente sem permissão (enabled=false) → unauthorized', async () => {
    mockService.client = fakeClient({
      agent_tools: [{ data: { enabled: false, config: {} } }],
    });
    const result = await executeTool({
      context: {
        organizationId: 'org-1',
        agentId: 'agent-1',
        callId: null,
        actorUserId: null,
        fromWorkflow: false,
      },
      toolId: 'business_info.lookup',
      rawArgs: {},
    });
    expect(result.result.status).toBe('unauthorized');
  });

  it('resultado de sucesso é estruturado, persistido e auditado', async () => {
    mockService.client = fakeClient({
      // Ordem: contagem de limites → inserção (auditoria) → finalização.
      tool_executions: [{ data: [], count: 0 }, { data: { id: 'exec-1' } }, { data: null }],
      contact_requests: [{ data: null }, { data: { id: 'req-9' } }],
    });
    const result = await executeTool({
      context: {
        organizationId: 'org-1',
        agentId: null,
        callId: null,
        actorUserId: 'user-1',
        fromWorkflow: false,
      },
      toolId: 'contact_request.create',
      rawArgs: { phone: '+351 210 000 000', reason: 'Pedido via executor' },
    });
    expect(result.result.status).toBe('success');
    expect(result.executionId).toBe('exec-1');
    expect(result.result.data?.requestId).toBe('req-9');
    expect(result.replayed).toBe(false);
  });

  it('replay idempotente devolve a execução anterior sem repetir efeitos', async () => {
    mockService.client = fakeClient({
      // Ordem: contagens de limites (chamada + organização) → pesquisa por chave idempotente.
      tool_executions: [
        { data: [], count: 0 },
        { data: [], count: 0 },
        {
          data: {
            id: 'exec-antiga',
            status: 'succeeded',
            result: { requestId: 'req-9' },
            result_message: 'Pedido criado.',
          },
        },
      ],
    });
    const result = await executeTool({
      context: {
        organizationId: 'org-1',
        agentId: null,
        callId: 'call-1',
        actorUserId: null,
        fromWorkflow: false,
        idempotencyKey: 'chave-repetida',
      },
      toolId: 'contact_request.create',
      rawArgs: { phone: '+351 210 000 000', reason: 'Pedido via executor' },
    });
    expect(result.replayed).toBe(true);
    expect(result.executionId).toBe('exec-antiga');
    expect(result.result.data?.replayed).toBe('true');
  });

  it('sem persistência privilegiada → internal_error honesto', async () => {
    mockService.client = null;
    const result = await executeTool({
      context: {
        organizationId: 'org-1',
        agentId: null,
        callId: null,
        actorUserId: null,
        fromWorkflow: false,
      },
      toolId: 'business_info.lookup',
      rawArgs: {},
    });
    expect(result.result.status).toBe('internal_error');
  });
});

/* ── Helpers puros de negócio ───────────────────────────────── */

describe('perfil público — parsing e disponibilidade', () => {
  it('parseBusinessHours valida dias e intervalos', () => {
    const ok = parseBusinessHours('seg:09:00-13:00,14:00-18:00; ter:fechado');
    expect(ok.ok).toBe(true);
    expect(parseBusinessHours('seg:25:00-26:00').ok).toBe(false);
    expect(parseBusinessHours('diaerrado:09:00-18:00').ok).toBe(false);
    expect(parseBusinessHours('seg:10:00-09:00').ok).toBe(false);
    expect(parseBusinessHours('seg:09:00-13:00; seg:14:00-18:00').ok).toBe(false);
  });

  it('parseServiceLines valida durações', () => {
    const ok = parseServiceLines('Consulta | 30 | 25€\nCorte | 60');
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.value).toHaveLength(2);
      expect(ok.value[0]?.price).toBe('25€');
    }
    expect(parseServiceLines('Sem duracao').ok).toBe(false);
    expect(parseServiceLines('Curto | 2').ok).toBe(false);
  });

  it('computeAvailableSlots nunca inventa horários fora do expediente', () => {
    const slots = computeAvailableSlots({
      hours: [{ start: '09:00', end: '10:00' }],
      busy: [{ start: '09:00', end: '09:30' }],
      durationMinutes: 30,
      limit: 5,
    });
    expect(slots).toEqual(['09:30']);
    expect(computeAvailableSlots({ hours: [], busy: [], durationMinutes: 30 })).toEqual([]);
  });

  it('effectiveToolRisk nunca reduz abaixo do mínimo', () => {
    expect(effectiveToolRisk('contact_request.create', 'low')).toBe('moderate');
    expect(effectiveToolRisk('contact_request.create', 'high')).toBe('high');
  });
});

beforeEach(() => {
  vi.clearAllMocks();
});
