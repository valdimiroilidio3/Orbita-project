import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase de SERVIÇO (service role) — caminho privilegiado de
 * sistema, exclusivamente para ingestão de webhooks de fornecedor no
 * servidor.
 *
 * ⚠️ REGRAS:
 *   • a chave NUNCA chega ao browser, ao bundle ou a logs;
 *   • NÃO é usada em operações normais de utilizador (essas usam sessão +
 *     RLS — docs/security.md);
 *   • sem a variável configurada, a ingestão de webhooks responde que a
 *     persistência privilegiada não está configurada (não é simulada);
 *   • as tabelas ingeridas (`call_events`) não têm políticas de escrita
 *     para clientes autenticados (RLS denega por omissão).
 */

let cached: SupabaseClient | null | undefined;

export function isServiceRoleConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

/** Cliente de serviço ou `null` quando não configurado. */
export function getSupabaseServiceClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    cached = null;
    return cached;
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
