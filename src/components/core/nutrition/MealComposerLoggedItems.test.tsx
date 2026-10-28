import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MealComposerLoggedItems from './MealComposerLoggedItems';
import type { TodayFoodEntry } from '../../../lib/health/composerTodayMealsApi';

const breakfast: TodayFoodEntry = {
  id: 'breakfast', name: 'Owsianka', brand: null, amount: '200 g',
  calories: 250.4, protein: 10.25, carbs: 40, fat: 5, fiber: null, sugar: null,
  meal_type: 'breakfast', date: '2026-10-28', meal_group_id: 'photo',
};
const lunch: TodayFoodEntry = {
  ...breakfast, id: 'lunch', name: 'Zupa', calories: null, protein: null,
  meal_type: 'lunch', meal_group_id: null,
};
const entries = [breakfast, lunch];

describe('MealComposerLoggedItems', () => {
  it('mounts rows only while expanded, preserving summaries and edit payloads', () => {
    const onEditEntry = vi.fn();
    render(<MealComposerLoggedItems entries={entries} onEditEntry={onEditEntry} photoUrls={{ photo: '/meal.jpg' }} />);
    expect(screen.queryByText('Owsianka')).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Śniadanie 250')).toBeInTheDocument();
    expect(screen.getByText('Obiad 0')).toBeInTheDocument();
    const toggle = screen.getByRole('button', { expanded: false });
    expect(toggle).toHaveTextContent('2 pozycje · 250 kcal · 10.3 g B');
    fireEvent.click(toggle);
    fireEvent.click(screen.getByText('Owsianka'));
    expect(onEditEntry).toHaveBeenCalledWith({
      id: 'breakfast', name: 'Owsianka', brand: null, amount: '200 g',
      calories: 250.4, protein: 10.25, carbs: 40, fat: 5,
      meal_type: 'breakfast', date: '2026-10-28', meal_group_id: 'photo', photoUrl: '/meal.jpg',
    });
    expect(screen.getByRole('img')).toHaveAttribute('src', '/meal.jpg');
    fireEvent.click(toggle);
    expect(screen.queryByText('Owsianka')).not.toBeInTheDocument();
  });

  it('keeps past days expanded and copies the chosen meal or whole day', () => {
    const onCopyMeal = vi.fn();
    const onCopyEntireDay = vi.fn();
    render(<MealComposerLoggedItems entries={entries} onEditEntry={vi.fn()} isPastDay
      onCopyMeal={onCopyMeal} onCopyEntireDay={onCopyEntireDay} />);
    expect(screen.getByText('Owsianka')).toBeInTheDocument();
    expect(screen.getByRole('button', { expanded: true })).toBeDisabled();
    fireEvent.click(screen.getAllByRole('button', { name: 'Kopiuj' })[1]);
    expect(onCopyMeal).toHaveBeenCalledWith('lunch');
    fireEvent.click(screen.getByRole('button', { name: 'Skopiuj dzień' }));
    expect(onCopyEntireDay).toHaveBeenCalledOnce();
  });

  it('reuses summaries for unchanged entries and recalculates when entries change', () => {
    const calories = vi.fn(() => 250.4);
    const measured = [{ ...breakfast, get calories() { return calories(); } }];
    const onEditEntry = vi.fn();
    const { rerender } = render(<MealComposerLoggedItems entries={measured} onEditEntry={onEditEntry} />);
    const reads = calories.mock.calls.length;
    rerender(<MealComposerLoggedItems entries={measured} onEditEntry={onEditEntry} copying />);
    expect(calories).toHaveBeenCalledTimes(reads);
    rerender(<MealComposerLoggedItems entries={[{ ...breakfast, calories: 500 }]} onEditEntry={onEditEntry} />);
    expect(screen.getByText('Śniadanie 500')).toBeInTheDocument();
    rerender(<MealComposerLoggedItems entries={[]} onEditEntry={onEditEntry} />);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
});
