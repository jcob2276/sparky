import { describe, expect, it } from 'vitest';
import { weeklyRunKm } from './desktopMetrics';

// Uruchamiane w osobnych procesach z TZ=UTC, Europe/Warsaw, America/Los_Angeles i Asia/Tokyo.
describe('weeklyRunKm — warszawskie granice tygodnia', () => {
  it.each([
    ['2026-10-25T22:59:59Z', '2026-10-25T23:00:00Z', '19.10', '26.10'],
    ['2026-03-29T21:59:59Z', '2026-03-29T22:00:00Z', '23.03', '30.03'],
    ['2025-12-28T22:59:59Z', '2025-12-28T23:00:00Z', '22.12', '29.12'],
  ])('rozdziela niedzielę %s i poniedziałek %s niezależnie od TZ', (sunday, monday, previous, next) => {
    expect(weeklyRunKm([
      { start_date: monday, sport_type: 'TrailRun', distance: '2000' },
      { start_date: sunday, sport_type: 'Run', distance: 1000 },
      { start_date: sunday, sport_type: 'Ride', distance: 9000 },
    ])).toEqual([{ week: previous, km: 1 }, { week: next, km: 2 }]);
  });

  it('sumuje biegi z tego samego warszawskiego tygodnia po obu stronach północy UTC', () => {
    expect(weeklyRunKm([
      { start_date: '2026-10-25T23:30:00Z', sport_type: 'Run', distance: 1250 },
      { start_date: '2026-10-26T00:30:00Z', sport_type: 'Run', distance: 2500 },
    ])).toEqual([{ week: '26.10', km: 3.8 }]);
  });
});
