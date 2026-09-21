import { useEffect, useRef, useMemo } from 'react';
import { Calendar, Flame, Clock } from 'lucide-react';
import { getTodayWarsaw } from '../../../lib/date';
import { Pressable } from '../../ui/ControlPrimitives';

const POLISH_MONTHS_SHORT = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

export interface WorkoutHistoryEntry {
  date: string; // YYYY-MM-DD
  durationMinutes?: number;
  totalTonnage?: number;
}

interface WorkoutActivityHeatmapProps {
  workouts: WorkoutHistoryEntry[];
  onSelectDay?: (date: string) => void;
  className?: string;
}

// eslint-disable-next-line max-lines-per-function
export default function WorkoutActivityHeatmap({
  workouts,
  onSelectDay,
  className = '',
}: WorkoutActivityHeatmapProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const todayStr = getTodayWarsaw();

  // Scroll to the latest weeks on right
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, []);

  const { aggMap, maxMinutes, streakDays, totalWorkouts, totalMinutes } = useMemo(() => {
    const agg: Record<string, { count: number; minutes: number; tonnage: number }> = {};
    let minutesSum = 0;

    for (const w of workouts) {
      const d = w.date.slice(0, 10);
      if (!agg[d]) {
        agg[d] = { count: 0, minutes: 0, tonnage: 0 };
      }
      agg[d].count += 1;
      const min = w.durationMinutes || 45;
      agg[d].minutes += min;
      minutesSum += min;
      agg[d].tonnage += w.totalTonnage || 0;
    }

    const allMins = Object.values(agg).map((a) => a.minutes);
    const maxMin = allMins.length ? Math.max(...allMins) : 60;

    // Calculate recent active streak
    let streak = 0;
    const checkDate = new Date(`${todayStr}T12:00:00Z`);
    for (let i = 0; i < 365; i++) {
      const iso = checkDate.toISOString().slice(0, 10);
      if (agg[iso]?.count) {
        streak++;
      } else if (i > 1) {
        break;
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return {
      aggMap: agg,
      maxMinutes: maxMin,
      streakDays: streak,
      totalWorkouts: workouts.length,
      totalMinutes: minutesSum,
    };
  }, [workouts, todayStr]);

  // Build 52 weeks grid (7 days per week, Monday to Sunday)
  const weeks = useMemo(() => {
    const result: Array<{ weekIdx: number; monthLabel: string; days: Array<{ dateStr: string; level: number; info?: { count: number; minutes: number } }> }> = [];
    const today = new Date(`${todayStr}T12:00:00Z`);
    // Find current week Monday
    const dayOfWeek = (today.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
    const currentMonday = new Date(today);
    currentMonday.setDate(today.getDate() - dayOfWeek);

    const startMonday = new Date(currentMonday);
    startMonday.setDate(currentMonday.getDate() - 51 * 7);

    let lastMonth = -1;

    for (let w = 0; w < 52; w++) {
      const weekStart = new Date(startMonday);
      weekStart.setDate(startMonday.getDate() + w * 7);

      const month = weekStart.getMonth();
      const showMonth = month !== lastMonth && weekStart.getDate() <= 7;
      if (showMonth) lastMonth = month;

      const monthLabel = showMonth
        ? (POLISH_MONTHS_SHORT[weekStart.getMonth()] || '')
        : '';

      const days = [];
      for (let d = 0; d < 7; d++) {
        const dayDate = new Date(weekStart);
        dayDate.setDate(weekStart.getDate() + d);
        const iso = dayDate.toISOString().slice(0, 10);
        const entry = aggMap[iso];

        let level = 0;
        if (entry && entry.minutes > 0) {
          const ratio = entry.minutes / (maxMinutes || 60);
          if (ratio >= 0.75) level = 4;
          else if (ratio >= 0.5) level = 3;
          else if (ratio >= 0.25) level = 2;
          else level = 1;
        }

        days.push({
          dateStr: iso,
          level,
          info: entry,
        });
      }

      result.push({ weekIdx: w, monthLabel, days });
    }

    return result;
  }, [todayStr, aggMap, maxMinutes]);

  const getCellColor = (level: number, isToday: boolean) => {
    const todayRing = isToday ? 'ring-1.5 ring-primary ring-offset-1' : '';
    switch (level) {
      case 4:
        return `bg-emerald-500 border-emerald-400 ${todayRing}`;
      case 3:
        return `bg-emerald-500/70 border-emerald-500/90 ${todayRing}`;
      case 2:
        return `bg-emerald-500/45 border-emerald-500/60 ${todayRing}`;
      case 1:
        return `bg-emerald-500/25 border-emerald-500/40 ${todayRing}`;
      default:
        return `bg-surface/60 border-border-custom/40 hover:bg-surface-solid ${todayRing}`;
    }
  };

  return (
    <div className={`bg-surface/30 border border-border-custom rounded-2xl p-4 flex flex-col space-y-3 ${className}`}>
      {/* Top Stats */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-primary" />
          <span className="text-2xs font-black uppercase tracking-wider text-text-primary">
            Aktywność Treningowa (52 tyg.)
          </span>
        </div>
        <div className="flex items-center gap-3 text-3xs font-mono font-bold text-text-secondary">
          <span className="flex items-center gap-1">
            <Flame size={12} className="text-warning" />
            <strong className="text-text-primary">{streakDays}</strong> dni z rzędu
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} className="text-text-muted" />
            <strong className="text-text-primary">{Math.round(totalMinutes / 60)}</strong> godz.
          </span>
          <span>
            <strong className="text-text-primary">{totalWorkouts}</strong> sesji
          </span>
        </div>
      </div>

      {/* Grid Container */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin scrollbar-thumb-border-custom flex flex-col"
      >
        {/* Month labels row */}
        <div className="flex gap-[3px] ml-6 mb-1 text-3xs font-mono text-text-muted/60 h-3.5">
          {weeks.map((w) => (
            <div key={w.weekIdx} className="w-[11px] shrink-0 overflow-visible truncate">
              {w.monthLabel}
            </div>
          ))}
        </div>

        {/* Heatmap matrix */}
        <div className="flex items-start gap-1">
          {/* Day of week labels */}
          <div className="flex flex-col gap-[3px] text-3xs font-mono text-text-muted/60 shrink-0 select-none pr-1">
            <span className="h-[11px] leading-[11px]">Pn</span>
            <span className="h-[11px] leading-[11px] opacity-0">Wt</span>
            <span className="h-[11px] leading-[11px]">Śr</span>
            <span className="h-[11px] leading-[11px] opacity-0">Cz</span>
            <span className="h-[11px] leading-[11px]">Pt</span>
            <span className="h-[11px] leading-[11px] opacity-0">Sb</span>
            <span className="h-[11px] leading-[11px]">Nd</span>
          </div>

          {/* Week columns */}
          <div className="flex gap-[3px]">
            {weeks.map((week) => (
              <div key={week.weekIdx} className="flex flex-col gap-[3px] shrink-0">
                {week.days.map((day) => {
                  const isToday = day.dateStr === todayStr;
                  const isFuture = day.dateStr > todayStr;
                  const tooltip = day.info
                    ? `${day.dateStr}: ${day.info.count} trening(i) · ${day.info.minutes} min`
                    : day.dateStr;

                  return (
                    <Pressable
                      key={day.dateStr}
                      type="button"
                      disabled={isFuture}
                      onClick={() => onSelectDay?.(day.dateStr)}
                      title={tooltip}
                      className={`w-[11px] h-[11px] rounded-[2px] border transition-transform cursor-pointer hover:scale-125 ${
                        isFuture ? 'opacity-20 pointer-events-none' : ''
                      } ${getCellColor(day.level, isToday)}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
