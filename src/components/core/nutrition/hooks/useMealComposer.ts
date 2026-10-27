import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { combineDateTimeWarsawISO, getTodayWarsaw, getYesterdayWarsaw } from '../../../../lib/date';
import { useLoggedTime } from './useLoggedTime';
import { notify } from '../../../../lib/notify';
import {
  MEAL_TYPES,
  QUICK_CAPTURE_FAVORITES,
  defaultMealType,
  type ParsedFoodItem,
  type MealTypeId,
} from '../../../../lib/health/foodLogging';
import { type MealDraftItem } from '../../../../lib/health/nutritionTracker';
import { entriesToDraft, foodBaseToDraft, mealLabelForType, parsedToDraft } from '../../../../lib/health/mealComposerUtils';
import { recentProductToDraft } from '../../../../lib/health/recentFoodProductsApi';
import { lookupUserPortion } from '../../../../lib/health/userPortionsApi';
import { useFoodEntrySearch } from './useFoodEntrySearch';
import { useSession } from '../../../../store/useStore';
import { useMealComposerCapture } from './useMealComposerCapture';
import { useMealComposerRefresh } from './useMealComposerRefresh';
import { useMealComposerSave } from './useMealComposerSave';
import { useMealComposerQueries } from './useMealComposerQueries';
import { useMealComposerQuickChips } from './useMealComposerQuickChips';
import { useMealComposerYesterday } from './useMealComposerYesterday';
import { useMealComposerBulkActions } from './useMealComposerBulkActions';

export function useMealComposer(onSaved?: () => void, refreshSignal = 0) {
  const session = useSession();
  const userId = session?.user.id;
  const draftKey = userId ? `vanguard_meal_composer_draft_${userId}` : null;
  const queryClient = useQueryClient();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [text, setText] = useState(() => {
    if (!draftKey) return '';
    try { return localStorage.getItem(draftKey) || ''; } catch { return ''; }
  });
  const [mealType, setMealType] = useState<MealTypeId>(() => defaultMealType());
  const [logDate, setLogDate] = useState(() => getTodayWarsaw());
  const [draftItems, setDraftItems] = useState<MealDraftItem[] | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scanningPhoto, setScanningPhoto] = useState(false);
  // meal_group_id of the photo stored at scan time; the meal saved from that scan reuses it.
  const scannedPhotoIdRef = useRef<string | null>(null);
  const [qualityPending, setQualityPending] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { loggedTime, setManualLoggedTime, resetLoggedTime, resolveLoggedTime } = useLoggedTime(Boolean(draftItems?.length), draftItems?.length ?? 0);
  const [memoryName, setMemoryName] = useState('');

  const {
    contextQuery, userPortionsQuery, recentProductsQuery, todayMealsQuery, allTodayEntriesQuery, totals,
  } = useMealComposerQueries({ session, userId, logDate, mealType, refreshSignal });

  const appendFoodToDraft = useCallback((food: Parameters<typeof foodBaseToDraft>[0], grams?: number) => {
    const portions = userPortionsQuery.data;
    const remembered = portions ? lookupUserPortion(portions, food.name) : null;
    const resolvedGrams = grams
      ?? remembered?.grams
      ?? food.defaultGrams
      ?? 100;
    setDraftItems((current) => [...(current ?? []), foodBaseToDraft(food, resolvedGrams)]);
  }, [userPortionsQuery.data]);

  const search = useFoodEntrySearch({
    userId,
    setError,
    searchInputRef,
    onBarcodePicked: (food) => {
      appendFoodToDraft(food, food.defaultGrams ?? 100);
      setSearchOpen(false);
    },
  });

  const addFoodToDraft = useCallback((food: Parameters<typeof foodBaseToDraft>[0], grams?: number) => {
    appendFoodToDraft(food, grams);
    search.setSelected(null);
    search.setQuery('');
    setSearchOpen(false);
  }, [appendFoodToDraft, search]);

  const setLogDateAndResetTime = useCallback((date: string) => {
    setLogDate(date);
    resetLoggedTime();
  }, [resetLoggedTime]);

  const rememberedByName = useMemo(() => {
    const map = new Map<string, number>();
    for (const [key, row] of userPortionsQuery.data ?? []) {
      map.set(key, row.grams);
    }
    return map;
  }, [userPortionsQuery.data]);

  useEffect(() => {
    if (!draftKey) return;
    try {
      if (text.trim()) localStorage.setItem(draftKey, text);
      else localStorage.removeItem(draftKey);
    } catch { /* quota */ }
  }, [text, draftKey]);

  const refreshAfterSave = useMealComposerRefresh({
    queryClient, contextQuery, userId, logDate, mealType, onSaved, setQualityPending,
  });

  const setDraftFromParsed = useCallback((items: ParsedFoodItem[], append = false) => {
    const next = parsedToDraft(items);
    setDraftItems((current) => (append && current?.length ? [...current, ...next] : next));
  }, []);

  const { parseText, scanPhoto, scanFile } = useMealComposerCapture({
    userId, session, text, setText, parsing, setParsing, scanningPhoto, setScanningPhoto,
    setError, setDraftFromParsed, scannedPhotoIdRef,
  });

  // A dismissed draft must not leave its photo linked to the next meal.
  useEffect(() => {
    if (!draftItems) scannedPhotoIdRef.current = null;
  }, [draftItems]);

  const { saveDraft, handleFavorite } = useMealComposerSave({
    userId, saving, setSaving, setError, logDate, mealType, search, scannedPhotoIdRef,
    setDraftItems, setText, setMemoryName, setSearchOpen, refreshAfterSave,
  });

  const addRecentProduct = useCallback((product: Parameters<typeof recentProductToDraft>[0]) => {
    setDraftItems((current) => [...(current ?? []), recentProductToDraft(product)]);
  }, []);

  const loadTodayMealToDraft = useCallback((mealId: string) => {
    const meal = todayMealsQuery.data?.find((candidate) => candidate.id === mealId);
    if (!meal?.entries.length) return;
    setDraftItems(entriesToDraft(meal.entries));
    setMemoryName(meal.name);
  }, [todayMealsQuery.data]);

  const { quickChips, handleQuickChip } = useMealComposerQuickChips({
    allTodayEntries: allTodayEntriesQuery.data,
    recentProducts: recentProductsQuery.data,
    addFoodToDraft,
    addRecentProduct,
    loadTodayMealToDraft,
  });

  const saveFromDraft = useCallback((rememberIds: Set<string>, name?: string) => {
    if (!draftItems?.length) return;
    const time = resolveLoggedTime();
    const loggedAt = time ? combineDateTimeWarsawISO(logDate, time) : undefined;
    const source = scannedPhotoIdRef.current ? 'photo' : 'text';
    void saveDraft(draftItems, source, rememberIds, { memoryName: name, loggedAt });
  }, [draftItems, logDate, resolveLoggedTime, saveDraft]);

  const { todayStr, yesterdayMealSuggestion } = useMealComposerYesterday({
    userId, logDate, mealType, allTodayEntries: allTodayEntriesQuery.data,
  });

  const repeatYesterdayMeal = useCallback(() => {
    if (!yesterdayMealSuggestion?.entries.length) return;
    setDraftItems(entriesToDraft(yesterdayMealSuggestion.entries));
    setMemoryName(`Wczorajszy posiłek (${yesterdayMealSuggestion.mealLabel})`);
    notify(`Załadowano wczorajszy ${yesterdayMealSuggestion.mealLabel} do edytora!`, 'success');
  }, [yesterdayMealSuggestion]);

  const { copyEntireDayToToday, copyMealToToday, deleteEntry } = useMealComposerBulkActions({
    userId, saving, setSaving, allTodayEntries: allTodayEntriesQuery.data, todayStr, setLogDateAndResetTime, refreshAfterSave,
  });

  return {
    userId,
    text,
    setText,
    mealType,
    setMealType,
    logDate,
    setLogDate: setLogDateAndResetTime,
    totals,
    qualityPending,
    parsing,
    saving,
    scanningPhoto,
    scanFile,
    draftItems,
    setDraftItems,
    error,
    setError,
    searchOpen,
    setSearchOpen,
    search,
    photoInputRef,
    searchInputRef,
    parseText,
    saveDraft,
    addFoodToDraft,
    addRecentProduct,
    scanPhoto,
    handleFavorite,
    quickChips,
    handleQuickChip,
    saveFromDraft,
    loggedTime,
    setLoggedTime: setManualLoggedTime,
    memoryName,
    setMemoryName,
    hasEntries: totals.calories > 0,
    todayMeals: todayMealsQuery.data ?? [],
    todayMealsLoading: todayMealsQuery.isLoading,
    allTodayEntries: allTodayEntriesQuery.data ?? [],
    recentProducts: recentProductsQuery.data ?? [],
    rememberedByName,
    MEAL_TYPES,
    QUICK_CAPTURE_FAVORITES,
    today: getTodayWarsaw(),
    yesterday: getYesterdayWarsaw(),
    mealLabelForType,
    refreshAfterSave,
    copyEntireDayToToday,
    copyMealToToday,
    yesterdayMealSuggestion,
    repeatYesterdayMeal,
    deleteEntry,
    isPastDay: logDate !== todayStr,
  };
}
