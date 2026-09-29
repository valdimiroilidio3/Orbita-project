/**
 * ORBITA ENGINE — site renderer.
 * Renders a ResolvedSite deterministically: the Site Schema is the only
 * input. No AI code, no arbitrary components.
 */
import { registry } from "@/lib/registry";
import type { SectionRenderContext } from "@/lib/registry/types";
import type { ResolvedPage, ResolvedSite } from "./page-engine";

export type SiteRenderContext = Omit<
  SectionRenderContext,
  "site" | "theme" | "page" | "sectionId" | "variant"
> & {
  pagePath: string;
};

export function SiteDocument({ site, ctx }: { site: ResolvedSite; ctx: SiteRenderContext }) {
  const theme = site.schema.theme;
  const pageEntry = site.pages.find((p) => p.page.path === ctx.pagePath) ?? site.pages[0];

  const base: SectionRenderContext = {
    schema: site.schema,
    site: site.schema.site,
    theme,
    page: pageEntry.page,
    sectionId: "",
    variant: "",
    linkFor: ctx.linkFor,
    assetUrl: ctx.assetUrl,
    assetIds: ctx.assetIds,
    contactPayload: ctx.contactPayload,
    contactSubmitted: ctx.contactSubmitted,
    contactError: ctx.contactError,
    editMode: ctx.editMode,
    selectedId: ctx.selectedId,
    editLabels: ctx.editLabels,
  };

  const navDef = registry.get("navigation");
  const navVariant =
    theme.details.navBackground === "transparent" ? "minimal" : theme.details.navBackground;

  return (
    <div className={ctx.editMode ? "orbita-site oe-editing" : "orbita-site"}>
      {navDef && navVariant in navDef.variants
        ? navDef.render({}, { ...base, sectionId: "navigation", variant: navVariant })
        : null}
      <main>
        {pageEntry.sections.map((s) => {
          const def = registry.get(s.type);
          if (!def) return null;
          const a = s.animation;
          const animClass =
            a.enabled && a.effect !== "none"
              ? `orbita-anim ${a.effect === "fade-up" ? "orbita-fade-up" : ""}`
              : undefined;
          const classNames = [animClass, ctx.editMode && "oe-sec", ctx.editMode && ctx.selectedId === s.id && "oe-sec-selected"]
            .filter(Boolean)
            .join(" ");
          return (
            <section
              key={s.id}
              id={s.id}
              data-section={s.id}
              data-type={s.type}
              data-oe-label={ctx.editMode ? (ctx.editLabels?.[s.id] ?? s.type) : undefined}
              className={classNames || undefined}
              style={a.delayMs && !ctx.editMode ? { animationDelay: `${a.delayMs}ms` } : undefined}
            >
              {ctx.editMode && (
                <button
                  type="button"
                  className="oe-drag-handle"
                  data-oe-drag={s.id}
                  aria-label={`Reordenar secção ${ctx.editLabels?.[s.id] ?? s.type}`}
                  tabIndex={-1}
                >
                  ⠿
                </button>
              )}
              {def.render(s.props, { ...base, sectionId: s.id, variant: s.variant })}
            </section>
          );
        })}
      </main>
    </div>
  );
}

/**
 * Per-section layout CSS: vertical rhythm + per-breakpoint overrides
 * (padding, grid columns, visibility). Deterministic function of the schema.
 */
export function sectionLayoutCss(pages: ResolvedPage[], scope?: string): string {
  const sel = (id: string) => (scope ? `${scope} #${id}` : `#${id}`);
  const rules: string[] = [];
  for (const { sections } of pages) {
    for (const s of sections) {
      const id = s.id;
      rules.push(`${sel(id)}{padding-block:var(--section-y)}`);
      const r = s.responsive;
      if (r?.mobile?.sectionY) {
        rules.push(`@media (max-width:767px){${sel(id)}{padding-block:${r.mobile.sectionY}rem}}`);
      }
      if (r?.tablet?.sectionY) {
        rules.push(`@media (min-width:768px) and (max-width:1023px){${sel(id)}{padding-block:${r.tablet.sectionY}rem}}`);
      }
      if (r?.desktop?.sectionY) {
        rules.push(`@media (min-width:1024px){${sel(id)}{padding-block:${r.desktop.sectionY}rem}}`);
      }
      if (r?.mobile?.columns)
        rules.push(`@media (max-width:767px){${sel(id)}{--columns:${r.mobile.columns}}}`);
      if (r?.tablet?.columns)
        rules.push(`@media (min-width:768px) and (max-width:1023px){${sel(id)}{--columns:${r.tablet.columns}}}`);
      if (r?.desktop?.columns)
        rules.push(`@media (min-width:1024px){${sel(id)}{--columns:${r.desktop.columns}}}`);
      if (s.hidden.mobile) rules.push(`@media (max-width:767px){${sel(id)}{display:none!important}}`);
      if (s.hidden.tablet)
        rules.push(`@media (min-width:768px) and (max-width:1023px){${sel(id)}{display:none!important}}`);
      if (s.hidden.desktop) rules.push(`@media (min-width:1024px){${sel(id)}{display:none!important}}`);
    }
  }
  return rules.join("\n");
}
