import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CaffeineEntry } from '../../../lib/health/caffeineHistoryApi';
import type { Supplement, SupplementLog } from '../../../lib/health/supplementsClient';
import type { OuraHealthHubData } from './types';
import { OuraIntakeSection } from './OuraIntakeSection';

const state = vi.hoisted(() => ({
  supplements: [] as unknown[],
  logs: [] as unknown[],
  caffeine: [] as unknown[],
  loading: false,
  mutate: vi.fn(),
  isError: false,
  isPending: false,
  variables: undefined as unknown,
  notify: vi.fn(),
}));

vi.mock('../../../lib/health/supplementsApi', () => ({
  useSupplements: () => ({ data: state.supplements, isLoading: state.loading, isError: false }),
  useSupplementLogs: () => ({ data: state.logs, isLoading: false, isError: false }),
}));
vi.mock('../../../lib/health/supplementQuickLogApi', async (importActual) => ({
  ...(await importActual<typeof import('../../../lib/health/supplementQuickLogApi')>()),
  useQuickLogSupplement: () => ({
    mutate: state.mutate, isError: state.isError, isPending: state.isPending, variables: state.variables,
  }),
}));
vi.mock('../../../lib/notify', () => ({ notify: (...args: unknown[]) => state.notify(...args) }));
vi.mock('../../../lib/health/caffeineHistoryApi', () => ({
  useCaffeineEntries: () => ({ data: state.caffeine, isLoading: false, isError: false }),
}));

const supplement: Supplement = {
  id: 's1', user_id: 'u', slug: 'mg', name: 'Magnez', emoji: '', unit: 'szt', dose_per_unit: {}, sort_order: 1,
  active: true, start_date: null, end_date: null, reminder_time: '21:20:00', reminder_sent_date: null,
  skip_qty: false, created_at: '2026-09-01T00:00:00Z',
};

function hub(nightCount: number): OuraHealthHubData {
  const rows = Array.from({ length: nightCount }, (_, i) => ({
    date: `2026-09-${String(i + 2).padStart(2, '0')}`, sleep_score: 80, hrv_avg: 55, latency_minutes: 10,
  }));
  return { date: '2026-09-21', ouraHistory: rows as unknown as OuraHealthHubData['ouraHistory'] } as OuraHealthHubData;
}

describe('OuraIntakeSection', () => {
  beforeEach(() => {
    state.supplements = [];
    state.logs = [];
    state.caffeine = [];
    state.loading = false;
    state.mutate = vi.fn();
    state.isError = false;
    state.isPending = false;
    state.variables = undefined;
    state.notify = vi.fn();
  });

  it('pokazuje stan pusty po polsku, gdy nie ma kawy ani suplementów', () => {
    render(<OuraIntakeSection userId="u" data={hub(10)} />);
    expect(screen.getByRole('heading', { name: 'Kawa i suple' })).toBeInTheDocument();
    expect(screen.getByText('Brak zapisanej kawy i suplementów.')).toBeInTheDocument();
  });

  it('pokazuje "Za mało danych" zamiast liczb i stos na dziś', () => {
    state.supplements = [supplement];
    state.logs = [{
      id: 'l1', user_id: 'u', supplement_id: 's1', quantity: 1, date: '2026-09-21',
      logged_at: '2026-09-21T21:30:00+02:00', note: null,
    } satisfies SupplementLog];
    state.caffeine = [{
      date: '2026-09-21', name: 'Kawa', loggedAt: '2026-09-21T08:15:00+02:00', mg: 95,
    } satisfies CaffeineEntry];
    render(<OuraIntakeSection userId="u" data={hub(10)} />);

    expect(screen.getByText('Zażyty o 21:30')).toBeInTheDocument();
    expect(screen.getAllByText('Za mało danych').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Brak danych')).toBeInTheDocument();
    expect(screen.getAllByText('To korelacja, nie dowód.').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Wynik snu')).not.toBeInTheDocument();
  });

  it('pokazuje liczby i n gdy obie grupy mają >=5 nocy', () => {
    state.supplements = [supplement];
    const takenDays = [3, 4, 5, 6, 7];
    state.logs = takenDays.map((d) => ({
      id: `l${d}`, user_id: 'u', supplement_id: 's1', quantity: 1, date: `2026-09-${String(d).padStart(2, '0')}`,
      logged_at: `2026-09-${String(d).padStart(2, '0')}T21:30:00+02:00`, note: null,
    }));
    render(<OuraIntakeSection userId="u" data={hub(19)} />);

    expect(screen.getByText('Wynik snu')).toBeInTheDocument();
    expect(screen.getByText(/Z suplem/)).toBeInTheDocument();
    expect(screen.getByText('(n=5)')).toBeInTheDocument();
  });

  it('klik w niezażyty suplement loguje zażycie teraz i pokazuje Cofnij w toaście', () => {
    state.supplements = [supplement];
    render(<OuraIntakeSection userId="u" data={hub(10)} />);

    const row = screen.getByRole('checkbox', { name: /Magnez/ });
    expect(row).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(row);

    expect(state.mutate).toHaveBeenCalledTimes(1);
    const [action, opts] = state.mutate.mock.calls[0];
    expect(action).toMatchObject({ kind: 'log', log: { user_id: 'u', supplement_id: 's1', date: '2026-09-21' } });
    expect(Math.abs(Date.now() - new Date(action.log.logged_at).getTime())).toBeLessThan(5000);

    opts.onSuccess();
    expect(state.notify).toHaveBeenCalledWith('Zaznaczono: Magnez', 'success', expect.objectContaining({
      action: expect.objectContaining({ label: 'Cofnij' }),
    }));
    state.notify.mock.calls[0][2].action.onClick();
    expect(state.mutate).toHaveBeenLastCalledWith({ kind: 'unlog', logId: action.log.id, supplementId: 's1' });
  });

  it('ponowny klik w zażyty suplement cofa wpis; wiersz ma aria-checked i godzinę', () => {
    state.supplements = [supplement];
    state.logs = [{
      id: 'l1', user_id: 'u', supplement_id: 's1', quantity: 1, date: '2026-09-21',
      logged_at: '2026-09-21T21:30:00+02:00', note: null,
    }];
    render(<OuraIntakeSection userId="u" data={hub(10)} />);
    const row = screen.getByRole('checkbox', { name: /Magnez/ });
    expect(row).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Zażyty o 21:30')).toBeInTheDocument();
    fireEvent.click(row);
    expect(state.mutate).toHaveBeenCalledWith({ kind: 'unlog', logId: 'l1', supplementId: 's1' });
  });

  it('blokuje wiersz w trakcie zapisu i pokazuje błąd', () => {
    state.supplements = [supplement];
    state.isPending = true;
    state.isError = true;
    state.variables = { kind: 'log', log: { supplement_id: 's1' } };
    render(<OuraIntakeSection userId="u" data={hub(10)} />);
    expect(screen.getByRole('checkbox', { name: /Magnez/ })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Nie udało się zapisać suplementu');
  });

  it('pokazuje postęp "Zaznaczone n z 5" zamiast samych liczb', () => {
    state.supplements = [supplement];
    state.logs = [{
      id: 'l1', user_id: 'u', supplement_id: 's1', quantity: 1, date: '2026-09-05',
      logged_at: '2026-09-05T21:30:00+02:00', note: null,
    }];
    render(<OuraIntakeSection userId="u" data={hub(19)} />);
    expect(screen.getByText('Z suplem: Zaznaczone 1 z 5 potrzebnych nocy')).toBeInTheDocument();
    expect(screen.getAllByRole('progressbar').length).toBeGreaterThan(0);
    expect(screen.getByText(/Zaznaczaj regularnie, a po 5 nocach zobaczysz porównanie/)).toBeInTheDocument();
  });

  it('pokazuje wiersze Impacts z diverging barem i n po obu stronach, gdy kawa ma dość nocy', () => {
    const rows = Array.from({ length: 14 }, (_, i) => {
      const d = i + 2;
      const nd = String(d).padStart(2, '0');
      const prev = String(d - 1).padStart(2, '0');
      return { date: `2026-09-${nd}`, sleep_score: d <= 7 ? 65 : 80, hrv_avg: 50, latency_minutes: 10,
        bedtime_timestamp: `2026-09-${prev}T23:00:00+02:00` };
    });
    state.caffeine = Array.from({ length: 13 }, (_, i) => {
      const day = i + 1;
      const dd = String(day).padStart(2, '0');
      return { date: `2026-09-${dd}`, name: 'Kawa', mg: 95, loggedAt: `2026-09-${dd}T${day <= 6 ? '20' : '09'}:00:00+02:00` };
    });
    const data = { date: '2026-09-21', ouraHistory: rows } as unknown as OuraHealthHubData;
    render(<OuraIntakeSection userId="u" data={data} />);
    expect(screen.getAllByText(/n=6 vs n=7/).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('img', { name: /Wynik snu: -15/ }).length).toBeGreaterThan(0);
    expect(screen.getByText(/Ostatnia kawa najpóźniej/)).toBeInTheDocument();
  });
});
