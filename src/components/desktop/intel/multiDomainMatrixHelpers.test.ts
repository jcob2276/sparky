import { expect, it } from 'vitest';
import { buildMatrixWeeksAndStats } from './multiDomainMatrixHelpers';

it('builds the matrix from normalized sparse task rows in slot order', () => {
  const { weeks } = buildMatrixWeeksAndStats({
    sessions: [], strava: [], lenieLogs: [], habits: [], proteinFloorG: 100,
    todayStr: '2026-10-28', startStr: '2026-10-26',
    apiData: { nutrition: [], oura: [], habitLogs: [], wins: [
      { date: '2026-10-28', result: null, daily_win_tasks: [
        { slot: 5, title: 'Call', done: true }, { slot: 2, title: 'Run', done: false },
      ] },
    ] },
  });
  expect(weeks[0][2].powerList).toEqual({ done: 1, total: 2,
    tasks: [{ title: 'Run', done: false }, { title: 'Call', done: true }],
  });
});
