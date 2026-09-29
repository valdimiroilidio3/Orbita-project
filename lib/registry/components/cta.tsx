import { z } from "zod";
import { AssetRef } from "@/lib/site-schema";
import type { ComponentDefinition } from "../types";
import { Container, Heading, ImageFrame, Lead, LinkButton } from "./ui";

const ctaProps = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(240).optional(),
  primaryCta: z.object({
    label: z.string().min(1).max(40),
    pagePath: z.string().regex(/^\/[a-z0-9-]{0,40}$/i),
  }),
  image: AssetRef.optional(),
  imageAlt: z.string().max(160).optional(),
});

export const cta: ComponentDefinition = {
  id: "cta",
  name: "CTA",
  category: "Conversion",
  description: "Call-to-action band.",
  variants: {
    banner: {
      label: "Full banner",
      description: "High-contrast banner, optionally over an image.",
      schema: ctaProps,
      defaultProps: {},
    },
    minimal: {
      label: "Minimal divider",
      description: "Lightweight divider CTA.",
      schema: ctaProps,
      defaultProps: {},
    },
  },
  render(rawProps, ctx) {
    const p = rawProps as z.infer<typeof ctaProps>;

    if (ctx.variant === "minimal") {
      return (
        <Container>
          <div
            className="orbita-cta-flex"
            style={{ borderTop: "1px solid var(--color-border)", paddingBlock: "calc(var(--section-y) * 0.55)" }}
          >
            <Heading level={3} style={{ fontSize: "calc(var(--text-h3) * 1.15)" }}>
              {p.title}
            </Heading>
            <LinkButton href={ctx.linkFor(p.primaryCta.pagePath)} variant="ghost">
              {p.primaryCta.label}
            </LinkButton>
          </div>
        </Container>
      );
    }

    const overImage = Boolean(p.image);
    return (
      <div style={{ position: "relative", overflow: "hidden", background: overImage ? "var(--color-surface)" : "var(--color-primary)" }}>
        {p.image && (
          <ImageFrame
            ctx={ctx}
            src={ctx.assetUrl(p.image)}
            alt={p.imageAlt ?? ""}
            style={{ position: "absolute", inset: 0, borderRadius: 0, height: "100%" }}
          />
        )}
        <div style={{ position: "relative", zIndex: 1 }}>
          <Container
            className="orbita-cta-flex"
            style={{ paddingBlock: "calc(var(--section-y) * 0.8)" }}
          >
            <div style={{ maxWidth: 640 }}>
              <Heading
                level={2}
                style={{
                  fontSize: "var(--text-h2)",
                  color: overImage ? "var(--color-foreground)" : "var(--color-primary-contrast)",
                }}
              >
                {p.title}
              </Heading>
              {p.description && (
                <Lead
                  style={{
                    marginTop: "1rem",
                    color: overImage
                      ? "var(--color-muted)"
                      : "color-mix(in srgb, var(--color-primary-contrast) 82%, transparent)",
                  }}
                >
                  {p.description}
                </Lead>
              )}
            </div>
            <LinkButton
              href={ctx.linkFor(p.primaryCta.pagePath)}
              variant={overImage ? "primary" : "invert"}
            >
              {p.primaryCta.label}
            </LinkButton>
          </Container>
        </div>
      </div>
    );
  },
};
