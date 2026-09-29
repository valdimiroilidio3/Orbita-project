import { z } from "zod";
import { AssetRef } from "@/lib/site-schema";
import type { ComponentDefinition } from "../types";
import { ET } from "../editable";
import { Card, Container, ImageFrame, ImagePlaceholder, Lead, SectionHeader } from "./ui";
import type { SectionRenderContext } from "../types";

const projectItem = z.object({
  title: z.string().min(1).max(80),
  tag: z.string().max(40).optional(),
  image: AssetRef.optional(),
  alt: z.string().max(160).optional(),
});

const projectsProps = z.object({
  eyebrow: z.string().max(80).optional(),
  title: z.string().min(1).max(80).optional(),
  intro: z.string().max(300).optional(),
  items: z.array(projectItem).min(1).max(12),
});

function ProjectMeta({ ctx, index, item }: { ctx: SectionRenderContext; index: number; item: z.infer<typeof projectItem> }) {
  return (
    <div style={{ padding: "1rem 0 0" }}>
      <h3
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: "var(--font-display-weight)",
          fontSize: "calc(var(--text-body) * 1.05)",
          letterSpacing: "-0.01em",
          margin: 0,
        }}
      >
        {ET(ctx, `items.${index}.title`, item.title)}
      </h3>
      {item.tag && (
        <p
          style={{
            color: "var(--color-muted)",
            fontSize: "var(--text-label)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            margin: "0.375rem 0 0",
          }}
        >
          {ET(ctx, `items.${index}.tag`, item.tag)}
        </p>
      )}
    </div>
  );
}

export const projects: ComponentDefinition = {
  id: "projects",
  name: "Projects",
  category: "Content",
  description: "Portfolio / case studies / featured work.",
  variants: {
    grid: {
      label: "Image grid",
      description: "Responsive grid of project cards.",
      schema: projectsProps,
      defaultProps: {},
    },
    featured: {
      label: "Featured + grid",
      description: "One large featured project, the rest in a grid.",
      schema: projectsProps,
      defaultProps: {},
    },
  },
  render(rawProps, ctx) {
    const p = rawProps as z.infer<typeof projectsProps>;
    const [first, ...rest] = p.items;

    if (ctx.variant === "featured") {
      return (
        <Container>
          <SectionHeader ctx={ctx} eyebrow={p.eyebrow} title={p.title} intro={p.intro} />
          <div style={{ marginBottom: "1.5rem" }}>
            {first.image ? (
              <ImageFrame
                ctx={ctx}
                src={ctx.assetUrl(first.image)}
                alt={first.alt ?? first.title}
                className="orbita-featured-img"
              />
            ) : (
              <ImagePlaceholder label={first.title} style={{ aspectRatio: "21 / 9" }} />
            )}
            <div style={{ maxWidth: 520, marginTop: "1.25rem" }}>
              <ProjectMeta ctx={ctx} index={0} item={first} />
            </div>
          </div>
          {rest.length > 0 && (
            <div className="orbita-grid-auto" style={{ ["--columns" as string]: 3 }}>
              {rest.map((item, i) => (
                <Card key={i}>
                  {item.image ? (
                    <ImageFrame ctx={ctx} src={ctx.assetUrl(item.image)} alt={item.alt ?? item.title} style={{ borderRadius: "var(--radius-md)" }} />
                  ) : (
                    <ImagePlaceholder label={item.title} style={{ borderRadius: "var(--radius-md)" }} />
                  )}
                  <div style={{ padding: "0 1rem 1rem" }}>
                    <ProjectMeta ctx={ctx} index={i + 1} item={item} />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Container>
      );
    }

    return (
      <Container>
        <SectionHeader ctx={ctx} eyebrow={p.eyebrow} title={p.title} intro={p.intro} />
        <div className="orbita-grid-auto" style={{ ["--columns" as string]: 3 }}>
          {p.items.map((item, i) => (
            <Card key={i}>
              {item.image ? (
                <ImageFrame ctx={ctx} src={ctx.assetUrl(item.image)} alt={item.alt ?? item.title} style={{ borderRadius: "var(--radius-md)" }} />
              ) : (
                <ImagePlaceholder label={item.title} style={{ borderRadius: "var(--radius-md)" }} />
              )}
              <div style={{ padding: "0 1rem 1rem" }}>
                <ProjectMeta ctx={ctx} index={i} item={item} />
              </div>
            </Card>
          ))}
        </div>
      </Container>
    );
  },
};
