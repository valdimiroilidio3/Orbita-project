/**
 * ORBITA ENGINE — schema mutations (editor + AI copilot operate here).
 *
 * Pure functions over the Site Schema: minimal-node changes only.
 * Never rewrites the whole website for a small request; never destroys
 * unrelated changes. Versioning snapshots the result.
 */
import type { SectionType, SiteSchemaType } from "@/lib/site-schema";

export type MutResult =
  | { ok: true; schema: SiteSchemaType; changed: boolean }
  | { ok: false; error: string };

function findPage(schema: SiteSchemaType, pageId: string) {
  return schema.pages.find((p) => p.id === pageId);
}

export function updateSectionProps(
  schema: SiteSchemaType,
  pageId: string,
  sectionId: string,
  props: Record<string, unknown>,
): MutResult {
  const next = structuredClone(schema);
  const page = findPage(next, pageId);
  const section = page?.sections.find((s) => s.id === sectionId);
  if (!section) return { ok: false, error: `secção "${sectionId}" não encontrada` };
  section.props = { ...section.props, ...props };
  return { ok: true, schema: next, changed: true };
}

export function moveSection(schema: SiteSchemaType, pageId: string, sectionId: string, to: "up" | "down"): MutResult {
  const next = structuredClone(schema);
  const page = findPage(next, pageId);
  if (!page) return { ok: false, error: "página não encontrada" };
  const index = page.sections.findIndex((s) => s.id === sectionId);
  const target = to === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= page.sections.length) {
    return { ok: true, schema: next, changed: false };
  }
  const [section] = page.sections.splice(index, 1);
  page.sections.splice(target, 0, section);
  return { ok: true, schema: next, changed: true };
}

export function reorderSections(schema: SiteSchemaType, pageId: string, orderedIds: string[]): MutResult {
  const next = structuredClone(schema);
  const page = findPage(next, pageId);
  if (!page) return { ok: false, error: "página não encontrada" };
  const current = page.sections.map((s) => s.id);
  if (current.length !== orderedIds.length || current.some((id) => !orderedIds.includes(id))) {
    return { ok: false, error: "reordenação inválida: ids não coincidem com as secções da página" };
  }
  const byId = new Map(page.sections.map((s) => [s.id, s]));
  page.sections = orderedIds.map((id) => byId.get(id)!);
  return { ok: true, schema: next, changed: true };
}

export function duplicateSection(schema: SiteSchemaType, pageId: string, sectionId: string): MutResult {
  const next = structuredClone(schema);
  const page = findPage(next, pageId);
  const index = page?.sections.findIndex((s) => s.id === sectionId) ?? -1;
  if (!page || index < 0) return { ok: false, error: `secção "${sectionId}" não encontrada` };
  const source = page.sections[index];
  let n = 2;
  let newId = `${sectionId}-copy`;
  const ids = new Set(page.sections.map((s) => s.id));
  while (ids.has(newId)) newId = `${sectionId}-copy-${n++}`;
  const copy: (typeof page.sections)[number] = structuredClone(source);
  copy.id = newId;
  page.sections.splice(index + 1, 0, copy);
  return { ok: true, schema: next, changed: true };
}

export function insertSection(
  schema: SiteSchemaType,
  pageId: string,
  index: number,
  section: SectionType,
): MutResult {
  const next = structuredClone(schema);
  const page = findPage(next, pageId);
  if (!page) return { ok: false, error: "página não encontrada" };
  const existing = new Set(next.pages.flatMap((p) => p.sections.map((s) => s.id)));
  if (existing.has(section.id)) {
    return { ok: false, error: `id de secção "${section.id}" já existe no site` };
  }
  const at = Math.max(0, Math.min(index, page.sections.length));
  page.sections.splice(at, 0, structuredClone(section));
  return { ok: true, schema: next, changed: true };
}

export function deleteSection(schema: SiteSchemaType, pageId: string, sectionId: string): MutResult {
  const next = structuredClone(schema);
  const page = findPage(next, pageId);
  if (!page) return { ok: false, error: "página não encontrada" };
  const before = page.sections.length;
  page.sections = page.sections.filter((s) => s.id !== sectionId);
  if (page.sections.length === before) return { ok: false, error: `secção "${sectionId}" não encontrada` };
  return { ok: true, schema: next, changed: true };
}

export function setSectionHidden(
  schema: SiteSchemaType,
  pageId: string,
  sectionId: string,
  breakpoint: "mobile" | "tablet" | "desktop",
  hidden: boolean,
): MutResult {
  const next = structuredClone(schema);
  const page = findPage(next, pageId);
  const section = page?.sections.find((s) => s.id === sectionId);
  if (!section) return { ok: false, error: `secção "${sectionId}" não encontrada` };
  section.responsive = {
    ...section.responsive,
    [breakpoint]: { ...section.responsive?.[breakpoint], hidden },
  };
  return { ok: true, schema: next, changed: true };
}

// ---------------------------------------------------------------------------
// Diff (versions UI)
// ---------------------------------------------------------------------------

export type SchemaDiff = {
  sectionsAdded: string[];
  sectionsRemoved: string[];
  sectionsChanged: string[];
  themeChanged: boolean;
  navigationChanged: boolean;
  pagesChanged: number;
};

export function diffSchemas(a: SiteSchemaType, b: SiteSchemaType): SchemaDiff {
  const stable = (v: unknown) => JSON.stringify(v);
  const sectionsOf = (s: SiteSchemaType) => {
    const map = new Map<string, { key: string; page: string }>();
    for (const page of s.pages) {
      for (const section of page.sections) {
        map.set(`${page.id}:${section.id}`, {
          page: page.id,
          key: stable({ type: section.type, variant: section.variant, props: section.props, responsive: section.responsive, animation: section.animation }),
        });
      }
    }
    return map;
  };
  const A = sectionsOf(a);
  const B = sectionsOf(b);

  const label = (page: string, sectionId: string) => (page === "home" ? sectionId : `${page}/${sectionId}`);
  const sectionsAdded: string[] = [];
  const sectionsRemoved: string[] = [];
  const sectionsChanged: string[] = [];
  for (const [id, entry] of B) {
    const sectionId = id.slice(id.indexOf(":") + 1);
    if (!A.has(id)) sectionsAdded.push(label(entry.page, sectionId));
    else if (A.get(id)!.key !== entry.key) sectionsChanged.push(label(entry.page, sectionId));
  }
  for (const [id, entry] of A) {
    if (!B.has(id)) {
      const sectionId = id.slice(id.indexOf(":") + 1);
      sectionsRemoved.push(label(entry.page, sectionId));
    }
  }

  return {
    sectionsAdded,
    sectionsRemoved,
    sectionsChanged,
    themeChanged: stable(a.theme) !== stable(b.theme),
    navigationChanged: stable(a.navigation) !== stable(b.navigation),
    pagesChanged: a.pages.length - b.pages.length,
  };
}
