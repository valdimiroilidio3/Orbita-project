/**
 * ORBITA ENGINE — component registry.
 * The page engine resolves every section against this map. There is no other
 * render path: arbitrary components cannot enter generated websites.
 */
import type { ComponentType } from "@/lib/site-schema/catalog";
import type { ComponentDefinition } from "./types";
import { navigation } from "./components/navigation";
import { hero } from "./components/hero";
import { about } from "./components/about";
import { services } from "./components/services";
import { projects } from "./components/projects";
import { stats } from "./components/stats";
import { testimonials } from "./components/testimonials";
import { process } from "./components/process";
import { faq } from "./components/faq";
import { pricing } from "./components/pricing";
import { contact } from "./components/contact";
import { cta } from "./components/cta";
import { footer } from "./components/footer";

export const registry: Map<ComponentType, ComponentDefinition> = new Map<
  ComponentType,
  ComponentDefinition
>([
  [navigation.id, navigation],
  [hero.id, hero],
  [about.id, about],
  [services.id, services],
  [projects.id, projects],
  [stats.id, stats],
  [testimonials.id, testimonials],
  [process.id, process],
  [faq.id, faq],
  [pricing.id, pricing],
  [contact.id, contact],
  [cta.id, cta],
  [footer.id, footer],
]);

export function getComponent(type: ComponentType): ComponentDefinition | undefined {
  return registry.get(type);
}

export function componentExists(type: string): type is ComponentType {
  return registry.has(type as ComponentType);
}

export type { ComponentDefinition, SectionRenderContext, VariantDefinition } from "./types";
