import { Target } from 'lucide-react';
import type { BenchGoal } from '../../../lib/health/benchGoal';

const STATUS_LINE: Record<BenchGoal['status'], (goal: BenchGoal) => string> = {
  'no-data': () => 'Zaloguj wyciskanie płaskie, a pokażę, jak daleko jest do celu.',
  'few-sessions': (g) => `Zostało ${g.remainingKg} kg. Prognozę podam po 4 sesjach rozłożonych na 3 tygodnie (masz ${g.sessions}).`,
  reached: () => 'Cel osiągnięty. Czas na nowy.',
  flat: (g) => `Zostało ${g.remainingKg} kg. Trend jest płaski, więc przy obecnym tempie cel się nie zbliża.`,
  'on-track': (g) => `Zostało ${g.remainingKg} kg. Przy tempie ${String(g.weeklyGainKg).replace('.', ',')} kg na tydzień cel wypada około ${g.etaDate}.`,
};

/** Cel w wyciskaniu (e1RM, z `lifeGoals`) i jak daleko do niego. Prognoza tylko przy wystarczającej liczbie sesji. */
export default function TrainingHubGoal({ goal }: { goal: BenchGoal | undefined }) {
  if (!goal) return null;
  return (
    <section className="trening-panel rounded-[var(--tren-radius-card)] space-y-2 px-3.5 py-3" aria-label="Cel w wyciskaniu">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-2xs font-semibold tracking-normal text-text-muted">
          <Target size={12} className="text-primary" /> Cel: {goal.goalKg} kg w wyciskaniu (e1RM)
        </span>
        {goal.bestE1rm != null && <span className="text-sm font-semibold tabular-nums text-primary">{Math.round(goal.bestE1rm)} kg</span>}
      </div>
      {goal.pct != null && (
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={goal.pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-primary" style={{ width: `${goal.pct}%` }} />
        </div>
      )}
      <p className="text-xs leading-snug text-text-secondary">{STATUS_LINE[goal.status](goal)}</p>
    </section>
  );
}
