import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { assertSupabaseEnv } from '@/lib/env';

/**
 * Cliente Supabase para Server Components / Route Handlers.
 * Usa apenas a anon key + cookies de sessão. O service role key
 * (quando existir) nunca deve ser usado num cliente exposto ao browser.
 */
export async function createSupabaseServerClient() {
  const { url, anonKey } = assertSupabaseEnv(process.env);
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Chamado num Server Component sem controlo de cookies — o middleware
          // de sessão trata da atualização. Não falhar em silêncio: o estado
          // de sessão será tratado como não autenticado a jusante.
        }
      },
    },
  });
}
