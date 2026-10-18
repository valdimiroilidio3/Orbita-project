-- ============================================================
-- ORBITA CHAT — 0003: Row Level Security multi-tenant + fluxo
-- controlado de criação de organização
--
-- Princípios:
--   • Toda a autorização é verificada na base de dados (RLS);
--     o frontend nunca é a única linha de defesa.
--   • Helpers SECURITY DEFINER evitam políticas recursivas em
--     memberships. search_path='' e privilégios mínimos.
--   • A criação de organização + membership owner é atómica
--     através do RPC create_organization (identidade via auth.uid(),
--     nunca um UUID fornecido pelo cliente).
--   • calls não têm política DELETE — histórico retido.
--   • INSERT direto em memberships não existe (só via RPC controlado).
--
-- Matriz de papéis (documentada em docs/security.md):
--   owner  — controlo total da organização (inclui gestão de owners)
--   admin  — gestão operacional e de membros (exceto owners)
--   member — funcionalidade do produto (agentes, chamadas), sem admin
-- ============================================================

-- ── Helpers (SECURITY DEFINER, privilégios mínimos) ─────────
-- Justificação: consultam memberships sem reativar as políticas da
-- própria tabela memberships (evita recursão). São `stable`, não
-- escrevem dados e devolvem apenas boolean.

create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.has_org_role(org_id uuid, required public.organization_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org_id
      and m.user_id = auth.uid()
      and m.role = any (required)
  );
$$;

revoke all on function public.is_org_member(uuid) from public, anon;
revoke all on function public.has_org_role(uuid, public.organization_role[]) from public, anon;
grant execute on function public.is_org_member(uuid) to authenticated, service_role;
grant execute on function public.has_org_role(uuid, public.organization_role[]) to authenticated, service_role;

-- ── Criação transacional de organização ─────────────────────
-- O novo owner é SEMPRE o utilizador da sessão autenticada.
-- Falha na membership desfaz a criação da organização (transação única).

create or replace function public.create_organization(p_name text, p_slug text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_name text := btrim(coalesce(p_name, ''));
  v_slug text := lower(btrim(coalesce(p_slug, '')));
  v_org_id uuid;
begin
  if v_user is null then
    raise exception 'create_organization: sessão autenticada obrigatória';
  end if;

  if char_length(v_name) < 1 or char_length(v_name) > 120 then
    raise exception 'create_organization: nome inválido (1..120 caracteres)';
  end if;

  if char_length(v_slug) < 3 or char_length(v_slug) > 48
    or v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'create_organization: slug inválido (3..48 caracteres, [a-z0-9-])';
  end if;

  insert into public.organizations (name, slug)
  values (v_name, v_slug)
  returning id into v_org_id;

  insert into public.memberships (organization_id, user_id, role)
  values (v_org_id, v_user, 'owner'::public.organization_role);

  return v_org_id;
end;
$$;

revoke all on function public.create_organization(text, text) from public, anon;
grant execute on function public.create_organization(text, text) to authenticated;

-- ── Políticas RLS ───────────────────────────────────────────
-- Todas `to authenticated`. Sem política = operação negada.

-- organizations ------------------------------------------------
drop policy if exists "Members can view their organizations" on public.organizations;
create policy "Members can view their organizations"
on public.organizations
for select to authenticated
using (public.is_org_member(id));

-- INSERT: apenas via RPC create_organization (sem política direta).
drop policy if exists "Owners and admins can update their organization" on public.organizations;
create policy "Owners and admins can update their organization"
on public.organizations
for update to authenticated
using (public.has_org_role(id, array['owner','admin']::public.organization_role[]))
with check (public.has_org_role(id, array['owner','admin']::public.organization_role[]));

drop policy if exists "Owners can delete their organization" on public.organizations;
create policy "Owners can delete their organization"
on public.organizations
for delete to authenticated
using (public.has_org_role(id, array['owner']::public.organization_role[]));

-- memberships --------------------------------------------------
drop policy if exists "Members can view memberships in their organizations" on public.memberships;
create policy "Members can view memberships in their organizations"
on public.memberships
for select to authenticated
using (public.is_org_member(organization_id));

-- INSERT: inexistente de propósito — criação só via create_organization
-- (futuros convites usarão RPC próprio com validação).

drop policy if exists "Owners and admins can update memberships" on public.memberships;
create policy "Owners and admins can update memberships"
on public.memberships
for update to authenticated
using (public.has_org_role(organization_id, array['owner','admin']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['owner','admin']::public.organization_role[]));

drop policy if exists "Members can leave or be removed by admins" on public.memberships;
create policy "Members can leave or be removed by admins"
on public.memberships
for delete to authenticated
using (
  user_id = auth.uid()
  or public.has_org_role(organization_id, array['owner','admin']::public.organization_role[])
);

-- agents -------------------------------------------------------
drop policy if exists "Members can view their agents" on public.agents;
create policy "Members can view their agents"
on public.agents
for select to authenticated
using (public.is_org_member(organization_id));

drop policy if exists "Members can create agents in their organization" on public.agents;
create policy "Members can create agents in their organization"
on public.agents
for insert to authenticated
with check (
  public.is_org_member(organization_id)
  and created_by = auth.uid()
);

drop policy if exists "Members can update agents in their organization" on public.agents;
create policy "Members can update agents in their organization"
on public.agents
for update to authenticated
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

drop policy if exists "Owners and admins can delete agents" on public.agents;
create policy "Owners and admins can delete agents"
on public.agents
for delete to authenticated
using (public.has_org_role(organization_id, array['owner','admin']::public.organization_role[]));

-- calls --------------------------------------------------------
drop policy if exists "Members can view their calls" on public.calls;
create policy "Members can view their calls"
on public.calls
for select to authenticated
using (public.is_org_member(organization_id));

drop policy if exists "Members can create calls in their organization" on public.calls;
create policy "Members can create calls in their organization"
on public.calls
for insert to authenticated
with check (public.is_org_member(organization_id));

drop policy if exists "Members can update calls in their organization" on public.calls;
create policy "Members can update calls in their organization"
on public.calls
for update to authenticated
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

-- DELETE: inexistente de propósito — histórico operacional/financeiro
-- é retido (ver docs/data-model.md).
