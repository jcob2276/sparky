import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CaffeineCutoffCard } from './CaffeineCutoffCard';

describe('CaffeineCutoffCard', () => {
  it('renders cutoff time and status correctly for safe window', () => {
    render(
      <CaffeineCutoffCard
        caffeine={{
          targetBedtime: '23:00',
          cutoffTime: '13:00',
          totalConsumedMg: 95,
          activeCurrentMg: 45,
          activeBedtimeMg: 12,
          minutesUntilCutoff: 120,
          status: 'safe_window',
          recommendation: 'Bezpieczne okno na kofeinę.',
        }}
      />
    );

    expect(screen.getByText('Kofeina & Bilans Paliwa')).toBeInTheDocument();
    expect(screen.getByText('13:00')).toBeInTheDocument();
    expect(screen.getByText('Bezpieczne okno')).toBeInTheDocument();
    expect(screen.getByText('Bezpieczne okno na kofeinę.')).toBeInTheDocument();
  });

  it('renders warning badge when bedtime caffeine is too high', () => {
    render(
      <CaffeineCutoffCard
        caffeine={{
          targetBedtime: '23:00',
          cutoffTime: '13:00',
          totalConsumedMg: 200,
          activeCurrentMg: 80,
          activeBedtimeMg: 35,
          minutesUntilCutoff: -120,
          status: 'bedtime_warning',
          recommendation: 'Wysoka kofeina o porze snu.',
        }}
        fueling={{
          dynamicTargetCalories: 2600,
          consumedCalories: 2100,
          remainingCalories: 500,
          balanceCalories: -500,
          burnBreakdown: {
            base: 2000,
            active: 600,
            totalExpenditure: 2600,
          },
          fuelingPercentage: 81,
        }}
      />
    );

    expect(screen.getByText(/Ryzyko dla fazy Deep/i)).toBeInTheDocument();
    expect(screen.getByText(/~35/i)).toBeInTheDocument();
    expect(screen.getByText(/Dynamiczne Paliwo/i)).toBeInTheDocument();
    expect(screen.getByText(/2100 \/ 2600 kcal/i)).toBeInTheDocument();
    expect(screen.getByText(/Pozostało 500 kcal/i)).toBeInTheDocument();
  });
});
