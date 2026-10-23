import { describe, expect, it } from 'vitest';
import type { DashboardData } from './dashboardService';
import { activityWindowLabel, buildDashboardThesis } from './dashboardThesis';

const base: DashboardData = {
  topConsensus: { ticker: 'CVNA', net: 14 }, maxShort: { company: 'KRU', ticker: 'KRU', totalPct: 3.2, delta14d: null },
  congress14: { total: 10, sales: 7, buys: 3 }, insider14: { total: 6, buys: 4, sells: 2 }, watchlist14Count: 0,
  activity14d: { windowStart: '2026-01-01', windowEnd: '2026-01-05', windowDays: 5, clampedToYearStart: true, total: 16, peakDateLabel: '3 sty',
    sources: { politicians: 10, funds: 0, insiders: 6, shorts: 0 }, days: [] },
  streamItems: [], topConvergenceUsa: [], topGpwShorts: [], sourceStatuses: [], issues: [], fetchedAt: '2026-01-05T10:00:00Z',
};

describe('dashboard thesis', () => {
  it('labels a clamped window and states the data date', () => {
    expect(activityWindowLabel(base.activity14d)).toBe('5 dni (od 1 stycznia)');
    const t = buildDashboardThesis(base);
    expect(t.headline).toContain('dane do 05.01.2026');
    expect(t.windowNote).toContain('1 stycznia 2026');
  });
  it('reports unavailable sources as no read rather than zero', () => {
    const t = buildDashboardThesis({ ...base, congress14: null, insider14: null, topConsensus: null });
    expect(t.points.filter(p => p.text === 'brak odczytu')).toHaveLength(3);
  });
});
