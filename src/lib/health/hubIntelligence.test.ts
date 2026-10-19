import { describe, it, expect } from 'vitest';
import {
  buildHubRecords,
  buildHubForecasts,
  buildHubNeglects,
} from './hubIntelligence';
import type { HubRecoverySessionRow } from './hubRecovery';

describe('hubIntelligence', () => {
  it('includes push-up and dip max BW reps', () => {
    const rows: HubRecoverySessionRow[] = [
      {
        date: '2026-10-10',
        exercise_logs: [
          { exercise_name: 'Pompki', weight: 0, reps: 25, muscle_tags: ['klatka'] },
          { exercise_name: 'Dipy', weight: 0, reps: 14, muscle_tags: ['triceps'] },
        ],
      },
    ];
    const records = buildHubRecords(rows, '2026-10-19');
    expect(records.find((r) => r.key === 'pushup')).toMatchObject({ unit: 'reps', value: 25 });
    expect(records.find((r) => r.key === 'dip')).toMatchObject({ unit: 'reps', value: 14 });
  });

  it('includes pull-up max reps when bodyweight sets exist', () => {
    const rows: HubRecoverySessionRow[] = [
      {
        date: '2026-10-10',
        exercise_logs: [
          { exercise_name: 'Podciąganie nachwytem', weight: 0, reps: 12, muscle_tags: ['plecy'] },
          { exercise_name: 'Podciąganie nachwytem', weight: 0, reps: 10, muscle_tags: ['plecy'] },
        ],
      },
      {
        date: '2026-10-12',
        exercise_logs: [
          { exercise_name: 'Wyciskanie leżąc', weight: 100, reps: 5, muscle_tags: ['klatka'] },
        ],
      },
    ];
    const records = buildHubRecords(rows, '2026-10-19');
    const pull = records.find((r) => r.key === 'pullup');
    expect(pull).toMatchObject({ unit: 'reps', value: 12 });
    expect(records.some((r) => r.key === 'bench')).toBe(true);
  });

  it('prefers weighted pull-up e1RM over bodyweight reps', () => {
    const rows: HubRecoverySessionRow[] = [
      {
        date: '2026-10-01',
        exercise_logs: [
          { exercise_name: 'Pull-up', weight: 0, reps: 15, muscle_tags: ['plecy'] },
        ],
      },
      {
        date: '2026-10-15',
        exercise_logs: [
          { exercise_name: 'Podciąganie', weight: 20, reps: 5, muscle_tags: ['plecy'] },
        ],
      },
    ];
    const pull = buildHubRecords(rows, '2026-10-19').find((r) => r.key === 'pullup');
    expect(pull?.unit).toBe('kg');
    expect(pull?.value).toBeGreaterThanOrEqual(20);
  });

  it('forecasts e1RM slope with N sessions explicit', () => {
    const rows: HubRecoverySessionRow[] = [
      {
        date: '2026-09-01',
        exercise_logs: [{ exercise_name: 'Wyciskanie leżąc', weight: 90, reps: 5, muscle_tags: ['klatka'] }],
      },
      {
        date: '2026-09-15',
        exercise_logs: [{ exercise_name: 'Wyciskanie leżąc', weight: 92.5, reps: 5, muscle_tags: ['klatka'] }],
      },
      {
        date: '2026-10-01',
        exercise_logs: [{ exercise_name: 'Wyciskanie leżąc', weight: 95, reps: 5, muscle_tags: ['klatka'] }],
      },
    ];
    const forecasts = buildHubForecasts(rows, '2026-10-19');
    const bench = forecasts.find((f) => f.key === 'bench');
    expect(bench).toBeDefined();
    expect(bench!.nSessions).toBe(3);
    expect(bench!.deltaPerWeekKg).toBeGreaterThan(0);
    expect(bench!.summary).toContain('N=3');
  });

  it('flags long gap as neglect with explicit N', () => {
    const rows: HubRecoverySessionRow[] = [
      {
        date: '2026-10-18',
        exercise_logs: [
          { exercise_name: 'Bench', weight: 100, reps: 5, muscle_tags: ['klatka'] },
          { exercise_name: 'Bench', weight: 100, reps: 5, muscle_tags: ['klatka'] },
        ],
      },
      {
        date: '2026-10-01',
        exercise_logs: [
          { exercise_name: 'Squat', weight: 140, reps: 5, muscle_tags: ['czworogłowe'] },
        ],
      },
    ];
    const neglects = buildHubNeglects(rows, '2026-10-19');
    const quads = neglects.find((n) => n.tag === 'czworogłowe');
    expect(quads?.reason).toBe('gap');
    expect(quads!.daysSince).toBeGreaterThanOrEqual(10);
    expect(quads!.summary).toMatch(/N=\d/);
  });

  it('returns no forecast below N=3', () => {
    const rows: HubRecoverySessionRow[] = [
      {
        date: '2026-10-01',
        exercise_logs: [{ exercise_name: 'Squat', weight: 100, reps: 5, muscle_tags: ['czworogłowe'] }],
      },
      {
        date: '2026-10-10',
        exercise_logs: [{ exercise_name: 'Squat', weight: 105, reps: 5, muscle_tags: ['czworogłowe'] }],
      },
    ];
    expect(buildHubForecasts(rows, '2026-10-19')).toHaveLength(0);
  });
});
