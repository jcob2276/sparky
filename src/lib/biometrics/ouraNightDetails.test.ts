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

  it('keeps only samples from the selected main sleep interval', () => {
    const result = mapOuraNightDetails({
      date: '2026-07-28',
      bedtimeStart: '2026-07-27T23:31:00+02:00',
      bedtimeEnd: '2026-07-28T08:42:00+02:00',
      phases: [
        { ts: '2026-07-27T18:00:00+02:00', phase: 'light', phase_code: 2 },
        { ts: '2026-07-27T23:31:00+02:00', phase: 'awake', phase_code: 4 },
        { ts: '2026-07-28T02:00:00+02:00', phase: 'deep', phase_code: 1 },
        { ts: '2026-07-28T08:41:00+02:00', phase: 'light', phase_code: 2 },
        { ts: '2026-07-28T14:00:00+02:00', phase: 'rem', phase_code: 3 },
      ],
      heartRate: [
        { ts: '2026-07-27T18:00:00+02:00', bpm: 70 },
        { ts: '2026-07-28T01:00:00+02:00', bpm: 52 },
      ],
      hrv: [
        { ts: '2026-07-28T05:00:00+02:00', hrv: 61 },
        { ts: '2026-07-28T14:00:00+02:00', hrv: 40 },
      ],
    } as Parameters<typeof mapOuraNightDetails>[0]);

    expect(result.phases.map((point) => point.phase_code)).toEqual([4, 1, 2]);
    expect(result.heartRate.map((point) => point.bpm)).toEqual([52]);
    expect(result.hrv.map((point) => point.hrv)).toEqual([61]);
  });
});
