import { Mic } from 'lucide-react';
import Link from 'next/link';

import { formatDateTime } from '@orbita/shared';

import { OrganizationVoiceForm } from '@/components/settings/organization-forms';
import {
  PendingNotice,
  SettingRow,
  SettingsSection,
  Unavailable,
} from '@/components/settings/settings-section';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { VoiceDiagnosticsPanel } from '@/components/voice/voice-diagnostics';
import { isSupabaseConfigured } from '@/lib/env';
import { INTEGRATION_STATE_LABELS, buildIntegrationStatuses } from '@/lib/integrations/status';
import { getActiveOrganization } from '@/lib/server/organizations';
import { getOrganizationSettings } from '@/lib/server/settings';

export const metadata = { title: 'Voz e agentes · Definições' };

export default async function VoiceSettingsPage() {
  const integrations = buildIntegrationStatuses();
  const telephony = integrations.find((i) => i.id === 'telephony');
  const voiceAi = integrations.find((i) => i.id === 'voice_ai');

  if (!isSupabaseConfigured()) {
    return (
      <>
        <EmptyState
          icon={Mic}
          title="Definições de voz indisponíveis"
          description="Supabase não configurado — não há organização onde guardar as definições globais."
        />
        <VoiceDiagnosticsPanel />
      </>
    );
  }

  const organization = await getActiveOrganization();
  if (!organization) {
    return (
      <EmptyState icon={Mic} title="Sem organização ativa" description="Conclui o onboarding." />
    );
  }
  const settings = await getOrganizationSettings(organization.id);
  const canEdit = organization.role === 'owner' || organization.role === 'admin';

  return (
    <>
      <SettingsSection
        title="Fornecedores"
        description="Estado real. Sem fornecedor ativo não há chamadas reais, voz IA nem gravações."
      >
        <SettingRow
          label="Telefonia"
          value={
            telephony ? (
              <Badge variant={telephony.state === 'available' ? 'success' : 'neutral'}>
                {INTEGRATION_STATE_LABELS[telephony.state]}
              </Badge>
            ) : (
              <Unavailable />
            )
          }
          hint={telephony?.detail}
        />
        <SettingRow
          label="Voz IA (tempo real)"
          value={
            voiceAi ? (
              <Badge variant={voiceAi.state === 'available' ? 'success' : 'neutral'}>
                {INTEGRATION_STATE_LABELS[voiceAi.state]}
              </Badge>
            ) : (
              <Unavailable />
            )
          }
          hint={voiceAi?.detail}
        />
        <SettingRow
          label="Voz predefinida"
          value={<Unavailable label="Depende do fornecedor" />}
          hint="O catálogo de vozes só pode ser listado com um fornecedor de voz ativo; não inventamos opções."
        />
      </SettingsSection>

      <SettingsSection
        title="Defaults globais da organização"
        description="Aplicam-se quando um agente não define valor próprio. Nunca substituem silenciosamente as definições personalizadas de cada agente."
        badge={
          settings.persisted ? (
            <Badge variant="success">
              Guardadas {settings.updatedAt ? `· ${formatDateTime(settings.updatedAt)}` : ''}
            </Badge>
          ) : (
            <Badge variant="neutral">Valores por defeito</Badge>
          )
        }
      >
        <OrganizationVoiceForm
          values={{
            default_language: settings.default_language,
            max_call_duration_seconds: settings.max_call_duration_seconds,
            recording_enabled: settings.recording_enabled,
            retention_days: settings.retention_days,
          }}
          canEdit={canEdit}
        />
        <p className="mt-4 text-caption text-muted">
          Definições por agente (idioma, instruções, voz):{' '}
          <Link href="/agents" className="font-medium text-primary hover:underline">
            Agent Studio →
          </Link>
        </p>
      </SettingsSection>

      <SettingsSection title="Política de gravação e retenção" description="Como é aplicada.">
        <div className="space-y-2">
          <PendingNotice
            title="Gravação efetiva de áudio"
            requirement="fornecedor de voz com suporte a gravação e armazenamento configurado. A opção acima regista apenas a POLÍTICA da organização; nenhuma gravação ocorre sem fornecedor."
          />
          <PendingNotice
            title="Aplicação automática da retenção"
            requirement="tarefa agendada de limpeza — não implementada."
          />
        </div>
      </SettingsSection>

      <VoiceDiagnosticsPanel />
    </>
  );
}
