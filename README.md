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

**Segurança:** as políticas RLS cobrem leitura e escrita em todas as tabelas, com matriz de papéis owner/admin/member e criação transacional de organizações. Ver [`docs/security.md`](docs/security.md).

## Qualidade e CI

- ESLint + Prettier + typecheck estrito + Vitest + Playwright.
- O workflow em `.github/workflows/ci.yml` corre lint, typecheck, testes unitários e build; erros impedem a conclusão do CI.

## Estado de produção

Ver [`docs/production-readiness.md`](docs/production-readiness.md) (relatório com estados PASSOU/FALHOU/BLOQUEADO/NÃO VERIFICADO)
e [`docs/known-limitations.md`](docs/known-limitations.md). Resumo honesto:

- Lint, typecheck, 162 testes unitários, build e formatação: **passam**.
- Autenticação Supabase, RLS e migrações: implementadas, **nunca aplicadas/executadas contra um Supabase real** neste repositório.
- Sem chamadas telefónicas reais, sem voz IA ativa, sem billing. Dados de demonstração **sempre identificados como tal**.
- `apps/api` contém apenas um esqueleto.

## Documentação

- [`docs/architecture.md`](docs/architecture.md) — arquitetura e decisões
- [`docs/data-model.md`](docs/data-model.md) — modelo de dados
- [`docs/security.md`](docs/security.md) — segurança multi-tenant e RLS (Fase 04)
- [`docs/authentication.md`](docs/authentication.md) — autenticação Supabase (Fase 04)
- [`docs/agent-studio.md`](docs/agent-studio.md) — Agent Studio e gestão de agentes (Fase 05)
- [`docs/call-engine.md`](docs/call-engine.md) — motor de chamadas e ciclo de vida (Prompt 06)
- [`docs/voice-architecture.md`](docs/voice-architecture.md) — motor de voz IA: arquitetura e decisão técnica (Prompt 07)
- [`docs/voice-setup.md`](docs/voice-setup.md) — configuração do motor de voz
- [`docs/voice-security.md`](docs/voice-security.md) — segurança e privacidade do motor de voz
- [`docs/voice-testing.md`](docs/voice-testing.md) — testes do motor de voz
- [`docs/tools-architecture.md`](docs/tools-architecture.md), [`docs/tool-security.md`](docs/tool-security.md), [`docs/automation-workflows.md`](docs/automation-workflows.md), [`docs/tool-integrations.md`](docs/tool-integrations.md), [`docs/tool-testing.md`](docs/tool-testing.md) — ferramentas e automações (Prompt 08)
- [`docs/settings.md`](docs/settings.md) — área de definições (perfil, organização, membros, segurança, preferências)
- [`docs/deployment.md`](docs/deployment.md) — procedimento de deploy e checklist pós-deploy
- [`docs/environment-variables.md`](docs/environment-variables.md) — todas as variáveis, âmbito e uso
- [`docs/testing.md`](docs/testing.md) — comandos, cobertura e testes bloqueados
- [`docs/known-limitations.md`](docs/known-limitations.md) — limitações conhecidas
- [`docs/production-readiness.md`](docs/production-readiness.md) — relatório final de prontidão
- [`docs/design-system.md`](docs/design-system.md) — design system (Fase 02)
- [`docs/dashboard.md`](docs/dashboard.md) — dashboard e navegação (Fase 03)
- [`docs/sprint-01.md`](docs/sprint-01.md) — briefing do sprint
- [`docs/sprint-01-report.md`](docs/sprint-01-report.md) — relatório final do sprint

### Demonstração do design system

Rota interna **`/design-system`** (não indexada): paleta, tipografia, componentes, overlays, dados e estados.
