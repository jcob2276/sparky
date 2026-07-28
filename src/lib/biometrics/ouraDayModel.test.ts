import { describe, expect, it } from 'vitest';
import { selectCanonicalOuraDay } from './ouraDayModel';

describe('selectCanonicalOuraDay', () => {
  it('never combines summary and enhanced rows from different dates', () => {
    const result = selectCanonicalOuraDay({
      preferredDate: '2026-07-28',
      summaries: [{ date: '2026-07-28', total_sleep_hours: 7.7 }],
      enhanced: [{ date: '2026-07-27', time_in_bed_hours: 9.1 }],
    });

    expect(result?.date).toBe('2026-07-28');
    expect(result?.enhanced).toBeNull();
    expect(result?.missingSources).toContain('oura_enhanced');
  });

  it('falls back as a complete day instead of choosing each source independently', () => {
    const result = selectCanonicalOuraDay({
      preferredDate: '2026-07-28',
      summaries: [{ date: '2026-07-27', total_sleep_hours: 7.7 }],
      enhanced: [{ date: '2026-07-27', time_in_bed_hours: 9.1 }],
    });

    expect(result?.date).toBe('2026-07-27');
    expect(result?.summary?.date).toBe('2026-07-27');
    expect(result?.enhanced?.date).toBe('2026-07-27');
  });

  it('uses the previous complete date for comparison', () => {
    const result = selectCanonicalOuraDay({
      preferredDate: '2026-07-28',
      summaries: [
        { date: '2026-07-28', total_sleep_hours: 7.7 },
        { date: '2026-07-27', total_sleep_hours: 7.2 },
      ],
      enhanced: [
        { date: '2026-07-28', time_in_bed_hours: 9.1 },
        { date: '2026-07-27', time_in_bed_hours: 8.2 },
      ],
    });

    expect(result?.previous?.date).toBe('2026-07-27');
    expect(result?.previous?.summary?.total_sleep_hours).toBe(7.2);
    expect(result?.previous?.enhanced?.time_in_bed_hours).toBe(8.2);
  });
});
