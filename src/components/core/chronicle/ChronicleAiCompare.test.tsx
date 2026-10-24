import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  hook: { result: null as unknown, generate: vi.fn(), loading: false, error: null as string | null },
}));

vi.mock('../../../lib/chronicle/aiCompare', () => ({ usePeriodAiCompare: () => state.hook }));
vi.mock('../../../store/useStore', () => ({ useUserId: () => 'u1' }));
vi.mock('../../../hooks/useHaptics', () => {
  const haptics = { light: vi.fn(), medium: vi.fn(), success: vi.fn(), selection: vi.fn() };
  return { haptics, useHaptics: () => haptics };
});

import ChronicleAiCompare from './ChronicleAiCompare';

const a = { label: '19–25 paź', start: '2026-10-19', end: '2026-10-25' };
const b = { label: '12–18 paź', start: '2026-10-12', end: '2026-10-18' };
const result = {
  comparison: {
    summary: 'Lepszy sen, słabsza sprzedaż.',
    improved: [{ title: 'Sen', evidence: '7,2 h vs 6,4 h' }],
    worsened: [{ title: 'Sprzedaże', evidence: '0 vs 2' }],
    changes: [{ title: 'Pierwszy call o 9:00', why: 'Cztery dni bez planu.', how: 'Blok 9:00–11:00 bez telefonu.' }],
    journal: [{ title: 'Brak przekonania', evidence: '„brakuje mi przekonania obfitości”' }],
  },
  generatedAt: '2026-10-24T09:00:00Z',
  basedOn: { scoredDays: [6, 7], journalEntries: [4, 3] },
};

describe('ChronicleAiCompare', () => {
  beforeEach(() => {
    state.hook = { result: null, generate: vi.fn(), loading: false, error: null };
  });

  it('podpisuje oba okresy i woła model dopiero po dotknięciu przycisku', () => {
    render(<ChronicleAiCompare a={a} b={b} />);
    expect(screen.getByText(/19–25 paź/)).toBeTruthy();
    expect(screen.getByText(/12–18 paź/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Porównaj z AI/ }));
    expect(state.hook.generate).toHaveBeenCalledTimes(1);
  });

  it('pokazuje postęp podczas pracy modelu', () => {
    state.hook = { ...state.hook, loading: true };
    render(<ChronicleAiCompare a={a} b={b} />);
    expect(screen.getByText(/AI czyta oba okresy/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Porównaj z AI/ })).toBeNull();
  });

  it('renderuje podsumowanie, poprawę, pogorszenie, zmiany z krokiem i różnice w dzienniku', () => {
    state.hook = { ...state.hook, result };
    render(<ChronicleAiCompare a={a} b={b} />);
    expect(screen.getByText('Lepszy sen, słabsza sprzedaż.')).toBeTruthy();
    expect(screen.getByText('Poprawiło się')).toBeTruthy();
    expect(screen.getByText('7,2 h vs 6,4 h')).toBeTruthy();
    expect(screen.getByText('Pogorszyło się')).toBeTruthy();
    expect(screen.getByText('1. Pierwszy call o 9:00')).toBeTruthy();
    expect(screen.getByText('Dalej: Blok 9:00–11:00 bez telefonu.')).toBeTruthy();
    expect(screen.getByText('W dzienniku')).toBeTruthy();
    expect(screen.getByText(/Na podstawie 6 i 7 ocenionych dni oraz 4 i 3 wpisów/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Odśwież porównanie' }));
    expect(state.hook.generate).toHaveBeenCalledTimes(1);
  });

  it('błąd pokazuje zwykłym zdaniem i zostawia przycisk ponowienia', () => {
    state.hook = { ...state.hook, error: 'Analiza AI nie jest jeszcze dostępna. Spróbuj później.' };
    render(<ChronicleAiCompare a={a} b={b} />);
    expect(screen.getByRole('alert').textContent).toContain('nie jest jeszcze dostępna');
    expect(screen.getByRole('button', { name: /Porównaj z AI/ })).toBeTruthy();
  });
});
