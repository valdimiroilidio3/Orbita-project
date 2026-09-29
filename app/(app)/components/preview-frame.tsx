"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

const VIEWPORTS = [
  { id: "desktop", label: "Desktop", width: 1280 },
  { id: "tablet", label: "Tablet", width: 768 },
  { id: "mobile", label: "Mobile", width: 390 },
] as const;

type ViewportId = (typeof VIEWPORTS)[number]["id"];

export default function PreviewFrame({
  src,
  refreshKey,
  height = "calc(100vh - 16rem)",
  withToolbar = true,
}: {
  src: string;
  refreshKey?: string | number;
  height?: string;
  withToolbar?: boolean;
}) {
  const [viewport, setViewport] = useState<ViewportId>("desktop");
  const [bust, setBust] = useState(0);
  const active = VIEWPORTS.find((v) => v.id === viewport)!;

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-panel">
      {withToolbar && (
        <div className="flex items-center justify-between border-b border-line px-3 py-1.5">
          <div className="flex gap-1">
            {VIEWPORTS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setViewport(v.id)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs transition-colors",
                  viewport === v.id ? "bg-panel2 text-ink" : "text-ink-dim hover:text-ink",
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setBust((b) => b + 1)}
            title="Atualizar preview"
            className="rounded px-2 py-1 text-xs text-ink-dim transition-colors hover:text-ink"
          >
            ↻ Atualizar
          </button>
        </div>
      )}
      <div className="flex-1 overflow-auto p-4">
        <div className="mx-auto" style={{ width: active.width, maxWidth: "100%" }}>
          <iframe
            key={`${viewport}-${refreshKey ?? 0}-${bust}`}
            src={src}
            title="Preview do website"
            className="rounded border border-line bg-white"
            style={{ width: active.width, height, border: "1px solid var(--color-line)", display: "block" }}
          />
        </div>
      </div>
    </div>
  );
}
