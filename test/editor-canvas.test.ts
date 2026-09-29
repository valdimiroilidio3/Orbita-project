import { describe, expect, it } from "vitest";
import { generateWebsite } from "@/lib/engine/generator";
import type { Brief } from "@/lib/engine/brief";
import { resolveSite } from "@/lib/engine/page-engine";
import { sectionLayoutCss } from "@/lib/engine/renderer";
import { placeholderProps } from "@/lib/editor/placeholders";
import { registry } from "@/lib/registry";
import { scopeThemeCss, themeToCss } from "@/lib/theme/tokens";

const brief: Brief = {
  name: "Atelier Ferro",
  industry: "architecture",
  goal: "portfolio",
  language: "pt-PT",
  description: "Estúdio de arquitetura e design de interiores em Lisboa.",
  location: "Lisboa",
  assets: {},
  services: [
    { name: "Projetos de arquitetura", description: "Do conceito à obra." },
    { name: "Design de interiores", description: "Espaços habitáveis." },
  ],
  contact: { email: "ola@atelierferro.pt", phone: "+351 210 000 000" },
};

describe("scopeThemeCss (editor canvas)", () => {
  it("scopes :root, rewrites viewport media queries to container queries, rewrites vw", async () => {
    const { schema } = await generateWebsite(brief, { assetIds: [] });
    const css = scopeThemeCss(themeToCss(schema.theme));

    expect(css).not.toContain(":root");
    expect(css).toContain(".oe-scope{");
    expect(css).toContain("@container oe (min-width:768px){");
    expect(css).toContain("@container oe (min-width:1024px){");
    expect(css).toContain("@container oe (max-width:767px){");
    // no viewport width queries survive the transform
    expect(css).not.toMatch(/@media \(min-width/);
    expect(css).not.toMatch(/@media \(max-width/);
    expect(css).not.toMatch(/(?<![\d.])\dvw/);
    // user preference queries stay viewport-based
    expect(css).toContain("@media (prefers-reduced-motion:reduce)");
  });

  it("scoped per-section layout CSS keeps valid selectors and media blocks", async () => {
    const { schema } = await generateWebsite(brief, { assetIds: [] });
    const resolved = resolveSite(schema);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;

    const layout = sectionLayoutCss(resolved.site.pages);
    const scoped = scopeThemeCss(sectionLayoutCss(resolved.site.pages, ".oe-scope"));

    // unscoped (deploy) selectors are bare #id
    expect(layout).toMatch(/^#[a-z0-9-]+\{/m);
    // scoped selectors are .oe-scope #id
    expect(scoped).toContain(".oe-scope #");

    // per-breakpoint overrides (incl. the combined tablet form) round-trip
    const synthetic: Parameters<typeof sectionLayoutCss>[0] = [
      {
        page: {
          id: "home",
          path: "/",
          title: "Início",
          sections: [
            {
              id: "hero-home",
              type: "hero",
              variant: "split",
              props: {},
              responsive: { mobile: { hidden: true }, tablet: { sectionY: 6 }, desktop: { columns: 2 } },
              animation: { enabled: true, effect: "fade-up", delayMs: 0 },
              hidden: { mobile: true, tablet: false, desktop: false },
            },
          ],
        } as never,
        sections: [
          {
            id: "hero-home",
            type: "hero",
            variant: "split",
            index: 0,
            props: {},
            responsive: { mobile: { hidden: true }, tablet: { sectionY: 6 }, desktop: { columns: 2 } },
            animation: { enabled: true, effect: "fade-up", delayMs: 0 },
            hidden: { mobile: true, tablet: false, desktop: false },
          },
        ],
      },
    ];
    const synth = scopeThemeCss(sectionLayoutCss(synthetic, ".oe-scope"));
    expect(synth).toContain(
      "@container oe (max-width:767px){.oe-scope #hero-home{display:none!important}}",
    );
    expect(synth).not.toMatch(/@media \((min|max)-width/);
    expect(synth).toContain(
      "@container oe (min-width:768px) and (max-width:1023px){.oe-scope #hero-home{padding-block:6rem}}",
    );
    expect(synth).toContain("@container oe (min-width:1024px){.oe-scope #hero-home{--columns:2}}");
    // balanced braces
    expect(synth.split("{").length).toBe(synth.split("}").length);
  });

  it("is deterministic", async () => {
    const { schema } = await generateWebsite(brief, { assetIds: [] });
    const a = scopeThemeCss(themeToCss(schema.theme));
    const b = scopeThemeCss(themeToCss(schema.theme));
    expect(a).toBe(b);
  });
});

describe("placeholderProps (new sections)", () => {
  it("always produces valid props for every registry variant", () => {
    let checked = 0;
    for (const def of registry.values()) {
      for (const [key, vdef] of Object.entries(def.variants)) {
        const props = placeholderProps(vdef);
        expect(vdef.schema.safeParse(props).success, `${def.id}/${key}`).toBe(true);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThanOrEqual(10);
  });

  it("never invents asset references", () => {
    for (const def of registry.values()) {
      for (const vdef of Object.values(def.variants)) {
        expect(JSON.stringify(placeholderProps(vdef))).not.toContain("asset:");
      }
    }
  });

  it("keeps explicit defaults from the variant when provided", () => {
    const hero = registry.get("hero")!;
    const vdef = hero.variants[Object.keys(hero.variants)[0]];
    const props = placeholderProps(vdef);
    expect(vdef.schema.safeParse(props).success).toBe(true);
    for (const [k, v] of Object.entries(vdef.defaultProps ?? {})) {
      expect((props as Record<string, unknown>)[k]).toBe(v);
    }
  });
});
