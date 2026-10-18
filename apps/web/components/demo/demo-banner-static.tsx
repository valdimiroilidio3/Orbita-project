import { FlaskConical } from 'lucide-react';

/** Aviso estático da página de demonstração (sem client component). */
export function DemoBanner() {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning-soft px-3.5 py-2.5 text-caption font-medium text-warning-text">
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>
        <strong>Página de demonstração.</strong> Componentes e dados fictícios para verificação
        visual — não representam métricas, chamadas nem clientes reais.
      </span>
    </p>
  );
}
