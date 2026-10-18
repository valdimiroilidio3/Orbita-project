import {
  AGENT_STATUS_LABELS,
  canTransitionAgentStatus,
  type AgentStatus,
  type OrganizationRole,
} from '@orbita/shared';

import type { AgentSummary } from '@/lib/dashboard/types';

/**
 * Helpers puros do Agent Studio (sem dependências de servidor) —
 * utilizados pela UI, pelas server actions e pelos testes.
 */

/** Idiomas comuns oferecidos no formulário (o schema aceita outros códigos). */
export const AGENT_LANGUAGES: { value: string; label: string }[] = [
  { value: 'pt-PT', label: 'Português (Portugal)' },
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'en-US', label: 'Inglês (EUA)' },
  { value: 'en-GB', label: 'Inglês (Reino Unido)' },
  { value: 'es-ES', label: 'Espanhol' },
  { value: 'fr-FR', label: 'Francês' },
  { value: 'de-DE', label: 'Alemão' },
];

export const INSTRUCTIONS_MAX_LENGTH = 20000;

export interface AgentPermissions {
  /** Criar agentes (qualquer membro da organização). */
  canCreate: boolean;
  /** Editar campos e estados (qualquer membro da organização). */
  canEdit: boolean;
  /** Eliminar agentes (owner/admin — alinhado com as políticas RLS). */
  canDelete: boolean;
}

/**
 * Permissões de UI por papel. A autoridade continua a ser o RLS na base de
 * dados — aqui apenas se evita oferecer ações que falhariam.
 */
export function agentPermissions(role: OrganizationRole | null): AgentPermissions {
  return {
    canCreate: true,
    canEdit: true,
    canDelete: role === 'owner' || role === 'admin',
  };
}

export interface AgentStatusAction {
  status: AgentStatus;
  label: string;
  variant: 'outline' | 'danger' | 'primary';
}

/**
 * Ações de transição de estado a apresentar para um agente.
 * Apenas transições válidas (ver `canTransitionAgentStatus`).
 */
export function agentStatusActions(status: AgentStatus): AgentStatusAction[] {
  const TARGETS = ['active', 'paused', 'draft', 'archived'] as const;

  return TARGETS.filter((to) => canTransitionAgentStatus(status, to)).map((to) => {
    if (to === 'archived') return { status: to, label: 'Arquivar', variant: 'danger' as const };
    if (to === 'active') {
      return {
        status: to,
        label: status === 'draft' ? 'Publicar' : 'Retomar',
        variant: 'primary' as const,
      };
    }
    if (to === 'paused') return { status: to, label: 'Pausar', variant: 'outline' as const };
    return { status: to, label: 'Restaurar rascunho', variant: 'outline' as const };
  });
}

/** Rótulo de estado para textos acessíveis. */
export function agentStatusLabel(status: AgentStatus): string {
  return AGENT_STATUS_LABELS[status];
}

/** Converte um registo de agente (servidor/demo) para o resumo da listagem. */
export function toAgentSummary(agent: {
  id: string;
  name: string;
  description: string | null;
  language: string;
  status: AgentStatus;
}): AgentSummary {
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    language: agent.language,
    status: agent.status,
    isDemo: agent.id.startsWith('demo-'),
  };
}
