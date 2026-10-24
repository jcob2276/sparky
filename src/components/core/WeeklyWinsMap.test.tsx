import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { WinsDayCell } from '../../lib/weeklyWinsMap';

const days: WinsDayCell[] = [
  {
    date: '2026-10-22', label: 'cz', result: 'P', score: 4, note: 'muszę coś zmienić', status: 'loss',
    doneCount: 1, plannedCount: 2,
    tasks: [
      { slot: 1, title: 'Trening', done: true, category: 'cialo' },
      { slot: 2, title: 'Dykcja', done: false, category: 'duch' },
    ],
  },
  { date: '2026-10-23', label: 'pt', result: null, score: null, note: null, status: 'loss', doneCount: 0, plannedCount: 0, tasks: [] },
];

vi.mock('../../lib/weeklyWinsMap', () => ({ useWeeklyWinsMap: () => ({ data: days, isLoading: false }) }));
vi.mock('../../lib/weekAiInsight', () => ({
  useWeekAiInsight: () => ({ result: null, generate: vi.fn(), loading: false, error: null }),
}));
vi.mock('../../store/useStore', () => ({ useUserId: () => 'u1' }));
vi.mock('../../lib/date', () => ({
  getTodayWarsaw: () => '2026-10-24',
  getYesterdayWarsaw: () => '2026-10-23',
  formatDayLabel: (date: string) => `Dzień ${date}`,
}));
vi.mock('../../hooks/useHaptics', () => {
  const haptics = { light: vi.fn(), medium: vi.fn(), success: vi.fn(), selection: vi.fn() };
  return { haptics, useHaptics: () => haptics };
});

import WeeklyWinsMap from './WeeklyWinsMap';

describe('WeeklyWinsMap', () => {
  it('shows the day rating inside the circle and nothing selected by default', () => {
    render(<WeeklyWinsMap />);
    expect(screen.getByRole('button', { name: /cz, 1 z 2 zadań, ocena 4/ }).textContent).toBe('4');
    expect(screen.queryByText('Trening')).toBeNull();
  });

  it('opens the day with done and missed tasks, the rating and the user\'s opinion, and closes on a second tap', () => {
    render(<WeeklyWinsMap />);
    const cell = screen.getByRole('button', { name: /cz, 1 z 2 zadań/ });
    fireEvent.click(cell);
    expect(screen.getByText('Trening')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Zrobione' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Niezrobione' })).toBeTruthy();
    expect(screen.getByText('ocena 4/10')).toBeTruthy();
    expect(screen.getByText('muszę coś zmienić')).toBeTruthy();
    fireEvent.click(cell);
    expect(screen.queryByText('Trening')).toBeNull();
  });

  it('says so when the day had no plan', () => {
    render(<WeeklyWinsMap />);
    fireEvent.click(screen.getByRole('button', { name: /pt, 0 z 5 zadań/ }));
    expect(screen.getByText('Brak planu na ten dzień.')).toBeTruthy();
  });
});
