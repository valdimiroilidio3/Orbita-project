import { z } from "zod";
import type { ComponentDefinition } from "../types";
import { Container, Lead, SectionHeader, StepNumber } from "./ui";

const processProps = z.object({
  eyebrow: z.string().max(80).optional(),
  title: z.string().min(1).max(80).optional(),
  intro: z.string().max(300).optional(),
  items: z
    .array(z.object({ title: z.string().min(1).max(60), description: z.string().min(1).max(300).optional() }))
    .min(2)
    .max(8),
});

export const process: ComponentDefinition = {
  id: "process",
  name: "Process",
  category: "Content",
  description: "How the work gets done, step by step.",
  variants: {
    steps: {
      label: "Numbered steps",
      description: "Grid of numbered steps.",
      schema: processProps,
      defaultProps: {},
    },
  },
  render(rawProps) {
    const p = rawProps as z.infer<typeof processProps>;
    return (
      <Container>
        <SectionHeader eyebrow={p.eyebrow} title={p.title} intro={p.intro} />
        <div className="orbita-grid-auto" style={{ ["--columns" as string]: Math.min(p.items.length, 4) }}>
          {p.items.map((step, i) => (
            <div key={i} style={{ borderTop: "1px solid var(--color-border)", paddingBlock: "1.5rem" }}>
              <StepNumber n={i + 1} />
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: "var(--font-display-weight)",
                  fontSize: "calc(var(--text-body) * 1.08)",
                  letterSpacing: "-0.01em",
                  margin: "0.875rem 0 0",
                }}
              >
                {step.title}
              </h3>
              {step.description && (
                <Lead style={{ fontSize: "calc(var(--text-body) * 0.92)", marginTop: "0.625rem" }}>
                  {step.description}
                </Lead>
              )}
            </div>
          ))}
        </div>
      </Container>
    );
  },
};
