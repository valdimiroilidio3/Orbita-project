# ORBITA CHAT — Modelo de dados

> Schema: `supabase/migrations/0001_initial_schema.sql` (base),
> `0002_integrity.sql` (integridade) e `0003_rls_policies.sql` (RLS multi-tenant).
> Tipos TypeScript: `@orbita/shared` (domínio) e `@orbita/database` (schema).
> Segurança: ver [`docs/security.md`](security.md).

## Entidades

```
organizations 1 ─── * memberships * ─── 1 (auth.users)
      │
      ├── 1 ─── * agents
      │
      └── 1 ─── * calls * ─── 0..1 agents   (FK composta impede agentes de outra org)
```

### `organizations`

| Coluna                      | Tipo        | Notas                                                   |
| --------------------------- | ----------- | ------------------------------------------------------- |
| `id`                        | uuid PK     | `gen_random_uuid()`                                     |
| `name`                      | text        | 1..120 (validado no servidor)                           |
| `slug`                      | text        | `unique`; `[a-z0-9-]`, 3..48 (validado em Zod e no RPC) |
| `created_at` / `updated_at` | timestamptz | `updated_at` via trigger                                |

### `memberships`

| Coluna                        | Tipo        | Notas                                                           |
| ----------------------------- | ----------- | --------------------------------------------------------------- |
| `organization_id` + `user_id` | PK composta | unicidade garantida; um utilizador pode ter várias organizações |
| `role`                        | enum        | `owner` \| `admin` \| `member`                                  |
| `created_at`                  | timestamptz |                                                                 |

Proteções (trigger `memberships_guard`): role não auto-atribuída; só owner atribui/altera owners; **último owner nunca é removido**; organização/utilizador imutáveis. INSERT direto negado (só via RPC `create_organization`).

### `agents`

| Coluna                      | Tipo                 | Notas                                                                                                                                            |
| --------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                        | uuid PK              | `unique (organization_id, id)` para FK composta de `calls`                                                                                       |
| `organization_id`           | uuid FK              | imutável (trigger anti-transferência)                                                                                                            |
| `name`                      | text                 | 1..120                                                                                                                                           |
| `description`               | text                 | nullable                                                                                                                                         |
| `instructions`              | text                 | max 20 000 (CHECK)                                                                                                                               |
| `language`                  | text                 | default `pt-PT`                                                                                                                                  |
| `status`                    | enum                 | `draft` \| `active` \| `paused` \| `archived` — transições validadas no servidor (`AGENT_STATUS_TRANSITIONS`)                                    |
| `voice_config`              | jsonb                | apenas campos estruturados (`voiceId`, `speed`, `pitch`, `greeting`, `style`) via `voiceConfigSchema` strict; **nunca segredos de fornecedores** |
| `created_by`                | uuid FK → auth.users | `on delete set null`; INSERT exige `= auth.uid()`                                                                                                |
| `created_at` / `updated_at` | timestamptz          | `updated_at` via trigger                                                                                                                         |

### `calls`

| Coluna                          | Tipo          | Notas                                                                                                                     |
| ------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `id`                            | uuid PK       |                                                                                                                           |
| `organization_id`               | uuid FK       | imutável (trigger anti-transferência)                                                                                     |
| `agent_id`                      | uuid          | FK composta `(organization_id, agent_id)` → agents, `on delete set null` — **histórico retido** se o agente for eliminado |
| `direction`                     | enum          | `inbound` \| `outbound`                                                                                                   |
| `status`                        | enum          | `queued` … `transferred`; estados terminais não transitam (trigger)                                                       |
| `from_number` / `to_number`     | text          | privados — expostos apenas a membros via RLS                                                                              |
| `started_at` / `ended_at`       | timestamptz   | `started_at <= ended_at` (CHECK)                                                                                          |
| `duration_seconds`              | integer       | `>= 0`                                                                                                                    |
| `estimated_cost`                | numeric(12,6) | `>= 0`                                                                                                                    |
| `currency`                      | char(3)       | default `EUR`                                                                                                             |
| `provider` / `provider_call_id` | text          | `unique (organization_id, provider, provider_call_id)`                                                                    |
| `created_at` / `updated_at`     | timestamptz   | `updated_at` via trigger                                                                                                  |

**Retenção**: não existe política DELETE em `calls` — membros não conseguem
apagar histórico operacional/financeiro.

## Índices

- `agents_org_created_idx` — (organization_id, created_at desc)
- `agents_org_status_idx` — (organization_id, status)
- `calls_org_created_idx` — (organization_id, created_at desc)
- `calls_org_status_idx` — (organization_id, status)
- `calls_org_started_idx` — (organization_id, started_at desc)
- `calls_org_agent_created_idx` — (organization_id, agent_id, created_at desc)
- `memberships_user_idx` — (user_id)

## Segurança (RLS)

RLS ativo em todas as tabelas com políticas SELECT/INSERT/UPDATE/DELETE
conforme a matriz de papéis em [`docs/security.md`](security.md). Criação de
organizações exclusivamente via RPC transacional `create_organization`.

## Extensibilidade (fases futuras)

`automations`, `integrations`, `usage_records`, `subscriptions` —
previstas, **não criadas** nesta fase (evitar tabelas desnecessárias). Novas
entidades seguem o mesmo padrão: `organization_id` obrigatório, RLS por
membership, `updated_at` por trigger.

## Motor de voz (Prompt 07 — migração `0004_voice_engine.sql`)

- `calls` ganhou `voice_session_id`, `answered_at`, `failure_code`,
  `failure_reason` (CHECKs de coerência temporal; `failure_reason ≤ 500`).
- `agents` ganhou `inbound_phone_number` (único; resolve chamadas recebidas
  por associação persistida — nunca por identificadores do fornecedor).
- `call_events`: eventos de fornecedor imutáveis; deduplicação por
  `unique (provider, provider_event_id)`; FK composta
  `(organization_id, call_id)` impede eventos cross-tenant; metadados ≤ 2 KB
  (sem áudio nem transcrições); RLS: leitura para membros, **sem escrita
  por cliente** (ingestão no servidor — docs/voice-security.md).
- ⚠️ Migração criada no repositório; **não aplicada** a nenhuma instância
  Supabase neste ambiente.

## Ferramentas e automações (migração 0005 — Prompt 08)

`business_profiles` (perfil público, 1:1 organização) · `contact_requests` · `appointments`
(horário único por serviço quando confirmada; `source='dev-adapter'` = adaptador de desenvolvimento) ·
`agent_tools` (PK agent+tool; FK composta para `agents(organization_id,id)`) · `tool_executions`
(auditoria; `idempotency_key` único por organização) · `tool_approvals` (1:1 execução) ·
`automation_workflows` (steps JSONB 1–5) · `automation_runs` (`(workflow_id, trigger_key)` único).
Todas com `organization_id` imutável (`org_guard`). Detalhes em `docs/tools-architecture.md`.
Estado: ficheiro criado e validado sintaticamente — **não aplicado** aqui.
