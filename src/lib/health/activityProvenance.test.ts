import { describe, expect, it } from 'vitest';
import { activitySourceLabel, activityHeartRateZones } from '@vanguard/domain';

describe('activity provenance', () => {
  it('retains Garmin via Intervals identity independently of the legacy table and HR source', () => {
    expect(activitySourceLabel({source:'garmin_intervals',hr_source:'oura'})).toBe('Garmin przez Intervals.icu');
    expect(activitySourceLabel({})).toBe('Źródło nieznane');
    expect(activitySourceLabel({source:'strava'})).toBe('Strava');
  });
  it('uses all reported Intervals zone seconds and preserves zero without assuming five zones', () => {
    expect(activityHeartRateZones({source:'garmin_intervals',icu_hr_zone_times:[304,631,0,764,278,71,35]}))
      .toEqual([304,631,0,764,278,71,35]);
    expect(activityHeartRateZones({source:'garmin_intervals',icu_hr_zone_times:null})).toEqual([]);
  });
  it('reads legacy Garmin Connect zones but rejects corrupt or negative durations', () => {
    expect(activityHeartRateZones({gc_hr_zones:[{secsInZone:0},{secsInZone:120}]})).toEqual([0,120]);
    expect(activityHeartRateZones({icu_hr_zone_times:[-1,100]})).toEqual([]);
    expect(activityHeartRateZones({icu_hr_zone_times:['120']})).toEqual([]);
  });
});
