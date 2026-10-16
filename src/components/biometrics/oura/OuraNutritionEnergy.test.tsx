import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Tables } from '../../../lib/database.types';
import type { NutritionDayContext } from '../../../lib/health/nutritionContext';
import { OuraNutritionFuelingView } from './OuraNutritionFuelingView';

vi.mock('../nutrition/MealPlannerContainer', () => ({ MealPlannerContainer: () => null }));

const nutrition: NutritionDayContext = {
  date: '2026-10-16', calories: 2000, protein: 120, targetKcal: null, targetProtein: null,
  foodComplete: false, foodDataState: 'logged', trainingLabel: '', todayFocus: null,
  avgFoodQuality: null, foodQualityAnalysis: null, addBackKcal: 0, deficitKcal: 0, inTaper: false,
  daysToMarathon: null, goalBodyFat: null, currentBodyFatEst: null, goalWeightKg: null,
  currentWeightKg: null, eventName: null, trajectory: null, trajectoryNote: null, runKmToday: 0,
  gymToday: false, weightTrendKgWeek: null, plannedWeeklyLossKg: null, forecastWeight90d: null,
  forecastBf90d: null, daysToGoalEst: null, maintenanceKcal: null, targetUpdatedAt: null,
};

describe('nutrition energy data wiring', () => {
  it('does not reuse wearable expenditure from a different day', () => {
    render(<OuraNutritionFuelingView data={{
      date: nutrition.date, strainRow: null, oura: null, nutrition,
      enhanced: { date: '2026-10-15', active_calories: 500, total_calories: 2400 } as Tables<'oura_enhanced'>,
    }} />);
    expect(screen.getByText('Brak danych o wydatku energii')).toBeInTheDocument();
  });

  it('uses same-day reported total without assumed demographics or extra resting calories', () => {
    render(<OuraNutritionFuelingView data={{
      date: nutrition.date, strainRow: null, oura: null, nutrition,
      enhanced: { date: nutrition.date, active_calories: 500, total_calories: 2400 } as Tables<'oura_enhanced'>,
    }} />);
    expect(screen.getByText('-400 kcal')).toBeInTheDocument();
    expect(screen.getByText('2400 kcal')).toBeInTheDocument();
    expect(screen.queryByText('Deficyt')).not.toBeInTheDocument();
    expect(screen.queryByText(/Prognoza tyg/)).not.toBeInTheDocument();
  });
});
