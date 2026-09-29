"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createProjectAction, generateProjectAction, uploadAssetAction } from "@/lib/server/actions";
import { FONT_STACKS } from "@/lib/theme/tokens";
import { cn } from "@/lib/utils/cn";

const INDUSTRIES = [
  ["construction", "Construção"],
  ["architecture", "Arquitectura"],
  ["real-estate", "Imobiliário"],
  ["restaurant", "Restauração"],
  ["retail", "Retail"],
  ["fashion", "Moda"],
  ["technology", "Tecnologia"],
  ["agency", "Agência"],
  ["professional-services", "Serviços profissionais"],
  ["health", "Saúde"],
  ["travel", "Turismo"],
  ["other", "Outro"],
] as const;

const GOALS = [
  ["lead_generation", "Geração de leads"],
  ["sales", "Venda direta"],
  ["informational", "Informação / marca"],
  ["portfolio", "Portfólio"],
] as const;

const LANGUAGES = [
  ["pt-PT", "Português (Portugal)"],
  ["pt-BR", "Português (Brasil)"],
  ["en", "English"],
] as const;

const inputCls =
  "w-full rounded-md border border-line bg-panel px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent/60";
const labelCls = "mb-1.5 block text-xs font-medium text-ink-dim";

type AssetInfo = { id: string; url: string; filename: string; width: number | null; height: number | null };

type Row = { name: string; description: string };
type QARow = { q: string; a: string };
type StatRow = { value: string; label: string };
type QuoteRow = { quote: string; name: string; role: string };
type ProjectRow = { title: string; tag: string };
type StepRow = { title: string; description: string };

function Section({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <section className="rounded-lg border border-line bg-panel p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="font-sans text-sm font-semibold tracking-wide">{title}</h3>
        {hint && <span className="text-[11px] text-ink-faint">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

export default function ProjectWizard({ prefillIndustry }: { prefillIndustry?: string }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // brief state
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState<string>(
    prefillIndustry && INDUSTRIES.some(([id]) => id === prefillIndustry) ? prefillIndustry : "construction",
  );
  const [goal, setGoal] = useState<string>("lead_generation");
  const [language, setLanguage] = useState<string>("pt-PT");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [audience, setAudience] = useState("");
  const [services, setServices] = useState<Row[]>([]);
  const [stats, setStats] = useState<StatRow[]>([]);
  const [testimonials, setTestimonials] = useState<QuoteRow[]>([]);
  const [processSteps, setProcessSteps] = useState<StepRow[]>([]);
  const [faq, setFaq] = useState<QARow[]>([]);
  const [projectRows, setProjectRows] = useState<ProjectRow[]>([]);
  const [cEmail, setCEmail] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [cAddress, setCAddress] = useState("");
  const [cHours, setCHours] = useState("");

  // assets
  const [logo, setLogo] = useState<AssetInfo | null>(null);
  const [images, setImages] = useState<AssetInfo[]>([]);
  const [heroAsset, setHeroAsset] = useState("");
  const [aboutAsset, setAboutAsset] = useState("");

  // direction
  const [mode, setMode] = useState<string>("");
  const [font, setFont] = useState<string>("");
  const [primaryColor, setPrimaryColor] = useState("");

  const logoInput = useRef<HTMLInputElement>(null);
  const imagesInput = useRef<HTMLInputElement>(null);

  const stepCount = 3;

  async function handleContinue() {
    setError(null);
    if (name.trim().length < 2) {
      setError("Indica o nome do negócio (mín. 2 caracteres).");
      return;
    }
    if (!projectId) {
      setCreating(true);
      const fd = new FormData();
      fd.set("name", name.trim());
      fd.set("description", description.trim());
      const res = await createProjectAction(fd);
      setCreating(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setProjectId(res.projectId!);
    }
    setStep(2);
  }

  async function handleUpload(file: File, kind: "logo" | "image") {
    if (!projectId) return;
    setUploadError(null);
    setBusy(true);
    const fd = new FormData();
    fd.set("projectId", projectId);
    fd.set("kind", kind);
    fd.set("file", file);
    const res = await uploadAssetAction(fd);
    setBusy(false);
    if (res.ok && res.asset) {
      if (kind === "logo") setLogo(res.asset);
      else setImages((prev) => [...prev, res.asset!]);
    } else if (!res.ok) {
      setUploadError(res.error);
    }
  }

  function buildBrief() {
    const assetRef = (a: string) => {
      const found = images.find((i) => i.id === a);
      return found ? `asset:${found.id}` : undefined;
    };
    const brand: Record<string, unknown> = {};
    if (primaryColor) brand.primaryColor = primaryColor;
    if (font) brand.font = font;
    if (mode) brand.mode = mode;
    const contact: Record<string, unknown> = {};
    if (cEmail) contact.email = cEmail;
    if (cPhone) contact.phone = cPhone;
    if (cAddress) contact.address = cAddress;
    if (cHours) contact.hours = cHours;
    return {
      name: name.trim(),
      industry,
      goal,
      language,
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(location.trim() ? { location: location.trim() } : {}),
      ...(audience.trim() ? { audience: audience.trim() } : {}),
      services: services.filter((s) => s.name.trim()).map((s) => ({
        name: s.name.trim(),
        ...(s.description.trim() ? { description: s.description.trim() } : {}),
      })),
      ...(stats.length ? { stats: stats.filter((s) => s.value.trim() && s.label.trim()) } : {}),
      ...(testimonials.length
        ? {
            testimonials: testimonials
              .filter((t) => t.quote.trim() && t.name.trim())
              .map((t) => ({ quote: t.quote.trim(), name: t.name.trim(), ...(t.role.trim() ? { role: t.role.trim() } : {}) })),
          }
        : {}),
      ...(processSteps.length
        ? {
            processSteps: processSteps
              .filter((s) => s.title.trim())
              .map((s) => ({ title: s.title.trim(), ...(s.description.trim() ? { description: s.description.trim() } : {}) })),
          }
        : {}),
      ...(faq.length ? { faq: faq.filter((f) => f.q.trim() && f.a.trim()).map((f) => ({ q: f.q.trim(), a: f.a.trim() })) } : {}),
      ...(projectRows.length ? { projects: projectRows.filter((p) => p.title.trim()).map((p) => ({ title: p.title.trim(), ...(p.tag.trim() ? { tag: p.tag.trim() } : {}) })) } : {}),
      ...(Object.keys(contact).length ? { contact } : {}),
      ...(Object.keys(brand).length ? { brand } : {}),
      assets: {
        ...(logo ? { logo: `asset:${logo.id}` } : {}),
        ...(heroAsset ? { hero: assetRef(heroAsset) } : {}),
        ...(aboutAsset ? { about: assetRef(aboutAsset) } : {}),
      },
    };
  }

  async function handleGenerate() {
    if (!projectId) return;
    setError(null);
    setBusy(true);
    const fd = new FormData();
    fd.set("projectId", projectId);
    fd.set("brief", JSON.stringify(buildBrief()));
    const res = await generateProjectAction(fd);
    setBusy(false);
    if (res.ok) router.push(`/projects/${projectId}`);
    else setError(res.error);
  }

  const summary = useMemo(() => {
    const b = buildBrief();
    return {
      services: (b.services as unknown[]).length,
      contact: b.assets && Object.keys(b.assets).length,
      extras: [b.stats, b.testimonials, b.processSteps, b.faq, b.projects].filter(Boolean).length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, industry, description, services, stats, testimonials, processSteps, faq, projectRows, cEmail, cPhone, cAddress, cHours, logo, heroAsset, aboutAsset, images]);

  const stepper = (
    <ol className="flex items-center gap-2">
      {Array.from({ length: stepCount }, (_, i) => i + 1).map((n) => (
        <li key={n} className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full border font-sans text-xs",
              n < step
                ? "border-accent bg-accent text-base"
                : n === step
                  ? "border-accent text-accent"
                  : "border-line text-ink-faint",
            )}
          >
            {String(n).padStart(2, "0")}
          </span>
          <span className={cn("text-xs", n === step ? "text-ink" : "text-ink-faint")}>
            {n === 1 ? "Negócio" : n === 2 ? "Assets" : "Direção & geração"}
          </span>
          {n < stepCount && <span aria-hidden className="h-px w-8 bg-line" />}
        </li>
      ))}
    </ol>
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="font-sans text-3xl font-semibold tracking-tight">Novo projeto</h1>
        <p className="mt-2 text-sm text-ink-dim">
          Descreve o negócio. A engine interpreta o briefing, constrói o design system e gera o
          website completo — só com fatos que tu forneces.
        </p>
      </div>
      {stepper}

      {error && (
        <p role="alert" className="rounded-md border border-error/50 bg-error/10 px-4 py-3 text-sm">
          {error}
        </p>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-5">
          <Section title="Identificação">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="w-name">Nome do negócio *</label>
                <input id="w-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="MODUS" />
              </div>
              <div>
                <label className={labelCls} htmlFor="w-industry">Indústria</label>
                <select id="w-industry" className={inputCls} value={industry} onChange={(e) => setIndustry(e.target.value)}>
                  {INDUSTRIES.map(([id, label]) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="w-goal">Objetivo principal</label>
                <select id="w-goal" className={inputCls} value={goal} onChange={(e) => setGoal(e.target.value)}>
                  {GOALS.map(([id, label]) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="w-lang">Idioma do site</label>
                <select id="w-lang" className={inputCls} value={language} onChange={(e) => setLanguage(e.target.value)}>
                  {LANGUAGES.map(([id, label]) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls} htmlFor="w-desc">Descrição do negócio</label>
                <textarea id="w-desc" rows={3} className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="O que fazem, como, para quem…" />
              </div>
              <div>
                <label className={labelCls} htmlFor="w-loc">Localização</label>
                <input id="w-loc" className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Porto, Portugal" />
              </div>
              <div>
                <label className={labelCls} htmlFor="w-aud">Público-alvo</label>
                <input id="w-aud" className={inputCls} value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Promotores imobiliários, proprietários…" />
              </div>
            </div>
          </Section>

          <Section title="Serviços / o que fazem" hint="opcional, mas recomendado">
            {services.map((s, i) => (
              <div key={i} className="mb-3 grid gap-2 sm:grid-cols-2">
                <input
                  className={inputCls}
                  value={s.name}
                  onChange={(e) => setServices((prev) => prev.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                  placeholder="Nome do serviço"
                />
                <input
                  className={inputCls}
                  value={s.description}
                  onChange={(e) => setServices((prev) => prev.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))}
                  placeholder="Descrição curta"
                />
              </div>
            ))}
            <button type="button" onClick={() => setServices((p) => [...p, { name: "", description: "" }])} className="text-xs text-ink-dim hover:text-accent">
              + Adicionar serviço
            </button>
          </Section>

          <Section title="Contacto" hint="gera a página de contacto">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Email</label>
                <input className={inputCls} value={cEmail} onChange={(e) => setCEmail(e.target.value)} placeholder="geral@empresa.pt" />
              </div>
              <div>
                <label className={labelCls}>Telefone</label>
                <input className={inputCls} value={cPhone} onChange={(e) => setCPhone(e.target.value)} placeholder="+351 …" />
              </div>
              <div>
                <label className={labelCls}>Morada</label>
                <input className={inputCls} value={cAddress} onChange={(e) => setCAddress(e.target.value)} placeholder="Rua, cidade" />
              </div>
              <div>
                <label className={labelCls}>Horário</label>
                <input className={inputCls} value={cHours} onChange={(e) => setCHours(e.target.value)} placeholder="Seg–Sex, 8h–18h" />
              </div>
            </div>
          </Section>

          <details className="rounded-lg border border-line bg-panel p-5">
            <summary className="cursor-pointer font-sans text-sm font-semibold text-ink-dim hover:text-ink">
              Conteúdo extra (stats, projetos, testemunhos, FAQ, processo)
            </summary>
            <div className="mt-5 flex flex-col gap-5">
              <div>
                <p className="mb-2 text-xs font-medium text-ink-dim">Números (só se os tiveres reais)</p>
                {stats.map((s, i) => (
                  <div key={i} className="mb-2 grid gap-2 sm:grid-cols-2">
                    <input className={inputCls} value={s.value} onChange={(e) => setStats((p) => p.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} placeholder="120+" />
                    <input className={inputCls} value={s.label} onChange={(e) => setStats((p) => p.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="Obras entregues" />
                  </div>
                ))}
                <button type="button" onClick={() => setStats((p) => [...p, { value: "", label: "" }])} className="text-xs text-ink-dim hover:text-accent">+ Stat</button>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-ink-dim">Projetos / trabalho</p>
                {projectRows.map((s, i) => (
                  <div key={i} className="mb-2 grid gap-2 sm:grid-cols-2">
                    <input className={inputCls} value={s.title} onChange={(e) => setProjectRows((p) => p.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} placeholder="Título do projeto" />
                    <input className={inputCls} value={s.tag} onChange={(e) => setProjectRows((p) => p.map((x, j) => (j === i ? { ...x, tag: e.target.value } : x)))} placeholder="Categoria" />
                  </div>
                ))}
                <button type="button" onClick={() => setProjectRows((p) => [...p, { title: "", tag: "" }])} className="text-xs text-ink-dim hover:text-accent">+ Projeto</button>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-ink-dim">Testemunhos (reais)</p>
                {testimonials.map((s, i) => (
                  <div key={i} className="mb-2 grid gap-2">
                    <textarea rows={2} className={inputCls} value={s.quote} onChange={(e) => setTestimonials((p) => p.map((x, j) => (j === i ? { ...x, quote: e.target.value } : x)))} placeholder="Citação" />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input className={inputCls} value={s.name} onChange={(e) => setTestimonials((p) => p.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} placeholder="Nome" />
                      <input className={inputCls} value={s.role} onChange={(e) => setTestimonials((p) => p.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))} placeholder="Cargo / empresa" />
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => setTestimonials((p) => [...p, { quote: "", name: "", role: "" }])} className="text-xs text-ink-dim hover:text-accent">+ Testemunho</button>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-ink-dim">Processo (passos)</p>
                {processSteps.map((s, i) => (
                  <div key={i} className="mb-2 grid gap-2 sm:grid-cols-2">
                    <input className={inputCls} value={s.title} onChange={(e) => setProcessSteps((p) => p.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} placeholder="Título do passo" />
                    <input className={inputCls} value={s.description} onChange={(e) => setProcessSteps((p) => p.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} placeholder="Descrição" />
                  </div>
                ))}
                <button type="button" onClick={() => setProcessSteps((p) => [...p, { title: "", description: "" }])} className="text-xs text-ink-dim hover:text-accent">+ Passo</button>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-ink-dim">FAQ</p>
                {faq.map((s, i) => (
                  <div key={i} className="mb-2 grid gap-2">
                    <input className={inputCls} value={s.q} onChange={(e) => setFaq((p) => p.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))} placeholder="Pergunta" />
                    <textarea rows={2} className={inputCls} value={s.a} onChange={(e) => setFaq((p) => p.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} placeholder="Resposta" />
                  </div>
                ))}
                <button type="button" onClick={() => setFaq((p) => [...p, { q: "", a: "" }])} className="text-xs text-ink-dim hover:text-accent">+ Pergunta</button>
              </div>
            </div>
          </details>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleContinue}
              disabled={creating}
              className="rounded-md bg-accent px-5 py-2.5 font-sans text-sm font-semibold text-base transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {creating ? "A criar…" : "Continuar →"}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-5">
          <Section title="Logo" hint="opcional">
            <div className="flex items-center gap-4">
              {logo ? (
                <>
                  <img src={logo.url} alt="Logo" className="h-10 rounded border border-line bg-panel2 p-1" />
                  <span className="text-xs text-ink-dim">{logo.filename}</span>
                  <button type="button" onClick={() => setLogo(null)} className="text-xs text-ink-faint hover:text-ink">remover</button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => logoInput.current?.click()}
                  className="rounded-md border border-dashed border-line px-5 py-4 text-xs text-ink-dim hover:border-accent/50 hover:text-ink"
                >
                  {busy ? "A carregar…" : "Carregar logo (PNG, JPG, SVG, WEBP)"}
                </button>
              )}
              <input ref={logoInput} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "logo")} />
            </div>
          </Section>

          <Section title="Imagens" hint="hero, sobre, projetos — usadas onde têm sentido">
            <button
              type="button"
              onClick={() => imagesInput.current?.click()}
              className="rounded-md border border-dashed border-line px-5 py-4 text-xs text-ink-dim hover:border-accent/50 hover:text-ink"
            >
              {busy ? "A carregar…" : "+ Carregar imagens (até 4 MB cada)"}
            </button>
            <input ref={imagesInput} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { for (const f of Array.from(e.target.files ?? [])) void handleUpload(f, "image"); e.target.value = ""; }} />
            {images.length > 0 && (
              <ul className="mt-4 flex flex-col gap-2">
                {images.map((img) => (
                  <li key={img.id} className="flex items-center gap-3 rounded-md border border-line bg-panel2 px-3 py-2">
                    <img src={img.url} alt={img.filename} className="h-10 w-14 rounded object-cover" />
                    <span className="flex-1 truncate text-xs text-ink-dim">{img.filename}</span>
                    {img.width ? <span className="text-[10px] text-ink-faint">{img.width}×{img.height}</span> : null}
                    <label className="flex items-center gap-1 text-[11px] text-ink-dim">
                      <input type="radio" name="hero" checked={heroAsset === img.id} onChange={() => setHeroAsset(img.id)} />
                      hero
                    </label>
                    <label className="flex items-center gap-1 text-[11px] text-ink-dim">
                      <input type="radio" name="about" checked={aboutAsset === img.id} onChange={() => setAboutAsset(img.id)} />
                      sobre
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {uploadError && <p role="alert" className="rounded-md border border-error/50 bg-error/10 px-4 py-3 text-sm">{uploadError}</p>}

          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(1)} className="rounded-md border border-line px-5 py-2.5 font-sans text-sm text-ink-dim hover:text-ink">
              ← Voltar
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="rounded-md bg-accent px-5 py-2.5 font-sans text-sm font-semibold text-base transition-opacity hover:opacity-90"
            >
              Continuar →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-5">
          <Section title="Direção visual" hint="a engine propõe a partir da indústria; podes sobrepor">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className={labelCls}>Tema</label>
                <select className={inputCls} value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="">Automático</option>
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Tipografia</label>
                <select className={inputCls} value={font} onChange={(e) => setFont(e.target.value)}>
                  <option value="">Automático</option>
                  {Object.entries(FONT_STACKS).map(([id, stack]) => (
                    <option key={id} value={id}>{stack.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Cor de marca</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={primaryColor || "#D96C2C"} onChange={(e) => setPrimaryColor(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-line bg-panel" />
                  <button type="button" onClick={() => setPrimaryColor("")} className="text-xs text-ink-faint hover:text-ink">
                    {primaryColor ? "remover" : "automática"}
                  </button>
                </div>
              </div>
            </div>
          </Section>

          <Section title="Resumo do briefing">
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-4"><dt className="text-ink-faint">Negócio</dt><dd className="text-right">{name || "—"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink-faint">Indústria</dt><dd className="text-right">{INDUSTRIES.find(([id]) => id === industry)?.[1]}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink-faint">Serviços</dt><dd className="text-right">{summary.services}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink-faint">Conteúdo extra</dt><dd className="text-right">{summary.extras} grupo(s)</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink-faint">Logo</dt><dd className="text-right">{logo ? "sim" : "não"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink-faint">Imagens</dt><dd className="text-right">{images.length}</dd></div>
            </dl>
            <p className="mt-4 border-t border-line-soft pt-3 text-xs leading-relaxed text-ink-faint">
              A engine só usa informação real do briefing. Se faltar um dado (ex.: stats ou
              testemunhos), a secção é omitida — nada é inventado.
            </p>
          </Section>

          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(2)} className="rounded-md border border-line px-5 py-2.5 font-sans text-sm text-ink-dim hover:text-ink">
              ← Voltar
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={busy}
              className="rounded-md bg-accent px-6 py-3 font-sans text-sm font-semibold tracking-wide text-base transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "A gerar website…" : "GERAR WEBSITE"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
