import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NetEnergyCard } from './NetEnergyCard';

describe('NetEnergyCard', () => {
  it('renders deficit balance and caloric values', () => {
    render(
      <NetEnergyCard
        activeCaloriesBurned={600}
        caloriesConsumed={2000}
        bmrOverride={1700}
        targetGoal="deficit"
      />
    );

    // tdee = 1700 + 600 + 200 = 2500 -> net = 2000 - 2500 = -500 kcal
    expect(screen.getByText(/Bilans Energetyczny Netto/i)).toBeDefined();
    expect(screen.getByText('-500 kcal')).toBeDefined();
    expect(screen.getByText(/2000 kcal/i)).toBeDefined();
    expect(screen.getByText(/2500 kcal/i)).toBeDefined();
    expect(screen.getByText(/Prognoza tyg\./i)).toBeDefined();
  });

  it('triggers onGoalChange when selecting different goal buttons', () => {
    const onGoalChange = vi.fn();
    render(
      <NetEnergyCard
        activeCaloriesBurned={400}
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
