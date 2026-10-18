# ORBITA CHAT

Plataforma SaaS multiempresa de **agentes de voz IA** — gestão de agentes, chamadas, contactos e integrações.

> **Estado: Sprint 1 (fundação).** Não existem integrações reais (voz, IA, telefonia, billing) ativas. Os ecrãs usam estados vazios ou **dados de demonstração claramente identificados**.

## Estrutura

```
orbita-chat/
├── apps/
│   ├── web/          # Next.js — dashboard (App Router)
│   └── api/          # Backend dedicado (esqueleto NestJS) — fase seguinte
├── packages/
│   ├── database/     # Tipos do schema (migrações em /supabase)
│   ├── shared/       # Tipos, validações (Zod), formatação
│   └── config/       # tsconfig base partilhado
├── supabase/
│   ├── migrations/   # Migrações SQL canónicas
│   └── seed.sql      # Seed de demonstração (opcional, identificado como demo)
└── docs/             # architecture.md, data-model.md, sprint-01.md
```

## Pré-requisitos

- Node.js LTS (>= 20)
- pnpm 10 (`corepack enable` ou `npm i -g pnpm@10`)
- (Opcional) Supabase CLI + Docker, para correr a base de dados local

## Instalação

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # preencher credenciais Supabase (opcional no Sprint 1)
pnpm dev        # arranca o dashboard em http://localhost:3000
```

Sem credenciais Supabase a aplicação **arranca em modo de demonstração** e mostra um aviso explícito (não falha silenciosamente).

## Scripts principais

| Script           | Descrição                                                    |
| ---------------- | ------------------------------------------------------------ |
| `pnpm dev`       | Desenvolvimento (Next.js)                                    |
| `pnpm build`     | Build de produção                                            |
| `pnpm lint`      | ESLint                                                       |
| `pnpm typecheck` | TypeScript estrito (`tsc --noEmit`)                          |
| `pnpm test`      | Testes unitários (Vitest)                                    |
| `pnpm test:e2e`  | Testes end-to-end (Playwright — requer `playwright install`) |
| `pnpm format`    | Prettier write                                               |

## Variáveis de ambiente

Modelo em [`apps/web/.env.example`](apps/web/.env.example) (e raiz). Resumo:

| Variável                                 | Onde                | Descrição                                    |
| ---------------------------------------- | ------------------- | -------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`               | cliente/servidor    | URL do projeto Supabase                      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`          | cliente/servidor    | Chave pública (anon)                         |
| `SUPABASE_SERVICE_ROLE_KEY`              | **apenas servidor** | Segredo — nunca expor ao cliente             |
| `OPENAI_API_KEY`, `TWILIO_*`, `STRIPE_*` | reservadas          | **Não utilizar no Sprint 1** — fases futuras |

Regras:

- Nunca usar o prefixo `NEXT_PUBLIC_` em segredos.
- Nunca comitar `.env.local` ou credenciais (o `.gitignore` já protege).
- O `.env.example` é apenas um modelo: não contém credenciais nem ativa integrações.

## Base de dados

A migração inicial vive em [`supabase/migrations/0001_initial_schema.sql`](supabase/migrations/0001_initial_schema.sql): `organizations`, `memberships`, `agents`, `calls`, enums, índices e RLS (leitura para membros).

Com Supabase CLI:

```bash
supabase start            # base local
supabase db push          # aplica migrações
psql "$DATABASE_URL" -f supabase/seed.sql   # opcional — dados de demonstração
```

**Limites de segurança atuais:** as políticas RLS cobrem apenas leitura. Antes de permitir escrita a partir da UI/API é necessário adicionar políticas INSERT/UPDATE/DELETE por função, validação de owner/admin e criação segura de organizações. Ver [`docs/data-model.md`](docs/data-model.md).

## Qualidade e CI

- ESLint + Prettier + typecheck estrito + Vitest + Playwright.
- O workflow em `.github/workflows/ci.yml` corre lint, typecheck, testes unitários e build; erros impedem a conclusão do CI.

## Limitações do protótipo (Sprint 1)

- Autenticação: ecrãs visuais (`/login`, `/forgot-password`) sem backend ligado.
- Chamadas, contactos e integrações: sem dados reais; sem telefonia, IA ou billing.
- Dados apresentados nos ecrãs são **de demonstração e identificados como tal**.
- `apps/api` contém apenas um esqueleto; a regra de negócio virá na fase seguinte.

## Documentação

- [`docs/architecture.md`](docs/architecture.md) — arquitetura e decisões
- [`docs/data-model.md`](docs/data-model.md) — modelo de dados
- [`docs/design-system.md`](docs/design-system.md) — design system (Fase 02)
- [`docs/sprint-01.md`](docs/sprint-01.md) — briefing do sprint
- [`docs/sprint-01-report.md`](docs/sprint-01-report.md) — relatório final do sprint

### Demonstração do design system

Rota interna **`/design-system`** (não indexada): paleta, tipografia, componentes, overlays, dados e estados.
