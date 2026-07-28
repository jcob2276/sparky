import { describe, expect, it } from 'vitest';
import { mapOuraNightDetails } from './ouraNightDetails';

describe('mapOuraNightDetails', () => {
  it('keeps measured phase, heart-rate and HRV series for one day', () => {
    const result = mapOuraNightDetails({
      date: '2026-07-28',
      phases: [{
        ts: '2026-07-27T23:31:00+02:00',
        phase: 'awake',
        phase_code: 4,
      }],
      heartRate: [{
        ts: '2026-07-28T02:00:00+02:00',
        bpm: 49,
      }],
      hrv: [{
        ts: '2026-07-28T02:00:00+02:00',
        hrv: 62,
      }],
    });

    expect(result).toMatchObject({
      date: '2026-07-28',
      phaseStatus: 'available',
      heartRateStatus: 'available',
      hrvStatus: 'available',
    });
    expect(result.heartRate[0]?.bpm).toBe(49);
  });

  it('names missing series independently', () => {
    const result = mapOuraNightDetails({
      date: '2026-07-28',
      phases: [],
      heartRate: [{ ts: '2026-07-28T02:00:00+02:00', bpm: 49 }],
      hrv: [],
    });

    expect(result.phaseStatus).toBe('unavailable');
    expect(result.heartRateStatus).toBe('available');
    expect(result.hrvStatus).toBe('unavailable');
  });
});
