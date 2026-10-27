import { describe, expect, it } from 'vitest';
import type { CalRow } from './calendarHelpers';
import { SEARCH_RESULT_LIMIT, pickSearchResults } from './calendarSearch';

const row = (id: string, summary: string, start: string, extra: Partial<CalRow> = {}) =>
  ({ id, summary, start_time: start, end_time: start, category: null, description: null, location: null, ...extra }) as unknown as CalRow;

const TODAY = '2026-10-27';

describe('pickSearchResults', () => {
  const rows = [
    row('past-new', 'Trening nóg', '2026-10-20T09:00:00+01:00'),
    row('past-old', 'Trening barków', '2026-09-01T09:00:00+02:00'),
    row('soon', 'Trening klatki', '2026-10-28T09:00:00+01:00'),
    row('later', 'Trening pleców', '2026-12-01T09:00:00+01:00'),
    row('other', 'Rozmowa z klientem', '2026-10-29T09:00:00+01:00'),
  ];

  it('puts upcoming events first (nearest first), then past ones from the freshest', () => {
    expect(pickSearchResults(rows, 'trening', TODAY).map((r) => r.id)).toEqual(['soon', 'later', 'past-new', 'past-old']);
  });

  it('needs at least two characters', () => {
    expect(pickSearchResults(rows, 't', TODAY)).toEqual([]);
    expect(pickSearchResults(rows, '  ', TODAY)).toEqual([]);
  });

  it('matches location and description too, case and diacritics aside from Polish casing', () => {
    const extra = [row('x', 'Spotkanie', '2026-11-02T10:00:00+01:00', { location: 'Biuro Łódź' })];
    expect(pickSearchResults(extra, 'łódź', TODAY).map((r) => r.id)).toEqual(['x']);
  });

  it('drops duplicates and events without a start time, and respects the limit', () => {
    const many = Array.from({ length: 20 }, (_, i) => row(`e${i}`, 'Trening', `2026-11-${String(i + 1).padStart(2, '0')}T08:00:00+01:00`));
    const withDupes = [...many, many[0], row('nostart', 'Trening', '', { start_time: null })];
    const picked = pickSearchResults(withDupes, 'trening', TODAY);
    expect(picked).toHaveLength(SEARCH_RESULT_LIMIT);
    expect(new Set(picked.map((r) => r.id)).size).toBe(SEARCH_RESULT_LIMIT);
    expect(picked.some((r) => r.id === 'nostart')).toBe(false);
  });
});
