/**
 * @component NowLine
 * @role Linia „teraz" na kolumnie bieżącego dnia. Samodzielny komponent z własnym
 *          30-sekundowym interwałem — dzięki temu tick aktualizuje TYLKO linię,
 *          a nie całą siatkę kolumn (wcześniej re-render 7 kolumn co 30 s).
 *          Interwał działa wyłącznie na kolumnie „dziś" (pozostałe zwracają null).
 */
import { useEffect, useState } from 'react';
import { HOUR_START, HOUR_END, PX_PER_MIN, nowMinutes } from '../calendarHelpers';

export function NowLine({ day, today }: { day: string; today: string }) {
  const [nowMin, setNowMin] = useState(() => nowMinutes());
  const isToday = day === today;

  useEffect(() => {
    if (!isToday) return;
    const timer = setInterval(() => setNowMin(nowMinutes()), 30000);
    return () => clearInterval(timer);
  }, [isToday]);

  if (!isToday) return null;
  if (nowMin < HOUR_START * 60 || nowMin >= HOUR_END * 60) return null;

  const nowLine = (nowMin - HOUR_START * 60) * PX_PER_MIN;

  return (
    <div className="absolute left-0 right-0 flex items-center pointer-events-none z-[var(--z-popover)]" style={{ top: nowLine }}>
      <div className="absolute -left-1.5 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-danger ring-2 ring-background z-20 shadow-xs apple-now-dot" />
      <div className="w-full h-[2px] bg-danger shadow-xs shadow-danger/40" />
    </div>
  );
}
