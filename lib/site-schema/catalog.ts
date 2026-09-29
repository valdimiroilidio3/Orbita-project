/**
 * ORBITA ENGINE — component catalog.
 *
 * The catalog is the single registry of component types and variants that the
 * Site Schema may reference. It is framework-independent data (no React
 * imports) so the Zod schema layer can reference it without circular deps.
 * The actual implementations live in `lib/registry/components/*`.
 */

export type ComponentCategory =
  | "Navigation"
  | "Intro"
  | "Content"
  | "Conversion"
  | "Footer";

export interface ComponentMeta {
  name: string;
  category: ComponentCategory;
  description: string;
  /** variant id -> human label */
  variants: Record<string, string>;
}

export const CATALOG = {
  navigation: {
    name: "Navigation",
    category: "Navigation",
    description: "Site-wide navigation bar. Rendered from the root navigation schema on every page.",
    variants: {
      solid: "Solid bar",
      translucent: "Translucent bar",
      minimal: "Minimal, transparent",
    },
  },
  hero: {
    name: "Hero",
    category: "Intro",
    description: "Opening section of a page.",
    variants: {
      fullscreen: "Fullscreen image",
      split: "Split image + text",
      editorial: "Editorial typography",
      minimal: "Minimal, centered text",
      centered: "Centered over image",
    },
  },
  about: {
    name: "About",
    category: "Content",
    description: "Company or brand presentation.",
    variants: {
      split: "Image + text",
      statement: "Typographic statement",
    },
  },
  services: {
    name: "Services",
    category: "Content",
    description: "What the business does.",
    variants: {
      grid: "Card grid",
      list: "Numbered list",
    },
  },
  projects: {
    name: "Projects",
    category: "Content",
    description: "Portfolio / case studies / featured work.",
    variants: {
      grid: "Image grid",
      featured: "Featured + grid",
    },
  },
  stats: {
    name: "Stats",
    category: "Content",
    description: "Key numbers band.",
    variants: {
      band: "Numbers band",
    },
  },
  testimonials: {
    name: "Testimonials",
    category: "Content",
    description: "Client voices.",
    variants: {
      grid: "Quote cards",
      spotlight: "Single spotlight quote",
    },
  },
  process: {
    name: "Process",
    category: "Content",
    description: "How the work gets done, step by step.",
    variants: {
      steps: "Numbered steps",
    },
  },
  faq: {
    name: "FAQ",
    category: "Content",
    description: "Frequently asked questions.",
    variants: {
      accordion: "Accordion",
    },
  },
  pricing: {
    name: "Pricing",
    category: "Conversion",
    description: "Plans or price points.",
    variants: {
      grid: "Pricing cards",
    },
  },
  contact: {
    name: "Contact",
    category: "Conversion",
    description: "Contact info + message form (real server action).",
    variants: {
      form: "Form",
      split: "Info + form",
    },
  },
  cta: {
    name: "CTA",
    category: "Conversion",
    description: "Call-to-action band.",
    variants: {
      banner: "Full banner",
      minimal: "Minimal divider",
    },
  },
  footer: {
    name: "Footer",
    category: "Footer",
    description: "Site footer with navigation and contact details.",
    variants: {
      full: "Full footer",
      minimal: "One-line footer",
    },
  },
} as const satisfies Record<string, ComponentMeta>;

export type ComponentType = keyof typeof CATALOG;

export const COMPONENT_TYPES: ComponentType[] = Object.keys(CATALOG) as ComponentType[];

export function componentLabel(type: ComponentType): string {
  return CATALOG[type].name;
}

export function variantsOf(type: ComponentType): string[] {
  return Object.keys(CATALOG[type].variants);
}

export function hasVariant(type: ComponentType, variant: string): boolean {
  return variant in CATALOG[type].variants;
}
