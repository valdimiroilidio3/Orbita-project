import { z } from "zod";
import type { ComponentDefinition } from "../types";
import { ET } from "../editable";
import { Container, uiStrings } from "./ui";

const footerProps = z.object({
  description: z.string().max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(40).optional(),
  address: z.string().max(160).optional(),
});

export const footer: ComponentDefinition = {
  id: "footer",
  name: "Footer",
  category: "Footer",
  description: "Site footer with navigation and contact details.",
  variants: {
    full: {
      label: "Full footer",
      description: "Brand, sitemap and contact columns.",
      schema: footerProps,
      defaultProps: {},
    },
    minimal: {
      label: "One-line footer",
      description: "Copyright and inline links.",
      schema: footerProps,
      defaultProps: {},
    },
  },
  render(rawProps, ctx) {
    const p = rawProps as z.infer<typeof footerProps>;
    const t = uiStrings(ctx);
    const nav = ctx.schema.navigation;
    const year = new Date().getFullYear();
    const small = {
      color: "var(--color-muted)",
      fontSize: "calc(var(--text-body) * 0.9)",
      lineHeight: 1.8,
    } as const;

    const linkStyle = {
      color: "var(--color-muted)",
      fontSize: "calc(var(--text-body) * 0.9)",
      textDecoration: "none",
    } as const;

    if (ctx.variant === "minimal") {
      return (
        <div style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-border)" }}>
          <Container className="orbita-footer-bottom" style={{ paddingBlock: "calc(var(--section-y) * 0.45)" }}>
            <span style={{ ...small }}>
              © {year} {ctx.site.name}
            </span>
            <span style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
              {nav.links.map((l) => (
                <a key={l.pagePath} href={ctx.linkFor(l.pagePath)} style={linkStyle}>
                  {l.label}
                </a>
              ))}
            </span>
          </Container>
        </div>
      );
    }

    return (
      <footer style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-border)" }}>
        <Container style={{ paddingBlock: "calc(var(--section-y) * 0.7)" }}>
          <div className="orbita-footer-grid">
            <div>
              <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.05rem", margin: 0 }}>
                {nav.logo.text}
              </p>
              {p.description && (
                <p style={{ ...small, maxWidth: 320, marginTop: "0.75rem" }}>{ET(ctx, "description", p.description)}</p>
              )}
            </div>
            <nav aria-label={t.sitemap}>
              <p style={{ ...small, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1rem" }}>
                {t.sitemap}
              </p>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {nav.links.map((l) => (
                  <li key={l.pagePath}>
                    <a href={ctx.linkFor(l.pagePath)} style={linkStyle}>
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <div>
              <p style={{ ...small, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1rem" }}>
                {t.contact}
              </p>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {p.email && <li style={small}>{ET(ctx, "email", p.email)}</li>}
                {p.phone && <li style={small}>{ET(ctx, "phone", p.phone)}</li>}
                {p.address && <li style={small}>{ET(ctx, "address", p.address)}</li>}
              </ul>
            </div>
          </div>
          <div
            className="orbita-footer-bottom"
            style={{ borderTop: "1px solid var(--color-border)", marginTop: "3rem", paddingTop: "1.5rem" }}
          >
            <span style={{ ...small }}>
              © {year} {ctx.site.name}
            </span>
            <span style={{ ...small, opacity: 0.7 }}>{t.powered}</span>
          </div>
        </Container>
      </footer>
    );
  },
};
