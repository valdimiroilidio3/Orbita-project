import { cache } from 'react';

import { isSupabaseConfigured } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

/**
 * Sessão no servidor (Server Components / Route Handlers / Server Actions).
 * `cache` evita consultas repetidas no mesmo pedido.
 */
export const getUser = cache(async (): Promise<User | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
});

/** Exige sessão autenticada; lança erro claro se ausente. */
export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) {
    throw new Error('Sessão obrigatória: inicia sessão para continuar.');
  }
  return user;
}
