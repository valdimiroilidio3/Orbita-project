import { Plug } from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata = {
  title: 'Integrações',
};

const PLANNED = [
  {
    name: 'Twilio (telefonia)',
    description: 'Realização de chamadas de voz — primeiro motor de voz.',
  },
  { name: 'OpenAI (IA)', description: 'Compreensão e geração de resposta do agente.' },
  { name: 'Stripe (billing)', description: 'Faturação e planos de subscrição.' },
];

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrações"
        description="Ligações a fornecedores externos de voz, IA e faturação."
      >
        <Badge variant="outline">Nenhuma ativa</Badge>
      </PageHeader>

      <EmptyState
        icon={Plug}
        title="Nenhuma integração ativa"
        description="As integrações externas não estão implementadas nem testadas neste sprint. Não são apresentadas como conectadas sem confirmação real."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PLANNED.map((item) => (
          <Card key={item.name} className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base">{item.name}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="neutral">Em breve</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
