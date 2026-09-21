import { describe, it, expect } from 'vitest';
import {
  halfLifeDecay,
  calculateSetTonnage,
  calculateMuscleFatigue,
  calculateMuscleStrengthRetention,
  getFatiguedMuscles,
  getDetrainedMuscles,
  FATIGUE_HALF_LIFE_MS,
  STRENGTH_FULL_MS,
  STRENGTH_HALF_LIFE_MS,
  STRENGTH_FLOOR,
} from './muscleRecovery';

describe('muscleRecovery', () => {
  describe('halfLifeDecay', () => {
    it('returns 1.0 when age is 0', () => {
      expect(halfLifeDecay(0, 3600000)).toBe(1);
    });

    it('returns 0.5 at exactly one half-life', () => {
      expect(halfLifeDecay(3600000, 3600000)).toBeCloseTo(0.5);
    });

    it('returns 0.25 at two half-lives', () => {
      expect(halfLifeDecay(7200000, 3600000)).toBeCloseTo(0.25);
    });
  });

  describe('calculateSetTonnage', () => {
    it('calculates unweighted raw tonnage when 1RM is missing', () => {
      expect(calculateSetTonnage(100, 5)).toBe(500);
    });

    it('scales tonnage down when load is below 1RM using (load/1RM)^1.5', () => {
      // 100kg * 5 reps = 500. 1RM = 100kg -> intensity = 1.0 -> 500
      expect(calculateSetTonnage(100, 5, 100)).toBe(500);

      // Load = 50kg, 1RM = 100kg -> intensity = 0.5 -> (0.5)^1.5 ≈ 0.35355 -> 50 * 10 * 0.35355 = 176.8
      const tonnage50 = calculateSetTonnage(50, 10, 100);
      expect(tonnage50).toBeCloseTo(176.8, 0);
    });

    it('adds drop sets tonnage', () => {
      const mainPlusDrops = calculateSetTonnage(100, 5, null, [
        { weightKg: 80, reps: 5 },
        { weightKg: 60, reps: 5 },
      ]);
      // 100*5 + 80*5 + 60*5 = 500 + 400 + 300 = 1200
      expect(mainPlusDrops).toBe(1200);
    });
  });

  describe('calculateMuscleFatigue', () => {
    const baseTime = 1700000000000;

    it('returns 0 for all muscles when no sessions exist', () => {
      const fatigue = calculateMuscleFatigue([], baseTime);
      expect(fatigue['klatka']).toBe(0);
      expect(fatigue['plecy']).toBe(0);
    });

    it('calculates high fatigue immediately after a heavy chest session', () => {
      const sessions = [
        {
          date: baseTime,
          exercises: [
            {
              name: 'Bench Press',
              muscleTags: ['klatka', 'triceps'],
              sets: [
                { weightKg: 100, reps: 5 },
                { weightKg: 100, reps: 5 },
                { weightKg: 100, reps: 5 },
              ],
            },
          ],
        },
      ];

      const immediate = calculateMuscleFatigue(sessions, baseTime);
      expect(immediate['klatka']).toBeGreaterThan(0.2);
      expect(immediate['triceps']).toBeGreaterThan(0.2);
      expect(immediate['pośladki']).toBe(0);

      // After 36 hours (one half-life), fatigue should decay significantly
      const later = calculateMuscleFatigue(sessions, baseTime + FATIGUE_HALF_LIFE_MS);
      expect(later['klatka']).toBeLessThan(immediate['klatka']);
    });
  });

  describe('calculateMuscleStrengthRetention and detraining', () => {
    const baseTime = 1700000000000;

    it('returns 1.0 within the 14-day retention window', () => {
      const sessions = [
        {
          date: baseTime,
          exercises: [
            {
              name: 'Przysiad',
              muscleTags: ['czworogłowe'],
              sets: [{ weightKg: 100, reps: 5 }],
            },
          ],
        },
      ];

      // Day 10 after workout (inside 14-day window)
      const day10 = baseTime + 10 * 24 * 3600 * 1000;
      const strengthDay10 = calculateMuscleStrengthRetention(sessions, day10);
      expect(strengthDay10['czworogłowe']).toBe(1.0);
      expect(strengthDay10['klatka']).toBe(STRENGTH_FLOOR); // Never trained starts at 0.5
    });

    it('decays strength after 14 days toward floor', () => {
      const sessions = [
        {
          date: baseTime,
          exercises: [
            {
              name: 'Przysiad',
              muscleTags: ['czworogłowe'],
              sets: [{ weightKg: 100, reps: 5 }],
            },
          ],
        },
      ];

      // Day 14 + 28 days = day 42 -> 1 half life past full retention window -> strength ≈ 0.5
      const day42 = baseTime + STRENGTH_FULL_MS + STRENGTH_HALF_LIFE_MS;
      const strengthDay42 = calculateMuscleStrengthRetention(sessions, day42);
      expect(strengthDay42['czworogłowe']).toBeCloseTo(0.5, 1);

      const detrained = getDetrainedMuscles(strengthDay42);
      expect(detrained).toContain('czworogłowe');
    });

    it('identifies fatigued muscles correctly', () => {
      const fatigueMap = { klatka: 0.72, plecy: 0.15, nogi: 0.55 };
      const fatigued = getFatiguedMuscles(fatigueMap, 0.5);
      expect(fatigued).toEqual(['klatka', 'nogi']);
    });
  });
});
