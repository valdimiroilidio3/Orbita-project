import { describe, expect, it } from 'vitest';

import {
  changePasswordSchema,
  evaluateRemoval,
  evaluateRoleChange,
  isValidTimeZone,
  organizationGeneralSchema,
  organizationVoiceSchema,
  profileSchema,
  userPreferencesSchema,
  type MemberActionContext,
} from './settings';

const ctx = (over: Partial<MemberActionContext> = {}): MemberActionContext => ({
  actorRole: 'owner',
  actorId: 'u-actor',
  target: { userId: 'u-target', role: 'member' },
  ownerCount: 1,
  ...over,
});

describe('evaluateRoleChange', () => {
  it('member nunca gere papéis', () => {
    expect(evaluateRoleChange(ctx({ actorRole: 'member' }), 'admin')).toEqual({
      allowed: false,
      reason: 'not_authorized',
    });
  });
  it('ninguém altera o próprio papel', () => {
    expect(
      evaluateRoleChange(ctx({ target: { userId: 'u-actor', role: 'owner' } }), 'admin'),
    ).toEqual({ allowed: false, reason: 'self_role_change' });
  });
  it('admin não atribui owner nem edita owners', () => {
    expect(evaluateRoleChange(ctx({ actorRole: 'admin' }), 'owner')).toEqual({
      allowed: false,
      reason: 'owner_only_assigns_owner',
    });
    expect(
      evaluateRoleChange(
        ctx({ actorRole: 'admin', target: { userId: 'u-target', role: 'owner' }, ownerCount: 2 }),
        'admin',
      ),
    ).toEqual({ allowed: false, reason: 'owner_only_edits_owner' });
  });
  it('último owner não é despromovido', () => {
    expect(
      evaluateRoleChange(
        ctx({ target: { userId: 'u-target', role: 'owner' }, ownerCount: 1 }),
        'admin',
      ),
    ).toEqual({ allowed: false, reason: 'last_owner' });
  });
  it('owner promove member a admin e admin promove member', () => {
    expect(evaluateRoleChange(ctx(), 'admin')).toEqual({ allowed: true });
    expect(evaluateRoleChange(ctx({ actorRole: 'admin' }), 'admin')).toEqual({ allowed: true });
  });
});

describe('evaluateRemoval', () => {
  it('member pode sair mas não remover outros', () => {
    expect(
      evaluateRemoval(ctx({ actorRole: 'member', target: { userId: 'u-actor', role: 'member' } })),
    ).toEqual({ allowed: true });
    expect(evaluateRemoval(ctx({ actorRole: 'member' }))).toEqual({
      allowed: false,
      reason: 'not_authorized',
    });
  });
  it('último owner nunca é removido, nem por si', () => {
    expect(
      evaluateRemoval(ctx({ target: { userId: 'u-actor', role: 'owner' }, ownerCount: 1 })),
    ).toEqual({ allowed: false, reason: 'last_owner' });
  });
  it('admin não remove owner; owner remove outro owner se houver mais', () => {
    expect(
      evaluateRemoval(
        ctx({ actorRole: 'admin', target: { userId: 'u-target', role: 'owner' }, ownerCount: 2 }),
      ),
    ).toEqual({ allowed: false, reason: 'owner_only_removes_owner' });
    expect(
      evaluateRemoval(ctx({ target: { userId: 'u-target', role: 'owner' }, ownerCount: 2 })),
    ).toEqual({ allowed: true });
  });
});

describe('schemas de definições', () => {
  it('valida fuso horário IANA', () => {
    expect(isValidTimeZone('Europe/Lisbon')).toBe(true);
    expect(isValidTimeZone('Marte/Olympus')).toBe(false);
    expect(
      userPreferencesSchema.safeParse({
        locale: 'pt-PT',
        timezone: 'Nope/Nope',
        theme: 'system',
        date_format: 'dd/MM/yyyy',
        time_format: '24h',
      }).success,
    ).toBe(false);
  });
  it('rejeita nomes com marcação', () => {
    expect(profileSchema.safeParse({ name: '<script>' }).success).toBe(false);
    expect(profileSchema.safeParse({ name: 'Ana Silva' }).success).toBe(true);
  });
  it('website e país normalizados', () => {
    const parsed = organizationGeneralSchema.parse({ name: 'Orbita', website: '', country: 'pt' });
    expect(parsed.website).toBeNull();
    expect(parsed.country).toBe('PT');
    expect(
      organizationGeneralSchema.safeParse({ name: 'Orbita', website: 'orbita.pt' }).success,
    ).toBe(false);
  });
  it('voz: limites de duração e gravação explícita', () => {
    const parsed = organizationVoiceSchema.parse({
      default_language: 'pt-PT',
      max_call_duration_seconds: '',
      recording_enabled: false,
      retention_days: '30',
    });
    expect(parsed.max_call_duration_seconds).toBeNull();
    expect(parsed.retention_days).toBe(30);
    expect(
      organizationVoiceSchema.safeParse({
        default_language: 'pt-PT',
        max_call_duration_seconds: '10',
        recording_enabled: false,
      }).success,
    ).toBe(false);
  });
  it('palavra-passe exige letras, números e confirmação', () => {
    expect(
      changePasswordSchema.safeParse({ password: 'abcdefgh', confirmPassword: 'abcdefgh' }).success,
    ).toBe(false);
    expect(
      changePasswordSchema.safeParse({ password: 'abcdefg1', confirmPassword: 'abcdefg2' }).success,
    ).toBe(false);
    expect(
      changePasswordSchema.safeParse({ password: 'abcdefg1', confirmPassword: 'abcdefg1' }).success,
    ).toBe(true);
  });
});
