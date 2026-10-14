import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BiologicalAgeCard } from './BiologicalAgeCard';

describe('BiologicalAgeCard', () => {
  it('renders younger biological age when biometrics are optimal', () => {
    render(
      <BiologicalAgeCard
        chronologicalAge={34}
        vo2Max={52}
        restingHeartRate={49}
        hrvBaselineMs={70}
        sleepDebtMinutes={0}
      />
    );

    expect(screen.getByText(/Wiek Biologiczny i Naczyniowy/i)).toBeDefined();
    expect(screen.getAllByText(/Profil młodszy/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('34')).toBeDefined();
    expect(screen.getByText(/Wydolność tlenowa \(VO2 Max\)/i)).toBeDefined();
    expect(screen.getByText(/Tętno spoczynkowe \(RHR\)/i)).toBeDefined();
  });

  it('renders with baseline chronological age when metrics are missing', () => {
    render(<BiologicalAgeCard chronologicalAge={29} />);
    expect(screen.getAllByText('29').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Wiek biologiczny zgodny z metryką/i)).toBeDefined();
  });
});
