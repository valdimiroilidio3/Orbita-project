/**
 * ORBITA ENGINE — seed.
 *
 * Creates the demo user/org and three projects:
 *  - MODUS (construction, Porto) → fully generated, ready
 *  - BRASA (restaurant, Lisbon)  → fully generated, ready
 *  - NEXA Labs (technology)      → draft with saved brief, ready for a
 *    real Generate click (so you can watch the pipeline run live)
 *
 * Idempotent: running it twice does not duplicate data.
 * Uses the same repo layer the app uses (no Prisma at runtime — ADR-003).
 */
import { randomUUID } from "node:crypto";
import {
  createAsset,
  createMembership,
  createOrganization,
  createProject,
  createUser,
  createVersion,
  getMembershipForUser,
  getUserByEmail,
  listProjects,
  updateProject,
} from "../lib/db";
import { hashPassword } from "../lib/server/password";
import { generateWebsite } from "../lib/engine/generator";
import { signPreviewToken } from "../lib/preview/token";
import type { Brief } from "../lib/engine/brief";

const DEMO_EMAIL = "demo@orbita.dev";
const DEMO_PASSWORD = "orbita-demo-2026";
const ORG_NAME = "Valdimiro Studio";

const MODUS_BRIEF: Brief = {
  name: "MODUS",
  industry: "construction",
  goal: "lead_generation",
  language: "pt-PT",
  description:
    "Empresa de construção civil e reabilitação com equipa própria, do projecto à entrega de chaves.",
  location: "Porto, Portugal",
  audience: "Proprietários de imóveis, promotores imobiliários e empresas que necessitam de obra",
  services: [
    { name: "Construção de raiz", description: "Moradias e edifícios, do projeto ao acabamento." },
    { name: "Reabilitação", description: "Renovação integral de casas e espaços comerciais." },
    { name: "Remodelações", description: "Cozinhas, casas de banho e interiores completos." },
    { name: "Consultoria de obra", description: "Acompanhamento técnico e gestão de empreitada." },
  ],
  stats: [
    { value: "240+", label: "Obras entregues" },
    { value: "18", label: "Anos de experiência" },
    { value: "32", label: "Técnicos e operários" },
  ],
  projects: [
    { title: "Moradia V. D. – Parede", tag: "Construção de raiz" },
    { title: "Reabilitação Loja Rua do Almada", tag: "Comercial" },
    { title: "Apartamento T3 – Campanhã", tag: "Remodelação" },
  ],
  testimonials: [
    {
      quote:
        "Entregaram a obra com duas semanas de antecedência e dentro do orçamento. Comunicação semanal sem surpresas.",
      name: "Marta S.",
      role: "Proprietária",
    },
  ],
  processSteps: [
    { title: "Visita e diagnóstico", description: "Análise in loco e levantamento de necessidades." },
    { title: "Proposta e projeto", description: "Orçamento fechado, cronograma e projeto de execução." },
    { title: "Obra", description: "Equipa própria, reporte fotográfico quinzenal." },
    { title: "Entrega", description: "Vistoria final, certificado de qualidade e garantia." },
  ],
  faq: [
    { q: "Trabalham fora do Porto?", a: "Sim — na região Norte e Centro, mediante dimensão da obra." },
    { q: "Dão garantia às obras?", a: "Sim, garantia legal de 5 anos nas obras de construção de raiz." },
  ],
  assets: {},
  contact: {
    email: "geral@modus-construcao.pt",
    phone: "+351 220 000 000",
    address: "Rua de São Brás 112, Porto",
    hours: "Seg–Sex, 8h–18h",
  },
  brand: { mode: "dark" },
};

const BRASA_BRIEF: Brief = {
  name: "BRASA",
  industry: "restaurant",
  goal: "sales",
  language: "pt-PT",
  description:
    "Restauração de churrasco e forno a lenha no coração de Lisboa. Produto de proximidade e brasa a carvão.",
  location: "Lisboa, Portugal",
  audience: "Famílias, grupos de amigos e jantares de negócio",
  services: [
    { name: "Carta da casa", description: "Peças de brasa, grelhados e cozinha de forno a lenha." },
    { name: "Meadas e partilhas", description: "Para duas a quatro pessoas, do corte ao acompanhamento." },
    { name: "Eventos privados", description: "Esplanada reservável para 12–60 pessoas." },
  ],
  stats: [
    { value: "4.8★", label: "Média em 900 avaliações" },
    { value: "35", label: "Mesas na esplanada" },
  ],
  testimonials: [
    {
      quote: "A melhor brasa da cidade, com serviço que faz o jantar durar o dobro do esperado.",
      name: "Jorge L.",
      role: "Cliente há 3 anos",
    },
  ],
  faq: [
    { q: "Há reservas online?", a: "Reservas pelo telefone ou na página de contacto, com 48h de antecedência." },
    { q: "Aceitam cartões?", a: "Sim — MB, VISA, MASTERCARD e Multibanco." },
  ],
  assets: {},
  contact: {
    email: "reservas@brasa-lisboa.pt",
    phone: "+351 213 333 333",
    address: "Rua da Rosa 48, Lisboa",
    hours: "Ter–Dom, 12h–15h e 19h–00h",
  },
  brand: { mode: "dark" },
};

const NEXA_BRIEF: Brief = {
  name: "NEXA Labs",
  industry: "technology",
  goal: "lead_generation",
  language: "pt-PT",
  description:
    "Estúdio de software especializado em produtos de dados para a indústria da energia.",
  audience: "CTOs e heads de engenharia de utilities e grid operators",
  services: [
    { name: "Plataformas de dados", description: "Ingestão, modelação e pipelines em produção." },
    { name: "Analytics em tempo real", description: "Dashboards operacionais com latência sub-segundo." },
    { name: "Consultoria", description: "Arquitetura de dados e modernização de sistemas legados." },
  ],
  assets: {},
  contact: {
    email: "hello@nexa-labs.dev",
    phone: "+351 912 000 000",
  },
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "project";
}

function registerSampleAssets(projectId: string, images: { file: string; alt: string }[]): string[] {
  const ids: string[] = [];
  for (const img of images) {
    const id = `a_${randomUUID().slice(0, 18)}`;
    const size = 0; // sample files are static; size not needed for rendering
    createAsset({
      id,
      projectId,
      kind: "image",
      url: `/sample/${img.file}`,
      filename: img.file,
      mimeType: "image/jpeg",
      sizeBytes: size,
      width: 1600,
      height: 900,
      alt: img.alt,
      metadata: { storagePath: `public/sample/${img.file}` },
    });
    ids.push(id);
  }
  return ids;
}

async function seedProject(
  orgId: string,
  brief: Brief,
  opts: { generate: boolean; images: { file: string; alt: string }[] },
): Promise<string | null> {
  const slug = slugify(brief.name);
  const existing = listProjects(orgId).find((p) => p.slug === slug);
  if (existing) {
    console.log(`  • ${brief.name} já existe — a saltar.`);
    return existing.id;
  }

  const id = randomUUID();
  createProject({
    id,
    organizationId: orgId,
    name: brief.name,
    slug,
    description: brief.description ?? null,
    status: "draft",
    previewToken: signPreviewToken(id),
  });
  const assetIds = registerSampleAssets(id, opts.images);

  // point the brief at the real asset rows so the asset:<id> path is exercised
  const briefWithAssets: Brief = {
    ...brief,
    assets: {
      hero: assetIds[0] ? `asset:${assetIds[0]}` : undefined,
      about: assetIds[1] ? `asset:${assetIds[1]}` : undefined,
    },
  };

  if (opts.generate) {
    const { schema, log } = await generateWebsite(briefWithAssets, { assetIds });
    updateProject(id, {
      schemaJson: schema,
      briefJson: briefWithAssets,
      generationLog: log,
      status: "ready",
    });
    createVersion({
      projectId: id,
      number: 1,
      schemaJson: schema,
      message: "Geração inicial",
      createdBy: "seed",
    });
    console.log(`  • ${brief.name} gerado (${log.length} steps, ready).`);
  } else {
    updateProject(id, { briefJson: briefWithAssets });
    console.log(`  • ${brief.name} em draft — pronto para gerar no hub.`);
  }
  return id;
}

async function main() {
  let user = getUserByEmail(DEMO_EMAIL);
  if (!user) {
    const passwordHash = await hashPassword(DEMO_PASSWORD);
    user = createUser({ email: DEMO_EMAIL, name: "Valdimiro", passwordHash });
    const org = createOrganization({ name: ORG_NAME, slug: "valdimiro-studio" });
    createMembership({ userId: user.id, organizationId: org.id, role: "owner" });
    console.log("✓ Demo user + organization criados.");
  } else {
    console.log("✓ Demo user já existia.");
  }

  const membership = getMembershipForUser(user!.id);
  if (!membership) throw new Error("Membership não encontrada após seed do utilizador.");
  const orgId = membership.organization.id;

  console.log("Seed de projetos:");
  await seedProject(orgId, MODUS_BRIEF, {
    generate: true,
    images: [
      { file: "modus/hero.jpg", alt: "Obra de construção com equipa MODUS" },
      { file: "modus/about.jpg", alt: "Interior reabilitado por MODUS" },
      { file: "modus/project-1.jpg", alt: "Moradia em Parede" },
      { file: "modus/project-2.jpg", alt: "Loja reabilitada" },
      { file: "modus/project-3.jpg", alt: "Apartamento remodelado" },
    ],
  });
  await seedProject(orgId, BRASA_BRIEF, {
    generate: true,
    images: [
      { file: "brasa/hero.jpg", alt: "Churrasco na brasa no restaurante BRASA" },
      { file: "brasa/about.jpg", alt: "Sala principal do BRASA" },
    ],
  });
  await seedProject(orgId, NEXA_BRIEF, { generate: false, images: [] });

  console.log("\nSeed concluído.");
  console.log(`Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main().catch((err) => {
  console.error("Seed falhou:", err);
  process.exit(1);
});
