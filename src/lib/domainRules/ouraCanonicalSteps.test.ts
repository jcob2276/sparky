import { describe, expect, it } from 'vitest';
import { computePerDay } from '../../../supabase/functions/_shared/nightly/computePerDay';

function calculate(summarySteps: number | null | undefined, copiedSteps: number | null) {
  const date = '2026-10-29';
  const input = {
    date, todayWarsaw: date, now: new Date('2026-10-29T12:00:00Z'),
    zones: {}, enh: { [date]: [{ steps: copiedSteps }] },
    summ: { [date]: [{ steps: summarySteps }] },
    nutr: {}, workouts: {}, strava: {}, recon: {}, food: {},
    baseByDate: {}, respByDate: {}, skinTempByDate: {}, sleepByDate: {},
    strainHistRunning: [], illnessDates: new Map(), weight: 75, sex: 'M', ageYears: 30,
    algoVersion: 1, uid: 'owner', getBaselinesForDate: () => ({}),
  };
  return computePerDay(input).row;
}

describe('canonical Oura steps in daily calculations', () => {
  it('uses known summary steps when the enhanced copy is missing', () => {
    expect(calculate(10634, null).components.steps).toBe(10634);
  });
  it('uses the canonical value when the old copy differs', () => {
    expect(calculate(2571, 9000).components.steps).toBe(2571);
  });
  it('keeps a measured zero instead of falling back to the copy', () => {
    expect(calculate(0, 9000).components.steps).toBe(0);
  });
  it('does not silently turn an unknown canonical value into an independent copy', () => {
    expect(calculate(null, 7696).components.steps).toBeNull();
  });
});
