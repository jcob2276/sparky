import { Target, Award } from 'lucide-react';
import type { BenchGoal } from '../../../lib/health/benchGoal';

const STATUS_LINE: Record<BenchGoal['status'], (goal: BenchGoal) => string> = {
  'no-data': () => 'Zaloguj wyciskanie płaskie, a Sparky wyznaczy e1RM i dystans do celu.',
  'few-sessions': (g) => `Zostało ${g.remainingKg} kg. Dokładniejszą prognozę podam po 4 sesjach w 3 tygodniach (masz ${g.sessions}).`,
  reached: () => '🎉 Cel osiągnięty! 100 kg zaliczone. Czas wyznaczyć nowy kamień milowy.',
  flat: (g) => `Zostało ${g.remainingKg} kg. Chwilowe plateau w e1RM — kolejny mocny bodziec pomoże przełamać barierę.`,
  'on-track': (g) => `Zostało ${g.remainingKg} kg. Przy tempie ${String(g.weeklyGainKg).replace('.', ',')} kg/tydz. cel osiągniesz ok. ${g.etaDate}.`,
};

/** Cel w wyciskaniu (e1RM, z `lifeGoals`) z nowoczesnym wskaźnikiem progresu. */
export default function TrainingHubGoal({ goal }: { goal: BenchGoal | undefined }) {
  if (!goal) return null;

  const currentKg = goal.bestE1rm != null ? Math.round(goal.bestE1rm) : 0;
  const pct = goal.pct != null ? Math.min(100, Math.round(goal.pct)) : null;

  return (
    <section
      className="trening-panel rounded-[var(--tren-radius-card)] p-3.5 space-y-3 border-primary/20 bg-gradient-to-br from-surface to-surface-1"
      aria-label="Cel w wyciskaniu"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Target size={15} />
          </div>
          <div className="min-w-0">
            <span className="text-2xs font-bold uppercase tracking-wider text-text-muted block">
              Główny cel siłowy
            </span>
            <h3 className="text-sm font-bold text-text-primary truncate">
              {goal.goalKg} kg w wyciskaniu leżąc
            </h3>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="flex items-baseline gap-1 justify-end">
            <span className="text-lg font-bold font-mono text-primary leading-none">
              {currentKg}
            </span>
            <span className="text-2xs font-semibold text-text-muted">/ {goal.goalKg} kg</span>
          </div>
          {pct != null && (
            <span className="text-2xs font-bold text-text-muted tabular-nums block mt-0.5">
              {pct}% wykonane
            </span>
          )}
        </div>
      </div>

      {pct != null && (
        <div
          className="h-2 overflow-hidden rounded-full bg-surface-3 p-0.5"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 shadow-sm"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      <div className="flex items-start gap-2 rounded-lg bg-surface-1/70 px-2.5 py-2 border border-border-custom/40">
        <Award size={13} className="text-primary shrink-0 mt-0.5" />
        <p className="text-xs leading-snug text-text-secondary font-medium">
          {STATUS_LINE[goal.status](goal)}
        </p>
      </div>
    </section>
  );
}
