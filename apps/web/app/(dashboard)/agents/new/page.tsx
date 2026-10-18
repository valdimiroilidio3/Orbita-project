import { Construction } from 'lucide-react';
import Link from 'next/link';

import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';

export const metadata = {
  title: 'Novo agente',
};

export default function NewAgentPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Novo agente"
        description="Fluxo de criação de agentes — planeado para uma fase seguinte."
        breadcrumbs={
          <Breadcrumbs items={[{ label: 'Agents', href: '/agents' }, { label: 'Novo' }]} />
        }
      />
      <EmptyState
        icon={Construction}
        title="Criação de agentes em construção"
        description="A Fase 02 entregou o design system. O formulário de criação (instruções, idioma, voz e configuração) será implementado numa fase seguinte, com validação no servidor e políticas RLS de escrita."
        action={
          <Button variant="outline" asChild>
            <Link href="/agents">Voltar aos agentes</Link>
          </Button>
        }
      />
    </div>
  );
}
