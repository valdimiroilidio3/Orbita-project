/**
 * ORBITA ENGINE — component registry contracts.
 *
 * A component is a closed, schema-validated, token-driven renderer. The
 * registry is the ONLY way the page engine turns Site Schema sections into
 * UI. Arbitrary AI-generated components can never enter the render path.
 */
import type { ReactNode } from "react";
import type { z } from "zod";
import type { ComponentType } from "@/lib/site-schema/catalog";
import type {
  AssetRefType,
  PageType,
  SiteMetaType,
  SiteSchemaType,
  ThemeType,
} from "@/lib/site-schema";

/** Payload used by the contact form's real server action. */
export type ContactPayload = {
  projectId: string;
  previewToken: string;
  /** path (with query) to return to after submission */
  returnTo: string;
};

export type SectionRenderContext = {
  schema: SiteSchemaType;
  site: SiteMetaType;
  theme: ThemeType;
  page: PageType;
  sectionId: string;
  variant: string;
  /** resolves a page path to a link href (preview-aware) */
  linkFor: (path: string) => string;
  /** resolves an AssetRef to a concrete URL */
  assetUrl: (ref: AssetRefType) => string;
  assetIds: ReadonlySet<string>;
  contactPayload: ContactPayload | null;
  contactSubmitted: boolean;
  contactError: boolean;
};

export type VariantDefinition = {
  label: string;
  description: string;
  /** Zod schema for the variant props — validated before render. */
  schema: z.ZodTypeAny;
  defaultProps: Record<string, unknown>;
};

export type ComponentDefinition = {
  id: ComponentType;
  name: string;
  category: string;
  description: string;
  variants: Record<string, VariantDefinition>;
  /**
   * Renders a section. `props` are already validated against
   * `variants[variant].schema`. Must consume design tokens only.
   */
  render: (props: Record<string, unknown>, ctx: SectionRenderContext) => ReactNode;
};
