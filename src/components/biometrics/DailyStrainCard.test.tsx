import { cleanup, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getTodayWarsaw, shiftDateStr } from '../../lib/date';
import DailyStrainCard from './DailyStrainCard';

const source = vi.hoisted(() => ({
  userId: 'alice', refresh: vi.fn(), error: null as Error | null,
  row: { date: '', strain_score: null as number | null, recovery_score: null as number | null,
    daily_status: null as string | null, main_limiter: 'recovery_ok', fueling_score: null as number | null,
    fueling_provisional: false, components: null, readiness_level: null, explanation: null as string | null },
  oura: null as { date: string } | null,
  sourceErrors: [] as { source: string; message: string }[],
}));
vi.mock('../../store/useStore', () => ({ useUserId: () => source.userId }));
vi.mock('../../lib/biometricsApi', () => ({ useDailyStrainOura: () => ({
  data: { row: source.row, oura: source.oura, enhanced: null, sourceErrors: source.sourceErrors }, isLoading: false, error: source.error,
}) }));
vi.mock('./hooks/useDailyStrainRefresh', () => ({ useDailyStrainRefresh: () => ({ refreshing: false, refresh: source.refresh }) }));
vi.mock('./DailyStrainVitalsRow', () => ({ default: () => null }));

const clients: QueryClient[] = [];
function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  clients.push(client);
  return render(<QueryClientProvider client={client}><MemoryRouter><DailyStrainCard /></MemoryRouter></QueryClientProvider>);
}
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  source.userId = 'alice'; source.error = null; source.oura = null;
  source.sourceErrors = [];
  source.row = { date: getTodayWarsaw(), strain_score: null, recovery_score: null, daily_status: null,
    main_limiter: 'recovery_ok', fueling_score: null, fueling_provisional: false, components: null,
    readiness_level: null, explanation: null };
});
afterEach(() => { cleanup(); clients.splice(0).forEach((client) => client.clear()); vi.restoreAllMocks(); });

describe('daily health evidence', () => {
  it('shows an unavailable source without hiding the known daily scores', () => {
    source.sourceErrors = [{ source: 'oura_enhanced', message: 'offline' }];
    source.row.strain_score = 10;
    show();
    expect(screen.getByText(/oura_enhanced: offline/)).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });
  it('keeps missing strain and recovery distinct from measured zero', () => {
    show();
    expect(within(screen.getByText('Strain').parentElement!).getByText('--')).toBeInTheDocument();
    expect(within(screen.getByText('Recovery').parentElement!).getByText('--')).toBeInTheDocument();
  });

  it('still displays genuine zero scores', () => {
    source.row.strain_score = 0; source.row.recovery_score = 0;
    show();
    expect(within(screen.getByText('Strain').parentElement!).getByText('0')).toBeInTheDocument();
    expect(within(screen.getByText('Recovery').parentElement!).getByText('0')).toBeInTheDocument();
  });

  it.each([null, 'green', 'unknown'])('does not present incomplete measurements as a positive state (%s)', (status) => {
    source.row.daily_status = status;
    const { container } = show();
    expect(container.firstElementChild).not.toHaveClass('!border-success/20');
  });

  it('reads the canonical fueling column and marks an unfinished diary as provisional', () => {
    source.row.fueling_score = 42; source.row.fueling_provisional = true;
    show();
    expect(screen.getByText('Fueling · wstępne')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.queryByText('Żywienie jeszcze niepełne')).not.toBeInTheDocument();
  });

  it('shows the stored explanation from the same daily row', () => {
    source.row.explanation = 'Zarejestrowana sesja treningowa.';
    show();
    expect(screen.getByText('Zarejestrowana sesja treningowa.')).toBeInTheDocument();
  });

  it('does not treat calories as a final limiter when the diary is unfinished', () => {
    source.row.fueling_provisional = true; source.row.main_limiter = 'calories'; source.row.daily_status = 'red';
    source.row.explanation = 'Za mało kalorii względem obciążenia.';
    const { container } = show();
    expect(container.firstElementChild).not.toHaveClass('!border-danger/25');
    expect(screen.queryByText('Za mało kalorii względem obciążenia.')).not.toBeInTheDocument();
    expect(screen.queryByText('Żywienie jeszcze niepełne')).not.toBeInTheDocument();
  });

  it('labels wearable data from a different day', () => {
    source.oura = { date: shiftDateStr(getTodayWarsaw(), -1) };
    show();
    expect(screen.getByText(`Oura · dane z ${source.oura.date}`)).toBeInTheDocument();
  });

  it('attempts automatic refresh separately when another account has the same stale date', () => {
    source.row.date = shiftDateStr(getTodayWarsaw(), -1);
    const { rerender } = show();
    expect(source.refresh).toHaveBeenCalledTimes(1);
    source.userId = 'bob';
    rerender(<QueryClientProvider client={clients[0]}><MemoryRouter><DailyStrainCard /></MemoryRouter></QueryClientProvider>);
    expect(source.refresh).toHaveBeenCalledTimes(2);
  });

  it('avoids repeated automatic refresh when local storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    source.row.date = shiftDateStr(getTodayWarsaw(), -1);
    const { rerender } = show();
    source.row.date = shiftDateStr(getTodayWarsaw(), -2);
    rerender(<QueryClientProvider client={clients[0]}><MemoryRouter><DailyStrainCard /></MemoryRouter></QueryClientProvider>);
    expect(source.refresh).toHaveBeenCalledTimes(1);
  });
});
