/**
 * ⚠️ DADOS DE DEMONSTRAÇÃO (DEMO) ⚠️
 *
 * Tudo neste ficheiro é fictício e serve apenas o protótipo do Sprint 1.
 * NÃO representam clientes, chamadas, agentes nem métricas reais, nem
 * provêm de fornecedores externos (telefonia/IA). Os ecrãs que os usam
 * exibem um aviso de demonstração obrigatório (DemoBanner).
 */

import type { Agent, Call, CallStatus } from '@orbita/shared';

export const DEMO_NOTICE =
  'Dados de demonstração — não representam chamadas, agentes nem métricas reais de fornecedores.';

export interface DemoAgent extends Agent {
  demo: true;
}

export interface DemoCall extends Call {
  demo: true;
  agentName: string;
}

export const demoAgents: DemoAgent[] = [
  {
    demo: true,
    id: 'demo-agent-1',
    organizationId: 'demo-org',
    name: 'Rececionista Virtual (demo)',
    description: 'Agente fictício para validar listagens e cartões.',
    instructions: '',
    language: 'pt-PT',
    status: 'active',
    voiceConfig: {},
    createdBy: null,
    createdAt: '2026-10-12T09:00:00.000Z',
    updatedAt: '2026-10-12T09:00:00.000Z',
  },
  {
    demo: true,
    id: 'demo-agent-2',
    organizationId: 'demo-org',
    name: 'Apoio ao Cliente (demo)',
    description: 'Segundo agente fictício — estado em pausa.',
    instructions: '',
    language: 'pt-PT',
    status: 'paused',
    voiceConfig: {},
    createdBy: null,
    createdAt: '2026-10-10T14:30:00.000Z',
    updatedAt: '2026-10-14T11:00:00.000Z',
  },
  {
    demo: true,
    id: 'demo-agent-3',
    organizationId: 'demo-org',
    name: 'Agenda de Consultas (demo)',
    description: 'Agente fictício em rascunho.',
    instructions: '',
    language: 'pt-PT',
    status: 'draft',
    voiceConfig: {},
    createdBy: null,
    createdAt: '2026-10-16T17:45:00.000Z',
    updatedAt: '2026-10-16T17:45:00.000Z',
  },
];

export const demoCalls: DemoCall[] = [
  {
    demo: true,
    id: 'demo-call-1',
    organizationId: 'demo-org',
    agentId: 'demo-agent-1',
    provider: 'demo',
    providerCallId: 'demo-0001',
    direction: 'inbound',
    status: 'completed' satisfies CallStatus,
    fromNumber: '+351 210 000 000',
    toNumber: '+351 210 000 001',
    durationSeconds: 185,
    estimatedCost: 0.42,
    currency: 'EUR',
    startedAt: '2026-10-17T10:12:00.000Z',
    endedAt: '2026-10-17T10:15:05.000Z',
    createdAt: '2026-10-17T10:12:00.000Z',
    updatedAt: '2026-10-17T10:15:05.000Z',
    agentName: 'Rececionista Virtual (demo)',
  },
  {
    demo: true,
    id: 'demo-call-2',
    organizationId: 'demo-org',
    agentId: 'demo-agent-1',
    provider: 'demo',
    providerCallId: 'demo-0002',
    direction: 'outbound',
    status: 'no_answer' satisfies CallStatus,
    fromNumber: '+351 210 000 001',
    toNumber: '+351 910 000 000',
    durationSeconds: 0,
    estimatedCost: 0.05,
    currency: 'EUR',
    startedAt: '2026-10-17T11:40:00.000Z',
    endedAt: '2026-10-17T11:40:32.000Z',
    createdAt: '2026-10-17T11:40:00.000Z',
    updatedAt: '2026-10-17T11:40:32.000Z',
    agentName: 'Rececionista Virtual (demo)',
  },
  {
    demo: true,
    id: 'demo-call-3',
    organizationId: 'demo-org',
    agentId: 'demo-agent-2',
    provider: 'demo',
    providerCallId: 'demo-0003',
    direction: 'inbound',
    status: 'failed' satisfies CallStatus,
    fromNumber: '+351 930 000 000',
    toNumber: '+351 210 000 001',
    durationSeconds: 12,
    estimatedCost: 0.08,
    currency: 'EUR',
    startedAt: '2026-10-16T16:05:00.000Z',
    endedAt: '2026-10-16T16:05:12.000Z',
    createdAt: '2026-10-16T16:05:00.000Z',
    updatedAt: '2026-10-16T16:05:12.000Z',
    agentName: 'Apoio ao Cliente (demo)',
  },
];

export const demoMetrics = {
  totalCalls: 128,
  totalCallsTrend: 12.4,
  activeAgents: 3,
  activeAgentsTrend: 0,
  averageDurationSeconds: 142,
  averageDurationTrend: -4.8,
  estimatedSpendEur: 36.2,
  estimatedSpendTrend: 8.1,
  /** Série fictícia para o gráfico de atividade (últimos 7 dias). */
  activitySeries: [
    { day: '12/10', calls: 12 },
    { day: '13/10', calls: 18 },
    { day: '14/10', calls: 15 },
    { day: '15/10', calls: 22 },
    { day: '16/10', calls: 19 },
    { day: '17/10', calls: 26 },
    { day: '18/10', calls: 16 },
  ],
} as const;
