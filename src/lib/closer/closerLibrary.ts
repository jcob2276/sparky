import type { CloserCallSummary } from './closerCallsApi';
import { shiftDateStr } from '../date';
export type LibraryScope = 'all' | 'week' | 'day' | 'notes';
export function filterCloserCalls(calls: CloserCallSummary[], search: string, scope: LibraryScope, date: string, weekStart: string) {
  const term = search.trim().toLocaleLowerCase('pl');
  const weekEnd = shiftDateStr(weekStart, 6);
  return calls.filter(call => (!term || (call.title + ' ' + call.review_notes).toLocaleLowerCase('pl').includes(term)) &&
    (scope === 'all' || (scope === 'day' && call.call_date === date) ||
      (scope === 'week' && call.call_date >= weekStart && call.call_date <= weekEnd) ||
      (scope === 'notes' && !!call.review_notes.trim())));
}
export function recordedDayTotals(calls: CloserCallSummary[], date: string) {
  const day = calls.filter(call => call.call_date === date);
  return { calls: day.length, hours: Math.round(day.reduce((sum, call) => sum + (call.duration_seconds ?? 0), 0) / 36) / 100 };
}
