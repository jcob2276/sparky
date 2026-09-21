/**
 * @file useDesktopDashboardState.ts
 * @role Wydzielona logika stanu, synchronizacji, skrótów klawiszowych i modali
 *       dla DesktopDashboard (Wzorzec A: rozdzielenie stanu od prezentacji).
 */
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { notify } from '../../../lib/notify';
import { STORAGE_KEYS } from '../../../lib/constants';
import { formatDashboardDate } from '../../../lib/date';
import { syncOura, syncCalendar, syncStrava, computeDailyStrain } from '../../../lib/syncApi';
import {
  loadWorkoutTemplate,
  markWorkoutSessionActive,
  purgeStaleWorkoutDraft,
  shouldAutoResumeWorkout,
  type WorkoutLoggerInitial,
} from '../../../lib/health/workoutLogging';
import { type DesktopTabType } from './DesktopQuickActionsBar';
import { weeklyVolume } from '../desktopUtils';
import { useDesktopData } from './useDesktopData';

type DesktopData = ReturnType<typeof useDesktopData>;

interface UseDesktopDashboardStateOptions {
  userId: string;
  desktopData: DesktopData;
}

export function useDesktopDashboardState({
  userId,
  desktopData,
}: UseDesktopDashboardStateOptions) {
  const { sessions, refresh } = desktopData;

  const [searchParams] = useSearchParams();
  const urlTab = searchParams.get('tab') as DesktopTabType | null;
  const [activeTab, setActiveTab] = useState<DesktopTabType>(
    urlTab && ['training', 'health', 'intel'].includes(urlTab) ? urlTab : 'training',
  );
  const [syncing, setSyncing] = useState(false);
  const [showWorkout, setShowWorkout] = useState(false);
  const [workoutInitial, setWorkoutInitial] = useState<WorkoutLoggerInitial | null>(null);
  const [showSaunaModal, setShowSaunaModal] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showToolsModal, setShowToolsModal] = useState(false);
  const [showFundament, setShowFundament] = useState(false);
  const [showHealth, setShowHealth] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem(STORAGE_KEYS.THEME) || 'light');

  const resumedWorkoutDraft = useRef(false);

  useEffect(() => {
    if (resumedWorkoutDraft.current || !userId) return;
    resumedWorkoutDraft.current = true;
    purgeStaleWorkoutDraft(userId);
    if (shouldAutoResumeWorkout(userId)) {
      markWorkoutSessionActive(userId);
      setTimeout(() => setShowWorkout(true), 0);
    }
  }, [userId]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
    } catch (e: unknown) {
      console.warn('[DesktopDashboard] Failed to save theme:', e);
    }
  }, [theme]);

  const grid = theme === 'dark' ? 'var(--color-theme-hex-2d3748)' : 'var(--color-theme-hex-e5e7eb)';
  const tick = theme === 'dark' ? 'var(--color-text-muted)' : 'var(--color-text-tertiary-muted)';

  const syncAll = useCallback(async () => {
    if (syncing || !userId) return;
    setSyncing(true);
    try {
      const phase1 = await Promise.allSettled([syncOura(userId), syncCalendar(userId)]);
      phase1.forEach((r, i) => {
        if (r.status === 'rejected') console.error(`[sync] phase1[${i}] failed:`, r.reason);
      });
      await syncStrava().catch((e) => console.error('[sync] strava failed:', e));
      await computeDailyStrain(userId, 2).catch((e) => console.error('[sync] strain failed:', e));
      refresh();
    } catch {
      notify('Synchronizacja nie powiodła się.', 'error');
    } finally {
      setSyncing(false);
    }
  }, [syncing, userId, refresh]);

  const openWorkout = useCallback(async () => {
    if (!userId) {
      setShowWorkout(true);
      return;
    }
    markWorkoutSessionActive(userId);
    const tpl = await loadWorkoutTemplate(userId);
    setWorkoutInitial(tpl);
    setShowWorkout(true);
  }, [userId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || e.metaKey || e.ctrlKey) return;
      if (e.key === 's') void syncAll();
      if (e.key === 't') void openWorkout();
      if (e.key === 'w') setShowWeightModal(true);
      if (e.key === 'd') setTheme((th) => (th === 'light' ? 'dark' : 'light'));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [syncAll, openWorkout]);

  const currentWeight = desktopData.body[desktopData.body.length - 1]?.weight ?? null;
  const volData = useMemo(() => weeklyVolume(sessions), [sessions]);
  const now = useMemo(() => formatDashboardDate(), []);

  return {
    activeTab,
    setActiveTab,
    syncing,
    showWorkout,
    setShowWorkout,
    workoutInitial,
    setWorkoutInitial,
    showSaunaModal,
    setShowSaunaModal,
    showWeightModal,
    setShowWeightModal,
    showToolsModal,
    setShowToolsModal,
    showFundament,
    setShowFundament,
    showHealth,
    setShowHealth,
    theme,
    setTheme,
    grid,
    tick,
    syncAll,
    openWorkout,
    currentWeight,
    volData,
    now,
  };
}
