import { Dumbbell, Pill, Utensils } from 'lucide-react';
import { buildBeforeSleepFacts, type BeforeSleepFact } from '../../../lib/biometrics/ouraBeforeSleep';
import type { DayNightTimeline } from '../../../lib/biometrics/ouraDayTimeline.types';

const ICONS: Record<BeforeSleepFact['key'], typeof Utensils> = {
  meal: Utensils,
  workout: Dumbbell,
  supplements: Pill,
};

/** What happened before bedtime, from logged data only (no causal claims). */
export function OuraBeforeSleep({ timeline }: { timeline: DayNightTimeline }) {
  const facts = buildBeforeSleepFacts(timeline);
  return (
    <ul className="grid gap-2 sm:grid-cols-3" aria-label="Co było przed snem">
      {facts.map((fact) => {
        const Icon = ICONS[fact.key];
        return (
          <li key={fact.key} className="flex min-w-0 items-start gap-3 rounded-xl border border-border-custom/40 bg-surface-1 p-3">
            <Icon size={16} className="mt-0.5 shrink-0 text-text-muted" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs text-text-muted">{fact.label}</p>
              <p className="mt-0.5 truncate text-sm text-text-primary" title={fact.value}>{fact.value}</p>
              {fact.hint && <p className="mt-0.5 text-xs tabular-nums text-text-secondary">{fact.hint}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
