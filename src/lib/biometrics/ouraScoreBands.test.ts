import { describe, expect, it } from 'vitest';
import { bandForScore, buildScoreRings } from './ouraScoreBands';

describe('bandForScore', () => {
  it('maps Oura band edges', () => {
    expect([100, 85, 84, 70, 69, 60, 59, 0].map(bandForScore))
      .toEqual(['optimal', 'optimal', 'good', 'good', 'fair', 'fair', 'attention', 'attention']);
  });
});

const days = (scores: number[]) => scores.map((s, i) => ({
  date: `2026-10-${String(12 + i).padStart(2, '0')}`, sleep_score: s, readiness_score: 70,
}));

describe('buildScoreRings', () => {
  it('compares the latest score with the 7-day average', () => {
    const rings = buildScoreRings({ asOf: '2026-10-18', summaries: days([70, 70, 70, 70, 70, 70, 84]) });
    const sleep = rings[0];
    expect(sleep.value).toBe(84);
    expect(sleep.band).toBe('good');
    expect(sleep.bandLabel).toBe('Dobry');
    expect(sleep.trend).toBe('up');
    expect(sleep.delta).toBe(12);
    expect(sleep.ariaLabel).toContain('Dobry');
    expect(rings[1].trend).toBe('flat');
  });
  it('does not guess a trend with fewer than 4 days and omits strain without data', () => {
    const rings = buildScoreRings({ asOf: '2026-10-18', summaries: days([50, 50, 50, 50, 50, 50, 50]).slice(6) });
    expect(rings).toHaveLength(2);
    expect(rings[0].trend).toBe('unknown');
    expect(rings[0].deltaText).toBe('Za mało danych do porównania');
  });
  it('adds a strain ring on a 0-21 scale without a band', () => {
    const strain = buildScoreRings({ asOf: '2026-10-18', strainScore: 10.5 })[2];
    expect(strain.band).toBeNull();
    expect(strain.fraction).toBeCloseTo(0.5);
    expect(strain.valueText).toBe('10,5');
  });
});
