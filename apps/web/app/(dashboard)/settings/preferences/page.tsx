import { formatDateTime } from '@orbita/shared';

import { UserPreferencesForm } from '@/components/settings/organization-forms';
import { PendingNotice, SettingsSection } from '@/components/settings/settings-section';
import { Badge } from '@/components/ui/badge';
import { isSupabaseConfigured } from '@/lib/env';
import { getUserPreferences } from '@/lib/server/settings';
import { getBusinessProfile } from '@/lib/server/tools';

export const metadata = { title: 'Preferências · Definições' };

export default async function PreferencesSettingsPage() {
  const configured = isSupabaseConfigured();
  const [prefs, business] = configured
    ? await Promise.all([getUserPreferences(), getBusinessProfile()])
    : [await getUserPreferences(), null];

  return (
    <>
      <SettingsSection
        title="Preferências pessoais"
        description="Aplicam-se apenas à tua conta, em todas as organizações. Não alteram regras de negócio."
        badge={
          prefs.persisted ? (
            <Badge variant="success">
              Guardadas {prefs.updatedAt ? `· ${formatDateTime(prefs.updatedAt)}` : ''}
            </Badge>
          ) : (
            <Badge variant="neutral">Valores por defeito</Badge>
          )
        }
      >
        <UserPreferencesForm
          values={{
            locale: prefs.locale,
            timezone: prefs.timezone,
            theme: prefs.theme,
            date_format: prefs.date_format,
            time_format: prefs.time_format,
          }}
          readOnly={!configured}
        />
      </SettingsSection>

      <SettingsSection
        title="Fuso horário das operações"
        description="Chamadas, disponibilidade e marcações usam SEMPRE o fuso horário da organização (perfil comercial), não o pessoal."
      >
        <p className="text-small text-text">
          Fuso da organização:{' '}
          <code className="rounded bg-surface px-1.5 py-0.5 text-caption">
            {business?.timezone ?? 'Europe/Lisbon (por defeito)'}
          </code>
        </p>
        <p className="mt-1 text-caption text-muted">
          Alterável em Definições → Organização → Perfil comercial (owners e admins).
        </p>
      </SettingsSection>

      <SettingsSection
        title="Em preparação"
        description="Preferências que ainda não têm efeito na interface."
      >
        <div className="space-y-2">
          <PendingNotice
            title="Tema escuro"
            requirement="tokens de cor para dark mode no design system; a preferência já é guardada."
          />
          <PendingNotice
            title="Interface em inglês"
            requirement="ficheiros de tradução; a preferência já é guardada."
          />
        </div>
      </SettingsSection>
    </>
  );
}
