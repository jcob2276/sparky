import { describe, expect, it } from 'vitest';
import { bodyShort, DEFAULT_LIFE_TARGETS, incomeLabel, incomeShort } from './lifeGoals';
import { buildNorthStarSpheres } from './projects/pillars';

describe('cele życiowe', () => {
  const t = { bodyFatPct: 12, benchKg: 110, incomeNetPln: 20000 };

  it('teksty biorą liczby z przekazanych celów, nie z zakodowanych', () => {
    expect(bodyShort(t)).toBe('12% BF · 110 kg');
    expect(incomeShort(t)).toBe('20k zł / msc');
    expect(incomeLabel(t)).toContain('netto / msc');
    const spheres = buildNorthStarSpheres(t);
    expect(spheres.cialo.affirmation).toContain('12% BF i 110 kg');
    expect(spheres.konto.affirmation).toContain('20 tysięcy');
  });

  it('wartości awaryjne zgadzają się z seedem tabeli life_targets', () => {
    expect(DEFAULT_LIFE_TARGETS).toEqual({ bodyFatPct: 14, benchKg: 100, incomeNetPln: 15000 });
  });
});
