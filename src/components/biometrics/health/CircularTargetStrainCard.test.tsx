import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CircularTargetStrainCard } from './CircularTargetStrainCard';

describe('CircularTargetStrainCard', () => {
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
});
