import { describe, expect, it } from 'vitest';
import { isRunSport } from './runSports';

describe('isRunSport', () => {
  it('liczy biegi uliczne, terenowe i wirtualne, a nie hike ani spacer', () => {
    expect(isRunSport('Run')).toBe(true);
    expect(isRunSport('TrailRun')).toBe(true);
    expect(isRunSport('VirtualRun')).toBe(true);
    expect(isRunSport('Hike')).toBe(false);
    expect(isRunSport('Walk')).toBe(false);
    expect(isRunSport(null)).toBe(false);
  });
});
