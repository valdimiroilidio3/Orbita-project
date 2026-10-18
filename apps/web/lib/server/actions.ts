'use server';

import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';

import {
  createOrganizationSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signUpSchema,
} from '@orbita/shared';
import type { ZodError } from 'zod';

import { isSupabaseConfigured } from '@/lib/env';
import { ACTIVE_ORG_COOKIE, listMyOrganizations, pickActiveOrganization } from '@/lib/server/organizations';
import { requireUser } from '@/lib/server/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { AuthFormState } from '@/lib/server/auth-form-state';

/**
 * Server actions de autenticação e organização.
 *
 * Regras:
 * - Validação SEMPRE no servidor (Zod), além do cliente.
 * - Credenciais nunca são armazenadas manualmente — Supabase Auth gere
 *   palavras-passe e tokens de sessão (cookies httpOnly via @supabase/ssr).
 * - Mensagens de autenticação não revelam se um email está registado.
 * - Sem Supabase configurado, NENHUMA autenticação é simulada.
 */

function zodIssues(error: ZodError): string {
  return error.issues.map((issue) => issue.message).join(' · ');
}

function notConfigured(): AuthFormState {
  return {
    error:
      'Supabase não configurado: copia apps/web/.env.example para apps/web/.env.local e preenche NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY. A autenticação não é simulada.',
    success: null,
  };
}

export async function signInAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isSupabaseConfigured()) return notConfigured();

  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { error: zodIssues(parsed.error), success: null };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Mensagem genérica — não revela se o email existe.
    return { error: 'Credenciais inválidas. Verifica o email e a palavra-passe.', success: null };
  }

  const next = formData.get('next');
  redirect(typeof next === 'string' && next.startsWith('/') ? next : '/overview');
}

export async function signUpAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isSupabaseConfigured()) return notConfigured();

  const parsed = signUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });
  if (!parsed.success) return { error: zodIssues(parsed.error), success: null };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  // Resposta sempre genérica (sem enumerar emails registados).
  const generic =
    'Se este email puder ser utilizado, recebes uma mensagem de confirmação. Verifica a tua caixa de entrada.';

  if (error) {
    return { error: null, success: generic };
  }

  // Sessão imediata quando a confirmação de email está desativada.
  if (data.session) {
    redirect('/onboarding');
  }
  return { error: null, success: generic };
}

export async function forgotPasswordAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isSupabaseConfigured()) return notConfigured();

  const parsed = forgotPasswordSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) return { error: zodIssues(parsed.error), success: null };

  const supabase = await createSupabaseServerClient();
  // Origem derivada do pedido no servidor (não confiar em valores do cliente).
  const headerStore = await headers();
  const origin = headerStore.get('origin') ?? '';
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: origin ? `${origin}/auth/callback?next=/reset-password` : undefined,
  });

  // Sempre a mesma mensagem, com ou sem conta existente.
  return {
    error: null,
    success: 'Se existir uma conta com esse email, recebes um link de recuperação dentro de momentos.',
  };
}

export async function resetPasswordAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isSupabaseConfigured()) return notConfigured();

  const parsed = resetPasswordSchema.safeParse({
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });
  if (!parsed.success) return { error: zodIssues(parsed.error), success: null };

  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return {
      error: 'Não foi possível atualizar a palavra-passe. O link de recuperação pode ter expirado — pede um novo.',
      success: null,
    };
  }
  redirect('/overview');
}

export async function signOutAction(): Promise<void> {
  if (!isSupabaseConfigured()) {
    redirect('/login');
  }
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function createOrganizationAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isSupabaseConfigured()) return notConfigured();

  const parsed = createOrganizationSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
  });
  if (!parsed.success) return { error: zodIssues(parsed.error), success: null };

  await requireUser();
  const supabase = await createSupabaseServerClient();

  // RPC transacional: cria organização + membership owner com a identidade
  // da sessão (auth.uid()) — nunca um UUID vindo do cliente.
  const { data: organizationId, error } = await supabase.rpc('create_organization', {
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
  });

  if (error || !organizationId) {
    const message = error?.message ?? 'Erro desconhecido.';
    if (message.includes('slug')) {
      return { error: 'Este slug já está em utilização. Escolhe outro.', success: null };
    }
    return { error: `Não foi possível criar a organização: ${message}`, success: null };
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect('/overview');
}

export async function setActiveOrganizationAction(formData: FormData): Promise<void> {
  const organizationId = formData.get('organizationId');
  if (typeof organizationId !== 'string' || organizationId === '') {
    return;
  }

  // A preferência só é aceite se o utilizador for mesmo membro (validação
  // no servidor + RLS). Nunca concede permissões adicionais.
  const organizations = await listMyOrganizations();
  const selected = pickActiveOrganization(organizations, organizationId);
  if (!selected || selected.id !== organizationId) {
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
}
