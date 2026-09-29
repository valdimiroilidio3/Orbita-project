import { z } from "zod";
import type { ComponentDefinition } from "../types";
import { ET } from "../editable";
import { Card, Container, Lead, LinkButton, SectionHeader } from "./ui";

const Cta = z.object({
  label: z.string().min(1).max(40),
  pagePath: z.string().regex(/^\/[a-z0-9-]{0,40}$/i),
});

const pricingProps = z.object({
  eyebrow: z.string().max(80).optional(),
  title: z.string().min(1).max(80).optional(),
  intro: z.string().max(300).optional(),
  items: z
    .array(
      z.object({
        name: z.string().min(1).max(40),
        price: z.string().min(1).max(40),
        period: z.string().max(20).optional(),
        description: z.string().max(200).optional(),
        features: z.array(z.string().min(1).max(80)).min(1).max(10),
        cta: Cta.optional(),
        featured: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(4),
});

export const pricing: ComponentDefinition = {
  id: "pricing",
  name: "Pricing",
  category: "Conversion",
  description: "Plans or price points. Only generated from brief-provided tiers.",
  variants: {
    grid: {
      label: "Pricing cards",
      description: "Card grid with an optional highlighted tier.",
      schema: pricingProps,
      defaultProps: {},
    },
  },
  render(rawProps, ctx) {
    const p = rawProps as z.infer<typeof pricingProps>;
    return (
      <Container>
        <SectionHeader ctx={ctx} eyebrow={p.eyebrow} title={p.title} intro={p.intro} />
        <div className="orbita-grid-auto" style={{ ["--columns" as string]: Math.min(p.items.length, 3) }}>
          {p.items.map((tier, i) => (
            <Card
              key={i}
              style={{
                padding: "2rem",
                position: "relative",
                borderColor: tier.featured ? "var(--color-accent)" : "var(--color-border)",
              }}
            >
              {tier.featured && (
                <span
                  style={{
                    position: "absolute",
                    top: "-0.8rem",
                    left: "1.5rem",
                    background: "var(--color-accent)",
                    color: "var(--color-background)",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    padding: "0.3rem 0.7rem",
                    borderRadius: "999px",
                  }}
                >
                  Destaque
                </span>
              )}
              <p
                style={{
                  color: "var(--color-muted)",
                  fontSize: "var(--text-label)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  margin: 0,
                }}
              >
                {ET(ctx, `items.${i}.name`, tier.name)}
              </p>
              <p style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-h3)", letterSpacing: "-0.02em", margin: "0.75rem 0 0", display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                <span>{ET(ctx, `items.${i}.price`, tier.price)}</span>
                {tier.period && (
                  <span style={{ color: "var(--color-muted)", fontSize: "var(--text-label)" }}>/ {ET(ctx, `items.${i}.period`, tier.period)}</span>
                )}
              </p>
              {tier.description && (
                <Lead style={{ fontSize: "calc(var(--text-body) * 0.92)", marginTop: "0.75rem" }}>
                  {ET(ctx, `items.${i}.description`, tier.description)}
                </Lead>
              )}
              <ul style={{ listStyle: "none", margin: "1.5rem 0", padding: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {tier.features.map((f, j) => (
                  <li key={j} style={{ display: "flex", gap: "0.6rem", alignItems: "baseline", fontSize: "calc(var(--text-body) * 0.95)" }}>
                    <span aria-hidden style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--color-accent)", flex: "none", transform: "translateY(-2px)" }} />
                    {ET(ctx, `items.${i}.features.${j}`, f)}
                  </li>
                ))}
              </ul>
              {tier.cta && (
                <LinkButton
                  href={ctx.linkFor(tier.cta.pagePath)}
                  variant={tier.featured ? "primary" : "outline"}
                  className="w-full"
                >
                  {ET(ctx, `items.${i}.cta.label`, tier.cta.label)}
                </LinkButton>
              )}
            </Card>
          ))}
        </div>
      </Container>
    );
  },
};
