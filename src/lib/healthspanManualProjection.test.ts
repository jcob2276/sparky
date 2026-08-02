import { describe, expect, it } from 'vitest';
import { projectManualHealthspanEvidence } from './healthspanManualProjection';

describe('projectManualHealthspanEvidence', () => {
  it('keeps social connection separate and fills wearable gaps', () => {
    const result = projectManualHealthspanEvidence([{
      checkin_date: '2026-07-29',
      payload: {
        sleepHours: 7.5,
        dietQuality: 80,
        alcoholUnits: 1,
        socialConnection: 90,
        stress: 30,
      },
    }], []);
    expect(result.sleepDurationHours?.value).toBe(7.5);
    expect(result.lifestyle?.value).toBe(80);
    expect(result.socialConnection?.value).toBe(90);
    expect(result.stressRecoveryBalance?.value).toBe(70);
  });
});
