/**
 * ORBITA ENGINE — page engine.
 *
 * Turns a raw stored Site Schema JSON into a fully resolved, validated
 * site that the renderer can draw. Structural problems are fatal; content
 * problems (e.g. a missing asset) are reported as warnings. Invalid schemas
 * never reach the rendering engine.
 */
import { migrateSiteSchema } from "@/lib/site-schema/migrations";
import type { PageType, SectionType, SiteSchemaType } from "@/lib/site-schema";
import { registry } from "@/lib/registry";

export type ValidationIssue = {
  severity: "critical" | "warning";
  message: string;
  pageId?: string;
  sectionId?: string;
};

export type ResolvedSection = {
  id: string;
  type: SectionType["type"];
  variant: string;
  index: number;
  props: Record<string, unknown>;
  responsive: SectionType["responsive"];
  animation: { enabled: boolean; effect: "none" | "fade" | "fade-up"; delayMs: number };
  hidden: { mobile: boolean; tablet: boolean; desktop: boolean };
};

export type ResolvedPage = { page: PageType; sections: ResolvedSection[] };

export type ResolvedSite = { schema: SiteSchemaType; pages: ResolvedPage[] };

export type ResolveResult =
  | { ok: true; site: ResolvedSite; warnings: ValidationIssue[] }
  | { ok: false; issues: ValidationIssue[] };

/** Walks any JSON value collecting asset-reference-like strings. */
export function collectAssetRefs(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    if (value.startsWith("asset:") || /^\/(api|sample|uploads)\//.test(value) || /^https?:\/\//.test(value)) {
      out.push(value);
    }
    return out;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectAssetRefs(v, out);
    return out;
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) collectAssetRefs(v, out);
    return out;
  }
  return out;
}

export function resolveSite(
  raw: unknown,
  opts?: { assetIds?: ReadonlySet<string> },
): ResolveResult {
  const migrated = migrateSiteSchema(raw);
  if (!migrated.ok) {
    return {
      ok: false,
      issues: migrated.errors.map((message) => ({ severity: "critical" as const, message })),
    };
  }
  const schema = migrated.schema;
  const critical: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const seenPaths = new Set<string>();
  for (const page of schema.pages) {
    if (seenPaths.has(page.path)) {
      critical.push({ severity: "critical", message: `duplicate page path "${page.path}"`, pageId: page.id });
    }
    seenPaths.add(page.path);
    if (page.sections.length === 0) {
      warnings.push({ severity: "warning", message: `page "${page.path}" has no sections`, pageId: page.id });
    }
  }
  if (!schema.pages.some((p) => p.path === "/")) {
    critical.push({ severity: "critical", message: "site must include a home page at /" });
  }

  const pages: ResolvedPage[] = schema.pages.map((page) => {
    const seenIds = new Set<string>();
    const sections: ResolvedSection[] = page.sections.map((s, index) => {
      const def = registry.get(s.type);
      if (!def) {
        critical.push({
          severity: "critical",
          message: `unknown component type "${s.type}"`,
          pageId: page.id,
          sectionId: s.id,
        });
      }
      const vdef = def?.variants[s.variant];
      if (def && !vdef) {
        critical.push({
          severity: "critical",
          message: `unknown variant "${s.variant}" for component "${s.type}"`,
          pageId: page.id,
          sectionId: s.id,
        });
      }

      let props: Record<string, unknown> = s.props;
      if (def && vdef) {
        const merged = { ...vdef.defaultProps, ...s.props };
        const parsed = vdef.schema.safeParse(merged);
        if (!parsed.success) {
          for (const issue of parsed.error.issues.slice(0, 5)) {
            critical.push({
              severity: "critical",
              message: `invalid props for ${s.type}/${s.variant} at ${issue.path.join(".") || "(root)"}: ${issue.message}`,
              pageId: page.id,
              sectionId: s.id,
            });
          }
        } else {
          props = parsed.data as Record<string, unknown>;
        }
      }

      if (seenIds.has(s.id)) {
        critical.push({ severity: "critical", message: `duplicate section id "${s.id}"`, pageId: page.id, sectionId: s.id });
      }
      seenIds.add(s.id);

      for (const ref of collectAssetRefs(s.props)) {
        if (ref.startsWith("asset:") && opts?.assetIds && !opts.assetIds.has(ref.slice(6))) {
          warnings.push({
            severity: "warning",
            message: `asset "${ref}" is not part of this project`,
            pageId: page.id,
            sectionId: s.id,
          });
        }
      }

      return {
        id: s.id,
        type: s.type,
        variant: s.variant,
        index,
        props,
        responsive: s.responsive ?? undefined,
        animation: (s.animation ?? { enabled: true, effect: "fade-up", delayMs: 0 }) as ResolvedSection["animation"],
        hidden: {
          mobile: Boolean(s.responsive?.mobile?.hidden),
          tablet: Boolean(s.responsive?.tablet?.hidden),
          desktop: Boolean(s.responsive?.desktop?.hidden),
        },
      };
    });
    return { page, sections };
  });

  if (critical.length > 0) {
    return { ok: false, issues: [...critical, ...warnings] };
  }
  return { ok: true, site: { schema, pages }, warnings };
}
