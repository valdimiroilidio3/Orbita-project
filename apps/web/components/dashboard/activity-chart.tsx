'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { ActivityPoint } from '@/lib/dashboard/types';

export interface ActivityChartProps {
  data: ActivityPoint[];
}

/**
 * Gráfico de atividade (chamadas por dia).
 * Recebe os dados da camada de dados do dashboard — sem origem própria;
 * a identificação de demo/live é da página.
 */
export function ActivityChart({ data }: ActivityChartProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="callsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1769E0" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#1769E0" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E3EAF4" vertical={false} />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: '#6B7890' }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: '#6B7890' }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: '1px solid #E3EAF4',
              boxShadow: '0 8px 24px rgba(23, 36, 58, 0.12)',
              fontSize: 12,
            }}
            formatter={(value) => [value, 'Chamadas']}
          />
          <Area
            type="monotone"
            dataKey="calls"
            stroke="#1769E0"
            strokeWidth={2}
            fill="url(#callsFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
