import { TriangleAlert } from 'lucide-react';

export default function CalendarConflictNotice({ titles }: { titles: string[] }) {
  if (titles.length === 0) return null;
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-warning/40 bg-warning/15 px-3.5 py-2.5 text-xs text-text-primary shadow-2xs">
      <TriangleAlert size={16} className="mt-0.5 shrink-0 text-warning" />
      <p className="leading-snug">
        <strong className="text-warning font-bold">Ten czas jest już zajęty.</strong> Kolizja z:{' '}
        <span className="font-semibold underline decoration-warning/60">{titles.slice(0, 2).join(', ')}</span>. Możesz zapisać mimo to.
      </p>
    </div>
  );
}
