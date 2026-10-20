import { progressPct, type LearningAssignment } from '../../../lib/learning/learningModel';

const MONTH_NAMES = [
  'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
  'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień',
];

function monthLabel(monthStart: string): string {
  const name = MONTH_NAMES[Number(monthStart.slice(5, 7)) - 1] ?? monthStart;
  return `${name} ${monthStart.slice(0, 4)}`;
}

function outcome(item: LearningAssignment): { label: string; tone: string } {
  if (item.status === 'dropped') return { label: 'Odpuszczone', tone: 'text-text-muted' };
  return { label: `Niedokończone (${progressPct(item)}%)`, tone: 'text-warning' };
}

/** Z poprzednich miesięcy tylko to, co się nie udało. Ukończone są na półce w bibliotece. */
export default function LearningHistorySection({ items }: { items: LearningAssignment[] }) {
  if (!items.length) return null;
  const byMonth = new Map<string, LearningAssignment[]>();
  for (const item of items) byMonth.set(item.month_start, [...(byMonth.get(item.month_start) ?? []), item]);

  return (
    <details className="rounded-2xl border border-border-custom/40 bg-surface/30 p-4">
      <summary className="cursor-pointer text-sm font-black text-text-primary">Niedokończone i odpuszczone</summary>
      <div className="mt-3 space-y-4">
        {[...byMonth.entries()].map(([month, list]) => (
          <section key={month} aria-label={monthLabel(month)}>
            <h3 className="text-3xs font-black uppercase tracking-wider text-text-muted">{monthLabel(month)}</h3>
            <ul className="mt-1.5 space-y-1">
              {list.map((item) => {
                const { label, tone } = outcome(item);
                return (
                  <li key={item.id} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-text-primary">{item.title}</span>
                    <span className={`shrink-0 text-xs font-bold ${tone}`}>{label}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </details>
  );
}
