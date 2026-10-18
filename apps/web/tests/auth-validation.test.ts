import { describe, expect, it } from 'vitest';

import {
  createOrganizationSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signUpSchema,
} from '@orbita/shared';

import { pickActiveOrganization } from '../lib/active-org';

describe('createOrganizationSchema', () => {
  it('aceita nome e slug válidos', () => {
    const parsed = createOrganizationSchema.parse({ name: 'Clínica São João', slug: 'clinica-sao-joao' });
    expect(parsed.slug).toBe('clinica-sao-joao');
  });

  it('normaliza o slug para minúsculas', () => {
    const parsed = createOrganizationSchema.parse({ name: 'Acme', slug: 'Minha-Empresa' });
    expect(parsed.slug).toBe('minha-empresa');
  });

  it('rejeita nome vazio e slug inválido', () => {
    expect(createOrganizationSchema.safeParse({ name: '  ', slug: 'abc' }).success).toBe(false);
    expect(createOrganizationSchema.safeParse({ name: 'Acme', slug: 'inválido!' }).success).toBe(false);
    expect(createOrganizationSchema.safeParse({ name: 'Acme', slug: 'ab' }).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('exige email válido e palavra-passe', () => {
    expect(loginSchema.safeParse({ email: 'a@b.pt', password: 'x' }).success).toBe(true);
    expect(loginSchema.safeParse({ email: 'inválido', password: 'x' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'a@b.pt', password: '' }).success).toBe(false);
  });
});

describe('signUpSchema / resetPasswordSchema', () => {
  it('exige confirmação coincidente e mínimo de 8 caracteres', () => {
    expect(
      signUpSchema.safeParse({ email: 'a@b.pt', password: 'segura123', confirmPassword: 'segura123' }).success,
    ).toBe(true);
    expect(
      signUpSchema.safeParse({ email: 'a@b.pt', password: 'segura123', confirmPassword: 'outra4567' }).success,
    ).toBe(false);
    expect(
      signUpSchema.safeParse({ email: 'a@b.pt', password: 'curta', confirmPassword: 'curta' }).success,
    ).toBe(false);
    expect(
      resetPasswordSchema.safeParse({ password: 'segura123', confirmPassword: 'segura123' }).success,
    ).toBe(true);
  });
});

describe('forgotPasswordSchema', () => {
  it('valida o email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'a@b.pt' }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: 'nope' }).success).toBe(false);
  });
});

describe('pickActiveOrganization (organização ativa)', () => {
  const orgs = [
    { id: 'org-1', name: 'Um' },
    { id: 'org-2', name: 'Dois' },
  ];

  it('devolve null sem organizações (estado de onboarding)', () => {
    expect(pickActiveOrganization([], 'org-1')).toBeNull();
  });

  it('usa a preferência quando pertence ao utilizador', () => {
    expect(pickActiveOrganization(orgs, 'org-2')?.id).toBe('org-2');
  });

  it('ignora preferência forjada/estranha (segurança: nunca concede acesso)', () => {
    expect(pickActiveOrganization(orgs, 'org-alheia')?.id).toBe('org-1');
    expect(pickActiveOrganization(orgs, null)?.id).toBe('org-1');
    expect(pickActiveOrganization(orgs, '')?.id).toBe('org-1');
  });
});
