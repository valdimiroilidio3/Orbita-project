import { cn } from "@/lib/utils/cn";

const STYLES: Record<string, string> = {
  draft: "border-line text-ink-dim",
  generating: "border-amber-500/40 text-amber-300",
  editing: "border-sky-500/40 text-sky-300",
  ready: "border-accent/40 text-accent",
  deploying: "border-amber-500/40 text-amber-300",
  published: "border-emerald-500/40 text-emerald-300",
  archived: "border-line text-ink-faint",
};

export function StatusChip({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 font-sans text-[11px] uppercase tracking-wider",
        STYLES[status] ?? STYLES.draft,
      )}
    >
      {status}
    </span>
  );
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `há ${days} d`;
  return new Date(iso).toLocaleDateString("pt-PT");
}
