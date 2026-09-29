import { z } from "zod";
import { AssetRef } from "@/lib/site-schema";
import type { ComponentDefinition } from "../types";
import { ET } from "../editable";
import { Container, Eyebrow, Heading, ImageFrame, ImagePlaceholder, Lead } from "./ui";

const splitProps = z.object({
  eyebrow: z.string().max(80).optional(),
  title: z.string().min(1).max(100),
  paragraphs: z.array(z.string().min(1).max(500)).min(1).max(4),
  bullets: z
    .array(z.object({ label: z.string().min(1).max(80), description: z.string().max(200).optional() }))
    .max(6)
    .optional(),
  image: AssetRef.optional(),
  imageAlt: z.string().max(160).optional(),
});

const statementProps = z.object({
  eyebrow: z.string().max(80).optional(),
  statement: z.string().min(4).max(320),
  signature: z.string().max(60).optional(),
});

export const about: ComponentDefinition = {
  id: "about",
  name: "About",
  category: "Content",
  description: "Company or brand presentation.",
  variants: {
    split: {
      label: "Image + text",
      description: "Two-column: image and narrative copy.",
      schema: splitProps,
      defaultProps: {},
    },
    statement: {
      label: "Typographic statement",
      description: "A single strong statement, no image.",
      schema: statementProps,
      defaultProps: {},
    },
  },
  render(rawProps, ctx) {
    if (ctx.variant === "statement") {
      const p = rawProps as z.infer<typeof statementProps>;
      return (
        <Container>
          {p.eyebrow && (
            <div style={{ marginBottom: "1.5rem" }}>
              <Eyebrow>{ET(ctx, "eyebrow", p.eyebrow)}</Eyebrow>
            </div>
          )}
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "var(--font-display-weight)",
              fontSize: "calc(var(--text-h1) * 1.12)",
              lineHeight: 1.16,
              letterSpacing: "-0.025em",
              margin: 0,
              maxWidth: 1100,
            }}
          >
            {ET(ctx, "statement", p.statement)}
          </p>
          {p.signature && (
            <p style={{ color: "var(--color-muted)", fontSize: "var(--text-label)", marginTop: "1.5rem", margin: "1.5rem 0 0" }}>
              {ET(ctx, "signature", p.signature)}
            </p>
          )}
        </Container>
      );
    }

    const p = rawProps as z.infer<typeof splitProps>;
    return (
      <Container className="orbita-about-split">
        <div>
          {p.image ? (
            <ImageFrame ctx={ctx} src={ctx.assetUrl(p.image)} alt={p.imageAlt ?? ""} style={{ aspectRatio: "4 / 3" }} />
          ) : (
            <ImagePlaceholder label={ctx.site.name} />
          )}
        </div>
        <div>
          {p.eyebrow && (
            <div style={{ marginBottom: "1rem" }}>
              <Eyebrow>{ET(ctx, "eyebrow", p.eyebrow)}</Eyebrow>
            </div>
          )}
          <Heading level={2}>{ET(ctx, "title", p.title)}</Heading>
          <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 560 }}>
            {p.paragraphs.map((text, i) => (
              <Lead key={i}>{ET(ctx, `paragraphs.${i}`, text)}</Lead>
            ))}
          </div>
          {p.bullets && p.bullets.length > 0 && (
            <ul style={{ listStyle: "none", margin: "2rem 0 0", padding: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
              {p.bullets.map((b, i) => (
                <li key={i} style={{ display: "flex", gap: "0.75rem", alignItems: "baseline" }}>
                  <span aria-hidden style={{ width: 6, height: 6, borderRadius: 1, background: "var(--color-accent)", flex: "none", transform: "translateY(-1px)" }} />
                  <span style={{ fontSize: "calc(var(--text-body) * 0.95)" }}>
                    <strong style={{ fontWeight: 600 }}>{ET(ctx, `bullets.${i}.label`, b.label)}</strong>
                    {b.description ? <span style={{ color: "var(--color-muted)" }}> — {ET(ctx, `bullets.${i}.description`, b.description)}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Container>
    );
  },
};
