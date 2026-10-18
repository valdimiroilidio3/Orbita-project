# ORBITA CHAT — Relatório do Sprint 1

Data: 2026-10-18 · Ramo: `arena/383bc668-orbita-project` · Node 22 · pnpm 10 · Next.js 16.4.2

## Resumo

A fundação visual e técnica do ORBITA CHAT está entregue: monorepo com pnpm workspaces, design system azul-claro/branco, shell responsivo, páginas Overview/Agents/Calls (mais Contacts/Integrations/Settings), schema PostgreSQL inicial com RLS, configuração de ambiente sem segredos e documentação. **Nenhuma integração externa é apresentada como ativa** e todos os dados de ecrã são de demonstração, identificados como tal.

## Checklist — 8/8 concluído

| Tarefa                                | Estado | Evidência                                                                                                                                                                                |
| ------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T01 — Repositório e workspaces        | ✅     | `pnpm install` funciona; `pnpm-lock.yaml` versionado; scripts documentados no README                                                                                                     |
| T02 — Design system                   | ✅     | Tokens em `apps/web/app/globals.css`; `Button`, `Badge`, `Card`, `Input`, `StatusBadge`, `EmptyState`, `PageHeader`, `MetricCard`, `AgentCard`, `CallsTable`                             |
| T03 — Shell da aplicação              | ✅     | `AppSidebar` + `Topbar` em `components/layout/`; sidebar fixa no desktop, drawer no mobile                                                                                               |
| T04 — Páginas Overview, Agents, Calls | ✅     | Build gera 12 rotas; filtros funcionais, estados vazios e CTAs operacionais                                                                                                              |
| T05 — Schema e migração               | ✅*    | `supabase/migrations/0001_initial_schema.sql` — verificado com o parser PostgreSQL (`libpg-query`): 20 statements sem erros de sintaxe (4 enums, 4 tabelas, 3 índices, RLS, 4 políticas) |
| T06 — Configuração Supabase           | ✅     | `.env.example` (raiz + `apps/web/`); `lib/env.ts` com erro descritivo; banner de modo demo quando faltam credenciais (coberto por testes)                                                |
| T07 — Qualidade e testes              | ✅*    | Lint **0 erros/0 warnings**; typecheck estrito OK; Vitest **26/26**; Playwright configurado (ver limitações); CI em `.github/workflows/ci.yml`                                           |
| T08 — Documentação                    | ✅     | `README.md`, `docs/architecture.md`, `docs/data-model.md`, `docs/sprint-01.md`, este relatório                                                                                           |

\* Ver "Testes executados" para o que foi (e não foi) executado neste ambiente.

## Testes executados e resultados

| Verificação                           | Comando              | Resultado                                                                                                                                                                             |
| ------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Instalação                            | `pnpm install`       | ✅ Sucesso (sem conflitos de peers)                                                                                                                                                   |
| Typecheck (TS estrito)                | `pnpm typecheck`     | ✅ Passa                                                                                                                                                                              |
| Lint                                  | `pnpm lint`          | ✅ 0 erros, 0 warnings                                                                                                                                                                |
| Testes unitários                      | `pnpm test`          | ✅ 26/26 passam (5 ficheiros: format, validation, env, utils, status-badge)                                                                                                           |
| Build de produção                     | `pnpm build`         | ✅ 12 rotas geradas (/, /overview, /agents, /agents/new, /calls, /contacts, /integrations, /settings, /login, /forgot-password, /api/health, 404)                                     |
| Migração SQL (sintaxe)                | parser `libpg-query` | ✅ 20 statements válidos; `seed.sql` válido (2 inserts)                                                                                                                               |
| Migração SQL (execução em base local) | `supabase db push`   | ⛔ Não executada — sem Docker/PostgreSQL neste ambiente. Comandos documentados no README                                                                                              |
| Testes e2e                            | `pnpm test:e2e`      | ⛔ Não executados — download de browsers Playwright bloqueado neste ambiente. Specs prontos em `apps/web/tests/e2e/`; correr `pnpm exec playwright install chromium && pnpm test:e2e` |

**Nenhum teste foi declarado como passado sem ter corrido.**

## Ficheiros criados (principais)

```
orbita-chat/
├── apps/
│   ├── web/
│   │   ├── app/                    # (auth), (dashboard), api/health, globals.css
│   │   ├── components/             # ui/, layout/, dashboard/, agents/
│   │   ├── lib/                    # env.ts, utils.ts, supabase/, demo-data.ts
│   │   ├── tests/                  # unitários + e2e (Playwright)
│   │   ├── eslint.config.mjs · playwright.config.ts · next.config.ts · .env.example
│   └── api/                        # esqueleto documentado (sem backend duplicado)
├── packages/
│   ├── database/                   # tipos do schema (@orbita/database)
│   ├── shared/                     # domínio + zod + formatação (@orbita/shared)
│   └── config/                     # tsconfig base
├── supabase/
│   ├── migrations/0001_initial_schema.sql
│   └── seed.sql                    # demo identificado
├── docs/                           # architecture · data-model · sprint-01 · relatório
├── .github/workflows/ci.yml
└── package.json · pnpm-workspace.yaml · turbo.json · .env.example · README.md
```

## Decisões e regras cumpridas

1. Monorepo simples, sem microserviços — `apps/api` é esqueleto por decisão (evita backend duplicado no Sprint 1).
2. Sem segredos no repositório: só `.env.example` sem valores; `.gitignore` bloqueia `.env*`.
3. Dados fictícios existem apenas em `lib/demo-data.ts`, com banner `DemoBanner` obrigatório nos ecrãs e badges "Demo" por linha/cartão/métrica.
4. O estado "Supabase não configurado" é visível na UI (banner + página de definições + `/api/health`), nunca silencioso.
5. Frontend não contém regras de negócio nem chama fornecedores externos; variáveis de telefonia/IA/billing existem apenas como modelo e não são usadas.
6. RLS ativo com políticas de leitura por organização; escrita deliberadamente não permitida neste sprint.

## Problemas pendentes / limitações

1. **E2E não executado** no ambiente de build (download de browsers bloqueado). CI tem job comentada pronta a ativar.
2. **Migração não aplicada a uma base real** neste ambiente (sem Docker/PostgreSQL); sintaxe verificada, execução documentada (`supabase start && supabase db push`).
3. **RLS sem escrita**: antes de qualquer UI escrever dados, adicionar políticas INSERT/UPDATE/DELETE por função e criação segura de organizações.
4. **Autenticação não ligada** (`/login` e `/forgot-password` são visuais e informam o utilizador).
5. `allowedDevOrigins` do Next cobre hosts de preview dinâmicos — ajustar para o domínio definitivo em produção.

## Próximos passos (Sprint 2 sugerido)

1. Motor de voz + primeira chamada real (Twilio), sem misturar com o dashboard já entregue.
2. Autenticação Supabase Auth + memberships reais + políticas de escrita.
3. Backend NestJS em `apps/api` com validação de organização por operação.
4. Ativar job de Playwright no CI e correr migração num Supabase de staging.
5. Tabelas `contacts` e `events` conforme `docs/data-model.md`.
