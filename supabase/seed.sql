-- ============================================================
-- ORBITA CHAT — Seed de demonstração (OPCIONAL)
--
-- ⚠️  DADOS DE DEMONSTRAÇÃO — não representam clientes, chamadas
--     nem métricas reais. Servem apenas para desenvolvimento local.
--
-- Não insere utilizadores: `memberships.user_id` referencia
-- `auth.users`, que só existe com Supabase Auth ativo. Para criar a
-- primeira membership, autentica um utilizador e usa o exemplo no
-- comentário no final deste ficheiro.
-- ============================================================

begin;

insert into public.organizations (id, name, slug)
values
  ('00000000-0000-4000-8000-000000000001', 'ORBITA Demo', 'orbita-demo')
on conflict (id) do nothing;

insert into public.agents (id, organization_id, name, description, instructions, language, status)
values
  (
    '00000000-0000-4000-8000-0000000000a1',
    '00000000-0000-4000-8000-000000000001',
    'Agente de demonstração (demo)',
    'Agente fictício criado pelo seed para desenvolvimento local.',
    'Instruções de demonstração — substituir em produção.',
    'pt-PT',
    'draft'
  ),
  (
    '00000000-0000-4000-8000-0000000000a2',
    '00000000-0000-4000-8000-000000000001',
    'Agente de apoio (demo)',
    'Segundo agente fictício para validar listagens e filtros.',
    'Instruções de demonstração — substituir em produção.',
    'pt-PT',
    'active'
  )
on conflict (id) do nothing;

commit;

-- ------------------------------------------------------------
-- Exemplo (executar manualmente após autenticar um utilizador):
--
-- insert into public.memberships (organization_id, user_id, role)
-- values (
--   '00000000-0000-4000-8000-000000000001',
--   auth.uid(),
--   'owner'
-- );
-- ------------------------------------------------------------
