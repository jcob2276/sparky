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

  const recentDaysQuery = useQuery({
    queryKey: ['meal-composer-recent-days', userId, mealType],
    queryFn: async () => {
      const todayStr = getTodayWarsaw();
      const { data: dateData } = await supabase
        .from('daily_food_entries')
        .select('date')
        .eq('user_id', userId!)
        .eq('meal_type', mealType)
        .lt('date', todayStr)
        .order('date', { ascending: false })
        .limit(30);
      if (!dateData?.length) return [];
      
      const distinctDates = [...new Set(dateData.map(d => d.date))].slice(0, 5);
      if (!distinctDates.length) return [];

      const { data } = await supabase
        .from('daily_food_entries')
        .select('id, name, brand, calories, protein, carbs, fat, fiber, sugar, amount, date')
        .eq('user_id', userId!)
        .in('date', distinctDates)
        .eq('meal_type', mealType)
        .order('logged_at', { ascending: true });
        
      const entriesByDate = (data ?? []).reduce((acc, entry) => {
        if (!acc[entry.date]) acc[entry.date] = [];
        acc[entry.date].push(entry);
        return acc;
      }, {} as Record<string, RepeatableFoodEntry[]>);
      
      return distinctDates.map(date => ({
        date,
        entries: entriesByDate[date] || []
      })).filter(d => d.entries.length > 0);
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
    const recentDaysData = recentDaysQuery.data ?? [];
    const recentDays = recentDaysData.map(day => ({
      id: `recent-day-${day.date}`,
      name: day.entries.map((entry) => entry.name).join(' + ').slice(0, 72),
      calories: Math.round(day.entries.reduce((sum, entry) => sum + (entry.calories ?? 0), 0)),
      protein: Math.round(day.entries.reduce((sum, entry) => sum + (entry.protein ?? 0), 0) * 10) / 10,
      entries: day.entries,
      date: day.date,
    }));
    return { habitual, gap: gap && gap.mealType === mealType ? gap : null, recentDays };
  }, [memoriesQuery.data, mealType, totals, recentDaysQuery.data]);
}
