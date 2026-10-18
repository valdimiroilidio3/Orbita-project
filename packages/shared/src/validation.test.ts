import { describe, expect, it } from 'vitest';

import { callQuerySchema, createAgentSchema, organizationSlugSchema } from './validation';

describe('createAgentSchema', () => {
  it('aceita um agente válido com defaults', () => {
    const parsed = createAgentSchema.parse({ name: 'Agente de apoio' });
    expect(parsed.language).toBe('pt-PT');
    expect(parsed.instructions).toBe('');
    expect(parsed.status).toBe('draft');
  });

  it('rejeita nome vazio', () => {
    expect(createAgentSchema.safeParse({ name: '   ' }).success).toBe(false);
    expect(createAgentSchema.safeParse({}).success).toBe(false);
  });

  it('rejeita status inválido', () => {
    const result = createAgentSchema.safeParse({ name: 'Agente', status: 'running' });
    expect(result.success).toBe(false);
  });
});

describe('organizationSlugSchema', () => {
  it('normaliza para minúsculas', () => {
    expect(organizationSlugSchema.parse('Minha-Empresa')).toBe('minha-empresa');
  });

  it('rejeita slugs inválidos', () => {
    expect(organizationSlugSchema.safeParse('ab').success).toBe(false);
    expect(organizationSlugSchema.safeParse('slug inválido!').success).toBe(false);
    expect(organizationSlugSchema.safeParse('--duplo--').success).toBe(false);
  });
});

describe('callQuerySchema', () => {
  it('aplica defaults de paginação', () => {
    const parsed = callQuerySchema.parse({});
    expect(parsed.limit).toBe(25);
    expect(parsed.offset).toBe(0);
  });

  it('valida status e direção', () => {
    expect(callQuerySchema.safeParse({ status: 'completed', direction: 'inbound' }).success).toBe(
      true,
    );
    expect(callQuerySchema.safeParse({ status: 'desconhecido' }).success).toBe(false);
    expect(callQuerySchema.safeParse({ limit: 500 }).success).toBe(false);
  });
});
