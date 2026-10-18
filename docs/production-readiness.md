# Production readiness — relatório final

Data: 2026-10-18 · Branch: `arena/383bc668-orbita-project` · Ambiente de verificação: sandbox sem Supabase, sem browser, sem rede externa.

Estados: **PASSOU** · **FALHOU** · **BLOQUEADO** (impossível neste ambiente) · **NÃO VERIFICADO** (possível mas não feito).

## Veredicto

**Não pronto para produção com utilizadores reais** enquanto os itens críticos abaixo não forem fechados.
O código está limpo (lint/typecheck/test/build), honesto (sem dados falsos como reais) e seguro por desenho,
mas a camada de dados (RLS/migrações) e a autenticação **nunca foram exercitadas contra um Supabase real**.

### Críticos por resolver (bloqueiam go-live)

1. Aplicar migrações 0001–0005 em staging e executar `rls.test.sql` — **BLOQUEADO** aqui.
2. Teste manual IDOR/authz com duas organizações reais — **NÃO VERIFICADO**.
3. Fluxo de autenticação ponta a ponta com Supabase Auth real — **NÃO VERIFICADO**.

## 1. Integridade e segurança

| Item                                                      | Estado          | Evidência                                                                                          |
| --------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------- |
| Headers (CSP, HSTS, XFO, nosniff, Referrer, Permissions)  | PASSOU          | `next.config.ts`; verificados por `curl` no build de produção.                                     |
| Segredos fora do bundle (`NEXT_PUBLIC_` só URL/anon)      | PASSOU          | Auditoria `grep process.env` — só `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` em lib. |
| Authz em server actions (requireUser + org ativa + papel) | PASSOU (código) | `lib/server/*-actions.ts`; sem teste com BD real.                                                  |
| RLS sem políticas recursivas/permissivas                  | NÃO VERIFICADO  | SQL revisto e sintaxe validada; execução pgTAP BLOQUEADA.                                          |
| IDOR em `/agents/[id]`, `/calls/[id]`, `/tools/[id]`      | PASSOU (código) | Queries filtram por `organization_id` + RLS; teste real NÃO VERIFICADO.                            |
| Webhooks: HMAC, replay 300s, 64KB, dedup, rate limit      | PASSOU          | 38 testes unitários do voice engine.                                                               |
| Rate limiting ferramentas (20/min call, 120/min org)      | PASSOU          | Testes do tool engine.                                                                             |
| Histórico de chamadas imutável (sem delete)               | PASSOU (código) | Sem política DELETE em `calls`; sem action de delete.                                              |
| `.env.example` sem valores reais                          | PASSOU          | Corrigida linha truncada `SUPABASE_SERVICE_ROLE_KEY=` (defeito pré-existente).                     |

## 2. Funcionalidade

| Módulo       | Estado           | Notas                                                                                                 |
| ------------ | ---------------- | ----------------------------------------------------------------------------------------------------- |
| Dashboard    | PASSOU           | Agregações reais (`buildLiveOverview`); demo rotulado com `DemoBanner`.                               |
| Agent Studio | PASSOU           | CRUD + duplicar (novo) + pausar/arquivar; Zod no servidor.                                            |
| Calls Center | PASSOU           | Filtros/pesquisa/paginação **server-side** (novo); números mascarados na lista, completos no detalhe. |
| Voz          | PASSOU (honesto) | Estados reais; nenhuma chamada real; «verificada» só com evidência.                                   |
| Ferramentas  | PASSOU           | Allowlist, risco mínimo, aprovações, idempotência.                                                    |
| Integrações  | PASSOU           | Página reflete `buildIntegrationStatuses` (4 estados) — sem simular «ativo».                          |
| Contactos    | PASSOU           | Pedidos + marcações reais; transição de estado open→contacted→closed (novo).                          |
| Billing      | PASSOU (honesto) | Página informativa; **não implementado**, sem pagamentos simulados.                                   |
| Analytics    | PASSOU (honesto) | Agregações reais 30 dias; métricas de áudio marcadas «não medidas».                                   |

## 3. Design system / UI

PASSOU (visual, inspeção de código): tokens da paleta em `globals.css`, componentes em `components/ui`, `loading.tsx` e `error.tsx` no dashboard (novos). Teste visual em browser a 375/768/1280/1440: **BLOQUEADO**.

## 4. Responsividade e acessibilidade

NÃO VERIFICADO em browser real (axe/Lighthouse BLOQUEADOS). Código: `aria-busy`/`aria-live` no loading, `sr-only`, foco visível, `prefers-reduced-motion` nos tokens.

## 5. Qualidade de código

| Comando      | Estado | Resultado                                                                            |
| ------------ | ------ | ------------------------------------------------------------------------------------ |
| lint         | PASSOU | 0 erros, 0 avisos                                                                    |
| typecheck    | PASSOU | 0 erros                                                                              |
| test         | PASSOU | 162/162                                                                              |
| format:check | PASSOU | (70 ficheiros reformatados nesta fase)                                               |
| build        | PASSOU | 32 rotas; aviso Next 16: `middleware` → `proxy` (não bloqueante, migrar futuramente) |

## 6. Base de dados e migrações

Criadas: 0001–0005 + `rls.test.sql`. Testadas sintaticamente: sim. **Aplicadas: NÃO (em nenhum ambiente).** Executadas: NÃO.

## 7. Performance

NÃO VERIFICADO com carga. Decisões: paginação server-side (10/pág), `limit(5000)` na agregação de analytics, páginas dinâmicas sem cache de dados sensíveis (`force-dynamic`, `no-store` no health).

## 8. Observabilidade

PASSOU (mínimo): logger JSON com `correlationId` (`x-request-id` propagado nos webhooks), redação de chaves sensíveis; `/api/health` sem segredos. Sem APM/alertas (ver limitações).

## 9. Configuração de produção

PASSOU (documentado): `docs/deployment.md`, `docs/environment-variables.md`. `ALLOW_FRAME_EMBEDDING` é build-time e só para previews. Deploy real: **NÃO EXECUTADO** (sem autorização e sem credenciais).

## 10. Documentação

PASSOU: README, architecture, security atualizados; novos: deployment, environment-variables, testing, known-limitations, production-readiness.

## 11. Pendências e próximos passos

1. Staging Supabase: aplicar migrações, correr pgTAP, teste IDOR com 2 orgs, autenticação real.
2. Migrar `middleware.ts` → `proxy.ts` (Next 16).
3. CSP com nonces.
4. Rate limiting distribuído para webhooks (multi-instância).
5. Fornecedor de telefonia: confirmar docs oficiais, teste real documentado, só então «verificada».
6. Billing: decisão de produto antes de qualquer implementação.
