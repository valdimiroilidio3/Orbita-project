/**
 * ORBITA ENGINE — generation brief (Zod-validated input for the pipeline).
 *
 * The brief is the ONLY factual source of generated content. Everything the
 * generator cannot ground in the brief is either omitted (sections that need
 * real data) or recorded in `metadata.missingInputs`. No fabrication.
 */
import { z } from "zod";
import { AssetRef, Goal, HexColor, Industry, Language, FontStackId } from "@/lib/site-schema";

export const BriefSchema = z.object({
  name: z.string().min(2).max(80),
  industry: Industry,
  goal: Goal.default("lead_generation"),
  language: Language.default("pt-PT"),
  description: z.string().max(600).optional(),
  location: z.string().max(120).optional(),
  audience: z.string().max(240).optional(),

  services: z
    .array(z.object({ name: z.string().min(1).max(60), description: z.string().max(300).optional() }))
    .max(12)
    .default([]),

  /** Only render if the business actually provides these numbers. */
  stats: z
    .array(z.object({ value: z.string().min(1).max(16), label: z.string().min(1).max(60) }))
    .max(8)
    .optional(),

  projects: z
    .array(
      z.object({
        title: z.string().min(1).max(80),
        tag: z.string().max(40).optional(),
        imageRef: AssetRef.optional(),
        alt: z.string().max(160).optional(),
      }),
    )
    .max(12)
    .optional(),

  testimonials: z
    .array(
      z.object({
        quote: z.string().min(1).max(400),
        name: z.string().min(1).max(60),
        role: z.string().max(60).optional(),
      }),
    )
    .max(8)
    .optional(),

  processSteps: z
    .array(z.object({ title: z.string().min(1).max(60), description: z.string().max(300).optional() }))
    .max(8)
    .optional(),

  faq: z
    .array(z.object({ q: z.string().min(1).max(160), a: z.string().min(1).max(600) }))
    .max(12)
    .optional(),

  pricing: z
    .array(
      z.object({
        name: z.string().min(1).max(40),
        price: z.string().min(1).max(40),
        period: z.string().max(20).optional(),
        description: z.string().max(200).optional(),
        features: z.array(z.string().min(1).max(80)).min(1).max(10),
        ctaLabel: z.string().max(40).optional(),
        featured: z.boolean().optional(),
      }),
    )
    .max(4)
    .optional(),

  contact: z
    .object({
      email: z.string().email().optional(),
      phone: z.string().max(40).optional(),
      address: z.string().max(160).optional(),
      hours: z.string().max(80).optional(),
    })
    .optional(),

  brand: z
    .object({
      primaryColor: HexColor.optional(),
      font: FontStackId.optional(),
      mode: z.enum(["light", "dark"]).optional(),
    })
    .optional(),

  assets: z
    .object({
      logo: AssetRef.optional(),
      hero: AssetRef.optional(),
      about: AssetRef.optional(),
      cta: AssetRef.optional(),
    })
    .default({}),
});

export type Brief = z.infer<typeof BriefSchema>;
