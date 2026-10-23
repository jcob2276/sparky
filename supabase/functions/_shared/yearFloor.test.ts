import { keepFromFloor, sec13fPeriodFloor, warsawToday, yearFloor } from './yearFloor.ts';

function check(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

Deno.test('year floor is 1 January of the Warsaw year', () => {
  check(yearFloor('2026-10-23'), '2026-01-01');
  check(sec13fPeriodFloor('2027-01-02'), '2026-12-31');
  // 31 Dec 23:30 UTC is already 1 Jan in Warsaw
  check(warsawToday(new Date('2026-12-31T23:30:00Z')), '2027-01-01');
});

Deno.test('keepFromFloor drops older rows and keeps undated ones', () => {
  const rows = [{ d: '2025-12-31' }, { d: '2026-01-01' }, { d: '2026-05-01T10:00:00Z' }, { d: null }];
  check(keepFromFloor(rows, (r) => r.d, '2026-01-01').map((r) => r.d), ['2026-01-01', '2026-05-01T10:00:00Z', null]);
});
