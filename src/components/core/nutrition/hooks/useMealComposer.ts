import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { combineDateTimeWarsawISO, getTodayWarsaw, getYesterdayWarsaw, warsawTimeOfDay } from '../../../../lib/date';
import { notify } from '../../../../lib/notify';
import { fetchNutritionDayContext } from '../../../../lib/health/nutritionContext';
import { fetchComposerTodayMeals } from '../../../../lib/health/composerTodayMealsApi';
import { buildQuickChips, type QuickChip } from '../../../../lib/health/mealComposerQuick';
import {
  MEAL_TYPES,
  QUICK_CAPTURE_FAVORITES,
  defaultMealType,
  parseFoodNL,
  quickAddFavorite,
  type FoodFavoriteRow,
  type ParsedFoodItem,
  type MealTypeId,
} from '../../../../lib/health/foodLogging';
import {
  mealMemoryToDraft,
  type MealDraftItem,
} from '../../../../lib/health/nutritionTracker';
import { confirmMealCapture } from '../../../../lib/health/nutritionTrackerApi';
import { entriesToDraft, foodBaseToDraft, mealLabelForType, parsedToDraft } from '../../../../lib/health/mealComposerUtils';
import { fetchRecentFoodProducts, recentProductToDraft } from '../../../../lib/health/recentFoodProductsApi';
import {
  fetchUserPortions,
  lookupUserPortion,
  upsertUserPortionsFromDraft,
} from '../../../../lib/health/userPortionsApi';
import { scanMealPhoto } from '../../../../lib/health/mealPhotoScan';
import { useFoodEntrySearch } from './useFoodEntrySearch';
import { useMealComposerRepeats } from './useMealComposerRepeats';
import { useSession } from '../../../../store/useStore';

const DEFAULT_TOTALS = {
  calories: 0,
  protein: 0,
  targetKcal: null as number | null,
  targetProtein: null as number | null,
  avgFoodQuality: null as number | null,
  foodQualityAnalysis: null as string | null,
};

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
  const [qualityPending, setQualityPending] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggedTime, setLoggedTime] = useState(() => warsawTimeOfDay(new Date().toISOString()));
  const [memoryName, setMemoryName] = useState('');

  const contextQuery = useQuery({
    queryKey: ['nutrition-context', userId, logDate, refreshSignal],
    queryFn: () => fetchNutritionDayContext(userId!, logDate, session!.access_token),
    enabled: !!userId,
  });

  const totals = useMemo(() => {
    const ctx = contextQuery.data;
    if (!ctx) return DEFAULT_TOTALS;
    return {
      calories: ctx.calories,
      protein: ctx.protein,
      targetKcal: ctx.targetKcal,
      targetProtein: ctx.targetProtein,
      avgFoodQuality: ctx.avgFoodQuality,
      foodQualityAnalysis: ctx.foodQualityAnalysis,
    };
  }, [contextQuery.data]);

  const repeatSuggestions = useMealComposerRepeats(userId, mealType, refreshSignal, totals);

  const userPortionsQuery = useQuery({
    queryKey: ['user-portions', userId, refreshSignal],
    queryFn: () => fetchUserPortions(userId!),
    enabled: !!userId,
  });

  const recentProductsQuery = useQuery({
    queryKey: ['recent-food-products', userId, refreshSignal],
    queryFn: () => fetchRecentFoodProducts(userId!, 8),
    enabled: !!userId,
  });

  const todayMealsQuery = useQuery({
    queryKey: ['composer-today-meals', userId, logDate, mealType, refreshSignal],
    queryFn: () => fetchComposerTodayMeals(userId!, logDate, mealType),
    enabled: !!userId,
  });

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
    setLoggedTime(warsawTimeOfDay(new Date().toISOString()));
  }, []);

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

  const bumpQualityRefresh = useCallback(() => {
    setQualityPending(true);
    window.setTimeout(() => {
      void queryClient.invalidateQueries({ queryKey: ['nutrition-context', userId, logDate] })
        .then(() => setQualityPending(false));
    }, 8000);
  }, [queryClient, userId, logDate]);

  const refreshAfterSave = useCallback(async () => {
    await contextQuery.refetch();
    void queryClient.invalidateQueries({ queryKey: ['nutrition-meal-memories', userId] });
    void queryClient.invalidateQueries({ queryKey: ['meal-composer-yesterday', userId, mealType] });
    void queryClient.invalidateQueries({ queryKey: ['recent-food-products', userId] });
    void queryClient.invalidateQueries({ queryKey: ['user-portions', userId] });
    void queryClient.invalidateQueries({ queryKey: ['composer-today-meals', userId, logDate, mealType] });
    bumpQualityRefresh();
    onSaved?.();
  }, [bumpQualityRefresh, contextQuery, logDate, mealType, onSaved, queryClient, userId]);

  const setDraftFromParsed = useCallback((items: ParsedFoodItem[], append = false) => {
    const next = parsedToDraft(items);
    setDraftItems((current) => (append && current?.length ? [...current, ...next] : next));
  }, []);

  const parseText = useCallback(async () => {
    if (!text.trim() || parsing || !userId) return;
    setParsing(true);
    setError(null);
    try {
      const items = await parseFoodNL(text.trim(), userId, session!.access_token);
      if (!items.length) {
        notify('Nie rozpoznano produktów — spróbuj opisać inaczej', 'error');
        return;
      }
      setDraftFromParsed(items);
      setText('');
    } catch (cause: unknown) {
      notify(cause instanceof Error ? cause.message : 'Parsowanie nie powiodło się', 'error');
    } finally {
      setParsing(false);
    }
  }, [text, parsing, userId, session, setDraftFromParsed]);

  const saveDraft = useCallback(async (
    items: MealDraftItem[],
    source: 'text' | 'photo' | 'repeat' | 'search',
    rememberIds: Set<string> = new Set(),
    options?: { memoryName?: string; loggedAt?: string },
  ) => {
    if (!userId || !items.length || saving) return;
    setSaving(true);
    setError(null);
    try {
      await confirmMealCapture({
        userId,
        date: logDate,
        mealType,
        source,
        items,
        memoryName: options?.memoryName,
        loggedAt: options?.loggedAt,
      });
      const toRemember = items
        .filter((item) => rememberIds.has(item.id))
        .map((item) => ({
          name: item.name,
          grams: item.grams,
          unit: item.parseMeta?.unit,
        }));
      if (toRemember.length) {
        await upsertUserPortionsFromDraft(userId, toRemember);
      }
      setDraftItems(null);
      setText('');
      setMemoryName('');
      search.setQuery('');
      setSearchOpen(false);
      await refreshAfterSave();
      notify(`Zapisano posiłek (${items.length} ${items.length === 1 ? 'pozycja' : 'pozycje'})`, 'success');
    } catch (cause: unknown) {
      const message = cause instanceof Error ? cause.message : 'Zapis nie powiódł się';
      setError(message);
      notify(message, 'error');
    } finally {
      setSaving(false);
    }
  }, [userId, saving, logDate, mealType, refreshAfterSave, search]);

  const addRecentProduct = useCallback((product: Parameters<typeof recentProductToDraft>[0]) => {
    setDraftItems((current) => [...(current ?? []), recentProductToDraft(product)]);
  }, []);

  const scanPhoto = useCallback(async (file: File) => {
    if (!userId || scanningPhoto) return;
    setScanningPhoto(true);
    setError(null);
    try {
      const draft = await scanMealPhoto(file, userId);
      setDraftFromParsed(draft.items);
    } catch (cause: unknown) {
      const message = cause instanceof Error ? cause.message : 'Nie udało się przeanalizować zdjęcia';
      setError(message);
      notify(message, 'error');
    } finally {
      setScanningPhoto(false);
    }
  }, [userId, scanningPhoto, setDraftFromParsed]);

  const repeatYesterday = useCallback(async () => {
    const entries = repeatSuggestions.yesterday?.entries;
    if (!entries?.length) return;
    await saveDraft(
      entriesToDraft(entries),
      'repeat',
      new Set(),
      { memoryName: `Wczorajsze ${mealLabelForType(mealType)}` },
    );
  }, [repeatSuggestions.yesterday, saveDraft, mealType]);

  const repeatMemory = useCallback(async (items: unknown, name: string) => {
    const draft = mealMemoryToDraft(items);
    if (!draft.length) return;
    await saveDraft(draft, 'repeat', new Set(), { memoryName: name });
  }, [saveDraft]);

  const loadTodayMealToDraft = useCallback((mealId: string) => {
    const meal = todayMealsQuery.data?.find((candidate) => candidate.id === mealId);
    if (!meal?.entries.length) return;
    setDraftItems(entriesToDraft(meal.entries));
    setMemoryName(meal.name);
  }, [todayMealsQuery.data]);

  const quickChips = useMemo(() => buildQuickChips({
    todayMeals: todayMealsQuery.data ?? [],
    recentProducts: recentProductsQuery.data ?? [],
    favorites: QUICK_CAPTURE_FAVORITES,
  }), [todayMealsQuery.data, recentProductsQuery.data]);

  const handleQuickChip = useCallback((chip: QuickChip) => {
    if (chip.kind === 'today') {
      loadTodayMealToDraft(chip.id.replace('today-', ''));
      return;
    }
    if (chip.kind === 'recent') {
      const product = recentProductsQuery.data?.find((item) => chip.id === `recent-${item.id}`);
      if (product) addRecentProduct(product);
      return;
    }
    const fav = QUICK_CAPTURE_FAVORITES.find((item) => chip.id === `fav-${item.id}`);
    if (!fav) return;
    addFoodToDraft({
      name: fav.name,
      brand: fav.brand,
      barcode: null,
      calories: fav.calories,
      protein: fav.protein,
      carbs: fav.carbs,
      fat: fav.fat,
      fiber: fav.fiber,
      sugar: fav.sugar,
      defaultGrams: fav.default_grams,
      source: 'confirmed',
    }, fav.default_grams);
  }, [addFoodToDraft, addRecentProduct, loadTodayMealToDraft, recentProductsQuery.data]);

  const saveFromDraft = useCallback((rememberIds: Set<string>, name?: string) => {
    if (!draftItems?.length) return;
    const loggedAt = loggedTime ? combineDateTimeWarsawISO(logDate, loggedTime) : undefined;
    void saveDraft(draftItems, 'text', rememberIds, { memoryName: name, loggedAt });
  }, [draftItems, logDate, loggedTime, saveDraft]);

  const handleFavorite = useCallback(async (fav: Omit<FoodFavoriteRow, 'barcode'> & { barcode?: string | null }) => {
    if (!userId || saving) return;
    setSaving(true);
    try {
      await quickAddFavorite(userId, fav, logDate, mealType);
      await refreshAfterSave();
      notify(fav.name, 'success');
    } catch (cause: unknown) {
      notify(cause instanceof Error ? cause.message : 'Błąd', 'error');
    } finally {
      setSaving(false);
    }
  }, [userId, saving, logDate, mealType, refreshAfterSave]);

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
    repeatYesterday,
    repeatMemory,
    handleFavorite,
    repeatSuggestions,
    quickChips,
    handleQuickChip,
    saveFromDraft,
    loggedTime,
    setLoggedTime,
    memoryName,
    setMemoryName,
    hasEntries: totals.calories > 0,
    recentProducts: recentProductsQuery.data ?? [],
    rememberedByName,
    MEAL_TYPES,
    QUICK_CAPTURE_FAVORITES,
    today: getTodayWarsaw(),
    yesterday: getYesterdayWarsaw(),
    mealLabelForType,
  };
}
