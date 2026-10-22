import { describe, expect, it } from 'vitest';
import { buildPeriodWindow } from './periods';

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
