/**
 * Serviço de dados do Overview (Prompt 03).
 *
 * Regras de produto:
 * - Nunca apresentar dados fictícios como reais: cada resposta declara `source`
 *   e cada registo declara `isDemo`.
 * - Sem Supabase configurado → dados de demonstração (identificados).
 * - Com Supabase configurado → leitura real (`live`); erros NÃO caem em demo
 *   em silêncio: são propagados para o estado de erro da UI.
 * - O fallback para demo é sempre uma ação explícita do utilizador.
 */

import {
  formatCurrency,
  formatDuration,
  formatInteger,
  type AgentStatus,
  type CallDirection,
  type CallStatus,
} from '@orbita/shared';

import { isSupabaseConfigured } from '@/lib/env';
import { demoAgents, demoCalls, demoMetrics } from '@/lib/demo-data';
import type {
  ActivityPoint,
  AgentSummary,
  CallRecord,
  OverviewData,
  OverviewMetric,
  PlatformStatus,
} from '@/lib/dashboard/types';

/** Latência simulada do modo demo, para exercitar o estado de carregamento. */
export const DEMO_LATENCY_MS = 300;

export function buildPlatformStatus(): PlatformStatus {
  return {
    supabaseConfigured: isSupabaseConfigured(),
    voiceIntegration: false,
    aiIntegration: false,
    billingIntegration: false,
  };
}

/** Linha de chamada vinda do Supabase (snake_case; `numeric` pode vir como string). */
export interface LiveCallRow {
  id: string;
  direction: CallDirection;
  status: CallStatus;
  to_number?: string | null;
  from_number?: string | null;
  duration_seconds?: number | null;
  estimated_cost?: string | number | null;
  currency?: string | null;
  started_at?: string | null;
  created_at?: string;
  agent_name?: string | null;
}

function toCallRecord(raw: LiveCallRow): CallRecord {
  return {
    id: raw.id,
    direction: raw.direction,
    status: raw.status,
    toNumber: raw.to_number ?? null,
    fromNumber: raw.from_number ?? null,
    agentName: raw.agent_name ?? null,
    durationSeconds: raw.duration_seconds ?? null,
    estimatedCost: raw.estimated_cost != null ? Number(raw.estimated_cost) : null,
    currency: raw.currency ?? 'EUR',
    startedAt: raw.started_at ?? null,
    createdAt: raw.created_at ?? '',
    isDemo: false,
  };
}

/** Mapeia linhas reais (snake_case do Postgres) para o formato do dashboard. */
export function buildLiveOverview(input: {
  calls: LiveCallRow[];
  agents: Array<{
    id: string;
    name: string;
    description?: string | null;
    language?: string | null;
    status: AgentStatus;
  }>;
  totalCalls: number;
  activeAgents: number;
  activity: ActivityPoint[];
}): OverviewData {
  const recentCalls = input.calls.slice(0, 5).map(toCallRecord);
  const agents: AgentSummary[] = input.agents.slice(0, 6).map((agent) => ({
    id: agent.id,
    name: agent.name,
    description: agent.description ?? null,
    language: agent.language ?? 'pt-PT',
    status: agent.status,
    isDemo: false,
  }));

  const durations = recentCalls
    .map((call) => call.durationSeconds)
    .filter((v): v is number => v != null);
  const averageDuration =
    durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  const spend = recentCalls.reduce((sum, call) => sum + (call.estimatedCost ?? 0), 0);

  const metrics: OverviewMetric[] = [
    {
      key: 'totalCalls',
      label: 'Chamadas (7 dias)',
      value: formatInteger(input.totalCalls),
      trendPercent: null,
      hint: 'período atual',
    },
    {
      key: 'activeAgents',
      label: 'Agentes ativos',
      value: formatInteger(input.activeAgents),
      trendPercent: null,
      hint: 'estado ativo',
    },
    {
      key: 'averageDuration',
      label: 'Duração média',
      value: durations.length > 0 ? formatDuration(averageDuration) : '—',
      trendPercent: null,
      hint: 'amostra recente',
    },
    {
      key: 'estimatedSpend',
      label: 'Custo estimado',
      value: spend > 0 ? formatCurrency(spend) : '—',
      trendPercent: null,
      hint: 'registos recentes',
    },
  ];

  return {
    source: 'live',
    fetchedAt: new Date().toISOString(),
    metrics,
    activity: input.activity,
    recentCalls,
    agents,
    totalCalls: input.totalCalls,
    platform: buildPlatformStatus(),
  };
}

/** Dados de demonstração — sempre com `source: 'demo'` e `isDemo: true`. */
export function buildDemoOverview(): OverviewData {
  const recentCalls: CallRecord[] = [...demoCalls]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)
    .map((call) => ({
      id: call.id,
      direction: call.direction,
      status: call.status,
      toNumber: call.toNumber,
      fromNumber: call.fromNumber,
      agentName: call.agentName,
      durationSeconds: call.durationSeconds,
      estimatedCost: call.estimatedCost,
      currency: call.currency,
      startedAt: call.startedAt,
      createdAt: call.createdAt,
      isDemo: true,
    }));

  const agents: AgentSummary[] = demoAgents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    description: agent.description,
    language: agent.language,
    status: agent.status,
    isDemo: true,
  }));

  const metrics: OverviewMetric[] = [
    {
      key: 'totalCalls',
      label: 'Chamadas (7 dias)',
      value: formatInteger(demoMetrics.totalCalls),
      trendPercent: demoMetrics.totalCallsTrend,
      hint: 'vs. período anterior',
    },
    {
      key: 'activeAgents',
      label: 'Agentes ativos',
      value: formatInteger(demoMetrics.activeAgents),
      trendPercent: demoMetrics.activeAgentsTrend,
      hint: 'sem variação',
    },
    {
      key: 'averageDuration',
      label: 'Duração média',
      value: formatDuration(demoMetrics.averageDurationSeconds),
      trendPercent: demoMetrics.averageDurationTrend,
      hint: 'vs. período anterior',
    },
    {
      key: 'estimatedSpend',
      label: 'Custo estimado',
      value: formatCurrency(demoMetrics.estimatedSpendEur),
      trendPercent: demoMetrics.estimatedSpendTrend,
      hint: 'vs. período anterior',
    },
  ];

  return {
    source: 'demo',
    fetchedAt: new Date().toISOString(),
    metrics,
    activity: [...demoMetrics.activitySeries],
    recentCalls,
    agents,
    totalCalls: demoMetrics.totalCalls,
    platform: buildPlatformStatus(),
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Consulta real ao Supabase (RLS). Lança erro — sem fallback silencioso. */
async function fetchLiveOverview(): Promise<OverviewData> {
  const { createSupabaseBrowserClient } = await import('@/lib/supabase/client');
  const supabase = createSupabaseBrowserClient();

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [callsRes, agentsRes, activityRes] = await Promise.all([
    supabase
      .from('calls')
      .select(
        'id, direction, status, to_number, from_number, duration_seconds, estimated_cost, currency, started_at, created_at, agents(name)',
      )
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('agents')
      .select('id, name, description, language, status')
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('calls')
      .select('started_at', { count: 'exact', head: false })
      .gte('started_at', since),
  ]);

  const firstError = callsRes.error ?? agentsRes.error ?? activityRes.error;
  if (firstError) {
    throw new Error(`Não foi possível carregar os dados reais: ${firstError.message}`);
  }

  const calls: LiveCallRow[] = (callsRes.data ?? []).map((row) => {
    const relationRaw = row.agents as { name: string | null } | { name: string | null }[] | null;
    const relation = Array.isArray(relationRaw) ? (relationRaw[0] ?? null) : relationRaw;
    return {
      id: row.id,
      direction: row.direction,
      status: row.status,
      to_number: row.to_number ?? null,
      from_number: row.from_number ?? null,
      duration_seconds: row.duration_seconds ?? null,
      estimated_cost: row.estimated_cost == null ? null : Number(row.estimated_cost),
      currency: row.currency ?? 'EUR',
      started_at: row.started_at ?? null,
      created_at: row.created_at ?? '',
      agent_name: relation?.name ?? null,
    };
  });

  // Série de atividade agrupada por dia (últimos 7 dias) a partir de `started_at`.
  const byDay = new Map<string, number>();
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(Date.now() - offset * 24 * 60 * 60 * 1000);
    byDay.set(date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }), 0);
  }
  for (const row of activityRes.data ?? []) {
    if (!row.started_at) continue;
    const label = new Date(row.started_at).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
    });
    if (byDay.has(label)) byDay.set(label, (byDay.get(label) ?? 0) + 1);
  }
  const activity: ActivityPoint[] = [...byDay.entries()].map(([day, callCount]) => ({
    day,
    calls: callCount,
  }));

  const agents = (agentsRes.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    language: row.language ?? 'pt-PT',
    status: row.status as AgentStatus,
  }));

  return buildLiveOverview({
    calls,
    agents,
    totalCalls: activityRes.count ?? activity.reduce((sum, point) => sum + point.calls, 0),
    activeAgents: agents.filter((agent) => agent.status === 'active').length,
    activity,
  });
}

export interface FetchOverviewOptions {
  /** Força a fonte de dados (fallback explícito do utilizador para demo). */
  forceSource?: 'demo' | 'live';
}

/**
 * Obtém os dados do Overview.
 * - Sem Supabase → demo (com latência curta para exercitar loading).
 * - Com Supabase → live; erros propagam para o estado de erro da UI.
 */
export async function fetchOverview(options: FetchOverviewOptions = {}): Promise<OverviewData> {
  const wantsDemo =
    options.forceSource === 'demo' || (options.forceSource !== 'live' && !isSupabaseConfigured());
  if (wantsDemo) {
    await delay(DEMO_LATENCY_MS);
    return buildDemoOverview();
  }
  return fetchLiveOverview();
}
