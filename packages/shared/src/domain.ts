/**
 * Domínio partilhado do ORBITA CHAT.
 *
 * Estes tipos espelham o schema inicial em supabase/migrations/0001_initial_schema.sql.
 * Qualquer alteração ao schema deve ser refletida aqui e em @orbita/database.
 */

export const ORGANIZATION_ROLES = ['owner', 'admin', 'member'] as const;
export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export const AGENT_STATUSES = ['draft', 'active', 'paused', 'archived'] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

/**
 * Transições de estado permitidas para agentes (máquina de estados do produto):
 *   • draft → active | archived (publicar ou descartar rascunho);
 *   • active ↔ paused (pausar/retomar);
 *   • qualquer estado → archived (retirar do ar, sem perder histórico);
 *   • archived → draft (restaurar como rascunho).
 * Transições fora desta tabela (e no-ops) são rejeitadas no servidor.
 */
export const AGENT_STATUS_TRANSITIONS: Record<AgentStatus, readonly AgentStatus[]> = {
  draft: ['active', 'archived'],
  active: ['paused', 'archived'],
  paused: ['active', 'archived'],
  archived: ['draft'],
};

/** Determina se uma transição de estado de agente é válida. */
export function canTransitionAgentStatus(from: AgentStatus, to: AgentStatus): boolean {
  return AGENT_STATUS_TRANSITIONS[from].includes(to);
}

export const CALL_DIRECTIONS = ['inbound', 'outbound'] as const;
export type CallDirection = (typeof CALL_DIRECTIONS)[number];

export const CALL_STATUSES = [
  'queued',
  'initiating',
  'ringing',
  'in_progress',
  'completed',
  'failed',
  'busy',
  'no_answer',
  'cancelled',
  'transferred',
] as const;
export type CallStatus = (typeof CALL_STATUSES)[number];

/** Estados terminais — imutáveis na BD (trigger `calls_guard`) e no produto. */
export const TERMINAL_CALL_STATUSES = [
  'completed',
  'failed',
  'busy',
  'no_answer',
  'cancelled',
  'transferred',
] as const;

export function isTerminalCallStatus(status: CallStatus): boolean {
  return (TERMINAL_CALL_STATUSES as readonly CallStatus[]).includes(status);
}

/**
 * Máquina de estados do ciclo de vida de uma chamada:
 *
 *   queued → initiating → ringing → in_progress → completed
 *     │          │           │  └───────┼───────────┼── failed/transferred
 *     │          │           └── no_answer/busy     │
 *     └──────────┴─────────────── cancel/failed ────┘
 *
 * `cancelled` é possível de qualquer estado não terminal; estados terminais
 * não transitam. A BD impõe o piso (terminais imutáveis, sem regressão a
 * `queued`); esta tabela valida o fluxo do produto no servidor.
 */
export const CALL_STATUS_TRANSITIONS: Record<CallStatus, readonly CallStatus[]> = {
  queued: ['initiating', 'cancelled', 'failed'],
  initiating: ['ringing', 'failed', 'cancelled'],
  ringing: ['in_progress', 'no_answer', 'busy', 'failed', 'cancelled'],
  in_progress: ['completed', 'failed', 'transferred', 'cancelled'],
  completed: [],
  failed: [],
  busy: [],
  no_answer: [],
  cancelled: [],
  transferred: [],
};

/** Determina se uma transição de estado de chamada é válida no produto. */
export function canTransitionCallStatus(from: CallStatus, to: CallStatus): boolean {
  return CALL_STATUS_TRANSITIONS[from].includes(to);
}

export const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'GBP'] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface Membership {
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  createdAt: string;
}

export interface Agent {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  instructions: string;
  language: string;
  status: AgentStatus;
  /** Configuração de voz/operacional. NUNCA armazenar segredos de fornecedores. */
  voiceConfig: Record<string, unknown>;
  /** Número de entrada associado (resolução de chamadas recebidas). */
  inboundPhoneNumber: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Call {
  id: string;
  organizationId: string;
  agentId: string | null;
  provider: string | null;
  providerCallId: string | null;
  direction: CallDirection;
  status: CallStatus;
  fromNumber: string | null;
  toNumber: string | null;
  /** ID da sessão de voz em tempo real, quando aplicável. */
  voiceSessionId: string | null;
  durationSeconds: number | null;
  estimatedCost: number | null;
  currency: Currency;
  startedAt: string | null;
  /** Momento do atendimento, quando conhecido. */
  answeredAt: string | null;
  endedAt: string | null;
  /** Código e razão de falha sanitizados (sem segredos/payloads). */
  failureCode: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Rótulos PT-PT para estados de agente (uso em UI). */
export const AGENT_STATUS_LABELS: Record<AgentStatus, string> = {
  draft: 'Rascunho',
  active: 'Ativo',
  paused: 'Em pausa',
  archived: 'Arquivado',
};

/** Rótulos PT-PT para estados de chamada (uso em UI). */
export const CALL_STATUS_LABELS: Record<CallStatus, string> = {
  queued: 'Em fila',
  initiating: 'A iniciar',
  ringing: 'A tocar',
  in_progress: 'Em curso',
  completed: 'Concluída',
  failed: 'Falhada',
  busy: 'Ocupado',
  no_answer: 'Sem resposta',
  cancelled: 'Cancelada',
  transferred: 'Transferida',
};

/** Rótulos PT-PT para direção de chamada. */
export const CALL_DIRECTION_LABELS: Record<CallDirection, string> = {
  inbound: 'Recebida',
  outbound: 'Efectuada',
};
