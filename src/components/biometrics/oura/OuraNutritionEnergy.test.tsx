import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Tables } from '../../../lib/database.types';
import type { NutritionDayContext } from '../../../lib/health/nutritionContext';
import { OuraNutritionFuelingView } from './OuraNutritionFuelingView';
import { OuraNutritionEnergy } from './OuraNutritionEnergy';
import { buildOuraContextInsights } from '../../../lib/biometrics/ouraContextInsights';

vi.mock('../nutrition/MealPlannerContainer', () => ({ MealPlannerContainer: () => null }));

const nutrition: NutritionDayContext = {
  date: '2026-10-16', calories: 2000, protein: 120, carbs: 0, fat: 0, targetKcal: null, targetProtein: null,
  foodComplete: false, foodDataState: 'logged', trainingLabel: '', todayFocus: null,
  avgFoodQuality: null, foodQualityAnalysis: null, addBackKcal: 0, deficitKcal: 0, inTaper: false,
  daysToMarathon: null, goalBodyFat: null, currentBodyFatEst: null, goalWeightKg: null,
  currentWeightKg: null, eventName: null, trajectory: null, trajectoryNote: null, runKmToday: 0,
  gymToday: false, weightTrendKgWeek: null, plannedWeeklyLossKg: null, forecastWeight90d: null,
  forecastBf90d: null, daysToGoalEst: null, maintenanceKcal: null, targetUpdatedAt: null,
};

describe('nutrition energy data wiring', () => {
  const bedtimeStart = '2026-10-15T23:30:00+02:00';
  const currentNutrition = { ...nutrition, lastMealAt: '12:00', lastCaffeineAt: '12:00', caffeineMg: 300 };
  const nightContext = buildOuraContextInsights({
    sleepDate: '2026-10-15', bedtimeStart, phoneUsage: null, workouts: [],
    foodEntries: [
      { name: 'Kawa (100mg)', calories: 5, food_quality_score: null, logged_at: '2026-10-15T10:00:00+02:00' },
      { name: 'Kawa (100mg)', calories: 5, food_quality_score: null, logged_at: '2026-10-15T18:00:00+02:00' },
      { name: 'Kolacja', calories: 600, food_quality_score: null, logged_at: '2026-10-15T20:30:00+02:00' },
    ],
  });

  it('uses only the linked previous-day entries and their per-dose estimate for the completed night', () => {
    render(<OuraNutritionEnergy nutrition={currentNutrition} date={nutrition.date} data={{
      date: nutrition.date, strainRow: null, oura: null,
      enhanced: { date: nutrition.date, bedtime_start: bedtimeStart } as Tables<'oura_enhanced'>,
      nightContext,
    }} />);
    expect(screen.getByText(/Zapisy z 2026-10-15.*noc zakończona 2026-10-16/)).toBeInTheDocument();
    expect(screen.getByText(/Ostatni wpis: 20:30/)).toBeInTheDocument();
    expect(screen.getByText(/~68 mg/)).toBeInTheDocument();
    expect(screen.getByText(/Łącznie we wpisach: ~200 mg/)).toBeInTheDocument();
    expect(screen.queryByText(/12:00/)).not.toBeInTheDocument();
  });

  it.each([undefined, { ...nightContext, bedtimeStart: '2026-10-14T23:30:00+02:00' }])(
    'does not synthesize pre-sleep timing from current-day totals without linked context (%s)', (context) => {
      render(<OuraNutritionEnergy nutrition={currentNutrition} date={nutrition.date} data={{
        date: nutrition.date, strainRow: null, oura: null, nightContext: context,
        enhanced: { date: nutrition.date, bedtime_start: bedtimeStart } as Tables<'oura_enhanced'>,
      }} />);
      expect(screen.getByText(/Brak kontekstu wpisów powiązanego z tą nocą/)).toBeInTheDocument();
      expect(screen.queryByText(/mg.*(?:zasypianiu|początku snu)/)).not.toBeInTheDocument();
      expect(screen.queryByText(/12:00/)).not.toBeInTheDocument();
    },
  );

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
