import { Check } from 'lucide-react';
import { getTodayWarsaw } from '../../../lib/date';
import { useDailySnapshotQuery } from '../../../lib/dailySnapshotApi';

function dayParts(date: string): { weekday: string; day: string } {
  const at = new Date(`${date}T12:00:00`);
  return {
    weekday: new Intl.DateTimeFormat('pl-PL', { weekday: 'short' }).format(at),
    day: String(at.getDate()),
  };
}

/** Pasek ostatnich 7 dni: ptaszek oznacza dzień z oceną (dane z Domknięcia dnia). */
export default function ChronicleWeekStrip({ userId }: { userId: string }) {
  const today = getTodayWarsaw();
  const { data } = useDailySnapshotQuery(userId, today);
  const days = data?.weekDays ?? [];
  if (days.length === 0) return null;
  const scored = days.filter(day => day.scored).length;
  return (
    <section aria-label={`Dni z oceną w ostatnim tygodniu: ${scored} z 7`} className="space-y-2">
      <div className="grid grid-cols-7 gap-1">
        {days.map(day => {
          const { weekday, day: dayNumber } = dayParts(day.date);
          const isToday = day.date === today;
          return (
            <div key={day.date} className={`flex flex-col items-center gap-1.5 rounded-full px-1 py-2 ${isToday ? 'bg-surface-solid shadow-xs' : ''}`}>
              <span className="text-2xs font-medium text-text-muted">{weekday}</span>
              <span className={`text-xs font-semibold tabular-nums ${isToday ? 'text-primary' : 'text-text-primary'}`}>{dayNumber}</span>
              <span className={`flex h-6 w-6 items-center justify-center rounded-full ${day.scored ? 'bg-success/20 text-success' : 'border border-border-custom'}`}>
                {day.scored && <Check size={13} strokeWidth={3} aria-hidden="true" />}
              </span>
            </div>
          );
        })}
      </div>
      <p className="px-1 text-xs text-text-secondary">Dni z oceną w tym tygodniu: {scored} z 7. Ocenę dodajesz w Domknięciu dnia.</p>
    </section>
  );
}
