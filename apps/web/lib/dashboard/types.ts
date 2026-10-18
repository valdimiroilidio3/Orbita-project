import type { AgentStatus, CallDirection, CallStatus } from '@orbita/shared';

/**
 * Tipos da camada de dados do dashboard (Prompt 03).
 *
 * Fontes de dados:
 * - 'demo' — dados fictícios, sempre identificados como tal no ecrã;
 * - 'live' — leitura real do Supabase (RLS). Sem sessão/dados → estado vazio honesto.
 *
 * Nenhum dado fictício é apresentado como real: `isDemo` acompanha cada registo
 * e `source` acompanha a resposta.
 */

export type OverviewSource = 'demo' | 'live';

export interface CallRecord {
  id: string;
  direction: CallDirection;
  status: CallStatus;
  toNumber: string | null;
  fromNumber: string | null;
  agentName: string | null;
  durationSeconds: number | null;
  estimatedCost: number | null;
  currency: string;
  startedAt: string | null;
  createdAt: string;
  isDemo: boolean;
}

export interface AgentSummary {
  id: string;
  name: string;
  description: string | null;
  language: string;
  status: AgentStatus;
  isDemo: boolean;
}

export interface OverviewMetric {
  key: 'totalCalls' | 'activeAgents' | 'averageDuration' | 'estimatedSpend';
  label: string;
  value: string;
  trendPercent: number | null;
  hint: string;
}

export interface ActivityPoint {
  day: string;
  calls: number;
}

export interface PlatformStatus {
  /** Leitura real do ambiente (nunca demo). */
  supabaseConfigured: boolean;
  voiceIntegration: false;
  aiIntegration: false;
  billingIntegration: false;
}

export interface OverviewData {
  source: OverviewSource;
  /** Momento real da última atualização dos dados. */
  fetchedAt: string;
  metrics: OverviewMetric[];
  activity: ActivityPoint[];
  recentCalls: CallRecord[];
  agents: AgentSummary[];
  totalCalls: number;
  platform: PlatformStatus;
}
