import { z } from "zod";
import type { ComponentDefinition } from "../types";
import { ET } from "../editable";
import { Card, Container, SectionHeader } from "./ui";

const item = z.object({
  quote: z.string().min(1).max(400),
  name: z.string().min(1).max(60),
  role: z.string().max(60).optional(),
});

const testimonialsProps = z.object({
  eyebrow: z.string().max(80).optional(),
  title: z.string().min(1).max(80).optional(),
  items: z.array(item).min(1).max(8),
});

type TestimonialProps = z.infer<typeof testimonialsProps>;

export const testimonials: ComponentDefinition = {
  id: "testimonials",
  name: "Testimonials",
  category: "Content",
  description: "Client voices. Only generated from brief-provided quotes.",
  variants: {
    grid: {
      label: "Quote cards",
      description: "Responsive grid of quote cards.",
      schema: testimonialsProps,
      defaultProps: {},
    },
    spotlight: {
      label: "Spotlight quote",
      description: "A single large centered quote.",
      schema: testimonialsProps,
      defaultProps: {},
    },
  },
  render(rawProps, ctx) {
    const p = rawProps as TestimonialProps;

    if (ctx.variant === "spotlight") {
      const quote = p.items[0];
      return (
        <Container style={{ maxWidth: "52rem" }}>
          <div style={{ textAlign: "center" }}>
            {p.eyebrow && (
              <p
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 600,
                  fontSize: "var(--text-label)",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--color-accent)",
                  margin: 0,
                }}
              >
                {ET(ctx, "eyebrow", p.eyebrow)}
              </p>
            )}
            <p
              aria-hidden
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-h2)",
                color: "var(--color-accent)",
                lineHeight: 1,
                margin: "1.5rem 0 0",
              }}
            >
              &ldquo;
            </p>
            <blockquote style={{ margin: "0.5rem 0 0" }}>
              <p
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: "var(--font-display-weight)",
                  fontSize: "calc(var(--text-h2) * 1.05)",
                  lineHeight: 1.32,
                  letterSpacing: "-0.02em",
                  margin: 0,
                }}
              >
                {ET(ctx, `items.0.quote`, quote.quote)}
              </p>
              <footer style={{ marginTop: "1.75rem" }}>
                <p
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 600,
                    fontSize: "calc(var(--text-body) * 0.95)",
                    margin: 0,
                  }}
                >
                  {ET(ctx, `items.0.name`, quote.name)}
                </p>
                {quote.role && (
                  <p
                    style={{
                      color: "var(--color-muted)",
                      fontSize: "var(--text-label)",
                      margin: "0.25rem 0 0",
                    }}
                  >
                    {ET(ctx, `items.0.role`, quote.role)}
                  </p>
                )}
              </footer>
            </blockquote>
          </div>
        </Container>
      );
    }

    return (
      <Container>
        <SectionHeader ctx={ctx} eyebrow={p.eyebrow} title={p.title} />
        <div className="orbita-grid-auto" style={{ ["--columns" as string]: Math.min(p.items.length, 3) }}>
          {p.items.map((quote, i) => (
            <Card key={i} style={{ padding: "1.75rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <p
                style={{
                  margin: 0,
                  fontSize: "calc(var(--text-body) * 1.02)",
                  lineHeight: 1.65,
                }}
              >
                <span aria-hidden style={{ color: "var(--color-accent)" }}>
                  &ldquo;
                </span>
                {ET(ctx, `items.${i}.quote`, quote.quote)}
                <span aria-hidden style={{ color: "var(--color-accent)" }}>
                  &rdquo;
                </span>
              </p>
              <div>
                <p
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 600,
                    fontSize: "calc(var(--text-body) * 0.95)",
                    margin: 0,
                  }}
                >
                  {ET(ctx, `items.${i}.name`, quote.name)}
                </p>
                {quote.role && (
                  <p style={{ color: "var(--color-muted)", fontSize: "var(--text-label)", margin: "0.25rem 0 0" }}>
                    {ET(ctx, `items.${i}.role`, quote.role)}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      </Container>
    );
  },
};
