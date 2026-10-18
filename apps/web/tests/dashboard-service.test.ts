import { describe, expect, it } from 'vitest';

import { buildDemoOverview, buildLiveOverview } from '../lib/dashboard/service';

describe('buildDemoOverview', () => {
  it('declara fonte demo e marca todos os registos como demo', () => {
    const data = buildDemoOverview();
    expect(data.source).toBe('demo');
    expect(data.recentCalls.every((call) => call.isDemo)).toBe(true);
    expect(data.agents.every((agent) => agent.isDemo)).toBe(true);
    expect(data.metrics.length).toBe(4);
    expect(data.activity.length).toBeGreaterThan(0);
    expect(data.fetchedAt).not.toBe('');
  });

  it('nunca apresenta integrações como ativas', () => {
    const data = buildDemoOverview();
    expect(data.platform.voiceIntegration).toBe(false);
    expect(data.platform.aiIntegration).toBe(false);
    expect(data.platform.billingIntegration).toBe(false);
  });
});

describe('buildLiveOverview', () => {
  const input = {
    calls: [
      {
        id: 'c1',
        direction: 'inbound' as const,
        status: 'completed' as const,
        to_number: '+351 210 000 000',
        from_number: null,
        duration_seconds: 120,
        estimated_cost: '0.500000',
        currency: 'EUR',
        started_at: '2026-10-18T10:00:00.000Z',
        created_at: '2026-10-18T10:00:00.000Z',
        agent_name: 'Agente real',
      },
    ],
    agents: [
      {
        id: 'a1',
        name: 'Agente real',
        description: null,
        language: 'pt-PT',
        status: 'active' as const,
      },
    ],
    totalCalls: 12,
    activeAgents: 1,
    activity: [
      { day: '17/10', calls: 5 },
      { day: '18/10', calls: 7 },
    ],
  };

  it('declara fonte live e registos não demo', () => {
    const data = buildLiveOverview(input);
    expect(data.source).toBe('live');
    expect(data.recentCalls.every((call) => call.isDemo === false)).toBe(true);
    expect(data.agents.every((agent) => agent.isDemo === false)).toBe(true);
  });

  it('converte campos snake_case e decimal do Postgres', () => {
    const data = buildLiveOverview(input);
    const call = data.recentCalls[0];
    expect(call?.toNumber).toBe('+351 210 000 000');
    expect(call?.estimatedCost).toBeCloseTo(0.5);
    expect(call?.agentName).toBe('Agente real');
  });

  it('calcula métricas sem inventar tendências', () => {
    const data = buildLiveOverview(input);
    const total = data.metrics.find((metric) => metric.key === 'totalCalls');
    expect(total?.value).toContain('12');
    expect(total?.trendPercent).toBeNull();
    const duration = data.metrics.find((metric) => metric.key === 'averageDuration');
    expect(duration?.value).toBe('2m 0s');
  });

  it('devolve métricas "—" quando não há registos suficientes', () => {
    const data = buildLiveOverview({
      ...input,
      calls: [],
      totalCalls: 0,
      activeAgents: 0,
      activity: [],
    });
    const duration = data.metrics.find((metric) => metric.key === 'averageDuration');
    expect(duration?.value).toBe('—');
    expect(data.recentCalls).toEqual([]);
  });
});
