import { describe, expect, it } from 'vitest';
import { HEALTH_THRESHOLDS } from './thresholds';

describe('progi snu', () => {
  it('ostrzeżenie jest powyżej progu krótkiej nocy', () => {
    expect(HEALTH_THRESHOLDS.SLEEP_SHORT_H).toBeLessThan(HEALTH_THRESHOLDS.SLEEP_WARNING_H);
  });
});
