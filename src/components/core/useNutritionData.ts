import { notify } from '../../lib/notify';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTodayWarsaw, shiftDateStr } from '../../lib/date';
import { useHaptics } from '../../hooks/useHaptics';
import { useUserId } from '../../store/useStore';
import type { Database } from '../../lib/database.types';
import { auditNutritionDay } from '../../lib/health/nutritionAudit';
import { calibrateNutrition } from '../../lib/health/nutritionCalibration';
import { removeNutritionEntry } from '../../lib/health/nutritionDashboardApi';
import { loadNutritionDashboard } from '../../lib/health/nutritionDashboardData';

export type TodayEntry = Database['public']['Tables']['daily_food_entries']['Row'];
export type DailyNutritionRow = Database['public']['Tables']['daily_nutrition']['Row'];

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
const MEAL_LABEL: Record<string, string> = {
  breakfast: 'Śniadanie',
  lunch: 'Obiad',
  dinner: 'Kolacja',
  snack: 'Przekąska',
};

export interface UseNutritionDataProps {
  weeklyCalories: number;
  refreshSignal?: number;
}

export function useNutritionData({ weeklyCalories, refreshSignal }: UseNutritionDataProps) {
  const userId = useUserId();
  const todayRaw = getTodayWarsaw();
  const haptics = useHaptics();
  const queryClient = useQueryClient();

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<string | undefined>(undefined);
  const [activeChartTab, setActiveChartTab] = useState<'calories' | 'protein'>('calories');

  const query = useQuery({
    queryKey: ['nutrition-data', userId, weeklyCalories],
    queryFn: () => userId ? loadNutritionDashboard(userId,todayRaw) : null,
    enabled: !!userId,
  });

  useEffect(() => {
    if (userId) {
      void query.refetch();
    }
  }, [refreshSignal, userId, query]);

  const proteinGoal = query.data?.proteinGoal ?? null;
  const kcalTarget = query.data?.kcalTarget ?? null;
  const weeklyBudget = query.data?.weeklyBudget ?? null;
  const rows = useMemo(() => query.data?.rows ?? [], [query.data?.rows]);
  const todayEntries = useMemo(() => query.data?.todayEntries ?? [], [query.data?.todayEntries]);
  const aiSuggestions = useMemo(() => query.data?.aiSuggestions ?? [], [query.data?.aiSuggestions]);
  const forecast = query.data?.forecast ?? null;
  const forecastNote = query.data?.forecastNote ?? null;
  const loading = query.isLoading;
  const dayAudit = query.data?.dayAudit ?? auditNutritionDay([]);
  const calibration = query.data?.calibration ?? calibrateNutrition([], []);

  const fetchRows = useCallback(async () => {
    await query.refetch();
  }, [query]);

  const fetchTodayEntries = useCallback(async () => {
    await query.refetch();
  }, [query]);

  const handleSaved = useCallback(() => {
    void query.refetch();
  }, [query]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('User ID is required');
      await removeNutritionEntry(userId, id);
    },
    onMutate: (id) => {
      setDeletingId(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['nutrition-data', userId, weeklyCalories] });
    },
    onError: (e: unknown) => {
      notify('Nie udało się usunąć wpisu.', 'error');
      console.warn('[NutritionData] Failed to delete food entry:', e);
    },
    onSettled: () => {
      setDeletingId(null);
    },
  });

  const deleteEntry = useCallback(async (id: string) => {
    haptics.light();
    return deleteMutation.mutateAsync(id);
  }, [deleteMutation, haptics]);

  const caloriesProgress = weeklyBudget != null && weeklyBudget > 0 ? Math.min((weeklyCalories / weeklyBudget) * 100, 100) : 0;

  const chart = useMemo(() => {
    const byDate = new Map(rows.map((r) => [r.date, r]));
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      days.push(shiftDateStr(todayRaw, -i));
    }
    return days.map((key) => {
      const r = byDate.get(key);
      return {
        key, label: key.slice(8),
        protein: Number(r?.protein || 0), calories: Number(r?.calories || 0),
        analysis: r?.food_quality_analysis ?? null,
        insulin_load: r?.insulin_load != null ? Number(r.insulin_load) : null,
      };
    });
  }, [rows, todayRaw]);

  const avgProtein7d = useMemo(() => {
    const vals = chart.filter((r) => r.protein > 0).map((r) => r.protein);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  }, [chart]);

  const todayRow = chart.find((r) => r.key === todayRaw);
  const todayProtein = todayRow?.protein ?? 0;
  const todayKcalFromEntries = todayEntries.reduce((s, e) => s + (e.calories ?? 0), 0);
  const todayKcal = todayEntries.length > 0 ? Math.round(todayKcalFromEntries) : (todayRow?.calories ?? 0);
  const todayInsulinLoad = todayRow?.insulin_load ?? null;
  const proteinPct = proteinGoal != null && proteinGoal > 0 ? Math.min((todayProtein / proteinGoal) * 100, 100) : null;
  const todayMissingData = todayKcal === 0 && todayProtein === 0;
  const remainingKcalToday = kcalTarget == null ? null : kcalTarget - todayKcal;

  const todayMacros = useMemo(() => {
    let p = 0, c = 0, f = 0;
    for (const e of todayEntries) {
      p += e.protein ?? 0;
      c += e.carbs ?? 0;
      f += e.fat ?? 0;
    }
    return {
      protein: Math.round(p * 10) / 10,
      carbs: Math.round(c * 10) / 10,
      fat: Math.round(f * 10) / 10,
    };
  }, [todayEntries]);

  const totalGrams = todayMacros.protein + todayMacros.carbs + todayMacros.fat;
  const pPct = totalGrams > 0 ? (todayMacros.protein / totalGrams) * 100 : 0;
  const cPct = totalGrams > 0 ? (todayMacros.carbs / totalGrams) * 100 : 0;
  const fPct = totalGrams > 0 ? (todayMacros.fat / totalGrams) * 100 : 0;

  const todayQualityScore = useMemo(
    () => rows.find((r) => r.date === todayRaw)?.avg_food_quality ?? null,
    [rows, todayRaw],
  );

  const todayAnalysisRow = chart.find((r) => r.key === todayRaw)?.analysis
    ? chart.find((r) => r.key === todayRaw)
    : chart.findLast((r) => r.analysis);
  const todayAnalysis = todayAnalysisRow?.analysis ?? null;
  const todayAnalysisIsStale = !!todayAnalysisRow && todayAnalysisRow.key !== todayRaw;

  // Group today's entries by meal type

  const mealGroups = useMemo(() => {
    const map: Record<string, TodayEntry[]> = {};
    for (const e of todayEntries) {
      const key = e.meal_type || 'snack';
      (map[key] ||= []).push(e);
    }
    return MEAL_ORDER.map((k) => ({
      key: k,
      label: MEAL_LABEL[k],
      entries: map[k] || [],
      totalKcal: (map[k] || []).reduce((s, e) => s + (e.calories ?? 0), 0),
      totalProtein: Math.round((map[k] || []).reduce((s, e) => s + (e.protein ?? 0), 0) * 10) / 10,
      totalCarbs: Math.round((map[k] || []).reduce((s, e) => s + (e.carbs ?? 0), 0) * 10) / 10,
      totalFat: Math.round((map[k] || []).reduce((s, e) => s + (e.fat ?? 0), 0) * 10) / 10,
    }));
  }, [todayEntries]);

  const mealGroupsWithEntries = useMemo(() => {
    return mealGroups.filter((g) => g.entries.length > 0);
  }, [mealGroups]);

  return {
    userId,
    todayRaw,
    haptics,
    completeDates: query.data?.completeDates ?? [],
    proteinGoal,
    kcalTarget,
    weeklyBudget,
    rows,
    todayEntries,
    deletingId,
    aiSuggestions,
    forecast,
    forecastNote,
    dayAudit,
    calibration,
    isExpanded, setIsExpanded,
    selectedMealType, setSelectedMealType,
    activeChartTab, setActiveChartTab,
    fetchRows,
    fetchTodayEntries,
    handleSaved,
    deleteEntry,
    caloriesProgress,
    chart,
    avgProtein7d,
    todayRow,
    todayProtein,
    todayKcal,
    todayInsulinLoad,
    proteinPct,
    todayMissingData,
    remainingKcalToday,
    todayMacros,
    totalGrams,
    pPct,
    cPct,
    fPct,
    todayQualityScore,
    todayAnalysis,
    todayAnalysisIsStale,
    todayAnalysisRow,
    mealGroups,
    mealGroupsWithEntries,
    loading,
  };
}

