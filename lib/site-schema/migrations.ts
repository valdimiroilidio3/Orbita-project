/**
 * ORBITA ENGINE — schema migrations.
 *
 * Schemas are versioned. When the component library evolves (v1.0 → v1.1 →
 * v2.0), previously generated projects must keep working: raw stored JSON is
 * run through the migration chain and then parsed against the current schema.
 * Never break existing projects when the component library evolves.
 */
import { SCHEMA_VERSION, SiteSchema, type SiteSchemaType } from "./index";

type Migration = {
  from: string;
  to: string;
  migrate: (raw: Record<string, unknown>) => Record<string, unknown>;
};

/**
 * Migration chain, applied in `from` order.
 * v1.0 is the first version — the chain is empty for now and documented here
 * so future migrations have a single, explicit place to live.
 */
const MIGRATIONS: Migration[] = [];

export type MigrateResult =
  | { ok: true; schema: SiteSchemaType; applied: string[] }
  | { ok: false; errors: string[]; applied: string[] };

export function migrateSiteSchema(raw: unknown): MigrateResult {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: ["schema root must be an object"], applied: [] };
  }
  let data = raw as Record<string, unknown>;
  let version = typeof data.schemaVersion === "string" ? data.schemaVersion : "1.0";
  const applied: string[] = [];

  for (let guard = 0; guard < 10; guard++) {
    const next = MIGRATIONS.find((m) => m.from === version);
    if (!next) break;
    data = next.migrate(data);
    applied.push(`${next.from} → ${next.to}`);
    version = next.to;
  }

  const parsed = SiteSchema.safeParse(data);
  if (!parsed.success) {
    const errors = parsed.error.issues.map(
      (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`,
    );
    return { ok: false, errors, applied };
  }
  return { ok: true, schema: parsed.data, applied };
}

export { SCHEMA_VERSION };
