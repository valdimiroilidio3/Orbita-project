import { Settings } from 'lucide-react';

import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  BusinessProfileForm,
  type BusinessProfileValues,
} from '@/components/tools/business-profile-form';
import { VoiceDiagnosticsPanel } from '@/components/voice/voice-diagnostics';
import { isSupabaseConfigured } from '@/lib/env';
import { getBusinessProfile } from '@/lib/server/tools';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Definições',
};

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

export default async function SettingsPage() {
  const supabaseConfigured = isSupabaseConfigured();
  const stored = supabaseConfigured ? await getBusinessProfile() : null;

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
    <div className="space-y-6">
      <PageHeader
        title="Definições"
        description="Configuração do workspace, equipa e preferências."
      >
        <Badge variant="outline">Parcialmente disponível</Badge>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
          <CardDescription>Dados de demonstração do workspace atual.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-3.5 py-3">
            <span className="font-medium">Nome do workspace</span>
            <span className="flex items-center gap-2 text-muted">
              ORBITA Demo <Badge variant="accent">Demo</Badge>
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-3.5 py-3">
            <span className="font-medium">Supabase</span>
            {supabaseConfigured ? (
              <Badge variant="success">Configurado</Badge>
            ) : (
              <Badge variant="warning">Não configurado</Badge>
            )}
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-3.5 py-3">
            <span className="font-medium">Membros e permissões</span>
            <Badge variant="neutral">Planeado</Badge>
          </div>
        </CardContent>
      </Card>

      <VoiceDiagnosticsPanel />

      <Card>
        <CardHeader>
          <CardTitle>Perfil público da empresa</CardTitle>
          <CardDescription>
            Dados autorizados consultados pelas ferramentas do agente (informação, disponibilidade e
            marcações). Apenas owners e admins podem editar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {supabaseConfigured ? (
            <BusinessProfileForm values={profile} />
          ) : (
            <p className="text-caption text-muted">
              Supabase não configurado — perfil indisponível.
            </p>
          )}
        </CardContent>
      </Card>

      <EmptyState
        icon={Settings}
        title="Mais definições em breve"
        description="Gestão de membros, papéis (owner/admin/member), faturação e preferências de notificação serão adicionadas quando a autenticação e o backend estiverem ligados."
      />
    </div>
  );
}
