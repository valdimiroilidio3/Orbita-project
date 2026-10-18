/**
 * Aprovações humanas de operações (PROMPT 08 §5/§13).
 *
 * As aprovações são INDEPENDENTES do modelo de IA: o modelo nunca aprova as
 * próprias operações nem reduz níveis de risco. A decisão valida utilizador,
 * organização, prazo e que a operação aprovada é exatamente a solicitada.
 */

export interface ApprovalDecisionInput {
  approvalId: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  organizationId: string;
  toolExecutionId: string;
  expiresAt: string;
  /** Organização do utilizador autenticado (sessão validada). */
  actorOrganizationId: string;
  /** Papel do utilizador nessa organização. */
  actorRole: 'owner' | 'admin' | 'member' | null;
  /** Operação que o utilizador está a decidir (deve coincidir). */
  requestedExecutionId: string;
  now: string;
  decision: 'approve' | 'reject';
}

export type ApprovalDecisionResult =
  { ok: true } | { ok: false; reason: 'unauthorized' | 'expired' | 'not_pending' | 'mismatch' };

export function evaluateApprovalDecision(input: ApprovalDecisionInput): ApprovalDecisionResult {
  if (input.actorRole !== 'owner' && input.actorRole !== 'admin') {
    return { ok: false, reason: 'unauthorized' };
  }
  if (input.organizationId !== input.actorOrganizationId) {
    return { ok: false, reason: 'unauthorized' };
  }
  if (input.requestedExecutionId !== input.toolExecutionId) {
    // Aprovar uma operação diferente da solicitada é rejeitado.
    return { ok: false, reason: 'mismatch' };
  }
  if (input.status !== 'pending') {
    return { ok: false, reason: 'not_pending' };
  }
  if (new Date(input.expiresAt).getTime() <= new Date(input.now).getTime()) {
    return { ok: false, reason: 'expired' };
  }
  return { ok: true };
}

export const APPROVAL_DECISION_ERROR_LABELS: Record<
  Exclude<ApprovalDecisionResult, { ok: true }>['reason'],
  string
> = {
  unauthorized: 'Sem permissão para decidir esta aprovação.',
  expired: 'A aprovação expirou — solicita novamente.',
  not_pending: 'Esta aprovação já foi decidida.',
  mismatch: 'A operação a decidir não corresponde à solicitada.',
};
