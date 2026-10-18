import { notFound } from 'next/navigation';

import { TOOL_ARGS_SCHEMAS, TOOL_DEFINITIONS, isToolId, type ToolRiskLevel } from '@orbita/shared';

import { ToolRunForm } from '@/components/tools/tool-run-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { isSupabaseConfigured } from '@/lib/env';
import { setAgentToolAction } from '@/lib/server/tool-actions';
import {
  listAgentToolsFor,
  listAgentsForTools,
  listExecutions,
  type ExecutionSummary,
} from '@/lib/server/tools';

export const dynamic = 'force-dynamic';

const RISK_LABELS: Record<ToolRiskLevel, string> = {
  low: 'Risco baixo',
  moderate: 'Risco moderado',
  high: 'Risco elevado',
};

function ExecutionRow({ execution }: { execution: ExecutionSummary }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-2.5">
      <div>
        <p className="text-small font-medium">
          {new Date(execution.createdAt).toLocaleString('pt-PT')}
        </p>
        <p className="text-caption text-muted">
          {execution.resultMessage ?? execution.errorMessage ?? '—'}
        </p>
      </div>
      <Badge
        variant={
          execution.status === 'succeeded'
            ? 'success'
            : execution.status === 'awaiting_approval'
              ? 'warning'
              : 'outline'
        }
      >
        {execution.status}
      </Badge>
    </li>
  );
}

/** Detalhe de ferramenta: esquema, permissões por agente, execuções reais. */
export default async function ToolDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ updated?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  if (!isToolId(id)) notFound();

  const tool = TOOL_DEFINITIONS[id];
  const schema = TOOL_ARGS_SCHEMAS[id];

  const configured = isSupabaseConfigured();
  const agents = configured ? await listAgentsForTools() : [];
  const agentTools = configured ? await listAgentToolsFor(id) : [];
  const executions = configured ? await listExecutions({ toolId: id, limit: 15 }) : [];
  const enabledByAgent = new Map(agentTools.map((entry) => [entry.agentId, entry.enabled]));

  return (
    <div className="space-y-6">
      <PageHeader title={tool.name} description={tool.descriptionForAgent}>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{tool.category}</Badge>
          <Badge
            variant={
              tool.risk === 'low' ? 'success' : tool.risk === 'moderate' ? 'warning' : 'danger'
            }
          >
            {RISK_LABELS[tool.risk]}
          </Badge>
          <Badge variant="outline">
            {tool.idempotent ? 'Idempotente' : 'Requer chave de idempotência'}
          </Badge>
        </div>
      </PageHeader>

      {query.updated ? (
        <p
          role="status"
          className="rounded-xl border border-success/40 bg-success-soft px-3.5 py-2.5 text-xs font-medium text-success-text"
        >
          Autorização atualizada.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Esquema de argumentos</CardTitle>
            <CardDescription>
              Validado no servidor — o modelo não define permissões.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-lg border border-border bg-surface p-3 font-mono text-caption">
              {JSON.stringify(zodToJsonLike(schema), null, 2)}
            </pre>
            <dl className="mt-3 space-y-1 text-caption">
              <div className="flex justify-between">
                <dt className="text-muted">Confirmação</dt>
                <dd>
                  {tool.confirmation === 'human_approval'
                    ? 'Aprovação humana'
                    : tool.confirmation === 'caller_verbal'
                      ? 'Verbal após sucesso (não substitui autenticação forte)'
                      : 'Nenhuma'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Timeout</dt>
                <dd>{tool.timeoutMs} ms</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Retry</dt>
                <dd>
                  {tool.retryPolicy === 'safe'
                    ? 'Seguro (operações idempotentes)'
                    : 'Sem retry automático'}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agentes autorizados</CardTitle>
            <CardDescription>
              Sem autorização explícita, o agente não executa esta ferramenta (apenas owners/admins
              alteram).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {!configured ? (
              <p className="text-caption text-muted">
                Supabase não configurado — autorizações indisponíveis.
              </p>
            ) : agents.length === 0 ? (
              <p className="text-caption text-muted">Sem agentes nesta organização.</p>
            ) : (
              agents.map((agent) => {
                const enabled = enabledByAgent.get(agent.id) === true;
                return (
                  <form
                    key={agent.id}
                    action={setAgentToolAction}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-2.5"
                  >
                    <input type="hidden" name="agentId" value={agent.id} />
                    <input type="hidden" name="toolId" value={id} />
                    <input type="hidden" name="enabled" value={enabled ? 'false' : 'true'} />
                    <span className="text-small">{agent.name}</span>
                    <Button type="submit" variant={enabled ? 'outline' : 'primary'} size="sm">
                      {enabled ? 'Desativar' : 'Ativar'}
                    </Button>
                  </form>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Executar (teste controlado)</CardTitle>
          <CardDescription>
            Execução real e auditada — sem efeitos apresentados como concluídos sem confirmação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {configured ? (
            <ToolRunForm toolId={id} />
          ) : (
            <p className="text-caption text-muted">Supabase não configurado.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Últimas execuções</CardTitle>
        </CardHeader>
        <CardContent>
          {executions.length === 0 ? (
            <p className="text-caption text-muted">Ainda sem execuções desta ferramenta.</p>
          ) : (
            <ul className="space-y-2">
              {executions.map((execution) => (
                <ExecutionRow key={execution.id} execution={execution} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** Representação legível do schema Zod para a UI (sem dependências novas). */
function zodToJsonLike(schema: unknown): Record<string, unknown> {
  const def = (schema as { shape?: Record<string, unknown> }).shape;
  if (!def) return { type: 'object' };
  const properties: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(def)) {
    const description = (value as { description?: string }).description;
    properties[key] = description ? { description } : { type: 'unknown' };
  }
  return { type: 'object', properties };
}
