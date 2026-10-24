import { Lightbulb } from 'lucide-react';
import { buildWeekInsights } from '../../lib/weekInsights';
import type { WinsDayCell } from '../../lib/weeklyWinsMap';

/** Facts from the user's own ratings, plans and opinions of the last 7 days. */
export default function WeeklyWeekInsights({ days, today }: { days: WinsDayCell[]; today: string }) {
  const { insights, categories, scoredDays } = buildWeekInsights(days, today);

  return (
    <section className="space-y-3 rounded-3xl border border-border-custom/60 bg-surface/70 p-4">
      <p className="flex items-center gap-1.5 text-2xs font-semibold tracking-wide text-text-muted">
        <Lightbulb size={12} className="text-primary" /> Wnioski z 7 dni
      </p>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <span
              key={c.category}
              className="rounded-full bg-surface-solid/50 px-2.5 py-1 text-2xs font-semibold tabular-nums text-text-secondary"
            >
              {c.label} {c.done}/{c.planned}
            </span>
          ))}
        </div>
      )}

      {insights.length === 0 ? (
        <p className="text-sm text-text-secondary">
          {scoredDays < 2
            ? 'Za mało ocen dnia, żeby coś wywnioskować. Oceniaj dzień w domknięciu, a pokażę wzorce.'
            : 'Nic się wyraźnie nie wyróżnia w tych 7 dniach.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {insights.map((insight) => (
            <li key={insight.id}>
              <p className="text-sm font-semibold leading-snug text-text-primary">{insight.title}</p>
              <p className="mt-0.5 text-xs leading-snug text-text-muted">{insight.detail}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
