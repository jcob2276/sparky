/**
 * @component DesktopDashboard
 * @role Root wielokolumnowego cockpitu desktopowego (trasa /dashboard) — spina panele ze wszystkich
 *       domenowych folderów desktop/ oraz zarządza natychmiastowym szybkim logowaniem i nawigacją.
 * @usedBy App.tsx (trasa /dashboard)
 */
import { Suspense, lazy, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { format, parseISO } from 'date-fns';
import Button from '../../ui/Button';
import Spinner from '../../ui/Spinner';
import { notify } from '../../../lib/notify';
import { STORAGE_KEYS } from '../../../lib/constants';
import { getTodayWarsaw, formatDashboardDate } from '../../../lib/date';
import { mergeLatestBodyMetrics } from '../../../lib/health/bodyMetrics';
import { syncOura, syncCalendar, syncStrava, computeDailyStrain } from '../../../lib/syncApi';
import { loadWorkoutTemplate, markWorkoutSessionActive, purgeStaleWorkoutDraft, shouldAutoResumeWorkout, type WorkoutLoggerInitial } from '../../../lib/health/workoutLogging';
import { startGoogleAuth } from '../../../hooks/useSyncActions';
import { useNudgeData } from '../../core/hooks/useNudgeData';
import { useDesktopData } from './useDesktopData';
import { useHabitsData } from '../health/useHabitsData';
import { useDreamsData } from '../vision/useDreamsData';
import { getSprintInfo, sprintMetrics, computeAlerts, daysBefore, weeklyVolume } from '../desktopUtils';
import DesktopHeader from './DesktopHeader';
import DesktopSectionNav from './DesktopSectionNav';
import DesktopQuickActionsBar, { type DesktopTabType } from './DesktopQuickActionsBar';
import DesktopTabContent from './DesktopTabContent';
import DesktopQuickConfounderModal from './DesktopQuickConfounderModal';
import DesktopQuickStreamModal from './DesktopQuickStreamModal';
import DesktopQuickWeightModal from './DesktopQuickWeightModal';
import DesktopToolsLauncherModal from './DesktopToolsLauncherModal';
import DreamEditModal from '../vision/DreamEditModal';

const WorkoutLogger = lazy(() => import('../../biometrics/WorkoutLogger'));
const Fundament = lazy(() => import('../../core/Fundament'));
const SystemHealth = lazy(() => import('../health/SystemHealth'));
const FoodEntryModal = lazy(() => import('../../core/nutrition/FoodEntryModal'));
const SaunaLoggerModal = lazy(() => import('../../biometrics/SaunaLoggerModal'));

export default function DesktopDashboard({ session }: { session: Session }) {
  const userId = session?.user?.id;
  const navigate = useNavigate();
  const { pendingGrowthMustCount } = useNudgeData(userId);
  const desktopData = useDesktopData(userId);
  const { loading, oura, nutrition, sessions, body, strain, strava, projects, moves, goals, sprintGoals, refresh } = desktopData;

  const habitsData = useHabitsData({ userId });
  const dreamsData = useDreamsData({ userId, loading });

  const [activeTab, setActiveTab] = useState<DesktopTabType>('cockpit');
  const [syncing, setSyncing] = useState(false);
  const [showWorkout, setShowWorkout] = useState(false);
  const [workoutInitial, setWorkoutInitial] = useState<WorkoutLoggerInitial | null>(null);
  const [showFoodModal, setShowFoodModal] = useState(false);
  const [showSaunaModal, setShowSaunaModal] = useState(false);
  const [showConfounderModal, setShowConfounderModal] = useState(false);
  const [showStreamModal, setShowStreamModal] = useState(false);
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
    try { localStorage.setItem(STORAGE_KEYS.THEME, theme); } catch (e: unknown) { console.warn('[DesktopDashboard] Failed to save theme:', e); }
  }, [theme]);

  const grid = theme === 'dark' ? 'var(--color-theme-hex-2d3748)' : 'var(--color-theme-hex-e5e7eb)';
  const tick = theme === 'dark' ? 'var(--color-text-muted)' : 'var(--color-text-tertiary-muted)';

  const syncAll = useCallback(async () => {
    if (syncing || !userId) return;
    setSyncing(true);
    try {
      const phase1 = await Promise.allSettled([syncOura(userId), syncCalendar(userId)]);
      phase1.forEach((r, i) => { if (r.status === 'rejected') console.error(`[sync] phase1[${i}] failed:`, r.reason); });
      await syncStrava().catch(e => console.error('[sync] strava failed:', e));
      await computeDailyStrain(userId, 2).catch(e => console.error('[sync] strain failed:', e));
      refresh();
    } catch {
      notify('Synchronizacja nie powiodła się.', 'error');
    } finally {
      setSyncing(false);
    }
  }, [syncing, userId, refresh]);

  const openWorkout = useCallback(async () => {
    if (!userId) { setShowWorkout(true); return; }
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
      if (e.key === 'd') setTheme(th => th === 'light' ? 'dark' : 'light');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [syncAll, openWorkout]);

  const oura14 = useMemo(() => oura.slice(-14), [oura]);
  const alerts = useMemo(() => computeAlerts(oura, sessions, nutrition), [oura, sessions, nutrition]);
  const mergedBodySnapshot = useMemo(() => mergeLatestBodyMetrics(body), [body]);
  const currentWeight = mergedBodySnapshot?.weight ?? null;
  const weight30ago = currentWeight ? +([...body].reverse().find(b => (b.date ?? '') <= daysBefore(28))?.weight || 0) || null : null;

  const sprint = useMemo(() => getSprintInfo(), []);
  const sprintGoal = useMemo(() => sprintGoals.find(g => g.personal_year === sprint.personalYear && g.sprint_number === sprint.sprintNumber) ?? null, [sprintGoals, sprint]);
  const currMetrics = useMemo(() => sprintMetrics(oura, sessions, strava, sprint.sprintStart, sprint.sprintEnd), [oura, sessions, strava, sprint]);
  const prevMetrics = useMemo(() => sprint.prevStart ? sprintMetrics(oura, sessions, strava, sprint.prevStart, sprint.prevEnd) : null, [oura, sessions, strava, sprint]);

  const projectMetrics = useMemo(() => ({
    doneInSprint: (moves || []).filter(m => m.status === 'done' && (m.completed_at || '').slice(0, 10) >= sprint.sprintStart).length,
    inProgress: (moves || []).filter(m => m.status === 'todo' || m.status === 'open').length,
    blocked: (moves || []).filter(m => m.status === 'blocked' || ((m.status === 'todo' || m.status === 'open') && m.planned_for && m.planned_for < getTodayWarsaw())).length,
    activeProjects: (projects || []).filter(p => p.status === 'active' || (p.sense_status && p.sense_status !== 'cut' && p.sense_status !== 'completed')).length,
  }), [moves, sprint.sprintStart, projects]);

  const sleepData = useMemo(() => oura14.map(r => ({ d: format(parseISO(r.date), 'dd.MM'), Sen: r.total_sleep_hours ? +r.total_sleep_hours.toFixed(1) : null, HRV: r.hrv_avg || null })), [oura14]);
  const nutrData = useMemo(() => nutrition.map(r => ({ d: format(parseISO(r.date), 'dd.MM'), Kcal: r.calories || 0, Białko: r.protein || 0 })), [nutrition]);
  const volData = useMemo(() => weeklyVolume(sessions), [sessions]);
  const now = useMemo(() => formatDashboardDate(), []);

  if (showHealth) return (
    <div className="min-h-screen bg-background text-text-primary p-8 max-w-4xl mx-auto">
      <header className="mb-6 flex items-center gap-4">
        <Button onClick={() => setShowHealth(false)} variant="secondary" size="sm" className="rounded-xl">← Powrót do Pulpitu</Button>
      </header>
      <Suspense fallback={<div className="flex justify-center p-12"><Spinner size="md" /></div>}>
        <SystemHealth userId={userId ?? ''} />
      </Suspense>
    </div>
  );

  if (showFundament) return (
    <div className="min-h-screen bg-background text-text-primary p-8 max-w-4xl mx-auto">
      <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><Spinner size="md" /></div>}>
        <Fundament onBack={() => { setShowFundament(false); refresh(); }} onSyncCalendar={startGoogleAuth} isSyncing={syncing} />
      </Suspense>
    </div>
  );

  if (showWorkout) return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><Spinner size="md" /></div>}>
      <WorkoutLogger initial={workoutInitial} onSaved={() => refresh()} onBack={() => { setShowWorkout(false); setWorkoutInitial(null); refresh(); }} />
    </Suspense>
  );

  if (loading && !oura.length && !sessions.length) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="relative h-16 w-16"><div className="absolute inset-0 rounded-full border-4 border-primary/20" /><Spinner size="lg" /></div>
      </div>
    );
  }

  const heroProps = {
    strain, oura: oura14, sprint, sprintGoal, sprintReview: dreamsData.sprintReview,
    metrics: currMetrics, prevMetrics, projectMetrics, goals, currentWeight, weight30ago,
  };

  return (
    <>
      <div className="min-h-screen bg-background text-text-primary transition-colors duration-[var(--motion-slow)]">
        <DesktopHeader
          now={now} syncing={syncing} pendingGrowthMustCount={pendingGrowthMustCount}
          theme={theme} setTheme={setTheme} syncAll={syncAll}
          setShowHealth={setShowHealth} setShowFundament={setShowFundament}
          onOpenTools={() => setShowToolsModal(true)}
        />

        <main className="px-8 py-6 max-w-[var(--ds-maxw-1600px)] mx-auto">
          <div className="flex gap-8 items-start">
            <DesktopSectionNav
              activeTab={activeTab}
              onTabChange={setActiveTab}
              dailyStatus={strain?.daily_status || 'unknown'}
            />
            <div className="flex-1 min-w-0 space-y-4">
              <DesktopQuickActionsBar
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onOpenFood={() => setShowFoodModal(true)}
                onOpenWorkout={openWorkout}
                onOpenWeight={() => setShowWeightModal(true)}
                onOpenSauna={() => setShowSaunaModal(true)}
                onOpenConfounder={() => setShowConfounderModal(true)}
                onOpenStream={() => setShowStreamModal(true)}
                onOpenOptics={() => navigate('/optics')}
                onOpenTools={() => setShowToolsModal(true)}
                naukaBadge={pendingGrowthMustCount}
              />

              <DesktopTabContent
                activeTab={activeTab}
                userId={userId}
                session={session}
                theme={theme}
                grid={grid}
                tick={tick}
                data={desktopData}
                habitsData={habitsData}
                dreamsData={dreamsData}
                heroProps={heroProps}
                alerts={alerts}
                sleepData={sleepData}
                nutrData={nutrData}
                volData={volData}
                refresh={refresh}
              />
            </div>
          </div>
        </main>
      </div>

      <DreamEditModal
        editingDream={dreamsData.editingDream} setEditingDream={dreamsData.setEditingDream}
        editDreamTitle={dreamsData.editDreamTitle} setEditDreamTitle={dreamsData.setEditDreamTitle}
        editDreamCat={dreamsData.editDreamCat} setEditDreamCat={dreamsData.setEditDreamCat}
        editDreamLifeGoal={dreamsData.editDreamLifeGoal} setEditDreamLifeGoal={dreamsData.setEditDreamLifeGoal}
        editDreamDesc={dreamsData.editDreamDesc} setEditDreamDesc={dreamsData.setEditDreamDesc}
        saveDreamEdit={dreamsData.saveDreamEdit} savingDream={dreamsData.savingDream}
        toggleTop5={dreamsData.toggleTop5} deleteDream={dreamsData.deleteDream}
        DREAM_CATEGORIES={dreamsData.DREAM_CATEGORIES} DREAM_CAT_LABEL={dreamsData.DREAM_CAT_LABEL}
      />

      {showFoodModal && (
        <Suspense fallback={null}>
          <FoodEntryModal
            onClose={() => setShowFoodModal(false)}
            onSaved={() => { setShowFoodModal(false); refresh(); }}
          />
        </Suspense>
      )}

      {showSaunaModal && (
        <Suspense fallback={null}>
          <SaunaLoggerModal
            onBack={() => setShowSaunaModal(false)}
            onSaved={() => { setShowSaunaModal(false); refresh(); }}
          />
        </Suspense>
      )}

      <DesktopQuickConfounderModal
        isOpen={showConfounderModal}
        onClose={() => setShowConfounderModal(false)}
        userId={userId}
      />

      <DesktopQuickStreamModal
        isOpen={showStreamModal}
        onClose={() => setShowStreamModal(false)}
        userId={userId}
        onSaved={refresh}
      />

      {showWeightModal && (
        <DesktopQuickWeightModal
          isOpen={showWeightModal}
          onClose={() => setShowWeightModal(false)}
          userId={userId}
          currentWeight={currentWeight}
          onSaved={refresh}
        />
      )}

      <DesktopToolsLauncherModal
        isOpen={showToolsModal}
        onClose={() => setShowToolsModal(false)}
        naukaBadge={pendingGrowthMustCount}
      />
    </>
  );
}
