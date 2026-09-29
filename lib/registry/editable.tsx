import type { ReactNode } from "react";
import type { SectionRenderContext } from "./types";

/**
 * Inline-editable text slot.
 *
 * Outside the visual editor it renders the raw text — the generated site
 * DOM stays byte-identical. Inside the editor (`editMode`) it renders a
 * span carrying a stable data path into the section props, so the canvas
 * can bind double-click editing to the exact schema field — including
 * array/object paths such as `items.0.title` or `primaryCta.label`.
 */
export function ET(
  ctx: SectionRenderContext,
  path: string,
  text: string | undefined | null,
): ReactNode {
  if (!ctx.editMode) return text;
  if (text === undefined || text === null || text === "") return null;
  return (
    <span data-oe-prop={path} className="oe-slot">
      {text}
    </span>
  );
}
