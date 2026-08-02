import { describe, expect, it } from 'vitest';
import {
  currentHealthspanWeek,
  evaluateHealthspanLeverOutcome,
} from './healthspanCheckinsApi';

describe('healthspan weekly lifecycle', () => {
  it('anchors every day to a Monday week', () => {
    expect(currentHealthspanWeek('2026-07-29')).toBe('2026-07-27');
    expect(currentHealthspanWeek('2026-08-02')).toBe('2026-07-27');
  });

  it('settles a lever against its stored target without claiming causality', () => {
    expect(evaluateHealthspanLeverOutcome(72, 64, 69)).toBe('success');
    expect(evaluateHealthspanLeverOutcome(66, 64, 69)).toBe('fail');
    expect(evaluateHealthspanLeverOutcome(null, 64, 69)).toBe('no_data');
  });
});
