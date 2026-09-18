import { CheckSquare } from 'lucide-react';
import { useWeeklyWinsMap } from '../../lib/weeklyWinsMap';
import { useUserId } from '../../store/useStore';

export default function WeeklyWinsMap() {
  const userId = useUserId();
  const { data, isLoading } = useWeeklyWinsMap(userId ?? '');
  if (!userId) return null;

  const wins = data?.filter((d) => d.status === 'win').length ?? 0;
  const tasksDone = (data ?? []).reduce((s, d) => s + d.doneCount, 0);
  const tasksSet = (data ?? []).reduce((s, d) => s + d.plannedCount, 0);
  const daysActive = (data ?? []).filter((d) => d.doneCount > 0 || d.plannedCount > 0).length;
  const winPct = Math.round((wins / 7) * 100);

  return (
    <section className="rounded-3xl border border-border-custom/60 bg-surface/70 p-4.5 space-y-4 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-2xs font-black uppercase tracking-widest text-text-muted">
            <CheckSquare size={12} className="text-primary" /> Dyscyplina · 7 dni
          </p>
          <h3 className="mt-1 text-base font-bold text-text-primary">
            {isLoading ? 'Ładuję przebieg…' : `${wins}/7 dni z 5/5`}
          </h3>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-2xs font-black uppercase tracking-wider ${
            winPct >= 70
              ? 'bg-success/15 text-success'
              : winPct >= 40
                ? 'bg-primary/15 text-primary'
                : 'bg-warning/15 text-warning'
          }`}
        >
          {winPct}% wygranych
        </span>
      </div>

      {/* Hero Stats */}
      <div className="rounded-2xl border border-border-custom/40 bg-surface/50 p-3 space-y-2">
        <div className="flex items-baseline justify-between">
          <p className="text-2xl font-black tracking-tight text-text-primary">
            {tasksDone}
            <span className="text-xs font-bold text-text-muted ml-1">/ {tasksSet || 35} zadań</span>
          </p>
          <span className="text-xs font-semibold text-text-secondary">
            {daysActive}/7 dni aktywnych
          </span>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border-custom/30">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              winPct >= 70 ? 'bg-success' : 'bg-primary'
            }`}
            style={{ width: `${winPct}%` }}
          />
        </div>
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
              className={`flex aspect-square w-full max-w-11 items-center justify-center rounded-xl border text-xs font-black ui-interactive ${
                cellClass(day.status)
              }`}
            >
              {day.status === 'open' && day.doneCount > 0 ? day.doneCount : null}
            </div>
            <span className="text-2xs font-bold uppercase tracking-wider text-text-muted">{day.label}</span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-2xs font-bold text-text-muted border-t border-border-custom/30 pt-3">
        <span className="flex items-center gap-1.5">
          <span className={`inline-block h-3 w-3 rounded-sm border ${cellClass('win')}`} /> 5/5 wygrany
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`inline-block h-3 w-3 rounded-sm border ${cellClass('loss')}`} /> nie / brak
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm border border-border-custom bg-surface" /> dziś
        </span>
      </div>
    </section>
  );
}

function cellClass(status: 'win' | 'loss' | 'open'): string {
  if (status === 'win') return 'border-dayC/50 bg-dayC/20 text-dayC';
  if (status === 'loss') return 'border-dayB/50 bg-dayB/20 text-dayB';
  return 'border-border-custom bg-surface text-text-muted';
}
