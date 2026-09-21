import { describe, it, expect } from 'vitest';
import {
  calculateSvgMuscleLevels,
  SPARKY_TO_SVG_MAP,
  MUSCLE_PL_NAMES,
  SVG_MUSCLES,
} from './bodyMuscles';

describe('bodyMuscles', () => {
  it('maps Sparky tags to valid SVG muscles', () => {
    expect(SPARKY_TO_SVG_MAP['klatka']).toEqual(['chest']);
    expect(SPARKY_TO_SVG_MAP['barki']).toEqual(['deltoids']);
    expect(SPARKY_TO_SVG_MAP['plecy']).toContain('upper-back');
  });

  it('has Polish names for every SVG muscle', () => {
    for (const m of SVG_MUSCLES) {
      expect(MUSCLE_PL_NAMES[m]).toBeDefined();
      expect(MUSCLE_PL_NAMES[m].length).toBeGreaterThan(0);
    }
  });

  it('calculates correct level shades from fatigue values', () => {
    const levels = calculateSvgMuscleLevels({
      klatka: 0.9, // level 4
      barki: 0.65, // level 3
      triceps: 0.4, // level 2
      biceps: 0.2, // level 1
      czworogłowe: 0.05, // level 0
    });

    expect(levels.chest).toBe(4);
    expect(levels.deltoids).toBe(3);
    expect(levels.triceps).toBe(2);
    expect(levels.biceps).toBe(1);
    expect(levels.quadriceps).toBe(0);
  });
});
