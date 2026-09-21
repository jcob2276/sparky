import { describe, it, expect } from 'vitest';
import {
  addDropToSet,
  removeDropFromSet,
  addClusterToSet,
  removeClusterFromSet,
  extraVolumeOfSet,
  nextDropWeight,
  splitBurstReps,
  syncSideSummary,
  type EnhancedWorkoutSet,
} from './workoutSetModel';
import {
  rpeToRir,
  rirToRpe,
  normalizeToRir,
  getEffortColor,
  isHardSet,
  EFFORT_BANDS,
} from './effortScale';

describe('workoutSetModel', () => {
  const baseSet: EnhancedWorkoutSet = {
    id: 1,
    type: 'straight',
    phase: 'work',
    kg: 100,
    reps: 5,
  };

  describe('drop sets', () => {
    it('adds and removes drop sets correctly', () => {
      const withDrop1 = addDropToSet(baseSet, { kg: 80, reps: 5 });
      expect(withDrop1.type).toBe('dropset');
      expect(withDrop1.drops).toHaveLength(1);
      expect(extraVolumeOfSet(withDrop1)).toBe(400); // 80 * 5

      const withDrop2 = addDropToSet(withDrop1, { kg: 60, reps: 5 });
      expect(withDrop2.drops).toHaveLength(2);
      expect(extraVolumeOfSet(withDrop2)).toBe(700); // 80*5 + 60*5

      const removed = removeDropFromSet(withDrop2, 1);
      expect(removed.drops).toHaveLength(1);
      expect(removed.type).toBe('dropset');

      const cleared = removeDropFromSet(removed, 0);
      expect(cleared.drops).toHaveLength(0);
      expect(cleared.type).toBe('straight');
    });

    it('calculates next drop weight with rounding', () => {
      expect(nextDropWeight(100, 20)).toBe(80);
      expect(nextDropWeight(80, 20)).toBe(64);
      expect(nextDropWeight(22.5, 20)).toBe(18);
    });
  });

  describe('rest-pause bursts', () => {
    it('splits total reps into decreasing bursts', () => {
      expect(splitBurstReps(12)).toEqual([6, 3, 2, 1]);
      expect(splitBurstReps(8)).toEqual([4, 2, 1, 1]);
    });

    it('manages clusters on set', () => {
      const withCluster = addClusterToSet(baseSet, { reps: 4, restSec: 15 });
      expect(withCluster.type).toBe('restpause');
      expect(withCluster.clusters).toHaveLength(1);

      const removed = removeClusterFromSet(withCluster, 0);
      expect(removed.type).toBe('straight');
    });
  });

  describe('unilateral sets', () => {
    it('syncs side summary to aggregate reps and max kg', () => {
      const unilateralSet: EnhancedWorkoutSet = {
        ...baseSet,
        sides: {
          L: { kg: 24, reps: 10, done: true },
          R: { kg: 26, reps: 8, done: true },
        },
      };

      const synced = syncSideSummary(unilateralSet);
      expect(synced.kg).toBe(26);
      expect(synced.reps).toBe(18);
      expect(synced.done).toBe(true);
    });
  });
});

describe('effortScale', () => {
  it('converts RPE <-> RIR correctly', () => {
    expect(rpeToRir(10)).toBe(0);
    expect(rpeToRir(8)).toBe(2);
    expect(rpeToRir(7.5)).toBe(2.5);

    expect(rirToRpe(0)).toBe(10);
    expect(rirToRpe(2)).toBe(8);
  });

  it('normalizes mixed input to RIR', () => {
    expect(normalizeToRir(2, null)).toBe(2);
    expect(normalizeToRir(null, 8)).toBe(2);
    expect(normalizeToRir('', '9.5')).toBe(0.5);
  });

  it('assigns color and categorizes hard sets', () => {
    expect(getEffortColor(0)).toBe(EFFORT_BANDS[0].color); // Purple
    expect(getEffortColor(1)).toBe(EFFORT_BANDS[2].color); // Orange
    expect(isHardSet(2)).toBe(true);
    expect(isHardSet(4)).toBe(false);
  });
});
