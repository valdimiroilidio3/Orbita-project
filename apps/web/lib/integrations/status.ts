import { isServiceRoleConfigured } from '@/lib/supabase/service';
import { isSupabaseConfigured } from '@/lib/env';
import { isVoiceIntegrationImplemented } from '@/lib/voice/adapters';
import { readVoiceEnv } from '@/lib/voice/env';

/**
 * Estado REAL das integrações — fonte única para /api/health, /integrations
 * e indicadores do dashboard. Distingue sempre:
 *   • available          — implementado e configurado
 *   • configured_untested— credenciais presentes, sem verificação operacional
 *   • not_configured     — implementado mas sem credenciais
 *   • not_implemented    — apenas contrato/abstração (scaffolding)
 *
 * Nunca expõe valores de variáveis — apenas booleanos/estados.
 */

export type IntegrationState =
  'available' | 'configured_untested' | 'not_configured' | 'not_implemented';

export interface IntegrationStatus {
  id: 'supabase' | 'service_role' | 'telephony' | 'voice_ai' | 'booking' | 'billing';
  name: string;
  description: string;
  state: IntegrationState;
  /** Explicação curta e honesta (sem segredos). */
  detail: string;
  /** Documento de configuração. */
  docs: string | null;
}

export const INTEGRATION_STATE_LABELS: Record<IntegrationState, string> = {
  available: 'Disponível',
  configured_untested: 'Configurado, mas não testado',
  not_configured: 'Não configurado',
  not_implemented: 'Não implementado',
};

export function buildIntegrationStatuses(): IntegrationStatus[] {
  const supabase = isSupabaseConfigured();
  const serviceRole = isServiceRoleConfigured();
  const voiceEnv = readVoiceEnv();
  const voiceImplemented = isVoiceIntegrationImplemented();

  const telephonyState: IntegrationState = !voiceImplemented
    ? 'not_implemented'
    : voiceEnv.envPresent
      ? 'configured_untested'
      : 'not_configured';

  return [
    {
      id: 'supabase',
      name: 'Supabase (base de dados e autenticação)',
      description: 'Organizações, membros, agentes, chamadas, ferramentas e RLS.',
      state: supabase ? 'available' : 'not_configured',
      detail: supabase
        ? 'URL e chave anónima presentes. Migrações devem estar aplicadas (docs/deployment.md).'
        : 'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY em falta — modo de demonstração.',
      docs: 'docs/deployment.md',
    },
    {
      id: 'service_role',
      name: 'Processamento privilegiado no servidor',
      description: 'Ingestão de webhooks, auditoria de ferramentas e execuções de workflows.',
      state: serviceRole ? 'available' : 'not_configured',
      detail: serviceRole
        ? 'Chave de serviço presente (apenas no servidor).'
        : 'SUPABASE_SERVICE_ROLE_KEY em falta — webhooks e execuções de ferramentas ficam indisponíveis.',
      docs: 'docs/environment-variables.md',
    },
    {
      id: 'telephony',
      name: 'Telefonia (SIP)',
      description: 'Receção de chamadas e eventos de estado via webhooks.',
      state: telephonyState,
      detail: voiceImplemented
        ? voiceEnv.envPresent
          ? 'Variáveis presentes. «Ligação verificada» só após um teste real documentado.'
          : 'Adaptador registado mas variáveis em falta.'
        : 'Contratos e pipeline de webhooks prontos; adaptador do fornecedor PENDENTE (sem credenciais).',
      docs: 'docs/voice-setup.md',
    },
    {
      id: 'voice_ai',
      name: 'Voz IA em tempo real',
      description: 'Sessão de voz bidirecional com as instruções do agente.',
      state: telephonyState,
      detail: voiceImplemented
        ? 'Adaptador registado.'
        : 'Configuração de voz validada no servidor; sessão real PENDENTE (sem fornecedor ativo).',
      docs: 'docs/voice-architecture.md',
    },
    {
      id: 'booking',
      name: 'Sistema de reservas',
      description: 'Marcações criadas pela ferramenta appointment.create.',
      state: 'configured_untested',
      detail:
        'Adaptador de DESENVOLVIMENTO (dev-adapter) grava na base de dados local — não é um sistema de reservas externo.',
      docs: 'docs/tool-integrations.md',
    },
    {
      id: 'billing',
      name: 'Faturação (Stripe)',
      description: 'Planos, utilização e pagamentos.',
      state: 'not_implemented',
      detail: 'Nenhuma integração de faturação existe. Nenhum pagamento é simulado.',
      docs: null,
    },
  ];
}
