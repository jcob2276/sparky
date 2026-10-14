import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StressEnergyBankCard } from './StressEnergyBankCard';

describe('StressEnergyBankCard', () => {
  it('renders stress statistics, current level, and battery level', () => {
    render(
      <StressEnergyBankCard
        input={{
          recoveryScore: 80,
          sleepScore: 85,
          strainScore: 11.5,
          stressScore: 34,
          stressHighMinutes: 45,
        }}
        lastUpdatedFormatted="21:48"
      />
    );

    expect(screen.getByText('Stres i Rezerwa Energii')).toBeInTheDocument();
    expect(screen.getByText('Aktualizacja: 21:48')).toBeInTheDocument();
    expect(screen.getAllByText('34').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText(/Aktualny stres: 34/i)).toBeInTheDocument();
    expect(screen.getByText('Rezerwa energii (Body Battery)')).toBeInTheDocument();

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow');
  });

  it('renders low battery state and warning text when exhausted', () => {
    render(
      <StressEnergyBankCard
        input={{
          recoveryScore: 25,
          sleepScore: 30,
          strainScore: 18.0,
          stressScore: 78,
          stressHighMinutes: 180,
        }}
      />
    );

    expect(screen.getByText('78')).toBeInTheDocument();
    expect(screen.getByText('Wysoki')).toBeInTheDocument();
    expect(screen.getByText(/Rezerwa energii niska/i)).toBeInTheDocument();
  });
});
