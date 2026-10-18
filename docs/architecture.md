# ORBITA CHAT — Arquitetura

> Estado atual (2026-10-18): aplicação Next.js completa com autenticação Supabase, Agent Studio, Calls Center,
> motor de voz (pendente de fornecedor), ferramentas/automações, integrações com estado real, analytics e billing
> informativo. **Nenhuma integração externa paga está ativa.** Ver `docs/production-readiness.md`.

## Visão geral

O ORBITA CHAT é uma plataforma SaaS multiempresa de agentes de voz IA. O Sprint 1 entrega apenas a base: monorepo, design system, shell de navegação, dashboard inicial, schema de dados e documentação.

```
orbita-chat/
├── apps/
│   ├── web/          # Next.js (App Router) — dashboard do produto
│   └── api/          # Backend dedicado (esqueleto) — fase seguinte
├── packages/
│   ├── database/     # Tipos derivados do schema (migrações em /supabase)
│   ├── shared/       # Tipos, validações (Zod) e formatação comuns
│   └── config/       # tsconfig base e convenções partilhadas
├── supabase/         # Migrações SQL canónicas + seed de demonstração
└── docs/             # Arquitetura, modelo de dados, sprints
```

## Decisões

1. **Monorepo simples, sem microserviços prematuros.** pnpm workspaces; sem duplicação de lógica entre frontends e packages.
2. **Frontend não concentra regras de negócio nem segredos.** O `apps/web` apenas consome tipos/utilitários partilhados; qualquer segredo vive em variáveis de ambiente do servidor. Variáveis `NEXT_PUBLIC_*` são apenas valores públicos (URL/anon key).
3. **`apps/api` (NestJS) é esqueleto.** No Sprint 1 não contém backend duplicado. A regra de negócio nasce aí nas fases seguintes, incluindo validação da organização do utilizador em cada operação.
4. **Supabase como base de dados e autenticação.** PostgreSQL com RLS. O schema inicial cobre `organizations`, `memberships`, `agents` e `calls`.
5. **Qualidade bloqueia o CI.** ESLint, Prettier, typecheck (TypeScript estrito), testes unitários (Vitest) e e2e (Playwright) estão definidos; o workflow de CI falha com erros.

## Fluxo de dados (previsto)

```
Browser ──> apps/web (Next.js) ──> Supabase (PostgreSQL + Auth + RLS)
                     │
                     └── (fase seguinte) apps/api (NestJS) ──> Supabase
                                        │
                                        └── Provedores: voz (Twilio), IA (OpenAI), billing (Stripe)
```

No Sprint 1 **não existem chamadas reais, IA, telefonia ou billing**. Os ecrãs usam estados vazios ou dados de demonstração claramente identificados.

## Segurança

- Nunca usar `NEXT_PUBLIC_` em segredos; `SUPABASE_SERVICE_ROLE_KEY` é opcional e apenas de servidor.
- Nunca comitar `.env.local` ou credenciais (`.gitignore` cobre isso).
- **RLS completo (leitura e escrita)** em todas as tabelas, com matriz de papéis
  owner/admin/member — ver [`docs/security.md`](security.md).
- Identidade sempre via `auth.uid()`; criação de organizações via RPC transacional.
- Autenticação Supabase Auth com SSR (cookies httpOnly) — ver [`docs/authentication.md`](authentication.md).
- A API de serviço (futura) valida a organização do utilizador em cada operação.

## Camadas do servidor (`apps/web`)

```
app/(dashboard)/*        páginas (server components, force-dynamic quando há dados por utilizador)
lib/server/*             leitura + server actions (requireUser → getActiveOrganization → papel → Zod → Supabase)
lib/voice/*, lib/tools/* motores puros + adaptadores (fail-closed sem credenciais)
lib/integrations/status  estado real de cada integração (usado por /integrations e /api/health)
lib/observability/logger logs JSON com correlationId e redação de chaves sensíveis
app/api/*                health e webhooks (runtime nodejs; HMAC; service role apenas aqui e no executor)
```

Headers de segurança e CSP são definidos em `next.config.ts` (build-time).

## Frontend (`apps/web`)

- Next.js App Router, React 19, TypeScript estrito, Tailwind CSS 4.
- Design system próprio (tokens em `app/globals.css`), componentes shadcn-style em `components/ui`.
- Camadas: `components/ui` (primitivos) → `components/layout|dashboard|agents` (produto) → `app/(dashboard)` (páginas).
- `lib/env.ts` valida variáveis em falta e a UI **não falha silenciosamente**: mostra um aviso explícito quando o Supabase não está configurado.
- Layout responsivo (desktop com sidebar fixa; mobile com sidebar em drawer).
