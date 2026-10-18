import { describe, expect, it } from 'vitest';

import {
  assertSupabaseEnv,
  isSupabaseConfigured,
  readSupabaseEnv,
  SUPABASE_PUBLIC_VARS,
} from '../lib/env';

const validEnv = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-demo',
};

describe('readSupabaseEnv', () => {
  it('deteta configuração completa', () => {
    const result = readSupabaseEnv(validEnv);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.url).toBe(validEnv.NEXT_PUBLIC_SUPABASE_URL);
    }
  });

  it('lista variáveis em falta (falha visível, nunca silenciosa)', () => {
    const result = readSupabaseEnv({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missing).toEqual([...SUPABASE_PUBLIC_VARS]);
    }
  });

  it('considera strings vazias como em falta', () => {
    const result = readSupabaseEnv({
      NEXT_PUBLIC_SUPABASE_URL: '   ',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-demo',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missing).toEqual(['NEXT_PUBLIC_SUPABASE_URL']);
    }
  });
});

describe('assertSupabaseEnv', () => {
  it('lança erro descritivo quando faltam variáveis', () => {
    expect(() => assertSupabaseEnv({})).toThrowError(/Supabase não configurado/);
    expect(() => assertSupabaseEnv({})).toThrowError(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it('devolve o ambiente quando configurado', () => {
    expect(assertSupabaseEnv(validEnv).url).toBe(validEnv.NEXT_PUBLIC_SUPABASE_URL);
  });
});

describe('isSupabaseConfigured', () => {
  it('reflete o estado de configuração', () => {
    expect(isSupabaseConfigured(validEnv)).toBe(true);
    expect(isSupabaseConfigured({})).toBe(false);
  });
});
