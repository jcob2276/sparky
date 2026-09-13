import { supabase } from '../supabase';
import { entriesToDraft, type RepeatableFoodEntry } from './mealComposerUtils';
import { confirmMealCapture } from './nutritionTrackerApi';

export interface ComposerTodayMeal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  entries: RepeatableFoodEntry[];
}

export interface TodayFoodEntry extends RepeatableFoodEntry {
  meal_type: string;
  date: string;
}

export async function fetchComposerTodayMeals(
  userId: string,
  date: string,
  mealType: string,
): Promise<ComposerTodayMeal[]> {
  const { data, error } = await supabase
    .from('daily_food_entries')
    .select('id, name, brand, calories, protein, carbs, fat, fiber, sugar, amount, meal_group_id')
    .eq('user_id', userId)
    .eq('date', date)
    .eq('meal_type', mealType)
    .order('logged_at', { ascending: true, nullsFirst: false });
  if (error) throw error;

  const groups = new Map<string, RepeatableFoodEntry[]>();
  for (const row of data ?? []) {
    const key = row.meal_group_id ?? row.id;
    const bucket = groups.get(key) ?? [];
    bucket.push(row as RepeatableFoodEntry);
    groups.set(key, bucket);
  }

  return [...groups.entries()].map(([id, entries]) => ({
    id,
    name: entries.map((entry) => entry.name).join(' + ').slice(0, 72),
    calories: Math.round(entries.reduce((sum, entry) => sum + (entry.calories ?? 0), 0)),
    protein: Math.round(entries.reduce((sum, entry) => sum + (entry.protein ?? 0), 0) * 10) / 10,
    entries,
  }));
}

export async function fetchAllTodayEntries(
  userId: string,
  date: string,
): Promise<TodayFoodEntry[]> {
  const { data, error } = await supabase
    .from('daily_food_entries')
    .select('id, name, brand, calories, protein, carbs, fat, fiber, sugar, amount, meal_type')
    .eq('user_id', userId)
    .eq('date', date)
    .order('logged_at', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({ ...row, date, meal_type: row.meal_type ?? 'snack' }) as TodayFoodEntry);
}

export interface RecentDaySummary {
  date: string;
  totalCalories: number;
  totalProtein: number;
  mealTypes: string[];
}

export async function fetchRecentLoggedDaysSummary(
  userId: string,
  beforeDate: string,
  limit = 7,
): Promise<RecentDaySummary[]> {
  const { data, error } = await supabase
    .from('daily_food_entries')
    .select('date, calories, protein, meal_type')
    .eq('user_id', userId)
    .lt('date', beforeDate)
    .order('date', { ascending: false })
    .limit(200);
  if (error) throw error;

  const summaryMap = new Map<string, { totalCalories: number; totalProtein: number; mealTypes: Set<string> }>();
  for (const row of data ?? []) {
    const d = row.date as string;
    if (!summaryMap.has(d)) {
      summaryMap.set(d, { totalCalories: 0, totalProtein: 0, mealTypes: new Set() });
    }
    const bucket = summaryMap.get(d)!;
    bucket.totalCalories += Number(row.calories ?? 0);
    bucket.totalProtein += Number(row.protein ?? 0);
    if (row.meal_type) bucket.mealTypes.add(row.meal_type as string);
  }

  const result: RecentDaySummary[] = [];
  for (const [date, bucket] of summaryMap.entries()) {
    result.push({
      date,
      totalCalories: Math.round(bucket.totalCalories),
      totalProtein: Math.round(bucket.totalProtein * 10) / 10,
      mealTypes: [...bucket.mealTypes],
    });
    if (result.length >= limit) break;
  }
  return result;
}

export async function fetchRecentLoggedDates(
  userId: string,
  beforeDate: string,
  limit = 7,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('daily_food_entries')
    .select('date')
    .eq('user_id', userId)
    .lt('date', beforeDate)
    .order('date', { ascending: false })
    .limit(50);
  if (error) throw error;
  const distinct = [...new Set((data ?? []).map((row) => row.date as string))];
  return distinct.slice(0, limit);
}

export interface CopyFoodEntriesOptions {
  targetMealType?: string;
  selectedIds?: Set<string> | string[];
}

export async function copyFoodEntriesToDate(
  userId: string,
  entries: TodayFoodEntry[],
  targetDate: string,
  optionsOrMealType?: string | CopyFoodEntriesOptions,
): Promise<void> {
  const options: CopyFoodEntriesOptions =
    typeof optionsOrMealType === 'string'
      ? { targetMealType: optionsOrMealType }
      : optionsOrMealType ?? {};

  const targetMealType = options.targetMealType;
  const selectedIds = options.selectedIds
    ? (options.selectedIds instanceof Set ? options.selectedIds : new Set(options.selectedIds))
    : null;

  const filteredEntries = selectedIds
    ? entries.filter((e) => selectedIds.has(e.id))
    : entries;

  if (!filteredEntries.length) return;

  const groups = new Map<string, TodayFoodEntry[]>();
  for (const entry of filteredEntries) {
    const mealType = targetMealType ?? entry.meal_type ?? 'snack';
    const list = groups.get(mealType) ?? [];
    list.push(entry);
    groups.set(mealType, list);
  }

  const sourceDate = filteredEntries[0]?.date;
  for (const [mealType, mealEntries] of groups.entries()) {
    const draftItems = entriesToDraft(mealEntries);
    if (!draftItems.length) continue;
    await confirmMealCapture({
      userId,
      date: targetDate,
      mealType,
      source: 'repeat',
      items: draftItems,
      memoryName: sourceDate ? `Kopia z ${sourceDate}` : undefined,
    });
  }
}

export async function deleteFoodEntry(userId: string, entryId: string): Promise<void> {
  const { error } = await supabase
    .from('daily_food_entries')
    .delete()
    .eq('id', entryId)
    .eq('user_id', userId);
  if (error) throw error;
}
