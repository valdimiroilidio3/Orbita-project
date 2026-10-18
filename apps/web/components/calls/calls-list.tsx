'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
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
import { Button } from '@/components/ui/button';
import { FilterBar, FilterSelect } from '@/components/ui/filter-bar';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { cn } from '@/lib/utils';
import type { CallRecord } from '@/lib/dashboard/types';

const PAGE_SIZE = 10;

export interface CallsListProps {
  records: CallRecord[];
  demoMode: boolean;
  canStart: boolean;
  notice?: { type: 'success' | 'error'; message: string } | null;
}

/** Histórico de chamadas com filtros, pesquisa, paginação e estados vazios. */
export function CallsList({ records, demoMode, canStart, notice }: CallsListProps) {
  const [status, setStatus] = useState<CallStatus | 'all'>('all');
  const [direction, setDirection] = useState<CallDirection | 'all'>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return records.filter((call) => {
      if (status !== 'all' && call.status !== status) return false;
      if (direction !== 'all' && call.direction !== direction) return false;
      if (normalizedQuery !== '') {
        const haystack =
          `${call.toNumber ?? ''} ${call.fromNumber ?? ''} ${call.agentName ?? ''}`.toLowerCase();
        if (!haystack.includes(normalizedQuery)) return false;
      }
      return true;
    });
  }, [records, status, direction, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const calls = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const hasFilters = status !== 'all' || direction !== 'all' || query.trim() !== '';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chamadas"
        description={
          demoMode
            ? 'Histórico de chamadas com estado, direção, duração e data. Dados de demonstração.'
            : `Histórico de chamadas da tua organização (${records.length}). Chamadas com o simulador local — sem telefonia real.`
        }
      >
        {canStart ? (
          <Button asChild>
            <Link href="/calls/new">
              <Plus className="h-4 w-4" aria-hidden />
              Nova chamada
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

      <CallsTable
        calls={calls}
        caption={demoMode ? 'Histórico de chamadas (demonstração)' : 'Histórico de chamadas'}
        linkToDetail
      />

      {filtered.length > 0 ? (
        <Pagination
          page={currentPage}
          pageCount={pageCount}
          label={`${filtered.length} chamadas`}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}
