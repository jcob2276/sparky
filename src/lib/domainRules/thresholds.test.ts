import { describe, expect, it } from 'vitest';
import { HEALTH_THRESHOLDS } from '@vanguard/domain';

describe('progi snu', () => {
  it('ostrzeżenie jest powyżej progu krótkiej nocy', () => {
    expect(HEALTH_THRESHOLDS.SLEEP_SHORT_H).toBeLessThan(HEALTH_THRESHOLDS.SLEEP_WARNING_H);
  });
});
