/**
 * ORBITA ENGINE — canonical Site Schema (v1.0).
 *
 * The Site Schema is the single source of truth for a generated website:
 * framework-independent, fully validated with Zod, and the only data the
 * rendering engine, editor, AI copilot, versioning and deployment consume.
 * Invalid schemas never reach the renderer (see `lib/engine/page-engine.ts`).
 */
import { z } from "zod";
import { CATALOG, COMPONENT_TYPES, hasVariant, type ComponentType } from "./catalog";

export const SCHEMA_VERSION = "1.0" as const;

export const Language = z.enum(["pt-PT", "pt-BR", "en", "fr", "es"]);
export const Industry = z.enum([
  "construction",
  "architecture",
  "real-estate",
  "restaurant",
  "retail",
  "fashion",
  "technology",
  "agency",
  "professional-services",
  "health",
  "travel",
  "other",
]);
export const Goal = z.enum(["lead_generation", "sales", "informational", "portfolio"]);

export type LanguageType = z.infer<typeof Language>;
export type IndustryType = z.infer<typeof Industry>;
export type GoalType = z.infer<typeof Goal>;

const hex = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, "must be a hex color like #B9FF00");
export const HexColor = hex;

/**
 * An image reference in props. Either:
 * - `asset:<id>`  -> resolved through the asset registry (tenant-aware)
 * - a local path  -> `/sample/...`, `/uploads/...`
 * - an absolute URL
 */
export const AssetRef = z.union([
  z.string().regex(/^asset:[A-Za-z0-9_-]{1,64}$/, "asset references use the asset:<id> format"),
  z.string().regex(/^\/[A-Za-z0-9_\-./]{1,256}$/, "local paths must start with /"),
  z.string().url("remote images must be absolute URLs"),
]);
export type AssetRefType = z.infer<typeof AssetRef>;

const rem = z.number().positive().max(100);
const responsiveRem = z.object({ mobile: rem, tablet: rem, desktop: rem });

export const FontStackId = z.enum(["grotesk", "sans", "serif", "mono", "display"]);
export type FontStackIdType = z.infer<typeof FontStackId>;

// ---------------------------------------------------------------------------
// Theme (design tokens)
// ---------------------------------------------------------------------------

export const ThemeSchema = z.object({
  mode: z.enum(["light", "dark"]),
  colors: z.object({
    primary: hex,
    secondary: hex,
    accent: hex,
    background: hex,
    surface: hex,
    foreground: hex,
    muted: hex,
    border: hex,
    success: hex,
    warning: hex,
    error: hex,
  }),
  typography: z.object({
    display: z.object({
      family: FontStackId,
      weight: z.number().int().min(300).max(900).default(600),
    }),
    body: z.object({
      family: FontStackId,
      weight: z.number().int().min(300).max(900).default(400),
    }),
    scale: z.object({
      display: responsiveRem,
      h1: responsiveRem,
      h2: responsiveRem,
      h3: responsiveRem,
      body: responsiveRem,
      label: responsiveRem,
    }),
  }),
  spacing: z.object({
    /** vertical section padding, in rem, per breakpoint */
    sectionY: responsiveRem,
    container: z.object({ maxWidth: rem }),
  }),
  radius: z.object({ sm: rem, md: rem, lg: rem }),
  shadows: z
    .object({ sm: z.string(), md: z.string(), lg: z.string() })
    .optional(),
  motion: z.object({
    enabled: z.boolean().default(true),
    durationMs: z.number().int().min(100).max(2000).default(520),
    easing: z.enum(["ease-out", "spring", "linear"]).default("ease-out"),
    reduceOnMobile: z.boolean().default(true),
  }),
  details: z
    .object({
      buttonRadius: z.enum(["square", "rounded", "pill"]).default("rounded"),
      buttonUppercase: z.boolean().default(false),
      imageOverlayOpacity: z.number().min(0).max(0.95).default(0.55),
      navBackground: z.enum(["solid", "translucent", "transparent"]).default("solid"),
    })
    .default({}),
});
export type ThemeType = z.infer<typeof ThemeSchema>;

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export const SectionId = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9-]{0,47}$/, "invalid section id");

const breakpointOverride = z
  .object({
    hidden: z.boolean().optional(),
    /** grid column count override for sections that render grids */
    columns: z.number().int().min(1).max(6).optional(),
    /** section vertical padding override in rem */
    sectionY: z.number().positive().max(48).optional(),
  })
  .optional();

export const ResponsiveSchema = z
  .object({
    mobile: breakpointOverride,
    tablet: breakpointOverride,
    desktop: breakpointOverride,
  })
  .optional();

export const AnimationSchema = z
  .object({
    enabled: z.boolean().default(true),
    effect: z.enum(["none", "fade", "fade-up"]).default("fade-up"),
    delayMs: z.number().int().min(0).max(1500).default(0),
  })
  .optional();

export const SectionSchema = z
  .object({
    id: SectionId,
    type: z.enum(COMPONENT_TYPES as [ComponentType, ...ComponentType[]]),
    variant: z.string().min(1),
    /** Component props, validated against the registry variant schema. */
    props: z.record(z.unknown()).default({}),
    responsive: ResponsiveSchema,
    animation: AnimationSchema,
  })
  .superRefine((section, ctx) => {
    if (!hasVariant(section.type, section.variant)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `unknown variant "${section.variant}" for component "${section.type}"`,
        path: ["variant"],
      });
    }
  });
export type SectionType = z.infer<typeof SectionSchema>;
export type ResponsiveConfigType = z.infer<typeof ResponsiveSchema>;
export type AnimationConfigType = z.infer<typeof AnimationSchema>;

// ---------------------------------------------------------------------------
// Pages / navigation / SEO
// ---------------------------------------------------------------------------

export const PagePath = z
  .string()
  .regex(/^\/[a-z0-9-]{0,40}$/i, "page paths look like / or /about-us");

export const PageSchema = z.object({
  id: SectionId,
  path: PagePath,
  title: z.string().min(1).max(80),
  seo: z
    .object({
      title: z.string().min(1).max(70),
      description: z.string().max(200).optional(),
    })
    .optional(),
  sections: z.array(SectionSchema).default([]),
})
  .superRefine((page, ctx) => {
    const seen = new Set<string>();
    for (const s of page.sections) {
      if (seen.has(s.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate section id "${s.id}"`,
          path: ["sections"],
        });
        break;
      }
      seen.add(s.id);
    }
  });
export type PageType = z.infer<typeof PageSchema>;

export const NavigationSchema = z.object({
  logo: z.object({
    text: z.string().min(1).max(40),
    assetRef: AssetRef.optional(),
  }),
  links: z
    .array(
      z.object({
        label: z.string().min(1).max(30),
        pagePath: PagePath,
      }),
    )
    .max(8)
    .default([]),
  cta: z
    .object({
      label: z.string().min(1).max(30),
      pagePath: PagePath,
    })
    .optional(),
  sticky: z.boolean().default(true),
});
export type NavigationType = z.infer<typeof NavigationSchema>;

export const SiteSeoSchema = z
  .object({
    titleTemplate: z.string().default("{title} — {site}"),
    description: z.string().max(200).optional(),
    locale: z.string().default("pt-PT"),
    ogImage: AssetRef.optional(),
    structuredData: z
      .enum(["organization", "local-business", "service", "article", "none"])
      .default("organization"),
  })
  .default({});
export type SiteSeoType = z.infer<typeof SiteSeoSchema>;

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export const SiteSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  site: z.object({
    name: z.string().min(1).max(80),
    industry: Industry,
    language: Language,
    goal: Goal,
    location: z.string().max(120).optional(),
    audience: z.string().max(240).optional(),
  }),
  theme: ThemeSchema,
  navigation: NavigationSchema,
  pages: z.array(PageSchema).min(1),
  globalSettings: z
    .object({
      sectionSpacing: z.enum(["compact", "default", "spacious"]).default("default"),
    })
    .default({}),
  seo: SiteSeoSchema,
  metadata: z
    .object({
      generator: z
        .object({
          kind: z.enum(["template-engine", "ai", "manual"]),
          version: z.string(),
        })
        .optional(),
      source: z.enum(["brief", "template", "blank"]).optional(),
      /** facts that were missing from the input and left as placeholders */
      missingInputs: z.array(z.string()).default([]),
    })
    .default({}),
})
  .superRefine((site, ctx) => {
    const seenPaths = new Set<string>();
    for (const page of site.pages) {
      if (seenPaths.has(page.path)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate page path "${page.path}"`,
          path: ["pages"],
        });
        break;
      }
      seenPaths.add(page.path);
    }
  });

export type SiteSchemaType = z.infer<typeof SiteSchema>;
export type SiteMetaType = SiteSchemaType["site"];

/** All component types that may appear in a schema. */
export const ALL_COMPONENTS = CATALOG;
