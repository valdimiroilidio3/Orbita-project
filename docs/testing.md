# Testes

## Comandos

| Comando                              | O que corre                            | Última execução (2026-10-18)             |
| ------------------------------------ | -------------------------------------- | ---------------------------------------- |
| `pnpm lint`                          | ESLint (web + packages)                | PASSOU — 0 erros, 0 avisos               |
| `pnpm typecheck`                     | `tsc --noEmit` em todos os workspaces  | PASSOU                                   |
| `pnpm test`                          | Vitest (executar a partir da **raiz**) | PASSOU — 175/175                         |
| `pnpm format:check`                  | Prettier                               | PASSOU                                   |
| `pnpm --filter @orbita/web build`    | `next build`                           | PASSOU — 43 rotas                        |
| `pnpm --filter @orbita/web test:e2e` | Playwright                             | **BLOQUEADO** (sem browsers no ambiente) |

## Cobertura por área (testes unitários existentes)

| Área                  | Ficheiros                                                                             | Nº    |
| --------------------- | ------------------------------------------------------------------------------------- | ----- |
| `@orbita/shared`      | format (inclui `maskPhoneNumber`), validações Zod                                     | 23    |
| Call engine (P6)      | lifecycle, simulador, repositório                                                     | ~24   |
| Voice engine (P7)     | webhooks (HMAC, replay, limites), ingestão, diagnóstico                               | 38    |
| Tool engine (P8)      | catálogo, executor, rate limit, aprovações, idempotência                              | 29    |
| Workflow engine (P8)  | triggers, placeholders, falhas em sequência                                           | 8     |
| Definições            | regras de membros (papéis, último owner), schemas (fuso, website, voz, palavra-passe) | 13    |
| Dashboard/auth/outros | overview agregações, env, nav                                                         | resto |

Os mocks nos testes unitários **não são prova de integração** com fornecedores externos.

## Testes que NÃO foram executados (e porquê)

| Teste                                                       | Estado         | Motivo                                                                        |
| ----------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------- |
| `supabase/tests/rls.test.sql`                               | NÃO EXECUTADO  | Sem PostgreSQL/pgTAP no ambiente; só sintaxe validada.                        |
| Migrações 0001–0006                                         | NÃO APLICADAS  | Idem.                                                                         |
| Definições com BD real (perfil, org, membros, preferências) | NÃO VERIFICADO | Sem Supabase; validado só por typecheck/lint/build e testes das regras puras. |
| Fluxo de autenticação real                                  | NÃO VERIFICADO | Sem credenciais Supabase neste ambiente.                                      |
| IDOR manual entre organizações                              | NÃO VERIFICADO | Depende de BD real com duas organizações.                                     |
| Chamada telefónica real                                     | BLOQUEADO      | Sem fornecedor/credenciais; adaptadores em `pending`.                         |
| Playwright e2e                                              | BLOQUEADO      | Browsers indisponíveis no sandbox.                                            |
| Lighthouse / axe                                            | NÃO VERIFICADO | Sem browser.                                                                  |

## Verificações manuais executadas (build de produção local, sem Supabase)

- Todas as rotas do dashboard respondem 200 e apresentam modo demo rotulado / estados vazios honestos.
- Headers de segurança presentes (ver `docs/security.md §7`).
- `/api/health` devolve estados sem segredos.

## Política

- Nunca alterar testes para «passar»; corrigir o código.
- Novas funcionalidades de servidor devem trazer testes unitários da lógica pura (sem rede).
- Testes de RLS usam identidades reais (`set_config('request.jwt.claims', …)`), nunca o service role.
