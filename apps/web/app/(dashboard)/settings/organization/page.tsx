import { ROLE_LABELS, formatDateTime } from '@orbita/shared';

import { OrganizationGeneralForm } from '@/components/settings/organization-forms';
import { SettingRow, SettingsSection, Unavailable } from '@/components/settings/settings-section';
import {
  BusinessProfileForm,
  type BusinessProfileValues,
} from '@/components/tools/business-profile-form';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { isSupabaseConfigured } from '@/lib/env';
import { getOrganizationDetails, getOrganizationSettings } from '@/lib/server/settings';
import { getBusinessProfile } from '@/lib/server/tools';
import { Building2 } from 'lucide-react';

export const metadata = { title: 'Organização · Definições' };

const EMPTY_PROFILE: BusinessProfileValues = {
  displayName: '',
  timezone: 'Europe/Lisbon',
  address: '',
  phone: '',
  email: '',
  prices: '',
  faq: '',
  policies: '',
  hoursText: '',
  servicesText: '',
};

export default async function OrganizationSettingsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <EmptyState
        icon={Building2}
        title="Organização indisponível"
        description="Supabase não configurado — não há organização real para apresentar nem editar."
      />
    );
  }

  const organization = await getOrganizationDetails();
  if (!organization) {
    return (
      <EmptyState
        icon={Building2}
        title="Sem organização ativa"
        description="Conclui o onboarding."
      />
    );
  }

  const [settings, stored] = await Promise.all([
    getOrganizationSettings(organization.id),
    getBusinessProfile(),
  ]);
  const canEdit = organization.role === 'owner' || organization.role === 'admin';
  const profile: BusinessProfileValues = stored
    ? {
        displayName: stored.display_name ?? '',
        timezone: stored.timezone ?? 'Europe/Lisbon',
        address: stored.address ?? '',
        phone: stored.phone ?? '',
        email: stored.email ?? '',
        prices: stored.prices ?? '',
        faq: stored.faq ?? '',
        policies: stored.policies ?? '',
        hoursText: stored.hours_text ?? '',
        servicesText: stored.services_text ?? '',
      }
    : EMPTY_PROFILE;

  return (
    <>
      <SettingsSection
        title="Dados gerais"
        description="Nome interno, website e país. Guardado na organização e nas suas definições."
        badge={<Badge variant="outline">O teu papel: {ROLE_LABELS[organization.role]}</Badge>}
      >
        <OrganizationGeneralForm
          values={{
            name: organization.name,
            website: settings.website ?? '',
            country: settings.country ?? '',
          }}
          canEdit={canEdit}
        />
      </SettingsSection>

      <SettingsSection
        title="Perfil comercial"
        description="Nome comercial, fuso horário da organização, contactos, horário e serviços — a fonte usada pelos agentes e ferramentas (informação, disponibilidade, marcações)."
      >
        {canEdit ? (
          <BusinessProfileForm values={profile} />
        ) : (
          <div className="space-y-0">
            <SettingRow
              label="Nome comercial"
              value={profile.displayName || <Unavailable label="Não definido" />}
            />
            <SettingRow label="Fuso horário" value={profile.timezone} />
            <SettingRow
              label="Telefone público"
              value={profile.phone || <Unavailable label="Não definido" />}
            />
            <SettingRow
              label="Email público"
              value={profile.email || <Unavailable label="Não definido" />}
            />
            <p className="pt-3 text-caption text-muted">
              Apenas owners e admins editam o perfil comercial.
            </p>
          </div>
        )}
      </SettingsSection>

      <SettingsSection title="Informação" description="Só de leitura; útil para suporte.">
        <SettingRow
          label="Identificador"
          value={<code className="text-caption">{organization.id}</code>}
        />
        <SettingRow
          label="Slug"
          value={<code className="text-caption">{organization.slug}</code>}
        />
        <SettingRow
          label="Criada em"
          value={organization.createdAt ? formatDateTime(organization.createdAt) : <Unavailable />}
        />
        <SettingRow
          label="Definições atualizadas"
          value={
            settings.updatedAt ? (
              formatDateTime(settings.updatedAt)
            ) : (
              <Unavailable label="Sem registo" />
            )
          }
        />
      </SettingsSection>
    </>
  );
}
