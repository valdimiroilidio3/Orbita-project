import { WorkflowForm } from '@/components/automations/workflow-form';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Novo workflow',
};

/** Criação de workflow — gatilhos e ações limitados ao catálogo autorizado. */
export default function NewWorkflowPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Novo workflow"
        description="Define um gatilho real e uma sequência de até 5 ações autorizadas. Validação no cliente e no servidor."
      />
      <Card>
        <CardContent>
          <WorkflowForm
            values={{
              name: '',
              description: null,
              trigger: 'call.no_answer',
              active: true,
              steps: [
                {
                  toolId: 'contact_request.create',
                  args: {
                    phone: '{{call.fromNumber}}',
                    reason: 'Chamada não atendida — pedido de contacto automático',
                  },
                },
              ],
              timeoutSeconds: 30,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
