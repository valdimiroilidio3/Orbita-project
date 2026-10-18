-- ============================================================
-- ORBITA CHAT — Schema inicial (Sprint 1)
-- Base de suporte a organizações, utilizadores, agentes e chamadas,
-- sem antecipar toda a complexidade futura.
--
-- NOTA: este schema é uma BASE INICIAL, não configuração de produção.
-- As políticas RLS abaixo permitem leitura a membros da organização,
-- mas NÃO implementam ainda as regras completas de escrita por função.
-- Antes de permitir escrita: políticas INSERT/UPDATE/DELETE adequadas,
-- validação de owner/admin, processo seguro de criação de organizações
-- e isolamento de todos os novos recursos.
-- ============================================================

create extension if not exists pgcrypto;

create type public.organization_role as enum (
  'owner',
  'admin',
  'member'
);

create type public.agent_status as enum (
  'draft',
  'active',
  'paused',
  'archived'
);

create type public.call_direction as enum (
  'inbound',
  'outbound'
);

create type public.call_status as enum (
  'queued',
  'initiating',
  'ringing',
  'in_progress',
  'completed',
  'failed',
  'busy',
  'no_answer',
  'cancelled',
  'transferred'
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  user_id uuid not null
    references auth.users(id) on delete cascade,
  role public.organization_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  instructions text not null default '',
  language text not null default 'pt-PT',
  status public.agent_status not null default 'draft',
  configuration jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);

create table public.calls (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  agent_id uuid,
  provider text,
  provider_call_id text,
  direction public.call_direction not null,
  status public.call_status not null default 'queued',
  from_number text,
  to_number text,
  duration_seconds integer,
  estimated_cost numeric(12, 6),
  currency char(3) not null default 'EUR',
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),

  foreign key (organization_id, agent_id)
    references public.agents(organization_id, id)
    on delete set null (agent_id),

  unique (provider, provider_call_id),
  check (duration_seconds is null or duration_seconds >= 0),
  check (estimated_cost is null or estimated_cost >= 0)
);

create index agents_org_created_idx
  on public.agents (organization_id, created_at desc);

create index calls_org_created_idx
  on public.calls (organization_id, created_at desc);

create index calls_org_status_idx
  on public.calls (organization_id, status);

alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.agents enable row level security;
alter table public.calls enable row level security;

create policy "Members can view their organizations"
on public.organizations
for select to authenticated
using (
  exists (
    select 1 from public.memberships m
    where m.organization_id = organizations.id
      and m.user_id = (select auth.uid())
  )
);

create policy "Members can view memberships in their organizations"
on public.memberships
for select to authenticated
using (
  exists (
    select 1 from public.memberships m
    where m.organization_id = memberships.organization_id
      and m.user_id = (select auth.uid())
  )
);

create policy "Members can view their agents"
on public.agents
for select to authenticated
using (
  exists (
    select 1 from public.memberships m
    where m.organization_id = agents.organization_id
      and m.user_id = (select auth.uid())
  )
);

create policy "Members can view their calls"
on public.calls
for select to authenticated
using (
  exists (
    select 1 from public.memberships m
    where m.organization_id = calls.organization_id
      and m.user_id = (select auth.uid())
  )
);
