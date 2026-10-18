import { AlertTriangle, CheckCircle2, CircleDashed, Plug, XCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import {
  INTEGRATION_STATE_LABELS,
  buildIntegrationStatuses,
  type IntegrationState,
} from '@/lib/integrations/status';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Integrações',
};

const STATE_VARIANT: Record<IntegrationState, 'success' | 'warning' | 'neutral' | 'danger'> = {
  available: 'success',
  configured_untested: 'warning',
  not_configured: 'danger',
  not_implemented: 'neutral',
};

const STATE_ICON: Record<IntegrationState, typeof CheckCircle2> = {
  available: CheckCircle2,
  configured_untested: AlertTriangle,
  not_configured: XCircle,
  not_implemented: CircleDashed,
};

/**
 * Estado REAL de cada integração (configuração ≠ verificação operacional).
 * Nenhuma integração é apresentada como ligada sem o estar.
 */
export default function IntegrationsPage() {
  const integrations = buildIntegrationStatuses();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrações"
        description="Estado real das ligações externas. Separação explícita entre configuração, autenticação e verificação operacional."
      >
        <Badge variant="outline">
          <Plug className="h-3 w-3" aria-hidden />
          Sem segredos no browser
        </Badge>
      </PageHeader>

      <ul className="grid gap-4 sm:grid-cols-2">
        {integrations.map((item) => {
          const Icon = STATE_ICON[item.state];
          return (
            <li key={item.id}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-start justify-between gap-3 text-base">
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                      {item.name}
                    </span>
                    <Badge variant={STATE_VARIANT[item.state]}>
                      {INTEGRATION_STATE_LABELS[item.state]}
                    </Badge>
                  </CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-small text-muted">{item.detail}</p>
                  {item.docs ? (
                    <p className="text-caption text-muted">
                      Configuração e diagnóstico:{' '}
                      <code className="rounded bg-surface px-1.5 py-0.5 font-mono">
                        {item.docs}
                      </code>
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>

      <p className="text-caption text-muted">
        As credenciais são lidas apenas no servidor a partir de variáveis de ambiente. Esta página
        mostra estados, nunca valores.
      </p>
    </div>
  );
}
