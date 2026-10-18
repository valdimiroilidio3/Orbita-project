import type {
  InboundCallInfo,
  TelephonyProvider,
  VoiceProvider,
  VoiceSessionHandle,
} from '@/lib/voice/contracts';
import { VoiceIntegrationError } from '@/lib/voice/contracts';
import type { CallLifecycleEvent } from '@orbita/shared';

/**
 * Adaptadores PENDENTES (PROMPT 07 §3).
 *
 * Neste ambiente não existem credenciais de fornecedor nem acesso à
 * documentação oficial — a integração real fica explicitamente pendente,
 * sem inventar endpoints, modelos, nomes de eventos ou parâmetros de API.
 *
 * Para ativar a integração (ver docs/voice-setup.md):
 *   1. Confirmar na documentação oficial os payloads, eventos e esquemas
 *      de assinatura da versão utilizada;
 *   2. Implementar `OpenaiRealtimeVoiceProvider` / `SipTelephonyProvider`
 *      (ou o fornecedor escolhido) com esses contratos exatos;
 *   3. Registar os adaptadores em `apps/web/lib/voice/adapters/index.ts`.
 */

const PENDING_MESSAGE =
  'Integração de voz/telefonia pendente: fornecedor não configurado e contratos por confirmar na documentação oficial (docs/voice-setup.md). Nada é simulado.';

export class PendingVoiceProvider implements VoiceProvider {
  readonly name = 'pending';

  async startSession(): Promise<VoiceSessionHandle> {
    throw new VoiceIntegrationError('integration_not_configured', PENDING_MESSAGE);
  }

  async endSession(): Promise<void> {
    throw new VoiceIntegrationError('integration_not_configured', PENDING_MESSAGE);
  }

  async checkReadiness(): Promise<{ ready: boolean; detail: string }> {
    return { ready: false, detail: PENDING_MESSAGE };
  }
}

export class PendingTelephonyProvider implements TelephonyProvider {
  readonly name = 'pending';

  /**
   * Sem adaptador real configurado NENHUM webhook é aceite:
   * assinatura não verificável → rejeição (fail-closed).
   */
  verifyWebhookSignature(): boolean {
    return false;
  }

  parseInboundWebhook(): InboundCallInfo {
    throw new VoiceIntegrationError('integration_not_configured', PENDING_MESSAGE);
  }

  parseStatusWebhook(): CallLifecycleEvent & { callRef: string } {
    throw new VoiceIntegrationError('integration_not_configured', PENDING_MESSAGE);
  }

  async checkReadiness(): Promise<{ ready: boolean; detail: string }> {
    return { ready: false, detail: PENDING_MESSAGE };
  }
}
