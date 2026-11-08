import { describe, expect, it } from 'vitest';
import { addDays, computeDueReviews, sprintFirstMonday, weekStartOf } from './reviewCycle';

const state = (today: string, over: Partial<{ weeksDone: string[]; monthsDone: string[]; sprintsDone: string[] }> = {}) => ({
  today,
  weeksDone: new Set(over.weeksDone ?? []),
  monthsDone: new Set(over.monthsDone ?? []),
  sprintsDone: new Set(over.sprintsDone ?? []),
});

describe('computeDueReviews', () => {
  it('w niedzielę startu sprintu 4 wymaga: sprintu 3, potem tygodni (poprzedni, bieżący)', () => {
    const due = computeDueReviews(state('2026-11-08'));
    expect(due.map((d) => d.key)).toEqual(['sprint:2026-3', 'week:2026-10-26', 'week:2026-11-02']);
    const sprint = due[0];
    expect(sprint.periodStart).toBe('2026-08-17');
    expect(sprint.periodEnd).toBe('2026-11-08');
    expect(sprint.nextStart).toBe('2026-11-09');
    expect(sprint.nextEnd).toBe('2027-01-31');
  });

  it('po zamknięciu wszystkiego nic nie jest zaległe', () => {
    const due = computeDueReviews(state('2026-11-08', {
      sprintsDone: ['2026-3'],
      weeksDone: ['2026-10-26', '2026-11-02'],
    }));
    expect(due).toEqual([]);
  });

  it('w środku tygodnia wymaga tylko poprzedniego tygodnia, bieżący dopiero w niedzielę', () => {
    const open = computeDueReviews(state('2026-11-11', { sprintsDone: ['2026-3'] }));
    expect(open.map((d) => d.key)).toEqual(['week:2026-11-02']);
    const closed = computeDueReviews(state('2026-11-11', { sprintsDone: ['2026-3'], weeksDone: ['2026-11-02'] }));
    expect(closed).toEqual([]);
  });

  it('miesiąc 1 sprintu 4 jest wymagany od niedzieli kończącej czwarty tydzień', () => {
    const before = computeDueReviews(state('2026-12-05', { sprintsDone: ['2026-3'], weeksDone: ['2026-11-23'] }));
    expect(before.find((d) => d.kind === 'month')).toBeUndefined();
    const sunday = computeDueReviews(state('2026-12-06', { sprintsDone: ['2026-3'], weeksDone: ['2026-11-23', '2026-11-30'] }));
    expect(sunday.map((d) => d.key)).toEqual(['month:2026-11-09']);
    expect(sunday[0].nextStart).toBe('2026-12-07');
    expect(sunday[0].nextEnd).toBe('2027-01-03');
  });

  it('kolejność to sprint, miesiąc, tydzień', () => {
    const due = computeDueReviews(state('2027-01-03', { sprintsDone: ['2026-3'] }));
    expect(due.map((d) => d.kind)).toEqual(['month', 'month', 'week', 'week']);
    const withSprint = computeDueReviews(state('2027-01-03'));
    expect(withSprint[0].kind).toBe('sprint');
  });
});

describe('daty pomocnicze', () => {
  it('weekStartOf zwraca poniedziałek, także dla niedzieli', () => {
    expect(weekStartOf('2026-11-08')).toBe('2026-11-02');
    expect(weekStartOf('2026-11-09')).toBe('2026-11-09');
  });
  it('sprint startujący w niedzielę ma pierwszy pełny tydzień od poniedziałku', () => {
    expect(sprintFirstMonday('2026-11-08')).toBe('2026-11-09');
    expect(addDays('2026-11-09', 83)).toBe('2027-01-31');
  });
});
