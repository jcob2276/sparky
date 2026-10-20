import { describe, expect, it } from 'vitest';
import type { CloserDailyLogRow } from './closerApi';
import {
  EMPTY_DRAFT,
  daysLeftInWeek,
  draftToNumbers,
  hasEnteredNumbers,
  isDraftComplete,
  parseCount,
  rowToDraft,
  sanitizeCountInput,
  sumWeek,
  weekPace,
} from './closerDayModel';

const row = (patch: Partial<CloserDailyLogRow>): CloserDailyLogRow => ({
  id: 'x',
  user_id: 'u',
  date: '2026-10-19',
  dials: 0,
  work_hours: 0,
  appointments: 0,
  sales_calls: 0,
  notes: null,
  created_at: '',
  updated_at: '',
  ...patch,
});

describe('parseCount / sanitizeCountInput', () => {
  it('rozróżnia puste pole od zera', () => {
    expect(parseCount('')).toBeNull();
    expect(parseCount('  ')).toBeNull();
    expect(parseCount('0')).toBe(0);
    expect(parseCount('12')).toBe(12);
  });
  it('odrzuca znaki, minusy, ułamki i przekroczenie 999', () => {
    for (const bad of ['-1', '1.5', '1,5', 'abc', '1000', '1 2']) expect(parseCount(bad)).toBeNull();
  });
  it('sanituje wpisywanie do samych cyfr, max 3', () => {
    expect(sanitizeCountInput('1a2-3,4')).toBe('123');
    expect(sanitizeCountInput('')).toBe('');
  });
});

describe('draftToNumbers', () => {
  it('wymaga wszystkich trzech liczb', () => {
    expect(draftToNumbers({ ...EMPTY_DRAFT, appointments: '3', conversations: '40' })).toBeNull();
    expect(isDraftComplete({ ...EMPTY_DRAFT, appointments: '3', conversations: '40', salesCalls: '2' })).toBe(true);
  });
  it('zero wpisane świadomie jest kompletne', () => {
    expect(draftToNumbers({ ...EMPTY_DRAFT, appointments: '0', conversations: '0', salesCalls: '0' }))
      .toEqual({ appointments: 0, dials: 0, salesCalls: 0, note: null });
  });
  it('dzień bez sprzedaży daje zera bez wpisywania', () => {
    expect(draftToNumbers({ ...EMPTY_DRAFT, off: true, note: ' wolne ' }))
      .toEqual({ appointments: 0, dials: 0, salesCalls: 0, note: 'wolne' });
  });
  it('mapuje rozmowy na dials i przycina opinię', () => {
    expect(draftToNumbers({ ...EMPTY_DRAFT, appointments: '4', conversations: '41', salesCalls: '1', note: '  ok  ' }))
      .toEqual({ appointments: 4, dials: 41, salesCalls: 1, note: 'ok' });
  });
});

describe('rowToDraft / hasEnteredNumbers', () => {
  it('pusty szkielet (same godziny pracy) nie liczy się jako wpisany dzień', () => {
    const skeleton = row({ work_hours: 6 });
    expect(hasEnteredNumbers(skeleton)).toBe(false);
    expect(rowToDraft(skeleton)).toEqual(EMPTY_DRAFT);
    expect(hasEnteredNumbers(null)).toBe(false);
  });
  it('odtwarza formularz z zapisanego wiersza', () => {
    expect(rowToDraft(row({ appointments: 4, dials: 41, sales_calls: 1, notes: 'dobrze' })))
      .toEqual({ appointments: '4', conversations: '41', salesCalls: '1', off: false, note: 'dobrze' });
  });
});

describe('weekPace', () => {
  it('liczy dni do końca tygodnia (pon=7, nd=1)', () => {
    expect(daysLeftInWeek('2026-10-19')).toBe(7); // poniedziałek
    expect(daysLeftInWeek('2026-10-22')).toBe(4); // czwartek
    expect(daysLeftInWeek('2026-10-25')).toBe(1); // niedziela
  });
  it('podaje ile dziennie brakuje do celu, w górę', () => {
    expect(weekPace(12, 30, '2026-10-21')).toEqual({ remaining: 18, daysLeft: 5, perDay: 4 });
    expect(weekPace(0, 30, '2026-10-19')).toEqual({ remaining: 30, daysLeft: 7, perDay: 5 });
  });
  it('po osiągnięciu celu nie żąda niczego więcej', () => {
    expect(weekPace(31, 30, '2026-10-23')).toEqual({ remaining: 0, daysLeft: 3, perDay: 0 });
  });
});

describe('sumWeek', () => {
  it('sumuje trzy liczby i toleruje nulle', () => {
    expect(sumWeek([
      row({ appointments: 3, dials: 40, sales_calls: 1 }),
      row({ appointments: 2, dials: 10, sales_calls: 2 }),
    ])).toEqual({ appointments: 5, salesCalls: 3, dials: 50 });
    expect(sumWeek([])).toEqual({ appointments: 0, salesCalls: 0, dials: 0 });
  });
});
