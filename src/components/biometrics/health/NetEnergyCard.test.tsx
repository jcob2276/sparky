import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NetEnergyCard } from './NetEnergyCard';

describe('NetEnergyCard', () => {
  it('does not show a balance when total expenditure is missing', () => {
    render(<NetEnergyCard activeCaloriesBurned={null} totalCaloriesBurned={null} caloriesConsumed={2000} />);
    expect(screen.getByText('Brak danych o wydatku energii')).toBeInTheDocument();
    expect(screen.queryByText(/Deficyt|Nadwyżka|Równowaga/)).not.toBeInTheDocument();
  });

  it('does not project weight changes from an unfinished food diary', () => {
    render(<NetEnergyCard activeCaloriesBurned={600} totalCaloriesBurned={2500} caloriesConsumed={800} foodComplete={false} />);
    expect(screen.queryByText(/Prognoza tyg\./)).not.toBeInTheDocument();
    expect(screen.queryByText('Deficyt')).not.toBeInTheDocument();
    expect(screen.getByText(/niezamknięty dziennik/i)).toBeInTheDocument();
  });

  it('renders deficit balance and caloric values', () => {
    render(
      <NetEnergyCard
        activeCaloriesBurned={600}
        caloriesConsumed={2000}
        totalCaloriesBurned={2500}
        foodComplete
        targetGoal="deficit"
      />
    );

    expect(screen.getByText(/Bilans Energetyczny Netto/i)).toBeDefined();
    expect(screen.getByText('-500 kcal')).toBeDefined();
    expect(screen.getByText(/2000 kcal/i)).toBeDefined();
    expect(screen.getByText(/2500 kcal/i)).toBeDefined();
    expect(screen.queryByText(/Prognoza tyg\./i)).not.toBeInTheDocument();
  });

  it('triggers onGoalChange when selecting different goal buttons', () => {
    const onGoalChange = vi.fn();
    render(
      <NetEnergyCard
        activeCaloriesBurned={400}
        totalCaloriesBurned={2400}
        foodComplete
        caloriesConsumed={2400}
        targetGoal="maintenance"
        onGoalChange={onGoalChange}
      />
    );

    const deficitButton = screen.getByRole('button', { name: /Redukcja/i });
    fireEvent.click(deficitButton);
    expect(onGoalChange).toHaveBeenCalledWith('deficit');
  });
});
