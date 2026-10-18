'use client';

import { Bot, PhoneCall, Timer, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { DataTable, type DataColumn } from '@/components/ui/data-table';
import { FilterBar, FilterSelect } from '@/components/ui/filter-bar';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { SectionHeader } from '@/components/ui/section-header';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import type { CallStatus } from '@orbita/shared';
import { formatDuration } from '@orbita/shared';

interface DemoRow {
  id: string;
  name: string;
  status: CallStatus;
  durationSeconds: number;
  language: string;
}

/** Linhas fictícias — claramente identificadas como demonstração. */
const DEMO_ROWS: DemoRow[] = [
  { id: 'r1', name: 'Linha demo 01', status: 'completed', durationSeconds: 185, language: 'pt-PT' },
  {
    id: 'r2',
    name: 'Linha demo 02',
    status: 'in_progress',
    durationSeconds: 42,
    language: 'pt-PT',
  },
  { id: 'r3', name: 'Linha demo 03', status: 'failed', durationSeconds: 8, language: 'en-US' },
  { id: 'r4', name: 'Linha demo 04', status: 'no_answer', durationSeconds: 0, language: 'pt-BR' },
  { id: 'r5', name: 'Linha demo 05', status: 'completed', durationSeconds: 320, language: 'pt-PT' },
  { id: 'r6', name: 'Linha demo 06', status: 'queued', durationSeconds: 0, language: 'es-ES' },
];

const PAGE_SIZE = 3;

/** Demonstração: StatCard, tabela tipada, filtros e paginação. */
export function DataDemo() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | CallStatus>('all');
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () =>
      DEMO_ROWS.filter((row) => {
        if (status !== 'all' && row.status !== status) return false;
        return row.name.toLowerCase().includes(query.trim().toLowerCase());
      }),
    [query, status],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const columns: DataColumn<DemoRow>[] = [
    {
      key: 'name',
      header: 'Linha (demo)',
      cell: (row) => (
        <span className="flex items-center gap-2 font-medium">
          {row.name}
          <Badge variant="accent">Demo</Badge>
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      cell: (row) => <StatusBadge status={row.status} kind="call" />,
    },
    {
      key: 'language',
      header: 'Idioma',
      cell: (row) => <span className="text-muted">{row.language}</span>,
      headerClassName: 'hidden sm:table-cell',
      className: 'hidden sm:table-cell',
    },
    {
      key: 'duration',
      header: 'Duração',
      align: 'right',
      cell: (row) => (
        <span className="tabular-nums text-muted">{formatDuration(row.durationSeconds)}</span>
      ),
    },
  ];

  return (
    <section aria-labelledby="data-heading" className="space-y-6">
      <SectionHeader
        title="Componentes de dados"
        description="StatCard, DataTable tipada, pesquisa, filtros e paginação. Dados fictícios de demonstração."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Chamadas (demo)"
          value="128"
          icon={PhoneCall}
          trendPercent={12.4}
          hint="vs. semana anterior"
          badge={<Badge variant="accent">Demo</Badge>}
        />
        <StatCard
          label="Agentes (demo)"
          value="3"
          icon={Bot}
          trendPercent={0}
          hint="sem variação"
          badge={<Badge variant="accent">Demo</Badge>}
        />
        <StatCard
          label="Duração média (demo)"
          value={formatDuration(142)}
          icon={Timer}
          trendPercent={-4.8}
          hint="vs. semana anterior"
          badge={<Badge variant="accent">Demo</Badge>}
        />
        <StatCard
          label="Taxa de conclusão (demo)"
          value="87%"
          icon={TrendingUp}
          trendPercent={2.3}
          hint="vs. semana anterior"
          badge={<Badge variant="accent">Demo</Badge>}
        />
      </div>

      <FilterBar
        showClear={query !== '' || status !== 'all'}
        onClear={() => {
          setQuery('');
          setStatus('all');
          setPage(1);
        }}
      >
        <SearchInput
          value={query}
          onValueChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
          placeholder="Pesquisar linhas de demonstração…"
          label="Pesquisar tabela de demonstração"
          className="sm:max-w-xs"
        />
        <FilterSelect
          label="Estado da tabela"
          value={status}
          onValueChange={(value) => {
            setStatus(value as 'all' | CallStatus);
            setPage(1);
          }}
          options={[
            { value: 'all', label: 'Todos os estados' },
            { value: 'completed', label: 'Concluída' },
            { value: 'in_progress', label: 'Em curso' },
            { value: 'failed', label: 'Falhada' },
            { value: 'no_answer', label: 'Sem resposta' },
            { value: 'queued', label: 'Em fila' },
          ]}
        />
      </FilterBar>

      <DataTable
        columns={columns}
        data={rows}
        keyExtractor={(row) => row.id}
        caption="Tabela de demonstração do design system (dados fictícios)"
      />

      {filtered.length > 0 ? (
        <Pagination
          page={currentPage}
          pageCount={pageCount}
          onPageChange={setPage}
          label={`Página ${currentPage} de ${pageCount}`}
        />
      ) : null}
    </section>
  );
}
