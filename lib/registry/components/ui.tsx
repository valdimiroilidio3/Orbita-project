/**
 * Shared primitives for site components.
 * Every visual value comes from CSS custom properties (design tokens).
 * No hardcoded colors or font sizes in this file.
 */
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import type { SectionRenderContext } from "../types";

type Ctx = SectionRenderContext;

// ---------------------------------------------------------------------------
// UI strings (site-facing, localized)
// ---------------------------------------------------------------------------

type UIStrings = {
  openMenu: string;
  closeMenu: string;
  sitemap: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  hours: string;
  name: string;
  message: string;
  send: string;
  sentTitle: string;
  sentBody: string;
  powered: string;
};

const STRINGS: Record<string, UIStrings> = {
  pt: {
    openMenu: "Abrir menu",
    closeMenu: "Fechar menu",
    sitemap: "Mapa do site",
    contact: "Contacto",
    email: "Email",
    phone: "Telefone",
    address: "Morada",
    hours: "Horário",
    name: "Nome",
    message: "Mensagem",
    send: "Enviar mensagem",
    sentTitle: "Mensagem enviada",
    sentBody: "Obrigado. Responderemos em breve.",
    powered: "Gerado com ORBITA ENGINE",
  },
  "pt-BR": {
    openMenu: "Abrir menu",
    closeMenu: "Fechar menu",
    sitemap: "Mapa do site",
    contact: "Contato",
    email: "Email",
    phone: "Telefone",
    address: "Endereço",
    hours: "Horário",
    name: "Nome",
    message: "Mensagem",
    send: "Enviar mensagem",
    sentTitle: "Mensagem enviada",
    sentBody: "Obrigado. Responderemos em breve.",
    powered: "Gerado com ORBITA ENGINE",
  },
  en: {
    openMenu: "Open menu",
    closeMenu: "Close menu",
    sitemap: "Sitemap",
    contact: "Contact",
    email: "Email",
    phone: "Phone",
    address: "Address",
    hours: "Hours",
    name: "Name",
    message: "Message",
    send: "Send message",
    sentTitle: "Message sent",
    sentBody: "Thanks — we'll get back to you shortly.",
    powered: "Generated with ORBITA ENGINE",
  },
};

export function uiStrings(ctx: Ctx): UIStrings {
  const lang = ctx.site.language;
  if (lang === "pt-BR") return STRINGS["pt-BR"];
  if (lang === "pt-PT") return STRINGS.pt;
  return STRINGS.en;
}

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export function Container({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={cn("orbita-container", className)} style={style}>
      {children}
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        fontFamily: "var(--font-display)",
        fontWeight: 600,
        fontSize: "var(--text-label)",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--color-accent)",
        margin: 0,
        lineHeight: 1.4,
      }}
    >
      {children}
    </p>
  );
}

export function Heading({
  level = 2,
  children,
  className,
  style,
}: {
  level?: 1 | 2 | 3;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const Tag = (level === 1 ? "h1" : level === 2 ? "h2" : "h3") as "h1" | "h2" | "h3";
  const size =
    level === 1 ? "var(--text-h1)" : level === 2 ? "var(--text-h2)" : "var(--text-h3)";
  return (
    <Tag
      className={className}
      style={{
        fontFamily: "var(--font-display)",
        fontWeight: "var(--font-display-weight)",
        fontSize: size,
        lineHeight: level === 1 ? 1.05 : 1.18,
        letterSpacing: "-0.02em",
        margin: 0,
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}

export function Lead({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <p
      className={className}
      style={{
        color: "var(--color-muted)",
        fontSize: "var(--text-body)",
        lineHeight: 1.7,
        margin: 0,
        ...style,
      }}
    >
      {children}
    </p>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  intro,
  style,
}: {
  eyebrow?: string;
  title?: string;
  intro?: string;
  style?: CSSProperties;
}) {
  if (!eyebrow && !title && !intro) return null;
  return (
    <div style={{ marginBottom: "3rem", ...style }}>
      {eyebrow && (
        <div style={{ marginBottom: "1rem" }}>
          <Eyebrow>{eyebrow}</Eyebrow>
        </div>
      )}
      {title && <Heading level={2}>{title}</Heading>}
      {intro && (
        <Lead
          style={{
            maxWidth: 560,
            marginTop: title ? "1rem" : undefined,
          }}
        >
          {intro}
        </Lead>
      )}
    </div>
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
  size,
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "outline" | "ghost" | "invert";
  size?: "sm";
  className?: string;
}) {
  return (
    <a
      href={href}
      className={cn("orbita-btn", `orbita-btn-${variant}`, size === "sm" && "orbita-btn-sm", className)}
    >
      {children}
    </a>
  );
}

export function Card({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Image with deterministic overlay tint derived from the theme background. */
export function ImageFrame({
  ctx,
  src,
  alt,
  className,
  style,
  imgStyle,
  eager = false,
  overlay = true,
}: {
  ctx: Ctx;
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  imgStyle?: CSSProperties;
  eager?: boolean;
  overlay?: boolean;
}) {
  return (
    <div
      className={className}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "var(--radius-lg)",
        background: "var(--color-surface)",
        ...style,
      }}
    >
      <img
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          ...imgStyle,
        }}
      />
      {overlay && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: `color-mix(in srgb, ${ctx.theme.colors.background} calc(var(--overlay-opacity) * 100%), transparent)`,
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}

/** Deterministic placeholder when a section has no image: monogram tile. */
export function ImagePlaceholder({ label, style }: { label: string; style?: CSSProperties }) {
  return (
    <div
      aria-hidden
      style={{
        aspectRatio: "4 / 3",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: "var(--text-h2)",
          color: "var(--color-muted)",
          letterSpacing: "-0.03em",
          opacity: 0.6,
        }}
      >
        {label.slice(0, 1).toUpperCase()}
      </span>
    </div>
  );
}

export function StepNumber({ n }: { n: number }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-display)",
        fontWeight: 600,
        fontSize: "var(--text-label)",
        color: "var(--color-accent)",
        letterSpacing: "0.08em",
      }}
    >
      {String(n).padStart(2, "0")}
    </span>
  );
}

export function CheckIcon({ color }: { color?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? "var(--color-success)"}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
