"use client";

import { useState } from "react";

export default function PreviewToolbar({ projectUrl }: { projectUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <a
        href={projectUrl}
        target="_blank"
        rel="noreferrer"
        className="rounded border border-line px-2.5 py-1 text-[11px] text-ink-dim hover:text-ink"
      >
        Abrir ↗
      </a>
      <button
        type="button"
        onClick={copy}
        className="rounded border border-line px-2.5 py-1 text-[11px] text-ink-dim hover:text-ink"
      >
        {copied ? "Copiado ✓" : "Copiar link"}
      </button>
    </div>
  );
}
