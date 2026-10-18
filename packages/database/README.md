# @orbita/database

Tipos TypeScript derivados do schema PostgreSQL/Supabase.

## Onde vive o schema

As migrações SQL canónicas estão em [`supabase/migrations/`](../../supabase/migrations):

| Ficheiro                  | Conteúdo                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------ |
| `0001_initial_schema.sql` | Schema inicial: `organizations`, `memberships`, `agents`, `calls`, enums, índices, RLS (leitura) |

## Uso

```ts
import type { AgentRow, CallRow } from '@orbita/database';
```

## Regenerar tipos

Quando existir um projeto Supabase ligado:

```bash
npx supabase gen types typescript --project-id <id> > packages/database/src/database.types.ts
```

Até lá, os tipos em `src/database.types.ts` são mantidos manualmente e devem ser atualizados em conjunto com as migrações.
