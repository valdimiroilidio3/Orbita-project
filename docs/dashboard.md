# ORBITA CHAT — Dashboard e navegação (Prompt 03)

> Entrega: Overview completo sobre o design system, camada de dados com estados
> reais e shell definitivo com navegação persistente.

## 1. Camada de dados (`apps/web/lib/dashboard/`)

```
types.ts     — OverviewData · CallRecord · AgentSummary · OverviewMetric · ActivityPoint
service.ts   — fetchOverview() · buildDemoOverview() · buildLiveOverview()
use-overview.ts — hook de estado: loading · ready · error (+ retry + fallback)
```

### Fontes de dados (regra de produto)

| `source` | Origem                        | Identificação em ecrã                               |
| -------- | ----------------------------- | --------------------------------------------------- |
| `demo`   | `lib/demo-data.ts` (fictício) | `DemoBanner` + badges "Demo" em métricas e registos |
| `live`   | Supabase (leitura real, RLS)  | Banner "Dados reais (Supabase)"                     |

- **Nunca** dados fictícios como reais: `OverviewData.source` + `CallRecord.isDemo` / `AgentSummary.isDemo` acompanham sempre os dados.
- Sem Supabase configurado → `demo` (com latência curta para exercitar o estado de loading).
- Com Supabase configurado → `live`; erros de leitura **propagam** para o estado de erro.
- **Fallback para demo é sempre explícito**: o utilizador clica "Ver dados de demonstração" após um erro; nunca há troca silenciosa de fonte.

### Estados do Overview

```
loading (skeletons do design system)
  → ready (demo identificado | live real | vazio honesto)
  → error (ErrorState + retry + fallback explícito)
```

## 2. Navegação persistente (`apps/web/lib/navigation.ts`)

- **Sidebar colapsável**: preferência guardada em `localStorage` (`orbita-chat:sidebar`), restaurada no arranque; guardas para SSR e armazenamento indisponível. Modo colapsado: ícones + tooltips + `aria-label`.
- **Breadcrumbs automáticos**: `buildBreadcrumbs(pathname)` (função pura, testada) deriva o trilho da configuração tipada (`nav-config.ts`) + segmentos (`/agents/new` → `Agents › Novo`). Renderizados na topbar em todas as páginas.
- **Skip link** "Saltar para o conteúdo" (WCAG) + `main#main-content`.

## 3. Shell definitivo (`components/layout/`)

- `AppShell` — sidebar fixa (desktop, colapso persistente) + drawer (mobile/tablet) + topbar + `Container` + rodapé honesto (não há integrações ativas; link para `/design-system`).
- `Topbar` — menu mobile, breadcrumbs, pesquisa, seletor de organização, `NotificationIndicator`, `UserMenu`.
- `AppSidebar` — variantes `desktop` (colapsável) e `drawer`; secções `upcoming` só como "Em breve".

## 4. Componentes atualizados

- `CallsTable` → sobre `DataTable` do design system, tipado com `CallRecord` (badge Demo condicional).
- `ActivityChart` → recebe `data: ActivityPoint[]` (sem origem própria).
- `AgentCard` → tipado com `AgentSummary` (badge Demo via `isDemo`).
- `StatCard` → métricas do serviço (ícone por chave; tendências só quando reais — live usa `trendPercent: null`).

## 5. Limites desta fase

- Sem escrita na base de dados e sem autenticação (RLS apenas leitura).
- A consulta `live` assume tabelas `calls`/`agents` do schema Fase 01; sem sessão autenticada o resultado pode ser vazio — apresentado como estado vazio honesto.
- Pesquisa global da topbar e seletor de organização permanecem infraestrutura visual.
- Verificação visual de breakpoints por revisão de CSS (browsers Playwright indisponíveis no ambiente de build).
