import {
  OrganizationNotificationsForm,
  UserNotificationsForm,
} from '@/components/settings/notification-forms';
import { PendingNotice, SettingsSection } from '@/components/settings/settings-section';
import { Badge } from '@/components/ui/badge';
import { isSupabaseConfigured } from '@/lib/env';
import { getActiveOrganization } from '@/lib/server/organizations';
import { getOrganizationSettings, getUserPreferences } from '@/lib/server/settings';

export const metadata = { title: 'Notificações · Definições' };

export default async function NotificationsSettingsPage() {
  const configured = isSupabaseConfigured();
  const prefs = await getUserPreferences();
  const organization = configured ? await getActiveOrganization() : null;
  const orgSettings = organization ? await getOrganizationSettings(organization.id) : null;
  const canEdit = organization?.role === 'owner' || organization?.role === 'admin';

  return (
    <>
      <div className="rounded-xl border border-border bg-surface px-4 py-3 text-caption text-muted">
        As preferências são <strong>guardadas</strong> na base de dados. O <strong>envio</strong>{' '}
        por email depende de uma integração de email que ainda não está configurada — nenhuma
        notificação é enviada por enquanto. Não existem notificações dentro da aplicação nesta
        versão.
      </div>

      <SettingsSection
        title="As minhas notificações por email"
        description="Preferências pessoais — aplicam-se só a ti."
        badge={<Badge variant="neutral">Envio pendente de integração</Badge>}
      >
        <UserNotificationsForm
          values={{
            notify_failed_calls: prefs.notify_failed_calls,
            notify_activity_digest: prefs.notify_activity_digest,
            notify_usage_reports: prefs.notify_usage_reports,
            notify_integration_alerts: prefs.notify_integration_alerts,
            notify_platform_updates: prefs.notify_platform_updates,
          }}
          readOnly={!configured}
        />
      </SettingsSection>

      <SettingsSection
        title="Notificações da organização"
        description="Políticas globais definidas por owners e admins."
      >
        {organization && orgSettings ? (
          <OrganizationNotificationsForm
            values={{
              notify_failed_calls: orgSettings.notify_failed_calls,
              notify_integration_alerts: orgSettings.notify_integration_alerts,
            }}
            canEdit={Boolean(canEdit)}
          />
        ) : (
          <PendingNotice
            title="Sem organização ativa"
            requirement="Supabase configurado e onboarding concluído."
          />
        )}
      </SettingsSection>

      <SettingsSection title="Canais" description="Estado real dos canais de entrega.">
        <div className="space-y-2">
          <PendingNotice
            title="Email"
            requirement="fornecedor de envio (ex.: SMTP/Resend) e templates — não configurado."
          />
          <PendingNotice
            title="Notificações na aplicação"
            requirement="tabela de notificações e centro de notificações — não implementado."
          />
        </div>
      </SettingsSection>
    </>
  );
}
