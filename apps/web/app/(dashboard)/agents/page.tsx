'use client';

import { Bot, Plus, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { AGENT_STATUSES, AGENT_STATUS_LABELS, type AgentStatus } from '@orbita/shared';

import { AgentCard } from '@/components/agents/agent-card';
import { DemoBanner } from '@/components/dashboard/demo-banner';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';
import type { AgentSummary } from '@/lib/dashboard/types';
import { demoAgents } from '@/lib/demo-data';

type StatusFilter = AgentStatus | 'all';

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  ...AGENT_STATUSES.map((status) => ({ value: status, label: AGENT_STATUS_LABELS[status] })),
];

/** Agentes de demonstração no formato da camada de dados (identificados como demo). */
const demoSummaries: AgentSummary[] = demoAgents.map((agent) => ({
  id: agent.id,
  name: agent.name,
  description: agent.description,
  language: agent.language,
  status: agent.status,
  isDemo: true,
}));

export default function AgentsPage() {
  const [filter, setFilter] = useState<StatusFilter>('all');

  const agents = useMemo(
    () =>
      filter === 'all' ? demoSummaries : demoSummaries.filter((agent) => agent.status === filter),
    [filter],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agentes"
        description="Listagem de agentes com filtros e estados. Dados de demonstração."
      >
        <Button asChild>
          <Link href="/agents/new">
            <Plus className="h-4 w-4" aria-hidden />
            Novo agente
          </Link>
        </Button>
      </PageHeader>

      <DemoBanner />

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            aria-pressed={filter === option.value}
            className={cn(
              'rounded-full border px-4 py-1.5 text-small font-medium transition-colors duration-fast ease-out',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
              filter === option.value
                ? 'border-primary bg-primary text-white shadow-xs'
                : 'border-border bg-surface text-muted hover:bg-background hover:text-text',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {agents.length === 0 ? (
        <EmptyState
          icon={filter === 'all' ? Sparkles : Bot}
          title={
            filter === 'all'
              ? 'Ainda sem agentes'
              : `Sem agentes em "${FILTERS.find((f) => f.value === filter)?.label}"`
          }
          description={
            filter === 'all'
              ? 'Cria o teu primeiro agente para começar a configurar chamadas de voz com IA.'
              : 'Nenhum agente corresponde a este filtro. Limpa o filtro ou cria um novo agente.'
          }
          action={
            <div className="flex items-center gap-2">
              {filter !== 'all' ? (
                <Button variant="outline" onClick={() => setFilter('all')}>
                  Limpar filtro
                </Button>
              ) : null}
              <Button asChild>
                <Link href="/agents/new">
                  <Plus className="h-4 w-4" aria-hidden />
                  Criar agente
                </Link>
              </Button>
            </div>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}
