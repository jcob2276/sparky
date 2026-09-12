import { LIFE_SPHERES, LEGACY_CATEGORY_TO_SPHERE } from '../../../lib/projects/lifeSpheres';
import { addDays, weekMon, type CalRow } from '../calendarHelpers';

export const buildRecurrenceRule = (
  r: '' | 'daily' | 'weekly' | 'monthly' | 'custom',
  customDays: string[],
  endDate: string
): string[] | undefined => {
  if (r === '') return undefined;
  let rule = '';
  if (r === 'daily') rule = 'FREQ=DAILY';
  else if (r === 'weekly') rule = 'FREQ=WEEKLY';
  else if (r === 'monthly') rule = 'FREQ=MONTHLY';
  else if (r === 'custom') {
    if (customDays.length === 0) return undefined;
    rule = `FREQ=WEEKLY;BYDAY=${customDays.join(',')}`;
  }
  if (endDate) {
    const formatted = endDate.replace(/-/g, '') + 'T235959Z';
    rule += `;UNTIL=${formatted}`;
  }
  return [`RRULE:${rule}`];
};

export type RecurrenceState = {
  recurrence: '' | 'daily' | 'weekly' | 'monthly' | 'custom';
  customDays: string[];
  endDate: string;
};

export function parseRecurrenceRule(rules: string[] | null | undefined): RecurrenceState {
  const rule = rules?.find((value) => value.startsWith('RRULE:'))?.slice(6);
  if (!rule) return { recurrence: '', customDays: [], endDate: '' };

  const values = Object.fromEntries(
    rule.split(';').map((part) => {
      const [key, value = ''] = part.split('=');
      return [key, value];
    }),
  );
  const customDays = values.BYDAY?.split(',').filter(Boolean) ?? [];
  const frequency = values.FREQ;
  const recurrence = customDays.length > 0
    ? 'custom'
    : frequency === 'DAILY'
      ? 'daily'
      : frequency === 'WEEKLY'
        ? 'weekly'
        : frequency === 'MONTHLY'
          ? 'monthly'
          : '';
  const until = values.UNTIL?.slice(0, 8) ?? '';
  const endDate = until.length === 8
    ? `${until.slice(0, 4)}-${until.slice(4, 6)}-${until.slice(6, 8)}`
    : '';

  return { recurrence, customDays, endDate };
}

export function calculateWeeklyTotals(events: CalRow[], weekStart: string, offsetDays: number) {
  const totals: Record<string, number> = Object.fromEntries(LIFE_SPHERES.map((s) => [s.id, 0]));
  const targetWeekStart = offsetDays === 0 ? weekStart : addDays(weekStart, offsetDays);
  const targetWeekEnd = addDays(targetWeekStart, 7);
  events.forEach((ev) => {
    if (!ev.start_time || !ev.end_time || !ev.category) return;
    const evDateStr = ev.start_time.split('T')[0];
    if (evDateStr < targetWeekStart || evDateStr >= targetWeekEnd) return;
    if (ev.summary?.toLowerCase()?.includes('sen') || ev.summary?.toLowerCase()?.includes('sleep')) return;
    const cat = LEGACY_CATEGORY_TO_SPHERE[ev.category.toLowerCase()] || ev.category.toLowerCase();
    if (!(cat in totals)) return;
    try {
      const start = new Date(ev.start_time.replace(' ', 'T')).getTime();
      const end = new Date(ev.end_time.replace(' ', 'T')).getTime();
      const diffMs = end - start;
      if (diffMs > 0) totals[cat] += diffMs / (1000 * 60 * 60);
    } catch (err) {
      console.warn('[CalendarView] Failed to parse event time:', err);
    }
  });
  return totals;
}

export function shiftPeriodDates(
  calView: 'dzien' | '3dni' | 'tydzien' | 'miesiac',
  selectedDay: string,
  weekStart: string,
  direction: -1 | 1,
): { nextSelectedDay: string; nextWeekStart: string } {
  if (calView === 'dzien') {
    const nextDay = addDays(selectedDay, direction);
    return { nextSelectedDay: nextDay, nextWeekStart: weekMon(nextDay) };
  }
  if (calView === '3dni') {
    const nextDay = addDays(selectedDay, direction * 3);
    return { nextSelectedDay: nextDay, nextWeekStart: weekMon(nextDay) };
  }
  if (calView === 'tydzien') {
    const nextWeek = addDays(weekStart, direction * 7);
    return { nextSelectedDay: nextWeek, nextWeekStart: nextWeek };
  }
  const [y, m] = selectedDay.split('-').map(Number);
  const d = new Date(y, m - 1 + direction, 1);
  const newY = d.getFullYear();
  const newM = String(d.getMonth() + 1).padStart(2, '0');
  const nextMonthDay = `${newY}-${newM}-01`;
  return { nextSelectedDay: nextMonthDay, nextWeekStart: weekMon(nextMonthDay) };
}

