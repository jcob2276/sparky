/**
 * @component DesktopDashboard
 * @role Root wielokolumnowego cockpitu desktopowego (trasa /dashboard) — spina panele ze wszystkich
 *       domenowych folderów desktop/ oraz zarządza natychmiastowym szybkim logowaniem i nawigacją.
 * @usedBy App.tsx (trasa /dashboard)
 */
import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserId } from '../../../store/useStore';
import Button from '../../ui/Button';
import Spinner from '../../ui/Spinner';
import { startGoogleAuth } from '../../../hooks/useSyncActions';
import { useDesktopData } from './useDesktopData';
import { useHabitsData } from '../health/useHabitsData';
import { useDreamsData } from '../vision/useDreamsData';
import { useDesktopDashboardState } from './useDesktopDashboardState';
import DesktopHeader from './DesktopHeader';
import DesktopSectionNav from './DesktopSectionNav';
import DesktopQuickActionsBar from './DesktopQuickActionsBar';
import DesktopTabContent from './DesktopTabContent';
import DesktopQuickWeightModal from './DesktopQuickWeightModal';
import DesktopToolsLauncherModal from './DesktopToolsLauncherModal';
import DreamEditModal from '../vision/DreamEditModal';

const WorkoutLogger = lazy(() => import('../../biometrics/WorkoutLogger'));
const Fundament = lazy(() => import('../../core/Fundament'));
const SystemHealth = lazy(() => import('../health/SystemHealth'));
const SaunaLoggerModal = lazy(() => import('../../biometrics/SaunaLoggerModal'));

export default function DesktopDashboard() {
  const userId = useUserId() ?? '';
  const navigate = useNavigate();
  const desktopData = useDesktopData(userId);
  const { loading, oura, sessions, strain, refresh } = desktopData;

  const habitsData = useHabitsData({ userId });
  const dreamsData = useDreamsData({ userId, loading });

  const {
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
  } = useDesktopDashboardState({ userId, desktopData });

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


  return (
    <>
      <div className="min-h-screen bg-background text-text-primary transition-colors duration-[var(--motion-slow)] overflow-x-hidden">
        <DesktopHeader
          now={now} syncing={syncing}
          theme={theme} setTheme={setTheme} syncAll={syncAll}
          setShowHealth={setShowHealth} setShowFundament={setShowFundament}
          onOpenTools={() => setShowToolsModal(true)}
        />

        <main className="px-4 sm:px-8 py-4 sm:py-6 max-w-[var(--ds-maxw-1600px)] mx-auto w-full overflow-x-hidden">
          <div className="flex gap-8 items-start">
            <DesktopSectionNav
              activeTab={activeTab}
              onTabChange={setActiveTab}
              dailyStatus={strain?.daily_status || 'unknown'}
            />
            <div className="flex-1 min-w-0 flex flex-col gap-4">
              <DesktopQuickActionsBar
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />

              {loading && !oura.length && !sessions.length ? (
                <div className="flex min-h-[50vh] items-center justify-center">
                  <div className="relative h-16 w-16">
                    <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                    <Spinner size="lg" />
                  </div>
                </div>
              ) : (
                <DesktopTabContent
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  userId={userId}
                  theme={theme}
                  grid={grid}
                  tick={tick}
                  data={desktopData}
                  habitsData={habitsData}
                  dreamsData={dreamsData}
                  volData={volData}
                  refresh={refresh}
                  onOpenWorkout={openWorkout}
                  onOpenSauna={() => setShowSaunaModal(true)}
                  onOpenWeight={() => setShowWeightModal(true)}
                  onOpenOptics={() => navigate('/optics')}
                />
              )}
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

      {showSaunaModal && (
        <Suspense fallback={null}>
          <SaunaLoggerModal
            onBack={() => setShowSaunaModal(false)}
            onSaved={() => { setShowSaunaModal(false); refresh(); }}
          />
        </Suspense>
      )}
      {showWeightModal && (
        <DesktopQuickWeightModal isOpen={showWeightModal} onClose={() => setShowWeightModal(false)} userId={userId} currentWeight={currentWeight} onSaved={refresh} />
      )}
      <DesktopToolsLauncherModal isOpen={showToolsModal} onClose={() => setShowToolsModal(false)} />
    </>
  );
}
