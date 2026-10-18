'use client';

import * as React from 'react';

import { buildDemoOverview, fetchOverview } from '@/lib/dashboard/service';
import type { OverviewData } from '@/lib/dashboard/types';

export type OverviewStatus = 'loading' | 'ready' | 'error';

export interface UseOverviewResult {
  status: OverviewStatus;
  data: OverviewData | null;
  error: string | null;
  /** Recarrega da fonte ativa. */
  refresh: () => void;
  /** Fallback explícito do utilizador para dados de demonstração. */
  useDemoData: () => void;
  /** A fonte demo foi escolhida explicitamente pelo utilizador (fallback). */
  explicitDemo: boolean;
}

/**
 * Estado do Overview: loading · ready · error, com retry e
 * fallback explícito para demo (nunca silencioso).
 *
 * Nota: as transições de estado acontecem em handlers (eventos) ou em
 * callbacks assíncronos (promises) — nunca sincronamente no corpo do efeito.
 */
export function useOverview(): UseOverviewResult {
  const [status, setStatus] = React.useState<OverviewStatus>('loading');
  const [data, setData] = React.useState<OverviewData | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [explicitDemo, setExplicitDemo] = React.useState(false);
  const [requestId, setRequestId] = React.useState(0);
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    fetchOverview(explicitDemo ? { forceSource: 'demo' } : {})
      .then((result) => {
        if (controller.signal.aborted) return;
        setData(result);
        setStatus('ready');
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          cause instanceof Error ? cause.message : 'Erro desconhecido ao carregar o overview.',
        );
        setStatus('error');
      });

    return () => controller.abort();
  }, [requestId, explicitDemo]);

  const refresh = React.useCallback(() => {
    setStatus('loading');
    setError(null);
    setRequestId((id) => id + 1);
  }, []);

  const useDemoData = React.useCallback(() => {
    setExplicitDemo(true);
    setData(buildDemoOverview());
    setStatus('ready');
    setError(null);
  }, []);

  return { status, data, error, refresh, useDemoData, explicitDemo };
}
