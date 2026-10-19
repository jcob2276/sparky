import { describe, expect, it } from 'vitest';
import { formatWorkoutTonnage, normalizeSessionRpe, isStrengthLog } from './workoutDisplay';

describe('workoutDisplay', () => {
  it('formats tonnage as kg under 1000 and tonnes above', () => {
    expect(formatWorkoutTonnage(0)).toBeNull();
    expect(formatWorkoutTonnage(250)).toBe('250 kg');
    expect(formatWorkoutTonnage(2500)).toBe('2.5 t');
    expect(formatWorkoutTonnage(1000)).toBe('1 t');
  });

  it('hides invalid RPE including zero', () => {
    expect(normalizeSessionRpe(null)).toBeNull();
    expect(normalizeSessionRpe(0)).toBeNull();
    expect(normalizeSessionRpe(7)).toBe(7);
    expect(normalizeSessionRpe(11)).toBeNull();
  });

  it('treats missing tags as strength, filters activity/wellness', () => {
    expect(isStrengthLog(null)).toBe(true);
    expect(isStrengthLog(['chest'])).toBe(true);
    expect(isStrengthLog(['activity'])).toBe(false);
    expect(isStrengthLog(['wellness'])).toBe(false);
  });
});
