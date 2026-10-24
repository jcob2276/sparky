import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  hook: { result: null as unknown, generate: vi.fn(), loading: false, error: null as string | null },
}));

vi.mock('../../lib/weekAiInsight', () => ({ useWeekAiInsight: () => state.hook }));
vi.mock('../../store/useStore', () => ({ useUserId: () => 'u1' }));
vi.mock('../../hooks/useHaptics', () => {
  const haptics = { light: vi.fn(), medium: vi.fn(), success: vi.fn(), selection: vi.fn() };
  return { haptics, useHaptics: () => haptics };
});

import WeeklyAiInsight from './WeeklyAiInsight';

const result = {
  insight: {
    summary: 'Dużo calli, słaba jakość.',
    changes: [{ title: 'Ruszaj od bloku', why: 'Cztery dni bez planu.', how: 'Pierwszy call o 9:00.' }],
    patterns: [{ theme: 'Brak planu', evidence: '„brałko planu dnia”' }],
  },
  generatedAt: '2026-10-24T08:00:00Z',
  basedOn: { days: 6, journalEntries: 4 },
};

describe('WeeklyAiInsight', () => {
  beforeEach(() => {
    state.hook = { result: null, generate: vi.fn(), loading: false, error: null };
  });

  it('asks the model only when the user taps the button', () => {
    render(<WeeklyAiInsight today="2026-10-24" />);
    fireEvent.click(screen.getByRole('button', { name: /Przeanalizuj mój tydzień/ }));
    expect(state.hook.generate).toHaveBeenCalledTimes(1);
  });

  it('shows progress while the model works', () => {
    state.hook = { ...state.hook, loading: true };
    render(<WeeklyAiInsight today="2026-10-24" />);
    expect(screen.getByText(/AI czyta Twoje podsumowania/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Przeanalizuj/ })).toBeNull();
  });

  it('renders the summary, the concrete changes with a next step, and the patterns with quotes', () => {
    state.hook = { ...state.hook, result };
    render(<WeeklyAiInsight today="2026-10-24" />);
    expect(screen.getByText('Dużo calli, słaba jakość.')).toBeTruthy();
    expect(screen.getByText('1. Ruszaj od bloku')).toBeTruthy();
    expect(screen.getByText('Jutro: Pierwszy call o 9:00.')).toBeTruthy();
    expect(screen.getByText('„brałko planu dnia”')).toBeTruthy();
    expect(screen.getByText(/Na podstawie 6 dni i 4 wpisów/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Odśwież analizę' }));
    expect(state.hook.generate).toHaveBeenCalledTimes(1);
  });

  it('shows a plain message when the analysis fails and keeps the button to retry', () => {
    state.hook = { ...state.hook, error: 'Analiza AI nie jest jeszcze dostępna. Spróbuj później.' };
    render(<WeeklyAiInsight today="2026-10-24" />);
    expect(screen.getByRole('alert').textContent).toContain('nie jest jeszcze dostępna');
    expect(screen.getByRole('button', { name: /Przeanalizuj mój tydzień/ })).toBeTruthy();
  });
});
