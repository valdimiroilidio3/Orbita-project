"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  addSectionAction,
  applySchemaAction,
  createVersionAction,
  deleteSectionAction,
  duplicateSectionAction,
  moveSectionAction,
  reorderSectionsAction,
  saveSectionPropsAction,
  setSectionHiddenAction,
  type ActionResult,
} from "@/lib/server/actions";
import { describeVariantSchema } from "@/lib/editor/fields";
import { placeholderProps } from "@/lib/editor/placeholders";
import {
  deleteSection,
  duplicateSection,
  insertSection,
  moveSection,
  reorderSections,
  setSectionHidden,
  updateSectionProps,
  type MutResult,
} from "@/lib/engine/mutations";
import { resolveSite } from "@/lib/engine/page-engine";
import { sectionLayoutCss, SiteDocument } from "@/lib/engine/renderer";
import { getComponent, registry } from "@/lib/registry";
import { componentLabel } from "@/lib/site-schema/catalog";
import type { SectionType, SiteSchemaType } from "@/lib/site-schema";
import { scopeThemeCss, themeToCss } from "@/lib/theme/tokens";
import { cn } from "@/lib/utils/cn";
import { Inspector, PreviewPane, type AssetInfo, type HubSection } from "./section-inspector";

type Props = {
  projectId: string;
  previewSrc: string;
  initialSchema: SiteSchemaType;
  assets: AssetInfo[];
};

type Breakpoint = "mobile" | "tablet" | "desktop";
type ViewMode = "canvas" | "preview";

const BP_WIDTHS: Record<Breakpoint, string> = {
  mobile: "390px",
  tablet: "768px",
  desktop: "100%",
};

const BP_LABELS: { key: Breakpoint; label: string }[] = [
  { key: "mobile", label: "M" },
  { key: "tablet", label: "T" },
  { key: "desktop", label: "D" },
];

const CATALOG = Array.from(registry.values())
  .filter((d) => d.id !== "navigation")
  .map((d) => ({
    type: d.id,
    name: componentLabel(d.id),
    description: d.description,
    variants: Object.entries(d.variants).map(([key, v]) => ({ key, label: v.label })),
  }));

type InlineEdit = {
  sectionId: string;
  path: string;
  draft: string;
  top: number;
  left: number;
  width: number;
  minHeight: number;
  fonts: CSSProperties;
};

function fd(projectId: string, pageId: string, extra: Record<string, string>) {
  const f = new FormData();
  f.set("projectId", projectId);
  f.set("pageId", pageId);
  for (const [k, v] of Object.entries(extra)) f.set(k, v);
  return f;
}

function getAtPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const part of path.split(".")) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function setAtPath(obj: unknown, path: string, value: unknown): unknown {
  const parts = path.split(".");
  const clone = structuredClone(obj);
  let cur: Record<string, unknown> | unknown[] = clone as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i++) {
    const next = cur[parts[i]];
    if (!next || typeof next !== "object") return obj;
    cur = next as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
  return clone;
}

export default function ProjectEditor({ projectId, previewSrc, initialSchema, assets }: Props) {
  const [schema, setSchema] = useState<SiteSchemaType>(initialSchema);
  const [past, setPast] = useState<SiteSchemaType[]>([]);
  const [future, setFuture] = useState<SiteSchemaType[]>([]);
  const [pageId, setPageId] = useState(initialSchema.pages[0]?.id ?? "");
  const [bp, setBp] = useState<Breakpoint>("desktop");
  const [mode, setMode] = useState<ViewMode>("canvas");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSchema.pages[0]?.sections[0]?.id ?? null,
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "error" | "ok"; text: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerVariant, setPickerVariant] = useState<Record<string, string>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [editing, setEditing] = useState<InlineEdit | null>(null);

  const dragRef = useRef<{ id: string } | null>(null);
  const editingRef = useRef<InlineEdit | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    editingRef.current = editing;
  }, [editing]);

  const resolved = useMemo(
    () => resolveSite(schema, { assetIds: new Set(assets.map((a) => a.id)) }),
    [schema, assets],
  );

  const page = resolved.ok
    ? resolved.site.pages.find((p) => p.page.id === pageId) ?? resolved.site.pages[0]
    : null;
  const sections = page?.sections ?? [];
  const selected = sections.find((s) => s.id === selectedId) ?? null;

  const hubSection: HubSection | null = useMemo(() => {
    if (!selected) return null;
    const def = getComponent(selected.type);
    const vdef = def?.variants[selected.variant];
    return {
      id: selected.id,
      type: selected.type,
      typeLabel: componentLabel(selected.type),
      variant: selected.variant,
      variantLabel: vdef?.label ?? selected.variant,
      hidden: selected.hidden,
      props: structuredClone(selected.props),
      fields: vdef ? describeVariantSchema(vdef.schema) : [],
    };
  }, [selected]);

  const scopedCss = useMemo(() => {
    if (!resolved.ok) return "";
    const layout = sectionLayoutCss(resolved.site.pages, ".oe-scope");
    return scopeThemeCss(`${themeToCss(resolved.site.schema.theme)}\n${layout}`);
  }, [resolved]);

  const editLabels = useMemo(() => {
    const m: Record<string, string> = {};
    if (resolved.ok) {
      for (const rp of resolved.site.pages) {
        for (const s of rp.sections) m[s.id] = componentLabel(s.type);
      }
    }
    return m;
  }, [resolved]);

  // -------------------------------------------------------------------------
  // Commit pipeline: local mutation → optimistic state → server persistence
  // (full Zod revalidation) → rollback on failure. Undo/redo ride on top.
  // -------------------------------------------------------------------------

  async function commit(
    mutate: (s: SiteSchemaType) => MutResult,
    persist: () => Promise<ActionResult>,
  ): Promise<SiteSchemaType | null> {
    if (busy) return null;
    const result = mutate(schema);
    if (!result.ok) {
      setMsg({ kind: "error", text: result.error });
      return null;
    }
    if (!result.changed) return schema;
    const before = schema;
    const noop = JSON.stringify(result.schema) === JSON.stringify(before);
    setBusy(true);
    if (!noop) {
      setPast((p) => [...p.slice(-24), before]);
      setFuture([]);
    }
    setSchema(result.schema);
    setEditing(null);
    try {
      const res = await persist();
      if (!res.ok) {
        setSchema(before);
        if (!noop) setPast((p) => p.slice(0, -1));
        setMsg({ kind: "error", text: res.error });
        return null;
      }
      setMsg({ kind: "ok", text: "Guardado." });
      setRefreshKey((k) => k + 1);
      return result.schema;
    } finally {
      setBusy(false);
    }
  }

  async function persistSnapshot(next: SiteSchemaType) {
    const f = new FormData();
    f.set("projectId", projectId);
    f.set("schema", JSON.stringify(next));
    return applySchemaAction(f);
  }

  async function undo() {
    if (past.length === 0 || busy) return;
    const prev = past[past.length - 1];
    setBusy(true);
    const res = await persistSnapshot(prev);
    setBusy(false);
    if (!res.ok) {
      setMsg({ kind: "error", text: res.error });
      return;
    }
    setSchema(prev);
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [...f, schema]);
    setRefreshKey((k) => k + 1);
    setMsg({ kind: "ok", text: "Desfeito." });
  }

  async function redo() {
    if (future.length === 0 || busy) return;
    const next = future[future.length - 1];
    setBusy(true);
    const res = await persistSnapshot(next);
    setBusy(false);
    if (!res.ok) {
      setMsg({ kind: "error", text: res.error });
      return;
    }
    setSchema(next);
    setFuture((f) => f.slice(0, -1));
    setPast((p) => [...p, schema]);
    setRefreshKey((k) => k + 1);
    setMsg({ kind: "ok", text: "Refeito." });
  }

  // Toast auto-clear
  useEffect(() => {
    if (msg?.kind !== "ok") return;
    const t = setTimeout(() => setMsg(null), 2500);
    return () => clearTimeout(t);
  }, [msg]);

  // -------------------------------------------------------------------------
  // Section actions (sidebar rows)
  // -------------------------------------------------------------------------

  async function sectionAction(
    kind: "up" | "down" | "dup" | "del" | "hide",
    sectionId: string,
    extra?: Record<string, string>,
  ) {
    if (!page) return;
    const pid = page.page.id;
    if (kind === "del") {
      if (
        !confirm(
          "Eliminar esta secção? Guarda uma versão antes, se quiseres poder voltar atrás.",
        )
      )
        return;
      setSelectedId(null);
      await commit(
        (s) => deleteSection(s, pid, sectionId),
        () => deleteSectionAction(fd(projectId, pid, { sectionId })),
      );
    } else if (kind === "up" || kind === "down") {
      await commit(
        (s) => moveSection(s, pid, sectionId, kind),
        () => moveSectionAction(fd(projectId, pid, { sectionId, to: kind })),
      );
    } else if (kind === "dup") {
      const next = await commit(
        (s) => duplicateSection(s, pid, sectionId),
        () => duplicateSectionAction(fd(projectId, pid, { sectionId })),
      );
      if (next) {
        const ids = next.pages.find((p) => p.id === pid)?.sections.map((s) => s.id) ?? [];
        const i = ids.indexOf(sectionId);
        const copyId =
          i >= 0 && i + 1 < ids.length && ids[i + 1].startsWith(sectionId) ? ids[i + 1] : null;
        if (copyId) setSelectedId(copyId);
      }
    } else if (kind === "hide" && extra) {
      await commit(
        (s) => setSectionHidden(s, pid, sectionId, extra.breakpoint as Breakpoint, extra.hidden === "true"),
        () => setSectionHiddenAction(fd(projectId, pid, { sectionId, ...extra })),
      );
    }
  }

  async function handleInspectorSave(draft: Record<string, unknown>): Promise<ActionResult> {
    if (!page || !selected) return { ok: false, error: "Secção não encontrada." };
    const next = await commit(
      (s) => updateSectionProps(s, page.page.id, selected.id, draft),
      () =>
        saveSectionPropsAction(
          fd(projectId, page.page.id, { sectionId: selected.id, props: JSON.stringify(draft) }),
        ),
    );
    return next ? { ok: true } : { ok: false, error: msg?.text ?? "Não foi possível guardar." };
  }

  // -------------------------------------------------------------------------
  // Canvas: selection, inline editing, drag & drop
  // -------------------------------------------------------------------------

  function sectionEls(): HTMLElement[] {
    return Array.from(
      viewportRef.current?.querySelectorAll<HTMLElement>("section[data-section]") ?? [],
    );
  }

  function computeDropIndex(clientY: number): number {
    const els = sectionEls();
    for (let i = 0; i < els.length; i++) {
      const r = els[i].getBoundingClientRect();
      if (clientY < r.top + r.height / 2) return i;
    }
    return els.length;
  }

  function handleCanvasClick(e: ReactMouseEvent) {
    const anchor = (e.target as HTMLElement).closest("a");
    if (anchor) e.preventDefault(); // the canvas never navigates
    const sec = (e.target as HTMLElement).closest("section[data-section]") as HTMLElement | null;
    setSelectedId(sec ? sec.getAttribute("data-section") : null);
  }

  function handleCanvasDblClick(e: ReactMouseEvent) {
    const target = e.target as HTMLElement;
    if (target.closest("[data-oe-drag]")) return;
    const slot = target.closest("[data-oe-prop]") as HTMLElement | null;
    const sec = target.closest("section[data-section]") as HTMLElement | null;
    const vp = viewportRef.current;
    if (!slot || !sec || !vp) return;
    const r = slot.getBoundingClientRect();
    const sr = vp.getBoundingClientRect();
    const cs = window.getComputedStyle(slot);
    setEditing({
      sectionId: sec.getAttribute("data-section") ?? "",
      path: slot.dataset.oeProp ?? "",
      draft: slot.textContent ?? "",
      top: r.top - sr.top + vp.scrollTop,
      left: r.left - sr.left + vp.scrollLeft,
      width: Math.max(r.width, 160),
      minHeight: Math.max(r.height + 4, 24),
      fonts: {
        fontFamily: cs.fontFamily,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        letterSpacing: cs.letterSpacing,
        color: cs.color,
        textAlign: cs.textAlign,
      } as CSSProperties,
    });
  }

  function commitInline() {
    const ed = editingRef.current;
    editingRef.current = null;
    setEditing(null);
    if (!ed || !page) return;
    const section = sections.find((s) => s.id === ed.sectionId);
    if (!section) return;
    const current = getAtPath(section.props, ed.path);
    if (ed.draft === (current ?? "")) return;
    const newProps = setAtPath(section.props, ed.path, ed.draft);
    void commit(
      (s) => updateSectionProps(s, page.page.id, ed.sectionId, newProps as Record<string, unknown>),
      () =>
        saveSectionPropsAction(
          fd(projectId, page.page.id, {
            sectionId: ed.sectionId,
            props: JSON.stringify(newProps),
          }),
        ),
    );
  }

  function handlePointerDown(e: ReactPointerEvent) {
    if (mode !== "canvas") return;
    const handle = (e.target as HTMLElement).closest("[data-oe-drag]") as HTMLElement | null;
    if (!handle) return;
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    dragRef.current = { id: handle.getAttribute("data-oe-drag") ?? "" };
    setDraggingId(dragRef.current.id);
    setMsg(null);
  }

  function handlePointerMove(e: ReactPointerEvent) {
    if (!dragRef.current) return;
    setDropIndex(computeDropIndex(e.clientY));
  }

  function handlePointerUp(e: ReactPointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const idx = computeDropIndex(e.clientY);
    dragRef.current = null;
    setDraggingId(null);
    setDropIndex(null);
    if (!page) return;
    const ids = sections.map((s) => s.id);
    const from = ids.indexOf(drag.id);
    if (from < 0) return;
    let to = idx;
    if (idx > from) to = idx - 1;
    if (to === from) return;
    const next = [...ids.slice(0, from), ...ids.slice(from + 1)];
    next.splice(to, 0, drag.id);
    void commit(
      (s) => reorderSections(s, page.page.id, next),
      () => reorderSectionsAction(fd(projectId, page.page.id, { order: JSON.stringify(next) })),
    );
  }

  // Dim the section being dragged (imperative class toggle on rendered sections)
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    vp.querySelectorAll<HTMLElement>("section[data-section]").forEach((el) => {
      el.classList.toggle("oe-dragging", el.getAttribute("data-section") === draggingId);
    });
  }, [draggingId, schema, bp, pageId, resolved]);

  function dropLineTop(): number | null {
    if (dropIndex == null) return null;
    const vp = viewportRef.current;
    if (!vp) return null;
    const vpTop = vp.getBoundingClientRect().top;
    const els = sectionEls();
    for (let i = dropIndex - 1; i >= 0; i--) {
      const r = els[i].getBoundingClientRect();
      if (r.height > 0) return r.bottom - vpTop + vp.scrollTop;
    }
    for (let i = dropIndex; i < els.length; i++) {
      const r = els[i].getBoundingClientRect();
      if (r.height > 0) return r.top - vpTop + vp.scrollTop;
    }
    return 0;
  }

  // -------------------------------------------------------------------------
  // Add-section picker
  // -------------------------------------------------------------------------

  function addPicked(type: string, variant: string) {
    if (!page) return;
    const def = getComponent(type as SectionType["type"]);
    const vdef = def?.variants[variant];
    if (!vdef) return;
    const idx = selected
      ? sections.findIndex((s) => s.id === selected.id) + 1
      : sections.length;
    const newId = `${type}-${Math.random().toString(16).slice(2, 6)}`;
    let section: SectionType;
    try {
      section = {
        id: newId,
        type: type as SectionType["type"],
        variant,
        props: placeholderProps(vdef),
        responsive: { mobile: {}, tablet: {}, desktop: {} },
        animation: { enabled: true, effect: "fade-up", delayMs: 0 },
      };
    } catch {
      setMsg({ kind: "error", text: "Não foi possível criar o conteúdo inicial da secção." });
      return;
    }
    setPickerOpen(false);
    setSelectedId(newId);
    void commit(
      (s) => insertSection(s, page.page.id, idx, section),
      () =>
        addSectionAction(
          fd(projectId, page.page.id, { type, variant, index: String(idx), id: newId }),
        ),
    );
  }

  async function snapshotVersion() {
    if (busy) return;
    setBusy(true);
    const f = new FormData();
    f.set("projectId", projectId);
    const res = await createVersionAction(f);
    setBusy(false);
    setMsg(res.ok ? { kind: "ok", text: "Versão guardada." } : { kind: "error", text: res.error });
  }

  // -------------------------------------------------------------------------
  // Keyboard shortcuts
  // -------------------------------------------------------------------------

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const typing =
        !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !typing) {
        e.preventDefault();
        if (e.shiftKey) void redo();
        else void undo();
      } else if (e.key === "Escape" && !typing) {
        setEditing(null);
        setSelectedId(null);
      } else if (
        (e.key === "Delete" || e.key === "Backspace") &&
        !typing &&
        mode === "canvas" &&
        selectedId
      ) {
        e.preventDefault();
        void sectionAction("del", selectedId);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (!resolved.ok) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-lg border border-error/40 bg-panel p-8">
        <h2 className="font-sans text-lg font-semibold">Estado inválido do schema</h2>
        <ul className="flex flex-col gap-1 text-xs text-ink-dim">
          {resolved.issues.slice(0, 5).map((issue, i) => (
            <li key={i}>{issue.message}</li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => {
            setSchema(initialSchema);
            setPast([]);
            setFuture([]);
            setMsg({ kind: "error", text: "Estado reposto para a última versão válida." });
          }}
          className="rounded-md border border-line px-4 py-2 font-sans text-xs font-semibold text-ink-dim hover:text-ink"
        >
          Repor estado inicial
        </button>
      </div>
    );
  }

  const lineTop = dropLineTop();

  return (
    <div className="flex flex-col gap-0 overflow-hidden rounded-lg border border-line">
      {/* Toolbar ------------------------------------------------------------ */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-panel px-3 py-2">
        <div className="flex gap-1">
          {resolved.site.pages.map((p) => (
            <button
              key={p.page.id}
              type="button"
              onClick={() => {
                setPageId(p.page.id);
                setSelectedId(p.sections[0]?.id ?? null);
              }}
              className={cn(
                "rounded px-2.5 py-1 text-[11px] font-medium",
                p.page.id === (page?.page.id ?? "")
                  ? "bg-panel2 text-ink"
                  : "text-ink-faint hover:text-ink",
              )}
            >
              {p.page.title}
            </button>
          ))}
        </div>
        <span className="h-4 w-px bg-line" />
        <div className="flex rounded border border-line p-0.5" role="group" aria-label="Breakpoint">
          {BP_LABELS.map((b) => (
            <button
              key={b.key}
              type="button"
              title={b.key}
              onClick={() => setBp(b.key)}
              className={cn(
                "rounded px-2 py-0.5 text-[11px] font-semibold",
                bp === b.key ? "bg-accent text-base" : "text-ink-faint hover:text-ink",
              )}
            >
              {b.label}
            </button>
          ))}
        </div>
        <span className="h-4 w-px bg-line" />
        <div className="flex rounded border border-line p-0.5" role="group" aria-label="Modo de vista">
          <button
            type="button"
            onClick={() => setMode("canvas")}
            className={cn(
              "rounded px-2.5 py-0.5 text-[11px] font-medium",
              mode === "canvas" ? "bg-panel2 text-ink" : "text-ink-faint hover:text-ink",
            )}
          >
            Canvas
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={cn(
              "rounded px-2.5 py-0.5 text-[11px] font-medium",
              mode === "preview" ? "bg-panel2 text-ink" : "text-ink-faint hover:text-ink",
            )}
          >
            Preview
          </button>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            title="Desfazer (⌘Z)"
            disabled={past.length === 0 || busy}
            onClick={() => void undo()}
            className="rounded border border-line px-2 py-1 text-xs text-ink-dim hover:text-ink disabled:opacity-40"
          >
            ↶
          </button>
          <button
            type="button"
            title="Refeito (⇧⌘Z)"
            disabled={future.length === 0 || busy}
            onClick={() => void redo()}
            className="rounded border border-line px-2 py-1 text-xs text-ink-dim hover:text-ink disabled:opacity-40"
          >
            ↷
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void snapshotVersion()}
            className="rounded border border-line px-3 py-1 text-[11px] font-medium text-ink-dim hover:text-ink disabled:opacity-40"
          >
            Guardar versão
          </button>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="rounded bg-accent px-3 py-1 font-sans text-[11px] font-semibold text-base hover:opacity-90"
          >
            + Secção
          </button>
        </div>
      </div>

      {/* Body --------------------------------------------------------------- */}
      <div className="grid h-[68vh] min-h-[520px] lg:grid-cols-[1fr_320px]">
        {mode === "canvas" ? (
          <div className="flex min-h-0 min-w-0 flex-col">
            <div
              ref={viewportRef}
              className="oe-viewport relative min-h-0 flex-1 overflow-auto"
              onClick={handleCanvasClick}
              onDoubleClick={handleCanvasDblClick}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <div
                className="oe-scope mx-auto"
                style={{
                  width: BP_WIDTHS[bp],
                  containerType: "inline-size",
                  containerName: "oe",
                }}
              >
                <style>{scopedCss}</style>
                <SiteDocument
                  site={resolved.site}
                  ctx={{
                    schema: resolved.site.schema,
                    pagePath: page!.page.path,
                    linkFor: () => "#",
                    assetUrl: (ref) =>
                      ref.startsWith("asset:") ? `/api/asset/${ref.slice(6)}` : ref,
                    assetIds: new Set(assets.map((a) => a.id)),
                    contactPayload: null,
                    contactSubmitted: false,
                    contactError: false,
                    editMode: true,
                    selectedId: selectedId ?? undefined,
                    editLabels,
                  }}
                />
                {dropIndex != null && lineTop != null && (
                  <div className="oe-drop-line" style={{ top: lineTop }} />
                )}
                {editing && (
                  <textarea
                    className="oe-inline-editor"
                    style={{
                      top: editing.top,
                      left: editing.left,
                      width: editing.width,
                      minHeight: editing.minHeight,
                      ...editing.fonts,
                    }}
                    value={editing.draft}
                    onChange={(e) =>
                      setEditing((x) => (x ? { ...x, draft: e.target.value } : x))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        commitInline();
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        setEditing(null);
                      }
                    }}
                    onBlur={commitInline}
                    onPointerDown={(e) => e.stopPropagation()}
                    autoFocus
                  />
                )}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-line bg-panel px-3 py-1.5">
              <span className="text-[11px] text-ink-faint">
                Clica para selecionar · duplo clique edita o texto · arrasta ⠿ para reordenar ·
                ⌘Z desfaz
              </span>
              <span className={cn("text-[11px]", busy ? "text-amber-300" : "text-ink-faint")}>
                {busy ? "A guardar…" : "canvas"}
              </span>
            </div>
          </div>
        ) : (
          <div className="min-h-0 min-w-0 overflow-hidden p-3">
            <PreviewPane src={previewSrc} refreshKey={refreshKey} />
            <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">
              O preview usa o pipeline de renderização do deploy: Site Schema → page engine →
              component registry.
            </p>
          </div>
        )}

        {/* Sidebar ---------------------------------------------------------- */}
        <aside className="flex min-h-0 flex-col border-t border-line bg-panel lg:border-t-0 lg:border-l">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-sans text-sm font-semibold">
              Secções
              <span className="ml-1.5 text-[11px] font-normal text-ink-faint">
                {sections.length}
              </span>
            </p>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="text-[11px] text-ink-dim hover:text-accent"
            >
              + Adicionar
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <div className="flex flex-col gap-1">
              {sections.map((s) => {
                const def = getComponent(s.type);
                const vdef = def?.variants[s.variant];
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className={cn(
                      "group flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2",
                      s.id === selectedId
                        ? "border-accent/50 bg-panel2"
                        : "border-transparent hover:bg-panel2",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
                        {componentLabel(s.type)}
                        {s.hidden[bp] && (
                          <span className="ml-1.5 text-[10px] font-normal text-ink-faint">
                            (oculta aqui)
                          </span>
                        )}
                      </p>
                      <p className="truncate text-[10px] text-ink-faint">
                        {vdef?.label ?? s.variant}
                      </p>
                    </div>
                    <div className="flex gap-0.5">
                      {BP_LABELS.map((b) => (
                        <button
                          key={b.key}
                          type="button"
                          title={`${b.key}: ${s.hidden[b.key] ? "oculta" : "visível"}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            void sectionAction("hide", s.id, {
                              breakpoint: b.key,
                              hidden: String(!s.hidden[b.key]),
                            });
                          }}
                          className={cn(
                            "h-5 w-5 rounded text-[10px] leading-none",
                            s.hidden[b.key]
                              ? "bg-line text-ink-faint"
                              : "bg-accent/15 text-accent",
                          )}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                    <div className="hidden gap-0.5 group-hover:flex">
                      <button
                        type="button"
                        title="Subir"
                        onClick={(e) => {
                          e.stopPropagation();
                          void sectionAction("up", s.id);
                        }}
                        className="rounded px-1 text-[10px] text-ink-dim hover:text-ink"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        title="Descer"
                        onClick={(e) => {
                          e.stopPropagation();
                          void sectionAction("down", s.id);
                        }}
                        className="rounded px-1 text-[10px] text-ink-dim hover:text-ink"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        title="Duplicar"
                        onClick={(e) => {
                          e.stopPropagation();
                          void sectionAction("dup", s.id);
                        }}
                        className="rounded px-1 text-[10px] text-ink-dim hover:text-ink"
                      >
                        ⧉
                      </button>
                      <button
                        type="button"
                        title="Eliminar"
                        onClick={(e) => {
                          e.stopPropagation();
                          void sectionAction("del", s.id);
                        }}
                        className="rounded px-1 text-[10px] text-ink-dim hover:text-error"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {msg?.kind === "error" && (
              <p role="alert" className="mt-3 text-[11px] text-error">
                {msg.text}
              </p>
            )}
          </div>
          {hubSection && (
            <Inspector
              key={`${pageId}:${hubSection.id}:${JSON.stringify(hubSection.props)}`}
              section={hubSection}
              pages={resolved.site.pages.map((p) => ({ path: p.page.path }))}
              assets={assets}
              onSave={handleInspectorSave}
            />
          )}
        </aside>
      </div>

      {/* Section picker ------------------------------------------------------ */}
      {pickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="flex max-h-[80vh] w-[600px] max-w-full flex-col gap-4 rounded-lg border border-line bg-panel p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 className="font-sans text-base font-semibold">Adicionar secção</h2>
              <p className="mt-1 text-xs text-ink-dim">
                {selected
                  ? `Será inserida depois de “${editLabels[selected.id] ?? selected.id}”.`
                  : "Será inserida no fim da página."}{" "}
                O conteúdo inicial são placeholders claros — sem factos inventados.
              </p>
            </div>
            <div className="grid max-h-[52vh] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
              {CATALOG.map((c) => (
                <div key={c.type} className="flex flex-col gap-2 rounded border border-line-soft bg-panel2 p-3">
                  <div>
                    <p className="text-xs font-semibold">{c.name}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-ink-faint">
                      {c.description}
                    </p>
                  </div>
                  {c.variants.length > 1 && (
                    <select
                      className="w-full rounded border border-line bg-panel px-2 py-1 text-[11px] outline-none focus:border-accent/60"
                      value={pickerVariant[c.type] ?? c.variants[0].key}
                      onChange={(e) =>
                        setPickerVariant((v) => ({ ...v, [c.type]: e.target.value }))
                      }
                    >
                      {c.variants.map((v) => (
                        <option key={v.key} value={v.key}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      addPicked(c.type, pickerVariant[c.type] ?? c.variants[0].key)
                    }
                    className="self-start rounded bg-accent px-3 py-1 font-sans text-[11px] font-semibold text-base hover:opacity-90"
                  >
                    Adicionar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
