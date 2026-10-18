/**
 * Tipos TypeScript derivados de supabase/migrations/0001_initial_schema.sql.
 *
 * NOTA: quando o Supabase estiver configurado, regenera estes tipos com:
 *   npx supabase gen types typescript --project-id <id> > packages/database/src/database.types.ts
 *
 * Mantidos manualmente até existir projeto Supabase ligado (Sprint 1).
 * Formato alinhado com o gerador oficial do Supabase.
 */

import type {
  Agent,
  AgentStatus,
  Call,
  CallDirection,
  CallStatus,
  Currency,
  Membership,
  Organization,
  OrganizationRole,
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
        Insert: Omit<Call, 'id' | 'createdAt'> & Partial<Pick<Call, 'id' | 'createdAt'>>;
        Update: Partial<Call>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
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
