"use client";

import { useState, type CSSProperties } from "react";
import { z } from "zod";
import type { ComponentDefinition } from "../types";
import { Container, LinkButton, uiStrings } from "./ui";

const navSchema = z.object({}).default({});

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export const navigation: ComponentDefinition = {
  id: "navigation",
  name: "Navigation",
  category: "Navigation",
  description:
    "Site-wide navigation bar. Rendered from the root navigation schema on every page; the style follows the theme (solid, translucent or minimal).",
  variants: {
    solid: {
      label: "Solid bar",
      description: "Opaque bar with a bottom border.",
      schema: navSchema,
      defaultProps: {},
    },
    translucent: {
      label: "Translucent bar",
      description: "Blurred, semi-transparent bar.",
      schema: navSchema,
      defaultProps: {},
    },
    minimal: {
      label: "Minimal",
      description: "Transparent bar that floats over the hero.",
      schema: navSchema,
      defaultProps: {},
    },
  },
  render(_props, ctx) {
    const t = uiStrings(ctx);
    const nav = ctx.schema.navigation;
    const style =
      ctx.variant === "minimal" ? "transparent" : ctx.variant === "translucent" ? "translucent" : "solid";
    const [open, setOpen] = useState(false);

    const barStyle: CSSProperties = {
      position: style === "transparent" ? "absolute" : "sticky",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 40,
      background:
        style === "solid"
          ? "var(--color-background)"
          : style === "translucent"
            ? "var(--nav-bg)"
            : "transparent",
      borderBottom: style === "solid" ? "1px solid var(--color-border)" : "1px solid transparent",
      backdropFilter: style === "translucent" ? "blur(14px)" : undefined,
    };

    const linkStyle: CSSProperties = {
      color: "var(--color-foreground)",
      opacity: 0.75,
      fontSize: "0.9rem",
      fontWeight: 500,
      textDecoration: "none",
    };

    return (
      <nav aria-label="Navegação principal" style={barStyle}>
        <Container className="flex items-center justify-between gap-6" style={{ height: style === "transparent" ? "4.5rem" : "4rem" }}>
          <a
            href={ctx.linkFor("/")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
              color: "var(--color-foreground)",
            }}
          >
            {nav.logo.assetRef ? (
              <img src={ctx.assetUrl(nav.logo.assetRef)} alt="" style={{ height: 26 }} />
            ) : null}
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "1.05rem",
                letterSpacing: "-0.01em",
              }}
            >
              {nav.logo.text}
            </span>
          </a>

          <div className="hidden md:flex" style={{ alignItems: "center", gap: "1.75rem" }}>
            {nav.links.map((l) => (
              <a key={l.pagePath} href={ctx.linkFor(l.pagePath)} className="orbita-nav-link" style={linkStyle}>
                {l.label}
              </a>
            ))}
            {nav.cta && (
              <LinkButton href={ctx.linkFor(nav.cta.pagePath)} variant="primary" size="sm">
                {nav.cta.label}
              </LinkButton>
            )}
          </div>

          <button
            type="button"
            aria-label={open ? t.closeMenu : t.openMenu}
            aria-expanded={open}
            className="md:hidden"
            onClick={() => setOpen((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--color-foreground)",
              padding: 8,
              cursor: "pointer",
            }}
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </Container>

        {open && (
          <div
            className="md:hidden"
            style={{
              background: "var(--color-background)",
              borderTop: "1px solid var(--color-border)",
            }}
          >
            <Container className="flex flex-col" style={{ gap: "1.25rem", paddingBlock: "1.5rem" }}>
              {nav.links.map((l) => (
                <a key={l.pagePath} href={ctx.linkFor(l.pagePath)} style={{ ...linkStyle, opacity: 1 }}>
                  {l.label}
                </a>
              ))}
              {nav.cta && (
                <LinkButton href={ctx.linkFor(nav.cta.pagePath)} variant="primary" size="sm">
                  {nav.cta.label}
                </LinkButton>
              )}
            </Container>
          </div>
        )}
      </nav>
    );
  },
};
