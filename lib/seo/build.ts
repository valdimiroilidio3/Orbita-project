/**
 * ORBITA ENGINE — SEO builder.
 * Real metadata + structured data derived from the Site Schema (no
 * fabricated scores, no invented facts).
 */
import type { PageType, SiteSchemaType } from "@/lib/site-schema";

function findContactProps(schema: SiteSchemaType): Record<string, unknown> {
  for (const page of schema.pages) {
    for (const section of page.sections) {
      if (section.type === "contact") return section.props as Record<string, unknown>;
    }
  }
  return {};
}

export function buildPageSeo(schema: SiteSchemaType, page: PageType) {
  const titleTemplate = schema.seo.titleTemplate ?? "{title} — {site}";
  const title = page.seo?.title
    ? titleTemplate.replaceAll("{title}", page.seo.title).replaceAll("{site}", schema.site.name)
    : schema.site.name;
  const description =
    page.seo?.description ??
    schema.seo.description ??
    [
      schema.site.name,
      schema.site.location,
      schema.site.industry === "other" ? "" : "site oficial",
    ]
      .filter(Boolean)
      .join(" — ");
  return { title, description: description.slice(0, 200), locale: schema.seo.locale };
}

export function buildStructuredData(schema: SiteSchemaType): Record<string, unknown> | null {
  const kind = schema.seo.structuredData ?? "organization";
  if (kind === "none") return null;

  const contact = findContactProps(schema);
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type":
      kind === "local-business"
        ? "LocalBusiness"
        : kind === "service"
          ? "ProfessionalService"
          : kind === "article"
            ? "WebSite"
            : "Organization",
    name: schema.site.name,
  };

  const email = contact.email ? String(contact.email) : undefined;
  const phone = contact.phone ? String(contact.phone) : undefined;
  const address = contact.address ? String(contact.address) : undefined;

  if (email) data.email = email;
  if (phone) data.telephone = phone;
  if (kind === "local-business") {
    if (address) data.address = { "@type": "PostalAddress", streetAddress: address };
    if (schema.site.location) data.areaServed = schema.site.location;
  }
  return data;
}
