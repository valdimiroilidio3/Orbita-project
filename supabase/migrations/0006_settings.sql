-- ============================================================
-- 0006 — Definições: preferências pessoais, definições da organização
--        e listagem segura de membros.
--
-- Estado: CRIADA (sintaxe validada). NÃO APLICADA em nenhum ambiente.
--
-- Decisões:
--  • Não duplicar `business_profiles` (nome comercial, fuso, contacto já
--    vivem lá) nem `organizations` (nome). Aqui só o que não existia.
--  • `user_preferences` é pessoal (1 linha por utilizador, sem org).
--  • `organization_settings` guarda defaults globais de voz e notificações
--    da organização. Gravação desativada por defeito; nunca sobrepõe a
--    configuração individual dos agentes (aplicada só quando o agente não define).
--  • `list_organization_members` é SECURITY DEFINER porque `auth.users`
--    não é acessível por RLS; valida sempre a pertença do chamador.
-- ============================================================

-- user_preferences ----------------------------------------------
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  locale text not null default 'pt-PT'
    check (locale in ('pt-PT', 'en')),
  timezone text not null default 'Europe/Lisbon'
    check (char_length(timezone) between 1 and 64),
  theme text not null default 'system'
    check (theme in ('light', 'dark', 'system')),
  date_format text not null default 'dd/MM/yyyy'
    check (date_format in ('dd/MM/yyyy', 'yyyy-MM-dd')),
  time_format text not null default '24h'
    check (time_format in ('24h', '12h')),
  -- Preferências de notificação pessoais (canal email). O ENVIO depende de
  -- integração de email ainda inexistente — guardar não implica enviar.
  notify_failed_calls boolean not null default true,
  notify_activity_digest boolean not null default false,
  notify_usage_reports boolean not null default false,
  notify_integration_alerts boolean not null default true,
  notify_platform_updates boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.user_preferences;
create trigger set_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

alter table public.user_preferences enable row level security;

drop policy if exists "Users read own preferences" on public.user_preferences;
create policy "Users read own preferences"
on public.user_preferences for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Users insert own preferences" on public.user_preferences;
create policy "Users insert own preferences"
on public.user_preferences for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users update own preferences" on public.user_preferences;
create policy "Users update own preferences"
on public.user_preferences for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- organization_settings -----------------------------------------
create table if not exists public.organization_settings (
  organization_id uuid primary key
    references public.organizations(id) on delete cascade,
  website text
    check (website is null or website ~* '^https?://[^\s]{1,250}$'),
  country text
    check (country is null or country ~ '^[A-Z]{2}$'),
  -- Voz (defaults globais; o agente pode sobrepor nas suas definições)
  default_language text not null default 'pt-PT'
    check (default_language in ('pt-PT', 'pt-BR', 'en-US', 'en-GB', 'es-ES', 'fr-FR')),
  max_call_duration_seconds integer
    check (max_call_duration_seconds is null
           or max_call_duration_seconds between 60 and 3600),
  recording_enabled boolean not null default false,
  retention_days integer
    check (retention_days is null or retention_days between 1 and 3650),
  -- Notificações da organização (canal email; envio depende de integração)
  notify_failed_calls boolean not null default true,
  notify_integration_alerts boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.organization_settings;
create trigger set_updated_at
before update on public.organization_settings
for each row execute function public.set_updated_at();

-- organization_id imutável (mesma regra do org_guard das restantes tabelas)
create or replace function public.organization_settings_guard()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id then
    raise exception 'organization_settings: organização é imutável';
  end if;
  return new;
end;
$$;

drop trigger if exists organization_settings_guard on public.organization_settings;
create trigger organization_settings_guard
before update on public.organization_settings
for each row execute function public.organization_settings_guard();

alter table public.organization_settings enable row level security;

drop policy if exists "Members read organization settings" on public.organization_settings;
create policy "Members read organization settings"
on public.organization_settings for select to authenticated
using (public.is_org_member(organization_id));

drop policy if exists "Owners and admins insert organization settings" on public.organization_settings;
create policy "Owners and admins insert organization settings"
on public.organization_settings for insert to authenticated
with check (public.has_org_role(organization_id, array['owner','admin']::public.organization_role[]));

drop policy if exists "Owners and admins update organization settings" on public.organization_settings;
create policy "Owners and admins update organization settings"
on public.organization_settings for update to authenticated
using (public.has_org_role(organization_id, array['owner','admin']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['owner','admin']::public.organization_role[]));

-- Sem DELETE: definições acompanham a organização (cascade).

-- list_organization_members -------------------------------------
-- SECURITY DEFINER justificado: emails vivem em auth.users. Expõe apenas
-- (user_id, email, role, created_at) e apenas a membros da organização.
create or replace function public.list_organization_members(p_organization_id uuid)
returns table (
  user_id uuid,
  email text,
  display_name text,
  role public.organization_role,
  joined_at timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    m.user_id,
    u.email::text,
    nullif(u.raw_user_meta_data ->> 'name', '')::text as display_name,
    m.role,
    m.created_at as joined_at
  from public.memberships m
  join auth.users u on u.id = m.user_id
  where m.organization_id = p_organization_id
    and public.is_org_member(p_organization_id)
  order by
    case m.role when 'owner' then 0 when 'admin' then 1 else 2 end,
    m.created_at asc;
$$;

revoke all on function public.list_organization_members(uuid) from public, anon;
grant execute on function public.list_organization_members(uuid) to authenticated;

-- Convites: SEM tabela nem RPC nesta migração (não há envio de email).
-- Quando existir, usar RPC própria com validação de papel e expiração.
