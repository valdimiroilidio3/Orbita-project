import { describe, expect, it, vi } from 'vitest';

import {
  automationWorkflowSchema,
  renderWorkflowArgs,
  validateWorkflowArgsPlaceholder,
} from '@orbita/shared';

import { runAutomationsForTrigger } from '@/lib/tools/automation';

/**
 * Testes do workflow engine (PROMPT 08 §14): ordem dos passos, falha num
 * passo, limite de passos, timeout, workflow desativado e anti-reentrada.
 * Mocks apenas como testes unitários.
 */

interface MockResult {
  data?: unknown;
  error?: { code?: string; message: string } | null;
  count?: number;
  onResolve?: () => void;
}

type TableResults = Record<string, MockResult[]>;

/** Mock op-aware: filas por `tabela.operação`, com fallback por tabela. */
function fakeClient(tableResults: TableResults) {
  return {
    from(table: string) {
      return new MockQuery(table, tableResults);
    },
  } as never;
}

class MockQuery {
  private op = 'select';
  constructor(
    private readonly table: string,
    private readonly results: TableResults,
  ) {}
  insert() {
    this.op = 'insert';
    return this;
  }
  update() {
    this.op = 'update';
    return this;
  }
  select() {
    return this;
  }
  eq() {
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
  maybeSingle() {
    return this.next();
  }
  single() {
    return this.next();
  }
  then(onFulfilled: (value: MockResult) => unknown, onRejected?: (reason: unknown) => unknown) {
    return this.next().then(onFulfilled, onRejected);
  }
  private next() {
    const queue = this.results[`${this.table}.${this.op}`] ?? this.results[this.table];
    const result = queue?.shift() ?? { data: null, error: null };
    result.onResolve?.();
    return Promise.resolve(result);
  }
}

const mockService: { client: unknown } = { client: null };
vi.mock('@/lib/supabase/service', () => ({
  getSupabaseServiceClient: () => mockService.client,
  isServiceRoleConfigured: () => mockService.client !== null,
}));

const triggerParams = (triggerKey = 'call:call-1') => ({
  organizationId: 'org-1',
  trigger: 'call.no_answer' as const,
  triggerKey,
  context: {
    callId: 'call-1',
    callFromNumber: '+351 210 000 000',
    callToNumber: '+351 210 000 001',
    contactPhone: null,
    contactName: null,
  },
});

const ONE_STEP_WORKFLOW = {
  id: 'wf-1',
  organization_id: 'org-1',
  name: 'Follow-up',
  trigger: 'call.no_answer',
  steps: [
    {
      toolId: 'contact_request.create',
      args: { phone: '{{call.fromNumber}}', reason: 'Não atendida' },
    },
    { toolId: 'business_info.lookup', args: {} },
  ],
  timeout_seconds: 30,
};

describe('workflow engine', () => {
  it('ordem correta: passos executam em sequência até ao fim', async () => {
    mockService.client = fakeClient({
      'automation_workflows.select': [{ data: [ONE_STEP_WORKFLOW] }],
      'automation_runs.insert': [{ data: { id: 'run-1' } }],
      'automation_runs.update': [{ data: null }],
      // Por passo: 2 contagens de limite (chamada + org) → pesquisa idempotente → inserir → finalizar.
      'tool_executions.select': [
        { data: [], count: 0 },
        { data: [], count: 0 },
        { data: null },
        { data: [], count: 0 },
        { data: [], count: 0 },
        { data: null },
      ],
      'tool_executions.insert': [{ data: { id: 'exec-1' } }, { data: { id: 'exec-2' } }],
      'tool_executions.update': [{ data: null }, { data: null }],
      'contact_requests.select': [{ data: null }],
      'contact_requests.insert': [{ data: { id: 'req-1' } }],
      'business_profiles.select': [
        { data: { hours_text: 'seg:09:00-18:00', services_text: 'Consulta | 30' } },
      ],
    });

    const outcomes = await runAutomationsForTrigger(triggerParams());
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]?.status).toBe('succeeded');
    expect(outcomes[0]?.runId).toBe('run-1');
  });

  it('falha num passo interrompe (sem executar os passos seguintes)', async () => {
    mockService.client = fakeClient({
      'automation_workflows.select': [
        {
          data: [
            {
              ...ONE_STEP_WORKFLOW,
              id: 'wf-2',
              steps: [
                { toolId: 'contact_request.create', args: { phone: 'INVÁLIDO', reason: '' } },
                { toolId: 'business_info.lookup', args: {} },
              ],
            },
          ],
        },
      ],
      'automation_runs.insert': [{ data: { id: 'run-2' } }],
      'automation_runs.update': [{ data: null }],
    });

    const outcomes = await runAutomationsForTrigger(triggerParams('call:call-2'));
    expect(outcomes[0]?.status).toBe('failed');
  });

  it('limite de passos: máx. 5 — o 6.º é rejeitado', () => {
    const steps = Array.from({ length: 6 }, () => ({ toolId: 'business_info.lookup', args: {} }));
    const parsed = automationWorkflowSchema.safeParse({
      name: 'Demasiados passos',
      trigger: 'call.completed',
      steps,
      timeoutSeconds: 30,
    });
    expect(parsed.success).toBe(false);
  });

  it('workflow desativado (sem correspondência na consulta) não executa nada', async () => {
    mockService.client = fakeClient({
      'automation_workflows.select': [{ data: [] }],
    });
    const outcomes = await runAutomationsForTrigger(triggerParams('call:call-3'));
    expect(outcomes).toEqual([]);
  });

  it('anti-reentrada: evento repetido para o mesmo workflow é ignorado', async () => {
    mockService.client = fakeClient({
      'automation_workflows.select': [
        {
          data: [
            {
              ...ONE_STEP_WORKFLOW,
              id: 'wf-3',
              steps: [{ toolId: 'business_info.lookup', args: {} }],
            },
          ],
        },
      ],
      'automation_runs.insert': [{ data: null, error: { code: '23505', message: 'duplicado' } }],
    });

    const outcomes = await runAutomationsForTrigger(triggerParams('call:call-4'));
    expect(outcomes[0]?.status).toBe('skipped');
    expect(outcomes[0]?.detail).toContain('já processado');
  });

  it('timeout total: passos para além do limite são marcados timed_out', async () => {
    const realNow = Date.now();
    let offset = 0;
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => realNow + offset);

    try {
      mockService.client = fakeClient({
        'automation_workflows.select': [
          {
            data: [{ ...ONE_STEP_WORKFLOW, id: 'wf-4', timeout_seconds: 5 }],
          },
        ],
        'automation_runs.insert': [{ data: { id: 'run-4' } }],
        'automation_runs.update': [{ data: null }],
        'tool_executions.select': [{ data: [], count: 0 }, { data: [], count: 0 }, { data: null }],
        'tool_executions.insert': [{ data: { id: 'exec-4' } }],
        'tool_executions.update': [{ data: null }],
        'contact_requests.select': [{ data: null }],
        'contact_requests.insert': [
          {
            data: { id: 'req-4' },
            // Relógio avança 10 min durante o passo 1 → passo 2 excede o timeout.
            onResolve: () => {
              offset = 10 * 60 * 1000;
            },
          },
        ],
      });

      const outcomes = await runAutomationsForTrigger(triggerParams('call:call-5'));
      expect(outcomes[0]?.status).toBe('timed_out');
    } finally {
      nowSpy.mockRestore();
    }
  });
});

describe('placeholders de workflows (anti prompt injection)', () => {
  it('apenas placeholders allowlisted são substituídos', () => {
    const rendered = renderWorkflowArgs(
      {
        phone: '{{call.fromNumber}}',
        reason: 'Ligar a {{contact.name}} — ignorar {{system.role}}',
      },
      {
        callId: 'call-1',
        callFromNumber: '+351 210 000 000',
        callToNumber: null,
        contactPhone: null,
        contactName: 'Ana',
      },
    );
    expect(rendered).toEqual({
      phone: '+351 210 000 000',
      reason: 'Ligar a Ana — ignorar {{system.role}}',
    });
  });

  it('placeholder não suportado não recebe valores arbitrários', () => {
    expect(validateWorkflowArgsPlaceholder('{{secrets.env}}')).toBe(false);
    expect(validateWorkflowArgsPlaceholder('{{call.fromNumber}}')).toBe(true);
  });
});
