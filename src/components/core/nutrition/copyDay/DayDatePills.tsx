import { CalendarDays } from 'lucide-react';
import { Pressable } from '../../../ui/ControlPrimitives';
import { useHaptics } from '../../../../hooks/useHaptics';
import { formatWeekdayWarsaw, formatShortDateWarsaw } from '../../../../lib/date';

import type { RecentDaySummary } from '../../../../lib/health/composerTodayMealsApi';

interface DayDatePillsProps {
  dates: string[];
  selectedDate: string;
  onSelectDate: (d: string) => void;
  targetDate: string;
  yesterday: string;
  summaries?: Record<string, RecentDaySummary>;
  isLoading?: boolean;
}

export default function DayDatePills({
  dates,
  selectedDate,
  onSelectDate,
  targetDate,
  yesterday,
  summaries,
  isLoading,
}: DayDatePillsProps) {
  const haptics = useHaptics();

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between px-0.5">
        <label className="text-2xs font-black uppercase tracking-widest text-text-muted block">
          Wybierz dzień z historii
        </label>
      </div>
      <div
        className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        data-no-swipe-nav="true"
      >
        {dates.map((date) => {
          const isSelected = selectedDate === date;
          const label = date === yesterday ? 'Wczoraj' : formatWeekdayWarsaw(date);
          const shortDate = formatShortDateWarsaw(date);
          const summary = summaries?.[date];

          return (
            <Pressable
              key={date}
              type="button"
              onClick={() => {
                haptics.selection();
                onSelectDate(date);
              }}
              className={`shrink-0 min-w-[80px] flex flex-col items-center justify-center rounded-2xl px-3 py-2 transition-all active:scale-95 ${
                isSelected
                  ? 'bg-primary text-on-accent shadow-sm ring-2 ring-primary/20'
                  : 'border border-border-custom/80 bg-surface-solid/40 text-text-secondary hover:border-primary/40 hover:bg-surface-solid/70 hover:text-text-primary'
              }`}
            >
              <span className="text-xs font-black capitalize tracking-tight leading-tight">{label}</span>
              <span className={`mt-0.5 text-2xs font-bold ${isSelected ? 'text-on-accent/80' : 'text-text-muted'}`}>
                {shortDate}
              </span>
              {summary && summary.totalCalories > 0 ? (
                <span
                  className={`mt-1 inline-flex items-center rounded-md px-1.5 py-0.5 text-3xs font-black leading-none ${
                    isSelected ? 'bg-white/20 text-on-accent' : 'bg-primary/10 text-primary'
                  }`}
                >
                  {summary.totalCalories} kcal
                </span>
              ) : isLoading ? (
                <span className="mt-1 h-3 w-10 rounded-md bg-surface-solid animate-pulse" />
              ) : (
                <span className="mt-1 h-3 text-3xs text-text-muted/40 font-mono">···</span>
              )}
            </Pressable>
          );
        })}

        <label
          className={`shrink-0 min-w-[78px] relative flex flex-col items-center justify-center rounded-2xl px-3 py-2 border border-dashed transition-all cursor-pointer active:scale-95 ${
            !dates.includes(selectedDate)
              ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20 font-black'
              : 'border-border-custom/80 bg-surface-solid/20 text-text-muted hover:border-primary/40 hover:text-text-secondary'
          }`}
          title="Wybierz inną datę z kalendarza"
        >
          <CalendarDays size={14} className="mb-0.5" />
          <span className="text-xs font-bold leading-tight">Kalendarz</span>
          <span className="text-2xs font-medium opacity-70">Wybierz</span>
          <input
            type="date"
            max={targetDate}
            value={selectedDate}
            onChange={(e) => {
              if (e.target.value) {
                haptics.selection();
                onSelectDate(e.target.value);
              }
            }}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </label>
      </div>
    </div>
  );
}
