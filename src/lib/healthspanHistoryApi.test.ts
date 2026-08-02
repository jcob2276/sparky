import { describe, expect, it } from 'vitest';
import { buildHealthspanHistory } from './healthspanHistoryApi';

const row = (date: string, modelVersion = 'healthspan-v2', score = 70) => ({
  snapshot_date: date,
  model_version: modelVersion,
  profile: {
    score,
    estimatedAge: 34,
    confidence: { coverage: 80, evidenceStrength: 75 },
    contributors: [
      { key: 'cardio_fitness', score },
      { key: 'sleep_duration', score: score - 2 },
      { key: 'daily_movement', score: score + 2 },
    ],
  },
});

describe('buildHealthspanHistory', () => {
  it('keeps model versions separated and exposes chart points', () => {
    const history = buildHealthspanHistory([
      row('2026-01-01', 'healthspan-v1', 60),
      row('2026-07-01', 'healthspan-v2', 72),
    ], '2026-07-30', '1y');

    expect(history.series).toHaveLength(2);
    expect(history.points.at(-1)).toMatchObject({
      date: '2026-07-01',
      score: 72,
      modelVersion: 'healthspan-v2',
    });
  });

  it('filters the selected range without rewriting stored history', () => {
    const history = buildHealthspanHistory([
      row('2026-01-01'),
      row('2026-07-20'),
    ], '2026-07-30', '12w');

    expect(history.points.map((point) => point.date)).toEqual(['2026-07-20']);
    expect(history.trendSnapshots).toHaveLength(1);
  });
});
