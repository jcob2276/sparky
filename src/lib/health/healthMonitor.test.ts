import { describe, expect, it } from 'vitest';
import { evaluateHealthMonitor, type VitalHistoryRecord } from '@vanguard/domain';

describe('evaluateHealthMonitor', () => {
  const dummyHistory: VitalHistoryRecord[] = Array.from({ length: 14 }).map((_, idx) => ({
    date: `2026-10-${String(idx + 1).padStart(2, '0')}`,
    hrv: 60 + (idx % 5) * 2, // 60, 62, 64, 66, 68... mean ~64
    restingHr: 50 + (idx % 3), // 50, 51, 52... mean ~51
    breathingRate: 14.5 + (idx % 2) * 0.2, // ~14.6
    skinTempDev: 0.05 * ((idx % 3) - 1), // -0.05, 0, 0.05
    spo2: 98,
  }));

  it('marks metrics as calibrating when history has fewer than 5 days', () => {
    const res = evaluateHealthMonitor(
      { hrv: 65, restingHr: 50 },
      dummyHistory.slice(0, 3)
    );
    expect(res.overallStatus).toBe('calibrating');
    const hrv = res.vitals.find((v) => v.metricKey === 'hrv');
    expect(hrv?.status).toBe('calibrating');
  });

  it('correctly evaluates normal vitals within baseline bounds', () => {
    const res = evaluateHealthMonitor(
      {
        hrv: 63,
        restingHr: 51,
        breathingRate: 14.6,
        skinTempDev: 0,
        spo2: 98,
      },
      dummyHistory,
      '2026-10-15'
    );

    expect(res.overallStatus).toBe('all_normal');
    expect(res.overallStatusLabel).toContain('przedziale historii');

    const hrv = res.vitals.find((v) => v.metricKey === 'hrv');
    expect(hrv?.status).toBe('optimal');
    expect(hrv?.formattedCurrent).toBe('63 ms');

    const rhr = res.vitals.find((v) => v.metricKey === 'resting_hr');
    expect(rhr?.status).toBe('optimal');
  });

  it('flags alerts when HRV crashes or temperature spikes', () => {
    const res = evaluateHealthMonitor(
      {
        hrv: 25, // deep drop
        restingHr: 68, // elevated RHR
        breathingRate: 18.0, // elevated breath
        skinTempDev: 0.9, // fever deviation
        spo2: 93, // low oxygen
      },
      dummyHistory,
      '2026-10-15'
    );

    expect(res.overallStatus).toBe('attention_needed');
    const hrv = res.vitals.find((v) => v.metricKey === 'hrv');
    expect(hrv?.status).toBe('attention');
    expect(hrv?.statusLabel).toBe('Poza przedziałem historii');

    const temp = res.vitals.find((v) => v.metricKey === 'skin_temp_dev');
    expect(temp?.status).toBe('attention');
    expect(temp?.statusLabel).toBe('Poza przedziałem historii');
  });
  it('uses distinct past dates only and never diagnoses fever from a skin-temperature deviation',()=>{
    const result=evaluateHealthMonitor({skinTempDev:0.9},[
      ...dummyHistory,...dummyHistory,{date:'2026-10-16',skinTempDev:50},{date:'2025-01-01',skinTempDev:60},
    ],'2026-10-15');
    expect(result.daysAnalyzed).toBe(14);
    expect(result.vitals.find(row=>row.metricKey === 'skin_temp_dev')?.daysOfHistory).toBe(14);
    expect(result.vitals.find(row=>row.metricKey === 'skin_temp_dev')?.statusLabel).not.toMatch(/gorącz|podgorącz/);
    expect(result.vitals.find(row=>row.metricKey === 'hrv')?.status).toBe('calibrating');
  });
});

