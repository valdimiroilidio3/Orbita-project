import { redirect } from 'next/navigation';

/** A faturação vive agora em Definições → Faturação; a rota antiga redireciona. */
export default function BillingRedirectPage() {
  redirect('/settings/billing');
}
