import { CheckSquare } from 'lucide-react';
import { useWeeklyWinsMap } from '../../lib/weeklyWinsMap';
import { useUserId } from '../../store/useStore';

export default function WeeklyWinsMap() {
  const userId = useUserId();
  const { data, isLoading } = useWeeklyWinsMap(userId ?? '');
  if (!userId) return null;

  const tasksDone = (data ?? []).reduce((s, d) => s + d.doneCount, 0);
  const tasksSet = (data ?? []).reduce((s, d) => s + d.plannedCount, 0);
  const pct = tasksSet > 0 ? Math.round((tasksDone / tasksSet) * 100) : 0;

  return (
    <section className="space-y-3 rounded-3xl border border-border-custom/60 bg-surface/70 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="flex items-center gap-1.5 text-2xs font-semibold tracking-wide text-text-muted">
          <CheckSquare size={12} className="text-primary" /> Pięć zwycięstw · 7 dni
        </p>
        <p className="text-sm font-semibold text-text-primary">
          {isLoading ? '…' : tasksSet > 0 ? `${tasksDone} z ${tasksSet} zadań` : 'brak zadań'}
        </p>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border-custom/30">
        <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {(data ??
          Array.from({ length: 7 }, (_, i) => ({
            date: `p-${i}`,
            label: '·',
            result: null,
            doneCount: 0,
            plannedCount: 0,
            status: 'open' as const,
          }))
        ).map((day) => (
          <div key={day.date} className="flex flex-col items-center gap-1.5">
            <div
              title={`${day.date}: ${day.doneCount}/${day.plannedCount || 5}${
                day.result ? ` · ${day.result}` : ''
              }`}
              className={`flex aspect-square w-full max-w-11 items-center justify-center rounded-xl border text-xs font-semibold ui-interactive ${
                cellClass(day.status)
              }`}
            >
              {day.status === 'open' && day.doneCount > 0 ? day.doneCount : null}
            </div>
            <span className="text-2xs font-bold tracking-wide text-text-muted">{day.label}</span>
          </div>
        ))}
      </div>

    </section>
  );
}

function cellClass(status: 'win' | 'loss' | 'open'): string {
  if (status === 'win') return 'border-dayC/50 bg-dayC/20 text-dayC';
  if (status === 'loss') return 'border-dayB/50 bg-dayB/20 text-dayB';
  return 'border-border-custom bg-surface text-text-muted';
}
