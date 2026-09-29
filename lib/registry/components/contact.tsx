import type { ReactNode } from "react";
import { z } from "zod";
import { submitContact } from "@/lib/server/contact";
import type { ComponentDefinition } from "../types";
import { CheckIcon, Container, Eyebrow, Heading, Lead, uiStrings } from "./ui";

const contactProps = z.object({
  eyebrow: z.string().max(80).optional(),
  title: z.string().min(1).max(80),
  description: z.string().max(300).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(40).optional(),
  address: z.string().max(160).optional(),
  hours: z.string().max(80).optional(),
});

function InfoList({ items }: { items: { label: string; value: string }[] }) {
  if (items.length === 0) return null;
  return (
    <dl style={{ margin: "2rem 0 0", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {items.map((it) => (
        <div key={it.label}>
          <dt
            style={{
              color: "var(--color-muted)",
              fontSize: "var(--text-label)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {it.label}
          </dt>
          <dd style={{ margin: "0.25rem 0 0", fontSize: "calc(var(--text-body) * 0.98)" }}>{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ContactForm({ payload, t }: { payload: NonNullable<import("../types").SectionRenderContext["contactPayload"]>; t: ReturnType<typeof uiStrings> }) {
  return (
    <form
      action={submitContact.bind(null, payload)}
      style={{ display: "grid", gap: "1.25rem", marginTop: "2rem" }}
    >
      <div>
        <label className="orbita-label" htmlFor={`${payload.projectId}-name`}>
          {t.name}
        </label>
        <input
          id={`${payload.projectId}-name`}
          name="name"
          type="text"
          required
          autoComplete="name"
          className="orbita-input"
        />
      </div>
      <div>
        <label className="orbita-label" htmlFor={`${payload.projectId}-email`}>
          {t.email}
        </label>
        <input
          id={`${payload.projectId}-email`}
          name="email"
          type="email"
          required
          autoComplete="email"
          className="orbita-input"
        />
      </div>
      <div>
        <label className="orbita-label" htmlFor={`${payload.projectId}-message`}>
          {t.message}
        </label>
        <textarea
          id={`${payload.projectId}-message`}
          name="message"
          rows={5}
          required
          className="orbita-input"
          style={{ resize: "vertical" }}
        />
      </div>
      <div>
        <button type="submit" className="orbita-btn orbita-btn-primary">
          {t.send}
        </button>
      </div>
    </form>
  );
}

function SuccessBanner({ t }: { t: ReturnType<typeof uiStrings> }) {
  return (
    <div
      role="status"
      style={{
        display: "flex",
        gap: "0.75rem",
        alignItems: "flex-start",
        border: "1px solid var(--color-success)",
        borderRadius: "var(--radius-md)",
        padding: "1rem 1.25rem",
        marginBottom: "2rem",
      }}
    >
      <CheckIcon />
      <div>
        <p style={{ fontFamily: "var(--font-display)", fontWeight: 600, margin: 0 }}>{t.sentTitle}</p>
        <p style={{ color: "var(--color-muted)", margin: "0.25rem 0 0", fontSize: "calc(var(--text-body) * 0.92)" }}>
          {t.sentBody}
        </p>
      </div>
    </div>
  );
}

export const contact: ComponentDefinition = {
  id: "contact",
  name: "Contact",
  category: "Conversion",
  description: "Contact info + real message form (stored server-side).",
  variants: {
    form: {
      label: "Form",
      description: "Centered message form with contact details.",
      schema: contactProps,
      defaultProps: {},
    },
    split: {
      label: "Info + form",
      description: "Contact details on one side, form on the other.",
      schema: contactProps,
      defaultProps: {},
    },
  },
  render(rawProps, ctx) {
    const p = rawProps as z.infer<typeof contactProps>;
    const t = uiStrings(ctx);
    const infoItems = [
      p.email ? { label: t.email, value: p.email } : null,
      p.phone ? { label: t.phone, value: p.phone } : null,
      p.address ? { label: t.address, value: p.address } : null,
      p.hours ? { label: t.hours, value: p.hours } : null,
    ].filter(Boolean) as { label: string; value: string }[];

    const header: ReactNode = (
      <>
        {p.eyebrow && (
          <div style={{ marginBottom: "1rem" }}>
            <Eyebrow>{p.eyebrow}</Eyebrow>
          </div>
        )}
        <Heading level={2}>{p.title}</Heading>
        {p.description && <Lead style={{ maxWidth: 520, marginTop: "1rem" }}>{p.description}</Lead>}
      </>
    );

    const success = ctx.contactSubmitted ? <SuccessBanner t={t} /> : null;
    const error = ctx.contactError ? (
      <p
        role="alert"
        style={{
          border: "1px solid var(--color-error)",
          borderRadius: "var(--radius-md)",
          padding: "0.875rem 1.25rem",
          marginBottom: "1.5rem",
          color: "var(--color-foreground)",
          fontSize: "calc(var(--text-body) * 0.92)",
        }}
      >
        Não foi possível enviar a mensagem. Verifique os dados e tente novamente.
      </p>
    ) : null;
    const form = ctx.contactPayload ? (
      <ContactForm payload={ctx.contactPayload} t={t} />
    ) : null;

    if (ctx.variant === "split") {
      return (
        <Container className="orbita-contact-split">
          <div>
            {header}
            <InfoList items={infoItems} />
          </div>
          <div>
            {success}
            {error}
            {form}
          </div>
        </Container>
      );
    }

    return (
      <Container style={{ maxWidth: "44rem" }}>
        {header}
        <InfoList items={infoItems} />
        {success}
        {error}
        {form}
      </Container>
    );
  },
};
