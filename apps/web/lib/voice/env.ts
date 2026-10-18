/**
 * Variáveis de ambiente do motor de voz (PROMPT 07 §12).
 *
 * Regras:
 *   • ausência de credenciais → estado explícito "não configurado",
 *     sem bloquear o resto da aplicação;
 *   • valores nunca fictícios em .env.example;
 *   • segredos APENAS no servidor (nenhum `NEXT_PUBLIC_`).
 */

export const VOICE_PROVIDER_VALUES = ['pending', 'openai-realtime', 'twilio'] as const;
export type VoiceProviderName = (typeof VOICE_PROVIDER_VALUES)[number];

export const TELEPHONY_PROVIDER_VALUES = ['pending', 'sip', 'twilio'] as const;
export type TelephonyProviderName = (typeof TELEPHONY_PROVIDER_VALUES)[number];

export interface VoiceEnvFacts {
  /** Fornecedor de voz/telefonia selecionado e credenciais base presentes. */
  envPresent: boolean;
  /** Formato/valores das variáveis válidos. */
  envValid: boolean;
  voiceProvider: VoiceProviderName | null;
  telephonyProvider: TelephonyProviderName | null;
  missing: string[];
  invalid: string[];
}

type EnvSource = Record<string, string | undefined>;

function readProviderName(
  raw: string | undefined,
  allowed: readonly string[],
  invalid: string[],
  key: string,
): string | null {
  const value = raw?.trim();
  if (!value || value === 'pending') return null;
  if (!allowed.includes(value)) {
    invalid.push(key);
    return null;
  }
  return value;
}

export function readVoiceEnv(env: EnvSource = process.env): VoiceEnvFacts {
  const missing: string[] = [];
  const invalid: string[] = [];

  const voiceProvider = readProviderName(
    env.VOICE_PROVIDER,
    VOICE_PROVIDER_VALUES,
    invalid,
    'VOICE_PROVIDER',
  );
  const telephonyProvider = readProviderName(
    env.TELEPHONY_PROVIDER,
    TELEPHONY_PROVIDER_VALUES,
    invalid,
    'TELEPHONY_PROVIDER',
  );

  if (voiceProvider === 'openai-realtime' && !env.OPENAI_API_KEY?.trim()) {
    missing.push('OPENAI_API_KEY');
  }
  if (telephonyProvider && !env.TELEPHONY_WEBHOOK_SECRET?.trim()) {
    missing.push('TELEPHONY_WEBHOOK_SECRET');
  }
  if (telephonyProvider === 'twilio') {
    if (!env.TWILIO_ACCOUNT_SID?.trim()) missing.push('TWILIO_ACCOUNT_SID');
    if (!env.TWILIO_AUTH_TOKEN?.trim()) missing.push('TWILIO_AUTH_TOKEN');
  }

  const selectedSomething = Boolean(voiceProvider || telephonyProvider);
  return {
    envPresent: selectedSomething && missing.length === 0,
    envValid: invalid.length === 0 && (selectedSomething ? missing.length === 0 : true),
    voiceProvider: (voiceProvider as VoiceProviderName | null) ?? null,
    telephonyProvider: (telephonyProvider as TelephonyProviderName | null) ?? null,
    missing,
    invalid,
  };
}
