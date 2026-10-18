# Deployment

> Este documento descreve o procedimento previsto. **Nenhum deploy foi executado** a partir deste
> repositório; nenhuma migração foi aplicada a um projeto Supabase remoto.

## Pré-requisitos

- Node.js 20+, pnpm 10 (`npm i -g pnpm@10`).
- Projeto Supabase (PostgreSQL + Auth) com acesso ao SQL editor ou Supabase CLI.
- Plataforma de hosting Next.js (Vercel ou equivalente com runtime Node.js — as rotas de webhook usam `runtime = 'nodejs'`).

## 1. Base de dados

Migrações canónicas em `supabase/migrations/` (aplicar por ordem, uma única vez):

| Ficheiro                     | Conteúdo                                                    | Estado neste repositório |
| ---------------------------- | ----------------------------------------------------------- | ------------------------ |
| `0001_initial_schema.sql`    | organizations, memberships, agents, calls                   | criada; sintaxe validada |
| `0002_integrity.sql`         | triggers de integridade, `org_guard`, `set_updated_at()`    | criada; sintaxe validada |
| `0003_rls_policies.sql`      | RLS completo, matriz owner/admin/member, RPC                | criada; sintaxe validada |
| `0004_voice_engine.sql`      | call_events, voice_sessions, webhook_events                 | criada; sintaxe validada |
| `0005_tools_automations.sql` | tool_executions, approvals, workflows, contactos, marcações | criada; sintaxe validada |

**Não aplicadas nem testadas contra PostgreSQL real neste ambiente** (sem `psql`/Docker). Antes de produção:

1. Aplicar num projeto de _staging_ (`supabase db push` ou SQL editor).
2. Executar `supabase/tests/rls.test.sql` (pgTAP, plan 22) com identidades reais — ver `docs/security.md §5`.
3. Só depois aplicar em produção. `supabase/seed.sql` é **apenas demo** — nunca em produção.

## 2. Variáveis de ambiente

Configurar na plataforma de hosting conforme `docs/environment-variables.md`. Mínimo para produção:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. `SUPABASE_SERVICE_ROLE_KEY` só se os webhooks
de voz estiverem ativos. **Não** definir `ALLOW_FRAME_EMBEDDING`.

No Supabase Auth: definir Site URL e Redirect URLs (`/auth/callback`, `/auth/confirm`) para o domínio final.

## 3. Build

```bash
pnpm install --frozen-lockfile
pnpm lint && pnpm typecheck && pnpm test
pnpm --filter @orbita/web build
pnpm --filter @orbita/web start   # ou a plataforma
```

Comando de build para Vercel (root do monorepo): `pnpm --filter @orbita/web build`; diretório de output `apps/web/.next`.

## 4. Pós-deploy (checklist)

- [ ] `GET /api/health` responde 200 com `supabase: "available"` e sem segredos.
- [ ] Headers presentes: CSP, HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- [ ] Registo → confirmação de email → onboarding (criação de organização via RPC) → `/overview`.
- [ ] Um utilizador de outra organização **não** vê agentes/chamadas alheios (teste manual IDOR em `/agents/[id]` e `/calls/[id]`).
- [ ] `/integrations` reflete os estados reais.
- [ ] Logs da plataforma mostram linhas JSON (`event`, `correlationId`) sem números de telefone completos nem segredos.

## 5. Webhooks de voz (só quando houver fornecedor)

Ver `docs/voice-setup.md`. Até existir um teste real documentado, o estado é **«integração pendente»** — não configurar
callbacks no fornecedor sem `TELEPHONY_WEBHOOK_SECRET` definido.

## Rollback

- Aplicação: redeploy do commit anterior na plataforma.
- Base de dados: as migrações não incluem scripts `down`; qualquer reversão exige backup prévio (fazer _point-in-time
  backup_ no Supabase antes de aplicar migrações).
