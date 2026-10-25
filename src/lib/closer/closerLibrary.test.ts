import { describe, expect, it } from 'vitest';
import { filterCloserCalls, recordedDayTotals } from './closerLibrary';
import type { CloserCallSummary } from './closerCallsApi';
const call = (id: string, date: string, title: string, notes = ''): CloserCallSummary => ({
  id, call_date: date, title, review_notes: notes, user_id: 'owner', started_at: date + 'T10:00:00Z',
  duration_seconds: 1800, share_url: null, ai_status: 'done', ai_score: null, ai_mistakes: [], ai_good_moves: [],
});
const calls = [call('today', '2026-10-25', 'Marlena'), call('week', '2026-10-20', 'Piotr', 'Budżet'), call('old', '2025-01-01', 'Anna')];
describe('closer library', () => {
  it('defaults to all history and only filters dates explicitly', () => {
    expect(filterCloserCalls(calls, '', 'all', '2026-10-25', '2026-10-19')).toHaveLength(3);
    expect(filterCloserCalls(calls, '', 'week', '2026-10-25', '2026-10-19').map(c => c.id)).toEqual(['today', 'week']);
    expect(filterCloserCalls(calls, '', 'day', '2026-10-25', '2026-10-19').map(c => c.id)).toEqual(['today']);
  });
  it('searches titles and user notes and keeps empty results empty', () => {
    expect(filterCloserCalls(calls, '  BUDŻET ', 'notes', '2026-10-25', '2026-10-19').map(c => c.id)).toEqual(['week']);
    expect(filterCloserCalls(calls, 'missing', 'all', '2026-10-25', '2026-10-19')).toEqual([]);
  });
  it('calculates the recorded floor from the selected date only and ignores unknown duration', () => {
    expect(recordedDayTotals([...calls, { ...calls[0], id: 'unknown', duration_seconds: null }], '2026-10-25'))
      .toEqual({ calls: 2, hours: 0.5 });
  });
});
