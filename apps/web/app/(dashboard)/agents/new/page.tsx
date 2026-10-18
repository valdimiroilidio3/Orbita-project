import { Construction } from 'lucide-react';
import Link from 'next/link';

import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata = {
  title: 'Novo agente',
};

export default function NewAgentPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Novo agente"
        description="Fluxo de criação de agentes — planeado para o próximo sprint."
      />
      <EmptyState
        icon={Construction}
        title="Criação de agentes em construção"
        description="No Sprint 1 apenas a fundação está pronta. O formulário de criação (instruções, idioma, voz e configuração) será implementado no próximo sprint, com validação no servidor e políticas RLS de escrita."
        action={
          <Button variant="secondary" asChild>
            <Link href="/agents">Voltar aos agentes</Link>
          </Button>
        }
      />
    </div>
  );
}
