import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TodayFoodEntry } from '../../../lib/health/composerTodayMealsApi';
import * as nutrientCoverage from '../../../lib/health/nutrientCoverage';
import * as nutritionAudit from '../../../lib/health/nutritionAudit';
import MealComposer from './MealComposer';

const state = vi.hoisted(() => ({
  composer: {
    allTodayEntries: [] as TodayFoodEntry[],
    text: '', logDate: '2026-10-28', today: '2026-10-28', yesterday: '2026-10-27',
    mealType: 'lunch', MEAL_TYPES: [], search: { scannerOpen: false },
    totals: { calories: 250, protein: 10, targetKcal: 2000, targetProtein: 100,
      avgFoodQuality: null, foodQualityAnalysis: null },
    quickChips: [], isPastDay: false, saving: false,
    photoInputRef: { current: null },
    deleteEntry: vi.fn(), copyEntireDayToToday: vi.fn(), copyMealToToday: vi.fn(),
  },
}));

vi.mock('./hooks/useMealComposer', () => ({ useMealComposer: () => state.composer }));
vi.mock('./hooks/useMealPhotoUrls', () => ({ useMealPhotoUrls: () => ({}) }));
vi.mock('./hooks/useWeekBalance', () => ({ useWeekBalance: () => null }));
vi.mock('./hooks/useDayReview', () => ({ useDayReview: () => undefined }));
vi.mock('../../../store/useStore', () => ({ useSession: () => ({ user: { id: 'user' } }) }));

afterEach(() => vi.restoreAllMocks());

describe('MealComposer summaries', () => {
  it('keeps calculations cached while typing and invalidates them when entries change', () => {
    const carbs = vi.fn(() => 40);
    const entry: TodayFoodEntry = {
      id: 'entry', name: 'Obiad', brand: null, amount: '200 g', date: '2026-10-28',
      meal_type: 'lunch', calories: 250, protein: 10, get carbs() { return carbs(); },
      fat: 5, fiber: null, sugar: null,
    };
    state.composer.allTodayEntries = [entry];
    const coverage = vi.spyOn(nutrientCoverage, 'computeDayNutrientCoverage');
    const energy = vi.spyOn(nutritionAudit, 'computeDayEnergyRange');
    const { rerender } = render(<MealComposer />);
    expect(screen.getByRole('img', { name: 'Zjedzone 250 z 2000 kcal' })).toBeInTheDocument();
    const carbReads = carbs.mock.calls.length;
    state.composer.text = 'herbata';
    rerender(<MealComposer />);
    expect(screen.getByRole('textbox', { name: 'Opisz posiłek' })).toHaveValue('herbata');
    expect(coverage).toHaveBeenCalledOnce();
    expect(energy).toHaveBeenCalledOnce();
    expect(carbs).toHaveBeenCalledTimes(carbReads);
    state.composer.allTodayEntries = [{ ...entry, calories: 500 }];
    rerender(<MealComposer />);
    expect(coverage).toHaveBeenCalledTimes(2);
    expect(energy).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Obiad 500')).toBeInTheDocument();
  });
});
