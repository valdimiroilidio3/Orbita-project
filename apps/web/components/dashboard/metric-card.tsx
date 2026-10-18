import { ArrowDownRight, ArrowUpRight, type LucideIcon, Minus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface MetricCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  /** Variação percentual face ao período anterior (ex.: 12.4 = +12.4%). */
  trendPercent?: number;
  hint?: string;
  /** Marca explicitamente o valor como demonstração. */
  demo?: boolean;
  className?: string;
}

/** Indicador com valor, comparação e tendência. */
export function MetricCard({
  label,
  value,
  icon: Icon,
  trendPercent,
  hint,
  demo = false,
  className,
}: MetricCardProps) {
  const trendDirection =
    trendPercent == null || trendPercent === 0 ? 'flat' : trendPercent > 0 ? 'up' : 'down';
  const TrendIcon =
    trendDirection === 'up' ? ArrowUpRight : trendDirection === 'down' ? ArrowDownRight : Minus;

  return (
    <Card className={cn('bg-background', className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <p className="flex items-center gap-2 text-sm font-medium text-muted">
              {label}
              {demo ? <Badge variant="accent">Demo</Badge> : null}
            </p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-soft-blue text-primary">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs">
          {trendPercent != null ? (
            <span
              className={cn(
                'inline-flex items-center gap-1 font-semibold',
                trendDirection === 'up' && 'text-success',
                trendDirection === 'down' && 'text-danger',
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
      </CardContent>
    </Card>
  );
}
