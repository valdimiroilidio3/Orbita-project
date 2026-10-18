'use client';

import { FilterX, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  CALL_DIRECTIONS,
  CALL_DIRECTION_LABELS,
  CALL_STATUSES,
  CALL_STATUS_LABELS,
  type CallDirection,
  type CallStatus,
} from '@orbita/shared';

import { CallsTable } from '@/components/dashboard/calls-table';
import { DemoBanner } from '@/components/dashboard/demo-banner';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { demoCalls } from '@/lib/demo-data';

export default function CallsPage() {
  const [status, setStatus] = useState<CallStatus | 'all'>('all');
  const [direction, setDirection] = useState<CallDirection | 'all'>('all');
  const [query, setQuery] = useState('');

  const calls = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return demoCalls.filter((call) => {
      if (status !== 'all' && call.status !== status) return false;
      if (direction !== 'all' && call.direction !== direction) return false;
      if (normalizedQuery !== '') {
        const haystack =
          `${call.toNumber ?? ''} ${call.fromNumber ?? ''} ${call.agentName}`.toLowerCase();
        if (!haystack.includes(normalizedQuery)) return false;
      }
      return true;
    });
  }, [status, direction, query]);

  const hasFilters = status !== 'all' || direction !== 'all' || query.trim() !== '';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chamadas"
        description="Histórico de chamadas com estado, direção, duração e data. Sem chamadas reais neste sprint."
      >
        <Button disabled title="Chamadas reais chegam com o motor de voz (próximo sprint)">
          <Plus className="h-4 w-4" aria-hidden />
          Nova chamada
        </Button>
      </PageHeader>

      <DemoBanner />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pesquisar por número ou agente…"
            className="pl-9"
            aria-label="Pesquisar chamadas"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="filter-direction">
            Direção
          </label>
          <select
            id="filter-direction"
            value={direction}
            onChange={(event) => setDirection(event.target.value as CallDirection | 'all')}
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-text"
          >
            <option value="all">Todas as direções</option>
            {CALL_DIRECTIONS.map((value) => (
              <option key={value} value={value}>
                {CALL_DIRECTION_LABELS[value]}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="filter-status">
            Estado
          </label>
          <select
            id="filter-status"
            value={status}
            onChange={(event) => setStatus(event.target.value as CallStatus | 'all')}
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-text"
          >
            <option value="all">Todos os estados</option>
            {CALL_STATUSES.map((value) => (
              <option key={value} value={value}>
                {CALL_STATUS_LABELS[value]}
              </option>
            ))}
          </select>

          {hasFilters ? (
            <Button
              variant="secondary"
              onClick={() => {
                setStatus('all');
                setDirection('all');
                setQuery('');
              }}
            >
              <FilterX className="h-4 w-4" aria-hidden />
              Limpar
            </Button>
          ) : null}
        </div>
      </div>

      <CallsTable calls={calls} />
    </div>
  );
}
