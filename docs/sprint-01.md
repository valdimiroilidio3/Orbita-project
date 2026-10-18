# ORBITA CHAT — Sprint 1

## Contexto

Construir de raiz a fundação de uma plataforma SaaS multiempresa de agentes de voz IA. O produto permitirá gerir agentes, chamadas, contactos e integrações em fases posteriores.

## Stack

- Node.js LTS + pnpm workspaces
- Next.js App Router + React + TypeScript estrito
- Tailwind CSS + componentes shadcn-style
- Lucide React, Recharts, Zod
- Supabase + PostgreSQL
- Vitest (unit) e Playwright (e2e)
- ESLint + Prettier (+ Turbo)

## Objetivo do sprint

Entregar uma aplicação SaaS responsiva com design system azul-claro e branco, shell de navegação, dashboard inicial, páginas de agentes e chamadas, schema inicial, configuração de ambiente e documentação.

## Regras obrigatórias

1. Inspecionar a estrutura atual antes de criar ou modificar ficheiros.
2. Não substituir ficheiros de configuração sem verificar o seu conteúdo.
3. Não inventar credenciais nem declarar integrações como ativas sem testes reais.
4. Nunca expor segredos no cliente.
5. Não apresentar dados fictícios como métricas reais. Identificar claramente qualquer seed ou demonstração.
6. Utilizar componentes reutilizáveis e tipos explícitos.
7. Implementar estados de carregamento, erro e ausência de dados.
8. Aplicar autorização no servidor e políticas RLS na base de dados.
9. Não implementar chamadas reais neste sprint.
10. Executar lint, typecheck e testes após cada conjunto de alterações.

## Ordem de execução

1. Criar e verificar o monorepo.
2. Implementar tokens e componentes UI.
3. Construir o layout autenticado e a navegação.
4. Implementar Overview, Agents e Calls.
5. Criar e testar a migração PostgreSQL.
6. Preparar a configuração de ambiente.
7. Adicionar testes automatizados.
8. Documentar instalação, arquitetura, segurança e limitações.

## Checklist

- [x] T01 — Criar repositório e workspaces (`pnpm install` funciona; scripts documentados)
- [x] T02 — Implementar design system (cores, tipografia, botões, badges, cards, estados vazios)
- [x] T03 — Construir shell da aplicação (sidebar, topbar, responsivo desktop/mobile)
- [x] T04 — Criar páginas Overview, Agents e Calls (rotas carregam; estados vazios e CTAs funcionam)
- [x] T05 — Adicionar schema e migração (SQL canónico + constraints e índices verificados)
- [x] T06 — Preparar configuração Supabase (`.env.example`; aviso explícito sem credenciais)
- [x] T07 — Configurar qualidade e testes (lint, typecheck, vitest, playwright; CI)
- [x] T08 — Documentar execução e segurança (README + docs)

## Definição de concluído

O projeto arranca localmente, as páginas funcionam em ecrãs móveis e desktop, os scripts de qualidade passam, as migrações estão documentadas e nenhum serviço externo é apresentado como conectado sem confirmação real.

## Ecrãs

| Ecrã     | Conteúdo                                                                                                 |
| -------- | -------------------------------------------------------------------------------------------------------- |
| Overview | Métricas iniciais (demo identificada), atividade recente, estado da plataforma, atalho para criar agente |
| Agents   | Listagem, filtros visuais, estados, ecrã vazio com CTA                                                   |
| Calls    | Tabela com estado, direção, duração e data — sem chamadas fictícias apresentadas como reais              |

## Design system

| Token      | Valor     |
| ---------- | --------- |
| Primary    | `#1769E0` |
| Accent     | `#69A7FF` |
| Soft blue  | `#EAF3FF` |
| Background | `#FFFFFF` |
| Surface    | `#F6F8FC` |
| Text       | `#17243A` |

Fonte: Inter (ou sistema equivalente). Border radius 10–16 px. Escala de espaçamento de 4 px.

## Resultado esperado

No final do Sprint 1 existe a fundação visual e técnica do ORBITA CHAT. O próximo sprint concentra-se no motor de voz e na primeira chamada real, sem misturar essa complexidade com a construção inicial do dashboard.
