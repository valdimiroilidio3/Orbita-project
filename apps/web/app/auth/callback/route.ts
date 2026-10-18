import { NextResponse } from 'next/server';

import { isSupabaseConfigured } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Callback de autenticação (Supabase SSR).
 * Troca o `code` por sessão (links de email, OAuth, recuperação de palavra-passe).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const nextParam = searchParams.get('next');
  // Apenas caminhos internos (proteção contra open redirect).
  const next = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/overview';

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(`${origin}/login?error=not-configured`);
  }

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
