'use client';

import {
  Activity,
  ArrowRight,
  Bot,
  Clock,
  Database,
  Euro,
  type LucideIcon,
  PhoneCall,
  Plug,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

import { AgentCard } from '@/components/agents/agent-card';
import { ActivityChart } from '@/components/dashboard/activity-chart';
import { CallsTable } from '@/components/dashboard/calls-table';
import { DemoBanner } from '@/components/dashboard/demo-banner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { IconButton } from '@/components/ui/icon-button';
import { PageHeader } from '@/components/ui/page-header';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { useOverview } from '@/lib/dashboard/use-overview';
import type { OverviewMetric } from '@/lib/dashboard/types';
import { formatDateTime } from '@orbita/shared';

const DEFAULT_METRIC_ICON: Record<OverviewMetric['key'], LucideIcon> = {
  totalCalls: PhoneCall,
  activeAgents: Bot,
  averageDuration: Clock,
  estimatedSpend: Euro,
};

/**
 * Overview completo (Prompt 03) sobre o design system.
 *
 * Estados: loading (skeletons) · ready (demo identificado ou live real) ·
 * error (com retry e fallback explícito para demo).
 */
export function OverviewDashboard() {
  const { status, data, error, refresh, useDemoData, explicitDemo } = useOverview();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview"
        description={
          status === 'ready' && data
            ? `Dados ${data.source === 'demo' ? 'de demonstração' : 'reais'} · atualizado às ${formatDateTime(data.fetchedAt).split(', ')[1] ?? ''}`
            : 'Métricas, atividade recente e estado da plataforma.'
        }
      >
        <IconButton
          label="Atualizar dados"
          variant="outline"
          onClick={refresh}
          loading={status === 'loading'}
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
        </IconButton>
        <Button asChild>
          <Link href="/agents/new">
            <Bot className="h-4 w-4" aria-hidden />
            Criar agente
          </Link>
        </Button>
      </PageHeader>

      {status === 'loading' && !data ? <OverviewSkeleton /> : null}

      {status === 'error' ? (
        <ErrorState
          title="Não foi possível carregar o overview"
          description={error ?? 'Erro desconhecido ao carregar os dados.'}
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button onClick={refresh}>
                <RefreshCw className="h-4 w-4" aria-hidden />
                Tentar novamente
              </Button>
              <Button variant="outline" onClick={useDemoData}>
                <Sparkles className="h-4 w-4" aria-hidden />
                Ver dados de demonstração
              </Button>
            </div>
          }
        />
      ) : null}

      {status === 'ready' && data ? (
        <>
          {data.source === 'demo' ? (
            <DemoBanner />
          ) : (
            <p className="flex items-start gap-2 rounded-xl border border-success/40 bg-success-soft px-3.5 py-2.5 text-xs font-medium text-success-text">
              <Database className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                <strong>Dados reais (Supabase).</strong> Leitura protegida por RLS. Sem registos, os
                painéis mostram estados vazios — nunca dados inventados.
              </span>
            </p>
          )}
          {explicitDemo && data.source === 'demo' ? (
            <p className="text-caption text-muted">
              A fonte de demonstração foi ativada manualmente (fallback explícito após erro).
            </p>
          ) : null}

          {/* Métricas */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {data.metrics.map((metric) => (
              <StatCard
                key={metric.key}
                label={metric.label}
                value={metric.value}
                icon={DEFAULT_METRIC_ICON[metric.key]}
                trendPercent={metric.trendPercent ?? undefined}
                hint={metric.hint}
                badge={data.source === 'demo' ? <Badge variant="accent">Demo</Badge> : undefined}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Atividade */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-primary" aria-hidden />
                      Atividade recente
                    </CardTitle>
                    <CardDescription>
                      Chamadas por dia (últimos 7 dias)
                      {data.source === 'demo' ? ' — série de demonstração.' : '.'}
                    </CardDescription>
                  </div>
                  {data.source === 'demo' ? <Badge variant="accent">Demo</Badge> : null}
                </div>
              </CardHeader>
              <CardContent>
                {data.activity.length === 0 ? (
                  <EmptyState
                    icon={Activity}
                    title="Sem atividade no período"
                    description="Quando existirem chamadas nos últimos 7 dias, a série aparece aqui."
                    className="border-none bg-transparent py-8"
                  />
                ) : (
                  <ActivityChart data={data.activity} />
                )}
              </CardContent>
            </Card>

            {/* Estado da plataforma — informação real */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
                  Estado da plataforma
                </CardTitle>
                <CardDescription>Configuração real do ambiente, nunca demo.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5">
                <StatusRow
                  icon={<Database className="h-4 w-4 text-muted" aria-hidden />}
                  label="Base de dados (Supabase)"
                  badge={
                    data.platform.supabaseConfigured ? (
                      <Badge variant="success">Configurado</Badge>
                    ) : (
                      <Badge variant="warning">Não configurado</Badge>
                    )
                  }
                />
                <StatusRow
                  icon={<Plug className="h-4 w-4 text-muted" aria-hidden />}
                  label="Integrações (voz, IA, billing)"
                  badge={<Badge variant="neutral">Nenhuma ativa</Badge>}
                />
                <StatusRow
                  icon={<PhoneCall className="h-4 w-4 text-muted" aria-hidden />}
                  label="Fonte de dados do overview"
                  badge={
                    data.source === 'demo' ? (
                      <Badge variant="accent">Demonstração</Badge>
                    ) : (
                      <Badge variant="success">Live</Badge>
                    )
                  }
                />
                <p className="text-caption leading-relaxed text-muted">
                  {data.platform.supabaseConfigured
                    ? 'Credenciais Supabase detetadas. Nenhuma integração externa foi testada — a leitura respeita as políticas RLS.'
                    : 'Sem credenciais Supabase: o overview mostra dados de demonstração identificados. Consulta o README para configurar.'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Chamadas recentes */}
          <section className="space-y-4">
            <SectionHeader
              title="Chamadas recentes"
              description={
                data.source === 'demo'
                  ? 'Registo de demonstração — sem chamadas reais.'
                  : 'Últimos registos reais (RLS).'
              }
              actions={
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/calls">
                    Ver todas
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              }
            />
            <CallsTable
              calls={data.recentCalls}
              caption="Chamadas recentes"
              emptyAction={
                <Button variant="outline" asChild>
                  <Link href="/agents/new">Criar o primeiro agente</Link>
                </Button>
              }
            />
          </section>

          {/* Agentes */}
          <section className="space-y-4">
            <SectionHeader
              title="Agentes"
              description="Configuração atual dos agentes de voz."
              actions={
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/agents">
                    Ver todos
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              }
            />
            {data.agents.length === 0 ? (
              <EmptyState
                icon={Bot}
                title="Ainda sem agentes"
                description="Cria o teu primeiro agente para começar a configurar chamadas de voz com IA."
                action={
                  <Button asChild>
                    <Link href="/agents/new">
                      <Sparkles className="h-4 w-4" aria-hidden />
                      Criar primeiro agente
                    </Link>
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {data.agents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

function StatusRow({
  icon,
  label,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  badge: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3.5 py-3">
      <span className="flex items-center gap-2 text-small font-medium">
        {icon}
        {label}
      </span>
      {badge}
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-8" aria-hidden>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
