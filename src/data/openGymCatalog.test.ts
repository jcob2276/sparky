import { describe, it, expect } from 'vitest';
import {
  searchOpenGymCatalog,
  findExerciseById,
  getCatalogTotalCount,
  mapTargetToSparkyTags,
} from './openGymCatalog';

describe('openGymCatalog', () => {
  it('loads all 1324 exercises', async () => {
    expect(await getCatalogTotalCount()).toBe(1324);
  });

  it('searches exercises by name', async () => {
    const results = await searchOpenGymCatalog('bench press', 5);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name.toLowerCase()).toContain('bench press');
  });

  it('finds exercise by id', async () => {
    const ex = await findExerciseById('0001');
    expect(ex).toBeDefined();
    expect(ex?.name).toBe('3/4 sit-up');
    expect(ex?.target).toBe('abs');
    expect(ex?.bodyPart).toBe('waist');
  });

  it('maps target and secondaries to Sparky tags', () => {
    const tags = mapTargetToSparkyTags('pectorals', ['triceps', 'delts']);
    expect(tags).toContain('klatka');
    expect(tags).toContain('triceps');
    expect(tags).toContain('barki');
  });
});
