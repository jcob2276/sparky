import { useState } from 'react';
import { Pressable } from '../ui/ControlPrimitives';
import { PILLARS, type LadderWeek, type ReviewLadder } from '../../lib/goal/reviewCycle.data';
import ReviewWeekDetail from './ReviewWeekDetail';

function cellTone(score: number | undefined) {
  if (score === undefined) return 'bg-surface-2/60';
  if (score <= 3) return 'bg-danger';
  if (score <= 6) return 'bg-warning';
  return 'bg-success';
}

function WeekColumn({ week, selected, onSelect }: { week: LadderWeek; selected: boolean; onSelect: () => void }) {
  return (
    <Pressable
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Tydzień ${week.number}`}
      className={`flex flex-col items-center gap-1 rounded-md p-0.5 touch-manipulation ${
        selected ? 'bg-primary/10 ring-1 ring-primary/50' : ''
      } ${week.future ? 'opacity-40' : ''}`}
    >
      <span className={`text-2xs tabular-nums ${week.current ? 'font-bold text-primary' : 'text-text-muted'}`}>{week.number}</span>
      {PILLARS.map(({ key }) => (
        <span key={key} className={`block h-3.5 w-full rounded-sm ${cellTone(week.scores[key])}`} />
      ))}
    </Pressable>
  );
}

/** Cały sprint na jednym rzucie oka: 12 tygodni × 3 filary (kolor = ocena), klik pokazuje, co wtedy zapisałeś. */
export default function ReviewSprintGrid({ ladder }: { ladder: ReviewLadder }) {
  const initial = ladder.weeks.find((w) => w.current)?.number ?? 1;
  const [selected, setSelected] = useState(initial);
  const week = ladder.weeks.find((w) => w.number === selected);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {PILLARS.map(({ key, label }) => (
          <p key={key} className="text-xs leading-snug text-text-primary">
            <span className="font-bold">{label}:</span>{' '}
            {ladder.goals[key] ?? <span className="italic text-text-muted">brak celu sprintu</span>}
          </p>
        ))}
        {ladder.summary && !ladder.goals.cialo && !ladder.goals.duch && !ladder.goals.konto && (
          <p className="text-xs text-text-secondary">{ladder.summary}</p>
        )}
      </div>

      <div className="flex gap-0.5">
        <div className="flex w-10 shrink-0 flex-col items-end gap-1 pr-1 pt-9 text-2xs text-text-muted">
          {PILLARS.map(({ key, label }) => (
            <span key={key} className="flex h-3.5 items-center">
              {label}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="grid grid-cols-3 gap-0.5">
            {[1, 2, 3].map((m) => (
              <span key={m} className="text-center text-2xs font-semibold text-text-muted">
                Miesiąc {m}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-12 gap-0.5">
            {ladder.weeks.map((w) => (
              <WeekColumn key={w.weekStart} week={w} selected={selected === w.number} onSelect={() => setSelected(w.number)} />
            ))}
          </div>
        </div>
      </div>

      {week && <ReviewWeekDetail period={week} title={`Tydzień ${week.number}/12${week.current ? ' · ten przegląd' : ''}`} />}
    </div>
  );
}
