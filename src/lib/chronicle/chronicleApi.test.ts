import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchCialoRows, fetchDuchRows, warsawDateKey } from './chronicleApi';

const db = vi.hoisted(() => ({ tables: {} as Record<string, Record<string, unknown>[]> }));
vi.mock('../supabase', () => ({ supabase: { from: (table: string) => {
  let rows = db.tables[table] ?? [];
  const filter = (column: string, value: unknown, accepts: (a: number, b: number) => boolean) => {
    rows = rows.filter(row => accepts(Date.parse(String(row[column])), Date.parse(String(value))));
    return query;
  };
  const query = {
    select: () => query,
    eq: (column: string, value: unknown) => { rows = rows.filter(row => row[column] === value); return query; },
    gte: (column: string, value: unknown) => filter(column, value, (a, b) => a >= b),
    lte: (column: string, value: unknown) => filter(column, value, (a, b) => a <= b),
    lt: (column: string, value: unknown) => filter(column, value, (a, b) => a < b),
    not: () => query, order: () => query,
    in: (column: string, values: unknown[]) => { rows = rows.filter(row => values.includes(row[column])); return query; },
    limit: (count: number) => { rows = rows.slice(0, count); return query; },
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve),
  };
  return query;
} } }));

beforeEach(() => { db.tables = {}; });

describe('warsawDateKey', () => {
  it('wpis po północy czasu warszawskiego należy do nowego dnia, nie do poprzedniego dnia UTC', () => {
    expect(warsawDateKey('2026-10-23T22:30:00Z')).toBe('2026-10-24');
    expect(warsawDateKey('2026-10-23T12:00:00Z')).toBe('2026-10-23');
  });

  it('zimą i latem przesunięcie jest inne', () => {
    expect(warsawDateKey('2026-01-15T23:30:00Z')).toBe('2026-01-16');
    expect(warsawDateKey('2026-07-15T21:30:00Z')).toBe('2026-07-15');
    expect(warsawDateKey('2026-07-15T22:30:00Z')).toBe('2026-07-16');
  });

  it('niepoprawna data daje pusty klucz', () => {
    expect(warsawDateKey('nie-data')).toBe('');
  });
});

describe('Warsaw query windows', () => {
  it.each([
    ['2026-01-15', '2026-01-14T23:00:00Z', '2026-01-15T23:00:00Z'],
    ['2026-07-15', '2026-07-14T22:00:00Z', '2026-07-15T22:00:00Z'],
    ['2026-03-29', '2026-03-28T23:00:00Z', '2026-03-29T22:00:00Z'],
    ['2026-10-25', '2026-10-24T22:00:00Z', '2026-10-25T23:00:00Z'],
  ])('includes exactly the local day %s in runs and journal', async (day, start, end) => {
    const instants = [
      new Date(Date.parse(start) - 1).toISOString(), start,
      new Date(Date.parse(start) + 30 * 60_000).toISOString(),
      new Date(Date.parse(end) - 1).toISOString(), end,
    ];
    db.tables.strava_activities_clean = instants.map(start_date => ({
      user_id: 'owner', start_date, distance: 1000, sport_type: 'Run', is_oura: false,
    }));
    db.tables.vanguard_stream = instants.map(timestamp => ({ user_id: 'owner', source: 'telegram', timestamp }));
    expect.soft((await fetchCialoRows('owner', day, day)).runKm).toEqual([{ date: day, value: 3 }]);
    expect.soft((await fetchDuchRows('owner', day, day)).journal).toEqual([{ date: day, value: 3 }]);
  });
});

it('loads tasks by the selected parent days, including a Monday planned on Sunday', async () => {
  db.tables.daily_wins = [
    { id: 'monday', user_id: 'owner', date: '2026-10-26' },
    { id: 'sunday', user_id: 'owner', date: '2026-10-25' },
  ];
  db.tables.daily_win_tasks = [
    // Unrelated tasks must not consume the query limit before the selected day's tasks.
    ...Array.from({ length: 5000 }, () => ({
      user_id: 'owner', day_win_id: 'sunday', created_at: '2026-10-26T08:00:00Z', done: false, category: 'work',
    })),
    { user_id: 'owner', day_win_id: 'monday', created_at: '2026-10-25T18:00:00Z', done: true, category: 'body' },
    { user_id: 'owner', day_win_id: 'monday', created_at: '2026-10-26T08:00:00Z', done: false, category: 'work' },
    { user_id: 'other', day_win_id: 'monday', created_at: '2026-10-26T08:00:00Z', done: true, category: 'work' },
  ];
  expect((await fetchDuchRows('owner', '2026-10-26', '2026-10-26')).tasks).toEqual([
    { date: '2026-10-26', done: true, category: 'body' },
    { date: '2026-10-26', done: false, category: 'work' },
  ]);
});

it('returns no tasks when the period has no parent days', async () => {
  db.tables.daily_win_tasks = [{ user_id: 'owner', day_win_id: 'outside', done: true }];
  expect((await fetchDuchRows('owner', '2026-10-26', '2026-10-26')).tasks).toEqual([]);
});
