import { ArrowDownRight, ArrowUpRight, type LucideIcon, Minus } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  /** Variação percentual face ao período anterior (ex.: 12.4 = +12.4%). */
  trendPercent?: number;
  hint?: string;
  /** Slot de badge (ex.: identificação de demonstração). */
  badge?: React.ReactNode;
  /** Skeleton de carregamento. */
  loading?: boolean;
  className?: string;
}

/**
 * StatCard — indicador com valor, comparação e tendência.
 * Evolução do MetricCard da Fase 01 (API equivalente + badge/loading).
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  trendPercent,
  hint,
  badge,
  loading = false,
  className,
}: StatCardProps) {
  const trendDirection =
    trendPercent == null || trendPercent === 0 ? 'flat' : trendPercent > 0 ? 'up' : 'down';
  const TrendIcon =
    trendDirection === 'up' ? ArrowUpRight : trendDirection === 'down' ? ArrowDownRight : Minus;

  return (
    <Card className={cn('bg-surface', className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <p className="flex items-center gap-2 text-small font-medium text-muted">
              {label}
              {badge}
            </p>
            {loading ? (
              <div className="h-8 w-24 animate-skeleton rounded-md bg-neutral-soft motion-reduce:animate-none" />
            ) : (
              <p className="text-h2 tabular-nums tracking-tight">{value}</p>
            )}
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-soft-blue text-primary">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
        </div>
        {!loading && (trendPercent != null || hint) ? (
          <div className="mt-3 flex items-center gap-2 text-caption">
            {trendPercent != null ? (
              <span
                className={cn(
                  'inline-flex items-center gap-1 font-semibold',
                  trendDirection === 'up' && 'text-success-text',
                  trendDirection === 'down' && 'text-danger-text',
                  trendDirection === 'flat' && 'text-muted',
                )}
              >
                <TrendIcon className="h-3.5 w-3.5" aria-hidden />
                {trendPercent > 0 ? '+' : ''}
                {trendPercent.toFixed(1)}%
              </span>
            ) : null}
            {hint ? <span className="text-muted">{hint}</span> : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
