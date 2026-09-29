/**
 * ORBITA ENGINE — placeholder content for newly inserted sections.
 *
 * When the visual editor adds a section, required fields have to be filled
 * with honest placeholders ("Novo título", "Escreve aqui…") — never invented
 * company facts. The result is always passed through the variant's Zod
 * schema before it may enter the Site Schema.
 */
import type { z } from "zod";
import type { VariantDefinition } from "@/lib/registry/types";

function unwrap(schema: z.ZodTypeAny): z.ZodTypeAny {
  let s = schema;
  while (s._def.typeName === "ZodOptional" || s._def.typeName === "ZodDefault") {
    s = s._def.innerType ?? s._def.type;
  }
  return s;
}

function stringMax(schema: z.ZodTypeAny): number | undefined {
  const def = schema._def as { checks?: { kind: string; limit?: number }[] };
  return def.checks?.find((c) => c.kind === "max")?.limit;
}

/** Deterministic, obviously-placeholder text per field name (pt-PT). */
function textPlaceholder(name: string, max?: number): string {
  const n = name.toLowerCase();
  let text: string;
  if (n === "statement") text = "Escreve aqui a tua afirmação principal.";
  else if (n === "title") text = "Novo título de secção";
  else if (n === "eyebrow") text = "Subtítulo";
  else if (n === "q") text = "Nova pergunta";
  else if (n === "label") text = "Ver mais";
  else if (n === "price") text = "0 €";
  else if (n === "period") text = "mês";
  else if (n === "value") text = "0";
  else if (n === "pagepath" || n === "page_path") text = "/";
  else if (n === "signature") text = "Nome";
  else if (n === "email") text = "ola@exemplo.com";
  else if (n === "phone") text = "+351 210 000 000";
  else if (n === "address") text = "Rua Exemplo, 123";
  else if (n === "hours") text = "Seg–Sex, 9h–18h";
  else if (n === "description" || n === "intro" || n === "a" || n === "quote")
    text = "Escreve aqui o texto desta secção.";
  else if (n === "name") text = "Novo item";
  else text = "Novo texto";
  if (max && text.length > max) text = text.slice(0, max);
  return text;
}

function fill(schema: z.ZodTypeAny, name: string, existing: unknown): unknown {
  // Optional fields stay empty unless the variant already provides a value:
  // new sections carry the minimum required content, nothing more.
  if (
    schema._def.typeName === "ZodOptional" &&
    (existing === undefined || existing === null)
  ) {
    return undefined;
  }
  const s = unwrap(schema);
  switch (s._def.typeName) {
    case "ZodObject": {
      const obj = s as z.ZodObject<z.ZodRawShape>;
      const shape = obj.shape;
      const current = (existing && typeof existing === "object" ? existing : {}) as Record<
        string,
        unknown
      >;
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(shape)) {
        out[key] = fill(shape[key], key, current[key]);
      }
      return out;
    }
    case "ZodArray": {
      const elem = unwrap((s._def as { type: z.ZodTypeAny }).type);
      const rawMin = (s._def as { minLength?: number | { value?: number } }).minLength;
      const min =
        typeof rawMin === "number" ? rawMin : (rawMin?.value ?? 0);
      if (Array.isArray(existing)) {
        return existing.map((v) => fill(elem, name, v));
      }
      return Array.from({ length: min }, () => fill(elem, name, undefined));
    }
    case "ZodString": {
      if (typeof existing === "string" && existing.length > 0) return existing;
      const checks = (s._def as { checks?: { kind: string; regex?: RegExp }[] }).checks ?? [];
      if (checks.some((c) => c.kind === "regex" && /asset:/.test(c.regex?.source ?? ""))) {
        return undefined; // asset refs are chosen in the inspector, never invented
      }
      return textPlaceholder(name, stringMax(s));
    }
    case "ZodNumber":
      return typeof existing === "number" ? existing : 0;
    case "ZodBoolean":
      return typeof existing === "boolean" ? existing : false;
    case "ZodEnum": {
      const enumSchema = s as z.ZodEnum<[string, ...string[]]>;
      return typeof existing === "string" ? existing : enumSchema.options[0];
    }
    default:
      return existing;
  }
}

/**
 * Builds the initial props for a new section: variant defaults merged with
 * deterministic placeholders for every required field. Always validates
 * against the variant schema.
 */
export function placeholderProps(vdef: VariantDefinition): Record<string, unknown> {
  const filled = fill(vdef.schema, "root", { ...(vdef.defaultProps ?? {}) });
  const parsed = vdef.schema.safeParse(filled);
  if (!parsed.success) {
    throw new Error(
      `placeholders inválidos para ${vdef.label}: ${parsed.error.issues[0]?.message ?? "?"}`,
    );
  }
  return parsed.data as Record<string, unknown>;
}
