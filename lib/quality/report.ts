/**
 * ORBITA ENGINE — quality engine.
 *
 * Automated review that runs before a website is "ready". Every check is a
 * real, deterministic computation (WCAG contrast math, schema audits, asset
 * audits). Scores are never fabricated: we report passed checks and the
 * issue list.
 */
import type { SiteSchemaType } from "@/lib/site-schema";
import { contrastRatio, readableTextOn } from "@/lib/theme/tokens";
import { collectAssetRefs } from "@/lib/engine/page-engine";

export type Severity = "critical" | "warning" | "suggestion";

export type QualityIssue = {
  severity: Severity;
  code: string;
  message: string;
  pageId?: string;
  sectionId?: string;
};

export type QualityCheck = { id: string; label: string; passed: boolean };

export type QualityReport = {
  issues: QualityIssue[];
  counts: { critical: number; warning: number; suggestion: number };
  checks: QualityCheck[];
};

export function runQualityChecks(
  schema: SiteSchemaType,
  assetIds: ReadonlySet<string>,
): QualityReport {
  const issues: QualityIssue[] = [];
  const checks: QualityCheck[] = [];
  const c = schema.theme.colors;

  const check = (id: string, label: string, passed: boolean) => {
    checks.push({ id, label, passed });
    return passed;
  };

  // ---- structural ----------------------------------------------------------
  const home = schema.pages.find((p) => p.path === "/");
  if (!check("home-exists", "Homepage at /", Boolean(home))) {
    issues.push({ severity: "critical", code: "missing-homepage", message: "O site não tem uma página inicial em /" });
  }

  for (const page of schema.pages) {
    const ids = new Set<string>();
    for (const s of page.sections) {
      if (ids.has(s.id)) {
        issues.push({ severity: "critical", code: "duplicate-section", message: `Secção duplicada "${s.id}" em ${page.path}`, pageId: page.id, sectionId: s.id });
      }
      ids.add(s.id);
    }
    if (!check(`page-${page.id}-has-sections`, `Página ${page.path} tem secções`, page.sections.length > 0)) {
      issues.push({ severity: "warning", code: "empty-page", message: `A página ${page.path} não tem secções`, pageId: page.id });
    }
  }

  // ---- SEO ------------------------------------------------------------------
  for (const page of schema.pages) {
    const seoTitle = page.seo?.title ?? "";
    const seoDesc = page.seo?.description ?? "";
    if (!check(`seo-title-${page.id}`, `SEO title (${page.path})`, seoTitle.length >= 10 && seoTitle.length <= 65)) {
      issues.push({
        severity: seoTitle ? "warning" : "critical",
        code: "seo-title",
        message: `Título SEO de ${page.path} deve ter 10–65 caracteres (atual: ${seoTitle.length})`,
        pageId: page.id,
      });
    }
    if (!check(`seo-desc-${page.id}`, `SEO description (${page.path})`, seoDesc.length >= 40 && seoDesc.length <= 160)) {
      issues.push({
        severity: "warning",
        code: "seo-description",
        message: `Descrição SEO de ${page.path} deve ter 40–160 caracteres (atual: ${seoDesc.length})`,
        pageId: page.id,
      });
    }
  }
  check("seo-structured-data", "Structured data configurado", schema.seo.structuredData !== "none");

  // ---- accessibility: contrast (real WCAG math) ------------------------------
  const contrast = (a: string, b: string, label: string, min: number) => {
    const ratio = contrastRatio(a, b);
    if (!check(`contrast-${label}`, `Contraste ${label} (${ratio.toFixed(2)}:1)`, ratio >= min)) {
      issues.push({
        severity: ratio < min / 1.5 ? "critical" : "warning",
        code: "contrast",
        message: `Contraste ${label} é ${ratio.toFixed(2)}:1 (mínimo ${min}:1)`,
      });
    }
    return ratio;
  };
  contrast(c.foreground, c.background, "texto principal / fundo", 4.5);
  contrast(c.foreground, c.surface, "texto principal / superfície", 4.5);
  contrast(c.muted, c.background, "texto secundário / fundo", 4.5);
  contrast(c.foreground, c.primary, "texto / primary (texto sobre primary)", 4.5);
  contrast(readableTextOn(c.primary), c.primary, "botão primary", 4.5);
  contrast(c.accent, c.background, "accent / fundo (texto grande)", 3);

  // ---- a11y: landmarks, headings, alt ---------------------------------------
  check("nav-present", "Navegação presente", schema.navigation.links.length > 0);

  let h1Count = 0;
  let footerCount = 0;
  for (const page of schema.pages) {
    const hasFooter = page.sections.some((s) => s.type === "footer");
    if (hasFooter) footerCount++;
    if (!check(`footer-${page.id}`, `Footer (${page.path})`, hasFooter)) {
      issues.push({ severity: "warning", code: "missing-footer", message: `A página ${page.path} não tem footer`, pageId: page.id });
    }
  }
  check("footer-all-pages", "Footer em todas as páginas", footerCount === schema.pages.length);

  // ---- content: images, alts, placeholders, assets ---------------------------
  let imageCount = 0;
  let brokenAssets = 0;
  let missingAlt = 0;
  let placeholders = 0;

  for (const page of schema.pages) {
    for (const section of page.sections) {
      const props = section.props as Record<string, unknown>;
      const json = JSON.stringify(props);

      for (const ref of collectAssetRefs(props)) {
        if (ref.startsWith("asset:") && !assetIds.has(ref.slice(6))) {
          brokenAssets++;
          issues.push({ severity: "critical", code: "broken-asset", message: `Asset "${ref}" não existe no projeto`, pageId: page.id, sectionId: section.id });
        }
      }

      if (section.type === "hero" || section.type === "about" || section.type === "cta" || section.type === "projects") {
        const images: string[] = [];
        const walk = (v: unknown) => {
          if (typeof v === "string") {
            if (/^(asset:|\/|https?:)/.test(v)) images.push(v);
            return;
          }
          if (Array.isArray(v)) v.forEach(walk);
          else if (v && typeof v === "object") Object.values(v).forEach(walk);
        };
        walk(props);
        imageCount += images.length;
        const altPresent = "imageAlt" in props && String(props.imageAlt ?? "").trim().length > 0;
        const itemAlts =
          section.type === "projects" && Array.isArray((props as { items?: unknown[] }).items)
            ? (props as { items: { image?: string; alt?: string }[] }).items.every(
                (it) => !it.image || Boolean(it.alt?.trim()),
              )
            : true;
        if (images.length > 0 && !altPresent && section.type !== "projects" && !itemAlts) {
          missingAlt++;
        }
        if (section.type === "projects" && !itemAlts) missingAlt++;
        if (json.includes("{{") || json.includes("__")) placeholders++;
      }
      if (page.path === "/" && section.type === "hero") h1Count += 1;
    }
  }

  check("assets-integrity", "Assets íntegros", brokenAssets === 0);
  if (!check("alt-text", "Alt text presente", missingAlt === 0)) {
    issues.push({ severity: "warning", code: "missing-alt", message: `${missingAlt} secção(ões) com imagem sem alt text` });
  }
  if (!check("no-placeholders", "Sem placeholders", placeholders === 0)) {
    issues.push({ severity: "warning", code: "placeholder-content", message: "Conteúdo com placeholders detetado" });
  }
  check("h1-home", "H1 na homepage", h1Count === 1);

  // ---- performance (static analysis, honest) ---------------------------------
  if (!check("image-count", `Carga de imagens (${imageCount})`, imageCount <= 8)) {
    issues.push({ severity: "suggestion", code: "many-images", message: `${imageCount} imagens — considerar compressão/variantes por breakpoint no deploy` });
  }
  for (const page of schema.pages) {
    if (page.sections.length > 12) {
      issues.push({ severity: "suggestion", code: "dense-page", message: `Página ${page.path} com ${page.sections.length} secções — considerar dividir`, pageId: page.id });
    }
  }

  // ---- content gaps (from generation metadata) -------------------------------
  for (const missing of schema.metadata.missingInputs) {
    issues.push({ severity: "suggestion", code: "missing-input", message: `Input em falta no briefing: ${missing}` });
  }

  const counts = {
    critical: issues.filter((i) => i.severity === "critical").length,
    warning: issues.filter((i) => i.severity === "warning").length,
    suggestion: issues.filter((i) => i.severity === "suggestion").length,
  };

  return { issues, counts, checks };
}
