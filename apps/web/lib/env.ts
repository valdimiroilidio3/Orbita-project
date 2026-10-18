/**
 * Validação de variáveis de ambiente.
 *
 * Regra de produto: a aplicação NÃO deve falhar silenciosamente quando
 * faltam credenciais — o estado de "não configurado" é detetado aqui e
 * comunicado na UI (banner de modo de demonstração).
 */

export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

export type SupabaseEnvResult = { ok: true; value: SupabaseEnv } | { ok: false; missing: string[] };

type EnvSource = Record<string, string | undefined>;

export const SUPABASE_PUBLIC_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const;

export function readSupabaseEnv(env: EnvSource = process.env): SupabaseEnvResult {
  const missing: string[] = [];
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || url.trim() === '') missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!anonKey || anonKey.trim() === '') missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  if (missing.length > 0) {
    return { ok: false, missing };
  }
  return { ok: true, value: { url: url as string, anonKey: anonKey as string } };
}

/** Versão que lança erro descritivo — para fluxos que exigem Supabase configurado. */
export function assertSupabaseEnv(env: EnvSource = process.env): SupabaseEnv {
  const result = readSupabaseEnv(env);
  if (!result.ok) {
    throw new Error(
      `Supabase não configurado. Variáveis em falta: ${result.missing.join(', ')}. ` +
        'Copia apps/web/.env.example para apps/web/.env.local e preenche os valores. Consulta o README.',
    );
  }
  return result.value;
}

/** Indica se o serviço externo está configurado (para banners/estados de UI). */
export function isSupabaseConfigured(env: EnvSource = process.env): boolean {
  return readSupabaseEnv(env).ok;
}
