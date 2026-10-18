import { Trash2 } from 'lucide-react';
import { notFound } from 'next/navigation';

import { WorkflowForm } from '@/components/automations/workflow-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { isSupabaseConfigured } from '@/lib/env';
import { deleteWorkflowAction } from '@/lib/server/tool-actions';
import { getWorkflow, listWorkflowRuns } from '@/lib/server/tools';

export const dynamic = 'force-dynamic';

const RUN_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  succeeded: 'success',
  partial: 'warning',
  failed: 'danger',
  timed_out: 'danger',
  running: 'neutral',
};

/** Detalhe de workflow: edição autorizada + histórico de execuções reais. */
export default async function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isSupabaseConfigured()) notFound();

  const workflow = await getWorkflow(id);
  if (!workflow) notFound();
  const runs = await listWorkflowRuns(id);

  return (
    <div className="space-y-6">
      <PageHeader title={workflow.name} description={workflow.description ?? 'Workflow de automação.'}>
        <div className="flex items-center gap-2">
          <Badge variant={workflow.active ? 'success' : 'neutral'}>
            {workflow.active ? 'Ativo' : 'Inativo'}
          </Badge>
          <form action={deleteWorkflowAction}>
            <input type="hidden" name="id" value={id} />
            <Button type="submit" variant="destructive" size="sm">
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Eliminar
            </Button>
          </form>
        </div>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Editar workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkflowForm
            values={{
              id: workflow.id,
              name: workflow.name,
              description: workflow.description,
              trigger: workflow.trigger,
              active: workflow.active,
              steps: workflow.steps,
              timeoutSeconds: workflow.timeoutSeconds,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de execuções</CardTitle>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <p className="text-caption text-muted">Ainda sem execuções — os workflows disparam com eventos reais.</p>
          ) : (
            <ul className="space-y-3">
              {runs.map((run) => (
                <li key={run.id} className="rounded-xl border border-border px-3.5 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-small font-medium">
                      {new Date(run.startedAt).toLocaleString('pt-PT')} · {run.trigger}
                    </p>
                    <Badge variant={RUN_VARIANT[run.status] ?? 'neutral'}>{run.status}</Badge>
                  </div>
                  {run.stepsResult.length > 0 ? (
                    <ol className="mt-2 space-y-1">
                      {run.stepsResult.map((step, index) => (
                        <li key={`${run.id}-${index}`} className="text-caption text-muted">
                          {index + 1}. {step.toolId} — {step.status}: {step.message}
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
