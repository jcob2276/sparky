import { Suspense, lazy } from 'react';
import type { Session } from '@supabase/supabase-js';
import Skeleton from '../../ui/Skeleton';
import { Panel } from './Panel';
import DesktopHero from '../hero/DesktopHero';
import SmartAlerts from '../hero/SmartAlerts';
import ScoreboardPanel from '../fitness/ScoreboardPanel';
import GeneralView from '../general/GeneralView';
import Heatmap from '../fitness/Heatmap';
import FitnessScorePanel from '../fitness/FitnessScorePanel';
import DesktopBiometriaSection from './DesktopBiometriaSection';
import MarathonPanel from '../fitness/MarathonPanel';
import LeniePanelMini from '../health/LeniePanelMini';
import BehaviorCapturePanel from '../general/BehaviorCapturePanel';
import SupplementsPanel from '../health/SupplementsPanel';
import IntelligencePanel from '../general/IntelligencePanel';
import DesktopKierunekSection from './DesktopKierunekSection';
import type { DesktopTabType } from './DesktopQuickActionsBar';
import type { DesktopHeroProps } from '../hero/DesktopHero';
import type { useDesktopData } from './useDesktopData';
import type { useHabitsData } from '../health/useHabitsData';
import type { useDreamsData } from '../vision/useDreamsData';

const MuscleHeatmap = lazy(() => import('../../biometrics/MuscleHeatmap'));
const MedicalDesktopTeaser = lazy(() => import('../../medical/MedicalDesktopTeaser'));
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
}

function TreningSection({
  sessions, strava, oura, nutrition, habits, habitLogs, volData, body, heightCm, theme, grid, personalTargets, session,
}: {
  sessions: Props['data']['sessions'];
  strava: Props['data']['strava'];
  oura: Props['data']['oura'];
  nutrition: Props['data']['nutrition'];
  habits: Props['habitsData']['habits'];
  habitLogs: Props['habitsData']['habitLogs'];
  volData: Props['volData'];
  body: Props['data']['body'];
  heightCm: Props['data']['heightCm'];
  theme: string;
  grid: string;
  personalTargets: Props['data']['personalTargets'];
  session: Session;
}) {
  return (
    <section id="trening" className="scroll-mt-28 space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border-custom" />
        <span className="pixel-label">Trening</span>
        <div className="h-px flex-1 bg-border-custom" />
      </div>
      <div className="space-y-5">
        <Panel title="Konsekwencja treningowa — 13 tygodni">
          <Heatmap sessions={sessions} strava={strava} />
        </Panel>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
          <FitnessScorePanel
            oura={oura}
            nutrition={nutrition}
            sessions={sessions}
            strava={strava}
            habits={habits}
            habitLogs={habitLogs}
            volData={volData}
            body={body}
            heightCm={heightCm}
            theme={theme}
            grid={grid}
            personalTargets={personalTargets}
          />
          <Suspense fallback={<Skeleton variant="card" className="h-[var(--ds-h-450px)] rounded-[var(--radius-xl)]" />}>
            <MuscleHeatmap session={session} />
          </Suspense>
        </div>
      </div>
    </section>
  );
}

function KartotekaSection({ userId }: { userId?: string }) {
  return (
    <section id="badania" className="scroll-mt-28 space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border-custom" />
        <span className="pixel-label">Kartoteka & Zdrowie</span>
        <div className="h-px flex-1 bg-border-custom" />
      </div>
      {userId && (
        <Suspense fallback={<Skeleton variant="card" className="h-32 rounded-[var(--radius-xl)]" />}>
          <MedicalDesktopTeaser userId={userId} />
        </Suspense>
      )}
    </section>
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
}: Props) {
  const { oura, nutrition, sessions, body, heightCm, strava, patterns, wiki, knowledge, lenieLogs, marathon, personalTargets } = data;

  const renderSynthesis = () => (
    userId ? (
      <Suspense fallback={<Skeleton className="h-80 rounded-2xl" />}>
        <SynthesisCommandCenter userId={userId} />
      </Suspense>
    ) : null
  );

  const treningEl = (
    <TreningSection
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
    />
  );

  const kartotekaEl = <KartotekaSection userId={userId} />;

  if (activeTab === 'cockpit') {
    return (
      <div className="space-y-5 animate-in fade-in duration-200">
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

  if (activeTab === 'training') {
    return (
      <div className="space-y-5 animate-in fade-in duration-200">
        {treningEl}
        <DesktopBiometriaSection sleepData={sleepData} volData={volData} nutrData={nutrData} grid={grid} tick={tick} />
        <MarathonPanel strava={strava} grid={grid} tick={tick} marathon={marathon} />
      </div>
    );
  }

  if (activeTab === 'direction') {
    return <div className="space-y-5 animate-in fade-in duration-200">{kierunekEl}</div>;
  }

  if (activeTab === 'health') {
    return (
      <div className="space-y-5 animate-in fade-in duration-200">
        {kartotekaEl}
        <DesktopBiometriaSection sleepData={sleepData} volData={volData} nutrData={nutrData} grid={grid} tick={tick} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {userId && <BehaviorCapturePanel userId={userId} />}
          {userId && <SupplementsPanel userId={userId} />}
        </div>
      </div>
    );
  }

  if (activeTab === 'intel') {
    return (
      <div className="space-y-5 animate-in fade-in duration-200">
        {userId && <GeneralView userId={userId} oura={oura} />}
        <IntelligencePanel oura={oura} sessions={sessions} nutrition={nutrition} patterns={patterns} wiki={wiki} knowledge={knowledge} />
      </div>
    );
  }

  // activeTab === 'all'
  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <DesktopHero {...heroProps} />
      {renderSynthesis()}
      <SmartAlerts alerts={alerts} />
      <section id="scoreboard" className="scroll-mt-28">
        <ScoreboardPanel userId={userId} />
      </section>
      {userId && <GeneralView userId={userId} oura={oura} />}
      {treningEl}
      <DesktopBiometriaSection sleepData={sleepData} volData={volData} nutrData={nutrData} grid={grid} tick={tick} />
      <MarathonPanel strava={strava} grid={grid} tick={tick} marathon={marathon} />
      {kartotekaEl}
      {kierunekEl}
      <IntelligencePanel oura={oura} sessions={sessions} nutrition={nutrition} patterns={patterns} wiki={wiki} knowledge={knowledge} />
    </div>
  );
}
