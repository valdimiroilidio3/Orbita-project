/**
 * ORBITA ENGINE — website generator (deterministic pipeline).
 *
 * The canonical generation flow:
 *   validate brief → analyze business → select components → build design
 *   system → generate content → build pages → validate schema.
 *
 * Every step is a real, measured operation (persisted to `generationLog`).
 * The pipeline is a pure function of (brief, assetIds): same input, same
 * output. In Phase 04 an LLM replaces the strategy/content/layout steps
 * behind this same contract — the Site Schema does not change.
 */
import { performance } from "node:perf_hooks";
import { SCHEMA_VERSION, SiteSchema, type SectionType, type SiteSchemaType, type ThemeType } from "@/lib/site-schema";
import type { ComponentType } from "@/lib/site-schema/catalog";
import { BriefSchema, type Brief } from "./brief";
import { PLAYBOOKS, effectiveVariant, type Playbook, type SectionPlan } from "./playbooks";
import { buildTheme } from "./build-theme";
import { buildContent, type GeneratedContent } from "./content";
import { resolveSite } from "./page-engine";

export type GenerationLogEntry = {
  step: string;
  status: "done" | "failed";
  durationMs: number;
  detail?: string;
};

export type GenerationResult = { schema: SiteSchemaType; log: GenerationLogEntry[] };

export type HasData = {
  services: boolean;
  stats: boolean;
  projects: boolean;
  testimonials: boolean;
  process: boolean;
  faq: boolean;
  pricing: boolean;
  contact: boolean;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function scaleRem(value: { mobile: number; tablet: number; desktop: number }, factor: number) {
  return {
    mobile: Math.round(value.mobile * factor * 100) / 100,
    tablet: Math.round(value.tablet * factor * 100) / 100,
    desktop: Math.round(value.desktop * factor * 100) / 100,
  };
}

function hasSectionData(brief: Brief): HasData {
  return {
    services: brief.services.length > 0,
    stats: Boolean(brief.stats && brief.stats.length > 0),
    projects: Boolean(brief.projects && brief.projects.length > 0),
    testimonials: Boolean(brief.testimonials && brief.testimonials.length > 0),
    process: Boolean(brief.processSteps && brief.processSteps.length > 0),
    faq: Boolean(brief.faq && brief.faq.length > 0),
    pricing: Boolean(brief.pricing && brief.pricing.length > 0),
    contact: Boolean(
      brief.contact && Object.values(brief.contact).some((v) => Boolean(v && String(v).trim())),
    ),
  };
}

type Assembled = {
  pages: SiteSchemaType["pages"];
  navigation: SiteSchemaType["navigation"];
};

function assemblePages(
  brief: Brief,
  playbook: Playbook,
  plan: SectionPlan[],
  has: HasData,
  sections: GeneratedContent["sections"],
  assetIds: ReadonlySet<string>,
): Assembled {
  const assetIdsSet = assetIds;
  const isEn = brief.language === "en";
  const contactPath = has.contact ? (isEn ? "/contact" : "/contacto") : null;
  const homeNav = isEn ? "Home" : "Início";
  const contactNav =
    playbook.industry === "restaurant" ? (isEn ? "Reservations" : "Reservas") : isEn ? "Contact" : "Contacto";

  const makeSection = (type: ComponentType, variant: string, pageSlug: string): SectionType => ({
    id: `${type}-${pageSlug}`,
    type,
    variant,
    props: (sections[type] ?? {}) as Record<string, unknown>,
    responsive: {
      mobile: { hidden: false },
      tablet: { hidden: false },
      desktop: { hidden: false },
    },
    animation: { enabled: true, effect: "fade-up", delayMs: 0 },
  });

  const homeSections = plan.map((p) => makeSection(p.type, effectiveVariant(p, brief), "home"));

  const pages: Assembled["pages"] = [
    {
      id: "home",
      path: "/",
      title: homeNav,
      seo: {
        title: brief.name,
        description: brief.description ? brief.description.slice(0, 160) : undefined,
      },
      sections: homeSections,
    },
  ];

  const footerPlan = plan.find((p) => p.type === "footer");
  if (contactPath && sections.contact) {
    const contactInfoCount = [
      brief.contact?.email,
      brief.contact?.phone,
      brief.contact?.address,
      brief.contact?.hours,
    ].filter(Boolean).length;
    const contactVariant = contactInfoCount >= 2 ? "split" : "form";
    const contactSlug = slugify(contactPath.slice(1)) || "contact";
    pages.push({
      id: contactSlug,
      path: contactPath,
      title: contactNav,
      seo: { title: `${contactNav} — ${brief.name}` },
      sections: [
        makeSection("contact", contactVariant, contactSlug),
        makeSection("footer", footerPlan?.variant ?? "full", contactSlug),
      ],
    });
  }

  const logoRef = brief.assets.logo;
  const logoValid =
    logoRef && (!logoRef.startsWith("asset:") || assetIdsSet.has(logoRef.slice(6))) ? logoRef : undefined;

  const navigation: Assembled["navigation"] = {
    logo: { text: brief.name, ...(logoValid ? { assetRef: logoValid } : {}) },
    links: [
      { label: homeNav, pagePath: "/" },
      ...(contactPath ? [{ label: contactNav, pagePath: contactPath }] : []),
    ],
    cta: contactPath
      ? {
          label:
            (sections.cta?.primaryCta as { label?: string } | undefined)?.label ?? contactNav,
          pagePath: contactPath,
        }
      : undefined,
    sticky: true,
  };

  return { pages, navigation };
}

export async function generateWebsite(
  briefInput: unknown,
  opts: { assetIds: string[] },
): Promise<GenerationResult> {
  const log: GenerationLogEntry[] = [];
  const step = <T>(name: string, fn: () => T): T => {
    const start = performance.now();
    try {
      const result = fn();
      log.push({ step: name, status: "done", durationMs: Math.max(1, Math.round(performance.now() - start)) });
      return result;
    } catch (error) {
      log.push({
        step: name,
        status: "failed",
        durationMs: Math.max(1, Math.round(performance.now() - start)),
        detail: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };

  const brief = step("Validar briefing", () => BriefSchema.parse(briefInput));
  const assetIds = new Set(opts.assetIds);

  const { playbook, has } = step("Analisar negócio", () => ({
    playbook: PLAYBOOKS[brief.industry] ?? PLAYBOOKS.other,
    has: hasSectionData(brief),
  }));

  const filteredPlan = step("Selecionar componentes", () =>
    playbook.sequence.filter((p) => !p.requires || has[p.requires]),
  );

  const baseTheme = step("Construir design system", () => buildTheme(brief, playbook));

  const content = step("Gerar conteúdo", () => buildContent(brief, playbook, filteredPlan, assetIds));

  const { pages, navigation } = step("Construir páginas", () =>
    assemblePages(brief, playbook, filteredPlan, has, content.sections, assetIds),
  );

  const globalSettings: SiteSchemaType["globalSettings"] = { sectionSpacing: "default" };
  const spacingFactor =
    globalSettings.sectionSpacing === "compact" ? 0.78 : globalSettings.sectionSpacing === "spacious" ? 1.22 : 1;
  const theme: ThemeType = {
    ...baseTheme,
    spacing: {
      ...baseTheme.spacing,
      sectionY: scaleRem(baseTheme.spacing.sectionY, spacingFactor),
    },
  };

  const localBusiness =
    [
      "construction",
      "architecture",
      "real-estate",
      "restaurant",
      "retail",
      "professional-services",
      "health",
    ].includes(brief.industry) && Boolean(brief.location);

  const schema: SiteSchemaType = {
    schemaVersion: SCHEMA_VERSION,
    site: {
      name: brief.name,
      industry: brief.industry,
      language: brief.language,
      goal: brief.goal,
      ...(brief.location ? { location: brief.location } : {}),
      ...(brief.audience ? { audience: brief.audience } : {}),
    },
    theme,
    navigation,
    pages,
    globalSettings,
    seo: {
      titleTemplate: "{title} — {site}",
      description: brief.description ? brief.description.slice(0, 200) : undefined,
      locale: brief.language,
      structuredData: localBusiness ? "local-business" : "organization",
    },
    metadata: {
      generator: { kind: "template-engine", version: "1.0.0" },
      source: "brief",
      missingInputs: content.missingInputs,
    },
  };

  step("Validar schema", () => {
    const parsed = SiteSchema.safeParse(schema);
    if (!parsed.success) {
      throw new Error(
        `schema inválido: ${parsed.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ")}`,
      );
    }
    const resolved = resolveSite(schema, { assetIds });
    if (!resolved.ok) {
      const criticals = resolved.issues.filter((i) => i.severity === "critical");
      throw new Error(`site inválido: ${criticals.slice(0, 3).map((i) => i.message).join("; ")}`);
    }
  });

  return { schema, log };
}
