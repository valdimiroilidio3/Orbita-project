-- 0005_tools_automations.sql — AI Tool Calling, automações e ações empresariais (PROMPT 08)
--
-- Tabelas: business_profiles, contact_requests, appointments, agent_tools,
--          tool_executions, tool_approvals, automation_workflows, automation_runs.
--
-- Princípios:
--   • toda a entidade de cliente está associada a uma organização;
--   • RLS por membership; escrita privilegiada (tool_executions/automation_runs)
--     acontece no servidor com verificações explícitas de autorização;
--   • idempotência: chaves únicas para pedidos de contacto, marcações,
--     execuções e execuções de workflow;
--   • sem segredos de integrações nestas tabelas.
--
-- ⚠️ ESTADO: migração criada no repositório — NÃO aplicada a nenhuma
-- instância Supabase neste ambiente (ver docs/tool-integrations.md).

-- ── business_profiles: informação pública autorizada da empresa ──

create table if not exists public.business_profiles (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  display_name text not null default '',
  timezone text not null default 'Europe/Lisbon',
  address text,
  phone text,
  email text,
  prices text,
  faq text,
  policies text,
  hours_text text not null default '',
  services_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_profiles_timezone_len_chk check (length(timezone) <= 64),
  constraint business_profiles_text_len_chk check (
    coalesce(length(address), 0) <= 300 and
    coalesce(length(prices), 0) <= 2000 and
    coalesce(length(faq), 0) <= 4000 and
    coalesce(length(policies), 0) <= 2000 and
    length(hours_text) <= 1000 and
    length(services_text) <= 2000
  )
);

-- ── contact_requests: pedidos de contacto (ferramenta C) ──────

create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  call_id uuid,
  name text,
  phone text not null check (length(phone) between 5 and 32),
  reason text not null check (length(reason) between 1 and 500),
  preferred_period text,
  status text not null default 'open' check (status in ('open', 'contacted', 'closed')),
  -- Idempotência: repetir o mesmo pedido não cria duplicados.
  idempotency_key text not null check (length(idempotency_key) between 1 and 128),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contact_requests_call_org_fk
    foreign key (organization_id, call_id)
    references public.calls (organization_id, id)
    on delete set null
);

create unique index if not exists contact_requests_idem_uidx
  on public.contact_requests (organization_id, idempotency_key);

create index if not exists contact_requests_org_created_idx
  on public.contact_requests (organization_id, created_at desc);

-- ── appointments: marcações (ferramenta D) ───────────────────
-- `source` identifica o adaptador de reservas: 'dev-adapter' é um
-- adaptador de DESENVOLVIMENTO explicitamente identificado — nunca
-- apresentado como reserva real de um sistema externo.

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  call_id uuid,
  service text not null check (length(service) between 1 and 120),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null check (length(timezone) <= 64),
  customer_name text,
  customer_phone text not null check (length(customer_phone) between 5 and 32),
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  source text not null default 'dev-adapter' check (length(source) <= 32),
  external_ref text check (external_ref is null or length(external_ref) <= 128),
  idempotency_key text not null check (length(idempotency_key) between 1 and 128),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_time_coherence_chk check (ends_at > starts_at),
  constraint appointments_call_org_fk
    foreign key (organization_id, call_id)
    references public.calls (organization_id, id)
    on delete set null
);

create unique index if not exists appointments_idem_uidx
  on public.appointments (organization_id, idempotency_key);

-- Proteção contra marcações duplicadas: um horário confirmado é único
-- por serviço/organização.
create unique index if not exists appointments_slot_uidx
  on public.appointments (organization_id, service, starts_at)
  where status = 'confirmed';

create index if not exists appointments_org_starts_idx
  on public.appointments (organization_id, starts_at);

-- ── agent_tools: ferramentas autorizadas por agente ───────────

create table if not exists public.agent_tools (
  organization_id uuid not null,
  agent_id uuid not null,
  tool_id text not null check (length(tool_id) between 1 and 64),
  enabled boolean not null default true,
  -- Configuração operacional (ex.: exigir aprovação). NUNCA segredos.
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (agent_id, tool_id),
  constraint agent_tools_agent_org_fk
    foreign key (organization_id, agent_id)
    references public.agents (organization_id, id)
    on delete cascade,
  constraint agent_tools_config_size_chk check (pg_column_size(config) <= 2048)
);

-- ── tool_executions: execuções + trilha de auditoria ──────────
-- Imutável no essencial; escrita apenas no servidor (verificação explícita
-- de autorização antes de cada inserção). Leitura para membros.

create table if not exists public.tool_executions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  agent_id uuid,
  call_id uuid,
  tool_id text not null check (length(tool_id) between 1 and 64),
  status text not null check (
    status in ('pending', 'awaiting_approval', 'running', 'succeeded', 'failed', 'canceled', 'timed_out')
  ),
  risk text not null default 'low' check (risk in ('low', 'moderate', 'high')),
  args jsonb not null default '{}'::jsonb,
  result jsonb,
  result_message text check (result_message is null or length(result_message) <= 500),
  error_code text check (error_code is null or length(error_code) <= 64),
  error_message text check (error_message is null or length(error_message) <= 500),
  idempotency_key text check (idempotency_key is null or length(idempotency_key) <= 128),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tool_executions_args_size_chk check (pg_column_size(args) <= 8192),
  constraint tool_executions_call_org_fk
    foreign key (organization_id, call_id)
    references public.calls (organization_id, id)
    on delete set null
);

create unique index if not exists tool_executions_idem_uidx
  on public.tool_executions (organization_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists tool_executions_org_created_idx
  on public.tool_executions (organization_id, created_at desc);

create index if not exists tool_executions_call_created_idx
  on public.tool_executions (call_id, created_at);

-- ── tool_approvals: aprovações humanas independentes do modelo ──

create table if not exists public.tool_approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  tool_execution_id uuid not null references public.tool_executions (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'expired')),
  requested_at timestamptz not null default now(),
  expires_at timestamptz not null,
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists tool_approvals_execution_uidx
  on public.tool_approvals (tool_execution_id);

create index if not exists tool_approvals_org_status_idx
  on public.tool_approvals (organization_id, status);

-- ── automation_workflows: workflows empresariais ──────────────

create table if not exists public.automation_workflows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  description text check (description is null or length(description) <= 500),
  active boolean not null default true,
  trigger text not null check (length(trigger) between 1 and 64),
  steps jsonb not null check (
    jsonb_typeof(steps) = 'array'
    and jsonb_array_length(steps) between 1 and 5
  ),
  timeout_seconds integer not null default 30 check (timeout_seconds between 5 and 120),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint automation_workflows_steps_size_chk check (pg_column_size(steps) <= 8192)
);

create index if not exists automation_workflows_org_active_idx
  on public.automation_workflows (organization_id, active);

-- ── automation_runs: execuções dos workflows ──────────────────
-- Deduplicação: unique (workflow_id, trigger_key) impede reentrada e
-- reativação indevida.

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  workflow_id uuid not null references public.automation_workflows (id) on delete cascade,
  trigger text not null check (length(trigger) between 1 and 64),
  trigger_key text not null check (length(trigger_key) between 1 and 160),
  status text not null check (status in ('running', 'succeeded', 'partial', 'failed', 'timed_out')),
  steps_result jsonb not null default '[]'::jsonb,
  error_message text check (error_message is null or length(error_message) <= 500),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists automation_runs_trigger_uidx
  on public.automation_runs (workflow_id, trigger_key);

create index if not exists automation_runs_org_started_idx
  on public.automation_runs (organization_id, started_at desc);

-- ── updated_at + imutabilidade de organização ─────────────────

-- updated_at por trigger (padrão da migração 0002).
do $$
declare
  t text;
begin
  foreach t in array array[
    'business_profiles', 'contact_requests', 'appointments',
    'agent_tools', 'tool_executions', 'automation_workflows'
  ]
  loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', t, t);
    execute format(
      'create trigger %I_set_updated_at before update on public.%I
       for each row execute function public.set_updated_at()',
      t, t
    );
  end loop;
end;
$$;

-- Guarda dedicada: organization_id imutável em todas as entidades novas.
create or replace function public.org_guard()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.organization_id is distinct from old.organization_id then
      raise exception '%: organization_id não pode ser alterado (transferência entre tenants)', tg_table_name;
    end if;
    return new;
  end if;
  return null;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'contact_requests', 'appointments', 'agent_tools',
    'tool_executions', 'tool_approvals', 'automation_workflows', 'automation_runs'
  ]
  loop
    execute format('drop trigger if exists %I_org_guard on public.%I', t, t);
    execute format(
      'create trigger %I_org_guard before update on public.%I
       for each row execute function public.org_guard()',
      t, t
    );
  end loop;
end;
$$;

-- ── RLS ───────────────────────────────────────────────────────
-- Denegação por omissão. Escrita privilegiada de tool_executions e
-- automation_runs acontece APENAS no servidor (verificação explícita de
-- autorização — docs/tool-security.md).

alter table public.business_profiles enable row level security;
alter table public.contact_requests enable row level security;
alter table public.appointments enable row level security;
alter table public.agent_tools enable row level security;
alter table public.tool_executions enable row level security;
alter table public.tool_approvals enable row level security;
alter table public.automation_workflows enable row level security;
alter table public.automation_runs enable row level security;

-- business_profiles
drop policy if exists "Members can view business profile" on public.business_profiles;
create policy "Members can view business profile"
on public.business_profiles for select to authenticated
using (
  exists (select 1 from public.memberships m
    where m.organization_id = business_profiles.organization_id and m.user_id = (select auth.uid()))
);

drop policy if exists "Owners and admins manage business profile" on public.business_profiles;
create policy "Owners and admins manage business profile"
on public.business_profiles for insert to authenticated
with check (
  exists (select 1 from public.memberships m
    where m.organization_id = business_profiles.organization_id and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin'))
);

drop policy if exists "Owners and admins update business profile" on public.business_profiles;
create policy "Owners and admins update business profile"
on public.business_profiles for update to authenticated
using (
  exists (select 1 from public.memberships m
    where m.organization_id = business_profiles.organization_id and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin'))
)
with check (
  exists (select 1 from public.memberships m
    where m.organization_id = business_profiles.organization_id and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin'))
);

-- contact_requests
drop policy if exists "Members can view contact requests" on public.contact_requests;
create policy "Members can view contact requests"
on public.contact_requests for select to authenticated
using (
  exists (select 1 from public.memberships m
    where m.organization_id = contact_requests.organization_id and m.user_id = (select auth.uid()))
);

drop policy if exists "Members can create contact requests" on public.contact_requests;
create policy "Members can create contact requests"
on public.contact_requests for insert to authenticated
with check (
  exists (select 1 from public.memberships m
    where m.organization_id = contact_requests.organization_id and m.user_id = (select auth.uid()))
);

drop policy if exists "Members can update contact requests" on public.contact_requests;
create policy "Members can update contact requests"
on public.contact_requests for update to authenticated
using (
  exists (select 1 from public.memberships m
    where m.organization_id = contact_requests.organization_id and m.user_id = (select auth.uid()))
);

-- appointments
drop policy if exists "Members can view appointments" on public.appointments;
create policy "Members can view appointments"
on public.appointments for select to authenticated
using (
  exists (select 1 from public.memberships m
    where m.organization_id = appointments.organization_id and m.user_id = (select auth.uid()))
);

drop policy if exists "Members can create appointments" on public.appointments;
create policy "Members can create appointments"
on public.appointments for insert to authenticated
with check (
  exists (select 1 from public.memberships m
    where m.organization_id = appointments.organization_id and m.user_id = (select auth.uid()))
);

drop policy if exists "Members can update appointments" on public.appointments;
create policy "Members can update appointments"
on public.appointments for update to authenticated
using (
  exists (select 1 from public.memberships m
    where m.organization_id = appointments.organization_id and m.user_id = (select auth.uid()))
);

-- agent_tools (autorização de ferramentas: só owner/admin altera)
drop policy if exists "Members can view agent tools" on public.agent_tools;
create policy "Members can view agent tools"
on public.agent_tools for select to authenticated
using (
  exists (select 1 from public.memberships m
    where m.organization_id = agent_tools.organization_id and m.user_id = (select auth.uid()))
);

drop policy if exists "Owners and admins manage agent tools" on public.agent_tools;
create policy "Owners and admins manage agent tools"
on public.agent_tools for insert to authenticated
with check (
  exists (select 1 from public.memberships m
    where m.organization_id = agent_tools.organization_id and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin'))
);

drop policy if exists "Owners and admins update agent tools" on public.agent_tools;
create policy "Owners and admins update agent tools"
on public.agent_tools for update to authenticated
using (
  exists (select 1 from public.memberships m
    where m.organization_id = agent_tools.organization_id and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin'))
);

drop policy if exists "Owners and admins delete agent tools" on public.agent_tools;
create policy "Owners and admins delete agent tools"
on public.agent_tools for delete to authenticated
using (
  exists (select 1 from public.memberships m
    where m.organization_id = agent_tools.organization_id and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin'))
);

-- tool_executions: apenas LEITURA para membros (escrita no servidor)
drop policy if exists "Members can view tool executions" on public.tool_executions;
create policy "Members can view tool executions"
on public.tool_executions for select to authenticated
using (
  exists (select 1 from public.memberships m
    where m.organization_id = tool_executions.organization_id and m.user_id = (select auth.uid()))
);

-- tool_approvals: membros veem; owner/admin decidem (validado no serviço)
drop policy if exists "Members can view tool approvals" on public.tool_approvals;
create policy "Members can view tool approvals"
on public.tool_approvals for select to authenticated
using (
  exists (select 1 from public.memberships m
    where m.organization_id = tool_approvals.organization_id and m.user_id = (select auth.uid()))
);

drop policy if exists "Owners and admins decide tool approvals" on public.tool_approvals;
create policy "Owners and admins decide tool approvals"
on public.tool_approvals for update to authenticated
using (
  exists (select 1 from public.memberships m
    where m.organization_id = tool_approvals.organization_id and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin'))
)
with check (
  exists (select 1 from public.memberships m
    where m.organization_id = tool_approvals.organization_id and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin'))
);

-- automation_workflows
drop policy if exists "Members can view automation workflows" on public.automation_workflows;
create policy "Members can view automation workflows"
on public.automation_workflows for select to authenticated
using (
  exists (select 1 from public.memberships m
    where m.organization_id = automation_workflows.organization_id and m.user_id = (select auth.uid()))
);

drop policy if exists "Owners and admins manage automation workflows" on public.automation_workflows;
create policy "Owners and admins manage automation workflows"
on public.automation_workflows for insert to authenticated
with check (
  exists (select 1 from public.memberships m
    where m.organization_id = automation_workflows.organization_id and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin'))
);

drop policy if exists "Owners and admins update automation workflows" on public.automation_workflows;
create policy "Owners and admins update automation workflows"
on public.automation_workflows for update to authenticated
using (
  exists (select 1 from public.memberships m
    where m.organization_id = automation_workflows.organization_id and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin'))
);

drop policy if exists "Owners and admins delete automation workflows" on public.automation_workflows;
create policy "Owners and admins delete automation workflows"
on public.automation_workflows for delete to authenticated
using (
  exists (select 1 from public.memberships m
    where m.organization_id = automation_workflows.organization_id and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin'))
);

-- automation_runs: apenas LEITURA para membros (escrita no servidor)
drop policy if exists "Members can view automation runs" on public.automation_runs;
create policy "Members can view automation runs"
on public.automation_runs for select to authenticated
using (
  exists (select 1 from public.memberships m
    where m.organization_id = automation_runs.organization_id and m.user_id = (select auth.uid()))
);
