'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

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

export interface ServerPagingState {
  page: number;
  pageCount: number;
  total: number;
  query: string;
  status: CallStatus | 'all';
  direction: CallDirection | 'all';
}

export interface CallsListProps {
  records: CallRecord[];
  demoMode: boolean;
  canStart: boolean;
  notice?: { type: 'success' | 'error'; message: string } | null;
  /**
   * Quando presente, filtros/pesquisa/paginação são aplicados NO SERVIDOR
   * (via URL) — o histórico completo fica acessível. Sem ele (demo),
   * filtra-se localmente o conjunto de demonstração.
   */
  server?: ServerPagingState;
}

/** Histórico de chamadas com filtros, pesquisa, paginação e estados vazios. */
export function CallsList({ records, demoMode, canStart, notice, server }: CallsListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const [localStatus, setStatus] = useState<CallStatus | 'all'>(server?.status ?? 'all');
  const [localDirection, setDirection] = useState<CallDirection | 'all'>(
    server?.direction ?? 'all',
  );
  const [localQuery, setQuery] = useState(server?.query ?? '');
  const [localPage, setPage] = useState(server?.page ?? 1);

  const status = server ? server.status : localStatus;
  const direction = server ? server.direction : localDirection;
  const query = server ? localQuery : localQuery;

  /** Navega com os filtros na URL (modo servidor). */
  const navigate = (next: Partial<ServerPagingState>) => {
    if (!server) return;
    const params = new URLSearchParams();
    const merged = { ...server, query: localQuery, ...next };
    if (merged.query.trim()) params.set('q', merged.query.trim());
    if (merged.status !== 'all') params.set('status', merged.status);
    if (merged.direction !== 'all') params.set('direction', merged.direction);
    if (merged.page > 1) params.set('page', String(merged.page));
    const qs = params.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  };

  const filtered = useMemo(() => {
    if (server) return records;
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
  }, [records, status, direction, query, server]);

  const pageCount = server ? server.pageCount : Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = server ? server.page : Math.min(localPage, pageCount);
  const calls = server
    ? filtered
    : filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const total = server ? server.total : filtered.length;
  const hasFilters = status !== 'all' || direction !== 'all' || query.trim() !== '';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chamadas"
        description={
          demoMode
            ? 'Histórico de chamadas com estado, direção, duração e data. Dados de demonstração.'
            : `Histórico de chamadas da tua organização (${total}). Chamadas com o simulador local — sem telefonia real.`
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
          navigate({ status: 'all', direction: 'all', query: '', page: 1 });
        }}
      >
        <form
          className="contents"
          onSubmit={(event) => {
            event.preventDefault();
            navigate({ query: localQuery, page: 1 });
          }}
        >
          <SearchInput
            value={localQuery}
            onValueChange={(value) => {
              setQuery(value);
              setPage(1);
              if (server && value.trim() === '' && server.query !== '') {
                navigate({ query: '', page: 1 });
              }
            }}
            placeholder={
              server ? 'Pesquisar por número (Enter)…' : 'Pesquisar por número ou agente…'
            }
            label="Pesquisar chamadas"
            className="sm:max-w-xs"
          />
        </form>
        <FilterSelect
          label="Direção"
          value={direction}
          onValueChange={(value) => {
            setDirection(value as CallDirection | 'all');
            setPage(1);
            navigate({ direction: value as CallDirection | 'all', page: 1 });
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
            navigate({ status: value as CallStatus | 'all', page: 1 });
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

      {total > 0 ? (
        <Pagination
          page={currentPage}
          pageCount={pageCount}
          label={`${total} chamadas`}
          onPageChange={(next) => {
            setPage(next);
            navigate({ page: next });
          }}
        />
      ) : null}
    </div>
  );
}
