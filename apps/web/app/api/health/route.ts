import { NextResponse } from 'next/server';

import { isSupabaseConfigured } from '@/lib/env';

/**
 * Rota mínima de saúde (uma das únicas rotas de API do Sprint 1).
 * Nunca expõe segredos — apenas indicadores booleanos.
 */
export function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'orbita-chat-web',
    supabaseConfigured: isSupabaseConfigured(),
    integrations: {
      voice: false,
      ai: false,
      billing: false,
    },
  });
}
