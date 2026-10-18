import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { INTEGRATION_STATE_LABELS } from '@/lib/integrations/status';
import { ROLE_LABELS, formatDateTime } from '@orbita/shared';

import { SETTINGS_NAV } from '@/components/settings/settings-nav';
import { SettingRow, SettingsSection, Unavailable } from '@/components/settings/settings-section';
import { Badge } from '@/components/ui/badge';
import { isSupabaseConfigured } from '@/lib/env';
import { getProfile, getSettingsOverview } from '@/lib/server/settings';

export const metadata = { title: 'Definições' };

const QUICK_ACCESS = new Set([
  '/settings/profile',
  '/settings/organization',
  '/settings/members',
  '/settings/security',
  '/settings/notifications',
  '/settings/integrations',
]);

export default async function SettingsOverviewPage() {
  const configured = isSupabaseConfigured();
  const [overview, profile] = await Promise.all([getSettingsOverview(), getProfile()]);

  const integrationsAvailable = overview.integrations.filter((i) => i.state === 'available').length;
  const integrationsTotal = overview.integrations.length;
  const latestUpdate = [overview.organizationSettingsUpdatedAt, overview.preferencesUpdatedAt]
    .filter((v): v is string => Boolean(v))
    .sort()
    .at(-1);

  return (
    <>
      {!configured ? (
        <div className="rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-caption text-warning-text">
          Supabase não configurado — as definições são apresentadas sem dados de conta e não podem
          ser guardadas.
        </div>
      ) : null}

      <SettingsSection
        title="Visão geral"
        description="Indicadores derivados de dados reais. Sem dados, mostramos «Indisponível»."
        badge={
          overview.organization ? (
            <Badge variant="outline">{ROLE_LABELS[overview.organization.role]}</Badge>
          ) : null
        }
      >
        <SettingRow
          label="Organização"
          value={overview.organization ? overview.organization.name : <Unavailable />}
        />
        <SettingRow label="Plano" value={<Unavailable label="Faturação não configurada" />} />
        <SettingRow
          label="Membros"
          value={overview.memberCount === null ? <Unavailable /> : overview.memberCount}
        />
        <SettingRow
          label="Agentes"
          value={
            overview.agentCount === null ? (
              <Unavailable />
            ) : (
              <span>
                {overview.agentCount} configurados
                {overview.activeAgentCount !== null ? ` · ${overview.activeAgentCount} ativos` : ''}
              </span>
            )
          }
        />
        <SettingRow
          label="Integrações"
          value={
            <span className="inline-flex flex-wrap items-center gap-1.5">
              <Badge variant={integrationsAvailable > 0 ? 'success' : 'neutral'}>
                {integrationsAvailable}/{integrationsTotal} disponíveis
              </Badge>
            </span>
          }
          hint={overview.integrations
            .map((i) => `${i.name}: ${INTEGRATION_STATE_LABELS[i.state]}`)
            .join(' · ')}
        />
        <SettingRow
          label="Segurança da conta"
          value={
            overview.emailVerified === null ? (
              <Unavailable />
            ) : overview.emailVerified ? (
              <Badge variant="success">Email verificado</Badge>
            ) : (
              <Badge variant="warning">Email por verificar</Badge>
            )
          }
          hint={
            profile?.provider ? `Autenticação: ${profile.provider} · MFA não disponível` : undefined
          }
        />
        <SettingRow
          label="Última atualização das definições"
          value={latestUpdate ? formatDateTime(latestUpdate) : <Unavailable label="Sem registo" />}
        />
      </SettingsSection>

      <SettingsSection title="Acesso rápido" description="Secções mais usadas.">
        <ul className="grid gap-2 sm:grid-cols-2">
          {SETTINGS_NAV.filter((item) => QUICK_ACCESS.has(item.href)).map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="group flex items-center gap-3 rounded-xl border border-border bg-white px-3.5 py-3 transition-colors duration-fast hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-soft-blue text-primary">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-small font-medium text-text">{item.label}</span>
                    <span className="block truncate text-caption text-muted">
                      {item.description}
                    </span>
                  </span>
                  <ArrowRight
                    className="h-4 w-4 text-muted transition-transform duration-fast group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </SettingsSection>
    </>
  );
}
