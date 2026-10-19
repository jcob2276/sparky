import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { buildScoreRings } from '../../../lib/biometrics/ouraScoreBands';
import { OuraScoreRings } from './OuraScoreRings';

const summaries = [66, 70, 72, 74, 70, 68, 84].map((s, i) => ({
  date: `2026-10-${String(12 + i).padStart(2, '0')}`, sleep_score: s, readiness_score: 55,
}));

describe('OuraScoreRings', () => {
  it('shows value, textual band, trend and a full aria-label, and opens the matching view', () => {
    const onOpenSleep = vi.fn();
    const onOpenVitals = vi.fn();
    const rings = buildScoreRings({ asOf: '2026-10-18', summaries, strainScore: 12.4 });
    render(<OuraScoreRings rings={rings} onOpenSleep={onOpenSleep} onOpenVitals={onOpenVitals} />);

    const sleep = screen.getByRole('button', { name: /^Sen: 84 na 100, Dobry/ });
    expect(sleep).toHaveTextContent('Dobry');
    expect(sleep).toHaveTextContent('vs średnia z 7 dni');
    expect(screen.getByRole('button', { name: /^Regeneracja: 55 na 100, Uwaga/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Obciążenie: 12,4 na 21/ })).toBeInTheDocument();

    fireEvent.click(sleep);
    expect(onOpenSleep).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /^Regeneracja/ }));
    expect(onOpenVitals).toHaveBeenCalledTimes(1);
  });
  it('renders a missing score without an arc', () => {
    const rings = buildScoreRings({ asOf: '2026-10-18' });
    const { container } = render(<OuraScoreRings rings={rings} onOpenSleep={vi.fn()} onOpenVitals={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Sen: brak pomiaru' })).toBeInTheDocument();
    expect(container.querySelector('.oura-ring-arc')).toBeNull();
  });
});
