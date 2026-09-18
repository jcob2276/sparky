/**
 * @component Dashboard
 * @role Root mobilnego SPA — 4 zakładki (Dziś/Tydzień/Projekty/Historia) + fast capture + nav + modale.
 * @composes DashboardDzisTab, DashboardTydzienTab, DashboardProjektyTab, DashboardHistoriaTab (lazy)
 * @folders context/ = DashboardContext | hooks/ = useDashboardState (wraps useDashboardData,
 *          useDashboardSwipeNav, useNudgeData, useStatsData) | morningPlan/, nutrition/, shutdown/, stats/ =
 *          rozbite pod-domeny konkretnych modali/kart (patrz ich pliki-huby: MorningPlanModal, NutritionCard,
 *          DailyShutdownModal, Stats)
 * @usedBy App.tsx (trasa "/")
 */
import { Pressable } from '../ui/ControlPrimitives';
import { TIMEZONE } from '../../lib/date';
import { Suspense, lazy, useMemo, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '../../store/useStore';
import { Sun, Calendar, Sparkles, StickyNote, ListTodo, BookOpen, WalletCards, Bell, Dumbbell, Flame, Eye, GraduationCap } from 'lucide-react';
import { dashboardKeys } from '../../lib/queryKeys';

import { ErrorBoundary } from './ErrorBoundary';
import { DashboardHeader } from './DashboardHeader';
import { DashboardNavBar } from './DashboardNavBar';
import { DashboardModals } from './DashboardModals';
import { DashboardFastCaptureMenu } from './DashboardFastCapture';
import OrientationFooter from './OrientationFooter';
import PowerList from '../lifestyle/PowerList';
import FoodQuickCapture from './nutrition/FoodQuickCapture';
import SearchModal from './SearchModal';
import { useDashboardState } from './hooks/useDashboardState';
import { useDashboardPrefetch } from './hooks/useDashboardPrefetch';
import Spinner from '../ui/Spinner';
import { DashboardContext } from './context/DashboardContext';

const TrainingRoute   = lazy(() => import('../biometrics/TrainingRoute'));
const ExerciseProgressRoute = lazy(() => import('../biometrics/ExerciseProgressRoute'));
const SaunaLoggerModal = lazy(() => import('../biometrics/SaunaLoggerModal'));
const Fundament       = lazy(() => import('./Fundament'));
const Keep            = lazy(() => import('../notes/Keep'));
const Todo            = lazy(() => import('../todo/Todo'));
const LinksInbox      = lazy(() => import('../lifestyle/LinksInbox'));
const CalendarView    = lazy(() => import('../calendar/CalendarView'));
const TerminyPage     = lazy(() => import('../terminy/TerminyPage'));
const GrowthView      = lazy(() => import('../growth/GrowthView'));

import { DashboardDzisTab } from './DashboardDzisTab';
import { DashboardTydzienTab } from './DashboardTydzienTab';
import { DashboardHistoriaTab } from './DashboardHistoriaTab';
import { DashboardProjektyTab } from './DashboardProjektyTab';

const TAB_ORDER = ['dzis', 'tydzien', 'historia'];

function ViewFallback() {
  return (
    <div className="flex min-h-[var(--ds-h-220px)] items-center justify-center rounded-lg border border-on-accent/[0.06] bg-on-accent/[0.02]">
      <Spinner size="md" />
    </div>
  );
}

function isAfter20(): boolean {
  try {
    const h = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, hour: 'numeric', hour12: false }).format(new Date()), 10);
    return h >= 20;
  } catch { return new Date().getHours() >= 20; }
}

function DashboardContent() {
  const session = useSession()!;
  const s = useDashboardState(session);
  const queryClient = useQueryClient();
  const userId = session.user.id;
  useDashboardPrefetch(userId);

  const [visitedTabs, setVisitedTabs] = useState<string[]>(() => [s.view]);
  if (['dzis', 'tydzien', 'historia', 'projekty'].includes(s.view) && !visitedTabs.includes(s.view)) {
    setVisitedTabs(prev => [...prev, s.view]);
  }

  const handleOpenActionCenter = useCallback(() => {
    s.setActionCenterOpen(true);
  }, [s]);

  const fastCaptureItems = useMemo(() => [
    { label: 'Zaloguj Trening', emoji: '🏋️', icon: Dumbbell, color: 'var(--color-warning)', action: () => { s.openWorkout(); } },
    { label: 'Zaloguj Saunę', emoji: '🧖', icon: Flame, color: 'var(--color-warning)', action: () => s.navigate('/sauna') },
    { label: 'Zmierz Wzrok', emoji: '👁️', icon: Eye, color: 'var(--color-primary)', action: () => s.navigate('/optics') },
  ], [s]);

  const workspaceTools = useMemo(() => [
    { label: 'Notatki', icon: StickyNote, action: () => s.navigate('/keep'), route: 'keep' },
    { label: 'Zadania', icon: ListTodo, action: () => s.navigate('/todo'), route: 'todo' },
    { label: 'Kalendarz', icon: Calendar, action: () => s.navigate('/kalendarz'), route: 'kalendarz' },
    { label: 'Terminy', icon: Bell, action: () => s.navigate('/terminy'), route: 'terminy' },
    { label: 'Rozwój', icon: GraduationCap, action: () => s.navigate('/rozwoj'), route: 'rozwoj' },
    { label: 'Pocket', icon: BookOpen, action: () => s.navigate('/links'), route: 'links' },
    { label: 'Finanse', icon: WalletCards, action: () => s.navigate('/finanse'), route: 'finanse' },
  ], [s]);

  // ── Full-screen route views ──
  if (s.view === 'fundament') return <Suspense fallback={<ViewFallback />}><Fundament onBack={s.goBack} onSyncCalendar={s.startGoogleAuth} isSyncing={s.isSyncing} /></Suspense>;
  if (s.view === 'keep') return <Suspense fallback={<ViewFallback />}><Keep onBack={s.goBack} onNavigateTo={dest => s.navigate('/' + dest)} /></Suspense>;
  if (s.view === 'todo') return <Suspense fallback={<ViewFallback />}><Todo onBack={() => { s.refreshNudge(); s.goBack(); }} onNavigateTo={dest => s.navigate('/' + dest)} /></Suspense>;
  if (s.view === 'links') return <Suspense fallback={<ViewFallback />}><LinksInbox onBack={s.goBack} onNavigateTo={dest => s.navigate('/' + dest)} /></Suspense>;
  if (s.view === 'kalendarz') return <Suspense fallback={<ViewFallback />}><CalendarView onBack={s.goBack} onSyncCalendar={s.startGoogleAuth} onResyncCalendar={s.syncCalendar} isSyncing={s.isSyncing} onNavigateTo={dest => s.navigate('/' + dest)} /></Suspense>;
  if (s.view === 'terminy') return <Suspense fallback={<ViewFallback />}><TerminyPage onBack={s.goBack} onNavigateTo={dest => s.navigate('/' + dest)} /></Suspense>;
  if (s.view === 'rozwoj') return <Suspense fallback={<ViewFallback />}><GrowthView session={session} onBack={s.goBack} onNavigateTo={dest => s.navigate('/' + dest)} /></Suspense>;
  if (s.view === 'sauna') return (
    <div className="animate-ios-modal flex-1 flex flex-col min-h-screen">
      <Suspense fallback={<ViewFallback />}><SaunaLoggerModal onSaved={() => { s.refresh(); s.setWorkoutKey(k => k + 1); s.navigate('/dzis'); }} onBack={() => { s.refresh(); s.navigate('/dzis'); }} /></Suspense>
    </div>
  );
  if (s.view === 'trening') return (
    <div className="animate-ios-modal flex-1 flex flex-col min-h-screen">
      <Suspense fallback={<ViewFallback />}><TrainingRoute initial={s.workoutInitial} onSaved={() => { s.refresh(); s.setWorkoutKey(k => k + 1); s.navigate('/dzis'); }} onBack={() => { s.setWorkoutInitial(null); s.refresh(); s.navigate('/dzis'); }} /></Suspense>
    </div>
  );
  if (s.view === 'cwiczenie') return (
    <div className="animate-ios-modal flex-1 flex flex-col min-h-screen">
      <Suspense fallback={<ViewFallback />}><ExerciseProgressRoute onBack={() => s.navigate(-1)} /></Suspense>
    </div>
  );

  if (s.loading) return (
    <div className="min-h-screen bg-scrim flex items-center justify-center">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
        <Spinner size="lg" />
      </div>
    </div>
  );

  const navItems = [
    { id: 'dzis', icon: Sun, label: 'Dziś' },
    { id: 'tydzien', icon: Calendar, label: 'Tydzień' },
    { id: 'historia', icon: Sparkles, label: 'Kronika' },
  ];

  const weeklyReviewNudge = new Date().getDay() === 0 && !s.taskReviewDoneThisWeek && (
    <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <h4 className="text-sm font-black text-primary uppercase tracking-wider">Tygodniowy Przegląd Zadań</h4>
        <p className="text-xs text-text-secondary mt-0.5 break-words">Niedziela to czas na oczyszczenie skrzynki i audyt projektów.</p>
      </div>
      <Pressable onClick={() => s.setShowWeeklyReview(true)} className="shrink-0 px-3.5 py-2 bg-primary hover:bg-primary-hover text-on-accent rounded-xl text-xs font-black transition-colors btn-press shadow-sm">
        Rozpocznij
      </Pressable>
    </div>
  );

  const showLock = !s.todayWin;
  return (
    <DashboardContext.Provider value={s}>
      <div className="min-h-screen bg-background text-text-primary selection:bg-primary/10 font-sans transition-colors duration-[var(--motion-slow)]">
        <div className="mx-auto flex min-h-screen w-full max-w-md lg:max-w-4xl flex-col overflow-x-hidden border-x border-border-custom bg-background shadow-sm" style={{ paddingBottom: showLock ? 'var(--dashboard-padding-locked)' : 'var(--dashboard-padding-navigation)' }}>
          <DashboardHeader
            userId={userId}
            unreadCount={s.pendingActionCount}
            onAvatarLongPress={() => s.setActionCenterOpen(true)}
            onAvatarClick={() => s.navigate('/fundament')}
            theme={s.theme}
            toggleTheme={s.toggleTheme}
            showLock={showLock}
            view={s.view}
            onShortcutClick={dest => s.navigate('/' + dest)}
            onSearchClick={() => s.setShowSearch(true)}
            staleNoteCount={s.staleNoteCount}
            handleLogoPressStart={s.handleLogoPressStart}
            handleLogoPressEnd={s.handleLogoPressEnd}
          />

          <main
            className="flex-1 overflow-y-auto touch-pan-y"
            onTouchStart={showLock ? undefined : s.handleMainTouchStart}
            onTouchMove={showLock ? undefined : s.handleMainTouchMove}
            onTouchEnd={showLock ? undefined : s.handleMainTouchEnd}
            onTouchCancel={showLock ? undefined : s.handleMainTouchCancel}
          >
            {showLock ? (
              <div className="p-5 pb-8 space-y-7 overflow-y-auto h-full">
                <OrientationFooter />
                {weeklyReviewNudge}
                <PowerList
                  todayWin={s.todayWin}
                  onUpdate={(data) => {
                    if (session?.user?.id && data && 'id' in data) {
                      queryClient.setQueryData(dashboardKeys.main(session.user.id), (old: unknown) => {
                        if (!old || typeof old !== 'object') return old;
                        return { ...(old as Record<string, unknown>), todayWin: data };
                      });
                    } else {
                      void s.refresh();
                    }
                  }}
                  planDaySignal={s.planDaySignal}
                />
                <FoodQuickCapture
                  refreshSignal={s.nutritionKey}
                  onSaved={() => { s.refresh(); s.setNutritionKey(k => k + 1); }}
                />
                {s.todayWin && isAfter20() && (
                  <Pressable onClick={() => s.setShowShutdown(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm font-black uppercase tracking-wider text-primary hover:bg-primary/20 active:scale-95 ui-interactive shadow-sm mt-4">
                    Domknij Dzień (Rytuał Wieczorny)
                  </Pressable>
                )}
              </div>
            ) : (
              <>
                <ErrorBoundary>
                  <div className={s.view === 'dzis' ? 'tab-panel tab-panel--active' : 'tab-panel'}>
                    {visitedTabs.includes('dzis') && <DashboardDzisTab />}
                  </div>
                </ErrorBoundary>
                <ErrorBoundary>
                  <div className={s.view === 'tydzien' ? 'tab-panel tab-panel--active' : 'tab-panel'}>
                    {visitedTabs.includes('tydzien') && (
                      <DashboardTydzienTab
                        weeklyCalories={s.weeklyCalories}
                        nutritionKey={s.nutritionKey}
                        onOpenActionCenter={handleOpenActionCenter}
                      />
                    )}
                  </div>
                </ErrorBoundary>
                <ErrorBoundary>
                  <div className={s.view === 'historia' ? 'tab-panel tab-panel--active' : 'tab-panel'}>
                    {visitedTabs.includes('historia') && <DashboardHistoriaTab />}
                  </div>
                </ErrorBoundary>
                <ErrorBoundary>
                  <div className={s.view === 'projekty' ? 'tab-panel tab-panel--active' : 'tab-panel'}>
                    {visitedTabs.includes('projekty') && <DashboardProjektyTab />}
                  </div>
                </ErrorBoundary>
              </>
            )}
          </main>
        </div>

        <DashboardFastCaptureMenu
          show={!showLock && s.showFastCapture}
          onClose={() => s.setShowFastCapture(false)}
          items={fastCaptureItems}
          tools={workspaceTools}
          userId={userId}
          onRefresh={s.refresh}
        />
        <DashboardNavBar
          view={s.view}
          navigateTo={s.navigateTo}
          urgentTodoCount={s.urgentTodoCount}
          navItems={navItems}
          tabOrder={TAB_ORDER}
          fastCaptureActive={s.showFastCapture}
          onFastCaptureToggle={() => s.setShowFastCapture(v => !v)}
          hidden={showLock}
        />

        <DashboardModals
          showMorningPlan={s.showMorningPlan} setShowMorningPlan={s.setShowMorningPlan}
          morningPlanTargetDate={s.morningPlanTargetDate} setMorningPlanTargetDate={s.setMorningPlanTargetDate}
          showShutdown={s.showShutdown} setShowShutdown={s.setShowShutdown}
          userId={userId}
          gapLastLoggedDate={s.gapLastLoggedDate} setGapLastLoggedDate={s.setGapLastLoggedDate}
          showWeeklyReview={s.showWeeklyReview} setShowWeeklyReview={s.setShowWeeklyReview}
          setTaskReviewDoneThisWeek={s.setTaskReviewDoneThisWeek}
          showQuickFoodEntry={s.showQuickFoodEntry} setShowQuickFoodEntry={s.setShowQuickFoodEntry}
          foodEditEntry={s.foodEditEntry} setFoodEditEntry={s.setFoodEditEntry}
          actionCenterOpen={s.actionCenterOpen} setActionCenterOpen={s.setActionCenterOpen}
          reloadPendingActions={s.reloadPendingActions}
          refresh={s.refresh} setNutritionKey={s.setNutritionKey}
        />

        {s.showSearch && <SearchModal onClose={() => s.setShowSearch(false)} />}
      </div>
    </DashboardContext.Provider>
  );
}

export default function Dashboard() {
  const session = useSession();
  if (!session) return null;
  return <DashboardContent />;
}
