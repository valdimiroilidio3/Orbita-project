import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsSectionLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
      <span className="sr-only">A carregar definições…</span>
    </div>
  );
}
