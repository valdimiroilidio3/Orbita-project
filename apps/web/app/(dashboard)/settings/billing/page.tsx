import { CreditCard } from 'lucide-react';
import Link from 'next/link';

import {
  PendingNotice,
  SettingRow,
  SettingsSection,
  Unavailable,
} from '@/components/settings/settings-section';
import { Badge } from '@/components/ui/badge';

export const metadata = { title: 'Faturação · Definições' };

/**
 * Faturação ainda não configurada. Nenhum plano, preço, fatura ou método de
 * pagamento é apresentado porque não existe integração real. Quando existir,
 * os dados de cartão NUNCA passam pela aplicação (checkout/portal do fornecedor).
 */
export default function BillingSettingsPage() {
  return (
    <>
      <SettingsSection
        title="Faturação ainda não configurada"
        description="Não existe integração de pagamentos ligada a esta organização."
        badge={<Badge variant="neutral">Não disponível</Badge>}
      >
        <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-primary">
            <CreditCard className="h-5 w-5" aria-hidden />
          </span>
          <div className="text-small text-text">
            <p>
              O ORBITA CHAT não cobra nada neste momento e não guarda dados de pagamento. Quando a
              faturação for ativada, a gestão de cartões e faturas será feita através do portal
              seguro do fornecedor de pagamentos — nunca diretamente nesta aplicação.
            </p>
            <p className="mt-2 text-caption text-muted">
              Variáveis <code className="font-mono">STRIPE_*</code> estão reservadas e não são lidas
              por nenhum código.
            </p>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Estado" description="Valores reais — nenhum é inventado.">
        <SettingRow label="Plano atual" value={<Unavailable label="Sem plano" />} />
        <SettingRow label="Método de pagamento" value={<Unavailable label="Nenhum" />} />
        <SettingRow label="Histórico de faturas" value={<Unavailable label="Sem faturas" />} />
        <SettingRow label="Dados de faturação" value={<Unavailable label="Não recolhidos" />} />
      </SettingsSection>

      <SettingsSection title="Operações" description="Disponíveis apenas com integração real.">
        <div className="space-y-2">
          <PendingNotice
            title="Alterar plano"
            requirement="catálogo de planos e checkout do fornecedor."
          />
          <PendingNotice
            title="Cancelar subscrição"
            requirement="subscrição ativa num fornecedor de pagamentos."
          />
          <PendingNotice
            title="Atualizar dados de faturação"
            requirement="portal do cliente do fornecedor."
          />
        </div>
        <p className="mt-4 text-caption text-muted">
          Consumo real do período:{' '}
          <Link href="/settings/usage" className="font-medium text-primary hover:underline">
            Utilização →
          </Link>
        </p>
      </SettingsSection>
    </>
  );
}
