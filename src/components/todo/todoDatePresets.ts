import { shiftDateStr } from '../../lib/date';

export interface TodoDatePreset {
  id: 'today' | 'tomorrow' | 'weekend' | 'week' | 'none';
  label: string;
  /** Warsaw YYYY-MM-DD, or null for "no date". */
  date: string | null;
}

/** Next Saturday strictly after today (a Saturday today points a week ahead). */
function nextWeekendDate(today: string): string {
  const [y, m, d] = today.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return shiftDateStr(today, (6 - dow + 7) % 7 || 7);
}

const WEEKDAYS = ['niedz', 'pon', 'wt', 'śr', 'czw', 'pt', 'sob'];

export function weekdayShort(dateKey: string): string {
  return WEEKDAYS[new Date(`${dateKey}T12:00:00Z`).getUTCDay()];
}

export function getTodoDatePresets(today: string): TodoDatePreset[] {
  return [
    { id: 'today', label: 'Dziś', date: today },
    { id: 'tomorrow', label: 'Jutro', date: shiftDateStr(today, 1) },
    { id: 'weekend', label: 'Weekend', date: nextWeekendDate(today) },
    { id: 'week', label: 'Za tydzień', date: shiftDateStr(today, 7) },
    { id: 'none', label: 'Brak terminu', date: null },
  ];
}
