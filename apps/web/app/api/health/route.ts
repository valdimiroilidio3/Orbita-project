import { NextResponse } from 'next/server';

import { isSupabaseConfigured } from '@/lib/env';
import { buildIntegrationStatuses } from '@/lib/integrations/status';

/**
 * Verificação de saúde (liveness + estado real das integrações).
 * Nunca expõe segredos, variáveis de ambiente nem dados de clientes —
 * apenas estados discretos derivados de `buildIntegrationStatuses`.
 */
export const dynamic = 'force-dynamic';

export function GET() {
  const integrations = Object.fromEntries(
    buildIntegrationStatuses().map((item) => [item.id, item.state]),
  );

  return NextResponse.json(
    {
      status: 'ok',
      service: 'orbita-chat-web',
      supabaseConfigured: isSupabaseConfigured(),
      integrations,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
