import { describe, expect, it } from 'vitest';
import { buildWeeklyWinsMap } from './weeklyWinsMap';

describe('buildWeeklyWinsMap', () => {
  it('marks Z / 5-of-5 as win and past incomplete as loss', () => {
    const days = buildWeeklyWinsMap({
      today: '2026-07-19',
      rows: [
        {
          date: '2026-07-13',
          result: 'Z',
          task_1: 'a', task_2: 'b', task_3: 'c', task_4: 'd', task_5: 'e',
          done_1: true, done_2: true, done_3: true, done_4: true, done_5: true,
        },
        {
          date: '2026-07-14',
          result: 'P',
          task_1: 'a', task_2: 'b', task_3: 'c', task_4: 'd', task_5: 'e',
          done_1: false, done_2: true, done_3: true, done_4: true, done_5: true,
        },
        {
          date: '2026-07-19',
          result: null,
          task_1: 'a', task_2: 'b', task_3: null, task_4: null, task_5: null,
          done_1: true, done_2: false, done_3: false, done_4: false, done_5: false,
        },
      ],
    });

    expect(days).toHaveLength(7);
    expect(days[0]).toMatchObject({ date: '2026-07-13', status: 'win' });
    expect(days[1]).toMatchObject({ date: '2026-07-14', status: 'loss' });
    expect(days[6]).toMatchObject({ date: '2026-07-19', status: 'open', doneCount: 1 });
    // missing past day
    expect(days[2]).toMatchObject({ date: '2026-07-15', status: 'loss' });
  });

  it('carries the day rating, the opinion and the five tasks with their categories', () => {
    const days = buildWeeklyWinsMap({
      today: '2026-07-19',
      scores: { '2026-07-14': 6 },
      rows: [
        {
          date: '2026-07-14',
          result: 'P',
          day_note: '  spoko, ale brak planu  ',
          task_1: 'Trening', category_1: 'cialo', done_1: true,
          task_2: 'Dykcja', category_2: 'duch', done_2: false,
          task_3: null, task_4: '', task_5: null,
        },
      ],
    });
    const day = days[1];
    expect(day.score).toBe(6);
    expect(day.note).toBe('spoko, ale brak planu');
    expect(day.tasks).toEqual([
      { slot: 1, title: 'Trening', done: true, category: 'cialo' },
      { slot: 2, title: 'Dykcja', done: false, category: 'duch' },
    ]);
    expect(days[0]).toMatchObject({ score: null, note: null, tasks: [] });
  });
});
