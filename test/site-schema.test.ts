import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION, SiteSchema } from "@/lib/site-schema";
import { generateWebsite } from "@/lib/engine/generator";
import type { Brief } from "@/lib/engine/brief";

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

describe("Site Schema (the single source of truth)", () => {
  it("accepts a generated schema as-is", async () => {
    const { schema } = await generateWebsite(brief, { assetIds: [] });
    const parsed = SiteSchema.safeParse(schema);
    expect(parsed.success).toBe(true);
    expect((parsed.data as { schemaVersion: string }).schemaVersion).toBe(SCHEMA_VERSION);
  });

  it("rejects an unknown component type", async () => {
    const { schema } = await generateWebsite(brief, { assetIds: [] });
    const broken = structuredClone(schema) as {
      pages: { sections: { type: string }[] }[];
    };
    broken.pages[0].sections[0].type = "hologram";
    expect(SiteSchema.safeParse(broken).success).toBe(false);
  });

  it("rejects unknown variant for a known component", async () => {
    const { schema } = await generateWebsite(brief, { assetIds: [] });
    const broken = structuredClone(schema) as {
      pages: { sections: { variant: string }[] }[];
    };
    broken.pages[0].sections[0].variant = "does-not-exist";
    expect(SiteSchema.safeParse(broken).success).toBe(false);
  });

  it("rejects malformed theme tokens (no hardcoded values sneak in)", async () => {
    const { schema } = await generateWebsite(brief, { assetIds: [] });
    const broken = structuredClone(schema) as {
      theme: { colors: { primary: string } };
    };
    broken.theme.colors.primary = "tomato";
    expect(SiteSchema.safeParse(broken).success).toBe(false);
  });

  it("rejects duplicate section ids within a page", async () => {
    const { schema } = await generateWebsite(brief, { assetIds: [] });
    const broken = structuredClone(schema) as {
      pages: { sections: { id: string }[] }[];
    };
    broken.pages[0].sections[1].id = broken.pages[0].sections[0].id;
    expect(SiteSchema.safeParse(broken).success).toBe(false);
  });

  it("is stable across stringify/parse (safe to persist as JSON)", async () => {
    const { schema } = await generateWebsite(brief, { assetIds: [] });
    const roundTrip = SiteSchema.parse(JSON.parse(JSON.stringify(schema)));
    expect(roundTrip).toEqual(schema);
  });
});
