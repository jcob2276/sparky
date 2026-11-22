import { ControlTextarea } from '../ui/ControlPrimitives';
import { PILLARS, type PillarGoals, type PillarScores, type ReviewContext } from '../../lib/goal/reviewCycle.data';

const TEXTAREA =
  'w-full resize-y rounded-lg border border-border-custom bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-primary/50 focus:outline-none';

/** Krok 3: jedna rzecz na filar na następny okres, z ocenami z kroku 2 i celem sprintu przed oczami. */
export default function ReviewStepContract({
  horizon,
  goals,
  scores,
  note,
  context,
  onGoal,
  onNote,
}: {
  horizon: string;
  goals: Partial<PillarGoals>;
  scores: Partial<PillarScores>;
  note: string;
  context: ReviewContext | undefined;
  onGoal: (pillar: keyof PillarGoals, value: string) => void;
  onNote: (value: string) => void;
}) {
  return (
    <section className="space-y-4" aria-label="Kontrakt na następny okres">
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-text-primary">Kontrakt {horizon}</h3>
        <p className="text-xs leading-relaxed text-text-secondary">Jedna rzecz na filar. Konkretna, taka, którą da się sprawdzić.</p>
      </div>

      {PILLARS.map(({ key, label }) => {
        const sprintGoal = context?.sprintGoals?.goals[key];
        const score = scores[key];
        return (
          <label key={key} className="block space-y-1.5 rounded-xl border border-border-custom bg-surface p-3 shadow-sm">
            <span className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-text-secondary">
                {label}: jedna rzecz {horizon}
              </span>
              {score !== undefined && <span className="text-2xs tabular-nums text-text-muted">ocena {score}/10</span>}
            </span>
            {sprintGoal && <span className="block text-2xs leading-snug text-text-muted">Cel sprintu: {sprintGoal}</span>}
            <ControlTextarea
              value={goals[key] ?? ''}
              onChange={(event) => onGoal(key, event.target.value)}
              rows={2}
              placeholder={`Konkretny cel dźwignia dla filaru ${label}…`}
              className={TEXTAREA}
            />
          </label>
        );
      })}

      <label className="block space-y-1 rounded-xl border border-border-custom bg-surface p-3 shadow-sm">
        <span className="text-xs font-semibold text-text-secondary">Jedno zdanie o tym okresie (opcjonalnie)</span>
        <ControlTextarea
          value={note}
          onChange={(event) => onNote(event.target.value)}
          rows={2}
          placeholder="Twoja osobista lekcja, refleksja lub konkluzja zamykająca ten czas…"
          className={TEXTAREA}
        />
      </label>
    </section>
  );
}
