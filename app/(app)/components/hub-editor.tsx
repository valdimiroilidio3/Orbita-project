"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  deleteSectionAction,
  duplicateSectionAction,
  moveSectionAction,
  reorderSectionsAction,
  saveSectionPropsAction,
  setSectionHiddenAction,
  type ActionResult,
} from "@/lib/server/actions";
import { cn } from "@/lib/utils/cn";
import PreviewFrame from "./preview-frame";

export type FieldDescriptor = {
  name: string;
  label: string;
  kind:
    | "text"
    | "textarea"
    | "number"
    | "boolean"
    | "color"
    | "asset"
    | "select"
    | "lines"
    | "list"
    | "object"
    | "cta";
  required: boolean;
  options?: { value: string; label: string }[];
  item?: FieldDescriptor[];
};

export type HubSection = {
  id: string;
  type: string;
  typeLabel: string;
  variant: string;
  variantLabel: string;
  hidden: { mobile: boolean; tablet: boolean; desktop: boolean };
  props: Record<string, unknown>;
  fields: FieldDescriptor[];
};

export type HubPage = { id: string; path: string; title: string; sections: HubSection[] };

type AssetInfo = {
  id: string;
  filename: string;
  width: number | null;
  height: number | null;
  kind: string;
};

type Props = {
  projectId: string;
  previewSrc: string;
  pages: HubPage[];
  assets: AssetInfo[];
};

const BP_LABELS: { key: "mobile" | "tablet" | "desktop"; label: string }[] = [
  { key: "mobile", label: "M" },
  { key: "tablet", label: "T" },
  { key: "desktop", label: "D" },
];

function clone<T>(v: T): T {
  return v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T);
}

/** Convert form-held draft values back to typed values before validation. */
function coerce(
  draft: Record<string, unknown>,
  fields: FieldDescriptor[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const raw = draft[f.name];
    switch (f.kind) {
      case "number": {
        const s = typeof raw === "number" ? raw : String(raw ?? "").trim();
        if (s === "" || s === null) {
          if (f.required) out[f.name] = 0;
          break;
        }
        out[f.name] = Number(s);
        break;
      }
      case "boolean":
        out[f.name] = Boolean(raw);
        break;
      case "lines": {
        const text = typeof raw === "string" ? raw : "";
        out[f.name] = text.split("\n").map((l) => l.trim()).filter(Boolean);
        break;
      }
      case "asset":
      case "select":
      case "color": {
        const s = typeof raw === "string" ? raw : "";
        if (s) out[f.name] = s;
        break;
      }
      case "list": {
        const arr = Array.isArray(raw) ? raw : [];
        const items = arr
          .map((item) => {
            if (!item || typeof item !== "object") return undefined;
            const coerced = coerce(item as Record<string, unknown>, f.item ?? []);
            return Object.keys(coerced).length ? coerced : undefined;
          })
          .filter((x): x is Record<string, unknown> => Boolean(x));
        out[f.name] = items;
        break;
      }
      case "object": {
        const item = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
        const coerced = coerce(item, f.item ?? []);
        if (Object.keys(coerced).length) out[f.name] = coerced;
        break;
      }
      case "cta": {
        const item = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
        const label = typeof item.label === "string" ? item.label : "";
        const pagePath = typeof item.pagePath === "string" && item.pagePath ? item.pagePath : "/";
        out[f.name] = { label, pagePath };
        break;
      }
      default: {
        const s = typeof raw === "string" ? raw : "";
        if (s.trim()) out[f.name] = s;
      }
    }
  }
  return out;
}

function ItemField({
  field,
  value,
  onChange,
  pages,
  assets,
}: {
  field: FieldDescriptor;
  value: unknown;
  onChange: (v: unknown) => void;
  pages: { path: string }[];
  assets: AssetInfo[];
}) {
  const inputCls =
    "w-full rounded border border-line bg-panel px-2.5 py-1.5 text-xs outline-none focus:border-accent/60";
  switch (field.kind) {
    case "textarea":
      return (
        <textarea
          rows={2}
          className={inputCls}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "number":
      return (
        <input
          type="number"
          className={inputCls}
          value={typeof value === "number" ? value : typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "boolean":
      return (
        <label className="flex items-center gap-2 text-xs text-ink-dim">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="accent-[var(--color-accent)]"
          />
          ativo
        </label>
      );
    case "color":
      return (
        <input
          type="color"
          value={typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#D96C2C"}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-12 cursor-pointer rounded border border-line bg-panel"
        />
      );
    case "asset":
      return (
        <select
          className={inputCls}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">— nenhuma —</option>
          {typeof value === "string" && value && !value.startsWith("asset:") && (
            <option value={value}>{value}</option>
          )}
          {assets.map((a) => (
            <option key={a.id} value={`asset:${a.id}`}>
              {a.filename}
            </option>
          ))}
        </select>
      );
    case "select":
      return (
        <select
          className={inputCls}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">—</option>
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case "cta": {
      const cta = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
      return (
        <div className="grid grid-cols-2 gap-2">
          <input
            className={inputCls}
            placeholder="Label"
            value={typeof cta.label === "string" ? cta.label : ""}
            onChange={(e) => onChange({ ...cta, label: e.target.value })}
          />
          <select
            className={inputCls}
            value={typeof cta.pagePath === "string" ? cta.pagePath : "/"}
            onChange={(e) => onChange({ ...cta, pagePath: e.target.value })}
          >
            {pages.map((p) => (
              <option key={p.path} value={p.path}>
                {p.path}
              </option>
            ))}
          </select>
        </div>
      );
    }
    default:
      return (
        <input
          className={inputCls}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

function NestedEditor({
  field,
  value,
  onChange,
  pages,
  assets,
}: {
  field: FieldDescriptor;
  value: unknown;
  onChange: (v: unknown) => void;
  pages: { path: string }[];
  assets: AssetInfo[];
}) {
  const itemFields = field.item ?? [];
  if (field.kind === "object") {
    const obj = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
    return (
      <div className="mt-2 flex flex-col gap-2 rounded border border-line-soft bg-panel2 p-2">
        {itemFields.map((f) => (
          <div key={f.name}>
            <label className="mb-1 block text-[11px] text-ink-faint">{f.label}</label>
            <ItemField
              field={f}
              value={obj[f.name]}
              onChange={(v) => onChange({ ...obj, [f.name]: v })}
              pages={pages}
              assets={assets}
            />
          </div>
        ))}
      </div>
    );
  }
  const list = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
  return (
    <div className="mt-2 flex flex-col gap-2">
      {list.map((item, i) => (
        <div key={i} className="flex flex-col gap-2 rounded border border-line-soft bg-panel2 p-2">
          {itemFields.map((f) => (
            <div key={f.name}>
              <label className="mb-1 block text-[11px] text-ink-faint">{f.label}</label>
              <ItemField
                field={f}
                value={item[f.name]}
                onChange={(v) => onChange(list.map((x, j) => (j === i ? { ...x, [f.name]: v } : x)))}
                pages={pages}
                assets={assets}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange(list.filter((_, j) => j !== i))}
            className="self-start text-[11px] text-ink-faint hover:text-error"
          >
            remover item
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange([
            ...list,
            Object.fromEntries(itemFields.map((f) => [f.name, f.kind === "boolean" ? false : ""])),
          ])
        }
        className="self-start text-[11px] text-ink-dim hover:text-accent"
      >
        + Adicionar item
      </button>
    </div>
  );
}

function Inspector({
  section,
  pages,
  assets,
  onSave,
}: {
  section: HubSection;
  pages: { path: string }[];
  assets: AssetInfo[];
  onSave: (draft: Record<string, unknown>) => Promise<ActionResult>;
}) {
  const [draft, setDraft] = useState<Record<string, unknown>>(() => clone(section.props));
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);

  function setField(name: string, value: unknown) {
    setDraft((d) => ({ ...d, [name]: value }));
    setResult(null);
  }

  async function save() {
    setSaving(true);
    const res = await onSave(coerce(draft, section.fields));
    setSaving(false);
    setResult(res);
  }

  return (
    <div className="flex flex-col gap-3 border-t border-line bg-panel p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-sans text-sm font-semibold">{section.typeLabel}</p>
          <p className="text-[11px] text-ink-faint">
            {section.variantLabel} · <code className="text-[10px]">{section.id}</code>
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded bg-accent px-3 py-1.5 font-sans text-xs font-semibold text-base hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "A guardar…" : "Guardar"}
        </button>
      </div>

      {section.fields.length === 0 && (
        <p className="text-xs text-ink-faint">Este componente não tem conteúdo editável.</p>
      )}
      {section.fields.map((f) => (
        <div key={f.name}>
          {f.kind !== "boolean" && (
            <label className="mb-1 block text-[11px] font-medium text-ink-dim">
              {f.label}
              {f.required && <span className="text-accent"> *</span>}
            </label>
          )}
          <ItemField
            field={f}
            value={draft[f.name]}
            onChange={(v) => setField(f.name, v)}
            pages={pages}
            assets={assets}
          />
          {(f.kind === "list" || f.kind === "object") && (
            <NestedEditor
              field={f}
              value={draft[f.name]}
              onChange={(v) => setField(f.name, v)}
              pages={pages}
              assets={assets}
            />
          )}
        </div>
      ))}
      {result && (
        <p className={result.ok ? "text-[11px] text-accent" : "text-[11px] text-error"}>
          {result.ok ? "Guardado ✓" : result.error}
        </p>
      )}
    </div>
  );
}

type RowHandlers = {
  onMove: (sectionId: string, dir: "up" | "down") => void;
  onDuplicate: (sectionId: string) => void;
  onDelete: (sectionId: string) => void;
  onToggleHidden: (sectionId: string, bp: "mobile" | "tablet" | "desktop") => void;
};

function SortableRow({
  section,
  selected,
  onSelect,
  handlers,
}: {
  section: HubSection;
  selected: boolean;
  onSelect: () => void;
  handlers: RowHandlers;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2",
        selected ? "border-accent/50 bg-panel2" : "border-transparent bg-panel hover:bg-panel2",
        isDragging && "z-10 opacity-70",
      )}
      onClick={onSelect}
    >
      <button
        type="button"
        aria-label="Arrastar"
        className="cursor-grab text-ink-faint hover:text-ink active:cursor-grabbing"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        ⠿
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{section.typeLabel}</p>
        <p className="truncate text-[10px] text-ink-faint">{section.variantLabel}</p>
      </div>
      <div className="flex gap-0.5">
        {BP_LABELS.map((bp) => (
          <button
            key={bp.key}
            type="button"
            title={`${bp.key}: ${section.hidden[bp.key] ? "oculta" : "visível"}`}
            onClick={(e) => {
              e.stopPropagation();
              handlers.onToggleHidden(section.id, bp.key);
            }}
            className={cn(
              "h-5 w-5 rounded text-[10px] leading-none",
              section.hidden[bp.key] ? "bg-line text-ink-faint" : "bg-accent/15 text-accent",
            )}
          >
            {bp.label}
          </button>
        ))}
      </div>
      <div className="hidden gap-0.5 group-hover:flex">
        <button type="button" title="Subir" onClick={(e) => { e.stopPropagation(); handlers.onMove(section.id, "up"); }} className="rounded px-1 text-[10px] text-ink-dim hover:text-ink">↑</button>
        <button type="button" title="Descer" onClick={(e) => { e.stopPropagation(); handlers.onMove(section.id, "down"); }} className="rounded px-1 text-[10px] text-ink-dim hover:text-ink">↓</button>
        <button type="button" title="Duplicar" onClick={(e) => { e.stopPropagation(); handlers.onDuplicate(section.id); }} className="rounded px-1 text-[10px] text-ink-dim hover:text-ink">⧉</button>
        <button type="button" title="Eliminar" onClick={(e) => { e.stopPropagation(); handlers.onDelete(section.id); }} className="rounded px-1 text-[10px] text-ink-dim hover:text-error">✕</button>
      </div>
    </div>
  );
}

function fd(projectId: string, pageId: string, extra: Record<string, string>) {
  const f = new FormData();
  f.set("projectId", projectId);
  f.set("pageId", pageId);
  for (const [k, v] of Object.entries(extra)) f.set(k, v);
  return f;
}

export default function HubEditor({ projectId, previewSrc, pages, assets }: Props) {
  const [pageId, setPageId] = useState(pages[0]?.id ?? "");
  const page = pages.find((p) => p.id === pageId) ?? pages[0];
  const [selectedId, setSelectedId] = useState(page?.sections[0]?.id ?? "");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const selected = page?.sections.find((s) => s.id === selectedId) ?? null;
  const sectionKey = useMemo(() => {
    if (!page) return "";
    return page.id + ":" + page.sections.map((s) => s.id + JSON.stringify(s.hidden)).join("|");
  }, [page]);

  const selectedForInspector = useMemo(
    () => (selected ? { ...selected, props: clone(selected.props) } : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedId, pageId, sectionKey],
  );

  async function handleSave(draft: Record<string, unknown>): Promise<ActionResult> {
    if (!page || !selected) return { ok: false, error: "Secção não encontrada." };
    const res = await saveSectionPropsAction(
      fd(projectId, page.id, { sectionId: selected.id, props: JSON.stringify(draft) }),
    );
    if (res.ok) {
      setSavedAt(Date.now());
      setMsg(null);
    } else {
      setMsg(res.error);
    }
    return res;
  }

  async function runAction(
    kind: "up" | "down" | "dup" | "del" | "hide",
    sectionId: string,
    extra?: Record<string, string>,
  ) {
    setMsg(null);
    if (!page) return;
    if (kind === "del" && !confirm("Eliminar esta secção? Cria uma versão antes, se quiseres poder voltar atrás.")) return;
    const f = fd(projectId, page.id, { sectionId, ...(extra ?? {}) });
    let res: ActionResult;
    if (kind === "up" || kind === "down") res = await moveSectionAction(f);
    else if (kind === "dup") res = await duplicateSectionAction(f);
    else if (kind === "del") res = await deleteSectionAction(f);
    else res = await setSectionHiddenAction(f);
    if (!res.ok) setMsg(res.error);
    else if (kind === "del" && selectedId === sectionId) setSelectedId("");
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !page) return;
    const ids = page.sections.map((s) => s.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    void (async () => {
      setMsg(null);
      const res = await reorderSectionsAction(fd(projectId, page.id, { order: JSON.stringify(ids) }));
      if (!res.ok) setMsg(res.error);
    })();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-panel xl:max-h-[calc(100vh-13rem)]">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="font-sans text-sm font-semibold">Secções</p>
          {pages.length > 1 && (
            <div className="flex gap-1">
              {pages.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setPageId(p.id);
                    setSelectedId(p.sections[0]?.id ?? "");
                  }}
                  className={cn(
                    "rounded px-2 py-1 text-[11px]",
                    p.id === pageId ? "bg-panel2 text-ink" : "text-ink-faint hover:text-ink",
                  )}
                >
                  {p.title}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={(page?.sections ?? []).map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-1">
                {(page?.sections ?? []).map((s) => (
                  <SortableRow
                    key={s.id}
                    section={s}
                    selected={s.id === selectedId}
                    onSelect={() => setSelectedId(s.id)}
                    handlers={{
                      onMove: (id, dir) => runAction(dir, id),
                      onDuplicate: (id) => runAction("dup", id),
                      onDelete: (id) => runAction("del", id),
                      onToggleHidden: (id, bp) =>
                        runAction("hide", id, { breakpoint: bp, hidden: String(!s.hidden[bp]) }),
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          {msg && (
            <p role="alert" className="mt-3 text-[11px] text-error">
              {msg}
            </p>
          )}
        </div>
        {selectedForInspector && (
          <Inspector
            key={page.id + ":" + selectedForInspector.id + ":" + sectionKey}
            section={selectedForInspector}
            pages={pages.map((p) => ({ path: p.path }))}
            assets={assets}
            onSave={handleSave}
          />
        )}
      </div>

      <div className="min-w-0">
        <PreviewFrame src={previewSrc} refreshKey={savedAt ?? 0} />
        <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">
          O preview usa o mesmo pipeline de renderização do deploy: Site Schema → page engine →
          component registry. Nada é pré-renderizado ou emulado.
        </p>
      </div>
    </div>
  );
}
