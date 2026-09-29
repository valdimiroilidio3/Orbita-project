/**
 * ORBITA ENGINE — theme builder.
 * Deterministically compiles a brief + playbook into a full ThemeSchema:
 * curated palette (optionally re-derived from the brand color), type scale,
 * spacing, radius, motion and detail tokens.
 */
import type { ThemeType } from "@/lib/site-schema";
import { mix, rotateHue } from "@/lib/theme/tokens";
import type { Brief } from "./brief";
import type { Playbook } from "./playbooks";

const SCALES = {
  bold: {
    display: [3.25, 4.75, 6.5],
    h1: [2.125, 2.875, 3.75],
    h2: [1.625, 2.125, 2.625],
    h3: [1.25, 1.375, 1.5],
    body: [1, 1.0625, 1.125],
    label: [0.75, 0.8125, 0.875],
  },
  refined: {
    display: [2.75, 3.75, 5],
    h1: [1.875, 2.5, 3.25],
    h2: [1.5, 1.875, 2.25],
    h3: [1.125, 1.25, 1.375],
    body: [0.9375, 1, 1.0625],
    label: [0.75, 0.8125, 0.875],
  },
} as const;

const SECTION_Y = {
  bold: [4.5, 6.5, 8.5],
  refined: [4, 5.5, 7],
} as const;

function responsive([mobile, tablet, desktop]: readonly number[]) {
  return { mobile, tablet, desktop };
}

export function buildTheme(brief: Brief, playbook: Playbook): ThemeType {
  const palette = { ...playbook.palette };
  const brandPrimary = brief.brand?.primaryColor;

  if (brandPrimary) {
    palette.primary = brandPrimary;
    palette.accent = rotateHue(brandPrimary, 32, 0.08);
    palette.secondary = mix(brandPrimary, palette.background, 0.55);
  }

  const mode = brief.brand?.mode ?? playbook.mode;
  if (mode === "light" && playbook.mode === "dark") {
    palette.background = mix(palette.background, "#FFFFFF", 0.9);
    palette.surface = mix(palette.surface, "#FFFFFF", 0.92);
    palette.foreground = mix(palette.foreground, "#141311", 0.9);
    palette.muted = mix(palette.muted, "#57534A", 0.7);
    palette.border = mix(palette.border, "#D8D4CA", 0.7);
  }

  const font = brief.brand?.font ?? playbook.font;
  const scale = SCALES[playbook.scale];

  return {
    mode,
    colors: palette,
    typography: {
      display: { family: font, weight: font === "serif" ? 500 : 600 },
      body: { family: font, weight: 400 },
      scale: {
        display: responsive(scale.display),
        h1: responsive(scale.h1),
        h2: responsive(scale.h2),
        h3: responsive(scale.h3),
        body: responsive(scale.body),
        label: responsive(scale.label),
      },
    },
    spacing: {
      sectionY: responsive(SECTION_Y[playbook.scale]),
      container: { maxWidth: playbook.container },
    },
    radius: { ...playbook.radius },
    shadows:
      mode === "dark"
        ? {
            sm: "0 1px 0 rgba(255,255,255,0.04)",
            md: "0 8px 24px rgba(0,0,0,0.35)",
            lg: "0 24px 64px rgba(0,0,0,0.45)",
          }
        : {
            sm: "0 1px 2px rgba(20,18,14,0.06)",
            md: "0 12px 32px rgba(20,18,14,0.10)",
            lg: "0 24px 64px rgba(20,18,14,0.14)",
          },
    motion: { enabled: true, durationMs: 520, easing: "ease-out", reduceOnMobile: true },
    details: {
      buttonRadius: playbook.buttonRadius,
      buttonUppercase: playbook.buttonUppercase,
      imageOverlayOpacity: mode === "light" ? Math.min(playbook.overlayOpacity, 0.3) : playbook.overlayOpacity,
      navBackground: playbook.navBackground,
    },
  };
}
