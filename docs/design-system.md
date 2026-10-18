# ORBITA CHAT — Design System (Fase 02)

> Documento de decisão e referência do design system oficial.
> Demonstração visual: **`/design-system`** (rota interna, não indexada, identificada como demo).

## 1. Princípios

- **Hierarquia clara** — títulos com personalidade, dados operacionais sempre legíveis.
- **Azul com propósito** — `primary` apenas em ações prioritárias, estados ativos e destaques; nunca em todos os elementos.
- **Superfícies luminosas** — canvas `#F6F8FC` com cartões brancos: conforto para utilização prolongada.
- **Consistência** — escala de 4 px, raios discretos (8–16 px), sombras suaves reservadas a overlays/menus.
- **Movimento útil** — transições de 120–220 ms, sem animações decorativas; `prefers-reduced-motion` respeitado.

## 2. Tokens (`apps/web/app/globals.css`)

Definidos como variáveis CSS no `@theme` do Tailwind v4 (geram utilitários: `bg-primary`, `text-h1`, `shadow-lg`, `duration-fast`, …).

### Cores

| Token                                          | Valor                             | Uso                                |
| ---------------------------------------------- | --------------------------------- | ---------------------------------- |
| `--color-primary`                              | `#1769E0`                         | Ações prioritárias, ativos         |
| `--color-primary-hover`                        | `#1258C4`                         | Hover primário                     |
| `--color-accent`                               | `#69A7FF`                         | Destaques de apoio                 |
| `--color-soft-blue`                            | `#EAF3FF`                         | Fundos suaves                      |
| `--color-background`                           | `#F6F8FC`                         | Canvas da aplicação                |
| `--color-surface` / `--color-surface-elevated` | `#FFFFFF`                         | Cartões, sidebar, topbar, overlays |
| `--color-text`                                 | `#17243A`                         | Texto principal                    |
| `--color-muted`                                | `#6B7890`                         | Texto secundário                   |
| `--color-border`                               | `#E3EAF4`                         | Bordas                             |
| `--color-success` / `-text` / `-soft`          | `#15966A` / `#0F6B4C` / `#E2F3EC` | Estados positivos (foreground AA)  |
| `--color-warning` / `-text` / `-soft`          | `#D99118` / `#8C5A0E` / `#FAF0DC` | Atenção                            |
| `--color-danger` / `-text` / `-soft`           | `#D64545` / `#B32D2D` / `#F9E5E5` | Erro/destrutivo                    |
| `--color-focus`                                | `#8AB8FF`                         | Anel de foco WCAG                  |

Variantes `-text` garantem contraste AA sobre fundos `-soft` (badges e alertas).

### Tipografia (Inter)

| Token            | Escala      | Uso                           |
| ---------------- | ----------- | ----------------------------- |
| `--text-display` | 36/44 · 700 | Títulos de destaque           |
| `--text-h1`      | 30/36 · 700 | Título de página              |
| `--text-h2`      | 24/32 · 650 | Secção principal              |
| `--text-h3`      | 20/28 · 600 | Subsecção / cartão            |
| `--text-body`    | 16/24       | Conteúdo normal               |
| `--text-small`   | 14/20       | Informação secundária / dados |
| `--text-caption` | 12/16       | Metadados                     |
| `--text-label`   | 13/18 · 550 | Rótulos de formulário         |

Inter é usada via stack de sistema (compatível com a configuração existente; sem downloads externos em build). Evita-se excesso de pesos (400 · 500 · 600 · 700).

### Restantes dimensões

- **Espaçamento**: múltiplos de 4 px (escala Tailwind: `p-1` = 4 px …).
- **Raios**: `sm 8` · `md 10` (controlos) · `lg 12` (menus) · `xl 16` (cartões, modais).
- **Sombras**: `xs/sm` (cartões), `md/lg` (menus), `xl` (modais) — sempre suaves.
- **Alturas de controlo**: `--control-h-sm|md|lg` = 32 · 40 · 48 px.
- **Larguras**: `--container-content` 1280 px · `--container-prose` 672 px · `--container-form` 448 px.
- **Transições**: `--duration-fast|normal|slow` = 120 · 180 · 220 ms · `--ease-out`.
- **Camadas**: `--z-sticky|header|sidebar|overlay|dialog|toast|tooltip` (20…80) — usadas como valores numéricos nos componentes (`z-30`…`z-80`), pois o Tailwind v4 não gera utilitários a partir do namespace `--z-*`.

## 3. Biblioteca de componentes (`apps/web/components/ui`)

### Estrutura

Button · IconButton · Input · Textarea · Select (Radix) · Checkbox (Radix) · Switch (Radix) · Label (Radix) · Card · Badge · Tooltip (Radix) · DropdownMenu (Radix) · Dialog (Radix) · Tabs (Radix) · Separator (Radix) · Avatar (Radix) · Skeleton · EmptyState · ErrorState · LoadingState · Toast (Radix)

### Dados

DataTable (genérico tipado) · SearchInput · FilterBar (+ FilterSelect) · Pagination · StatCard · StatusBadge · PageHeader · SectionHeader

### Formulários

`FormField` implementa o sistema de campos: label visível, hint, erro, obrigatóriedade e associação acessível automática (render-prop devolve `{ id, describedBy, invalid, required }`). Placeholders nunca substituem labels.

### Estados de interação

Todos os controlos suportam **hover · focus visível (anel `--color-focus`) · disabled · loading · erro** quando aplicável. Estados nunca comunicados só por cor (ícone + texto + `aria-invalid`).

## 4. Layout (`apps/web/components/layout`)

- `nav-config.ts` — navegação tipada: Overview · Agents · Calls · Contacts · **Automations (upcoming)** · **Analytics (upcoming)** · Integrations · **Billing (upcoming)** · Settings. Itens `upcoming` aparecem como "Em breve" (tooltip), sem simular funcionalidade.
- `AppShell` — sidebar fixa (desktop) / drawer (mobile·tablet) + topbar + `Container`.
- `Topbar` — botão de menu, breadcrumbs (slot), pesquisa, seletor de organização, `NotificationIndicator`, `UserMenu`.
- `Breadcrumbs` — trilho acessível com `aria-current`.
- `Container` — larguras máximas consistentes.

## 5. Acessibilidade

- HTML semântico (`header`, `nav`, `main`, `table`, `th[scope]`).
- Navegação por teclado em todos os controlos; foco sempre visível (`:focus-visible` global + utilitários).
- Labels associadas (`htmlFor`/`id` via `FormField` e `Label`); icon buttons exigem `label` (aria-label).
- Contraste AA (foregrounds `-text` sobre `-soft`); estados comunicados com ícone e texto.
- ARIA minimal: apenas onde necessário (menus/modais/toasts do Radix já acessíveis).
- `prefers-reduced-motion`: animações e transições reduzidas globalmente.

## 6. Responsividade

Testados os cenários 375 · 430 · 768 · 1280 · 1440 px (verificação por classes responsivas + revisão; e2e visual não executado neste ambiente — browsers Playwright indisponíveis):

- Sem overflow horizontal: tabelas vivem em `overflow-x-auto` com largura mínima; conteúdo usa `Container`.
- Navegação: sidebar → drawer abaixo de `lg` (1024).
- Formulários: grelha 1 coluna → 2 colunas (`lg`); modais com `max-h-[calc(100dvh-2rem)]`.
- Áreas de interação: controlos ≥ 32 px (sm) e 40 px (md).

## 7. Convenções de código

- TypeScript estrito, props tipadas e explícitas; composição sobre configuração.
- `cn()` (`lib/utils.ts`) para classes condicionais.
- shadcn-style: componentes primitivos em `components/ui`, produto em `components/layout|dashboard|agents`, sem dependência do CLI shadcn (Radix por baixo).
- Nomes: variantes de Button `primary · secondary · outline · ghost · destructive · link`; tamanhos `sm · md · lg · icon`.

## 8. Página de demonstração

`app/design-system/` (+ `components/demo/*`) — paleta, tipografia, botões, formulários, badges, overlays (tooltip · dropdown · modal · tabs · toast), dados (StatCard · DataTable · filtros · paginação) e estados (loading · skeleton · erro · vazio). Dados fictícios sempre identificados como **Demo**. Rota não indexada (`robots: noindex`).
