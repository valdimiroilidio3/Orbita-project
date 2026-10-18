'use client';

import { Plus } from 'lucide-react';
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
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Button } from '@/components/ui/button';
import { FilterBar, FilterSelect } from '@/components/ui/filter-bar';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { demoCalls } from '@/lib/demo-data';

const PAGE_SIZE = 2;

export default function CallsPage() {
  const [status, setStatus] = useState<CallStatus | 'all'>('all');
  const [direction, setDirection] = useState<CallDirection | 'all'>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
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

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const calls = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const hasFilters = status !== 'all' || direction !== 'all' || query.trim() !== '';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chamadas"
        description="Histórico de chamadas com estado, direção, duração e data. Sem chamadas reais neste sprint."
        breadcrumbs={<Breadcrumbs items={[{ label: 'Calls' }]} />}
      >
        <Button disabled title="Chamadas reais chegam com o motor de voz (próximo sprint)">
          <Plus className="h-4 w-4" aria-hidden />
          Nova chamada
        </Button>
      </PageHeader>

      <DemoBanner />

      <FilterBar
        showClear={hasFilters}
        onClear={() => {
          setStatus('all');
          setDirection('all');
          setQuery('');
          setPage(1);
        }}
      >
        <SearchInput
          value={query}
          onValueChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
          placeholder="Pesquisar por número ou agente…"
          label="Pesquisar chamadas"
          className="sm:max-w-xs"
        />
        <FilterSelect
          label="Direção"
          value={direction}
          onValueChange={(value) => {
            setDirection(value as CallDirection | 'all');
            setPage(1);
          }}
          options={[
            { value: 'all', label: 'Todas as direções' },
            ...CALL_DIRECTIONS.map((value) => ({ value, label: CALL_DIRECTION_LABELS[value] })),
          ]}
        />
        <FilterSelect
          label="Estado"
          value={status}
          onValueChange={(value) => {
            setStatus(value as CallStatus | 'all');
            setPage(1);
          }}
          options={[
            { value: 'all', label: 'Todos os estados' },
            ...CALL_STATUSES.map((value) => ({ value, label: CALL_STATUS_LABELS[value] })),
          ]}
        />
      </FilterBar>

      <CallsTable calls={calls} />

      {filtered.length > 0 ? (
        <Pagination
          page={currentPage}
          pageCount={pageCount}
          onPageChange={setPage}
          label={`Página ${currentPage} de ${pageCount} · ${filtered.length} chamada${filtered.length === 1 ? '' : 's'} (demo)`}
        />
      ) : null}
    </div>
  );
}
