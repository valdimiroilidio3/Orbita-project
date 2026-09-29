/**
 * ORBITA ENGINE — inspector field descriptors.
 *
 * Walks a registry variant's Zod schema into a plain, serializable field
 * descriptor list so the client inspector can render a form per section
 * without reimplementing knowledge of the schema.
 */
import type { z } from "zod";

export type FieldDescriptor = {
  name: string;
  label: string;
  kind: "text" | "textarea" | "number" | "boolean" | "color" | "asset" | "select" | "lines" | "list" | "object" | "cta";
  required: boolean;
  options?: { value: string; label: string }[];
  item?: FieldDescriptor[];
};

function humanLabel(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (ch) => ch.toUpperCase())
    .trim();
}

function isOptional(schema: z.ZodTypeAny): boolean {
  return schema._def.typeName === "ZodOptional";
}

function unwrap(schema: z.ZodTypeAny): z.ZodTypeAny {
  let s = schema;
  while (s._def.typeName === "ZodOptional" || s._def.typeName === "ZodDefault") {
    s = s._def.innerType ?? s._def.type;
  }
  return s;
}

function describe(schema: z.ZodTypeAny, name: string): FieldDescriptor {
  const optional = isOptional(schema);
  const s = unwrap(schema);
  const required = !optional && s._def.typeName !== "ZodDefault";
  const base = { name, label: humanLabel(name), required };

  switch (s._def.typeName) {
    case "ZodString": {
      const def = s._def as { checks?: { kind: string; regex?: RegExp; limit?: number }[] };
      const checks = def.checks ?? [];
      if (checks.some((c) => c.kind === "email")) return { ...base, kind: "text" };
      if (checks.some((c) => c.kind === "regex" && /asset:/.test(c.regex?.source ?? ""))) {
        return { ...base, kind: "asset" };
      }
      if (checks.some((c) => c.kind === "regex" && c.regex?.source.startsWith("^#"))) {
        return { ...base, kind: "color" };
      }
      const max = checks.find((c) => c.kind === "max")?.limit;
      return { ...base, kind: max && max > 120 ? "textarea" : "text" };
    }
    case "ZodNumber":
      return { ...base, kind: "number" };
    case "ZodBoolean":
      return { ...base, kind: "boolean" };
    case "ZodEnum": {
      const enumSchema = s as z.ZodEnum<[string, ...string[]]>;
      return {
        ...base,
        kind: "select",
        options: enumSchema.options.map((v) => ({ value: v, label: v })),
      };
    }
    case "ZodUnion": {
      const options = s._def.options as z.ZodTypeAny[];
      const hasAsset = options.some((o) =>
        (o._def.typeName === "ZodString" ? (o._def as { checks?: { kind: string; regex?: RegExp }[] }).checks ?? [] : [])
          .some((c) => c.kind === "regex" && /asset:/.test(c.regex?.source ?? "")),
      );
      if (hasAsset) return { ...base, kind: "asset" };
      return { ...base, kind: "text" };
    }
    case "ZodArray": {
      const elem = unwrap((s._def as { type: z.ZodTypeAny }).type);
      if (elem._def.typeName === "ZodObject") {
        return { ...base, kind: "list", item: describeObject(elem as z.ZodObject<z.ZodRawShape>) };
      }
      return { ...base, kind: "lines" };
    }
    case "ZodObject": {
      const obj = s as z.ZodObject<z.ZodRawShape>;
      const keys = Object.keys(obj.shape);
      if (keys.length === 2 && keys.includes("label") && keys.includes("pagePath")) {
        return { ...base, kind: "cta" };
      }
      return { ...base, kind: "object", item: describeObject(obj) };
    }
    default:
      return { ...base, kind: "text" };
  }
}

function describeObject(schema: z.ZodObject<z.ZodRawShape>): FieldDescriptor[] {
  const shape = schema.shape;
  return Object.keys(shape).map((key) => describe(shape[key], key));
}

export function describeVariantSchema(schema: z.ZodTypeAny): FieldDescriptor[] {
  const s = unwrap(schema);
  if (s._def.typeName !== "ZodObject") return [];
  return describeObject(s as z.ZodObject<z.ZodRawShape>);
}
