import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BiologicalAgeCard } from './BiologicalAgeCard';

describe('BiologicalAgeCard', () => {
  it('renders younger biological age when biometrics are optimal', () => {
    render(
      <BiologicalAgeCard
        chronologicalAge={34}
        biologicalSex="male"
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

  it('does not substitute a profile when age and sex are missing', () => {
    render(<BiologicalAgeCard vo2Max={52} restingHeartRate={49} />);
    expect(screen.getByText(/Brakuje: wiek metrykalny, płeć biologiczna/)).toBeInTheDocument();
    expect(screen.queryByText('Wiek biologiczny')).not.toBeInTheDocument();
    expect(screen.queryByText(/Profil młodszy/i)).not.toBeInTheDocument();
  });

  it('requires known sex even when age and measurements exist', () => {
    render(<BiologicalAgeCard chronologicalAge={29} vo2Max={52} />);
    expect(screen.getByText(/Brakuje: płeć biologiczna/)).toBeInTheDocument();
    expect(screen.queryByText('Wiek biologiczny')).not.toBeInTheDocument();
  });

  it('does not present chronological age as a calculated estimate without measurements', () => {
    render(<BiologicalAgeCard chronologicalAge={29} biologicalSex="female" />);
    expect(screen.getByText(/Brakuje: pomiary VO2 Max, RHR, HRV lub bilansu snu/)).toBeInTheDocument();
    expect(screen.queryByText(/Wiek biologiczny zgodny z metryką/i)).not.toBeInTheDocument();
  });
});
