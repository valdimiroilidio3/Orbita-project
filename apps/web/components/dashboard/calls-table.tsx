'use client';

import { ArrowDownLeft, ArrowUpRight, PhoneOff } from 'lucide-react';
import Link from 'next/link';

import {
  CALL_DIRECTION_LABELS,
  formatCurrency,
  formatDateTime,
  formatDuration,
  maskPhoneNumber,
} from '@orbita/shared';

import { Badge } from '@/components/ui/badge';
import { DataTable, type DataColumn } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import type { CallRecord } from '@/lib/dashboard/types';

export interface CallsTableProps {
  calls: CallRecord[];
  /** Estado vazio com orientação e CTA. */
  emptyAction?: React.ReactNode;
  /** Descrição acessível da tabela. */
  caption?: string;
  /** Skeleton de carregamento. */
  loading?: boolean;
  /** Liga cada linha ao detalhe da chamada (/calls/[id]). */
  linkToDetail?: boolean;
}

const DIRECTION_ICON = {
  inbound: ArrowDownLeft,
  outbound: ArrowUpRight,
} as const;

/**
 * Histórico de chamadas sobre DataTable (design system).
 * Registos demo são identificados com badge — nunca apresentados como reais.
 */
export function CallsTable({
  calls,
  emptyAction,
  caption,
  loading = false,
  linkToDetail = false,
}: CallsTableProps) {
  const columns: DataColumn<CallRecord>[] = [
    {
      key: 'direction',
      header: 'Direção',
      cell: (call) => {
        const Icon = DIRECTION_ICON[call.direction];
        return (
          <span className="flex items-center gap-2">
            <Icon
              className={
                call.direction === 'inbound' ? 'h-4 w-4 text-success' : 'h-4 w-4 text-primary'
              }
              aria-hidden
            />
            <span className="text-muted">{CALL_DIRECTION_LABELS[call.direction]}</span>
          </span>
        );
      },
    },
    {
      key: 'to',
      header: 'Destino',
      cell: (call) => (
        <span className="font-medium" title="Número mascarado na listagem — completo no detalhe">
          {maskPhoneNumber(call.toNumber)}
        </span>
      ),
    },
    {
      key: 'agent',
      header: 'Agente',
      cell: (call) => (
        <span className="flex items-center gap-2">
          {call.agentName ?? '—'}
          {call.isDemo ? <Badge variant="accent">Demo</Badge> : null}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      cell: (call) => <StatusBadge status={call.status} kind="call" />,
    },
    {
      key: 'duration',
      header: 'Duração',
      cell: (call) => (
        <span className="tabular-nums text-muted">{formatDuration(call.durationSeconds)}</span>
      ),
    },
    {
      key: 'started',
      header: 'Início',
      cell: (call) => <span className="text-muted">{formatDateTime(call.startedAt)}</span>,
    },
    {
      key: 'cost',
      header: 'Custo est.',
      align: 'right',
      cell: (call) => (
        <span className="tabular-nums">{formatCurrency(call.estimatedCost, call.currency)}</span>
      ),
    },
  ];

  if (linkToDetail) {
    columns.push({
      key: 'detail',
      header: '',
      align: 'right',
      cell: (call) => (
        <Link
          href={`/calls/${call.id}`}
          className="text-small font-medium text-primary hover:underline"
          aria-label={`Ver detalhe da chamada ${maskPhoneNumber(call.toNumber)}`}
        >
          Ver
        </Link>
      ),
    });
  }

  return (
    <DataTable
      columns={columns}
      data={calls}
      keyExtractor={(call) => call.id}
      caption={caption ?? 'Histórico de chamadas'}
      loading={loading}
      empty={
        <EmptyState
          icon={PhoneOff}
          title="Sem chamadas para mostrar"
          description="Ainda não existem chamadas com os filtros ativos. Inicia uma chamada com o simulador local ou ajusta os filtros — sem dados fictícios apresentados como reais."
          action={emptyAction}
        />
      }
    />
  );
}
