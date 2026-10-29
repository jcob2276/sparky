import { useCallback, useRef, useState, useMemo, startTransition } from 'react';
import { useNavigate, useLocation, type NavigateOptions, type To } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { useStore } from '../../../store/useStore';
import { useDashboardData } from './useDashboardData';
import { useHaptics } from '../../../hooks/useHaptics';
import { useNudgeData } from './useNudgeData';
import { useSyncActions } from '../../../hooks/useSyncActions';
import { useSpineGuidance } from '../../../hooks/useSpineGuidance';
import { usePendingActionCount } from '../../../hooks/usePendingActionCount';
import { useWorkoutResume } from '../../biometrics/hooks/useWorkoutResume';
import { useDashboardSwipeNav } from './useDashboardSwipeNav';
import type { WorkoutLoggerInitial } from '../../../lib/health/workoutLogging';
import { markWorkoutSessionActive } from '../../../lib/health/workoutLogging';
import type { RecentEntry } from '../nutrition/hooks/useFoodEntryData';
import type { SpineGuideTarget } from '../../../lib/goal/goalSpineGuide';
import { TAB_ORDER, normalizeView } from './dashboardViews';
import { useDashboardTheme } from './useDashboardTheme';
import { useDashboardUrlRedirects } from './useDashboardUrlRedirects';
import { useDashboardKeyboardShortcuts } from './useDashboardKeyboardShortcuts';
import { useDashboardModalHistory } from './useDashboardModalHistory';
import {
  useDashboardViewTracking,
  useDashboardTaskReview,
  useDashboardShutdownSuggestion,
  useDashboardLoggingGap,
} from './useDashboardAutoPrompts';

export function useDashboardState(session: Session) {
  const userId = session?.user?.id;
  const accessToken = session?.access_token;
  const location = useLocation();
  const rawNavigate = useNavigate();
  const haptics = useHaptics();

  const isNavigatingRef = useRef(false);

  const navigate = useCallback((to: To | number, options?: NavigateOptions) => {
    isNavigatingRef.current = true;
    startTransition(() => {
      if (typeof to === 'number') {
        rawNavigate(to);
      } else {
        const shouldReplace = !!window.history.state?.modal;
        rawNavigate(to, { replace: shouldReplace, ...options });
      }
    });
  }, [rawNavigate]);

  const rawView = location.pathname === '/' ? 'dzis' : location.pathname.substring(1);
  const view = normalizeView(rawView);

  useDashboardUrlRedirects(location, navigate);

  // Modal visibility state
  const [actionCenterOpen, setActionCenterOpen]     = useState(false);
  const [historySubTab, setHistorySubTab]           = useState<'chronicle' | 'archive'>('chronicle');
  const [workoutInitial, setWorkoutInitial]         = useState<WorkoutLoggerInitial | null>(null);
  const [workoutKey, setWorkoutKey]                 = useState(0);
  const [showMorningPlan, setShowMorningPlan]       = useState(false);
  const [morningPlanTargetDate, setMorningPlanTargetDate] = useState<string | null>(null);
  const [showShutdown, setShowShutdown]             = useState(false);
  const [gapLastLoggedDate, setGapLastLoggedDate]   = useState<string | null>(null);
  const [showWeeklyReview, setShowWeeklyReview]     = useState(false);
  const [taskReviewDoneThisWeek, setTaskReviewDoneThisWeek] = useState(false);
  const [showSearch, setShowSearch]                 = useState(false);
  const [showQuickFoodEntry, setShowQuickFoodEntry] = useState(false);
  const [showFastCapture, setShowFastCapture]       = useState(false);
  const [nutritionKey, setNutritionKey]             = useState(0);
  const [foodEditEntry, setFoodEditEntry]           = useState<RecentEntry | null>(null);
  const [planDaySignal, setPlanDaySignal]           = useState(0);

  // --- Browser back button modal support state ---
  const openModal = showMorningPlan
    ? 'morningPlan'
    : showShutdown
    ? 'shutdown'
    : showWeeklyReview
    ? 'weeklyReview'
    : showQuickFoodEntry
    ? 'quickFoodEntry'
    : actionCenterOpen
    ? 'actionCenter'
    : showSearch
    ? 'search'
    : showFastCapture
    ? 'fastCapture'
    : null;

  const modalSetters = {
    setShowMorningPlan, setShowShutdown, setShowWeeklyReview, setShowQuickFoodEntry,
    setActionCenterOpen, setShowSearch, setShowFastCapture, setFoodEditEntry,
  };

  const { theme, toggleTheme } = useDashboardTheme();

  useDashboardKeyboardShortcuts({ openModal, navigate, pathname: location.pathname, setters: modalSetters });

  useDashboardViewTracking(userId, view);
  useDashboardTaskReview(userId, setTaskReviewDoneThisWeek);

  // Logo long-press → food entry
  const logoLongPressTimer = useRef<number | null>(null);
  const logoLongPressFired = useRef(false);
  const handleLogoPressStart = useCallback(() => {
    logoLongPressFired.current = false;
    logoLongPressTimer.current = window.setTimeout(() => {
      logoLongPressFired.current = true;
      haptics.medium();
      navigate('/dzis');
    }, 550);
  }, [haptics, navigate]);
  const handleLogoPressEnd = useCallback(() => {
    if (logoLongPressTimer.current) {
      clearTimeout(logoLongPressTimer.current);
      logoLongPressTimer.current = null;
    }
  }, []);

  // Data
  const { count: pendingActionCount, reload: reloadPendingActions } = usePendingActionCount();
  const { isSyncing, setSyncing } = useStore();
  const isDashboardView = ['dzis', 'tydzien', 'historia'].includes(view);
  const { weeklyCalories, todayWin, loading, refresh } = useDashboardData(session, isDashboardView);
  const { guidance: spineGuidance, loading: spineGuidanceLoading } = useSpineGuidance(userId, todayWin);
  const { syncCalendar, startGoogleAuth } = useSyncActions({ userId, accessToken, onRefresh: refresh, setSyncing });
  const { reviewOverdueDays, urgentTodoCount, staleNoteCount, refresh: refreshNudge } = useNudgeData(userId);

  useDashboardShutdownSuggestion(todayWin, setShowShutdown);
  useDashboardLoggingGap(userId, setGapLastLoggedDate);

  // Navigation
  useWorkoutResume(userId, useCallback(() => {
    if (location.pathname === '/trening' || location.pathname === '/cwiczenie') return;
    navigate('/trening?mode=log');
  }, [location.pathname, navigate]));

  const navigateTo = useCallback((newView: string) => {
    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      const mainEl = document.querySelector('main');
      if (mainEl) mainEl.scrollTop = 0;
    };

    if (newView === view) {
      scrollToTop();
      return;
    }
    haptics.light();
    const fromIdx = TAB_ORDER.indexOf(view);
    const toIdx   = TAB_ORDER.indexOf(newView);
    if (fromIdx !== -1 && toIdx !== -1) {
      document.documentElement.dataset.slide = toIdx >= fromIdx ? 'right' : 'left';
    }
    navigate('/' + newView);
    scrollToTop();
    setTimeout(() => {
      delete document.documentElement.dataset.slide;
    }, 250);
  }, [view, haptics, navigate]);

  const {
    handleMainTouchStart,
    handleMainTouchMove,
    handleMainTouchEnd,
    handleMainTouchCancel,
  } = useDashboardSwipeNav({ view, navigateTo, tabOrder: TAB_ORDER });

  const handleSpineGuideNavigate = useCallback((target: SpineGuideTarget) => {
    if (target === 'dashboard') { navigate('/dashboard'); return; }
    navigateTo(target);
  }, [navigate, navigateTo]);

  const goBack = useCallback(() => { haptics.light(); navigate('/dzis'); }, [haptics, navigate]);
  const handlePlanDay = useCallback(() => { haptics.light(); setShowMorningPlan(true); setPlanDaySignal(n => n + 1); }, [haptics]);
  const handleFocusPlan = useCallback(() => { haptics.light(); document.getElementById('day-plan')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [haptics]);

  const openFoodEntry = useCallback(() => {
    const scrollToComposer = () => {
      const el = document.getElementById('meal-composer');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    if (view === 'dzis') {
      setTimeout(scrollToComposer, 80);
    } else {
      navigateTo('dzis');
      setTimeout(scrollToComposer, 350);
    }
  }, [view, navigateTo]);

  const openWorkout = useCallback(() => {
    setWorkoutInitial(null);
    if (userId) markWorkoutSessionActive(userId);
    navigate('/trening');
  }, [userId, navigate]);

  useDashboardModalHistory(openModal, isNavigatingRef, modalSetters);

  return useMemo(() => ({
    // routing
    view, navigate, goBack, navigateTo,
    location, handleMainTouchStart, handleMainTouchMove, handleMainTouchEnd, handleMainTouchCancel,
    // data
    weeklyCalories, todayWin, loading, refresh,
    spineGuidance, spineGuidanceLoading,
    reviewOverdueDays, urgentTodoCount, staleNoteCount, refreshNudge,
    pendingActionCount, reloadPendingActions,
    isSyncing, syncCalendar, startGoogleAuth,
    // state
    theme, toggleTheme,
    actionCenterOpen, setActionCenterOpen,
    historySubTab, setHistorySubTab,
    workoutInitial, setWorkoutInitial, workoutKey, setWorkoutKey,
    showMorningPlan, setShowMorningPlan,
    morningPlanTargetDate, setMorningPlanTargetDate,
    showShutdown, setShowShutdown,
    gapLastLoggedDate, setGapLastLoggedDate,
    showWeeklyReview, setShowWeeklyReview,
    taskReviewDoneThisWeek, setTaskReviewDoneThisWeek,
    showSearch, setShowSearch,
    showQuickFoodEntry, setShowQuickFoodEntry,
    showFastCapture, setShowFastCapture,
    nutritionKey, setNutritionKey,
    foodEditEntry, setFoodEditEntry,
    planDaySignal,
    // handlers
    handleLogoPressStart, handleLogoPressEnd,
    handleSpineGuideNavigate, handlePlanDay, handleFocusPlan,
    openWorkout, openFoodEntry,
  }), [
    view, navigate, goBack, navigateTo,
    location, handleMainTouchStart, handleMainTouchMove, handleMainTouchEnd, handleMainTouchCancel,
    weeklyCalories, todayWin, loading, refresh,
    spineGuidance, spineGuidanceLoading,
    reviewOverdueDays, urgentTodoCount, staleNoteCount, refreshNudge,
    pendingActionCount, reloadPendingActions,
    isSyncing, syncCalendar, startGoogleAuth,
    theme, toggleTheme,
    actionCenterOpen,
    historySubTab,
    workoutInitial, workoutKey,
    showMorningPlan,
    morningPlanTargetDate,
    showShutdown,
    gapLastLoggedDate,
    showWeeklyReview,
    taskReviewDoneThisWeek,
    showSearch,
    showQuickFoodEntry,
    showFastCapture,
    nutritionKey,
    foodEditEntry,
    planDaySignal,
    handleLogoPressStart, handleLogoPressEnd,
    handleSpineGuideNavigate, handlePlanDay, handleFocusPlan,
    openWorkout, openFoodEntry,
  ]);
}
