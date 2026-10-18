import { Users } from 'lucide-react';

import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata = {
  title: 'Contactos',
};

export default function ContactsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Contactos" description="Gestão de contactos para campanhas e chamadas.">
        <Badge variant="outline">Planeado — Sprint seguinte</Badge>
      </PageHeader>
      <EmptyState
        icon={Users}
        title="Contactos ainda não disponíveis"
        description="A tabela de contactos e a importação de listas serão implementadas numa fase seguinte (prevista em docs/architecture.md). Nenhum dado de contacto é apresentado neste sprint."
      />
    </div>
  );
}
