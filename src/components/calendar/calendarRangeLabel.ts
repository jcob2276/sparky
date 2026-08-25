import { addDays, getISOWeekNumber } from './calendarHelpers';

export function formatRangeLabel(
  calView: string,
  selectedDay: string,
  weekStart: string,
  compact = false,
): string {
  const [y, m, d] = selectedDay.split('-').map(Number);
  const selDate = new Date(y, m - 1, d);
  const weekNum = getISOWeekNumber(selectedDay);

  if (calView === 'dzien') {
    if (compact) {
      return selDate.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' });
    }
    return `${selDate.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} (Tydz. ${weekNum})`;
  }
  if (calView === '3dni') {
    const endStr = addDays(selectedDay, 2);
    const [ey, em, ed] = endStr.split('-').map(Number);
    const endDate = new Date(ey, em - 1, ed);
    if (compact) {
      return m === em
        ? `${d}–${ed} ${selDate.toLocaleDateString('pl-PL', { month: 'short' })}`
        : `${d} ${selDate.toLocaleDateString('pl-PL', { month: 'short' })} – ${ed} ${endDate.toLocaleDateString('pl-PL', { month: 'short' })}`;
    }
    if (m === em) {
      return `${d}–${ed} ${selDate.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })} (Tydz. ${weekNum})`;
    }
    return `${d} ${selDate.toLocaleDateString('pl-PL', { month: 'short' })} – ${ed} ${endDate.toLocaleDateString('pl-PL', { month: 'short', year: 'numeric' })} (Tydz. ${weekNum})`;
  }
  if (calView === 'tydzien') {
    const weekEnd = addDays(weekStart, 6);
    const [sy, sm, sd] = weekStart.split('-').map(Number);
    const [ey, em, ed] = weekEnd.split('-').map(Number);
    const sDate = new Date(sy, sm - 1, sd);
    const eDate = new Date(ey, em - 1, ed);
    const wNum = getISOWeekNumber(weekStart);
    if (compact) return `Tydz. ${wNum}`;
    if (sm === em) {
      return `${sd}–${ed} ${sDate.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })} (Tydz. ${wNum})`;
    }
    return `${sd} ${sDate.toLocaleDateString('pl-PL', { month: 'short' })} – ${ed} ${eDate.toLocaleDateString('pl-PL', { month: 'short', year: 'numeric' })} (Tydz. ${wNum})`;
  }
  if (calView === 'miesiac') {
    return selDate.toLocaleDateString('pl-PL', compact ? { month: 'short', year: 'numeric' } : { month: 'long', year: 'numeric' });
  }
  return selDate.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
}
