/**
 * ORBITA ENGINE — industry playbooks.
 *
 * A playbook encodes, per industry: visual personality (theme archetype +
 * curated palette) and a section sequence (layout strategy). The generator
 * filters the sequence by content availability — sections that require real
 * data (stats, projects, testimonials, pricing) only appear when the brief
 * actually provides that data.
 */
import type { IndustryType, FontStackIdType, ThemeType } from "@/lib/site-schema";
import type { ComponentType } from "@/lib/site-schema/catalog";

export interface PlaybookPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  foreground: string;
  muted: string;
  border: string;
  success: string;
  warning: string;
  error: string;
}

export interface SectionPlan {
  type: ComponentType;
  variant: string;
  /** if set, the section is only included when the brief has this data */
  requires?: "services" | "stats" | "projects" | "testimonials" | "process" | "faq" | "pricing" | "contact";
  /** variant override when no image assets are available */
  noImageVariant?: string;
}

/**
 * Resolves the variant a section will actually be rendered with, given the
 * assets the brief provides. Used by BOTH the content builder and the page
 * assembler — they must never disagree, or generated props can violate the
 * variant schema.
 */
export function effectiveVariant(plan: SectionPlan, brief: import("./brief").Brief): string {
  const missingImage =
    (plan.type === "hero" && !brief.assets.hero) ||
    (plan.type === "about" && !brief.assets.about && plan.variant === "split");
  if (!missingImage) return plan.variant;
  return plan.noImageVariant ?? plan.variant;
}

export interface Playbook {
  industry: IndustryType;
  personality: string;
  mode: "light" | "dark";
  palette: PlaybookPalette;
  font: FontStackIdType;
  buttonRadius: "square" | "rounded" | "pill";
  buttonUppercase: boolean;
  overlayOpacity: number;
  /** type scale character */
  scale: "bold" | "refined";
  radius: { sm: number; md: number; lg: number };
  container: number; // rem
  navBackground: ThemeType["details"]["navBackground"];
  sequence: SectionPlan[];
}

export const PLAYBOOKS: Record<IndustryType, Playbook> = {
  construction: {
    industry: "construction",
    personality: "technical / architectural",
    mode: "dark",
    palette: {
      primary: "#D96C2C",
      secondary: "#8A8577",
      accent: "#E8B44A",
      background: "#0D0D0B",
      surface: "#151412",
      foreground: "#F4F2EC",
      muted: "#A3A094",
      border: "#2A2925",
      success: "#5FB27A",
      warning: "#E0A83C",
      error: "#E06052",
    },
    font: "grotesk",
    buttonRadius: "square",
    buttonUppercase: true,
    overlayOpacity: 0.6,
    scale: "bold",
    radius: { sm: 0.0625, md: 0.1875, lg: 0.375 },
    container: 75,
    navBackground: "transparent",
    sequence: [
      { type: "hero", variant: "fullscreen", noImageVariant: "editorial" },
      { type: "stats", variant: "band", requires: "stats" },
      { type: "about", variant: "split", noImageVariant: "statement", requires: undefined },
      { type: "services", variant: "grid", requires: "services" },
      { type: "projects", variant: "featured", requires: "projects", noImageVariant: "grid" },
      { type: "process", variant: "steps", requires: "process" },
      { type: "testimonials", variant: "spotlight", requires: "testimonials" },
      { type: "faq", variant: "accordion", requires: "faq" },
      { type: "cta", variant: "banner" },
      { type: "footer", variant: "full" },
    ],
  },
  architecture: {
    industry: "architecture",
    personality: "architectural / precise",
    mode: "dark",
    palette: {
      primary: "#E8E6E1",
      secondary: "#8F8C85",
      accent: "#C9C5BC",
      background: "#0B0B0B",
      surface: "#121212",
      foreground: "#F1F0ED",
      muted: "#94928C",
      border: "#262626",
      success: "#5FB27A",
      warning: "#E0A83C",
      error: "#E06052",
    },
    font: "mono",
    buttonRadius: "square",
    buttonUppercase: true,
    overlayOpacity: 0.55,
    scale: "bold",
    radius: { sm: 0, md: 0, lg: 0 },
    container: 78,
    navBackground: "transparent",
    sequence: [
      { type: "hero", variant: "editorial" },
      { type: "projects", variant: "featured", requires: "projects", noImageVariant: "grid" },
      { type: "about", variant: "statement" },
      { type: "services", variant: "list", requires: "services" },
      { type: "stats", variant: "band", requires: "stats" },
      { type: "testimonials", variant: "spotlight", requires: "testimonials" },
      { type: "cta", variant: "minimal" },
      { type: "footer", variant: "minimal" },
    ],
  },
  "real-estate": {
    industry: "real-estate",
    personality: "luxury / calm",
    mode: "light",
    palette: {
      primary: "#1E4B3A",
      secondary: "#8C6A3F",
      accent: "#8C6A3F",
      background: "#F7F5F0",
      surface: "#FFFFFF",
      foreground: "#171512",
      muted: "#6E6A61",
      border: "#DCD7CB",
      success: "#3E8E5C",
      warning: "#B07C24",
      error: "#B4462B",
    },
    font: "serif",
    buttonRadius: "rounded",
    buttonUppercase: false,
    overlayOpacity: 0.25,
    scale: "refined",
    radius: { sm: 0.25, md: 0.5, lg: 0.75 },
    container: 72,
    navBackground: "translucent",
    sequence: [
      { type: "hero", variant: "fullscreen", noImageVariant: "minimal" },
      { type: "stats", variant: "band", requires: "stats" },
      { type: "projects", variant: "featured", requires: "projects", noImageVariant: "grid" },
      { type: "about", variant: "split", noImageVariant: "statement" },
      { type: "services", variant: "grid", requires: "services" },
      { type: "testimonials", variant: "spotlight", requires: "testimonials" },
      { type: "faq", variant: "accordion", requires: "faq" },
      { type: "cta", variant: "banner" },
      { type: "footer", variant: "full" },
    ],
  },
  restaurant: {
    industry: "restaurant",
    personality: "cinematic / warm",
    mode: "dark",
    palette: {
      primary: "#B4462B",
      secondary: "#6E5A45",
      accent: "#E3A455",
      background: "#0B0A08",
      surface: "#131009",
      foreground: "#F3EDE2",
      muted: "#A79B89",
      border: "#2B251C",
      success: "#6FA97C",
      warning: "#D9A441",
      error: "#D95F47",
    },
    font: "serif",
    buttonRadius: "pill",
    buttonUppercase: false,
    overlayOpacity: 0.55,
    scale: "bold",
    radius: { sm: 0.375, md: 0.625, lg: 1 },
    container: 70,
    navBackground: "transparent",
    sequence: [
      { type: "hero", variant: "fullscreen", noImageVariant: "centered" },
      { type: "about", variant: "split", noImageVariant: "statement" },
      { type: "services", variant: "list", requires: "services" },
      { type: "testimonials", variant: "spotlight", requires: "testimonials" },
      { type: "faq", variant: "accordion", requires: "faq" },
      { type: "cta", variant: "banner" },
      { type: "footer", variant: "full" },
    ],
  },
  retail: {
    industry: "retail",
    personality: "confident / clear",
    mode: "light",
    palette: {
      primary: "#1F1D1A",
      secondary: "#5C5850",
      accent: "#E5602F",
      background: "#F6F4F1",
      surface: "#FFFFFF",
      foreground: "#171512",
      muted: "#6C675E",
      border: "#DED9D1",
      success: "#3E8E5C",
      warning: "#B07C24",
      error: "#B4462B",
    },
    font: "grotesk",
    buttonRadius: "rounded",
    buttonUppercase: false,
    overlayOpacity: 0.2,
    scale: "bold",
    radius: { sm: 0.25, md: 0.5, lg: 0.875 },
    container: 74,
    navBackground: "solid",
    sequence: [
      { type: "hero", variant: "split", noImageVariant: "minimal" },
      { type: "services", variant: "grid", requires: "services" },
      { type: "projects", variant: "grid", requires: "projects" },
      { type: "stats", variant: "band", requires: "stats" },
      { type: "testimonials", variant: "grid", requires: "testimonials" },
      { type: "faq", variant: "accordion", requires: "faq" },
      { type: "cta", variant: "banner" },
      { type: "footer", variant: "full" },
    ],
  },
  fashion: {
    industry: "fashion",
    personality: "fashion / editorial",
    mode: "light",
    palette: {
      primary: "#141311",
      secondary: "#6B675F",
      accent: "#C24E1A",
      background: "#F4F2EE",
      surface: "#FFFFFF",
      foreground: "#141311",
      muted: "#77736B",
      border: "#DCD8D0",
      success: "#3E8E5C",
      warning: "#B07C24",
      error: "#B4462B",
    },
    font: "serif",
    buttonRadius: "pill",
    buttonUppercase: true,
    overlayOpacity: 0.22,
    scale: "bold",
    radius: { sm: 0.25, md: 0.5, lg: 0.875 },
    container: 76,
    navBackground: "translucent",
    sequence: [
      { type: "hero", variant: "fullscreen", noImageVariant: "editorial" },
      { type: "about", variant: "statement" },
      { type: "projects", variant: "grid", requires: "projects" },
      { type: "services", variant: "list", requires: "services" },
      { type: "testimonials", variant: "spotlight", requires: "testimonials" },
      { type: "cta", variant: "minimal" },
      { type: "footer", variant: "minimal" },
    ],
  },
  technology: {
    industry: "technology",
    personality: "minimal / precise",
    mode: "dark",
    palette: {
      primary: "#4D7CFF",
      secondary: "#7A8B99",
      accent: "#8FD3FF",
      background: "#0A0C10",
      surface: "#10141B",
      foreground: "#EEF1F6",
      muted: "#93A0B4",
      border: "#242B37",
      success: "#5FB27A",
      warning: "#E0A83C",
      error: "#E06052",
    },
    font: "grotesk",
    buttonRadius: "rounded",
    buttonUppercase: false,
    overlayOpacity: 0.5,
    scale: "refined",
    radius: { sm: 0.375, md: 0.625, lg: 1 },
    container: 70,
    navBackground: "solid",
    sequence: [
      { type: "hero", variant: "split", noImageVariant: "minimal" },
      { type: "stats", variant: "band", requires: "stats" },
      { type: "services", variant: "grid", requires: "services" },
      { type: "process", variant: "steps", requires: "process" },
      { type: "projects", variant: "grid", requires: "projects" },
      { type: "testimonials", variant: "grid", requires: "testimonials" },
      { type: "pricing", variant: "grid", requires: "pricing" },
      { type: "faq", variant: "accordion", requires: "faq" },
      { type: "cta", variant: "banner" },
      { type: "footer", variant: "full" },
    ],
  },
  agency: {
    industry: "agency",
    personality: "editorial / bold",
    mode: "dark",
    palette: {
      primary: "#E8E4D8",
      secondary: "#8F8B7F",
      accent: "#D8F34F",
      background: "#0E0E0C",
      surface: "#151513",
      foreground: "#F1EFE8",
      muted: "#9C9A8E",
      border: "#28271F",
      success: "#6FA97C",
      warning: "#D9A441",
      error: "#D95F47",
    },
    font: "display",
    buttonRadius: "pill",
    buttonUppercase: true,
    overlayOpacity: 0.5,
    scale: "bold",
    radius: { sm: 0.375, md: 0.625, lg: 1 },
    container: 72,
    navBackground: "translucent",
    sequence: [
      { type: "hero", variant: "editorial" },
      { type: "about", variant: "statement" },
      { type: "projects", variant: "grid", requires: "projects" },
      { type: "services", variant: "list", requires: "services" },
      { type: "stats", variant: "band", requires: "stats" },
      { type: "testimonials", variant: "grid", requires: "testimonials" },
      { type: "cta", variant: "banner" },
      { type: "footer", variant: "minimal" },
    ],
  },
  "professional-services": {
    industry: "professional-services",
    personality: "corporate / credible",
    mode: "dark",
    palette: {
      primary: "#3E63DD",
      secondary: "#71809B",
      accent: "#93B4FF",
      background: "#0B0D12",
      surface: "#11141B",
      foreground: "#EDEFF4",
      muted: "#8E97A8",
      border: "#242936",
      success: "#5FB27A",
      warning: "#E0A83C",
      error: "#E06052",
    },
    font: "sans",
    buttonRadius: "rounded",
    buttonUppercase: false,
    overlayOpacity: 0.5,
    scale: "refined",
    radius: { sm: 0.3125, md: 0.5, lg: 0.75 },
    container: 70,
    navBackground: "solid",
    sequence: [
      { type: "hero", variant: "split", noImageVariant: "minimal" },
      { type: "services", variant: "list", requires: "services" },
      { type: "process", variant: "steps", requires: "process" },
      { type: "stats", variant: "band", requires: "stats" },
      { type: "testimonials", variant: "spotlight", requires: "testimonials" },
      { type: "faq", variant: "accordion", requires: "faq" },
      { type: "cta", variant: "banner" },
      { type: "footer", variant: "full" },
    ],
  },
  health: {
    industry: "health",
    personality: "calm / trustworthy",
    mode: "light",
    palette: {
      primary: "#2E7D6B",
      secondary: "#5F8D83",
      accent: "#7CC4B2",
      background: "#F4F7F6",
      surface: "#FFFFFF",
      foreground: "#182422",
      muted: "#5E716D",
      border: "#D6E0DE",
      success: "#3E8E5C",
      warning: "#B07C24",
      error: "#B4462B",
    },
    font: "sans",
    buttonRadius: "pill",
    buttonUppercase: false,
    overlayOpacity: 0.18,
    scale: "refined",
    radius: { sm: 0.5, md: 0.875, lg: 1.25 },
    container: 70,
    navBackground: "translucent",
    sequence: [
      { type: "hero", variant: "split", noImageVariant: "minimal" },
      { type: "services", variant: "grid", requires: "services" },
      { type: "process", variant: "steps", requires: "process" },
      { type: "stats", variant: "band", requires: "stats" },
      { type: "testimonials", variant: "grid", requires: "testimonials" },
      { type: "faq", variant: "accordion", requires: "faq" },
      { type: "cta", variant: "banner" },
      { type: "footer", variant: "full" },
    ],
  },
  travel: {
    industry: "travel",
    personality: "adventurous / warm",
    mode: "dark",
    palette: {
      primary: "#2FA98C",
      secondary: "#7C9893",
      accent: "#E8C46B",
      background: "#08100E",
      surface: "#0F1816",
      foreground: "#EDF5F2",
      muted: "#93A8A2",
      border: "#21302C",
      success: "#6FA97C",
      warning: "#D9A441",
      error: "#D95F47",
    },
    font: "grotesk",
    buttonRadius: "pill",
    buttonUppercase: false,
    overlayOpacity: 0.5,
    scale: "bold",
    radius: { sm: 0.375, md: 0.75, lg: 1.25 },
    container: 74,
    navBackground: "transparent",
    sequence: [
      { type: "hero", variant: "fullscreen", noImageVariant: "centered" },
      { type: "projects", variant: "grid", requires: "projects" },
      { type: "about", variant: "split", noImageVariant: "statement" },
      { type: "stats", variant: "band", requires: "stats" },
      { type: "testimonials", variant: "grid", requires: "testimonials" },
      { type: "faq", variant: "accordion", requires: "faq" },
      { type: "cta", variant: "banner" },
      { type: "footer", variant: "full" },
    ],
  },
  other: {
    industry: "other",
    personality: "neutral / professional",
    mode: "dark",
    palette: {
      primary: "#5B8DEF",
      secondary: "#7D8494",
      accent: "#F0C96B",
      background: "#0D0D0B",
      surface: "#141412",
      foreground: "#F2F1EC",
      muted: "#9E9C93",
      border: "#28271F",
      success: "#5FB27A",
      warning: "#E0A83C",
      error: "#E06052",
    },
    font: "grotesk",
    buttonRadius: "rounded",
    buttonUppercase: false,
    overlayOpacity: 0.55,
    scale: "refined",
    radius: { sm: 0.3125, md: 0.5, lg: 0.875 },
    container: 72,
    navBackground: "solid",
    sequence: [
      { type: "hero", variant: "minimal" },
      { type: "about", variant: "statement" },
      { type: "services", variant: "grid", requires: "services" },
      { type: "stats", variant: "band", requires: "stats" },
      { type: "testimonials", variant: "grid", requires: "testimonials" },
      { type: "faq", variant: "accordion", requires: "faq" },
      { type: "cta", variant: "banner" },
      { type: "footer", variant: "full" },
    ],
  },
};
