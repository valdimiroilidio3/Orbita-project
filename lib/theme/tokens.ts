/**
 * ORBITA ENGINE — design tokens.
 *
 * Themes are data (validated by `ThemeSchema`). `themeToCss()` compiles a
 * theme into a deterministic CSS block: custom properties + responsive media
 * queries + the minimal base stylesheet for rendered sites. Site components
 * consume tokens only — they never hardcode colors or typography.
 */
import type { FontStackIdType, ThemeType } from "@/lib/site-schema";

// ---------------------------------------------------------------------------
// Font stacks (self-hosted via @fontsource where possible)
// ---------------------------------------------------------------------------

export const FONT_STACKS: Record<
  FontStackIdType,
  { label: string; display: string; body: string }
> = {
  grotesk: {
    label: "Grotesk (Space Grotesk + Inter)",
    display: '"Space Grotesk Variable","Space Grotesk",ui-sans-serif,system-ui,sans-serif',
    body: '"Inter Variable",ui-sans-serif,system-ui,sans-serif',
  },
  sans: {
    label: "Sans (Inter)",
    display: '"Inter Variable",ui-sans-serif,system-ui,sans-serif',
    body: '"Inter Variable",ui-sans-serif,system-ui,sans-serif',
  },
  serif: {
    label: "Editorial (Georgia display + Inter body)",
    display: 'Georgia,"Times New Roman",serif',
    body: '"Inter Variable",ui-sans-serif,system-ui,sans-serif',
  },
  mono: {
    label: "Technical (mono display + Inter body)",
    display: 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
    body: '"Inter Variable",ui-sans-serif,system-ui,sans-serif',
  },
  display: {
    label: "Display (Space Grotesk bold + Inter body)",
    display: '"Space Grotesk Variable","Space Grotesk",ui-sans-serif,system-ui,sans-serif',
    body: '"Inter Variable",ui-sans-serif,system-ui,sans-serif',
  },
};

// ---------------------------------------------------------------------------
// Color math (WCAG-compliant, used by the quality engine too)
// ---------------------------------------------------------------------------

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const v = h.length === 8 ? h.slice(0, 6) : h;
  const int = parseInt(v, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function srgbChannel(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** WCAG 2.x relative luminance. */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * srgbChannel(r) + 0.7152 * srgbChannel(g) + 0.0722 * srgbChannel(b);
}

/** WCAG contrast ratio between two hex colors (1..21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** Returns #FFFFFF or near-black, whichever has the higher contrast on `bg`. */
export function readableTextOn(bg: string): string {
  return contrastRatio("#FFFFFF", bg) >= contrastRatio("#0A0A08", bg)
    ? "#FFFFFF"
    : "#0A0A08";
}

function pad2(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
}

/** Linear blend: t = 0 → a, t = 1 → b. */
export function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return `#${pad2(A.r + (B.r - A.r) * t)}${pad2(A.g + (B.g - A.g) * t)}${pad2(A.b + (B.b - A.b) * t)}`;
}

export type Hsl = { h: number; s: number; l: number };

export function hexToHsl(hex: string): Hsl {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case rn:
      h = (gn - bn) / d + (gn < bn ? 6 : 0);
      break;
    case gn:
      h = (bn - rn) / d + 2;
      break;
    default:
      h = (rn - gn) / d + 4;
  }
  return { h: (h * 60 + 360) % 360, s, l };
}

export function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return `#${pad2((r + m) * 255)}${pad2((g + m) * 255)}${pad2((b + m) * 255)}`;
}

/** Shifts lightness by `delta` (percentage points, e.g. +18). */
export function shiftLightness(hex: string, delta: number): string {
  const { h, s, l } = hexToHsl(hex);
  const nl = Math.max(0.04, Math.min(0.96, l + delta / 100));
  return hslToHex(h, s, nl);
}

/** Rotate hue by `delta` degrees, optionally adjusting saturation. */
export function rotateHue(hex: string, delta: number, saturationDelta = 0): string {
  const { h, s, l } = hexToHsl(hex);
  const nh = (h + delta + 360) % 360;
  const ns = Math.max(0, Math.min(1, s + saturationDelta));
  return hslToHex(nh, ns, l);
}

// ---------------------------------------------------------------------------
// Theme → CSS
// ---------------------------------------------------------------------------

const stack = (id: FontStackIdType) => FONT_STACKS[id];

/**
 * Compiles a theme into a deterministic CSS string.
 * Mobile-first: base vars = mobile scale, then 768px and 1024px media queries.
 */
export function themeToCss(theme: ThemeType): string {
  const c = theme.colors;
  const scale = theme.typography.scale;
  const sectionY = theme.spacing.sectionY;

  const navBg =
    theme.details.navBackground === "solid"
      ? "var(--color-background)"
      : theme.details.navBackground === "translucent"
        ? "color-mix(in srgb, var(--color-background) 82%, transparent)"
        : "transparent";
  const btnRadius =
    theme.details.buttonRadius === "pill"
      ? "999px"
      : theme.details.buttonRadius === "square"
        ? "0px"
        : "var(--radius-md)";
  const shadows = theme.shadows ?? { sm: "none", md: "none", lg: "none" };
  const ease =
    theme.motion.easing === "spring"
      ? "cubic-bezier(0.34, 1.15, 0.4, 1)"
      : theme.motion.easing;

  const scaleBlock = (bp: "mobile" | "tablet" | "desktop") =>
    `--text-display:${scale.display[bp]}rem;--text-h1:${scale.h1[bp]}rem;--text-h2:${scale.h2[bp]}rem;--text-h3:${scale.h3[bp]}rem;--text-body:${scale.body[bp]}rem;--text-label:${scale.label[bp]}rem;--section-y:${sectionY[bp]}rem;`;

  const lines = [
    ":root{",
    `--color-primary:${c.primary};--color-secondary:${c.secondary};--color-accent:${c.accent};`,
    `--color-background:${c.background};--color-surface:${c.surface};--color-foreground:${c.foreground};`,
    `--color-muted:${c.muted};--color-border:${c.border};--color-success:${c.success};--color-warning:${c.warning};--color-error:${c.error};`,
    `--color-primary-contrast:${readableTextOn(c.primary)};`,
    `--font-display:${stack(theme.typography.display.family).display};--font-body:${stack(theme.typography.body.family).body};`,
    `--font-display-weight:${theme.typography.display.weight};--font-body-weight:${theme.typography.body.weight};`,
    `--radius-sm:${theme.radius.sm}rem;--radius-md:${theme.radius.md}rem;--radius-lg:${theme.radius.lg}rem;`,
    `--shadow-sm:${shadows.sm};--shadow-md:${shadows.md};--shadow-lg:${shadows.lg};`,
    `--dur:${theme.motion.durationMs}ms;--ease:${ease};`,
    `--container-max:${theme.spacing.container.maxWidth}rem;`,
    `--nav-bg:${navBg};--btn-radius:${btnRadius};--overlay-opacity:${theme.details.imageOverlayOpacity};`,
    "}",
    `:root{${scaleBlock("mobile")}}`,
    `@media (min-width:768px){:root{${scaleBlock("tablet")}}}`,
    `@media (min-width:1024px){:root{${scaleBlock("desktop")}}}`,
    // base site styles -------------------------------------------------------
    ".orbita-site{background:var(--color-background);color:var(--color-foreground);font-family:var(--font-body);font-weight:var(--font-body-weight);font-size:var(--text-body);line-height:1.65;overflow-x:clip}",
    ".orbita-site img{max-width:100%;height:auto;display:block}",
    ".orbita-container{width:100%;max-width:var(--container-max);margin-inline:auto;padding-inline:clamp(1.25rem,4vw,2.5rem)}",
    theme.details.buttonUppercase
      ? ".orbita-btn{text-transform:uppercase;letter-spacing:0.06em}"
      : ".orbita-btn{text-transform:none;letter-spacing:0.01em}",
    ".orbita-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;padding:.8rem 1.4rem;border-radius:var(--btn-radius);font-family:var(--font-display);font-weight:600;font-size:var(--text-label);line-height:1.1;text-decoration:none;border:1px solid transparent;transition:opacity .18s ease,border-color .18s ease,background-color .18s ease;cursor:pointer;white-space:nowrap}",
    ".orbita-btn:hover{opacity:.88}",
    ".orbita-btn-sm{padding:.55rem 1rem;font-size:calc(var(--text-label) * .92)}",
    ".orbita-btn-primary{background:var(--color-primary);color:var(--color-primary-contrast)}",
    ".orbita-btn-outline{border-color:var(--color-border);color:var(--color-foreground)}",
    ".orbita-btn-outline:hover{border-color:var(--color-foreground);opacity:1}",
    ".orbita-btn-invert{background:var(--color-background);color:var(--color-foreground)}",
    ".orbita-btn-ghost{color:var(--color-foreground);border-color:transparent;padding-left:0;padding-right:0;text-decoration:underline;text-underline-offset:5px;text-decoration-color:var(--color-border)}",
    ".orbita-input{width:100%;background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:.8rem 1rem;color:var(--color-foreground);font-family:var(--font-body);font-size:var(--text-body);line-height:1.5}",
    ".orbita-input::placeholder{color:var(--color-muted)}",
    // motion ------------------------------------------------------------------
    ".orbita-anim{animation:orbita-fade var(--dur) var(--ease) both}",
    ".orbita-anim.orbita-fade-up{animation-name:orbita-fade-up}",
    "@keyframes orbita-fade{from{opacity:0}to{opacity:1}}",
    "@keyframes orbita-fade-up{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}",
    theme.motion.enabled
      ? ""
      : ".orbita-anim{animation:none!important}",
    theme.motion.reduceOnMobile
      ? "@media (max-width:767px){.orbita-anim{animation:none!important}}"
      : "",
    "@media (prefers-reduced-motion:reduce){.orbita-anim{animation:none!important}}",
    // a11y --------------------------------------------------------------------
    ".orbita-site a:focus-visible,.orbita-site button:focus-visible,.orbita-site summary:focus-visible,.orbita-site input:focus-visible,.orbita-site textarea:focus-visible{outline:2px solid var(--color-accent);outline-offset:2px;border-radius:2px}",
    ".orbita-site details>summary{list-style:none;cursor:pointer}",
    ".orbita-site details>summary::-webkit-details-marker{display:none}",
    // interactive -------------------------------------------------------------
    ".orbita-nav-link{transition:opacity .15s ease}",
    ".orbita-nav-link:hover{opacity:1!important}",
    ".orbita-faq-icon{transition:transform .2s ease;flex:none}",
    "details[open] .orbita-faq-icon{transform:rotate(45deg)}",
    ".orbita-label{display:block;font-family:var(--font-display);font-weight:600;font-size:var(--text-label);color:var(--color-foreground);margin-bottom:.5rem}",
    // responsive layout utilities (mobile-first) -------------------------------
    ".orbita-hero-split{display:grid;gap:3rem;align-items:center;grid-template-columns:1fr}",
    "@media (min-width:768px){.orbita-hero-split{grid-template-columns:1.05fr .95fr}}",
    ".orbita-about-split{display:grid;gap:2.5rem;align-items:center;grid-template-columns:1fr}",
    "@media (min-width:768px){.orbita-about-split{grid-template-columns:.9fr 1.1fr}}",
    ".orbita-grid-auto{display:grid;gap:1.25rem;grid-template-columns:1fr}",
    "@media (min-width:640px){.orbita-grid-auto{grid-template-columns:repeat(2,minmax(0,1fr))}}",
    "@media (min-width:1024px){.orbita-grid-auto{grid-template-columns:repeat(var(--columns,3),minmax(0,1fr))}}",
    ".orbita-grid-stats{display:grid;gap:2rem;grid-template-columns:repeat(2,minmax(0,1fr))}",
    "@media (min-width:768px){.orbita-grid-stats{grid-template-columns:repeat(var(--stats-cols,4),minmax(0,1fr))}}",
    ".orbita-services-row{display:grid;gap:.5rem;grid-template-columns:1fr;padding-block:1.5rem;border-bottom:1px solid var(--color-border)}",
    "@media (min-width:768px){.orbita-services-row{grid-template-columns:56px 1fr 1.6fr;gap:1.5rem;align-items:start}}",
    ".orbita-featured-img{aspect-ratio:16/10}",
    "@media (min-width:768px){.orbita-featured-img{aspect-ratio:21/9}}",
    ".orbita-cta-flex{display:flex;flex-direction:column;gap:1.5rem;align-items:flex-start}",
    "@media (min-width:768px){.orbita-cta-flex{flex-direction:row;align-items:center;justify-content:space-between;gap:2rem}}",
    ".orbita-footer-grid{display:grid;gap:2.5rem;grid-template-columns:1fr}",
    "@media (min-width:768px){.orbita-footer-grid{grid-template-columns:2fr 1fr 1fr}}",
    ".orbita-footer-bottom{display:flex;flex-direction:column;gap:.5rem}",
    "@media (min-width:768px){.orbita-footer-bottom{flex-direction:row;align-items:center;justify-content:space-between}}",
    ".orbita-contact-split{display:grid;gap:2.5rem;grid-template-columns:1fr}",
    "@media (min-width:768px){.orbita-contact-split{grid-template-columns:1fr 1.2fr}}",
  ];
  return lines.filter(Boolean).join("\n");
}
