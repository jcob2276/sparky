/* eslint-disable max-lines-per-function */
import { describe, it, expect } from 'vitest';
import {
  computeNextPrescription,
  selectEpleyDeloadCandidate,
  countConsecutiveStalls,
  type ProgressionTargetConfig,
  type PastSessionResult,
} from './progressionEngine';

describe('progressionEngine', () => {
  describe('selectEpleyDeloadCandidate', () => {
    it('finds plate grid candidate hitting ~90% 1RM', () => {
      // 100kg x 5 reps -> e1RM = 100 * (1 + 5/30) = 116.67 kg
      // Target deload 1RM = 116.67 * 0.9 = 105 kg
      // Ideal weight for 5 reps: 105 / (1 + 5/30) = 90 kg
      const candidate = selectEpleyDeloadCandidate(100, 5, 2.5, 0.9);
      expect(candidate).not.toBeNull();
      expect(candidate?.weight).toBe(90);
      expect(candidate?.reps).toBe(5);
    });
  });

  describe('countConsecutiveStalls', () => {
    it('counts failures from the end', () => {
      const history: PastSessionResult[] = [
        { weight: 100, reps: [5, 5], targetReps: 5, targetWeight: 100, ok: true },
        { weight: 102.5, reps: [5, 4], targetReps: 5, targetWeight: 102.5, ok: false },
        { weight: 102.5, reps: [4, 4], targetReps: 5, targetWeight: 102.5, ok: false },
      ];
      expect(countConsecutiveStalls(history)).toBe(2);
    });
  });

  describe('Linear progression', () => {
    const config: ProgressionTargetConfig = {
      policy: 'linear',
      weight: 100,
      reps: 5,
      sets: 3,
      incrementKg: 2.5,
    };

    it('advances weight after successful session', () => {
      const history: PastSessionResult[] = [
        { weight: 100, reps: [5, 5, 5], targetReps: 5, targetWeight: 100, ok: true },
      ];
      const next = computeNextPrescription(config, history);
      expect(next.kind).toBe('up');
      expect(next.weight).toBe(102.5);
    });

    it('holds weight on 1st or 2nd stall', () => {
      const history: PastSessionResult[] = [
        { weight: 100, reps: [5, 4, 3], targetReps: 5, targetWeight: 100, ok: false },
      ];
      const next = computeNextPrescription(config, history);
      expect(next.kind).toBe('hold');
      expect(next.weight).toBe(100);
    });

    it('triggers deload after 3 stalls', () => {
      const history: PastSessionResult[] = [
        { weight: 100, reps: [5, 4, 3], targetReps: 5, targetWeight: 100, ok: false },
        { weight: 100, reps: [5, 4, 4], targetReps: 5, targetWeight: 100, ok: false },
        { weight: 100, reps: [4, 4, 3], targetReps: 5, targetWeight: 100, ok: false },
      ];
      const next = computeNextPrescription(config, history);
      expect(next.kind).toBe('deload');
      expect(next.weight).toBeLessThan(100);
    });
  });

  describe('Greyskull LP progression', () => {
    const config: ProgressionTargetConfig = {
      policy: 'greyskull',
      weight: 80,
      reps: 5,
      sets: 3,
      incrementKg: 2.5,
    };

    it('gives double jump (+5kg) when AMRAP >= 2x target reps', () => {
      const history: PastSessionResult[] = [
        { weight: 80, reps: [5, 5, 10], targetReps: 5, targetWeight: 80, amrapReps: 10, ok: true },
      ];
      const next = computeNextPrescription(config, history);
      expect(next.kind).toBe('up');
      expect(next.weight).toBe(85); // 80 + 2.5 * 2
      expect(next.why).toContain('Podwójny skok');
    });

    it('resets immediately after 1 failure', () => {
      const history: PastSessionResult[] = [
        { weight: 80, reps: [5, 4, 4], targetReps: 5, targetWeight: 80, ok: false },
      ];
      const next = computeNextPrescription(config, history);
      expect(next.kind).toBe('deload');
      expect(next.weight).toBe(70); // Optimal Epley candidate on 2.5kg grid hitting exactly 90% 1RM
      expect(next.reps).toBe(6);
    });
  });

  describe('Double progression (rep range 8-12)', () => {
    const config: ProgressionTargetConfig = {
      policy: 'double',
      weight: 30,
      reps: 8,
      sets: 3,
      repsMin: 8,
      repsMax: 12,
      incrementKg: 2.5,
    };

    it('holds weight and climbs reps before reaching top', () => {
      const history: PastSessionResult[] = [
        { weight: 30, reps: [9, 9, 8], targetReps: 8, targetWeight: 30, ok: true },
      ];
      const next = computeNextPrescription(config, history);
      expect(next.kind).toBe('hold');
      expect(next.weight).toBe(30);
      expect(next.reps).toBe(9); // min (8) + 1
    });

    it('advances weight and resets reps to min when top of range is completed', () => {
      const history: PastSessionResult[] = [
        { weight: 30, reps: [12, 12, 12], targetReps: 12, targetWeight: 30, ok: true },
      ];
      const next = computeNextPrescription(config, history);
      expect(next.kind).toBe('up');
      expect(next.weight).toBe(32.5);
      expect(next.reps).toBe(8); // Reset back to bottom
    });
  });

  describe('Assisted progression (inverted)', () => {
    const config: ProgressionTargetConfig = {
      policy: 'assisted',
      weight: 30, // 30kg counterweight assistance
      reps: 8,
      sets: 3,
      incrementKg: 5,
    };

    it('reduces assistance weight upon completion', () => {
      const history: PastSessionResult[] = [
        { weight: 30, reps: [8, 8, 8], targetReps: 8, targetWeight: 30, ok: true },
      ];
      const next = computeNextPrescription(config, history);
      expect(next.kind).toBe('up');
      expect(next.weight).toBe(25); // Less help
    });

    it('increases assistance weight upon repeated stall', () => {
      const history: PastSessionResult[] = [
        { weight: 25, reps: [8, 6, 5], targetReps: 8, targetWeight: 25, ok: false },
        { weight: 25, reps: [7, 6, 5], targetReps: 8, targetWeight: 25, ok: false },
      ];
      const next = computeNextPrescription(config, history);
      expect(next.kind).toBe('deload');
      expect(next.weight).toBe(30); // More help
    });
  });

  describe('Bodyweight progression', () => {
    const config: ProgressionTargetConfig = {
      policy: 'bodyweight',
      weight: 0,
      reps: 20,
      sets: 3,
      repsMin: 10,
      repsMax: 20,
    };

    it('adds a set and resets reps when ceiling is achieved', () => {
      const history: PastSessionResult[] = [
        { weight: 0, reps: [20, 20, 20], targetReps: 20, targetWeight: 0, ok: true },
      ];
      const next = computeNextPrescription(config, history);
      expect(next.kind).toBe('up');
      expect(next.sets).toBe(4);
      expect(next.reps).toBe(10);
      expect(next.weight).toBe(0);
    });
  });
});
