import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { isSupabaseConfigured } from '@/lib/env';

/**
 * Middleware de sessão (Supabase SSR).
 *
 * - Atualiza tokens de sessão em cada pedido (integração SSR recomendada).
 * - Protege rotas privadas quando o Supabase está configurado.
 * - Sem Supabase configurado, a app corre em modo de demonstração (sem
 *   sessões) — nunca é simulada uma autenticação bem-sucedida.
 *
 * IMPORTANTE: o middleware é apenas a primeira camada. A autorização real
 * acontece na base de dados (RLS) e em verificações de sessão no servidor
 * (layouts/rotas).
 */

const PROTECTED_PREFIXES = [
  '/overview',
  '/agents',
  '/calls',
  '/contacts',
  '/automations',
  '/analytics',
  '/integrations',
  '/billing',
  '/settings',
  '/onboarding',
  '/reset-password',
];

const AUTH_PAGES = ['/login', '/register', '/forgot-password'];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  if (!isSupabaseConfigured()) {
    // Modo demonstração: sem credenciais não existe sessão real.
    // As páginas privadas continuam acessíveis com aviso explícito de configuração.
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser() valida o token no servidor Auth (não confia só no cookie).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (!user && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    if (pathname !== '/overview') {
      url.searchParams.set('next', pathname);
    }
    return NextResponse.redirect(url);
  }

  if (user && AUTH_PAGES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/overview';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/health|design-system|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
