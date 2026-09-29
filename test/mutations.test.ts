import { describe, expect, it } from "vitest";
import { generateWebsite } from "@/lib/engine/generator";
import type { Brief } from "@/lib/engine/brief";
import {
  deleteSection,
  diffSchemas,
  duplicateSection,
  insertSection,
  moveSection,
  reorderSections,
  setSectionHidden,
  updateSectionProps,
} from "@/lib/engine/mutations";
import { migrateSiteSchema } from "@/lib/site-schema/migrations";
import { SiteSchema } from "@/lib/site-schema";
import { getComponent } from "@/lib/registry";
import type { SiteSchemaType } from "@/lib/site-schema";

const brief: Brief = {
  name: "ACME Construções",
  industry: "construction",
  goal: "lead_generation",
  language: "pt-PT",
  description: "Construção civil e reabilitação no norte de Portugal.",
  services: [{ name: "Reabilitação", description: "Casas." }],
  assets: {},
  contact: { email: "ola@acme.pt" },
};

async function makeSchema(): Promise<SiteSchemaType> {
  const { schema } = await generateWebsite(brief, { assetIds: [] });
  return schema;
}

describe("minimal-node mutations (never rewrite the whole site)", () => {
  it("changing one section's props only changes that section in the diff", async () => {
    const schema = await makeSchema();
    const page = schema.pages[0];
    const target = page.sections.find((s) => s.type === "hero")!;

    const def = getComponent(target.type)!;
    const vdef = def.variants[target.variant]!;
    const newProps = { ...(target.props as Record<string, unknown>), eyebrow: "NOVO EYEBROW" };
    const parsed = vdef.schema.safeParse(newProps);
    expect(parsed.success).toBe(true);

    const result = updateSectionProps(schema, page.id, target.id, parsed.data as Record<string, unknown>);
    expect(result.ok).toBe(true);

    const diff = diffSchemas(schema, (result as { ok: true; schema: SiteSchemaType }).schema);
    expect(diff.sectionsChanged).toEqual([target.id]);
    expect(diff.sectionsAdded).toHaveLength(0);
    expect(diff.sectionsRemoved).toHaveLength(0);
    // untouched sections are byte-identical
    const before = JSON.stringify(page.sections.find((s) => s.type === "services")?.props);
    const after = JSON.stringify(
      (result as { ok: true; schema: SiteSchemaType }).schema.pages[0].sections.find(
        (s) => s.type === "services",
      )?.props,
    );
    expect(before).toBe(after);
  });

  it("move up/down swaps exactly two positions", async () => {
    const schema = await makeSchema();
    const page = schema.pages[0];
    expect(page.sections.length).toBeGreaterThan(2);
    const [a, b] = page.sections.slice(0, 2);

    const result = moveSection(schema, page.id, b.id, "up");
    expect(result.ok).toBe(true);
    const next = (result as { ok: true; schema: SiteSchemaType }).schema.pages[0].sections;
    expect(next[0].id).toBe(b.id);
    expect(next[1].id).toBe(a.id);
    // the rest keeps the same order
    expect(next.slice(2).map((s) => s.id)).toEqual(page.sections.slice(2).map((s) => s.id));
  });

  it("reorder validates the id set (no duplicates, no missing)", async () => {
    const schema = await makeSchema();
    const page = schema.pages[0];
    const ids = page.sections.map((s) => s.id);

    expect(reorderSections(schema, page.id, ids.slice(0, -1)).ok).toBe(false); // missing one
    expect(reorderSections(schema, page.id, [...ids, ids[0]]).ok).toBe(false); // duplicate
    const ok = reorderSections(schema, page.id, [...ids.slice(1), ids[0]]);
    expect(ok.ok).toBe(true);
  });

  it("duplicate creates a new stable id without touching the original", async () => {
    const schema = await makeSchema();
    const page = schema.pages[0];
    const target = page.sections[0];
    const result = duplicateSection(schema, page.id, target.id);
    expect(result.ok).toBe(true);
    const next = (result as { ok: true; schema: SiteSchemaType }).schema.pages[0].sections;
    const originals = next.filter((s) => s.id === target.id);
    expect(originals).toHaveLength(1);
    expect(next.length).toBe(page.sections.length + 1);
    const newSection = next.find((s) => s.id !== target.id && s.type === target.type && !page.sections.some((p) => p.id === s.id));
    expect(newSection).toBeDefined();
  });

  it("delete removes exactly one section", async () => {
    const schema = await makeSchema();
    const page = schema.pages[0];
    const target = page.sections[0];
    const result = deleteSection(schema, page.id, target.id);
    expect(result.ok).toBe(true);
    const next = (result as { ok: true; schema: SiteSchemaType }).schema.pages[0].sections;
    expect(next.length).toBe(page.sections.length - 1);
    expect(next.some((s) => s.id === target.id)).toBe(false);
  });

  it("responsive hiding is per-breakpoint and does not alter content", async () => {
    const schema = await makeSchema();
    const page = schema.pages[0];
    const target = page.sections[1];
    const result = setSectionHidden(schema, page.id, target.id, "mobile", true);
    expect(result.ok).toBe(true);
    const next = (result as { ok: true; schema: SiteSchemaType }).schema.pages[0].sections;
    const updated = next.find((s) => s.id === target.id)!;
    expect(updated.responsive?.mobile?.hidden).toBe(true);
    expect(updated.responsive?.tablet?.hidden).toBe(false);
    expect(updated.responsive?.desktop?.hidden).toBe(false);
    const diff = diffSchemas(schema, (result as { ok: true; schema: SiteSchemaType }).schema);
    expect(diff.sectionsChanged).toEqual([target.id]);
  });
});

describe("versioning & migrations", () => {
  it("a stored schema round-trips through migrateSiteSchema", async () => {
    const schema = await makeSchema();
    const stored = JSON.stringify(schema); // what the DB persists
    const result = migrateSiteSchema(JSON.parse(stored));
    expect(result.ok).toBe(true);
    expect(JSON.stringify(result.ok ? result.schema : null)).toBe(stored);
  });

  it("invalid stored JSON never yields a schema", () => {
    expect(migrateSiteSchema({ nope: true }).ok).toBe(false);
    expect(migrateSiteSchema(null).ok).toBe(false);
    expect(migrateSiteSchema("string").ok).toBe(false);
  });
});

describe("insertSection", () => {
  function makeSection(id: string, type: "stats" | "faq" = "stats"): SiteSchemaType["pages"][number]["sections"][number] {
    return {
      id,
      type,
      variant: type === "stats" ? "band" : "accordion",
      props:
        type === "stats"
          ? { items: [{ value: "10", label: "anos" }] }
          : { items: [{ q: "Pergunta?", a: "Resposta." }] },
      responsive: { mobile: {}, tablet: {}, desktop: {} },
      animation: { enabled: true, effect: "fade-up", delayMs: 0 },
    };
  }

  it("inserts at the requested index and stays canonical", async () => {
    const schema = await makeSchema();
    const page = schema.pages[0];
    const result = insertSection(schema, page.id, 1, makeSection("stats-ab12"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.schema.pages[0].sections[1].id).toBe("stats-ab12");
    expect(result.schema.pages[0].sections.length).toBe(page.sections.length + 1);
    expect(SiteSchema.safeParse(result.schema).success).toBe(true);
    // source schema untouched (immutable)
    expect(schema.pages[0].sections.length).toBe(page.sections.length);
  });

  it("rejects ids already used anywhere in the site", async () => {
    const schema = await makeSchema();
    const page = schema.pages[0];
    const existingId = page.sections[0].id;
    const result = insertSection(schema, page.id, 0, makeSection(existingId));
    expect(result.ok).toBe(false);
  });

  it("clamps out-of-range indexes to the end of the page", async () => {
    const schema = await makeSchema();
    const page = schema.pages[0];
    const result = insertSection(schema, page.id, 999, makeSection("stats-zz99"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const sections = result.schema.pages[0].sections;
    expect(sections[sections.length - 1].id).toBe("stats-zz99");
  });

  it("rejects unknown pages", async () => {
    const schema = await makeSchema();
    const result = insertSection(schema, "nope", 0, makeSection("stats-ab12"));
    expect(result.ok).toBe(false);
  });
});
