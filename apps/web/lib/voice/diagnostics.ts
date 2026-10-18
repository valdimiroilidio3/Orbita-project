/**
 * Diagnóstico do motor de voz (PROMPT 07 §11).
 *
 * Estados possíveis — NUNCA apresentar "Ligação verificada" sem um teste
 * real bem-sucedido documentado (aqui: uma chamada real concluída com
 * sessão de voz persistida):
 *
 *   nao_configurado        — faltam credenciais/configuração
 *   falha_configuracao     — configuração presente mas inválida
 *   configurado_nao_testado— configurado, integração ainda pendente/não testada
 *   pronto_para_teste      — integração ativa e pronta, sem teste real concluído
 *   ligacao_verificada     — existe chamada real concluída com sessão de voz
 *   indisponivel           — fornecedor inacessível/falha a verificar
 */

export type VoiceDiagnosticsState =
  | 'nao_configurado'
  | 'falha_configuracao'
  | 'configurado_nao_testado'
  | 'pronto_para_teste'
  | 'ligacao_verificada'
  | 'indisponivel';

export interface VoiceDiagnosticsFacts {
  /** Variáveis de ambiente do fornecedor presentes. */
  envPresent: boolean;
  /** Validação de formato das variáveis passou. */
  envValid: boolean;
  /** Adaptadores reais registados (integração deixou de estar pendente). */
  integrationImplemented: boolean;
  /** Último check do fornecedor (null = nunca verificado). */
  providerCheck: { ready: boolean; detail: string } | null;
  /** Existe chamada real (não simulada) concluída com sessão de voz. */
  hasVerifiedRealCall: boolean;
}

export interface VoiceDiagnostics {
  state: VoiceDiagnosticsState;
  label: string;
  detail: string;
}

const LABELS: Record<VoiceDiagnosticsState, string> = {
  nao_configurado: 'Não configurado',
  falha_configuracao: 'Falha de configuração',
  configurado_nao_testado: 'Configurado, mas não testado',
  pronto_para_teste: 'Pronto para teste',
  ligacao_verificada: 'Ligação verificada',
  indisponivel: 'Indisponível',
};

export function deriveVoiceDiagnostics(facts: VoiceDiagnosticsFacts): VoiceDiagnostics {
  if (!facts.envPresent) {
    return {
      state: 'nao_configurado',
      label: LABELS.nao_configurado,
      detail:
        'Faltam as variáveis de ambiente do fornecedor de voz/telefonia (docs/voice-setup.md).',
    };
  }

  if (!facts.envValid) {
    return {
      state: 'falha_configuracao',
      label: LABELS.falha_configuracao,
      detail: 'As variáveis de ambiente existem mas têm formato inválido.',
    };
  }

  if (facts.hasVerifiedRealCall) {
    return {
      state: 'ligacao_verificada',
      label: LABELS.ligacao_verificada,
      detail: 'Existe uma chamada real concluída com sessão de voz — ligação verificada.',
    };
  }

  if (!facts.integrationImplemented) {
    return {
      state: 'configurado_nao_testado',
      label: LABELS.configurado_nao_testado,
      detail:
        'Credenciais presentes, mas a integração do fornecedor está pendente (adaptador por implementar — docs/voice-architecture.md).',
    };
  }

  if (facts.providerCheck && !facts.providerCheck.ready) {
    return {
      state: 'indisponivel',
      label: LABELS.indisponivel,
      detail: facts.providerCheck.detail,
    };
  }

  return {
    state: 'pronto_para_teste',
    label: LABELS.pronto_para_teste,
    detail: 'Integração ativa e configurada. Nenhum teste real concluído ainda.',
  };
}
