import { describe, expect, it } from 'vitest';
import { buildComparisonWindow, buildPeriodWindow, periodLabel, shiftPeriod } from './periods';

const sprint = { sprintStart: '2026-09-13', sprintEnd: '2026-12-05', prevStart: '2026-06-21', prevEnd: '2026-09-12', sprintNumber: 3 };

describe('buildPeriodWindow', () => {
  it('tydzień to pon–nd z siedmioma dniami', () => {
    const w = buildPeriodWindow('week', '2026-10-21', sprint);
    expect([w.start, w.end, w.prevStart, w.prevEnd]).toEqual(['2026-10-19', '2026-10-25', '2026-10-12', '2026-10-18']);
    expect(w.buckets.map((b) => b.label)).toEqual(['pn', 'wt', 'śr', 'cz', 'pt', 'sb', 'nd']);
  });

  it('miesiąc dzieli się na tygodnie od pierwszego i nie wychodzi poza koniec', () => {
    const w = buildPeriodWindow('month', '2026-10-21', sprint);
    expect([w.start, w.end, w.prevStart, w.prevEnd]).toEqual(['2026-10-01', '2026-10-31', '2026-09-01', '2026-09-30']);
    expect(w.buckets).toHaveLength(5);
    expect(w.buckets[4]).toMatchObject({ start: '2026-10-29', end: '2026-10-31' });
  });

  it('styczeń cofa się do grudnia poprzedniego roku', () => {
    const w = buildPeriodWindow('month', '2026-01-10', sprint);
    expect([w.prevStart, w.prevEnd]).toEqual(['2025-12-01', '2025-12-31']);
  });

  it('sprint ma 12 tygodniowych kubełków i bierze granice ze sprintu', () => {
    const w = buildPeriodWindow('sprint', '2026-10-21', sprint);
    expect(w.buckets).toHaveLength(12);
    expect([w.start, w.end, w.prevStart]).toEqual(['2026-09-13', '2026-12-05', '2026-06-21']);
    expect(w.weeks).toBe(12);
  });

  it('rok ma 12 miesięcy', () => {
    const w = buildPeriodWindow('year', '2026-10-21', sprint);
    expect(w.buckets).toHaveLength(12);
    expect(w.buckets[1]).toMatchObject({ start: '2026-02-01', end: '2026-02-28' });
  });
});

describe('shiftPeriod', () => {
  it('przesuwa tydzień o 7 dni, miesiąc o miesiąc (też przez granicę roku) i rok o rok', () => {
    expect(shiftPeriod('week', '2026-10-21', -2)).toBe('2026-10-07');
    expect(shiftPeriod('month', '2026-10-21', -1)).toBe('2026-09-01');
    expect(shiftPeriod('month', '2026-01-15', -1)).toBe('2025-12-01');
    expect(shiftPeriod('month', '2026-12-15', 2)).toBe('2027-02-01');
    expect(shiftPeriod('year', '2026-10-21', -1)).toBe('2025-01-01');
  });

  it('sprint się nie przesuwa', () => {
    expect(shiftPeriod('sprint', '2026-10-21', -1)).toBe('2026-10-21');
  });
});

describe('periodLabel', () => {
  it('opisuje tydzień w jednym miesiącu, tydzień na granicy miesięcy, miesiąc i rok', () => {
    expect(periodLabel(buildPeriodWindow('week', '2026-10-21', sprint))).toBe('19–25 paź');
    expect(periodLabel(buildPeriodWindow('week', '2026-10-01', sprint))).toBe('28 wrz – 4 paź');
    expect(periodLabel(buildPeriodWindow('month', '2026-10-21', sprint))).toBe('paź 2026');
    expect(periodLabel(buildPeriodWindow('year', '2026-10-21', sprint))).toBe('2026');
  });
});

describe('buildComparisonWindow', () => {
  it('zestawia wybrany tydzień z dowolnym innym, a nie tylko z poprzednim', () => {
    const w = buildComparisonWindow('week', '2026-10-21', '2026-09-23', '2026-10-24', sprint);
    expect([w.start, w.end, w.prevStart, w.prevEnd]).toEqual(['2026-10-19', '2026-10-25', '2026-09-21', '2026-09-27']);
    expect(w.title).toBe('Ten tydzień');
    expect(w.compareLabel).toBe('21–27 wrz');
  });

  it('nazywa okno etykietą, gdy nie zawiera dzisiejszej daty', () => {
    const w = buildComparisonWindow('month', '2026-08-10', '2026-06-01', '2026-10-24', sprint);
    expect([w.start, w.prevStart]).toEqual(['2026-08-01', '2026-06-01']);
    expect(w.title).toBe('sie 2026');
    expect(w.compareLabel).toBe('cze 2026');
  });
});

