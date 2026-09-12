import { Pressable } from '../ui/ControlPrimitives';
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toLocalISO, todayStr, getISOWeekNumber } from './calendarHelpers';
import { getMoonPhase } from '../../lib/solar';
import { Card } from '../ui/Card';

interface MiniCalendarProps {
  selectedDay: string;
  onSelectDay: (day: string) => void;
  eventDatesSet?: Set<string>;
}

export default function MiniCalendar({ selectedDay, onSelectDay, eventDatesSet }: MiniCalendarProps) {
  const [currentDate, setCurrentDate] = useState(() => {
    const [y, m] = selectedDay.split('-').map(Number);
    return new Date(y, m - 1, 1);
  });

  useEffect(() => {
    const [y, m] = selectedDay.split('-').map(Number);
    void (async () => { setCurrentDate(new Date(y, m - 1, 1)); })();
  }, [selectedDay]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  const daysGrid: { dayStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dNum = prevMonthTotalDays - i;
    const prevMonthDate = new Date(year, month - 1, dNum);
    daysGrid.push({
      dayStr: toLocalISO(prevMonthDate),
      dayNum: dNum,
      isCurrentMonth: false,
    });
  }

  for (let i = 1; i <= totalDays; i++) {
    const curDate = new Date(year, month, i);
    daysGrid.push({
      dayStr: toLocalISO(curDate),
      dayNum: i,
      isCurrentMonth: true,
    });
  }

  const remainingSlots = 42 - daysGrid.length;
  for (let i = 1; i <= remainingSlots; i++) {
    const nextMonthDate = new Date(year, month + 1, i);
    daysGrid.push({
      dayStr: toLocalISO(nextMonthDate),
      dayNum: i,
      isCurrentMonth: false,
    });
  }

  const monthNames = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
  ];

  const today = todayStr();

  return (
    <Card
      variant="outline"
      padding="0.75rem"
      className="!bg-surface-solid/5 dark:!bg-on-accent/[0.015] !border-border-custom/30 space-y-2.5 shadow-sm select-none overflow-hidden"
      style={{ borderRadius: 'var(--radius-md)' }}
    >
      <div className="flex items-center justify-between px-0.5">
        <span className="text-xs sm:text-sm font-black text-text-primary tracking-wide">
          {monthNames[month]} {year}
        </span>
        <div className="flex gap-1 items-center">
          <Pressable
            onClick={handlePrevMonth}
            aria-label="Poprzedni miesiąc"
            className="h-7 w-7 p-0 rounded-lg hover:bg-surface-2 active:scale-90 transition-all flex items-center justify-center border border-border-custom/20"
          >
            <ChevronLeft size={13} className="text-text-muted hover:text-text-primary" />
          </Pressable>
          <Pressable
            onClick={handleNextMonth}
            aria-label="Następny miesiąc"
            className="h-7 w-7 p-0 rounded-lg hover:bg-surface-2 active:scale-90 transition-all flex items-center justify-center border border-border-custom/20"
          >
            <ChevronRight size={13} className="text-text-muted hover:text-text-primary" />
          </Pressable>
        </div>
      </div>

      <div className="grid grid-cols-[16px_repeat(7,minmax(0,1fr))] gap-x-0.5 gap-y-1 text-center items-center">
        <span className="text-3xs font-black text-text-muted/40 uppercase self-center">T.</span>
        {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'].map((d, idx) => (
          <span key={idx} className="text-3xs font-bold text-text-muted/60 uppercase tracking-wider">
            {d}
          </span>
        ))}
        {Array.from({ length: 6 }).map((_, rowIdx) => {
          const rowDays = daysGrid.slice(rowIdx * 7, (rowIdx + 1) * 7);
          const weekNum = getISOWeekNumber(rowDays[0].dayStr);

          return (
            <React.Fragment key={rowIdx}>
              <span className="text-3xs font-black text-text-muted/35 flex items-center justify-center tabular-nums">
                {weekNum}
              </span>
              {rowDays.map((item, idx) => {
                const isSelected = item.dayStr === selectedDay;
                const isToday = item.dayStr === today;
                const hasEvents = eventDatesSet?.has(item.dayStr);
                const moon = getMoonPhase(item.dayStr);
                const showMoon = moon.isMajor && item.isCurrentMonth;

                return (
                  <div key={idx} className="relative flex flex-col items-center">
                    <Pressable
                      onClick={() => onSelectDay(item.dayStr)}
                      title={showMoon ? `${item.dayStr} · ${moon.name}` : item.dayStr}
                      className={`h-7 w-7 sm:h-7.5 sm:w-7.5 mx-auto rounded-full flex items-center justify-center text-xs transition-all duration-150 active:scale-90 ${
                        isSelected
                          ? 'bg-primary text-on-accent font-black shadow-xs scale-105'
                          : isToday
                          ? 'border border-primary text-primary font-bold hover:bg-primary/10'
                          : item.isCurrentMonth
                          ? 'text-text-primary hover:bg-surface-2 font-medium'
                          : 'text-text-muted/30 hover:bg-surface-2/60'
                      }`}
                    >
                      {item.dayNum}
                    </Pressable>
                    <div className="h-1.5 flex items-center justify-center mt-0.5">
                      {showMoon ? (
                        <span
                          className="text-3xs leading-none opacity-80"
                          title={moon.name}
                        >
                          {moon.emoji}
                        </span>
                      ) : hasEvents ? (
                        <span className="h-1 w-1 rounded-full bg-primary" />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    </Card>
  );
}
