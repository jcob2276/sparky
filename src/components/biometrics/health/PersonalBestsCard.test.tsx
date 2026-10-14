import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PersonalBestsCard } from './PersonalBestsCard';

describe('PersonalBestsCard', () => {
  const sampleSummary = {
    running: [
      {
        distanceLabel: '5 km' as const,
        targetMeters: 5000,
        timeSeconds: 1200,
        paceStr: '4:00 /km',
        achievedAt: '2026-09-15',
      },
    ],
    strength: [
      {
        liftKey: 'bench_press',
        liftName: 'Wyciskanie leżąc',
        weightKg: 105,
        reps: 5,
        estimated1RM: 122.5,
        achievedAt: '2026-10-08',
      },
    ],
    biometrics: [
      {
        metricKey: 'highest_hrv' as const,
        label: 'Najwyższe HRV nocne',
        value: 92,
        unit: 'ms',
        achievedAt: '2026-10-01',
      },
    ],
    totalRecordsCount: 3,
    recentRecord: {
      category: 'strength' as const,
      title: 'Wyciskanie leżąc (105 kg)',
      achievedAt: '2026-10-08',
    },
  };

  it('renders trophy header, recent PR banner, and default running tab', () => {
    render(<PersonalBestsCard summary={sampleSummary} />);

    expect(screen.getByText('Sala Rekordów (PRs)')).toBeInTheDocument();
    expect(screen.getByText(/3 rekordów/i)).toBeInTheDocument();
    expect(screen.getByText(/Ostatni PR: Wyciskanie leżąc \(105 kg\)/i)).toBeInTheDocument();
    expect(screen.getByText('5 km')).toBeInTheDocument();
    expect(screen.getByText('20:00')).toBeInTheDocument();
  });

  it('switches between tabs and shows strength and biometrics records', () => {
    render(<PersonalBestsCard summary={sampleSummary} />);

    // Click Siła tab
    const strengthTab = screen.getByRole('button', { name: /siła/i });
    fireEvent.click(strengthTab);

    expect(screen.getByText('Wyciskanie leżąc')).toBeInTheDocument();
    expect(screen.getByText('105 kg')).toBeInTheDocument();

    // Click Biometria tab
    const bioTab = screen.getByRole('button', { name: /biometria/i });
    fireEvent.click(bioTab);

    expect(screen.getByText('Najwyższe HRV nocne')).toBeInTheDocument();
    expect(screen.getByText('92')).toBeInTheDocument();
  });
});
