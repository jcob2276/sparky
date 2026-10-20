import { act, cleanup, render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OuraHealthContainer } from './OuraHealthContainer';
import { OuraHealthView } from './OuraHealthView';
import { notify } from '../../../lib/notify';

const sources = vi.hoisted(() => ({
  syncOura: vi.fn(),
  computeDailyStrain: vi.fn(),
  dailyError: null as Error | null,
  drivers: { data: null as unknown, error: null as Error | null, isLoading: false },
  correlations: { data: { sourceErrors: [] as Array<{ source: string; message: string }> }, error: null as Error | null, isLoading: false },
  daily: { date: '2026-10-16', row: null, oura: { date: '2026-10-16', readiness_score: 80 }, sourceErrors: [{ source: 'oura_enhanced', message: 'offline' }] },
}));
vi.mock('../../../store/useStore', () => ({ useUserId: () => 'owner' }));
vi.mock('../../../lib/syncApi', () => ({ syncOura: sources.syncOura, computeDailyStrain: sources.computeDailyStrain }));
vi.mock('../../../lib/notify', () => ({ notify: vi.fn() }));
vi.mock('../../../lib/biometricsApi', () => ({
  useDailyStrainOura: () => ({ data: sources.daily, error: sources.dailyError, isLoading: false }),
  useOuraHistory30Days: () => ({ data: { sourceErrors: [{ source: 'oura_daily_summary', message: 'history offline' }] }, isLoading: false }),
  useOuraNightDetails: () => ({ data: { sourceErrors: [{ source: 'oura_sleep_hr_timeline', message: 'HR offline' }] }, isLoading: false }),
  useOuraContext: () => ({ data: { sourceErrors: [{ source: 'daily_food_entries', message: 'food offline' }] }, isLoading: false }),
}));
vi.mock('../../../lib/correlationsApi', () => ({ useCorrelationsQuery: () => sources.correlations }));
vi.mock('../../../lib/biometrics/sleepDrivers/useSleepDrivers', () => ({ useSleepDrivers: () => sources.drivers }));
vi.mock('./OuraHealthView', () => ({ OuraHealthView: vi.fn(() => null) }));
let client: QueryClient;
beforeEach(() => {
  vi.clearAllMocks(); sources.dailyError = null;
  sources.syncOura.mockResolvedValue(undefined);
  sources.computeDailyStrain.mockResolvedValue(undefined);
  sources.drivers = { data: null, error: null, isLoading: false };
  sources.correlations = { data: { sourceErrors: [] }, error: null, isLoading: false };
  client = new QueryClient();
});
afterEach(() => { cleanup(); client.clear(); vi.restoreAllMocks(); });
function show() {
  render(<QueryClientProvider client={client}><MemoryRouter><OuraHealthContainer /></MemoryRouter></QueryClientProvider>);
  return vi.mocked(OuraHealthView).mock.lastCall![0].data;
}
describe('health read error wiring', () => {
  it('refreshes synced measurements even if the subsequent strain calculation fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const key = ['biometrics', 'dailyStrainOura', 'owner'];
    client.setQueryData(key, { date: '2026-10-15' });
    sources.computeDailyStrain.mockRejectedValue(new Error('strain unavailable'));
    show();
    await act(async () => { await vi.mocked(OuraHealthView).mock.lastCall![0].onSync?.(); });
    expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    expect(vi.mocked(OuraHealthView).mock.lastCall![0].isSyncing).toBe(false);
    expect(notify).toHaveBeenCalledWith('Pomiary Oura pobrane; nie udało się przeliczyć obciążenia', 'error');
  });
  it('exposes partial correlation failures in the global warning', () => {
    sources.correlations.data.sourceErrors = [{ source: 'Korelacje', message: 'correlations offline' }];
    const data = show();
    expect(data.sourceErrors).toContainEqual({ source: 'Korelacje', message: 'correlations offline' });
  });
  it('exposes whole correlation failure and sleep-driver failure', () => {
    sources.correlations.error = new Error('request failed');
    sources.drivers.error = new Error('drivers offline');
    const data = show();
    expect(data.correlationsError).toBe('request failed');
    expect(data.sourceErrors).toContainEqual({ source: 'Zależności snu', message: 'drivers offline' });
  });
  it('marks pending correlations without blocking the view', () => {
    sources.correlations.isLoading = true;
    const data = show();
    expect(data.correlationsLoading).toBe(true);
    expect(vi.mocked(OuraHealthView).mock.lastCall![0].isLoading).toBe(false);
  });
  it('opens the "Dziś" tab by default and passes the sleep drivers through', () => {
    show();
    const props = vi.mocked(OuraHealthView).mock.lastCall![0];
    expect(props.activeSection).toBe('today');
    expect(props.drivers).toBe(sources.drivers);
  });
  it('forwards errors from all read windows while retaining the known daily reading', () => {
    const data = show();
    expect(data.oura?.readiness_score).toBe(80);
    expect(data.sourceErrors).toEqual(expect.arrayContaining([
      { source: 'oura_enhanced', message: 'offline' },
      { source: 'Historia · oura_daily_summary', message: 'history offline' },
      { source: 'oura_sleep_hr_timeline', message: 'HR offline' },
      { source: 'Przed nocą · daily_food_entries', message: 'food offline' },
    ]));
  });
  it('also forwards whole-query failures during a refresh without deleting cached readings', () => {
    sources.dailyError = new Error('network unavailable');
    const data = show();
    expect(data.oura?.readiness_score).toBe(80);
    expect(data.sourceErrors).toContainEqual({ source: 'Pomiary dnia', message: 'network unavailable' });
  });
});
