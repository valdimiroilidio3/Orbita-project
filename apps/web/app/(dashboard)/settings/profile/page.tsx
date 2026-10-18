import Link from 'next/link';

import { formatDateTime } from '@orbita/shared';

import { ProfileEmailForm, ProfileNameForm } from '@/components/settings/profile-forms';
import {
  PendingNotice,
  SettingRow,
  SettingsSection,
  Unavailable,
} from '@/components/settings/settings-section';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { isSupabaseConfigured } from '@/lib/env';
import { getProfile } from '@/lib/server/settings';

export const metadata = { title: 'Perfil · Definições' };

function initialsOf(value: string): string {
  return value
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default async function ProfileSettingsPage() {
  const configured = isSupabaseConfigured();
  const profile = await getProfile();
  const readOnly = !configured || !profile;

  return (
    <>
      <SettingsSection
        title="Perfil pessoal"
        description="Dados da tua conta. Idioma, fuso horário e formatos estão em Preferências."
      >
        <div className="mb-4 flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback>{initialsOf(profile?.name ?? profile?.email ?? '?')}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-small font-medium text-text">
              {profile?.name ?? profile?.email ?? 'Sem sessão'}
            </p>
            <p className="text-caption text-muted">
              Avatar gerado a partir das iniciais — carregamento de imagem não disponível (sem
              storage configurado).
            </p>
          </div>
        </div>
        <ProfileNameForm name={profile?.name ?? ''} readOnly={readOnly} />
      </SettingsSection>

      <SettingsSection
        title="Email da conta"
        description="A alteração de email passa por confirmação do fornecedor de autenticação; não é uma edição direta."
        badge={
          profile?.pendingEmail ? (
            <Badge variant="warning">Confirmação pendente: {profile.pendingEmail}</Badge>
          ) : profile?.emailConfirmedAt ? (
            <Badge variant="success">Verificado</Badge>
          ) : profile ? (
            <Badge variant="warning">Por verificar</Badge>
          ) : null
        }
      >
        <ProfileEmailForm currentEmail={profile?.email ?? '—'} readOnly={readOnly} />
      </SettingsSection>

      <SettingsSection title="Conta" description="Informação só de leitura.">
        <SettingRow
          label="Identificador"
          value={profile ? <code className="text-caption">{profile.id}</code> : <Unavailable />}
          hint="Útil para pedidos de suporte."
        />
        <SettingRow
          label="Fornecedor de autenticação"
          value={profile?.provider ?? <Unavailable />}
        />
        <SettingRow
          label="Conta criada"
          value={profile?.createdAt ? formatDateTime(profile.createdAt) : <Unavailable />}
        />
        <SettingRow
          label="Último início de sessão"
          value={profile?.lastSignInAt ? formatDateTime(profile.lastSignInAt) : <Unavailable />}
        />
        <div className="pt-3">
          <PendingNotice
            title="Preferências pessoais (idioma, fuso horário, tema)"
            requirement="disponíveis em Preferências"
          />
          <p className="mt-2 text-caption text-muted">
            <Link href="/settings/preferences" className="font-medium text-primary hover:underline">
              Ir para Preferências →
            </Link>
          </p>
        </div>
      </SettingsSection>
    </>
  );
}
