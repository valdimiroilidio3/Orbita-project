import type { CSSProperties } from "react";
import { z } from "zod";
import { AssetRef } from "@/lib/site-schema";
import type { ComponentDefinition, SectionRenderContext } from "../types";
import { ET } from "../editable";
import { Container, Eyebrow, Heading, ImageFrame, ImagePlaceholder, Lead, LinkButton } from "./ui";

const Cta = z.object({
  label: z.string().min(1).max(40),
  pagePath: z.string().regex(/^\/[a-z0-9-]{0,40}$/i),
});

const heroProps = z.object({
  eyebrow: z.string().max(80).optional(),
  title: z.string().min(1).max(160),
  description: z.string().max(400).optional(),
  primaryCta: Cta.optional(),
  secondaryCta: Cta.optional(),
  image: AssetRef.optional(),
  imageAlt: z.string().max(160).optional(),
  align: z.enum(["left", "center"]).default("left"),
});

type HeroProps = z.infer<typeof heroProps>;

function HeroContent({ p, ctx }: { p: HeroProps; ctx: SectionRenderContext }) {
  const center = p.align === "center" || ctx.variant === "centered";
  const align: CSSProperties = center
    ? { textAlign: "center", alignItems: "center" }
    : { textAlign: "left", alignItems: "flex-start" };
  return (
    <Container>
      <div style={{ display: "flex", flexDirection: "column", ...align }}>
        {p.eyebrow && (
          <div style={{ marginBottom: "1.25rem" }}>
            <Eyebrow>{ET(ctx, "eyebrow", p.eyebrow)}</Eyebrow>
          </div>
        )}
        <Heading
          level={1}
          style={{
            fontSize: "var(--text-display)",
            lineHeight: 1.02,
            letterSpacing: "-0.03em",
            maxWidth: center ? 820 : 920,
            marginInline: center ? "auto" : undefined,
          }}
        >
          {ET(ctx, "title", p.title)}
        </Heading>
        {p.description && (
          <Lead
            style={{
              maxWidth: 620,
              marginTop: "1.25rem",
              fontSize: "calc(var(--text-body) * 1.1)",
              marginInline: center ? "auto" : undefined,
            }}
          >
            {ET(ctx, "description", p.description)}
          </Lead>
        )}
        {(p.primaryCta || p.secondaryCta) && (
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginTop: "2rem",
              justifyContent: center ? "center" : "flex-start",
            }}
          >
            {p.primaryCta && (
              <LinkButton href={ctx.linkFor(p.primaryCta.pagePath)} variant="primary">
                {ET(ctx, "primaryCta.label", p.primaryCta.label)}
              </LinkButton>
            )}
            {p.secondaryCta && (
              <LinkButton href={ctx.linkFor(p.secondaryCta.pagePath)} variant="outline">
                {ET(ctx, "secondaryCta.label", p.secondaryCta.label)}
              </LinkButton>
            )}
          </div>
        )}
      </div>
    </Container>
  );
}

export const hero: ComponentDefinition = {
  id: "hero",
  name: "Hero",
  category: "Intro",
  description: "Opening section of a page.",
  variants: {
    fullscreen: {
      label: "Fullscreen image",
      description: "Full-bleed background image with overlay, content anchored at the bottom.",
      schema: heroProps,
      defaultProps: { align: "left" },
    },
    split: {
      label: "Split image + text",
      description: "Two-column layout: copy on one side, image on the other.",
      schema: heroProps,
      defaultProps: { align: "left" },
    },
    editorial: {
      label: "Editorial typography",
      description: "Large-scale typographic hero, no image.",
      schema: heroProps,
      defaultProps: { align: "left" },
    },
    minimal: {
      label: "Minimal",
      description: "Centered text-only hero with generous whitespace.",
      schema: heroProps,
      defaultProps: { align: "center" },
    },
    centered: {
      label: "Centered over image",
      description: "Centered copy over a background image.",
      schema: heroProps,
      defaultProps: { align: "center" },
    },
  },
  render(rawProps, ctx) {
    const p = rawProps as HeroProps;

    if (ctx.variant === "fullscreen" || ctx.variant === "centered") {
      const centered = ctx.variant === "centered";
      return (
        <div
          style={{
            position: "relative",
            minHeight: centered ? "70svh" : "min(92svh, 880px)",
            display: "flex",
            alignItems: centered ? "center" : "flex-end",
          }}
        >
          {p.image ? (
            <ImageFrame
              ctx={ctx}
              src={ctx.assetUrl(p.image)}
              alt={p.imageAlt ?? ""}
              eager
              style={{ position: "absolute", inset: 0, borderRadius: 0, height: "100%" }}
            />
          ) : (
            <div style={{ position: "absolute", inset: 0, background: "var(--color-surface)" }} aria-hidden />
          )}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              width: "100%",
              paddingBottom: "calc(var(--section-y) * 0.85)",
              paddingTop: "calc(var(--section-y) * 1.25)",
            }}
          >
            <HeroContent p={p} ctx={ctx} />
          </div>
        </div>
      );
    }

    if (ctx.variant === "split") {
      return (
        <div style={{ minHeight: "70svh", display: "flex", alignItems: "center" }}>
          <Container
            className="orbita-hero-split"
            style={{ paddingBlock: "calc(var(--section-y) * 0.9)" }}
          >
            <HeroContent p={p} ctx={ctx} />
            {p.image ? (
              <ImageFrame
                ctx={ctx}
                src={ctx.assetUrl(p.image)}
                alt={p.imageAlt ?? ""}
                eager
                style={{ aspectRatio: "4 / 3" }}
              />
            ) : (
              <ImagePlaceholder label={ctx.site.name} />
            )}
          </Container>
        </div>
      );
    }

    if (ctx.variant === "editorial") {
      return (
        <div style={{ background: "var(--color-background)" }}>
          <Container style={{ paddingBlock: "calc(var(--section-y) * 1.3)" }}>
            {p.eyebrow && (
              <div style={{ marginBottom: "1.25rem" }}>
                <Eyebrow>{ET(ctx, "eyebrow", p.eyebrow)}</Eyebrow>
              </div>
            )}
            <Heading
              level={1}
              style={{ fontSize: "var(--text-display)", lineHeight: 0.98, letterSpacing: "-0.035em", maxWidth: 1100 }}
            >
              {ET(ctx, "title", p.title)}
            </Heading>
            <div aria-hidden style={{ width: 96, height: 2, background: "var(--color-accent)", margin: "2.5rem 0" }} />
            {p.description && <Lead style={{ maxWidth: 620 }}>{ET(ctx, "description", p.description)}</Lead>}
            {(p.primaryCta || p.secondaryCta) && (
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: "2.5rem" }}>
                {p.primaryCta && (
                  <LinkButton href={ctx.linkFor(p.primaryCta.pagePath)} variant="primary">
                    {ET(ctx, "primaryCta.label", p.primaryCta.label)}
                  </LinkButton>
                )}
                {p.secondaryCta && (
                  <LinkButton href={ctx.linkFor(p.secondaryCta.pagePath)} variant="outline">
                    {ET(ctx, "secondaryCta.label", p.secondaryCta.label)}
                  </LinkButton>
                )}
              </div>
            )}
          </Container>
        </div>
      );
    }

    // minimal
    return (
      <div style={{ minHeight: "58svh", display: "flex", alignItems: "center" }}>
        <Container>
          <div style={{ maxWidth: 720, marginInline: "auto" }}>
            <HeroContent p={{ ...p, align: "center" }} ctx={ctx} />
          </div>
        </Container>
      </div>
    );
  },
};
