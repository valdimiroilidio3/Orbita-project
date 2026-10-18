-- ============================================================
-- ORBITA CHAT — Testes de segurança RLS (pgTAP)
--
-- Executar com um Supabase local/projeto de teste:
--   supabase db reset          # aplica migrações 0001..0003
--   supabase test db           # executa este ficheiro
--
-- IMPORTANTE:
--   • Os testes usam identidades REAIS: role `authenticated` com
--     `request.jwt.claims` definido por utilizador (auth.uid() lê o JWT).
--     Nenhum teste é feito como superuser a contornar as políticas.
--   • Este ficheiro só deve correr em ambientes de teste (cria utilizadores
--     em auth.users). NUNCA em produção.
--   • Se não existir ambiente Supabase configurado, estes testes NÃO
--     estão executados — ver docs/security.md.
-- ============================================================

begin;

create extension if not exists pgtap with schema extensions;

-- ── Identidades de teste ────────────────────────────────────
-- A: owner da org-alfa · B: member da org-alfa · C: owner da org-beta (alheia)
insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'rls-a@test.invalid'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'rls-b@test.invalid'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'rls-c@test.invalid');

-- Helper: assume a identidade de um utilizador autenticado (JWT claims).
create or replace function pg_temp.as_user(p_user uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated')::text,
    true
  );
  perform set_config('role', 'authenticated', true);
end;
$$;

create or replace function pg_temp.as_anon() returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'anon', true);
end;
$$;

create or replace function pg_temp.as_postgres() returns void
language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
end;
$$;

select plan(14);

-- ============================================================
-- 1. Criação de organização atribui owner corretamente (fluxo transacional)
-- ============================================================
select pg_temp.as_user('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is(
  (select public.create_organization('Alfa Lda', 'org-alfa')),
  (select id from public.organizations where slug = 'org-alfa'),
  '1. create_organization devolve o id da organização criada'
);
select is(
  (select role::text from public.memberships
   where organization_id = (select id from public.organizations where slug = 'org-alfa')
     and user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  'owner',
  '1. o criador fica com role owner'
);

-- ============================================================
-- 2. Utilizador autenticado sem organização não vê dados
-- ============================================================
select pg_temp.as_user('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
select is(
  (select count(*)::int from public.organizations),
  0,
  '2. utilizador sem membership não vê organizações'
);

-- ============================================================
-- 3. Membro vê a própria organização
-- ============================================================
select pg_temp.as_postgres();
insert into public.memberships (organization_id, user_id, role)
values (
  (select id from public.organizations where slug = 'org-alfa'),
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'member'
);

select pg_temp.as_user('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
select is(
  (select count(*)::int from public.organizations),
  1,
  '3. membro vê a organização a que pertence'
);

-- ============================================================
-- 4. Membro de duas organizações vê as duas
-- ============================================================
select pg_temp.as_user('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
select is(
  public.create_organization('Beta SA', 'org-beta'),
  (select id from public.organizations where slug = 'org-beta'),
  '4. setup: C cria a segunda organização'
);
select pg_temp.as_postgres();
insert into public.memberships (organization_id, user_id, role)
values (
  (select id from public.organizations where slug = 'org-beta'),
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'member'
);
select pg_temp.as_user('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
select is(
  (select count(*)::int from public.organizations),
  2,
  '4. membro de duas organizações vê as duas'
);

-- ============================================================
-- 5. Leitura de dados de outra organização (manipulação de UUIDs) → vazia
-- ============================================================
select pg_temp.as_user('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
select is(
  (select count(*)::int from public.organizations where slug = 'org-alfa'),
  0,
  '5. utilizador de outra organização não lê dados alheios'
);

-- ============================================================
-- 6. Inserção de registo em organização alheia → rejeitada
-- ============================================================
select throws_ok(
  $$
    insert into public.agents (organization_id, name, instructions, created_by)
    values (
      (select id from public.organizations where slug = 'org-alfa'),
      'agente intruso',
      '',
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
    );
  $$,
  '42501',
  null,
  '6. inserir agent em organização alheia viola RLS'
);

-- ============================================================
-- 7. Alterar organization_id (transferência entre tenants) → bloqueado
-- ============================================================
select pg_temp.as_user('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select throws_ok(
  $$
    update public.agents
    set organization_id = (select id from public.organizations where slug = 'org-beta')
    where name = 'agente alfa';
  $$,
  'P0001',
  null,
  '7. transferir registo para outra organização é bloqueado (trigger)'
);

-- ============================================================
-- 8. Auto-promoção de role → bloqueada
-- ============================================================
select throws_ok(
  $$
    update public.memberships
    set role = 'admin'
    where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      and organization_id = (select id from public.organizations where slug = 'org-alfa');
  $$,
  'P0001',
  null,
  '8. ninguém altera a própria role (trigger)'
);

-- ============================================================
-- 9. Chamada associada a agente de outra organização → FK composta
-- ============================================================
select pg_temp.as_user('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
select throws_ok(
  $$
    insert into public.calls (organization_id, agent_id, direction)
    values (
      (select id from public.organizations where slug = 'org-beta'),
      (select a.id from public.agents a
       join public.organizations o on o.id = a.organization_id
       where o.slug = 'org-alfa' limit 1),
      'outbound'
    );
  $$,
  '23503',
  null,
  '9. chamada não pode referenciar agente de outra organização (FK composta)'
);

-- ============================================================
-- 10. Acesso sem autenticação → sem dados
-- ============================================================
select pg_temp.as_anon();
select is(
  (select count(*)::int from public.organizations),
  0,
  '10. role anon não vê organizações'
);

-- ============================================================
-- 11. Falha parcial na criação da organização → atomicidade
-- ============================================================
select pg_temp.as_user('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
select throws_ok(
  $$ select public.create_organization('Duplicado', 'org-alfa'); $$,
  '23505',
  null,
  '11. slug duplicado rejeitado'
);
select is(
  (select count(*)::int from public.organizations),
  2,
  '11. nenhuma organização órfã fica para trás (transação única)'
);

-- ============================================================
-- 12. Último owner não pode ser removido
-- ============================================================
select pg_temp.as_user('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select throws_ok(
  $$
    delete from public.memberships
    where organization_id = (select id from public.organizations where slug = 'org-alfa')
      and user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  $$,
  'P0001',
  null,
  '12. último owner retido'
);

-- ============================================================
-- 13. Histórico de chamadas não é apagável por membros
-- ============================================================
select pg_temp.as_user('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select pg_temp.as_postgres();
insert into public.calls (organization_id, direction, status)
values ((select id from public.organizations where slug = 'org-alfa'), 'inbound', 'completed');
select pg_temp.as_user('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
do $$
declare
  before_count integer;
  after_count integer;
begin
  select count(*) into before_count from public.calls;
  delete from public.calls;
  select count(*) into after_count from public.calls;
  perform is(after_count, before_count, '13. membros não conseguem apagar histórico de chamadas');
end;
$$;

-- ============================================================
-- 14. Member não apaga agentes (apenas owner/admin)
-- ============================================================
select pg_temp.as_user('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
select pg_temp.as_postgres();
insert into public.agents (organization_id, name, instructions, created_by)
values (
  (select id from public.organizations where slug = 'org-alfa'),
  'agente alfa',
  '',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
);
select pg_temp.as_user('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
do $$
declare
  before_count integer;
  after_count integer;
begin
  select count(*) into before_count from public.agents;
  delete from public.agents;
  select count(*) into after_count from public.agents;
  perform is(after_count, before_count, '14. member não apaga agentes');
end;
$$;

select * from finish();
rollback;
