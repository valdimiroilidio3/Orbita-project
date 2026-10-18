# ORBITA CHAT — Arquitetura

> Estado atual: **fundação (Sprint 1)**. Nenhuma integração externa está ativa.

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

- Nunca usar `NEXT_PUBLIC_` em segredos.
- Nunca comitar `.env.local` ou credenciais (`.gitignore` cobre isso).
- RLS ativo em todas as tabelas do schema inicial; políticas de **leitura** para membros da organização.
- Políticas de escrita (INSERT/UPDATE/DELETE) por função (owner/admin/member), criação segura de organizações e isolamento de novos recursos são trabalho imediato pós-Sprint 1, antes de qualquer escrita a partir da UI.
- A API de serviço (futura) valida a organização do utilizador em cada operação.

## Frontend (`apps/web`)

- Next.js App Router, React 19, TypeScript estrito, Tailwind CSS 4.
- Design system próprio (tokens em `app/globals.css`), componentes shadcn-style em `components/ui`.
- Camadas: `components/ui` (primitivos) → `components/layout|dashboard|agents` (produto) → `app/(dashboard)` (páginas).
- `lib/env.ts` valida variáveis em falta e a UI **não falha silenciosamente**: mostra um aviso explícito quando o Supabase não está configurado.
- Layout responsivo (desktop com sidebar fixa; mobile com sidebar em drawer).
