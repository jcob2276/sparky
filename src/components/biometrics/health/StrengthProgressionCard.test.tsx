import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StrengthProgressionCard } from './StrengthProgressionCard';

describe('StrengthProgressionCard', () => {
  it('renders lifts, 1RM values, and Big 3 total', () => {
    render(
      <StrengthProgressionCard
        summary={{
          lifts: [
            {
              key: 'bench_press',
              name: 'Wyciskanie leżąc',
              current1RM: 105,
              allTime1RM: 105,
              target1RM: 120,
              progressPercentage: 88,
              deltaVsPreviousPct: 2.5,
              recommendedNextWeightKg: 95,
              status: 'progressing',
              historyCount: 4,
            },
            {
              key: 'deadlift',
              name: 'Martwy ciąg',
              current1RM: 160,
              allTime1RM: 160,
              target1RM: 160,
              progressPercentage: 100,
              deltaVsPreviousPct: 0,
              recommendedNextWeightKg: 162.5,
              status: 'target_reached',
              historyCount: 6,
            },
          ],
          averageProgressPercentage: 94,
          bigThreeTotal1RM: 265,
          relativeStrengthRatio: 3.31,
          totalRecordsAchieved: 2,
          overallStatus: 'advancing',
        }}
      />
    );

    expect(screen.getByText('Progresja Siły & 1RM')).toBeInTheDocument();
    expect(screen.getByText('265 kg')).toBeInTheDocument();
    expect(screen.getByText('(3.31x BW)')).toBeInTheDocument();
    expect(screen.getByText('Wyciskanie leżąc')).toBeInTheDocument();
    expect(screen.getByText('105 kg')).toBeInTheDocument();
    expect(screen.getByText('Cel osiągnięty')).toBeInTheDocument();
  });

  it('opens plate calculator modal when clicking calculator icon', () => {
    render(
      <StrengthProgressionCard
        summary={{
          lifts: [
            {
              key: 'squat',
              name: 'Przysiad',
              current1RM: 130,
              allTime1RM: 130,
              target1RM: 150,
              progressPercentage: 87,
              deltaVsPreviousPct: 3.0,
              recommendedNextWeightKg: 120,
              status: 'progressing',
              historyCount: 5,
            },
          ],
          averageProgressPercentage: 87,
          bigThreeTotal1RM: 130,
          relativeStrengthRatio: 1.6,
          totalRecordsAchieved: 1,
          overallStatus: 'advancing',
        }}
      />
    );

    const calcBtn = screen.getByRole('button', { name: /kalkulator talerzy przysiad/i });
    fireEvent.click(calcBtn);

    expect(screen.getByText('Kalkulator Talerzy na Sztangę')).toBeInTheDocument();
  });
});
