import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, History } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';
import { useHaptics } from '../../../hooks/useHaptics';
import { shiftDateStr } from '../../../lib/date';

interface MealDatePickerPopoverProps {
  logDate: string;
  today: string;
  yesterday: string;
  onSelectDate: (date: string) => void;
  onClose: () => void;
}

const MONTH_NAMES = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];

const WEEKDAY_SHORT = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];

function toDateKey(year: number, month: number, day: number): string {
  const y = year;
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildCalendarMonthCells(viewYear: number, viewMonth: number) {
  const firstDayOfMonth = new Date(Date.UTC(viewYear, viewMonth, 1));
  const startingDayOfWeek = (firstDayOfMonth.getUTCDay() + 6) % 7; // Monday = 0
  const daysInCurrentMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
  const daysInPrevMonth = new Date(Date.UTC(viewYear, viewMonth, 0)).getUTCDate();

  const cells: { key: string; dayNum: number; isCurrentMonth: boolean }[] = [];

  // Previous month padding
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const [prevY, prevM] = viewMonth === 0 ? [viewYear - 1, 11] : [viewYear, viewMonth - 1];
    cells.push({ key: toDateKey(prevY, prevM, day), dayNum: day, isCurrentMonth: false });
  }

  // Current month days
  for (let day = 1; day <= daysInCurrentMonth; day++) {
    cells.push({ key: toDateKey(viewYear, viewMonth, day), dayNum: day, isCurrentMonth: true });
  }

  // Next month padding to fill grid
  const remainder = 35 - cells.length > 0 ? 35 - cells.length : 42 - cells.length;
  for (let day = 1; day <= remainder; day++) {
    const [nextY, nextM] = viewMonth === 11 ? [viewYear + 1, 0] : [viewYear, viewMonth + 1];
    cells.push({ key: toDateKey(nextY, nextM, day), dayNum: day, isCurrentMonth: false });
  }

  return cells;
}

function PopoverHeader({
  monthName,
  year,
  onPrev,
  onNext,
  nextDisabled,
}: {
  monthName: string;
  year: number;
  onPrev: () => void;
  onNext: () => void;
  nextDisabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between pb-2.5 border-b border-border-custom/50">
      <div className="flex items-center gap-1.5">
        <Calendar size={14} className="text-primary" />
        <h4 className="text-xs font-black uppercase tracking-wider text-text-primary">
          {monthName} {year}
        </h4>
      </div>
      <div className="flex items-center gap-1">
        <Pressable
          type="button"
          onClick={onPrev}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-custom/60 bg-surface-solid/50 text-text-secondary hover:text-text-primary hover:border-primary/40 active:scale-95 transition-all cursor-pointer"
          aria-label="Poprzedni miesiąc"
        >
          <ChevronLeft size={14} />
        </Pressable>
        <Pressable
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-custom/60 bg-surface-solid/50 text-text-secondary hover:text-text-primary hover:border-primary/40 active:scale-95 disabled:opacity-[var(--opacity-40)] disabled:cursor-not-allowed transition-all cursor-pointer"
          aria-label="Następny miesiąc"
        >
          <ChevronRight size={14} />
        </Pressable>
      </div>
    </div>
  );
}

function PopoverShortcuts({
  today,
  logDate,
  onPick,
}: {
  today: string;
  logDate: string;
  onPick: (date: string) => void;
}) {
  const twoDaysAgo = shiftDateStr(today, -2);
  const threeDaysAgo = shiftDateStr(today, -3);

  return (
    <div className="grid grid-cols-2 gap-1.5 py-2.5 border-b border-border-custom/40">
      <Pressable
        type="button"
        onClick={() => onPick(twoDaysAgo)}
        className={`flex items-center justify-center gap-1 rounded-xl border px-2 py-1.5 text-2xs font-bold transition-all active:scale-95 cursor-pointer ${
          logDate === twoDaysAgo
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border-custom/60 bg-surface-solid/30 text-text-secondary hover:border-primary/30'
        }`}
      >
        <History size={11} className="text-text-muted" />
        <span>Przedwczoraj</span>
      </Pressable>
      <Pressable
        type="button"
        onClick={() => onPick(threeDaysAgo)}
        className={`flex items-center justify-center gap-1 rounded-xl border px-2 py-1.5 text-2xs font-bold transition-all active:scale-95 cursor-pointer ${
          logDate === threeDaysAgo
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border-custom/60 bg-surface-solid/30 text-text-secondary hover:border-primary/30'
        }`}
      >
        <History size={11} className="text-text-muted" />
        <span>3 dni temu</span>
      </Pressable>
    </div>
  );
}

export default function MealDatePickerPopover({
  logDate,
  today,
  onSelectDate,
  onClose,
}: MealDatePickerPopoverProps) {
  const haptics = useHaptics();
  const popoverRef = useRef<HTMLDivElement>(null);

  const initialKey = logDate || today;
  const [initY, initM] = initialKey.split('-').map(Number);
  const [viewYear, setViewYear] = useState(initY);
  const [viewMonth, setViewMonth] = useState(initM - 1);

  const [todayY, todayM] = today.split('-').map(Number);
  const isCurrentOrFutureMonth = viewYear > todayY || (viewYear === todayY && viewMonth >= todayM - 1);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const goPrevMonth = () => {
    haptics.selection();
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (isCurrentOrFutureMonth) return;
    haptics.selection();
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handlePickDate = (dateKey: string) => {
    if (dateKey > today) return;
    haptics.selection();
    onSelectDate(dateKey);
    onClose();
  };

  const cells = buildCalendarMonthCells(viewYear, viewMonth);

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full z-[var(--z-overlay)] mt-2 w-72 rounded-2xl border border-border-custom bg-surface p-3.5 shadow-2xl backdrop-blur-xs animate-fadeIn"
      onClick={(e) => e.stopPropagation()}
    >
      <PopoverHeader
        monthName={MONTH_NAMES[viewMonth]}
        year={viewYear}
        onPrev={goPrevMonth}
        onNext={goNextMonth}
        nextDisabled={isCurrentOrFutureMonth}
      />

      <PopoverShortcuts today={today} logDate={logDate} onPick={handlePickDate} />

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 pt-2 pb-1 text-center">
        {WEEKDAY_SHORT.map((w, idx) => (
          <span
            key={w}
            className={`text-3xs font-black uppercase tracking-wider ${
              idx >= 5 ? 'text-text-muted/60' : 'text-text-muted'
            }`}
          >
            {w}
          </span>
        ))}
      </div>

      {/* Calendar days grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {cells.map(({ key, dayNum, isCurrentMonth }) => {
          const isSelected = key === logDate;
          const isToday = key === today;
          const isFuture = key > today;

          return (
            <Pressable
              key={key}
              type="button"
              disabled={isFuture}
              onClick={() => handlePickDate(key)}
              className={`flex h-8 w-8 items-center justify-center mx-auto rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-primary text-on-accent shadow-xs font-black'
                  : isFuture
                  ? 'text-text-muted/20 cursor-not-allowed'
                  : !isCurrentMonth
                  ? 'text-text-muted/40 hover:bg-surface-solid/50'
                  : isToday
                  ? 'border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20'
                  : 'text-text-primary hover:bg-surface-solid hover:text-primary active:scale-90'
              }`}
            >
              {dayNum}
            </Pressable>
          );
        })}
      </div>
    </div>
  );
}
