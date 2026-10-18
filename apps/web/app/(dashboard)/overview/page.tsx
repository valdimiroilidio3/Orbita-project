import {
  Activity,
  ArrowRight,
  Bot,
  Clock,
  Database,
  Euro,
  PhoneCall,
  Plug,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';

import { AgentCard } from '@/components/agents/agent-card';
import { ActivityChart } from '@/components/dashboard/activity-chart';
import { DemoBanner } from '@/components/dashboard/demo-banner';
import { MetricCard } from '@/components/dashboard/metric-card';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { isSupabaseConfigured } from '@/lib/env';
import { demoAgents, demoCalls, demoMetrics } from '@/lib/demo-data';
import { CALL_STATUS_LABELS, formatDateTime, formatDuration } from '@orbita/shared';

export const metadata = {
  title: 'Overview',
};

export default function OverviewPage() {
  const supabaseConfigured = isSupabaseConfigured();
  const recentCalls = [...demoCalls]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Métricas iniciais, atividade recente e estado da plataforma."
      >
        <Button asChild>
          <Link href="/agents/new">
            <Bot className="h-4 w-4" aria-hidden />
            Criar agente
          </Link>
        </Button>
      </PageHeader>

      <DemoBanner />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Chamadas (7 dias)"
          value={String(demoMetrics.totalCalls)}
          icon={PhoneCall}
          trendPercent={demoMetrics.totalCallsTrend}
          hint="vs. período anterior"
          demo
        />
        <MetricCard
          label="Agentes ativos"
          value={String(demoMetrics.activeAgents)}
          icon={Bot}
          trendPercent={demoMetrics.activeAgentsTrend}
          hint="sem variação"
          demo
        />
        <MetricCard
          label="Duração média"
          value={formatDuration(demoMetrics.averageDurationSeconds)}
          icon={Clock}
          trendPercent={demoMetrics.averageDurationTrend}
          hint="vs. período anterior"
          demo
        />
        <MetricCard
          label="Custo estimado"
          value={new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(
            demoMetrics.estimatedSpendEur,
          )}
          icon={Euro}
          trendPercent={demoMetrics.estimatedSpendTrend}
          hint="vs. período anterior"
          demo
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4.5 w-4.5 text-primary" aria-hidden />
                  Atividade recente
                </CardTitle>
                <CardDescription>Chamadas por dia — série de demonstração.</CardDescription>
              </div>
              <Badge variant="accent">Demo</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ActivityChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4.5 w-4.5 text-primary" aria-hidden />
              Estado da plataforma
            </CardTitle>
            <CardDescription>Informação real de configuração, não demo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3.5 py-3">
              <span className="flex items-center gap-2 text-sm font-medium">
                <Database className="h-4 w-4 text-muted" aria-hidden />
                Base de dados (Supabase)
              </span>
              {supabaseConfigured ? (
                <Badge variant="success">Configurado</Badge>
              ) : (
                <Badge variant="warning">Não configurado</Badge>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3.5 py-3">
              <span className="flex items-center gap-2 text-sm font-medium">
                <Plug className="h-4 w-4 text-muted" aria-hidden />
                Integrações (voz, IA, billing)
              </span>
              <Badge variant="neutral">Nenhuma ativa</Badge>
            </div>
            <p className="text-xs leading-relaxed text-muted">
              {supabaseConfigured
                ? 'Credenciais Supabase detetadas no ambiente. Nenhuma integração externa foi testada neste sprint.'
                : 'Sem credenciais Supabase: a aplicação corre em modo de demonstração. Consulta o README para configurar.'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Últimas chamadas</CardTitle>
                <CardDescription>Registo de demonstração — sem chamadas reais.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/calls">
                  Ver todas
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {recentCalls.map((call) => (
              <div
                key={call.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {call.toNumber} <span className="text-muted">· {call.agentName}</span>
                  </p>
                  <p className="text-xs text-muted">
                    {formatDateTime(call.startedAt)} · {formatDuration(call.durationSeconds)}
                  </p>
                </div>
                <Badge variant="outline">{CALL_STATUS_LABELS[call.status]}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atalhos</CardTitle>
            <CardDescription>Ações para arrancar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <Button className="w-full justify-between" variant="secondary" asChild>
              <Link href="/agents/new">
                Criar o primeiro agente
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <Button className="w-full justify-between" variant="secondary" asChild>
              <Link href="/integrations">
                Ver integrações disponíveis
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <Button className="w-full justify-between" variant="secondary" asChild>
              <Link href="/settings">
                Configurar workspace
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Agentes</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/agents">
              Ver todos
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {demoAgents.slice(0, 3).map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>
    </div>
  );
}
