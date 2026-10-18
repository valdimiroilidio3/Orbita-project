import type { TelephonyProvider, VoiceProvider } from '@/lib/voice/contracts';
import { PendingTelephonyProvider, PendingVoiceProvider } from '@/lib/voice/adapters/pending';

/**
 * Registo de adaptadores do motor de voz.
 *
 * A integração real está PENDENTE (PROMPT 07 §3): sem credenciais e sem
 * contratos confirmados na documentação oficial, são registados apenas os
 * adaptadores pendentes (fail-closed). Para ativar, implementar e registar
 * aqui os adaptadores reais — docs/voice-setup.md.
 */

export function isVoiceIntegrationImplemented(): boolean {
  // Torna-se `true` quando existirem adaptadores reais registados.
  return false;
}

export function getVoiceProvider(): VoiceProvider {
  return new PendingVoiceProvider();
}

export function getTelephonyProvider(): TelephonyProvider {
  return new PendingTelephonyProvider();
}
