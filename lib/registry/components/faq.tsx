import { z } from "zod";
import type { ComponentDefinition } from "../types";
import { ET } from "../editable";
import { Container, Lead, SectionHeader } from "./ui";

const faqProps = z.object({
  eyebrow: z.string().max(80).optional(),
  title: z.string().min(1).max(80).optional(),
  items: z
    .array(z.object({ q: z.string().min(1).max(160), a: z.string().min(1).max(600) }))
    .min(1)
    .max(12),
});

function PlusIcon() {
  return (
    <svg
      className="orbita-faq-icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export const faq: ComponentDefinition = {
  id: "faq",
  name: "FAQ",
  category: "Content",
  description: "Frequently asked questions (native, accessible accordion).",
  variants: {
    accordion: {
      label: "Accordion",
      description: "Keyboard-accessible <details> accordion.",
      schema: faqProps,
      defaultProps: {},
    },
  },
  render(rawProps, ctx) {
    const p = rawProps as z.infer<typeof faqProps>;
    return (
      <Container style={{ maxWidth: "50rem" }}>
        <SectionHeader ctx={ctx} eyebrow={p.eyebrow} title={p.title} />
        <div style={{ borderTop: "1px solid var(--color-border)" }}>
          {p.items.map((entry, i) => (
            <details key={i} open={ctx.editMode ? true : undefined}>
              <summary
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "1rem",
                  paddingBlock: "1.25rem",
                  borderBottom: "1px solid var(--color-border)",
                  fontFamily: "var(--font-display)",
                  fontWeight: 500,
                  fontSize: "calc(var(--text-body) * 1.02)",
                  color: "var(--color-foreground)",
                }}
              >
                <span>{ET(ctx, `items.${i}.q`, entry.q)}</span>
                <PlusIcon />
              </summary>
              <Lead style={{ padding: "1.25rem 0", fontSize: "calc(var(--text-body) * 0.95)", maxWidth: "42rem" }}>
                {ET(ctx, `items.${i}.a`, entry.a)}
              </Lead>
            </details>
          ))}
        </div>
      </Container>
    );
  },
};
