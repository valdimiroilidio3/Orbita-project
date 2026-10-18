import type {
  AutomationRunStatus,
  AutomationTrigger,
  ToolExecutionStatus,
  ToolRiskLevel,
} from './tools';

/** Perfil público da empresa (dados autorizados das ferramentas de consulta). */
export interface BusinessProfile {
  organizationId: string;
  displayName: string;
  timezone: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  prices: string | null;
  faq: string | null;
  policies: string | null;
  hoursText: string;
  servicesText: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactRequest {
  id: string;
  organizationId: string;
  callId: string | null;
  name: string | null;
  phone: string;
  reason: string;
  preferredPeriod: string | null;
  status: 'open' | 'contacted' | 'closed';
  idempotencyKey: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  organizationId: string;
  callId: string | null;
  service: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  customerName: string | null;
  customerPhone: string;
  status: 'confirmed' | 'cancelled';
  /** Adaptador de reservas ('dev-adapter' = desenvolvimento, nunca real). */
  source: string;
  externalRef: string | null;
  idempotencyKey: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentTool {
  organizationId: string;
  agentId: string;
  toolId: string;
  enabled: boolean;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ToolExecution {
  id: string;
  organizationId: string;
  agentId: string | null;
  callId: string | null;
  toolId: string;
  status: ToolExecutionStatus;
  risk: ToolRiskLevel;
  args: Record<string, unknown>;
  result: Record<string, unknown> | null;
  resultMessage: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  idempotencyKey: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ToolApproval {
  id: string;
  organizationId: string;
  toolExecutionId: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  requestedAt: string;
  expiresAt: string;
  decidedBy: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export interface AutomationWorkflow {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  active: boolean;
  trigger: AutomationTrigger;
  steps: { toolId: string; args: Record<string, unknown> }[];
  timeoutSeconds: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationRun {
  id: string;
  organizationId: string;
  workflowId: string;
  trigger: AutomationTrigger;
  triggerKey: string;
  status: AutomationRunStatus;
  stepsResult: { toolId: string; status: string; message: string }[];
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
  createdAt: string;
}
