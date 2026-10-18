'use client';

import { SwitchRow } from '@/components/settings/organization-forms';
import { SettingsForm } from '@/components/settings/settings-form';
import {
  saveOrganizationNotificationsAction,
  saveUserNotificationsAction,
} from '@/lib/server/settings-actions';

export function UserNotificationsForm({
  values,
  readOnly,
}: {
  values: {
    notify_failed_calls: boolean;
    notify_activity_digest: boolean;
    notify_usage_reports: boolean;
    notify_integration_alerts: boolean;
    notify_platform_updates: boolean;
  };
  readOnly: boolean;
}) {
  return (
    <SettingsForm
      action={saveUserNotificationsAction}
      readOnly={readOnly}
      readOnlyReason="Supabase não configurado."
    >
      <div>
        <SwitchRow
          name="notify_failed_calls"
          label="Chamadas falhadas"
          hint="Alerta quando uma chamada termina em erro."
          defaultChecked={values.notify_failed_calls}
        />
        <SwitchRow
          name="notify_activity_digest"
          label="Resumo de atividade"
          hint="Síntese periódica das chamadas e ações dos agentes."
          defaultChecked={values.notify_activity_digest}
        />
        <SwitchRow
          name="notify_usage_reports"
          label="Relatórios de utilização"
          hint="Consumo do período e tendências."
          defaultChecked={values.notify_usage_reports}
        />
        <SwitchRow
          name="notify_integration_alerts"
          label="Integrações indisponíveis"
          hint="Quando uma integração deixa de responder."
          defaultChecked={values.notify_integration_alerts}
        />
        <SwitchRow
          name="notify_platform_updates"
          label="Atualizações importantes da plataforma"
          defaultChecked={values.notify_platform_updates}
        />
      </div>
    </SettingsForm>
  );
}

export function OrganizationNotificationsForm({
  values,
  canEdit,
}: {
  values: { notify_failed_calls: boolean; notify_integration_alerts: boolean };
  canEdit: boolean;
}) {
  return (
    <SettingsForm
      action={saveOrganizationNotificationsAction}
      readOnly={!canEdit}
      readOnlyReason="Apenas owners e admins editam as notificações da organização."
    >
      <div>
        <SwitchRow
          name="notify_failed_calls"
          label="Chamadas falhadas (toda a equipa)"
          hint="Política da organização; cada membro mantém a sua preferência pessoal."
          defaultChecked={values.notify_failed_calls}
        />
        <SwitchRow
          name="notify_integration_alerts"
          label="Integrações indisponíveis (owners e admins)"
          defaultChecked={values.notify_integration_alerts}
        />
      </div>
    </SettingsForm>
  );
}
