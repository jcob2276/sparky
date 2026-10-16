import { cleanup, render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OuraHealthContainer } from './OuraHealthContainer';
import { OuraHealthView } from './OuraHealthView';

const sources = vi.hoisted(() => ({
  dailyError: null as Error | null,
  daily: { date: '2026-10-16', row: null, oura: { date: '2026-10-16', readiness_score: 80 }, sourceErrors: [{ source: 'oura_enhanced', message: 'offline' }] },
}));
vi.mock('../../../store/useStore', () => ({ useUserId: () => 'owner' }));
vi.mock('../../../lib/biometricsApi', () => ({
  useDailyStrainOura: () => ({ data: sources.daily, error: sources.dailyError, isLoading: false }),
  useOuraHistory30Days: () => ({ data: { sourceErrors: [{ source: 'oura_daily_summary', message: 'history offline' }] }, isLoading: false }),
  useOuraNightDetails: () => ({ data: { sourceErrors: [{ source: 'oura_sleep_hr_timeline', message: 'HR offline' }] }, isLoading: false }),
  useOuraContext: () => ({ data: { sourceErrors: [{ source: 'daily_food_entries', message: 'food offline' }] }, isLoading: false }),
}));
vi.mock('../../../lib/correlationsApi', () => ({ useCorrelationsQuery: () => ({ data: null }) }));
vi.mock('./useFuelingContext', () => ({ useFuelingContext: () => ({ data: null }) }));
vi.mock('./OuraHealthView', () => ({ OuraHealthView: vi.fn(() => null) }));
let client: QueryClient;
beforeEach(() => { vi.clearAllMocks(); sources.dailyError = null; client = new QueryClient(); });
afterEach(() => { cleanup(); client.clear(); });
function show() {
  render(<QueryClientProvider client={client}><MemoryRouter><OuraHealthContainer /></MemoryRouter></QueryClientProvider>);
  return vi.mocked(OuraHealthView).mock.lastCall![0].data;
}
describe('health read error wiring', () => {
  it('forwards errors from all read windows while retaining the known daily reading', () => {
    const data = show();
    expect(data.oura?.readiness_score).toBe(80);
    expect(data.sourceErrors).toEqual(expect.arrayContaining([
      { source: 'oura_enhanced', message: 'offline' },
      { source: 'Historia · oura_daily_summary', message: 'history offline' },
      { source: 'oura_sleep_hr_timeline', message: 'HR offline' },
      { source: 'Przed nocą · daily_food_entries', message: 'food offline' },
    ]));
    expect(data.sourceErrors?.filter((error) => error.message === 'food offline')).toHaveLength(2);
  });
  it('also forwards whole-query failures during a refresh without deleting cached readings', () => {
    sources.dailyError = new Error('network unavailable');
    const data = show();
    expect(data.oura?.readiness_score).toBe(80);
    expect(data.sourceErrors).toContainEqual({ source: 'Pomiary dnia', message: 'network unavailable' });
  });
});
