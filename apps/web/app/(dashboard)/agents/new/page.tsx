import { Info } from 'lucide-react';

import { AgentForm } from '@/components/agents/agent-form';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { isSupabaseConfigured } from '@/lib/env';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Novo agente',
};

/** Criação de agente — Agent Studio. Validação e escrita no servidor (RLS). */
export default function NewAgentPage() {
  const configured = isSupabaseConfigured();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Novo agente"
        description="Configura a identidade, as instruções e a voz do agente. O agente nasce em rascunho."
      />

      {!configured ? (
        <p
          role="status"
          className="flex items-start gap-2 rounded-xl border border-accent/40 bg-soft-blue px-3.5 py-2.5 text-xs font-medium text-primary"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            <strong>Supabase não configurado.</strong> O formulário está disponível para exploração,
            mas a criação não é executada nem simulada — preenche{' '}
            <code className="font-mono text-caption">apps/web/.env.local</code> para criar agentes
            reais.
          </span>
        </p>
      ) : null}

      <Card>
        <CardContent>
          <AgentForm mode="create" disabled={!configured} />
        </CardContent>
      </Card>
    </div>
  );
}
