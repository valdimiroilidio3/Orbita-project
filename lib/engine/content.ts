/**
 * ORBITA ENGINE — content generation (template-based, fact-grounded).
 *
 * Copy templates per language and industry. Every factual slot is filled
 * only from the brief. When a fact is missing, the section is dropped (when
 * it needs data) or the input is recorded in `missingInputs`. The generator
 * never invents clients, awards, metrics or testimonials.
 */
import type { ComponentType } from "@/lib/site-schema/catalog";
import type { LanguageType } from "@/lib/site-schema";
import type { Brief } from "./brief";
import { effectiveVariant, type Playbook, type SectionPlan } from "./playbooks";

export interface HasData {
  services: boolean;
  stats: boolean;
  projects: boolean;
  testimonials: boolean;
  process: boolean;
  faq: boolean;
  pricing: boolean;
  contact: boolean;
}

interface IndustryCopy {
  hero: { eyebrow: string; title: string; description: string };
  about: { title: string; p1: string; p2?: string };
  cta: { title: string; description: string; button: string };
  contact: { title: string; description: string };
  servicesTitle: string;
  projectsTitle: string;
  projectsNav: string;
  faqTitle: string;
  processTitle: string;
  testimonialsTitle: string;
  pricingTitle: string;
  footerDescription: string;
  homeNav: string;
  contactNav: string;
}

const PT: Record<string, IndustryCopy> = {
  construction: {
    hero: {
      eyebrow: "Construção · {location}",
      title: "Construímos com precisão. Entregamos no prazo.",
      description:
        "Do estudo do projeto à entrega das chaves, a {name} executa obra com equipas próprias, cronograma fechado e controlo total de qualidade.",
    },
    about: {
      title: "Obra sem surpresas",
      p1: "A {name} nasce de equipas que estão no canteiro todos os dias. Falamos a linguagem do projeto e a da obra, e traduzimos um ao outro.",
      p2: "Trabalhamos com orçamentos fechados, cronogramas realistas e um único ponto de contacto: o gestor de obra.",
    },
    cta: {
      title: "Tem um projeto para construir?",
      description: "Envie o programa de necessidades e receba uma proposta técnica com cronograma indicativo.",
      button: "Pedir orçamento",
    },
    contact: { title: "Fale connosco", description: "Resposta em menos de um dia útil." },
    servicesTitle: "O que fazemos",
    projectsTitle: "Obras recentes",
    projectsNav: "Obras",
    faqTitle: "Perguntas frequentes",
    processTitle: "Como trabalhamos",
    testimonialsTitle: "Quem já trabalhou connosco",
    pricingTitle: "Serviços",
    footerDescription: "Construção civil e reabilitação urbana.",
    homeNav: "Início",
    contactNav: "Contacto",
  },
  architecture: {
    hero: {
      eyebrow: "Arquitectura · {location}",
      title: "O lugar define a forma.",
      description:
        "A {name} projecta espaços com rigor estrutural e intenção. Do conceito ao detalhe executivo, cada decisão serve a luz, a medida e o uso.",
    },
    about: {
      title: "Estúdio",
      p1: "Trabalhamos em projetos de dimensão humana, com processos transparentes e documentação executiva completa.",
      p2: "Cada projeto começa no lugar: orientação, luz, vento e a forma como a gente o habita.",
    },
    cta: {
      title: "Quer projectar connosco?",
      description: "Conte-nos o terreno e o uso. Propomos um caminho e um investimento.",
      button: "Agendar conversa",
    },
    contact: { title: "Contacto", description: "Reuniões de projeto por marcação." },
    servicesTitle: "Disciplinas",
    projectsTitle: "Projetos",
    projectsNav: "Projetos",
    faqTitle: "Perguntas frequentes",
    processTitle: "Método",
    testimonialsTitle: "Referências",
    pricingTitle: "Serviços",
    footerDescription: "Estúdio de arquitectura.",
    homeNav: "Início",
    contactNav: "Contacto",
  },
  "real-estate": {
    hero: {
      eyebrow: "Imobiliário · {location}",
      title: "Escolher bem muda tudo.",
      description:
        "A {name} acompanha a compra, venda e gestão de imóveis com análise de mercado honesta, visitas organizadas e negociação próxima.",
    },
    about: {
      title: "A consultora",
      p1: "Acompanhamos o cliente do primeiro critério à escritura, com números abertos e sem pressão de fecho.",
      p2: "Cobrimos avaliação, comercialização e gestão de arrendamento.",
    },
    cta: {
      title: "Tem um imóvel ou um objetivo?",
      description: "Fale com um consultor e receba uma análise gratuita do seu caso.",
      button: "Falar com um consultor",
    },
    contact: { title: "Fale connosco", description: "Atendimento de segunda a sábado." },
    servicesTitle: "Serviços",
    projectsTitle: "Propriedades em destaque",
    projectsNav: "Propriedades",
    faqTitle: "Antes de comprar",
    processTitle: "Como acompanhamos",
    testimonialsTitle: "Clientes",
    pricingTitle: "Serviços",
    footerDescription: "Consultoria imobiliária.",
    homeNav: "Início",
    contactNav: "Contacto",
  },
  restaurant: {
    hero: {
      eyebrow: "Cozinha de brasa · {location}",
      title: "Fogo, tempo e ingredientes de confiança.",
      description:
        "A {name} assa ao carvão de forma lenta. Carta curta, produtos da estação e mesa posta com calma.",
    },
    about: {
      title: "A casa",
      p1: "Abrimos com o lume aceso desde cedo e fechamos quando a última brasa apaga. Servimos o que a estação dá e o que a feira nos traz.",
      p2: "A mesa é para estar — não para correr.",
    },
    cta: {
      title: "Reserve a sua mesa",
      description: "Reservas por telefone ou por mensagem, com confirmação no próprio dia.",
      button: "Reservar mesa",
    },
    contact: { title: "Reservas e contacto", description: "Para grupos, fale connosco com antecedência." },
    servicesTitle: "Serviços",
    projectsTitle: "Da brasa",
    projectsNav: "Carta",
    faqTitle: "Antes de vir",
    processTitle: "Na cozinha",
    testimonialsTitle: "Quem já sentou à nossa mesa",
    pricingTitle: "Menus",
    footerDescription: "Cozinha de brasa.",
    homeNav: "Início",
    contactNav: "Reservas",
  },
  retail: {
    hero: {
      eyebrow: "Loja · {location}",
      title: "Peças certas, sem exageros.",
      description:
        "A {name} seleciona produtos que duram e serve-os sem ruído: compra clara, troca simples e aconselhamento direto.",
    },
    about: {
      title: "A loja",
      p1: "Trabalhamos com poucos fornecedores, escolhemos em primeira mão e mantemos a loja enxuta e honesta.",
    },
    cta: {
      title: "Visite a loja ou fale connosco",
      description: "Ajudamos a escolher — mesmo que a compra acabe por ser online.",
      button: "Falar connosco",
    },
    contact: { title: "Contacto", description: "Atendimento presencial e online." },
    servicesTitle: "Departamentos",
    projectsTitle: "Destaque da estação",
    projectsNav: "Coleção",
    faqTitle: "Trocas e devoluções",
    processTitle: "Como trabalhamos",
    testimonialsTitle: "Clientes",
    pricingTitle: "Serviços",
    footerDescription: "Retail.",
    homeNav: "Início",
    contactNav: "Contacto",
  },
  fashion: {
    hero: {
      eyebrow: "Moda · {location}",
      title: "Coleções que se vestem para durar.",
      description:
        "A {name} desenha e produz coleções pequenas, com tecidos selecionados e acabamento de atelier.",
    },
    about: {
      title: "A marca",
      p1: "Desenhamos em torno de poucos modelos bem resolvidos, produzimos por lotes curtos e revisamos cada peça antes de a enviar.",
    },
    cta: {
      title: "Fale connosco",
      description: "Encomendas por medida e colaborações são analisadas caso a caso.",
      button: "Enviar mensagem",
    },
    contact: { title: "Contacto", description: "Resposta em dois dias úteis." },
    servicesTitle: "Serviços",
    projectsTitle: "Coleções",
    projectsNav: "Coleções",
    faqTitle: "Guia de tamanhos",
    processTitle: "Do desenho à peça",
    testimonialsTitle: "Quem veste",
    pricingTitle: "Serviços",
    footerDescription: "Moda.",
    homeNav: "Início",
    contactNav: "Contacto",
  },
  technology: {
    hero: {
      eyebrow: "Software · {location}",
      title: "Menos processo manual. Mais resultado.",
      description:
        "A {name} constrói software que simplifica a operação da sua equipa — do diagnóstico do fluxo à entrega e ao acompanhamento.",
    },
    about: {
      title: "Como pensamos",
      p1: "Começamos pelo processo, não pela ferramenta. Desenhamos o fluxo ideal, validamos com quem vai usá-lo e só então implementamos.",
      p2: "Entregamos por incrementos, com métricas acordadas desde o início.",
    },
    cta: {
      title: "Vamos falar do seu caso",
      description: "Uma conversa de 30 minutos, sem apresentação de slides.",
      button: "Agendar conversa",
    },
    contact: { title: "Fale connosco", description: "Respondemos em um dia útil." },
    servicesTitle: "Capacidades",
    projectsTitle: "Trabalho recente",
    projectsNav: "Trabalho",
    faqTitle: "Perguntas frequentes",
    processTitle: "Como entregamos",
    testimonialsTitle: "Clientes",
    pricingTitle: "Planos",
    footerDescription: "Software para operações.",
    homeNav: "Início",
    contactNav: "Contacto",
  },
  agency: {
    hero: {
      eyebrow: "Comunicação · {location}",
      title: "Ideia, sistema e execução.",
      description:
        "A {name} trata estratégia, conteúdo e produto digital como um só sistema — para que a marca fale a mesma língua em todos os pontos.",
    },
    about: {
      title: "A agência",
      p1: "Trabalhamos com poucas marcas por vez, para ir até ao fim do problema — e não até à primeira entrega.",
    },
    cta: {
      title: "Tem um projeto em mente?",
      description: "Conte o objetivo. Propomos o caminho e o investimento.",
      button: "Pedir proposta",
    },
    contact: { title: "Vamos falar", description: "Reunião inicial gratuita, 30 minutos." },
    servicesTitle: "Serviços",
    projectsTitle: "Trabalho recente",
    projectsNav: "Trabalho",
    faqTitle: "Dúvidas",
    processTitle: "Como trabalhamos",
    testimonialsTitle: "Clientes",
    pricingTitle: "Serviços",
    footerDescription: "Agência de comunicação.",
    homeNav: "Início",
    contactNav: "Contacto",
  },
  "professional-services": {
    hero: {
      eyebrow: "Serviços profissionais · {location}",
      title: "Clareza técnica, resultado medido.",
      description:
        "A {name} apoia a sua operação com processos auditáveis e recomendações que são possíveis de executar.",
    },
    about: {
      title: "O gabinete",
      p1: "Combina experiência setorial e rigor de método: cada intervenção tem escopo, prazos e indicadores acordados antes de começar.",
    },
    cta: {
      title: "Agende uma análise",
      description: "Avaliamos o cenário e propomos um plano com investimento claro.",
      button: "Agendar análise",
    },
    contact: { title: "Contacto", description: "Resposta em um dia útil." },
    servicesTitle: "Áreas",
    projectsTitle: "Casos",
    projectsNav: "Casos",
    faqTitle: "Perguntas frequentes",
    processTitle: "Como trabalhamos",
    testimonialsTitle: "Clientes",
    pricingTitle: "Serviços",
    footerDescription: "Serviços profissionais.",
    homeNav: "Início",
    contactNav: "Contacto",
  },
  health: {
    hero: {
      eyebrow: "Cuidados de saúde · {location}",
      title: "Cuidado próximo, com rigor.",
      description:
        "A {name} acompanha o seu tratamento com equipa estável, comunicação clara e plano personalizado para cada fase.",
    },
    about: {
      title: "A equipa",
      p1: "Trabalhamos em equipa e com continuidade: o mesmo responsável acompanha o seu caso do início ao fim.",
    },
    cta: {
      title: "Marque a sua consulta",
      description: "Atendimento presencial e por videoconsulta.",
      button: "Marcar consulta",
    },
    contact: { title: "Contacto", description: "Telefone e formulário, de segunda a sexta." },
    servicesTitle: "Serviços",
    projectsTitle: "Instalação",
    projectsNav: "Clínica",
    faqTitle: "Antes da consulta",
    processTitle: "Como decorre a visita",
    testimonialsTitle: "Pacientes",
    pricingTitle: "Serviços",
    footerDescription: "Cuidados de saúde.",
    homeNav: "Início",
    contactNav: "Contacto",
  },
  travel: {
    hero: {
      eyebrow: "Viagens · {location}",
      title: "Roteiros à medida, sem fricção.",
      description:
        "A {name} desenha viagens à volta da sua rotina e dos seus interesses — do primeiro voo à última noite.",
    },
    about: {
      title: "Como viajamos",
      p1: "Planeamos com antecedência e viajamos com plano B. Cada proposta inclui tempos de viagem, custos e opções flexíveis.",
    },
    cta: {
      title: "Comece o seu plano",
      description: "Diga-nos datas, orçamento e estilo. Devolvemos uma proposta em cinco dias.",
      button: "Pedir proposta",
    },
    contact: { title: "Fale connosco", description: "Atendimento de segunda a sexta." },
    servicesTitle: "Tipos de viagem",
    projectsTitle: "Destinos recentes",
    projectsNav: "Destinos",
    faqTitle: "Antes de viajar",
    processTitle: "Como desenhamos",
    testimonialsTitle: "Viajantes",
    pricingTitle: "Pacotes",
    footerDescription: "Viagens à medida.",
    homeNav: "Início",
    contactNav: "Contacto",
  },
  other: {
    hero: {
      eyebrow: "{location}",
      title: "Feito a pensar em quem o usa.",
      description:
        "A {name} resolve um problema concreto com método, transparência e acompanhamento próximo.",
    },
    about: {
      title: "Quem somos",
      p1: "Trabalhamos em ciclos curtos, com entregas visíveis e comunicação direta. O cliente sabe sempre em que ponto está o trabalho.",
    },
    cta: {
      title: "Vamos falar",
      description: "Descreva o seu caso e receba uma resposta concreta.",
      button: "Falar connosco",
    },
    contact: { title: "Contacto", description: "Resposta em dois dias úteis." },
    servicesTitle: "O que fazemos",
    projectsTitle: "Trabalho",
    projectsNav: "Trabalho",
    faqTitle: "Dúvidas",
    processTitle: "Como trabalhamos",
    testimonialsTitle: "Depoimentos",
    pricingTitle: "Serviços",
    footerDescription: "",
    homeNav: "Início",
    contactNav: "Contacto",
  },
};

const EN: Record<string, IndustryCopy> = {
  construction: {
    hero: {
      eyebrow: "Construction · {location}",
      title: "Built with precision. Delivered on time.",
      description:
        "From project review to handover, {name} delivers construction with in-house teams, fixed schedules and full quality control.",
    },
    about: {
      title: "No surprises on site",
      p1: "{name} is built by teams that are on site every day. We speak both the language of the project and the language of the build.",
      p2: "We work with fixed budgets, realistic schedules and a single point of contact: the site manager.",
    },
    cta: {
      title: "Have a project to build?",
      description: "Send us your requirements and receive a technical proposal with an indicative schedule.",
      button: "Request a quote",
    },
    contact: { title: "Get in touch", description: "We reply within one business day." },
    servicesTitle: "What we do",
    projectsTitle: "Recent work",
    projectsNav: "Work",
    faqTitle: "Frequently asked questions",
    processTitle: "How we work",
    testimonialsTitle: "Who worked with us",
    pricingTitle: "Services",
    footerDescription: "Construction and urban renovation.",
    homeNav: "Home",
    contactNav: "Contact",
  },
  restaurant: {
    hero: {
      eyebrow: "Fire kitchen · {location}",
      title: "Fire, time and ingredients we trust.",
      description:
        "{name} cooks slowly over charcoal. A short menu, seasonal produce and a table set at an unhurried pace.",
    },
    about: {
      title: "The house",
      p1: "We open with the fire lit early and close when the last ember dies. We serve what the season gives and what the market brings.",
      p2: "The table is for staying — not for rushing.",
    },
    cta: {
      title: "Reserve your table",
      description: "Reservations by phone or message, confirmed on the day.",
      button: "Reserve a table",
    },
    contact: { title: "Reservations & contact", description: "For groups, please write ahead." },
    servicesTitle: "Services",
    projectsTitle: "From the fire",
    projectsNav: "Menu",
    faqTitle: "Before you come",
    processTitle: "In the kitchen",
    testimonialsTitle: "Who sat at our table",
    pricingTitle: "Menus",
    footerDescription: "Fire kitchen.",
    homeNav: "Home",
    contactNav: "Reservations",
  },
  technology: {
    hero: {
      eyebrow: "Software · {location}",
      title: "Less manual work. More results.",
      description:
        "{name} builds software that simplifies how your team operates — from process diagnosis to delivery and ongoing support.",
    },
    about: {
      title: "How we think",
      p1: "We start with the process, not the tool. We design the ideal flow, validate it with the people who will use it, and only then build it.",
      p2: "We ship in increments, with metrics agreed up front.",
    },
    cta: {
      title: "Let's talk about your case",
      description: "A 30-minute conversation, no slides.",
      button: "Book a call",
    },
    contact: { title: "Get in touch", description: "We reply within one business day." },
    servicesTitle: "Capabilities",
    projectsTitle: "Recent work",
    projectsNav: "Work",
    faqTitle: "Frequently asked questions",
    processTitle: "How we deliver",
    testimonialsTitle: "Clients",
    pricingTitle: "Plans",
    footerDescription: "Software for operations.",
    homeNav: "Home",
    contactNav: "Contact",
  },
  agency: {
    hero: {
      eyebrow: "Communication · {location}",
      title: "Idea, system and execution.",
      description:
        "{name} treats strategy, content and digital product as one system — so the brand speaks with one voice everywhere.",
    },
    about: {
      title: "The agency",
      p1: "We work with a few brands at a time, so we can take problems to the end — not just to the first delivery.",
    },
    cta: {
      title: "Have a project in mind?",
      description: "Tell us the objective. We'll propose the path and the investment.",
      button: "Request a proposal",
    },
    contact: { title: "Let's talk", description: "Free 30-minute intro call." },
    servicesTitle: "Services",
    projectsTitle: "Recent work",
    projectsNav: "Work",
    faqTitle: "Questions",
    processTitle: "How we work",
    testimonialsTitle: "Clients",
    pricingTitle: "Services",
    footerDescription: "Communication agency.",
    homeNav: "Home",
    contactNav: "Contact",
  },
  other: {
    hero: {
      eyebrow: "{location}",
      title: "Made for the people who use it.",
      description:
        "{name} solves a concrete problem with method, transparency and close follow-through.",
    },
    about: {
      title: "Who we are",
      p1: "We work in short cycles, with visible deliveries and direct communication. You always know where the work stands.",
    },
    cta: {
      title: "Let's talk",
      description: "Describe your case and get a concrete answer.",
      button: "Contact us",
    },
    contact: { title: "Contact", description: "We reply within two business days." },
    servicesTitle: "What we do",
    projectsTitle: "Work",
    projectsNav: "Work",
    faqTitle: "Questions",
    processTitle: "How we work",
    testimonialsTitle: "Testimonials",
    pricingTitle: "Services",
    footerDescription: "",
    homeNav: "Home",
    contactNav: "Contact",
  },
};

function resolveCopy(lang: LanguageType, industry: string): IndustryCopy {
  // pt-BR falls back to pt-PT copy for industries without a dedicated BR set
  if (lang === "pt-BR" || lang === "pt-PT") return PT[industry] ?? PT.other;
  return EN[industry] ?? EN.other;
}

function fill(template: string, brief: Brief): string {
  let out = template.replaceAll("{name}", brief.name);
  if (brief.location) {
    out = out.replace("· {location}", `· ${brief.location}`).replace("{location}", brief.location);
  } else {
    out = out.replace(" · {location}", "").replace("{location}", "").replace("· ", "·").trim();
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${cut.slice(0, space > 0 ? space : max).trimEnd()}…`;
}

function validAsset(ref: string | undefined, assetIds: ReadonlySet<string>): string | undefined {
  if (!ref) return undefined;
  if (ref.startsWith("asset:") && !assetIds.has(ref.slice(6))) return undefined;
  return ref;
}

export interface GeneratedContent {
  sections: Partial<Record<ComponentType, Record<string, unknown>>>;
  missingInputs: string[];
}

export function buildContent(
  brief: Brief,
  playbook: Playbook,
  plan: SectionPlan[],
  assetIds: ReadonlySet<string>,
): GeneratedContent {
  const copy = resolveCopy(brief.language, playbook.industry);
  const missing: string[] = [];
  const sections: GeneratedContent["sections"] = {};
  const isEn = brief.language === "en";

  const hasContact =
    !!brief.contact && Object.values(brief.contact).some((v) => Boolean(v && String(v).trim()));
  const contactPath = hasContact ? (isEn ? "/contact" : "/contacto") : "/";
  const hasContactPage = hasContact;

  if (!brief.description) missing.push("description");

  const heroImage = validAsset(brief.assets.hero, assetIds);
  if (!heroImage) missing.push("hero_image");
  sections.hero = {
    eyebrow: copy.hero.eyebrow.startsWith("{location}") && !brief.location ? undefined : fill(copy.hero.eyebrow, brief),
    title: copy.hero.title,
    description: brief.description ? truncate(brief.description, 320) : fill(copy.hero.description, brief),
    primaryCta: hasContactPage
      ? { label: copy.cta.button, pagePath: contactPath }
      : undefined,
    ...(heroImage ? { image: heroImage, imageAlt: brief.name } : {}),
  };

  const aboutImage = validAsset(brief.assets.about, assetIds);
  if (!brief.assets.about) missing.push("about_image");
  const aboutPlan = plan.find((p) => p.type === "about");
  // Must match the variant the page assembler will render (effectiveVariant),
  // otherwise props can violate the variant schema.
  const aboutVariant = aboutPlan ? effectiveVariant(aboutPlan, brief) : "statement";
  const aboutParagraphs = [fill(copy.about.p1, brief), ...(copy.about.p2 ? [fill(copy.about.p2, brief)] : [])];
  sections.about =
    aboutVariant === "statement"
      ? {
          eyebrow: copy.about.title,
          statement: brief.description
            ? truncate(brief.description, 280)
            : fill(copy.about.p1, brief),
        }
      : {
          eyebrow: copy.about.title,
          title: copy.about.title,
          paragraphs: aboutParagraphs,
          ...(aboutImage ? { image: aboutImage, imageAlt: brief.name } : {}),
        };

  if (brief.services.length > 0) {
    sections.services = {
      eyebrow: copy.servicesTitle,
      title: plan.find((p) => p.type === "services")?.variant === "list" ? undefined : copy.servicesTitle,
      items: brief.services.map((s) => ({
        title: s.name,
        description: s.description ?? "",
      })),
    };
  } else {
    missing.push("services");
  }

  if (brief.projects && brief.projects.length > 0) {
    sections.projects = {
      eyebrow: copy.projectsTitle,
      title: copy.projectsTitle,
      items: brief.projects.map((p) => ({
        title: p.title,
        ...(p.tag ? { tag: p.tag } : {}),
        ...(validAsset(p.imageRef, assetIds) ? { image: p.imageRef as string, alt: p.alt ?? p.title } : {}),
      })),
    };
  }

  if (brief.stats && brief.stats.length > 0) {
    sections.stats = { items: brief.stats.map((s) => ({ value: s.value, label: s.label })) };
  }

  if (brief.testimonials && brief.testimonials.length > 0) {
    const spotlight = plan.find((p) => p.type === "testimonials")?.variant === "spotlight";
    sections.testimonials = spotlight
      ? { eyebrow: copy.testimonialsTitle, items: brief.testimonials }
      : { eyebrow: copy.testimonialsTitle, title: copy.testimonialsTitle, items: brief.testimonials };
  }

  if (brief.processSteps && brief.processSteps.length > 0) {
    sections.process = {
      eyebrow: copy.processTitle,
      title: copy.processTitle,
      items: brief.processSteps.map((s) => ({ title: s.title, ...(s.description ? { description: s.description } : {}) })),
    };
  }

  if (brief.faq && brief.faq.length > 0) {
    sections.faq = { eyebrow: copy.faqTitle, title: copy.faqTitle, items: brief.faq.map((f) => ({ q: f.q, a: f.a })) };
  }

  if (brief.pricing && brief.pricing.length > 0) {
    sections.pricing = {
      eyebrow: copy.pricingTitle,
      title: copy.pricingTitle,
      items: brief.pricing.map((t) => ({
        name: t.name,
        price: t.price,
        ...(t.period ? { period: t.period } : {}),
        ...(t.description ? { description: t.description } : {}),
        features: t.features,
        ...(t.featured ? { featured: true } : {}),
        cta: { label: t.ctaLabel ?? copy.cta.button, pagePath: hasContactPage ? contactPath : "/" },
      })),
    };
  }

  const ctaImage = validAsset(brief.assets.cta, assetIds);
  sections.cta = {
    title: copy.cta.title,
    description: fill(copy.cta.description, brief),
    primaryCta: { label: copy.cta.button, pagePath: hasContactPage ? contactPath : "/" },
    ...(ctaImage ? { image: ctaImage, imageAlt: brief.name } : {}),
  };

  if (hasContact) {
    sections.contact = {
      eyebrow: copy.contact.title,
      title: copy.contact.title,
      description: copy.contact.description,
      ...(brief.contact?.email ? { email: brief.contact.email } : {}),
      ...(brief.contact?.phone ? { phone: brief.contact.phone } : {}),
      ...(brief.contact?.address ? { address: brief.contact.address } : {}),
      ...(brief.contact?.hours ? { hours: brief.contact.hours } : {}),
    };
  } else if (plan.some((p) => p.type === "contact")) {
    missing.push("contact");
  }

  sections.footer = {
    ...(copy.footerDescription ? { description: copy.footerDescription } : {}),
    ...(brief.contact?.email ? { email: brief.contact.email } : {}),
    ...(brief.contact?.phone ? { phone: brief.contact.phone } : {}),
    ...(brief.contact?.address ? { address: brief.contact.address } : {}),
  };

  return { sections, missingInputs: missing };
}
