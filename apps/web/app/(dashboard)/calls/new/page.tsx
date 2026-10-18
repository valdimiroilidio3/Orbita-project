import { Info } from 'lucide-react';

import { StartCallForm } from '@/components/calls/start-call-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { isSupabaseConfigured } from '@/lib/env';
import { listMyActiveAgents } from '@/lib/server/calls';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Nova chamada',
};

/**
 * Nova chamada — motor de chamadas com SIMULADOR local.
 * Sem telefonia real nesta fase (ver docs/call-engine.md).
 */
export default async function NewCallPage() {
  const configured = isSupabaseConfigured();
  const agents = configured ? await listMyActiveAgents() : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nova chamada"
        description="Inicia uma chamada com um agente ativo. Nesta fase o fornecedor é o simulador local — não existe telefonia real."
      />

      {!configured ? (
        <p
          role="status"
          className="flex items-start gap-2 rounded-xl border border-accent/40 bg-soft-blue px-3.5 py-2.5 text-xs font-medium text-primary"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            <strong>Supabase não configurado.</strong> Nenhuma chamada é criada nem simulada —
            preenche <code className="font-mono text-caption">apps/web/.env.local</code> para usar o
            motor de chamadas.
          </span>
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Destino e agente</CardTitle>
        </CardHeader>
        <CardContent>
          <StartCallForm
            agents={agents}
            disabled={!configured}
            disabledReason={
              !configured
                ? 'O motor de chamadas requer Supabase configurado — nada é simulado sem isso.'
                : agents.length === 0
                  ? 'Cria e publica um agente antes de iniciar chamadas.'
                  : undefined
            }
          />
        </CardContent>
      </Card>

      <p className="text-caption text-muted">
        O simulador regista a chamada como <code className="font-mono">provider = simulado</code> e
        apresenta-a sempre com badge «Simulada». A integração de telefonia real está documentada em
        docs/call-engine.md e não é ativada sem credenciais.
      </p>
    </div>
  );
}
