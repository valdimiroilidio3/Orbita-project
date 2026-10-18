# ORBITA CHAT — Modelo de dados

> Schema inicial aplicado por `supabase/migrations/0001_initial_schema.sql`.
> Tipos TypeScript espelhados em `@orbita/shared` e `@orbita/database`.

## Entidades (Sprint 1)

```
organizations 1 ─── * memberships * ─── 1 (auth.users)
      │
      ├── 1 ─── * agents
      │
      └── 1 ─── * calls * ─── 0..1 agents
```

### `organizations`

| Coluna                      | Tipo        | Notas               |
| --------------------------- | ----------- | ------------------- |
| `id`                        | uuid PK     | `gen_random_uuid()` |
| `name`                      | text        |                     |
| `slug`                      | text        | `unique`            |
| `created_at` / `updated_at` | timestamptz | default `now()`     |

### `memberships`

| Coluna            | Tipo                     | Notas                                             |
| ----------------- | ------------------------ | ------------------------------------------------- |
| `organization_id` | uuid FK → organizations  | PK composta com `user_id`                         |
| `user_id`         | uuid FK → auth.users     | cascade                                           |
| `role`            | enum `organization_role` | `owner` \| `admin` \| `member` (default `member`) |
| `created_at`      | timestamptz              |                                                   |

### `agents`

| Coluna                      | Tipo                    | Notas                                                    |
| --------------------------- | ----------------------- | -------------------------------------------------------- |
| `id`                        | uuid PK                 |                                                          |
| `organization_id`           | uuid FK → organizations | `unique (organization_id, id)` (FK composta por `calls`) |
| `name`                      | text                    |                                                          |
| `description`               | text                    | nullable                                                 |
| `instructions`              | text                    | default `''`                                             |
| `language`                  | text                    | default `'pt-PT'`                                        |
| `status`                    | enum `agent_status`     | `draft` \| `active` \| `paused` \| `archived`            |
| `configuration`             | jsonb                   | default `'{}'`                                           |
| `created_by`                | uuid FK → auth.users    | `on delete set null`                                     |
| `created_at` / `updated_at` | timestamptz             |                                                          |

### `calls`

| Coluna                                   | Tipo                    | Notas                                                                                                                    |
| ---------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `id`                                     | uuid PK                 |                                                                                                                          |
| `organization_id`                        | uuid FK → organizations |                                                                                                                          |
| `agent_id`                               | uuid                    | FK composta `(organization_id, agent_id)` → agents, `on delete set null`                                                 |
| `provider` / `provider_call_id`          | text                    | `unique (provider, provider_call_id)`                                                                                    |
| `direction`                              | enum `call_direction`   | `inbound` \| `outbound`                                                                                                  |
| `status`                                 | enum `call_status`      | `queued`, `initiating`, `ringing`, `in_progress`, `completed`, `failed`, `busy`, `no_answer`, `cancelled`, `transferred` |
| `from_number` / `to_number`              | text                    |                                                                                                                          |
| `duration_seconds`                       | integer                 | `check >= 0`                                                                                                             |
| `estimated_cost`                         | numeric(12,6)           | `check >= 0`                                                                                                             |
| `currency`                               | char(3)                 | default `'EUR'`                                                                                                          |
| `started_at` / `ended_at` / `created_at` | timestamptz             |                                                                                                                          |

## Índices

- `agents_org_created_idx` — agents (`organization_id`, `created_at` desc)
- `calls_org_created_idx` — calls (`organization_id`, `created_at` desc)
- `calls_org_status_idx` — calls (`organization_id`, `status`)

## Segurança (RLS)

RLS ativo em todas as tabelas. Políticas de **SELECT** para `authenticated`, limitadas a membros da organização (via `memberships` + `auth.uid()`).

**Pendente antes de escrita na UI/API:**

- Políticas INSERT/UPDATE/DELETE por função (validar `owner`/`admin`).
- Processo seguro de criação de organizações (primeiro `owner`).
- Isolamento de todos os novos recursos; a API de serviço valida a organização em cada operação.

## Tabelas futuras (fora do Sprint 1)

`events`, `contacts`, `transcripts`, `recordings`, `billing` — a criar nas fases correspondentes, com as mesmas regras de isolamento por organização.
