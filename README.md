# ORBITA ENGINE

**Sistema operativo de websites gerado por IA** — mas a IA **nunca** gera código React arbitrário.

A AI produz **intenção estruturada** (um *Site Schema* em JSON). Um **component engine determinístico** é a única coisa que transforma essa intenção em website: *mesmo schema + mesmo assets + mesmos componentes → mesma saída, sempre.*

```
briefing → análise do negócio → SITE SCHEMA (JSON canónico)
          → design tokens      → component registry (13 componentes, variantes validadas)
          → page engine        → renderer (React, determinístico)
          → validação          → preview seguro (token HMAC) → deploy (Phase 07)
```

A **Site Schema é a única fonte de verdade**: editor, AI, preview, versioning e deploy operam sempre sobre ela — nunca há representações concorrentes.

---

## Estado atual (Phase 01 + 02 completas)

| Phase | Nome | Estado |
|---|---|---|
| 01 | Foundation | ✅ Next.js 15 · TypeScript strict · Auth (NextAuth v5, credentials + JWT) · multi-tenant DB · Project model |
| 02 | **Website Engine** | ✅ Site Schema (Zod) · Design Tokens · Component Registry · Page Engine · Renderer · preview seguro · geração determinística · versões · qualidade |
| 03 | **Visual Editor** | ✅ Canvas WYSIWYG (mesmo renderer do deploy, CSS scoped por container queries) · seleção por clique · edição in-place (duplo clique, caminho exato do prop) · drag & drop com indicador · breakpoints M/T/D reais · inserção de secção com variant picker + placeholders honestos · undo/redo persistido (revalidado em Zod) · inspector por campo · modo Preview (iframe real) |
| 04 | AI | ⏳ adapters limpos preparados; o pipeline atual é uma **template engine determinística** (não é um LLM — e o sistema nunca finge o contrário) |
| 05 | Assets | ✅ upload validado (mime, tamanho), dimensões detetadas, media library, entrega autorizada |
| 06 | Quality | ✅ checks reais: contraste WCAG (cálculo matemático), SEO, a11y, integridade de assets — sem scores inventados |
| 07 | Deployment | ⏳ GitHub · Vercel · domains (o botão "Publicar" está desativado e diz isso — não é simulado) |
| 08 | SaaS | ⏳ billing · teams · analytics de tráfego |

### O que podes fazer já

1. **Criar um projeto** (wizard de 3 passos: negócio → assets → direção visual).
2. **Gerar o website** — o pipeline corre de verdade (cada step é medido e persistido em `generationLog`).
3. **Editar visualmente** no hub: canvas que renderiza o site com o mesmo pipeline do deploy; clica para selecionar, duplo clique edita o texto no local (guarda para o prop exato, validado em Zod), arrasta para reordenar, comuta M/T/D, insere secções (com variant picker e placeholders), desfaz/refaz (⌘Z / ⇧⌘Z) — cada operação é uma mutação mínima sobre o Site Schema, revalidada no servidor antes de gravar.
4. **Versionar** — versões imutáveis; *restaurar* cria sempre uma versão nova; diff real entre versões.
5. **Partilhar preview** — link assinado (HMAC, 7 dias) que só dá acesso ao projeto, com o mesmo renderer do deploy.
6. **Ver qualidade** — relatório real (checks passados/falhados + issues), nunca um número decorativo.
7. **Contacto** — o formulário do website gerado é real: POST a uma server action com authz (sessão ou token de preview) e persiste a submissão.

### Regras que o sistema não viola

- **Nada é inventado.** Stats, testemunhos, preços, projetos só aparecem se existirem no briefing. O que falta fica registrado em `metadata.missingInputs` e aparece no relatório de qualidade.
- **Schema inválido nunca chega ao renderer.** Toda a fronteira tem Zod (brief → schema → mutações → edição).
- **Tenant isolation na camada de dados.** Cada query de projeto passa por membership check; assets só entregues a membros da org ou a token de preview válido do projeto.
- **Design tokens apenas.** Zero cores/typografia hardcoded nos componentes; tudo deriva do theme do schema.

---

## Arranque local

```bash
npm install
npm run db:seed      # demo user + 3 projetos (MODUS ready, BRASA ready, NEXA draft)
npm run dev          # http://localhost:3000
```

**Login demo:** `demo@orbita.dev` / `orbita-demo-2026`

- NEXA Labs fica em *draft* com briefing guardado: abre o hub e clica **Gerar website** para veres o pipeline completo a correr ao vivo.
- `npm test` — suite de testes (determinismo, mutações mínimas, qualidade, tokens de preview, schema)
- `npm run typecheck`

Variáveis em `.env`: `AUTH_SECRET`, `PREVIEW_SECRET`, `DATABASE_URL`, `APP_URL`.

---

## Arquitetura

```
app/
  (app)/                     # produto (autenticado)
    dashboard · projects · templates · assets · analytics · settings
    projects/new             # wizard (briefing → assets → direção → geração)
    projects/[projectId]     # hub: editor de secções + preview + qualidade + versões
  (site)/
    preview/[token]/         # chrome público do preview (token HMAC assinado)
    preview/[token]/site/    # o website renderizado (mesmo pipeline do deploy)
  api/
    asset/[id]               # entrega de assets com authz (sessão ou ?pt=)
    auth/[...nextauth]       # NextAuth v5
lib/
  site-schema/               # ★ Site Schema (Zod, v1.0) + catalog + migrations
  engine/
    brief.ts                 # briefing (única fonte factual; Zod)
    playbooks.ts             # estratégia por indústria (sequência de secções + paleta)
    generator.ts             # pipeline determinístico (7 steps medidos, log persistido)
    content.ts               # conteúdo só a partir do briefing (sem invenção)
    build-theme.ts           # design tokens a partir de indústria + overrides do utilizador
    page-engine.ts           # resolve schema → site pronto a renderizar (validação final)
    mutations.ts             # mutações de nó mínimo (reorder, props, hide, diff)
    renderer.tsx             # React determinístico: schema → UI
  registry/                  # 13 componentes + variantes, cada um com schema Zod próprio
  theme/tokens.ts            # token → CSS (responsivo por breakpoint, sem media queries duplicadas)
  quality/report.ts          # checks reais (WCAG contrast math, SEO, a11y, assets)
  preview/token.ts           # tokens HMAC com expiração
  db/                        # ★ camada de dados isolada (ADR-003)
  server/                    # server actions + authz + contact
test/                        # vitest
```

### ADR-003 — Banco de dados

**Objetivo de produção:** PostgreSQL (schema canónico em `prisma/schema.prisma`; ORM a decidir entre Prisma/Drizzle na Phase 07).

**Neste sandbox:** o runtime usa **Node 22 `node:sqlite`** (SQLite em WAL). O motivo é prático: os binaries do Prisma não são transferíveis neste ambiente (rede bloqueada), e o objetivo das Phase 01–02 não depende de Postgres.

**O que garante a troca:** *todo* o acesso a dados passa por `lib/db/{client,repo}.ts`. A app, as server actions e o seed nunca tocam na engine diretamente. Trocar SQLite → Postgres = reescrever a camada `repo` (as queries são SQL simples) — zero mudanças nas restantes camadas.

### ADR-002 — AI como adapter, não como gerador de código

A Phase 04 liga um LLM **atrás do mesmo contrato** do generator atual (`generateWebsite(brief, {assetIds}) → {schema, log}`). O LLM substitui as steps de estratégia/conteúdo/layout — o Site Schema, o registry e o renderer não mudam. Até lá, o sistema usa uma template engine determinística e **nunca apresenta a sua saída como "IA"**.

### Segurança do preview

- URL de preview = token HMAC (payload: `projectId.expiresAt`, assinatura: `PREVIEW_SECRET`, TTL 7 dias).
- O token dá **só** leitura ao render do projeto + assets via `?pt=`.
- O token pode ser regenerado a qualquer momento (links antigos morrem).
- O contacto no website exige sessão de membro da org **ou** token válido do projeto.

### Versões

- Imutáveis: cada geração/edição relevante cria uma `Version` com o snapshot do schema.
- **Restaurar = criar nova versão** (nunca apagar histórico).
- Diff calculado por comparação de nós (secções added/removed/changed, theme, nav).
- Migrations: `lib/site-schema/migrations.ts` aplica a chain vN→vN+1 ao JSON persistido — a evolução da biblioteca de componentes não quebra projetos existentes.

---

## Testes

```bash
npm test
```

- **determinismo** — mesmo brief → schema byte-idêntico; assets extras não alteram o resultado
- **sem invenção** — stats/testemunhos/preços só com dados no briefing; `missingInputs` registrado
- **assets** — refs `asset:<id>` inválidas são descartadas e reportadas
- **mutações mínimas** — editar 1 secção muda 1 secção (diff verificada)
- **schema** — types/variantes desconhecidos, cores inválidas e ids duplicados rejeitados
- **qualidade** — contraste calculado de verdade (fundo=texto → fail), assets partidos → critical
- **preview tokens** — round-trip, tamper, expiração

## Roadmap honesto

O que **ainda não existe** (não é escondido nem simulado na UI):
- LLM na Phase 04 (o contrato já está desenhado; a geração atual é template engine)
- Deploy GitHub/Vercel + domains (Phase 07) — "Publicar" fica desativado até lá
- Analytics de tráfego dos sites (Phase 08)
- Teams/billing (Phase 08)
