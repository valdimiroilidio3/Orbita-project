import { Settings } from 'lucide-react';

import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { VoiceDiagnosticsPanel } from '@/components/voice/voice-diagnostics';
import { isSupabaseConfigured } from '@/lib/env';

export const metadata = {
  title: 'Definições',
};

export default function SettingsPage() {
  const supabaseConfigured = isSupabaseConfigured();

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

      <EmptyState
        icon={Settings}
        title="Mais definições em breve"
        description="Gestão de membros, papéis (owner/admin/member), faturação e preferências de notificação serão adicionadas quando a autenticação e o backend estiverem ligados."
      />
    </div>
  );
}
