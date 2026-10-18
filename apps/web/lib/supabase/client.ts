import { createBrowserClient } from '@supabase/ssr';

import { assertSupabaseEnv } from '@/lib/env';

/**
 * Cliente Supabase para o browser.
 * Lança erro descritivo se as variáveis públicas não existirem
 * (falha visível, nunca silenciosa).
 */
export function createSupabaseBrowserClient() {
  const { url, anonKey } = assertSupabaseEnv(process.env);
  return createBrowserClient(url, anonKey);
}
