import { LoginForm } from '@/components/auth/login-form';

/**
 * Página de login (servidor) — `searchParams` lido no servidor para que o
 * formulário seja renderizado no HTML inicial (acessível sem hidratação).
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; registered?: string; notice?: string }>;
}) {
  const params = await searchParams;
  return (
    <LoginForm
      next={params.next}
      justRegistered={params.registered === '1'}
      notice={params.notice === 'sessoes_terminadas' ? 'Todas as sessões foram terminadas.' : null}
    />
  );
}
