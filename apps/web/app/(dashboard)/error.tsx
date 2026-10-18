'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';

/**
 * Fronteira de erro do dashboard: mensagem sanitizada ao utilizador (sem
 * stack traces nem detalhes internos); o erro completo fica no servidor.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Apenas o identificador — nunca a mensagem completa no browser.
    console.error('[dashboard] erro de renderização', { digest: error.digest ?? null });
  }, [error.digest]);

  return (
    <ErrorState
      title="Não foi possível carregar esta página"
      description={`Ocorreu um erro inesperado. Tenta novamente; se persistir, contacta o suporte${error.digest ? ` e indica o código ${error.digest}` : ''}.`}
      action={
        <Button type="button" onClick={reset}>
          Tentar novamente
        </Button>
      }
    />
  );
}
