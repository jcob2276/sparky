import { render, screen } from '@testing-library/react';
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
}));

vi.mock('../../../lib/health/supplementsApi', () => ({
  useSupplements: () => ({ data: state.supplements, isLoading: state.loading, isError: false }),
  useSupplementLogs: () => ({ data: state.logs, isLoading: false, isError: false }),
}));
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
});
