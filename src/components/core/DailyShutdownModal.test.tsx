import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DailyShutdownModal from './DailyShutdownModal';

const m = vi.hoisted(() => ({
  shutdown: {} as Record<string, unknown>,
}));

vi.mock('./shutdown/useShutdownData', () => ({ useShutdownData: () => m.shutdown }));
vi.mock('../shared/DailyScorePicker', () => ({ default: () => null }));

beforeEach(() => {
  m.shutdown = {
    userId: 'u', today: '2026-10-20', loading: false, saving: false,
    todayWin: { id: 'w' }, tasksList: [], setCompletedTasks: vi.fn(),
    reflectionText: '', setReflectionText: vi.fn(), moodScore: 3, setMoodScore: vi.fn(),
    dayScore: 7, setDayScore: vi.fn(),
    handleSaveShutdown: vi.fn(async () => true),
  };
});

describe('DailyShutdownModal', () => {
  it('nie pokazuje pól liczb sprzedaży', () => {
    render(<DailyShutdownModal onClose={vi.fn()} />);
    expect(screen.queryByText('Liczby sprzedaży z dziś')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Zatwierdź zamknięcie/ })).toBeEnabled();
  });

  it('zamyka dzień i otwiera plan jutra', async () => {
    const onSaved = vi.fn();
    const onPlanTomorrow = vi.fn();
    render(<DailyShutdownModal onClose={vi.fn()} onSaved={onSaved} onPlanTomorrow={onPlanTomorrow} />);
    fireEvent.click(screen.getByRole('button', { name: /Zatwierdź zamknięcie/ }));
    await waitFor(() => expect(onPlanTomorrow).toHaveBeenCalledTimes(1));
    expect(onSaved).toHaveBeenCalledTimes(1);
  });
});
