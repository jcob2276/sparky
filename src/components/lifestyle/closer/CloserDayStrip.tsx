import { format, addDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useHaptics } from '../../../hooks/useHaptics';
import type { CloserDailyLogRow } from '../../../lib/closer/closerApi';
import { getTodayWarsaw } from '../../../lib/date';
import { Pressable } from '../../ui/ControlPrimitives';

interface Props {
  weekStart: string;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  logsByDate: Record<string, CloserDailyLogRow>;
}

const DAY_NAMES = ['Pn', 'Wt', 'Śr', 'Czw', 'Pt', 'So', 'Nd'];

export default function CloserDayStrip({
  weekStart,
  selectedDate,
  onSelectDate,
  logsByDate,
}: Props) {
  const haptics = useHaptics();
  const today = getTodayWarsaw();
  const startDate = new Date(weekStart + 'T12:00:00');

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(startDate, i);
    const dateStr = format(d, 'yyyy-MM-dd');
    const dayLabel = DAY_NAMES[i];
    const log = logsByDate[dateStr];
    const isToday = dateStr === today;
    const isSelected = dateStr === selectedDate;
    const hasData = (log?.dials ?? 0) > 0 || (Number(log?.work_hours) ?? 0) > 0 || (log?.appointments ?? 0) > 0 || (log?.sales_calls ?? 0) > 0;

    return {
      dateStr,
      dayLabel,
      dayNum: format(d, 'd'),
      isToday,
      isSelected,
      hasData,
      log,
    };
  });

  return (
    <div className="grid grid-cols-7 gap-1.5 p-1 rounded-2xl bg-surface-raised/40 border border-border-custom/25">
      {days.map((d) => (
        <Pressable
          key={d.dateStr}
          type="button"
          onClick={() => {
            haptics.selection();
            onSelectDate(d.dateStr);
          }}
          className={`relative flex flex-col items-center py-2 px-1 rounded-xl transition-all active:scale-95 ${
            d.isSelected
              ? 'bg-primary text-primary-foreground shadow-sm font-bold'
              : 'hover:bg-surface-solid/10 text-text-muted hover:text-text-primary'
          }`}
        >
          <span className="text-3xs uppercase tracking-wider opacity-80">{d.dayLabel}</span>
          <span className={`text-xs font-black mt-0.5 ${d.isSelected ? 'text-white' : 'text-text-primary'}`}>
            {d.dayNum}
          </span>
          {d.hasData && (
            <span
              className={`mt-1 h-1.5 w-1.5 rounded-full ${
                d.isSelected ? 'bg-white' : 'bg-primary'
              }`}
            />
          )}
          {!d.hasData && <span className="mt-1 h-1.5 w-1.5" />}
        </Pressable>
      ))}
    </div>
  );
}
