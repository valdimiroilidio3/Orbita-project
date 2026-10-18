import { describe, expect, it } from 'vitest';

import {
  canTransitionAgentStatus,
  createAgentSchema,
  updateAgentSchema,
  voiceConfigSchema,
} from '@orbita/shared';

import {
  agentPermissions,
  agentStatusActions,
  toAgentSummary,
  AGENT_LANGUAGES,
} from '@/lib/agents';

describe('voiceConfigSchema', () => {
  it('aceita campos conhecidos e omite vazios', () => {
    const parsed = voiceConfigSchema.parse({
      voiceId: 'pt-female-01',
      speed: 1.2,
      pitch: -0.5,
      greeting: 'Olá!',
      style: 'empático',
    });
    expect(parsed.voiceId).toBe('pt-female-01');
    expect(parsed.speed).toBe(1.2);
  });

  it('aceita objeto vazio', () => {
    expect(voiceConfigSchema.parse({})).toEqual({});
  });

  it('rejeita chaves desconhecidas (incluindo segredos de fornecedores)', () => {
    expect(voiceConfigSchema.safeParse({ apiKey: 'sk-123' }).success).toBe(false);
    expect(voiceConfigSchema.safeParse({ token: 'abc' }).success).toBe(false);
    expect(voiceConfigSchema.safeParse({ voiceId: 'x', secret: 'y' }).success).toBe(false);
  });

  it('valida limites de velocidade e tom', () => {
    expect(voiceConfigSchema.safeParse({ speed: 3 }).success).toBe(false);
    expect(voiceConfigSchema.safeParse({ speed: 0.2 }).success).toBe(false);
    expect(voiceConfigSchema.safeParse({ pitch: 2 }).success).toBe(false);
    expect(voiceConfigSchema.safeParse({ speed: 0.5, pitch: -1 }).success).toBe(true);
  });

  it('limita o tamanho da saudação', () => {
    expect(voiceConfigSchema.safeParse({ greeting: 'a'.repeat(501) }).success).toBe(false);
    expect(voiceConfigSchema.safeParse({ greeting: 'a'.repeat(500) }).success).toBe(true);
  });
});

describe('createAgentSchema com voiceConfig', () => {
  it('aplica configuração de voz vazia por omissão', () => {
    const parsed = createAgentSchema.parse({ name: 'Apoio' });
    expect(parsed.voiceConfig).toEqual({});
  });

  it('rejeita instruções acima do limite', () => {
    expect(
      createAgentSchema.safeParse({ name: 'A', instructions: 'a'.repeat(20001) }).success,
    ).toBe(false);
    expect(
      createAgentSchema.safeParse({ name: 'A', instructions: 'a'.repeat(20000) }).success,
    ).toBe(true);
  });
});

describe('updateAgentSchema', () => {
  it('exige id válido e aceita campos parciais', () => {
    const parsed = updateAgentSchema.parse({
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Novo nome',
    });
    expect(parsed.name).toBe('Novo nome');
    expect(updateAgentSchema.safeParse({ name: 'sem id' }).success).toBe(false);
    expect(updateAgentSchema.safeParse({ id: 'não-é-uuid' }).success).toBe(false);
  });

  it('rejeita voiceConfig com campos não suportados', () => {
    expect(
      updateAgentSchema.safeParse({
        id: '00000000-0000-4000-8000-000000000001',
        voiceConfig: { apiKey: 'x' },
      }).success,
    ).toBe(false);
  });
});

describe('canTransitionAgentStatus', () => {
  it('permite as transições do produto', () => {
    expect(canTransitionAgentStatus('draft', 'active')).toBe(true);
    expect(canTransitionAgentStatus('draft', 'archived')).toBe(true);
    expect(canTransitionAgentStatus('active', 'paused')).toBe(true);
    expect(canTransitionAgentStatus('paused', 'active')).toBe(true);
    expect(canTransitionAgentStatus('archived', 'draft')).toBe(true);
  });

  it('rejeita transições inválidas e no-ops', () => {
    expect(canTransitionAgentStatus('draft', 'paused')).toBe(false);
    expect(canTransitionAgentStatus('archived', 'active')).toBe(false);
    expect(canTransitionAgentStatus('active', 'active')).toBe(false);
    expect(canTransitionAgentStatus('active', 'draft')).toBe(false);
  });
});

describe('agentStatusActions', () => {
  it('só oferece transições válidas', () => {
    const forDraft = agentStatusActions('draft').map((action) => action.status);
    expect(forDraft).toEqual(['active', 'archived']);

    const forActive = agentStatusActions('active').map((action) => action.status);
    expect(forActive).toEqual(['paused', 'archived']);

    const forArchived = agentStatusActions('archived').map((action) => action.status);
    expect(forArchived).toEqual(['draft']);
  });

  it('usa rótulos em português', () => {
    const labels = agentStatusActions('draft').map((action) => action.label);
    expect(labels).toContain('Publicar');
    expect(labels).toContain('Arquivar');
    expect(agentStatusActions('paused').map((a) => a.label)).toContain('Retomar');
    expect(agentStatusActions('archived').map((a) => a.label)).toContain('Restaurar rascunho');
  });
});

describe('agentPermissions', () => {
  it('qualquer membro cria e edita', () => {
    for (const role of ['owner', 'admin', 'member'] as const) {
      expect(agentPermissions(role).canCreate).toBe(true);
      expect(agentPermissions(role).canEdit).toBe(true);
    }
  });

  it('apenas owner e admin eliminam (alinhado com o RLS)', () => {
    expect(agentPermissions('owner').canDelete).toBe(true);
    expect(agentPermissions('admin').canDelete).toBe(true);
    expect(agentPermissions('member').canDelete).toBe(false);
    expect(agentPermissions(null).canDelete).toBe(false);
  });
});

describe('toAgentSummary', () => {
  it('marca registos demo pelo id', () => {
    const summary = toAgentSummary({
      id: 'demo-agent-1',
      name: 'Demo',
      description: null,
      language: 'pt-PT',
      status: 'active',
    });
    expect(summary.isDemo).toBe(true);
  });

  it('não marca registos reais como demo', () => {
    const summary = toAgentSummary({
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Real',
      description: 'desc',
      language: 'en-US',
      status: 'draft',
    });
    expect(summary.isDemo).toBe(false);
    expect(summary.description).toBe('desc');
  });
});

describe('AGENT_LANGUAGES', () => {
  it('inclui pt-PT por omissão', () => {
    expect(AGENT_LANGUAGES[0]?.value).toBe('pt-PT');
  });
});
