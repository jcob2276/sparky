import { describe, it, expect } from 'vitest';
import { formatWarsawDate } from '../date';
import { buildHubRecoverySnapshot, sessionsToFatigueInput, computeWeekStats } from './hubRecovery';

describe('hubRecovery', () => {
  const base = 1_700_000_000_000;

  it('ignores wellness/activity logs when building fatigue input', () => {
    const sessions = sessionsToFatigueInput([
      {
        date: '2026-10-18',
        exercise_logs: [
          { exercise_name: 'Bench', weight: 100, reps: 5, muscle_tags: ['klatka'] },
          { exercise_name: 'Sauna', weight: null, reps: 20, muscle_tags: ['wellness'] },
        ],
      },
    ]);
    expect(sessions[0].exercises).toHaveLength(1);
    expect(sessions[0].exercises[0].name).toBe('Bench');
  });

  it('computes week stats only inside the week window', () => {
    const rows = [
      {
        date: '2026-10-12', // Sunday before Mon week start 13th
        exercise_logs: [{ exercise_name: 'Squat', weight: 100, reps: 5, muscle_tags: ['czworogłowe'] }],
      },
      {
        date: '2026-10-14',
        exercise_logs: [
          { exercise_name: 'Bench', weight: 100, reps: 5, muscle_tags: ['klatka'] },
          { exercise_name: 'Bench', weight: 100, reps: 5, muscle_tags: ['klatka'] },
        ],
      },
    ];
    const week = computeWeekStats(rows, '2026-10-13', '2026-10-19');
    expect(week.sessions).toBe(1);
    expect(week.reps).toBe(10);
    expect(week.volumeKg).toBe(1000);
  });

  it('builds non-zero fatigue after a recent chest session', () => {
    const sessionDate = formatWarsawDate(new Date(base));
    const snap = buildHubRecoverySnapshot(
      [
        {
          date: sessionDate,
          exercise_logs: [
            { exercise_name: 'Bench', weight: 100, reps: 5, muscle_tags: ['klatka', 'triceps'] },
            { exercise_name: 'Bench', weight: 100, reps: 5, muscle_tags: ['klatka', 'triceps'] },
            { exercise_name: 'Bench', weight: 100, reps: 5, muscle_tags: ['klatka', 'triceps'] },
          ],
        },
      ],
      sessionDate,
      sessionDate,
      base,
    );
    expect(snap.fatigueByTag.klatka).toBeGreaterThan(0.2);
    expect(snap.week.reps).toBe(15);
  });

  it('maps alias tags (quady) into fatigue that shades quads', () => {
    const sessionDate = formatWarsawDate(new Date(base));
    const snap = buildHubRecoverySnapshot(
      [
        {
          date: sessionDate,
          exercise_logs: [
            { exercise_name: 'Squat', weight: 140, reps: 5, muscle_tags: ['quady'] },
            { exercise_name: 'Squat', weight: 140, reps: 5, muscle_tags: ['quady'] },
          ],
        },
      ],
      sessionDate,
      sessionDate,
      base,
    );
    expect(snap.fatigueByTag.czworogłowe).toBeGreaterThan(0.15);
    expect(snap.fatigueByTag.quady).toBeUndefined();
  });
});
