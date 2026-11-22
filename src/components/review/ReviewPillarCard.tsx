import { Dumbbell, Minus, Sparkles, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Pressable } from '../ui/ControlPrimitives';
import { averageScore, type GoalStatus, type Pillar, type ReviewContext } from '../../lib/goal/reviewCycle.data';
import { tasksByPillar } from '../../lib/goal/reviewWeekInsights';
import ReviewGoalStatus from './ReviewGoalStatus';
import { TaskChips } from './ReviewSprintGoals';

const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const PILLAR_ICONS: Record<Pillar, React.ComponentType<{ size?: number; className?: string }>> = {
  cialo: Dumbbell,
  duch: Sparkles,
  konto: Wallet,
};

function scoreTone(value: number) {
  if (value <= 3) return 'bg-danger text-on-accent border-danger';
  if (value <= 6) return 'bg-warning text-scrim border-warning';
  return 'bg-success text-on-accent border-success';
}

const CHIP = 'rounded bg-surface-2 px-2 py-0.5 text-2xs';

function DeltaBadge({ delta }: { delta: number }) {
  const tone = delta > 0 ? 'bg-success/15 text-success' : delta < 0 ? 'bg-danger/15 text-danger' : 'bg-surface-2 text-text-muted';
  return (
    <span className={`inline-flex items-center gap-0.5 rounded px-2 py-0.5 text-2xs font-bold ${tone}`}>
      {delta > 0 && (
        <>
          <TrendingUp size={11} /> +{delta} ↗
        </>
      )}
      {delta < 0 && (
        <>
          <TrendingDown size={11} /> {delta} ↘
        </>
      )}
      {delta === 0 && (
        <>
          <Minus size={11} /> = bez zmian
        </>
      )}
    </span>
  );
}

/**
 * Jeden filar na ekran: cel sprintu, cel, z którym wszedłeś, zadania tego tygodnia, rozliczenie i ocena.
 * Nowy cel ustawiasz dopiero w kroku „Kontrakt”, więc tu tylko patrzysz wstecz i oceniasz.
 */
export default function ReviewPillarCard({
  pillar,
  label,
  position,
  context,
  score,
  status,
  onScore,
  onStatus,
}: {
  pillar: Pillar;
  label: string;
  /** „1/3”: który to filar z trzech. */
  position: string;
  context: ReviewContext | undefined;
  score: number | undefined;
  status: GoalStatus | undefined;
  onScore: (value: number) => void;
  onStatus: (status: GoalStatus) => void;
}) {
  const Icon = PILLAR_ICONS[pillar];
  const sprintGoal = context?.sprintGoals?.goals[pillar];
  const previous = context?.previousGoals?.[pillar];
  const average = context ? averageScore(context.weekScores, pillar) : null;
  const lastScore = context?.lastWeekScores?.[pillar];
  const monthScore = context?.monthAgoScores?.[pillar];
  const delta = score !== undefined && lastScore !== undefined ? score - lastScore : null;
  const tasks = context?.tasks ? tasksByPillar(context.tasks)[pillar] : null;

  return (
    <section className="space-y-4" aria-label={`Rozliczenie: ${label}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 text-primary">
            <Icon size={18} />
          </div>
          <h3 className="text-lg font-bold text-text-primary">{label}</h3>
        </div>
        <span className="text-2xs font-semibold text-text-muted">Filar {position}</span>
      </div>

      {sprintGoal && (
        <p className="rounded-lg bg-primary/5 p-3 text-xs leading-snug text-text-primary">
          <span className="block text-2xs font-bold text-primary">Cel sprintu</span>
          {sprintGoal}
        </p>
      )}

      <div className="space-y-2 rounded-xl border border-border-custom bg-surface p-3 shadow-sm">
        <span className="block text-2xs font-bold text-text-muted">Cel, który miałeś</span>
        {previous ? (
          <>
            <p className="text-sm leading-snug text-text-primary">{previous}</p>
            <ReviewGoalStatus value={status} onChange={onStatus} />
          </>
        ) : (
          <p className="text-xs italic text-text-muted">Na ten tydzień nie ustawiłeś celu dla tego filaru.</p>
        )}
      </div>

      {tasks && (
        <div className="space-y-1.5">
          <span className="block text-2xs font-bold text-text-muted">Zadania tego tygodnia</span>
          <TaskChips tasks={tasks} empty="Żadne zadanie w tym tygodniu nie pracowało na ten filar." />
        </div>
      )}

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <span className="text-xs font-semibold text-text-secondary">Twoja ocena filaru (1–10)</span>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {lastScore !== undefined && (
              <span className={`${CHIP} text-text-secondary`}>
                Tydzień temu: <strong className="text-text-primary">{lastScore}/10</strong>
              </span>
            )}
            {monthScore !== undefined && (
              <span className={`${CHIP} text-text-secondary`}>
                Miesiąc temu: <strong className="text-text-primary">{monthScore}/10</strong>
              </span>
            )}
            {average !== null && <span className={`${CHIP} text-text-muted`}>średnio w tygodniach: {average}</span>}
            {delta !== null && <DeltaBadge delta={delta} />}
          </div>
        </div>
        <div role="group" aria-label={`Stan: ${label}`} className="grid grid-cols-10 gap-1">
          {SCORES.map((value) => {
            const active = score === value;
            return (
              <Pressable
                key={value}
                type="button"
                aria-label={`${label} ${value}`}
                aria-pressed={active}
                onClick={() => onScore(value)}
                className={`ui-interactive min-h-11 rounded-md border text-xs font-semibold ${
                  active ? scoreTone(value) : 'border-border-custom bg-surface text-text-muted hover:border-text-secondary'
                }`}
              >
                {value}
              </Pressable>
            );
          })}
        </div>
      </div>
    </section>
  );
}
