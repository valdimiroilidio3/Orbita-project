'use client';

import { Bot, Plus } from 'lucide-react';
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

type StatusFilter = AgentStatus | 'all';

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  ...AGENT_STATUSES.map((status) => ({ value: status, label: AGENT_STATUS_LABELS[status] })),
];

export interface AgentsListProps {
  agents: AgentSummary[];
  demoMode: boolean;
  canCreate: boolean;
  notice?: { type: 'success' | 'error'; message: string } | null;
}

/** Listagem de agentes com filtros por estado, estados vazios e avisos. */
export function AgentsList({ agents, demoMode, canCreate, notice }: AgentsListProps) {
  const [filter, setFilter] = useState<StatusFilter>('all');

  const filtered = useMemo(
    () => (filter === 'all' ? agents : agents.filter((agent) => agent.status === filter)),
    [agents, filter],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agentes"
        description={
          demoMode
            ? 'Listagem de agentes com filtros e estados. Dados de demonstração.'
            : `Agentes da tua organização (${agents.length}).`
        }
      >
        {canCreate ? (
          <Button asChild>
            <Link href="/agents/new">
              <Plus className="h-4 w-4" aria-hidden />
              Novo agente
            </Link>
          </Button>
        ) : null}
      </PageHeader>

      {demoMode ? <DemoBanner /> : null}

      {notice ? (
        <p
          role={notice.type === 'error' ? 'alert' : 'status'}
          className={cn(
            'rounded-xl border px-3.5 py-2.5 text-xs font-medium',
            notice.type === 'error'
              ? 'border-danger/40 bg-danger-soft text-danger-text'
              : 'border-success/40 bg-success-soft text-success-text',
          )}
        >
          {notice.message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
        {FILTERS.map((option) => {
          const selected = filter === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => setFilter(option.value)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-small transition-colors duration-fast ease-out',
                selected
                  ? 'border-primary bg-soft-blue font-medium text-primary'
                  : 'border-border bg-surface text-muted hover:border-muted/50 hover:text-text',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Bot}
          title={filter === 'all' ? 'Ainda sem agentes' : 'Sem agentes neste estado'}
          description={
            filter === 'all'
              ? 'Cria o teu primeiro agente de voz para começar a configurar o atendimento.'
              : 'Experimenta outro filtro ou cria um novo agente.'
          }
          action={
            canCreate ? (
              <Button asChild>
                <Link href="/agents/new">
                  <Plus className="h-4 w-4" aria-hidden />
                  Novo agente
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((agent) => (
            <li key={agent.id}>
              <AgentCard agent={agent} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
