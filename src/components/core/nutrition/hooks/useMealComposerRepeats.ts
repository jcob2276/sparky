import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTodayWarsaw } from '../../../../lib/date';
import { supabase } from '../../../../lib/supabase';
import { mealMemoryToDraft, rankMealMemoriesForGap } from '../../../../lib/health/nutritionTracker';
import { fetchNutritionMealMemories } from '../../../../lib/health/nutritionTrackerApi';
import type { RepeatableFoodEntry } from '../../../../lib/health/mealComposerUtils';

export function useMealComposerRepeats(
  userId: string | undefined,
  mealType: string,
  refreshSignal: number,
  totals: { calories: number; targetKcal: number | null; targetProtein: number | null; protein: number },
) {
  const memoriesQuery = useQuery({
    queryKey: ['nutrition-meal-memories', userId, refreshSignal],
    queryFn: () => fetchNutritionMealMemories(userId!, 24),
    enabled: !!userId,
  });

  const yesterdayQuery = useQuery({
    queryKey: ['meal-composer-yesterday', userId, mealType],
    queryFn: async () => {
      const todayStr = getTodayWarsaw();
      const { data: dateData } = await supabase
        .from('daily_food_entries')
        .select('date')
        .eq('user_id', userId!)
        .eq('meal_type', mealType)
        .lt('date', todayStr)
        .order('date', { ascending: false })
        .limit(1);
      if (!dateData?.length) return { date: null as string | null, entries: [] as RepeatableFoodEntry[] };
      const targetDate = dateData[0].date;
      const { data } = await supabase
        .from('daily_food_entries')
        .select('id, name, brand, calories, protein, carbs, fat, fiber, sugar, amount, date')
        .eq('user_id', userId!)
        .eq('date', targetDate)
        .eq('meal_type', mealType)
        .order('logged_at', { ascending: true });
      return { date: targetDate, entries: (data ?? []) as RepeatableFoodEntry[] };
    },
    enabled: !!userId,
  });

  return useMemo(() => {
    const memories = memoriesQuery.data ?? [];
    const remainingCalories = Math.max(0, Math.round((totals.targetKcal ?? 2000) - totals.calories));
    const remainingProtein = Math.max(0, Math.round(((totals.targetProtein ?? 0) - totals.protein) * 10) / 10);
    const habitual = memories
      .filter((memory) => memory.meal_type === mealType)
      .slice(0, 2)
      .map((memory) => {
        const items = mealMemoryToDraft(memory.items);
        const calories = Math.round(items.reduce((sum, item) => sum + item.calories, 0));
        const protein = Math.round(items.reduce((sum, item) => sum + item.protein, 0) * 10) / 10;
        return {
          id: memory.id,
          name: memory.name?.trim() || items.map((item) => item.name).join(' + '),
          calories,
          protein,
          items: memory.items,
          confirmedCount: memory.confirmed_count,
        };
      });
    const gap = rankMealMemoriesForGap(memories, { remainingCalories, remainingProtein, mealType })[0] ?? null;
    const yesterday = yesterdayQuery.data;
    const yesterdayMeal = yesterday?.entries.length
      ? {
          id: `yesterday-${yesterday.date}`,
          name: yesterday.entries.map((entry) => entry.name).join(' + ').slice(0, 72),
          calories: Math.round(yesterday.entries.reduce((sum, entry) => sum + (entry.calories ?? 0), 0)),
          protein: Math.round(yesterday.entries.reduce((sum, entry) => sum + (entry.protein ?? 0), 0) * 10) / 10,
          entries: yesterday.entries,
          date: yesterday.date,
        }
      : null;
    return { habitual, gap: gap && gap.mealType === mealType ? gap : null, yesterday: yesterdayMeal };
  }, [memoriesQuery.data, mealType, totals, yesterdayQuery.data]);
}
