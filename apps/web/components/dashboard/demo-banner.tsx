import { FlaskConical } from 'lucide-react';

import { DEMO_NOTICE } from '@/lib/demo-data';

/**
 * Aviso obrigatório em qualquer ecrã que apresente dados de demonstração.
 * Regra do Sprint 1: nunca mostrar dados fictícios como se fossem reais.
 */
export function DemoBanner() {
  return (
    <p className="flex items-start gap-2 rounded-xl border border-accent/40 bg-soft-blue px-3.5 py-2.5 text-xs font-medium text-primary">
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>
        <strong>Modo de demonstração.</strong> {DEMO_NOTICE}
      </span>
    </p>
  );
}
