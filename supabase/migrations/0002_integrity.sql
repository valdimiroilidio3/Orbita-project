-- ============================================================
-- ORBITA CHAT — 0002: Integridade, timestamps e proteções
--
-- Objetivo: reforçar o schema inicial (0001) com:
--   • updated_at consistente (triggers) em todas as tabelas
--   • agents.configuration → agents.voice_config (JSON validado, sem segredos)
--   • CHECKs de coerência (timestamps, duração, tamanho de instruções)
--   • unicidade do identificador do fornecedor POR ORGANIZAÇÃO
--   • imutabilidade de organization_id (anti-transferência entre tenants)
--   • guarda de transições de estado em calls
--   • guarda de memberships (roles não auto-atribuídas; último owner retido)
--   • índices para as pesquisas mais prováveis
--
-- Idempotente: pode ser reaplicada sem erro.
-- ============================================================

-- ── updated_at consistente ──────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

drop trigger if exists agents_set_updated_at on public.agents;
create trigger agents_set_updated_at
before update on public.agents
for each row execute function public.set_updated_at();

-- ── memberships: guarda de roles e retenção do último owner ──
create or replace function public.memberships_guard()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  caller_role public.organization_role;
begin
  if tg_op = 'UPDATE' then
    -- Registo não pode migrar de organização nem de utilizador.
    if new.organization_id is distinct from old.organization_id
      or new.user_id is distinct from old.user_id then
      raise exception 'membership: organização/utilizador são imutáveis';
    end if;

    -- Ninguém altera a própria role (nem owner).
    if old.user_id = caller_id then
      raise exception 'membership: não é permitido alterar a própria role';
    end if;

    select m.role into caller_role
    from public.memberships m
    where m.organization_id = old.organization_id and m.user_id = caller_id;

    -- Apenas o owner atribui a role owner.
    if new.role = 'owner' and caller_role is distinct from 'owner'::public.organization_role then
      raise exception 'membership: apenas o owner atribui a role owner';
    end if;

    -- Apenas o owner altera a role de outro owner.
    if old.role = 'owner'::public.organization_role
      and caller_role is distinct from 'owner'::public.organization_role then
      raise exception 'membership: apenas o owner altera a role de um owner';
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.role = 'owner'::public.organization_role then
      -- Último owner nunca é removido (nem por si próprio).
      if not exists (
        select 1 from public.memberships m
        where m.organization_id = old.organization_id
          and m.role = 'owner'::public.organization_role
          and m.user_id is distinct from old.user_id
      ) then
        raise exception 'membership: não é possível remover o último owner da organização';
      end if;

      -- Admin não remove owners.
      select m.role into caller_role
      from public.memberships m
      where m.organization_id = old.organization_id and m.user_id = caller_id;

      if caller_role is distinct from 'owner'::public.organization_role then
        raise exception 'membership: apenas o owner remove um owner';
      end if;
    end if;

    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists memberships_guard on public.memberships;
create trigger memberships_guard
before update or delete on public.memberships
for each row execute function public.memberships_guard();

-- ── agents: voice_config + limites ──────────────────────────
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'agents' and column_name = 'configuration'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'agents' and column_name = 'voice_config'
  ) then
    alter table public.agents rename column configuration to voice_config;
  end if;
end;
$$;

alter table public.agents
  alter column voice_config set default '{}'::jsonb;

alter table public.agents drop constraint if exists agents_voice_config_is_object;
alter table public.agents
  add constraint agents_voice_config_is_object
  check (jsonb_typeof(voice_config) = 'object');

alter table public.agents drop constraint if exists agents_instructions_length;
alter table public.agents
  add constraint agents_instructions_length
  check (char_length(instructions) <= 20000);

alter table public.agents drop constraint if exists agents_name_length;
alter table public.agents
  add constraint agents_name_length
  check (char_length(btrim(name)) between 1 and 120);

-- ── agents: anti-transferência entre organizações ───────────
create or replace function public.agents_guard()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.organization_id is distinct from old.organization_id then
      raise exception 'agent: organization_id não pode ser alterado (transferência entre tenants)';
    end if;
    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists agents_guard on public.agents;
create trigger agents_guard
before update on public.agents
for each row execute function public.agents_guard();

-- ── calls: updated_at, checks, unicidade por organização ────
alter table public.calls
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists calls_set_updated_at on public.calls;
create trigger calls_set_updated_at
before update on public.calls
for each row execute function public.set_updated_at();

alter table public.calls drop constraint if exists calls_timestamps_coherent;
alter table public.calls
  add constraint calls_timestamps_coherent
  check (started_at is null or ended_at is null or started_at <= ended_at);

alter table public.calls drop constraint if exists calls_currency_length;
alter table public.calls
  add constraint calls_currency_length
  check (char_length(currency) = 3);

-- Unicidade do identificador do fornecedor no contexto da organização.
do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where rel.relname = 'calls'
      and nsp.nspname = 'public'
      and con.contype = 'u'
  loop
    execute format('alter table public.calls drop constraint %I', c.conname);
  end loop;
end;
$$;

alter table public.calls
  add constraint calls_org_provider_call_unique
  unique (organization_id, provider, provider_call_id);

-- ── calls: anti-transferência + transições de estado ────────
create or replace function public.calls_guard()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.organization_id is distinct from old.organization_id then
      raise exception 'call: organization_id não pode ser alterado (transferência entre tenants)';
    end if;

    if old.status is distinct from new.status then
      -- Estados terminais não mudam (histórico operacional/financeiro).
      if old.status in (
        'completed'::public.call_status,
        'failed'::public.call_status,
        'busy'::public.call_status,
        'no_answer'::public.call_status,
        'cancelled'::public.call_status,
        'transferred'::public.call_status
      ) then
        raise exception 'call: estado terminal (%) não pode transitar para %', old.status, new.status;
      end if;

      -- Sem regressão para a fila.
      if new.status = 'queued'::public.call_status
        and old.status is distinct from 'queued'::public.call_status then
        raise exception 'call: não é permitido voltar a queued';
      end if;
    end if;

    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists calls_guard on public.calls;
create trigger calls_guard
before update on public.calls
for each row execute function public.calls_guard();

-- ── Índices para as pesquisas mais prováveis ────────────────
create index if not exists memberships_user_idx
  on public.memberships (user_id);

create index if not exists calls_org_started_idx
  on public.calls (organization_id, started_at desc);

create index if not exists calls_org_agent_created_idx
  on public.calls (organization_id, agent_id, created_at desc);

create index if not exists agents_org_status_idx
  on public.agents (organization_id, status);
