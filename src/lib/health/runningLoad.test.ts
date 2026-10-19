import { describe, expect, it } from 'vitest';
import { calculateMuscleFatigue } from './muscleRecovery';
import { buildRunningLoad, runLoad, type RunRow } from './runningLoad';

const run = (start: string, km: number, minutes: number, hrAvg: number | null, sport = 'Run'): RunRow => ({
  start_date: start, distance: km * 1000, moving_time: minutes * 60, sport_type: sport, hr_avg: hrAvg, hr_max: 193,
});
const TODAY = '2026-10-19';

describe('runLoad (heart-rate based)', () => {
  it('rates 10 km of intervals above a 15 km easy long run', () => {
    const intervals = runLoad(55, 180, 193);
    const longRun = runLoad(100, 148, 193);
    expect(intervals.intensity).toBe('hard');
    expect(longRun.intensity).toBe('easy');
    expect(intervals.load).toBeGreaterThan(longRun.load);
  });

  it('assumes a moderate effort when there is no heart rate', () => {
    expect(runLoad(60, null, 190).intensity).toBe('easy');
    expect(runLoad(60, null, 190).load).toBeGreaterThan(0);
  });
});

describe('buildRunningLoad', () => {
  const base = [run('2026-10-10T07:00:00Z', 10, 55, 165), run('2026-10-03T07:00:00Z', 10, 55, 165), run('2026-09-26T07:00:00Z', 10, 55, 165)];

  it('sums the last 7 days by load and compares with the usual week', () => {
    const load = buildRunningLoad([...base, run('2026-10-18T07:00:00Z', 10, 55, 165)], TODAY);
    expect(load.km7).toBe(10);
    expect(load.runs7).toBe(1);
    expect(load.load7).toBeGreaterThan(0);
    expect(load.avgWeeklyLoad).toBe(load.load7);
    expect(load.verdict).toBe('W swoim rytmie');
    expect(load.recent[0].day).toBe('2026-10-18');
  });

  it('a short hard week outweighs the same distance run easily', () => {
    const hard = buildRunningLoad([...base, run('2026-10-18T07:00:00Z', 10, 50, 183)], TODAY);
    const easy = buildRunningLoad([...base, run('2026-10-18T07:00:00Z', 15, 105, 140)], TODAY);
    expect(hard.load7).toBeGreaterThan(easy.load7);
  });

  it('ignores non-running activities and reports an empty week', () => {
    const load = buildRunningLoad([...base, run('2026-10-18T07:00:00Z', 20, 60, 150, 'Ride')], TODAY);
    expect(load.load7).toBe(0);
    expect(load.verdict).toBe('Bez biegania w tych 7 dniach');
  });

  it('says there is too little history when only the current week exists', () => {
    expect(buildRunningLoad([run('2026-10-18T07:00:00Z', 5, 30, 150)], TODAY).verdict).toBe('Za mało historii, żeby porównać');
  });

  it('feeds leg fatigue: a hard run loads the legs, an old one has faded', () => {
    const now = Date.parse('2026-10-19T12:00:00Z');
    const fresh = buildRunningLoad([run('2026-10-19T07:00:00Z', 10, 55, 180)], TODAY);
    const stale = buildRunningLoad([run('2026-10-05T07:00:00Z', 10, 55, 180)], TODAY);
    const freshLegs = calculateMuscleFatigue(fresh.fatigueInput, now);
    const staleLegs = calculateMuscleFatigue(stale.fatigueInput, now);
    expect(freshLegs['czworogłowe']).toBeGreaterThan(0.3);
    expect(freshLegs['klatka']).toBe(0);
    expect(staleLegs['czworogłowe']).toBeLessThan(0.05);
  });
});
