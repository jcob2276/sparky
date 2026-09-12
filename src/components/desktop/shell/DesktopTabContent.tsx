import { Suspense, lazy } from 'react';
import type { Session } from '@supabase/supabase-js';
import Skeleton from '../../ui/Skeleton';
import DesktopHero, { type DesktopHeroProps } from '../hero/DesktopHero';
import CockpitAppsBar from '../hero/CockpitAppsBar';
import SmartAlerts from '../hero/SmartAlerts';
import ScoreboardPanel from '../fitness/ScoreboardPanel';
import GeneralView from '../general/GeneralView';
import DesktopBiometriaSection from './DesktopBiometriaSection';
import MarathonPanel from '../fitness/MarathonPanel';
import LeniePanelMini from '../health/LeniePanelMini';
import BehaviorCapturePanel from '../general/BehaviorCapturePanel';
import SupplementsPanel from '../health/SupplementsPanel';
import IntelligencePanel from '../general/IntelligencePanel';
import DesktopKierunekSection from './DesktopKierunekSection';
import DesktopTreningSection from '../fitness/DesktopTreningSection';
import DesktopWorkoutProgressPanel from '../fitness/DesktopWorkoutProgressPanel';
import DesktopSaunaSection from '../fitness/DesktopSaunaSection';
import DesktopBodyCompPanel from '../fitness/DesktopBodyCompPanel';
import DesktopKartotekaSection from '../health/DesktopKartotekaSection';
import DesktopOuraSleepCard from '../health/DesktopOuraSleepCard';
import DesktopOpticsCard from '../health/DesktopOpticsCard';
import DesktopCorrelationsSummary from '../intel/DesktopCorrelationsSummary';
import DesktopHealthspanSection from '../intel/DesktopHealthspanSection';
import type { DesktopTabType } from './DesktopQuickActionsBar';
import type { useDesktopData } from './useDesktopData';
import type { useHabitsData } from '../health/useHabitsData';
import type { useDreamsData } from '../vision/useDreamsData';

const SynthesisCommandCenter = lazy(() => import('../synthesis/SynthesisCommandCenterContainer'));

interface Props {
  activeTab: DesktopTabType;
  userId?: string;
  session: Session;
  theme: string;
  grid: string;
  tick: string;
  data: ReturnType<typeof useDesktopData>;
  habitsData: ReturnType<typeof useHabitsData>;
  dreamsData: ReturnType<typeof useDreamsData>;
  heroProps: DesktopHeroProps;
  alerts: Parameters<typeof SmartAlerts>[0]['alerts'];
  sleepData: { d: string; Sen: number | null; HRV: number | null }[];
  nutrData: { d: string; Kcal: number; Białko: number }[];
  volData: { week: string; vol: number }[];
  refresh: () => void;
  onOpenSauna?: () => void;
  onOpenWorkout?: () => void;
  onOpenWeight?: () => void;
  onOpenOptics?: () => void;
}

function renderCockpitTab(
  heroProps: DesktopHeroProps,
  renderSynthesis: () => React.ReactNode,
  alerts: Parameters<typeof SmartAlerts>[0]['alerts'],
  userId: string | undefined,
  lenieLogs: ReturnType<typeof useDesktopData>['lenieLogs'],
) {
  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <CockpitAppsBar />
      <DesktopHero {...heroProps} />
      {renderSynthesis()}
      <SmartAlerts alerts={alerts} />
      <section id="scoreboard" className="scroll-mt-28">
        <ScoreboardPanel userId={userId} />
      </section>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LeniePanelMini logs={lenieLogs} />
        {userId && <BehaviorCapturePanel userId={userId} />}
      </div>
    </div>
  );
}

function renderTrainingTab(
  treningEl: React.ReactNode,
  fitnessCards: React.ReactNode,
  sleepData: Props['sleepData'],
  volData: Props['volData'],
  nutrData: Props['nutrData'],
  grid: string,
  tick: string,
  strava: ReturnType<typeof useDesktopData>['strava'],
  marathon: ReturnType<typeof useDesktopData>['marathon'],
) {
  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {treningEl}
      {fitnessCards}
      <DesktopBiometriaSection sleepData={sleepData} volData={volData} nutrData={nutrData} grid={grid} tick={tick} />
      <MarathonPanel strava={strava} grid={grid} tick={tick} marathon={marathon} />
    </div>
  );
}

function renderHealthTab(
  kartotekaEl: React.ReactNode,
  healthCards: React.ReactNode,
  userId: string | undefined,
  sleepData: Props['sleepData'],
  volData: Props['volData'],
  nutrData: Props['nutrData'],
  grid: string,
  tick: string,
) {
  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {kartotekaEl}
      {healthCards}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {userId && <BehaviorCapturePanel userId={userId} />}
        {userId && <SupplementsPanel userId={userId} />}
      </div>
      <DesktopBiometriaSection sleepData={sleepData} volData={volData} nutrData={nutrData} grid={grid} tick={tick} />
    </div>
  );
}

function renderIntelTab(
  intelCards: React.ReactNode,
  userId: string | undefined,
  oura: ReturnType<typeof useDesktopData>['oura'],
  sessions: ReturnType<typeof useDesktopData>['sessions'],
  nutrition: ReturnType<typeof useDesktopData>['nutrition'],
  patterns: ReturnType<typeof useDesktopData>['patterns'],
  wiki: ReturnType<typeof useDesktopData>['wiki'],
  knowledge: ReturnType<typeof useDesktopData>['knowledge'],
) {
  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {intelCards}
      {userId && <GeneralView userId={userId} oura={oura} />}
      <IntelligencePanel oura={oura} sessions={sessions} nutrition={nutrition} patterns={patterns} wiki={wiki} knowledge={knowledge} />
    </div>
  );
}

export default function DesktopTabContent({
  activeTab,
  userId,
  session,
  theme,
  grid,
  tick,
  data,
  habitsData,
  dreamsData,
  heroProps,
  alerts,
  sleepData,
  nutrData,
  volData,
  refresh,
  onOpenSauna,
  onOpenWorkout,
  onOpenWeight,
  onOpenOptics,
}: Props) {
  const {
    oura,
    nutrition,
    sessions,
    body,
    heightCm,
    strava,
    patterns,
    wiki,
    knowledge,
    lenieLogs,
    marathon,
    personalTargets,
    projects,
    moves,
    goals,
    sprintGoals,
  } = data;

  const renderSynthesis = () => (
    userId ? (
      <Suspense fallback={<Skeleton className="h-80 rounded-2xl" />}>
        <SynthesisCommandCenter userId={userId} />
      </Suspense>
    ) : null
  );

  const treningEl = (
    <DesktopTreningSection
      sessions={sessions}
      strava={strava}
      oura={oura}
      nutrition={nutrition}
      habits={habitsData.habits}
      habitLogs={habitsData.habitLogs}
      volData={volData}
      body={body}
      heightCm={heightCm}
      theme={theme}
      grid={grid}
      personalTargets={personalTargets}
      session={session}
    />
  );

  const kierunekEl = (
    <DesktopKierunekSection
      userId={userId}
      theme={theme}
      grid={grid}
      refresh={refresh}
      lenieLogs={lenieLogs}
      habitsData={habitsData}
      dreamsData={dreamsData}
      projects={projects}
      moves={moves}
      goals={goals}
      sprintGoals={sprintGoals}
    />
  );

  const kartotekaEl = <DesktopKartotekaSection userId={userId} />;

  const fitnessCards = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <DesktopWorkoutProgressPanel sessions={sessions} onOpenWorkout={onOpenWorkout} />
      <DesktopSaunaSection sessions={sessions} strava={strava} onOpenSauna={onOpenSauna} />
      <DesktopBodyCompPanel body={body} heightCm={heightCm} onOpenWeight={onOpenWeight} />
    </div>
  );

  const healthCards = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {userId && <DesktopOuraSleepCard userId={userId} />}
      <DesktopOpticsCard onOpenOptics={onOpenOptics} />
    </div>
  );

  const intelCards = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {userId && <DesktopCorrelationsSummary userId={userId} />}
      {userId && <DesktopHealthspanSection userId={userId} />}
    </div>
  );

  if (activeTab === 'cockpit') {
    return renderCockpitTab(heroProps, renderSynthesis, alerts, userId, lenieLogs);
  }
  if (activeTab === 'training') {
    return renderTrainingTab(treningEl, fitnessCards, sleepData, volData, nutrData, grid, tick, strava, marathon);
  }
  if (activeTab === 'direction') {
    return <div className="space-y-5 animate-in fade-in duration-200">{kierunekEl}</div>;
  }
  if (activeTab === 'health') {
    return renderHealthTab(kartotekaEl, healthCards, userId, sleepData, volData, nutrData, grid, tick);
  }
  if (activeTab === 'intel') {
    return renderIntelTab(intelCards, userId, oura, sessions, nutrition, patterns, wiki, knowledge);
  }

  // activeTab === 'all'
  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <CockpitAppsBar />
      <DesktopHero {...heroProps} />
      {renderSynthesis()}
      <SmartAlerts alerts={alerts} />
      <section id="scoreboard" className="scroll-mt-28">
        <ScoreboardPanel userId={userId} />
      </section>
      {intelCards}
      {userId && <GeneralView userId={userId} oura={oura} />}
      {treningEl}
      {fitnessCards}
      <DesktopBiometriaSection sleepData={sleepData} volData={volData} nutrData={nutrData} grid={grid} tick={tick} />
      <MarathonPanel strava={strava} grid={grid} tick={tick} marathon={marathon} />
      {kartotekaEl}
      {healthCards}
      {kierunekEl}
      <IntelligencePanel oura={oura} sessions={sessions} nutrition={nutrition} patterns={patterns} wiki={wiki} knowledge={knowledge} />
    </div>
  );
}
