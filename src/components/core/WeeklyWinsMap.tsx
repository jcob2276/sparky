import { useState } from 'react';
import { CheckSquare } from 'lucide-react';
import { useWeeklyWinsMap, type WinsDayCell } from '../../lib/weeklyWinsMap';
import { getTodayWarsaw, getYesterdayWarsaw } from '../../lib/date';
import { useUserId } from '../../store/useStore';
import { Pressable } from '../ui/ControlPrimitives';
import WeeklyDayDetail from './WeeklyDayDetail';
import WeeklyWeekInsights from './WeeklyWeekInsights';

export default function WeeklyWinsMap() {
  const userId = useUserId();
  const { data, isLoading } = useWeeklyWinsMap(userId ?? '');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  if (!userId) return null;

  const today = getTodayWarsaw();
  const tasksDone = (data ?? []).reduce((s, d) => s + d.doneCount, 0);
  const tasksSet = (data ?? []).reduce((s, d) => s + d.plannedCount, 0);
  const pct = tasksSet > 0 ? Math.round((tasksDone / tasksSet) * 100) : 0;
  const selected = data?.find((d) => d.date === selectedDate) ?? null;

  return (
    <div className="space-y-3">
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

        <div className="grid grid-cols-7 gap-1">
          {(data ?? []).map((day) => (
            <DayCell
              key={day.date}
              day={day}
              selected={day.date === selectedDate}
              onSelect={() => setSelectedDate((prev) => (prev === day.date ? null : day.date))}
            />
          ))}
        </div>
        <p className="text-2xs font-medium text-text-muted">
          {selected ? 'Dotknij ponownie, żeby zwinąć.' : 'Dotknij dnia: zobaczysz plan, ocenę i swoją opinię. Liczba w kółku to ocena dnia.'}
        </p>
      </section>

      {selected && <WeeklyDayDetail day={selected} today={today} yesterday={getYesterdayWarsaw()} />}
      {data && <WeeklyWeekInsights days={data} today={today} />}
    </div>
  );
}

function DayCell({ day, selected, onSelect }: { day: WinsDayCell; selected: boolean; onSelect: () => void }) {
  const shown = day.score ?? (day.status === 'open' && day.doneCount > 0 ? day.doneCount : null);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <Pressable
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`${day.label}, ${day.doneCount} z ${day.plannedCount || 5} zadań${day.score != null ? `, ocena ${day.score}` : ''}`}
        className={`flex aspect-square w-full max-w-11 items-center justify-center rounded-xl border text-xs font-semibold ui-interactive active:scale-95 ${cellClass(day.status)} ${
          selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
        }`}
      >
        {shown}
      </Pressable>
      <span className="text-2xs font-bold tracking-wide text-text-muted">{day.label}</span>
    </div>
  );
}

function cellClass(status: 'win' | 'loss' | 'open'): string {
  if (status === 'win') return 'border-dayC/50 bg-dayC/20 text-dayC';
  if (status === 'loss') return 'border-dayB/50 bg-dayB/20 text-dayB';
  return 'border-border-custom bg-surface text-text-muted';
}
