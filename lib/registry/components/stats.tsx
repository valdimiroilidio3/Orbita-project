import { z } from "zod";
import type { ComponentDefinition } from "../types";
import { Container } from "./ui";

const statsProps = z.object({
  items: z
    .array(z.object({ value: z.string().min(1).max(16), label: z.string().min(1).max(60) }))
    .min(1)
    .max(8),
});

export const stats: ComponentDefinition = {
  id: "stats",
  name: "Stats",
  category: "Content",
  description: "Key numbers band. Only generated from brief-provided figures.",
  variants: {
    band: {
      label: "Numbers band",
      description: "Horizontal band of numbers with labels.",
      schema: statsProps,
      defaultProps: {},
    },
  },
  render(rawProps) {
    const p = rawProps as z.infer<typeof statsProps>;
    return (
      <Container>
        <div
          className="orbita-grid-stats"
          style={{
            borderBlock: "1px solid var(--color-border)",
            paddingBlock: "calc(var(--section-y) * 0.5)",
            ["--stats-cols" as string]: Math.min(p.items.length, 4),
          }}
        >
          {p.items.map((item, i) => (
            <div key={i}>
              <p
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: "var(--font-display-weight)",
                  fontSize: "var(--text-h2)",
                  letterSpacing: "-0.03em",
                  lineHeight: 1.1,
                  margin: 0,
                }}
              >
                {item.value}
              </p>
              <p
                style={{
                  color: "var(--color-muted)",
                  fontSize: "var(--text-label)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  margin: "0.625rem 0 0",
                }}
              >
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </Container>
    );
  },
};
