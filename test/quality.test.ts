import { describe, expect, it } from "vitest";
import { generateWebsite } from "@/lib/engine/generator";
import type { Brief } from "@/lib/engine/brief";
import { runQualityChecks } from "@/lib/quality/report";

const brief: Brief = {
  name: "ACME Construções",
  industry: "construction",
  goal: "lead_generation",
  language: "pt-PT",
  description:
    "Construção civil e reabilitação de imóveis no norte de Portugal, com equipa própria e garantia.",
  services: [{ name: "Reabilitação", description: "Casas." }],
  assets: {},
  contact: { email: "ola@acme.pt" },
};

describe("quality engine (real computations, no fabricated scores)", () => {
  it("runs the full check suite on a generated site", async () => {
    const { schema } = await generateWebsite(brief, { assetIds: [] });
    const report = runQualityChecks(schema, new Set());
    expect(report.checks.length).toBeGreaterThan(10);
    // the generator is designed to pass the structural checks
    expect(report.counts.critical).toBe(0);
  });

  it("detects a contrast failure by actual WCAG math", async () => {
    const { schema } = await generateWebsite(brief, { assetIds: [] });
    // make foreground identical to background → contrast ratio 1:1
    schema.theme.colors.foreground = schema.theme.colors.background;
    const report = runQualityChecks(schema, new Set());
    expect(report.counts.critical + report.counts.warning).toBeGreaterThan(0);
    expect(report.issues.some((i) => i.code === "contrast")).toBe(true);
    const failedContrast = report.checks.filter(
      (c) => c.id.startsWith("contrast-") && !c.passed,
    );
    expect(failedContrast.length).toBeGreaterThan(0);
  });

  it("flags broken asset refs as critical", async () => {
    const briefWithHero: Brief = { ...brief, assets: { hero: "asset:missing-id" } };
    const { schema } = await generateWebsite(briefWithHero, { assetIds: [] });
    // manually re-inject a broken ref to simulate drift
    const hero = schema.pages[0].sections.find((s) => s.type === "hero")!;
    (hero.props as Record<string, unknown>).image = "asset:missing-id";
    const report = runQualityChecks(schema, new Set());
    expect(report.issues.some((i) => i.code === "broken-asset" && i.severity === "critical")).toBe(
      true,
    );
  });

  it("checks are labeled and deterministic", async () => {
    const { schema } = await generateWebsite(brief, { assetIds: [] });
    const a = runQualityChecks(schema, new Set());
    const b = runQualityChecks(schema, new Set());
    expect(JSON.stringify(a.checks)).toBe(JSON.stringify(b.checks));
    expect(JSON.stringify(a.issues)).toBe(JSON.stringify(b.issues));
  });
});
