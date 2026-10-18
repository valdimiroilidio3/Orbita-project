import { ShieldCheck, Wrench } from 'lucide-react';
import Link from 'next/link';

import { TOOL_DEFINITIONS, TOOL_IDS, type ToolId, type ToolRiskLevel } from '@orbita/shared';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { isSupabaseConfigured } from '@/lib/env';
import { listPendingApprovals } from '@/lib/server/tools';
import { decideApprovalAction } from '@/lib/server/tool-actions';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Ferramentas',
};

const RISK_LABELS: Record<ToolRiskLevel, string> = {
  low: 'Risco baixo',
  moderate: 'Risco moderado',
  high: 'Risco elevado',
};

const RISK_VARIANT: Record<ToolRiskLevel, 'success' | 'warning' | 'danger'> = {
  low: 'success',
  moderate: 'warning',
  high: 'danger',
};

/** Catálogo de ferramentas — independente do fornecedor de voz. */
export default async function ToolsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; aprovacao?: string; motivo?: string }>;
}) {
  const params = await searchParams;
  const configured = isSupabaseConfigured();
  const approvals = configured ? await listPendingApprovals() : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ferramentas do agente"
        description="Catálogo autorizado de operações empresariais que os agentes de voz podem executar — argumentos validados no servidor, execuções auditadas."
      >
        <Badge variant="outline">
          <ShieldCheck className="h-3 w-3" aria-hidden />
          Allowlist · independente do fornecedor
        </Badge>
      </PageHeader>

      {params.error ? (
        <p
          role="alert"
          className="rounded-xl border border-danger/40 bg-danger-soft px-3.5 py-2.5 text-xs font-medium text-danger-text"
        >
          {params.motivo ?? 'Ocorreu um erro. Tenta novamente.'}
        </p>
      ) : null}
      {params.aprovacao ? (
        <p
          role="status"
          className="rounded-xl border border-success/40 bg-success-soft px-3.5 py-2.5 text-xs font-medium text-success-text"
        >
          Aprovação processada.
        </p>
      ) : null}

      {approvals.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Aprovações pendentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {approvals.map((approval) => (
              <div
                key={approval.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-3"
              >
                <div>
                  <p className="text-small font-medium">{toolDisplayName(approval.toolId)}</p>
                  <p className="text-caption text-muted">
                    Execução {approval.toolExecutionId.slice(0, 8)} · expira{' '}
                    {new Date(approval.expiresAt).toLocaleString('pt-PT')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form action={decideApprovalAction}>
                    <input type="hidden" name="approvalId" value={approval.id} />
                    <input type="hidden" name="executionId" value={approval.toolExecutionId} />
                    <input type="hidden" name="decision" value="approve" />
                    <Button type="submit" size="sm">
                      Aprovar
                    </Button>
                  </form>
                  <form action={decideApprovalAction}>
                    <input type="hidden" name="approvalId" value={approval.id} />
                    <input type="hidden" name="executionId" value={approval.toolExecutionId} />
                    <input type="hidden" name="decision" value="reject" />
                    <Button type="submit" variant="outline" size="sm">
                      Rejeitar
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <ul className="grid gap-4 sm:grid-cols-2">
        {TOOL_IDS.map((toolId) => {
          const tool = TOOL_DEFINITIONS[toolId];
          return (
            <li key={toolId}>
              <Card className="h-full transition-shadow hover:shadow-overlay">
                <CardHeader>
                  <CardTitle className="flex items-start justify-between gap-3">
                    <span className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-soft-blue text-primary">
                        <Wrench className="h-4 w-4" aria-hidden />
                      </span>
                      {tool.name}
                    </span>
                    <Badge variant={RISK_VARIANT[tool.risk]}>{RISK_LABELS[tool.risk]}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-small text-muted">{tool.descriptionForAgent}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{tool.category}</Badge>
                    <Badge variant="outline">
                      {tool.confirmation === 'human_approval'
                        ? 'Exige aprovação humana'
                        : tool.confirmation === 'caller_verbal'
                          ? 'Confirmação verbal após sucesso'
                          : 'Sem confirmação'}
                    </Badge>
                    <Badge variant="outline">
                      {tool.idempotent ? 'Idempotente' : 'Chave de idempotência'}
                    </Badge>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/tools/${toolId}`}>Ver detalhe</Link>
                  </Button>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>

      <p className="text-caption text-muted">
        Níveis de risco configuráveis por ferramenta — nunca reduzidos pelo modelo de IA. Operações
        de risco elevado não estão disponíveis nesta fase (sem pagamentos nem eliminações).
      </p>
    </div>
  );
}

function toolDisplayName(toolId: string): string {
  return TOOL_DEFINITIONS[toolId as ToolId]?.name ?? toolId;
}
