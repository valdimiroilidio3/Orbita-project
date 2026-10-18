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

import { demoMetrics } from '@/lib/demo-data';

/**
 * Gráfico de atividade (chamadas por dia) — ⚠️ série de demonstração.
 * Sem ligação a fornecedores reais; identificado como demo no ecrã.
 */
export function ActivityChart() {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={[...demoMetrics.activitySeries]}
          margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
        >
          <defs>
            <linearGradient id="callsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1769E0" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#1769E0" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E9F4" vertical={false} />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: '#5B6B84' }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: '#5B6B84' }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: '1px solid #E2E9F4',
              boxShadow: '0 8px 24px rgba(23, 36, 58, 0.12)',
              fontSize: 12,
            }}
            formatter={(value) => [value, 'Chamadas (demo)']}
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
