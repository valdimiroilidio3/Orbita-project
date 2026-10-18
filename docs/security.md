# ORBITA CHAT — Segurança multi-tenant

> Estado: políticas RLS completas (leitura e escrita) implementadas na migração
> `0003_rls_policies.sql`. **Os testes de RLS estão preparados mas NÃO foram
> executados** neste ambiente (sem Supabase/PostgreSQL local) — ver «Testes».

## 1. Modelo de confiança

1. **A base de dados é a autoridade.** Toda a leitura/escrita passa por RLS;
   o frontend e o middleware são apenas camadas adicionais.
2. **Identidade = `auth.uid()`** (JWT validado pelo Supabase Auth). Nenhuma
   operação aceita `user_id` ou `role` arbitrários do cliente.
3. **Tenant = organização.** Cada registo pertence a exatamente uma
   `organization_id`; todas as políticas verificam a membership do chamador.
4. **Segredos nunca no browser.** Apenas URL + chave anon/publishable são
   públicas (protegidas por RLS). `SUPABASE_SERVICE_ROLE_KEY` é exclusiva do
   servidor e não é necessária para operações normais.

## 2. Matriz de papéis

| Operação                                       |                            owner                            |       admin       |          member           |
| ---------------------------------------------- | :---------------------------------------------------------: | :---------------: | :-----------------------: |
| Ler organização / memberships / agents / calls |                              ✓                              |         ✓         |             ✓             |
| Atualizar organização (nome/slug)              |                              ✓                              |         ✓         |             —             |
| Apagar organização                             |                              ✓                              |         —         |             —             |
| Atualizar roles de outros membros              |                              ✓                              | ✓ (exceto owners) |             —             |
| Atribuir role `owner`                          |                              ✓                              |         —         |             —             |
| Alterar a própria role                         |                         — (trigger)                         |    — (trigger)    |        — (trigger)        |
| Remover membros                                |                              ✓                              | ✓ (exceto owners) | sai da própria membership |
| Criar/atualizar agents                         |                              ✓                              |         ✓         |             ✓             |
| Apagar agents                                  |                              ✓                              |         ✓         |             —             |
| Criar/atualizar calls                          |                              ✓                              |         ✓         |             ✓             |
| Apagar calls                                   |                    — (histórico retido)                     |         —         |             —             |
| Criar organizações                             | via RPC `create_organization` (qualquer sessão autenticada) |                   |                           |

`member` = funcionalidade do produto (agentes/chamadas), sem administração.

## 3. Políticas RLS (migração 0003)

Todas `to authenticated`. **Sem política = operação negada.**

| Tabela                                                       | SELECT                   | INSERT                                            | UPDATE                                               | DELETE                                                   |
| ------------------------------------------------------------ | ------------------------ | ------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------- |
| `organizations`                                              | membro (`is_org_member`) | só via RPC                                        | owner/admin                                          | owner                                                    |
| `memberships`                                                | membro                   | **negado** (só RPC)                               | owner/admin (+ triggers)                             | própria saída ou owner/admin (+ trigger do último owner) |
| `agents`                                                     | membro                   | membro (`created_by = auth.uid()`)                | membro (+ trigger anti-transferência)                | owner/admin                                              |
| `calls`                                                      | membro                   | membro                                            | membro (+ trigger anti-transferência e transições)   | **negado** (retenção)                                    |
| `call_events`                                                | membro                   | **negado** (ingestão no servidor — service role)  | **negado**                                           | **negado**                                               |
| `tool_executions` / `automation_runs`                        | membro                   | **negado** (servidor, após autorização explícita) | **negado**                                           | **negado**                                               |
| `agent_tools` / `automation_workflows` / `business_profiles` | membro                   | owner/admin                                       | owner/admin                                          | owner/admin (perfil: —)                                  |
| `contact_requests` / `appointments`                          | membro                   | membro                                            | membro                                               | —                                                        |
| `tool_approvals`                                             | membro                   | **negado** (servidor)                             | owner/admin (validação de execução/prazo no serviço) | —                                                        |

### Helpers `SECURITY DEFINER`

- `is_org_member(uuid)` e `has_org_role(uuid, organization_role[])` — evitam
  políticas recursivas em `memberships`; `search_path = ''`; `revoke` de
  `public`/`anon`; `grant` apenas a `authenticated`/`service_role`; leitura
  única de `memberships`, sem escrita.
- `create_organization(name, slug)` — criação **transacional** de organização +
  membership `owner` com a identidade de `auth.uid()`; validação de nome/slug no
  servidor; `grant` apenas a `authenticated`. Justificação: o fluxo precisa de
  escrita em duas tabelas sem INSERT direto em `memberships`.

## 4. Proteções adicionais (triggers, migração 0002)

- **Anti-transferência de tenant**: `organization_id` é imutável em `agents` e `calls` (UPDATE).
- **Roles**: ninguém altera a própria role; só o owner atribui/remove owners;
  **último owner nunca é removido**.
- **Chamadas**: estados terminais não transitam; sem regressão a `queued`;
  `started_at <= ended_at`; duração/custo não negativos.
- **`voice_config`**: apenas objetos JSON; **nunca segredos de fornecedores**.
- **Unicidade do fornecedor**: `(organization_id, provider, provider_call_id)`.

## 5. Testes de segurança

Suite: [`supabase/tests/rls.test.sql`](../supabase/tests/rls.test.sql) (pgTAP, 14 asserções):

1. Criação de organização atribui `owner` (fluxo transacional)
2. Utilizador autenticado sem organização não vê dados
3. Membro vê a própria organização
4. Membro de duas organizações vê as duas
5. Leitura de organização alheia (manipulação de UUIDs) → vazia
6. Inserção em organização alheia → violação de RLS
7. Alteração de `organization_id` → bloqueada (trigger)
8. Auto-promoção de role → bloqueada (trigger)
9. Chamada com agente de outra organização → FK composta
10. Acesso sem autenticação (`anon`) → sem dados
11. Falha parcial na criação (slug duplicado) → atomicidade
12. Último owner não removível
13. Histórico de chamadas não é apagável por membros
14. `member` não apaga agentes

Os testes usam identidades reais (`role authenticated` + `request.jwt.claims`
por utilizador) — não são feitos como superuser a contornar as políticas.

### Como executar (requer Supabase local)

```bash
supabase start
supabase db reset      # aplica 0001..0003
supabase test db       # corre supabase/tests/rls.test.sql
```

### Estado atual

⚠️ **NÃO executados neste ambiente de build** (sem Docker/PostgreSQL). A
sintaxe SQL de todas as migrações foi validada com o parser real do PostgreSQL
(`libpg-query`), mas a segurança NÃO está considerada validada até a suite
correr num Supabase local/estágio.

## 6. Limitações conhecidas

1. Convites de membros (fluxo de email + aceitação) — fase seguinte.
2. Confirmação de email depende da configuração do template no projeto Supabase.
3. Sem rate limiting nos endpoints de autenticação (recomendado: Supabase Auth
   rate limits + WAF/CDN).
4. `calls` sem DELETE para todos — futuramente, política de retenção/expurgo
   administrativo controlado.
5. Auditoria de alterações de roles (tabela `audit_events`) — fase seguinte.

## 7. Headers HTTP e CSP (fase final)

Definidos em `apps/web/next.config.ts` e verificados no build de produção:

- `Content-Security-Policy`: `default-src 'self'`; `script-src 'self' 'unsafe-inline'` (sem nonces — limitação documentada;
  `'unsafe-eval'` apenas em desenvolvimento); `connect-src 'self'` + origin Supabase (https/wss) derivado de
  `NEXT_PUBLIC_SUPABASE_URL`; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`; `frame-ancestors 'none'`;
  `upgrade-insecure-requests` (produção).
- `Strict-Transport-Security: max-age=63072000; includeSubDomains` (produção).
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`, `X-DNS-Prefetch-Control: off`.
- `ALLOW_FRAME_EMBEDDING=true` (build-time) relaxa apenas o framing, para previews embebidos — nunca em produção.

## 8. Definições e funções SECURITY DEFINER

- Funções `SECURITY DEFINER`: `is_org_member`, `has_org_role`, `create_organization` (0003) e `list_organization_members` (0006).
  Esta última existe porque `auth.users` não é acessível por RLS; devolve apenas user_id/email/nome/papel/data e **apenas**
  a membros da organização pedida (`is_org_member` no WHERE); `search_path` vazio; EXECUTE só para `authenticated`.
- Server actions de definições verificam papel no servidor (`owner`/`admin` para organização, voz e notificações da
  organização) e repetem as regras de `memberships_guard` antes de escrever; a trigger continua a ser a barreira final.
- Remoção de membros exige confirmação textual; alteração de email passa pela confirmação do Supabase; alteração de
  palavra-passe usa `auth.updateUser` sob sessão; «terminar todas as sessões» usa `signOut({ scope: 'global' })`.

## 9. Privacidade de números e logs

- Listas de chamadas mostram números mascarados (`maskPhoneNumber`); o número completo só no detalhe da chamada
  (acesso já autorizado pela organização).
- A pesquisa em `/calls` é sanitizada no servidor (≤ 40 caracteres, sem wildcards do utilizador) e corre sob RLS.
- O logger (`lib/observability/logger.ts`) redige chaves sensíveis (`authorization`, `token`, `secret`, `from_number`,
  `to_number`, `args`, `transcript`, …) e trunca strings; os webhooks registam apenas `correlationId`, código e resultado.
- `/api/health` expõe presença/estado de integrações, nunca valores.
