import { CreditCard } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';

export const metadata = {
  title: 'Faturação',
};

/**
 * Estado honesto: não existe integração de faturação nem simulação de
 * pagamentos. Os custos apresentados no Calls Center são estimativas do
 * simulador local e estão identificados como tal.
 */
export default function BillingPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Faturação" description="Planos, utilização e pagamentos.">
        <Badge variant="neutral">Não implementado</Badge>
      </PageHeader>

      <EmptyState
        icon={CreditCard}
        title="Faturação ainda não disponível"
        description="Não existe integração de pagamentos configurada (a variável STRIPE_SECRET_KEY está reservada e não é usada). Nenhum pagamento é simulado e nenhum limite de utilização é cobrado nesta versão."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">O que existe hoje</CardTitle>
          <CardDescription>Transparência sobre custos e limites atuais.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-small text-muted">
          <p>
            • Custo estimado por chamada: calculado pelo <strong>simulador local</strong> (0,02
            €/min) e identificado como estimativa — não corresponde a faturação real.
          </p>
          <p>
            • Limites operacionais em vigor: duração máxima de chamada, limites de execuções de
            ferramentas por minuto e por chamada, limites de passos e tempo em workflows (ver
            docs/tool-security.md e docs/voice-security.md). Não são limites de plano comercial.
          </p>
          <p>
            • Quando existir faturação real, será implementada por migrações versionadas e
            documentada aqui.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
