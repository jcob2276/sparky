import { describe, expect, it } from 'vitest';
import { buildMovementTimeline } from './ouraMovementTimeline';

describe('buildMovementTimeline', () => {
  it('preserves measured movement positions and intensities', () => {
    expect(buildMovementTimeline('0010302')).toEqual({
      status: 'available',
      samples: [
        { index: 2, intensity: 1 },
        { index: 4, intensity: 3 },
        { index: 6, intensity: 2 },
      ],
      totalSamples: 7,
    });
  });

  it('reports an unavailable series instead of inventing movement', () => {
    expect(buildMovementTimeline(null)).toEqual({
      status: 'unavailable',
      samples: [],
      totalSamples: 0,
    });
  });

  it('rejects malformed movement samples', () => {
    expect(buildMovementTimeline('001x2')).toEqual({
      status: 'invalid',
      samples: [],
      totalSamples: 0,
    });
  });
});
