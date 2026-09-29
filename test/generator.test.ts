import { describe, expect, it } from "vitest";
import { generateWebsite } from "@/lib/engine/generator";
import type { Brief } from "@/lib/engine/brief";
import type { SiteSchemaType } from "@/lib/site-schema";

const baseBrief: Brief = {
  name: "ACME Construções",
  industry: "construction",
  goal: "lead_generation",
  language: "pt-PT",
  description: "Construção e reabilitação em Portugal.",
  location: "Porto",
  assets: {},
  services: [
    { name: "Reabilitação", description: "Reabilitação integral." },
    { name: "Construção de raiz", description: "Novas construções." },
  ],
  contact: { email: "ola@acme.pt", phone: "+351 210 000 000" },
};

const allTypes = (s: SiteSchemaType) => s.pages.flatMap((p) => p.sections.map((sec) => sec.type));

describe("generator determinism", () => {
  it("same brief → byte-identical schema", async () => {
    const a = await generateWebsite(baseBrief, { assetIds: [] });
    const b = await generateWebsite(baseBrief, { assetIds: [] });
    expect(JSON.stringify(a.schema)).toBe(JSON.stringify(b.schema));
  });

  it("same brief with different assetIds (valid refs) → same schema", async () => {
    const brief: Brief = {
      ...baseBrief,
      assets: { hero: "asset:a_hero1", about: "asset:a_about1" },
    };
    const a = await generateWebsite(brief, { assetIds: ["a_hero1", "a_about1"] });
    const b = await generateWebsite(brief, { assetIds: ["a_hero1", "a_about1", "a_extra"] });
    expect(JSON.stringify(a.schema)).toBe(JSON.stringify(b.schema));
  });
});

describe("data-driven sections (no fabrication)", () => {
  it("stats/testimonials/pricing sections only exist when the brief provides the data", async () => {
    const result = await generateWebsite(baseBrief, { assetIds: [] });
    const types = allTypes(result.schema);
    expect(types).not.toContain("stats");
    expect(types).not.toContain("testimonials");
    expect(types).not.toContain("pricing");

    const rich: Brief = {
      ...baseBrief,
      stats: [{ value: "120+", label: "Obras" }],
      testimonials: [{ quote: "Ótimo trabalho.", name: "A. Silva" }],
    };
    const richResult = await generateWebsite(rich, { assetIds: [] });
    const richTypes = allTypes(richResult.schema);
    expect(richTypes).toContain("stats");
    expect(richTypes).toContain("testimonials");
  });

  it("records missing inputs in metadata instead of inventing them", async () => {
    const sparse: Brief = {
      name: "Minimal Site",
      industry: "other",
      goal: "informational",
      language: "en",
      services: [],
      assets: {},
    };
    const result = await generateWebsite(sparse, { assetIds: [] });
    expect(result.schema.metadata.missingInputs).toContain("description");
    expect(result.schema.metadata.missingInputs).toContain("services");
    // no sections that require the missing data
    const types = allTypes(result.schema);
    expect(types).not.toContain("stats");
  });

  it("never emits placeholder markers", async () => {
    const result = await generateWebsite(baseBrief, { assetIds: [] });
    const json = JSON.stringify(result.schema);
    expect(json).not.toContain("{{");
    expect(json).not.toContain("Lorem ipsum");
    expect(json).not.toContain("[placeholder]");
  });
});

describe("asset integrity", () => {
  it("drops hero image when the asset id is not in the project (and notes it)", async () => {
    const brief: Brief = { ...baseBrief, assets: { hero: "asset:does_not_exist" } };
    const result = await generateWebsite(brief, { assetIds: ["other"] });
    const hero = result.schema.pages[0].sections.find((s) => s.type === "hero");
    expect(hero).toBeDefined();
    expect((hero!.props as { image?: string }).image).toBeUndefined();
    expect(result.schema.metadata.missingInputs).toContain("hero_image");
  });

  it("keeps plain path refs and asset: refs that exist", async () => {
    const brief: Brief = {
      ...baseBrief,
      assets: { hero: "asset:ok1", about: "/sample/about.jpg" },
    };
    const result = await generateWebsite(brief, { assetIds: ["ok1"] });
    const hero = result.schema.pages[0].sections.find((s) => s.type === "hero");
    expect((hero!.props as { image?: string }).image).toBe("asset:ok1");
    const about = result.schema.pages[0].sections.find((s) => s.type === "about");
    expect((about!.props as { image?: string }).image).toBe("/sample/about.jpg");
  });
});

describe("page structure", () => {
  it("creates the contact page only when contact data exists (pt → /contacto, en → /contact)", async () => {
    const withContact = await generateWebsite(baseBrief, { assetIds: [] });
    expect(withContact.schema.pages.some((p) => p.path === "/contacto")).toBe(true);

    const noContact: Brief = { ...baseBrief, contact: undefined };
    const without = await generateWebsite(noContact, { assetIds: [] });
    expect(without.schema.pages.some((p) => p.path === "/contacto")).toBe(false);
    expect(without.schema.pages.some((p) => p.path === "/contact")).toBe(false);

    const en: Brief = { ...baseBrief, language: "en" };
    const enResult = await generateWebsite(en, { assetIds: [] });
    expect(enResult.schema.pages.some((p) => p.path === "/contact")).toBe(true);
  });

  it("every page has a footer and a unique path", async () => {
    const result = await generateWebsite(baseBrief, { assetIds: [] });
    const paths = result.schema.pages.map((p) => p.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const page of result.schema.pages) {
      expect(page.sections.some((s) => s.type === "footer")).toBe(true);
    }
  });
});

describe("input validation", () => {
  it("rejects invalid briefs (no pipeline runs)", async () => {
    await expect(generateWebsite({ name: "X" }, { assetIds: [] })).rejects.toThrow();
    await expect(generateWebsite({ ...baseBrief, industry: "warp-drive" }, { assetIds: [] })).rejects.toThrow();
  });

  it("rejects briefs whose generated content would violate a variant schema", async () => {
    // 13 services exceeds the .max(12) brief rule
    const tooMany: Brief = {
      ...baseBrief,
      services: Array.from({ length: 13 }, (_, i) => ({ name: `S${i}` })),
    };
    await expect(generateWebsite(tooMany, { assetIds: [] })).rejects.toThrow();
  });
});

describe("brand direction", () => {
  it("applies user-provided primaryColor and keeps contrast-safe foreground", async () => {
    const brief: Brief = { ...baseBrief, brand: { primaryColor: "#B9FF00" } };
    const result = await generateWebsite(brief, { assetIds: [] });
    expect(result.schema.theme.colors.primary).toBe("#B9FF00");
    // foreground must remain readable (different from background)
    expect(result.schema.theme.colors.foreground).not.toBe(result.schema.theme.colors.background);
  });

  it("theme is a pure function of (brief, industry)", async () => {
    const a = await generateWebsite(baseBrief, { assetIds: [] });
    const b = await generateWebsite(baseBrief, { assetIds: [] });
    expect(JSON.stringify(a.schema.theme)).toBe(JSON.stringify(b.schema.theme));
  });
});
