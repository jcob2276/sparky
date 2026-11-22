import { PILLARS, type GoalStatus, type LadderMonth, type LadderWeek } from '../../lib/goal/reviewCycle.data';

const STATUS_ICON: Record<GoalStatus, string> = { done: '🟢', partial: '🟡', missed: '🔴' };
const STATUS_LABEL: Record<GoalStatus, string> = { done: 'dowiezione', partial: 'częściowo', missed: 'spalone' };

function scoreChipTone(value: number) {
  if (value <= 3) return 'bg-danger/15 text-danger';
  if (value <= 6) return 'bg-warning/20 text-text-primary';
  return 'bg-success/15 text-success';
}

/** Tydzień lub miesiąc tylko do wglądu: cele, z którymi wszedłeś, ocena filaru, rozliczenie i Twoje zdanie. */
export default function ReviewWeekDetail({ period, title }: { period: LadderWeek | LadderMonth; title: string }) {
  const hasAnything =
    period.closed || Object.keys(period.goals).length > 0 || Object.keys(period.scores).length > 0 || period.note;

  return (
    <div className="space-y-2 rounded-lg border border-border-custom/60 bg-surface-2/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-2xs font-bold text-text-secondary">{title}</span>
        <span className="text-2xs text-text-muted">{period.closed ? 'zamknięty' : 'niezamknięty'}</span>
      </div>

      {!hasAnything && <p className="text-2xs italic text-text-muted">Nic nie zapisano w tym okresie.</p>}

      {PILLARS.map(({ key, label }) => {
        const goal = period.goals[key];
        const score = period.scores[key];
        const status = period.goalStatus[key];
        if (!goal && score === undefined) return null;
        return (
          <div key={key} className="space-y-0.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-text-primary">{label}</span>
              <span className="flex items-center gap-1.5">
                {status && (
                  <span className="text-2xs text-text-muted">
                    {STATUS_ICON[status]} {STATUS_LABEL[status]}
                  </span>
                )}
                {score !== undefined && (
                  <span className={`rounded px-1.5 py-0.5 text-2xs font-bold tabular-nums ${scoreChipTone(score)}`}>{score}/10</span>
                )}
              </span>
            </div>
            {goal && <p className="leading-snug text-text-secondary">{goal}</p>}
          </div>
        );
      })}

      {'theme' in period && period.theme && (
        <p className="text-2xs leading-snug text-text-secondary">
          <span className="font-bold">Temat:</span> {period.theme}
        </p>
      )}
      {period.note && <p className="border-l-2 border-primary/40 pl-2 text-2xs italic leading-snug text-text-secondary">„{period.note}”</p>}
    </div>
  );
}
