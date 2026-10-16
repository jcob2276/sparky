import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CircularTargetStrainCard } from './CircularTargetStrainCard';

describe('CircularTargetStrainCard', () => {
  it('does not invent a target or training clearance when only strain is known', () => {
    render(<CircularTargetStrainCard currentStrain={8} />);
    expect(screen.getByText('8.0')).toBeInTheDocument();
    expect(screen.queryByText(/Cel: \d/)).not.toBeInTheDocument();
    expect(screen.queryByText('Poniżej celu')).not.toBeInTheDocument();
    expect(screen.queryByText(/ciało ma dziś zdolność/)).not.toBeInTheDocument();
  });

  it('keeps a missing measurement distinct from a recorded zero', () => {
    const { rerender } = render(<CircularTargetStrainCard currentStrain={null} />);
    expect(screen.queryByText('0.0')).not.toBeInTheDocument();
    rerender(<CircularTargetStrainCard currentStrain={0} />);
    expect(screen.getByText('0.0')).toBeInTheDocument();
  });

  it('renders current strain score, target interval, duration, and calories', () => {
    render(
      <CircularTargetStrainCard
        currentStrain={11.4}
        targetMin={10.0}
        targetMax={14.0}
        durationMinutes={114} // 1h 54m
        totalCaloriesKcal={1964}
        coachExplanation="Znakomite dopasowanie obciążenia do dyspozycji dnia."
      />
    );

    expect(screen.getByText('Dzienne Obciążenie (Strain)')).toBeInTheDocument();
    expect(screen.getByText('11.4')).toBeInTheDocument();
    expect(screen.getByText('Cel: 10.0 – 14.0')).toBeInTheDocument();
    expect(screen.getByText('Cel osiągnięty')).toBeInTheDocument();
    expect(screen.getByText('1h 54m')).toBeInTheDocument();
    expect(screen.getByText(/1.*964 kcal/i)).toBeInTheDocument();
    expect(screen.getByText('Znakomite dopasowanie obciążenia do dyspozycji dnia.')).toBeInTheDocument();
  });

  it('marks under-target state when strain is below target minimum', () => {
    render(
      <CircularTargetStrainCard
        currentStrain={3.2}
        targetMin={9.0}
        targetMax={13.0}
      />
    );

    expect(screen.getByText('Poniżej celu')).toBeInTheDocument();
  });

  it('rounds the total duration before splitting hours and minutes', () => {
    render(<CircularTargetStrainCard currentStrain={0} durationMinutes={119 + 59 / 60} totalCaloriesKcal={0} />);
    expect(screen.getByText('2h 0m')).toBeInTheDocument();
    expect(screen.getByText('0 kcal')).toBeInTheDocument();
  });
});
