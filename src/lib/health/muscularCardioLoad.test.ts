import { describe, it, expect } from 'vitest';
import { computeMuscularCardioLoad } from '@vanguard/domain';

describe('computeMuscularCardioLoad', () => {
  it('computes 50/50 balance when loads are equal or empty', () => {
    const result = computeMuscularCardioLoad({
      cardioLoad: 20,
      strengthLoad: 20,
    });

    expect(result.cardioPercentage).toBe(50);
    expect(result.muscularPercentage).toBe(50);
    expect(result.dominantLoad).toBe('balanced');
  });

  it('correctly attributes cardio dominance on heavy running days', () => {
    const result = computeMuscularCardioLoad({
      cardioLoad: 80,
      strengthLoad: 10,
    });

    expect(result.cardioPercentage).toBeGreaterThanOrEqual(80);
    expect(result.dominantLoad).toBe('cardio');
    expect(result.explanation).toContain('wydolnościowe');
  });

  it('marks muscle groups as fatigued when high recent volume is reported', () => {
    const result = computeMuscularCardioLoad({
      cardioLoad: 15,
      strengthLoad: 45,
      recentSessionsTonnage: {
        'klatka piersiowa': 5000,
        'plecy': 1800,
      },
    });

    const chest = result.muscleGroups.find((m) => m.name.toLowerCase().includes('klatka'));
    expect(chest?.status).toBe('fatigued');
    expect(chest?.readinessPercentage).toBeLessThan(50);

    const back = result.muscleGroups.find((m) => m.name.toLowerCase().includes('plecy'));
    expect(back?.status).toBe('partial');
  });
});
