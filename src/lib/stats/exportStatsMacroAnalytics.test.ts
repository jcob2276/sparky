import { describe, expect, it } from 'vitest';
import { renderMacroAnalytics } from './exportStatsMacroAnalytics';
import type { ExportData } from './exportStatsFetch';

describe('renderMacroAnalytics', () => {
  it('renders identity gap matrix, sales velocity, avoidance loops, and marathon preparation', () => {
    const mockData = {
      journal: [
        {
          date: '2026-09-14',
          result: 'Z',
          task_1: 'Diale',
          category_1: 'konto',
          done_1: true,
          task_2: 'Bieg 10km',
          category_2: 'cialo',
          done_2: true,
        },
        {
          date: '2026-09-15',
          result: 'P',
          task_1: 'Closing',
          category_1: 'konto',
          done_1: false,
        },
      ],
      habitLogs: [
        { habit_id: 'h1', final_stimulus: 'Porno' },
      ],
      habits: [
        { id: 'h1', is_positive: false, name: 'Lenie', icon: '😒' },
      ],
      stravaData: [
        { is_oura: false, distance: 13220, gc_vo2max: 48.5 },
      ],
      phoneUsageData: [
        {
          entertainment_minutes: 120,
          top_apps: [{ app: 'TikTok', min: 60 }, { app: 'Clash Royale', min: 40 }],
        },
      ],
      ouraEnhanced: [{ vo2_max: 48.5 }],
    } as unknown as ExportData;

    const res = renderMacroAnalytics({
      d: mockData,
      dateRange: { from: '2026-09-11', to: '2026-09-18' },
      avgSleep: 6.5,
      avgReadiness: 79,
      avgHrv: 64.9,
      avgRhr: 45.1,
      avgCalories: 2442,
      avgProtein: 108,
      avgPhoneMinutes: 360,
      avgLateNight: 47,
      totalCardioKm: 31.9,
    });

    expect(res).toContain('MACIERZ ROZJAZDU TOŻSAMOŚCI');
    expect(res).toContain('PIPELINE SPRZEDAŻY & TONAZ REALIZACJI');
    expect(res).toContain('ANATOMIA PĘTLI SABOTAŻU & RECOVERY');
    expect(res).toContain('GOTOWOŚĆ BIEGOWA: MARATON 4 PAŹDZIERNIKA');
    expect(res).toContain('DŹWIGNIA NA KOLEJNY TYDZIEŃ');
    expect(res).toContain('No-Phone Morning');
  });
});
