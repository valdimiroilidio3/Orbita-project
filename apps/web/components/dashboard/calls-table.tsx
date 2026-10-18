'use client';

import { ArrowDownLeft, ArrowUpRight, PhoneOff } from 'lucide-react';

import type { DemoCall } from '@/lib/demo-data';
import {
  CALL_DIRECTION_LABELS,
  formatCurrency,
  formatDateTime,
  formatDuration,
} from '@orbita/shared';

import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';

export interface CallsTableProps {
  calls: DemoCall[];
  /** Renderiza o estado vazio com orientação e CTA. */
  emptyAction?: React.ReactNode;
}

/**
 * Histórico de chamadas: estado, direção, duração e data.
 * Recebe apenas dados de demonstração identificados como tal (Sprint 1).
 */
export function CallsTable({ calls, emptyAction }: CallsTableProps) {
  if (calls.length === 0) {
    return (
      <EmptyState
        icon={PhoneOff}
        title="Sem chamadas para mostrar"
        description="Ainda não existem chamadas com os filtros ativos. Quando o motor de voz estiver ligado, o histórico aparece aqui — sem dados fictícios apresentados como reais."
        action={emptyAction}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="px-5 py-3.5">Direção</th>
              <th className="px-5 py-3.5">Destino</th>
              <th className="px-5 py-3.5">Agente</th>
              <th className="px-5 py-3.5">Estado</th>
              <th className="px-5 py-3.5">Duração</th>
              <th className="px-5 py-3.5">Início</th>
              <th className="px-5 py-3.5 text-right">Custo est.</th>
            </tr>
          </thead>
          <tbody>
            {calls.map((call) => (
              <tr
                key={call.id}
                className="border-b border-border last:border-b-0 hover:bg-surface/60"
              >
                <td className="px-5 py-4">
                  <span className="flex items-center gap-2">
                    {call.direction === 'inbound' ? (
                      <ArrowDownLeft className="h-4 w-4 text-success" aria-hidden />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 text-primary" aria-hidden />
                    )}
                    <span className="text-muted">{CALL_DIRECTION_LABELS[call.direction]}</span>
                  </span>
                </td>
                <td className="px-5 py-4 font-medium">{call.toNumber ?? '—'}</td>
                <td className="px-5 py-4">
                  <span className="flex items-center gap-2">
                    {call.agentName}
                    <Badge variant="accent">Demo</Badge>
                  </span>
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={call.status} kind="call" />
                </td>
                <td className="px-5 py-4 tabular-nums text-muted">
                  {formatDuration(call.durationSeconds)}
                </td>
                <td className="px-5 py-4 text-muted">{formatDateTime(call.startedAt)}</td>
                <td className="px-5 py-4 text-right tabular-nums">
                  {formatCurrency(call.estimatedCost, call.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
