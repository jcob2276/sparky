import { describe, expect, it } from 'vitest';
import { buildWinsHistory, countWinsDay } from './winsHistory';

describe('winsHistory', () => {
  it('liczy zaplanowane i ukończone zadania, puste sloty pomija', () => {
    expect(countWinsDay({ task_1: 'a', done_1: true, task_2: ' ', done_2: true, task_3: 'c', done_3: false })).toEqual({ done: 1, planned: 2 });
    expect(countWinsDay(undefined)).toEqual({ done: 0, planned: 0 });
  });

  it('układa pełne tygodnie od poniedziałku, a dni po dzisiejszym oznacza jako przyszłe', () => {
    const weeks = buildWinsHistory('2026-11-04', 2, [{ date: '2026-11-03', task_1: 'x', done_1: true }]);
    expect(weeks).toHaveLength(2);
    expect(weeks.every(week => week.length === 7)).toBe(true);
    expect(weeks[1][0].date).toBe('2026-11-02');
    expect(weeks[1][1]).toMatchObject({ date: '2026-11-03', done: 1, planned: 1, future: false });
    expect(weeks[1][3]).toMatchObject({ date: '2026-11-05', future: true });
  });
});
