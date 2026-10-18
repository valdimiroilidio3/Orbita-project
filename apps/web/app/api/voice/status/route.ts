import { NextResponse } from 'next/server';

import { isSupabaseConfigured } from '@/lib/env';
import { deriveVoiceDiagnostics } from '@/lib/voice/diagnostics';
import { readVoiceEnv } from '@/lib/voice/env';
import { isVoiceIntegrationImplemented, getVoiceProvider } from '@/lib/voice/adapters';
import { getActiveOrganization } from '@/lib/server/organizations';
import { getUser } from '@/lib/server/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Estado operacional do motor de voz (PROMPT 07 §10/§11).
 *
 * Endpoint AUTENTICADO (sessão + organização da sessão) — não expõe
 * credenciais nem configurações internas, apenas o estado de diagnóstico.
 */

export const runtime = 'nodejs';

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: { code: 'not_configured', message: 'Supabase não configurado.' } }, { status: 503 });
  }

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: { code: 'unauthenticated', message: 'Sessão obrigatória.' } }, { status: 401 });
  }

  const organization = await getActiveOrganization();
  if (!organization) {
    return NextResponse.json({ error: { code: 'no_organization', message: 'Sem organização ativa.' } }, { status: 403 });
  }

  const envFacts = readVoiceEnv();

  // "Ligação verificada" exige uma chamada real concluída com sessão de voz
  // — nunca um indicador simulado (PROMPT 07 §11).
  const supabase = await createSupabaseServerClient();
  const { data: verified } = await supabase
    .from('calls')
    .select('id')
    .eq('organization_id', organization.id)
    .eq('status', 'completed')
    .neq('provider', 'simulado')
    .not('voice_session_id', 'is', null)
    .limit(1)
    .maybeSingle();

  let providerCheck: { ready: boolean; detail: string } | null = null;
  if (isVoiceIntegrationImplemented()) {
    providerCheck = await getVoiceProvider().checkReadiness();
  }

  const diagnostics = deriveVoiceDiagnostics({
    envPresent: envFacts.envPresent,
    envValid: envFacts.envValid,
    integrationImplemented: isVoiceIntegrationImplemented(),
    providerCheck,
    hasVerifiedRealCall: Boolean(verified),
  });

  return NextResponse.json({
    diagnostics: {
      state: diagnostics.state,
      label: diagnostics.label,
      detail: diagnostics.detail,
    },
    voiceProvider: envFacts.voiceProvider,
    telephonyProvider: envFacts.telephonyProvider,
    // Sinalizadores de completude — nunca valores de credenciais.
    missingVariables: envFacts.missing,
    invalidVariables: envFacts.invalid,
    integrationImplemented: isVoiceIntegrationImplemented(),
  });
}
