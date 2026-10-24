import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_DRAFT } from '../../../lib/closer/closerDayModel';
import type { CloserDailyLogRow } from '../../../lib/closer/closerApi';
import MorningPlanYesterdayNumbers from './MorningPlanYesterdayNumbers';

const state = vi.hoisted(() => ({
  day: {} as Record<string, unknown>,
  week: { sums: { appointments: 0, salesCalls: 0, dials: 0 }, loading: false, error: null },
  save: vi.fn(),
}));

vi.mock('../../../lib/closer/closerTargetsApi', async () => {
  const { DEFAULT_CLOSER_TARGETS } = await import('../../../lib/closer/closerDayModel');
  return { useCloserTargets: () => DEFAULT_CLOSER_TARGETS };
});

vi.mock('../salesNumbers/useDaySalesNumbers', () => ({ useDaySalesNumbers: () => state.day }));
vi.mock('../salesNumbers/useWeekSalesSums', () => ({ useWeekSalesSums: () => state.week }));

const log = (patch: Partial<CloserDailyLogRow>): CloserDailyLogRow => ({
  id: 'l', user_id: 'u', date: '2026-10-20', dials: 0, work_hours: 0, appointments: 0, sales_calls: 0, sales_closed: 0,
  notes: null, created_at: '', updated_at: '', ...patch,
});

function setDay(patch: Record<string, unknown>) {
  state.day = {
    row: null, loading: false, loadError: null, draft: EMPTY_DRAFT, patchDraft: vi.fn(),
    complete: false, saving: false, save: state.save, ...patch,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  state.week = { sums: { appointments: 0, salesCalls: 0, dials: 0 }, loading: false, error: null };
  setDay({});
});

describe('MorningPlanYesterdayNumbers', () => {
  it('pokazuje wczorajsze liczby, opinię i tempo tygodnia', () => {
    setDay({ row: log({ appointments: 4, dials: 41, sales_calls: 1, notes: 'Po obiedzie lepiej' }) });
    state.week = { sums: { appointments: 12, salesCalls: 3, dials: 90 }, loading: false, error: null };
    render(<MorningPlanYesterdayNumbers userId="u" planningDate="2026-10-21" />);
    expect(screen.getByRole('heading', { name: 'Wczoraj' })).toBeInTheDocument();
    expect(screen.getByText('41')).toBeInTheDocument();
    expect(screen.getByText('Po obiedzie lepiej')).toBeInTheDocument();
    expect(screen.getByText(/umówieni 12\/30, sales calle 3\/10/)).toBeInTheDocument();
    expect(screen.getByText(/Dziś potrzeba około 4 umówień i 2 sales calli/)).toBeInTheDocument();
  });

  it('gdy cele tygodnia są zrobione, nie żąda więcej', () => {
    setDay({ row: log({ appointments: 5, dials: 10, sales_calls: 2 }) });
    state.week = { sums: { appointments: 31, salesCalls: 10, dials: 200 }, loading: false, error: null };
    render(<MorningPlanYesterdayNumbers userId="u" planningDate="2026-10-23" />);
    expect(screen.getByText(/Cele tygodnia zrobione/)).toBeInTheDocument();
  });

  it('gdy brakuje wczorajszych liczb, pokazuje formularz z zablokowanym zapisem', () => {
    render(<MorningPlanYesterdayNumbers userId="u" planningDate="2026-10-21" />);
    expect(screen.getByRole('heading', { name: 'Brakuje liczb z wczoraj' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Zapisz wczoraj/ })).toBeDisabled();
  });

  it('po uzupełnieniu liczb zapis jest dostępny i wywołuje zapis', () => {
    setDay({ complete: true });
    render(<MorningPlanYesterdayNumbers userId="u" planningDate="2026-10-21" />);
    const button = screen.getByRole('button', { name: /Zapisz wczoraj/ });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(state.save).toHaveBeenCalledTimes(1);
  });

  it('wiersz z samymi godzinami pracy nie liczy się jako wpisany dzień', () => {
    setDay({ row: log({ work_hours: 6 }) });
    render(<MorningPlanYesterdayNumbers userId="u" planningDate="2026-10-21" />);
    expect(screen.getByRole('heading', { name: 'Brakuje liczb z wczoraj' })).toBeInTheDocument();
  });

  it('pokazuje błąd odczytu zamiast udawać brak danych', () => {
    setDay({ loadError: new Error('offline') });
    render(<MorningPlanYesterdayNumbers userId="u" planningDate="2026-10-21" />);
    expect(screen.getByText('Nie udało się wczytać liczb z wczoraj')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Zapisz wczoraj/ })).not.toBeInTheDocument();
  });
});
