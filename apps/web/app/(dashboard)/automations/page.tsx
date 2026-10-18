import { Workflow, Plus, Search } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { isSupabaseConfigured } from '@/lib/env';
import { listWorkflows, type WorkflowSummary } from '@/lib/server/tools';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Automações',
};

const TRIGGER_LABELS: Record<string, string> = {
  'call.received': 'Chamada recebida',
  'call.completed': 'Chamada terminada',
  'call.failed': 'Chamada falhada',
  'call.no_answer': 'Não atendida',
  'call.busy': 'Linha ocupada',
  'contact_request.created': 'Pedido de contacto criado',
  'appointment.created': 'Marcação criada',
};

function WorkflowCard({ workflow }: { workflow: WorkflowSummary }) {
  return (
    <Card className="transition-shadow hover:shadow-overlay">
      <CardContent className="space-y-3 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-base font-semibold">
              {workflow.name}
              <Badge variant={workflow.active ? 'success' : 'neutral'}>
                {workflow.active ? 'Ativo' : 'Inativo'}
              </Badge>
            </p>
            <p className="mt-1 text-xs text-muted">{workflow.description ?? 'Sem descrição.'}</p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-soft-blue text-primary">
            <Workflow className="h-4.5 w-4.5" aria-hidden />
          </span>
        </div>
        <dl className="grid grid-cols-3 gap-2 text-caption">
          <div>
            <dt className="text-muted">Gatilho</dt>
            <dd>{TRIGGER_LABELS[workflow.trigger] ?? workflow.trigger}</dd>
          </div>
          <div>
            <dt className="text-muted">Passos</dt>
            <dd>{workflow.stepsCount}</dd>
          </div>
          <div>
            <dt className="text-muted">Execuções</dt>
            <dd>
              {workflow.runsCount}
              {workflow.lastRunAt ? (
                <span className="block text-muted">
                  última: {new Date(workflow.lastRunAt).toLocaleDateString('pt-PT')} ({workflow.lastRunStatus})
                </span>
              ) : null}
            </dd>
          </div>
        </dl>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/automations/${workflow.id}`}>Ver/editar</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

/** Lista de workflows — taxa de sucesso só com dados reais (contagens). */
export default async function AutomationsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; deleted?: string; error?: string }>;
}) {
  const params = await searchParams;
  const configured = isSupabaseConfigured();
  const workflows = configured ? await listWorkflows() : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automações"
        description="Workflows empresariais disparados por eventos reais de chamadas, contactos e marcações."
      >
        <Button asChild>
          <Link href="/automations/new">
            <Plus className="h-4 w-4" aria-hidden />
            Novo workflow
          </Link>
        </Button>
      </PageHeader>

      {params.created ? (
        <p role="status" className="rounded-xl border border-success/40 bg-success-soft px-3.5 py-2.5 text-xs font-medium text-success-text">
          Workflow criado.
        </p>
      ) : null}
      {params.deleted ? (
        <p role="status" className="rounded-xl border border-success/40 bg-success-soft px-3.5 py-2.5 text-xs font-medium text-success-text">
          Workflow eliminado.
        </p>
      ) : null}
      {params.error ? (
        <p role="alert" className="rounded-xl border border-danger/40 bg-danger-soft px-3.5 py-2.5 text-xs font-medium text-danger-text">
          Ocorreu um erro. Tenta novamente.
        </p>
      ) : null}

      {!configured || workflows.length === 0 ? (
        <EmptyState
          icon={configured ? Search : Workflow}
          title={configured ? 'Ainda sem automações' : 'Automações indisponíveis'}
          description={
            configured
              ? 'Cria um workflow para reagir a eventos reais — por exemplo, registar um pedido de contacto quando uma chamada não é atendida.'
              : 'Supabase não configurado — as automações exigem base de dados real.'
          }
          action={
            configured ? (
              <Button asChild>
                <Link href="/automations/new">
                  <Plus className="h-4 w-4" aria-hidden />
                  Novo workflow
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {workflows.map((workflow) => (
            <li key={workflow.id}>
              <WorkflowCard workflow={workflow} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
