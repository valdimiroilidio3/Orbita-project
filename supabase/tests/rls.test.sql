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

select plan(22);

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

-- ============================================================
-- 15–17. call_events: isolamento multi-tenant e escrita protegida
-- (ingestão de webhooks acontece no servidor — sem escrita por cliente)
-- ============================================================
select pg_temp.as_postgres();
insert into public.calls (organization_id, agent_id, direction, status, provider, provider_call_id, started_at)
values (
  (select id from public.organizations where slug = 'org-alfa'),
  (select id from public.agents where name = 'agente alfa' limit 1),
  'inbound',
  'queued',
  'teste',
  'call-rls-1',
  now()
);
insert into public.call_events (organization_id, call_id, provider, provider_event_id, event_type, occurred_at)
values (
  (select id from public.organizations where slug = 'org-alfa'),
  (select id from public.calls where provider_call_id = 'call-rls-1'),
  'teste',
  'evt-rls-1',
  'call.received',
  now()
);

select pg_temp.as_user('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
do $$
declare
  visible integer;
begin
  select count(*) into visible from public.call_events;
  perform is(visible, 1, '15. membro vê apenas eventos da própria organização');
end;
$$;

do $$
declare
  before_count integer;
  after_count integer;
begin
  select count(*) into before_count from public.call_events;
  begin
    insert into public.call_events (organization_id, call_id, provider, provider_event_id, event_type, occurred_at)
    values (
      (select id from public.organizations where slug = 'org-alfa'),
      (select id from public.calls where provider_call_id = 'call-rls-1'),
      'teste',
      'evt-indevido',
      'call.ended',
      now()
    );
  exception when insufficient_privilege or check_violation or others then
    null;
  end;
  select count(*) into after_count from public.call_events;
  perform is(after_count, before_count, '16. cliente autenticado não escreve call_events (denegação por omissão)');
end;
$$;

select pg_temp.as_postgres();
do $$
declare
  duplicated boolean := false;
begin
  begin
    insert into public.call_events (organization_id, call_id, provider, provider_event_id, event_type, occurred_at)
    values (
      (select id from public.organizations where slug = 'org-alfa'),
      (select id from public.calls where provider_call_id = 'call-rls-1'),
      'teste',
      'evt-rls-1',
      'call.received',
      now()
    );
  exception when unique_violation then
    duplicated := true;
  end;
  perform ok(duplicated, '17. evento duplicado (provider, provider_event_id) bloqueado');
end;
$$;

-- ============================================================
-- 18–22. Ferramentas e automações (PROMPT 08): isolamento multi-tenant,
-- permissões de alteração e escrita privilegiada só no servidor
-- ============================================================
select pg_temp.as_postgres();
insert into public.tool_executions (organization_id, agent_id, call_id, tool_id, status, risk, args)
values (
  (select id from public.organizations where slug = 'org-alfa'),
  null,
  (select id from public.calls where provider_call_id = 'call-rls-1'),
  'business_info.lookup',
  'succeeded',
  'low',
  '{}'::jsonb
);
insert into public.tool_approvals (organization_id, tool_execution_id, status, expires_at)
values (
  (select id from public.organizations where slug = 'org-alfa'),
  (select id from public.tool_executions where tool_id = 'business_info.lookup' limit 1),
  'pending',
  now() + interval '1 day'
);

-- 18. Acesso cruzado: owner da org-beta não lê execuções da org-alfa
select pg_temp.as_user('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
select is(
  (select count(*)::int from public.tool_executions),
  0,
  '18. utilizador de outra organização não vê tool_executions (acesso cruzado negado)'
);

-- 19. Membro da org-alfa lê as execuções da sua organização
select pg_temp.as_user('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
select is(
  (select count(*)::int from public.tool_executions),
  1,
  '19. membro vê as execuções da própria organização'
);

-- 20. Membro (não owner/admin) não altera permissões de ferramentas (agent_tools)
do $$
declare
  inserted boolean := false;
begin
  begin
    insert into public.agent_tools (organization_id, agent_id, tool_id, enabled)
    values (
      (select id from public.organizations where slug = 'org-alfa'),
      (select id from public.agents where name = 'agente alfa' limit 1),
      'contact_request.create',
      true
    );
    inserted := true;
  exception when insufficient_privilege or check_violation or others then
    inserted := false;
  end;
  perform ok(not inserted, '20. membro não altera agent_tools (apenas owner/admin)');
end;
$$;

-- 21. Membro não decide aprovações (update negado) e não escreve tool_executions
do $$
declare
  before_status text;
  after_status text;
  exec_before int;
  exec_after int;
begin
  select status into before_status from public.tool_approvals limit 1;
  begin
    update public.tool_approvals set status = 'approved';
  exception when others then
    null;
  end;
  select status into after_status from public.tool_approvals limit 1;

  select count(*) into exec_before from public.tool_executions;
  begin
    insert into public.tool_executions (organization_id, tool_id, status, risk, args)
    values (
      (select id from public.organizations where slug = 'org-alfa'),
      'business_info.lookup', 'succeeded', 'low', '{}'::jsonb
    );
  exception when others then
    null;
  end;
  select count(*) into exec_after from public.tool_executions;

  perform ok(
    before_status = after_status and exec_before = exec_after,
    '21. membro não aprova operações nem escreve tool_executions (escrita só no servidor)'
  );
end;
$$;

-- 22. Owner de outra organização não aprova operações da org-alfa
select pg_temp.as_user('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
do $$
declare
  touched int;
begin
  update public.tool_approvals set status = 'approved';
  get diagnostics touched = row_count;
  perform is(touched, 0, '22. owner de outra organização não altera aprovações alheias (RLS)');
end;
$$;

select * from finish();
rollback;
