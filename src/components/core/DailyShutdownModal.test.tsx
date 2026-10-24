import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_DRAFT } from '../../lib/closer/closerDayModel';
import DailyShutdownModal from './DailyShutdownModal';

const m = vi.hoisted(() => ({
  order: [] as string[],
  sales: {} as Record<string, unknown>,
  shutdown: {} as Record<string, unknown>,
}));

vi.mock('./salesNumbers/useDaySalesNumbers', () => ({ useDaySalesNumbers: () => m.sales }));
vi.mock('./shutdown/useShutdownData', () => ({ useShutdownData: () => m.shutdown }));
vi.mock('../shared/DailyScorePicker', () => ({ default: () => null }));

function setup(salesPatch: Record<string, unknown> = {}) {
  m.order = [];
  m.sales = {
    row: null, loading: false, loadError: null, draft: EMPTY_DRAFT, patchDraft: vi.fn(),
    complete: false, saving: false,
    save: vi.fn(async () => { m.order.push('sales'); return true; }),
    ...salesPatch,
  };
  m.shutdown = {
    userId: 'u', today: '2026-10-20', loading: false, saving: false,
    todayWin: { id: 'w' }, tasksList: [], setCompletedTasks: vi.fn(),
    reflectionText: '', setReflectionText: vi.fn(), moodScore: 3, setMoodScore: vi.fn(),
    dayScore: 7, setDayScore: vi.fn(),
    handleSaveShutdown: vi.fn(async () => { m.order.push('shutdown'); return true; }),
  };
}

beforeEach(() => setup());

describe('DailyShutdownModal: liczby sprzedaży', () => {
  it('bez liczb nie da się zamknąć dnia i pokazuje dlaczego', () => {
    render(<DailyShutdownModal onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Zatwierdź zamknięcie/ })).toBeDisabled();
    expect(screen.getByText(/Wpisz rozmowy odebrane, umówionych, rozmowy sprzedażowe i sprzedaże/)).toBeInTheDocument();
    expect(screen.getByText('wymagane')).toBeInTheDocument();
  });

  it('z kompletnymi liczbami najpierw zapisuje liczby, potem zamyka dzień i otwiera plan jutra', async () => {
    setup({ complete: true });
    const onSaved = vi.fn();
    const onPlanTomorrow = vi.fn();
    render(<DailyShutdownModal onClose={vi.fn()} onSaved={onSaved} onPlanTomorrow={onPlanTomorrow} />);
    fireEvent.click(screen.getByRole('button', { name: /Zatwierdź zamknięcie/ }));
    await waitFor(() => expect(onPlanTomorrow).toHaveBeenCalledTimes(1));
    expect(m.order).toEqual(['sales', 'shutdown']);
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('gdy zapis liczb się nie uda, dzień nie zostaje zamknięty', async () => {
    setup({ complete: true, save: vi.fn(async () => false) });
    const onPlanTomorrow = vi.fn();
    render(<DailyShutdownModal onClose={vi.fn()} onPlanTomorrow={onPlanTomorrow} />);
    fireEvent.click(screen.getByRole('button', { name: /Zatwierdź zamknięcie/ }));
    await waitFor(() => expect((m.sales.save as ReturnType<typeof vi.fn>)).toHaveBeenCalled());
    expect((m.shutdown.handleSaveShutdown as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
    expect(onPlanTomorrow).not.toHaveBeenCalled();
  });
});
