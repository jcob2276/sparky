import { describe, expect, it } from 'vitest';
import { computePowerListWeekStats } from './growthWeek';

describe('Power List week stats', () => {
  it('counts task rows and never revives mirrored slots for an empty relation', () => {
    const rows = [
      { daily_win_tasks: [], task_1: 'ghost', done_1: true },
      { daily_win_tasks: [
        { slot: 5, title: 'Call', done: true },
        { slot: 2, title: 'Run', done: false },
        { slot: 3, title: '  ', done: true },
      ] },
    ];
    expect(computePowerListWeekStats(rows)).toEqual({
      daysLogged: 2, daysWithWins: 1, tasksDone: 1, tasksSet: 2,
    });
  });
});
