import { formatDateTime } from '@orbita/shared';

import { ChangePasswordForm, CriticalActions } from '@/components/settings/security-forms';
import {
  PendingNotice,
  SettingRow,
  SettingsSection,
  Unavailable,
} from '@/components/settings/settings-section';
import { Badge } from '@/components/ui/badge';
import { isSupabaseConfigured } from '@/lib/env';
import { getProfile } from '@/lib/server/settings';

export const metadata = { title: 'Segurança · Definições' };

export default async function SecuritySettingsPage() {
  const configured = isSupabaseConfigured();
  const profile = await getProfile();
  const passwordProvider = profile?.provider === 'email';

  const warnings: string[] = [];
  if (profile && !profile.emailConfirmedAt)
    warnings.push('O email da conta ainda não foi verificado.');
  if (profile?.pendingEmail)
    warnings.push(`Alteração de email pendente para ${profile.pendingEmail}.`);
  warnings.push('Autenticação multifator não está disponível nesta versão.');

  return (
    <>
      <SettingsSection
        title="Estado da conta"
        description="Informação real do fornecedor de autenticação (Supabase Auth)."
      >
        <SettingRow
          label="Verificação do email"
          value={
            !profile ? (
              <Unavailable />
            ) : profile.emailConfirmedAt ? (
              <Badge variant="success">
                Verificado · {formatDateTime(profile.emailConfirmedAt)}
              </Badge>
            ) : (
              <Badge variant="warning">Por verificar</Badge>
            )
          }
        />
        <SettingRow
          label="Autenticação multifator (MFA)"
          value={<Badge variant="neutral">Não disponível</Badge>}
          hint="Não simulamos MFA. Requer ativação no projeto Supabase e fluxo de inscrição/verificação na aplicação."
        />
        <SettingRow
          label="Sessões ativas"
          value={<Badge variant="neutral">Listagem indisponível</Badge>}
          hint="O Supabase Auth não expõe a lista de sessões ao cliente. Podes revogar todas abaixo."
        />
        <SettingRow
          label="Último início de sessão"
          value={profile?.lastSignInAt ? formatDateTime(profile.lastSignInAt) : <Unavailable />}
        />
      </SettingsSection>

      <SettingsSection
        title="Palavra-passe"
        description={
          passwordProvider || !profile
            ? 'Define uma nova palavra-passe para a tua conta.'
            : `A tua conta autentica-se via ${profile.provider}; a palavra-passe é gerida nesse fornecedor.`
        }
      >
        {passwordProvider || !profile ? (
          <ChangePasswordForm readOnly={!configured || !profile} />
        ) : (
          <PendingNotice
            title="Alteração de palavra-passe não aplicável"
            requirement="conta com fornecedor de email/palavra-passe."
          />
        )}
      </SettingsSection>

      <SettingsSection title="Avisos de segurança" description="Pontos que merecem atenção.">
        <ul className="space-y-2">
          {warnings.map((warning) => (
            <li key={warning} className="flex items-start gap-2 text-small text-text">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" aria-hidden />
              {warning}
            </li>
          ))}
        </ul>
      </SettingsSection>

      <SettingsSection
        title="Ações críticas"
        description="Exigem confirmação explícita e são validadas no servidor."
        badge={<Badge variant="danger">Zona crítica</Badge>}
      >
        <CriticalActions configured={configured && Boolean(profile)} />
        <div className="mt-4 space-y-2">
          <PendingNotice
            title="Eliminar conta"
            requirement="procedimento de eliminação com verificação de propriedade de organizações e período de carência — não implementado; pedidos via suporte."
          />
          <PendingNotice
            title="Encerrar organização"
            requirement="a política RLS permite DELETE ao owner, mas o histórico de chamadas é imutável por desenho; o fluxo de encerramento (exportação + confirmação dupla) não está implementado."
          />
        </div>
      </SettingsSection>
    </>
  );
}
