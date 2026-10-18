/**
 * Tipos TypeScript derivados de supabase/migrations/*.sql.
 *
 * NOTA: quando o Supabase estiver configurado, regenera estes tipos com:
 *   npx supabase gen types typescript --project-id <id> > packages/database/src/database.types.ts
 *
 * Mantidos manualmente até existir projeto Supabase ligado.
 * Formato alinhado com o gerador oficial do Supabase.
 */

import type {
  Agent,
  AgentStatus,
  Appointment,
  AgentTool,
  AutomationRun,
  AutomationWorkflow,
  BusinessProfile,
  Call,
  CallDirection,
  CallEvent,
  CallStatus,
  ContactRequest,
  Currency,
  Membership,
  Organization,
  OrganizationRole,
  ToolApproval,
  ToolExecution,
} from '@orbita/shared';

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: Organization;
        Insert: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'> &
          Partial<Pick<Organization, 'id' | 'createdAt' | 'updatedAt'>>;
        Update: Partial<Organization>;
        Relationships: [];
      };
      memberships: {
        Row: Membership;
        Insert: Omit<Membership, 'createdAt'> & Partial<Pick<Membership, 'createdAt'>>;
        Update: Partial<Membership>;
        Relationships: [];
      };
      agents: {
        Row: Agent;
        Insert: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'> &
          Partial<Pick<Agent, 'id' | 'createdAt' | 'updatedAt'>>;
        Update: Partial<Agent>;
        Relationships: [];
      };
      calls: {
        Row: Call;
        Insert: Omit<Call, 'id' | 'createdAt' | 'updatedAt'> &
          Partial<Pick<Call, 'id' | 'createdAt' | 'updatedAt'>>;
        Update: Partial<Call>;
        Relationships: [];
      };
      /** Eventos de fornecedor — imutáveis; escrita apenas via servidor (service role). */
      call_events: {
        Row: CallEvent;
        Insert: Omit<CallEvent, 'id' | 'processedAt'> & Partial<Pick<CallEvent, 'id' | 'processedAt'>>;
        Update: never;
        Relationships: [];
      };
      /** Perfil público da empresa (dados autorizados para ferramentas). */
      business_profiles: {
        Row: BusinessProfile;
        Insert: BusinessProfile;
        Update: Partial<BusinessProfile>;
        Relationships: [];
      };
      contact_requests: {
        Row: ContactRequest;
        Insert: Omit<ContactRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'> &
          Partial<Pick<ContactRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>>;
        Update: Partial<ContactRequest>;
        Relationships: [];
      };
      appointments: {
        Row: Appointment;
        Insert: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'source'> &
          Partial<Pick<Appointment, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'source'>>;
        Update: Partial<Appointment>;
        Relationships: [];
      };
      agent_tools: {
        Row: AgentTool;
        Insert: Omit<AgentTool, 'createdAt' | 'updatedAt' | 'enabled' | 'config'> &
          Partial<Pick<AgentTool, 'createdAt' | 'updatedAt' | 'enabled' | 'config'>>;
        Update: Partial<AgentTool>;
        Relationships: [];
      };
      /** Execuções de ferramentas + auditoria — escrita apenas no servidor. */
      tool_executions: {
        Row: ToolExecution;
        Insert: Omit<ToolExecution, 'id' | 'createdAt' | 'updatedAt'> &
          Partial<Pick<ToolExecution, 'id' | 'createdAt' | 'updatedAt'>>;
        Update: Partial<ToolExecution>;
        Relationships: [];
      };
      tool_approvals: {
        Row: ToolApproval;
        Insert: Omit<ToolApproval, 'id' | 'createdAt' | 'status' | 'requestedAt'> &
          Partial<Pick<ToolApproval, 'id' | 'createdAt' | 'status' | 'requestedAt'>>;
        Update: Partial<ToolApproval>;
        Relationships: [];
      };
      automation_workflows: {
        Row: AutomationWorkflow;
        Insert: Omit<AutomationWorkflow, 'id' | 'createdAt' | 'updatedAt' | 'active'> &
          Partial<Pick<AutomationWorkflow, 'id' | 'createdAt' | 'updatedAt' | 'active'>>;
        Update: Partial<AutomationWorkflow>;
        Relationships: [];
      };
      /** Execuções de workflows — escrita apenas no servidor. */
      automation_runs: {
        Row: AutomationRun;
        Insert: Omit<AutomationRun, 'id' | 'createdAt' | 'startedAt'> &
          Partial<Pick<AutomationRun, 'id' | 'createdAt' | 'startedAt'>>;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      /** RPC transacional: cria organização + membership owner (auth.uid()). */
      create_organization: {
        Args: { p_name: string; p_slug: string };
        Returns: string;
      };
      is_org_member: {
        Args: { org_id: string };
        Returns: boolean;
      };
      has_org_role: {
        Args: { org_id: string; required: OrganizationRole[] };
        Returns: boolean;
      };
    };
    Enums: {
      organization_role: OrganizationRole;
      agent_status: AgentStatus;
      call_direction: CallDirection;
      call_status: CallStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type OrganizationRow = Database['public']['Tables']['organizations']['Row'];
export type MembershipRow = Database['public']['Tables']['memberships']['Row'];
export type AgentRow = Database['public']['Tables']['agents']['Row'];
export type CallRow = Database['public']['Tables']['calls']['Row'];

export type {
  Agent,
  AgentStatus,
  Call,
  CallDirection,
  CallStatus,
  Currency,
  Membership,
  Organization,
  OrganizationRole,
};
