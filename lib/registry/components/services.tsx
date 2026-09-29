import { z } from "zod";
import type { ComponentDefinition } from "../types";
import { ET } from "../editable";
import { Card, Container, Lead, SectionHeader, StepNumber } from "./ui";

const servicesProps = z.object({
  eyebrow: z.string().max(80).optional(),
  title: z.string().min(1).max(80).optional(),
  intro: z.string().max(300).optional(),
  items: z
    .array(z.object({ title: z.string().min(1).max(60), description: z.string().min(1).max(300) }))
    .min(1)
    .max(12),
});

export const services: ComponentDefinition = {
  id: "services",
  name: "Services",
  category: "Content",
  description: "What the business does.",
  variants: {
    grid: {
      label: "Card grid",
      description: "Responsive grid of service cards.",
      schema: servicesProps,
      defaultProps: {},
    },
    list: {
      label: "Numbered list",
      description: "Editorial numbered rows.",
      schema: servicesProps,
      defaultProps: {},
    },
  },
  render(rawProps, ctx) {
    const p = rawProps as z.infer<typeof servicesProps>;

    if (ctx.variant === "list") {
      return (
        <Container>
          <SectionHeader ctx={ctx} eyebrow={p.eyebrow} title={p.title} intro={p.intro} />
          <div style={{ borderTop: "1px solid var(--color-border)" }}>
            {p.items.map((item, i) => (
              <div key={i} className="orbita-services-row">
                <StepNumber n={i + 1} />
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: "var(--font-display-weight)",
                    fontSize: "calc(var(--text-body) * 1.1)",
                    letterSpacing: "-0.01em",
                    margin: 0,
                  }}
                >
                  {ET(ctx, `items.${i}.title`, item.title)}
                </h3>
                <Lead style={{ fontSize: "calc(var(--text-body) * 0.95)" }}>{ET(ctx, `items.${i}.description`, item.description)}</Lead>
              </div>
            ))}
          </div>
        </Container>
      );
    }

    return (
      <Container>
        <SectionHeader ctx={ctx} eyebrow={p.eyebrow} title={p.title} intro={p.intro} />
        <div className="orbita-grid-auto" style={{ ["--columns" as string]: 3 }}>
          {p.items.map((item, i) => (
            <Card key={i} style={{ padding: "1.75rem" }}>
              <StepNumber n={i + 1} />
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: "var(--font-display-weight)",
                  fontSize: "calc(var(--text-body) * 1.12)",
                  letterSpacing: "-0.01em",
                  margin: "0.875rem 0 0",
                }}
              >
                {ET(ctx, `items.${i}.title`, item.title)}
              </h3>
              <Lead style={{ fontSize: "calc(var(--text-body) * 0.92)", marginTop: "0.625rem" }}>
                {ET(ctx, `items.${i}.description`, item.description)}
              </Lead>
            </Card>
          ))}
        </div>
      </Container>
    );
  },
};
