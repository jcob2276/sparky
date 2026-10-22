import GeneralView from '../general/GeneralView';
import MarathonPanel from '../fitness/MarathonPanel';
import DesktopTreningSection from '../fitness/DesktopTreningSection';
import DesktopSaunaSection from '../fitness/DesktopSaunaSection';
import DesktopPhoneTile from '../fitness/DesktopPhoneTile';
import LeniePanelMini from '../health/LeniePanelMini';
import DesktopKartotekaSection from '../health/DesktopKartotekaSection';
import DesktopOuraSleepCard from '../health/DesktopOuraSleepCard';
import DesktopOpticsCard from '../health/DesktopOpticsCard';
import DesktopCorrelationsSummary from '../intel/DesktopCorrelationsSummary';
import MultiDomainMatrix from '../intel/MultiDomainMatrix';
import type { DesktopTabType } from './DesktopQuickActionsBar';
import type { useDesktopData } from './useDesktopData';
import type { useHabitsData } from '../health/useHabitsData';

interface Props {
  activeTab: DesktopTabType;
  userId?: string;
  grid: string;
  tick: string;
  data: ReturnType<typeof useDesktopData>;
  habitsData: ReturnType<typeof useHabitsData>;
  onOpenSauna?: () => void;
  onOpenOptics?: () => void;
}

function renderTrainingTab(
  treningEl: React.ReactNode,
  runningEl: React.ReactNode,
  saunaEl: React.ReactNode,
) {
  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {treningEl}
      {runningEl}
      {saunaEl}
    </div>
  );
}

function renderHealthTab(
  kartotekaEl: React.ReactNode,
  healthCards: React.ReactNode,
  habitsEl: React.ReactNode,
) {
  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {kartotekaEl}
      {healthCards}
      {habitsEl}
    </div>
  );
}

function renderIntelTab(
  intelCards: React.ReactNode,
  userId: string | undefined,
  oura: ReturnType<typeof useDesktopData>['oura'],
  matrixEl?: React.ReactNode,
) {
  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {matrixEl}
      {intelCards}
      {userId && <GeneralView userId={userId} oura={oura} />}
    </div>
  );
}

export default function DesktopTabContent({
  activeTab,
  userId,
  grid,
  tick,
  data,
  habitsData,
  onOpenSauna,
  onOpenOptics,
}: Props) {
  const {
    oura,
    sessions,
    strava,
    lenieLogs,
    phoneUsage,
    marathon,
    personalTargets,
  } = data;

  const matrixEl = (
    <MultiDomainMatrix
      userId={userId}
      sessions={sessions}
      strava={strava}
      lenieLogs={lenieLogs}
      habits={habitsData.habits}
      proteinFloorG={personalTargets?.proteinFloorG}
    />
  );

  const treningEl = <DesktopTreningSection strava={strava} />;

  const kartotekaEl = <DesktopKartotekaSection userId={userId} />;

  const runningEl = <MarathonPanel strava={strava} grid={grid} tick={tick} marathon={marathon} />;

  const saunaEl = <DesktopSaunaSection sessions={sessions} strava={strava} onOpenSauna={onOpenSauna} />;

  const habitsEl = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <DesktopPhoneTile phoneUsage={phoneUsage} />
      <LeniePanelMini logs={lenieLogs} phoneUsage={phoneUsage} oura={oura} />
    </div>
  );

  const healthCards = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {userId && <DesktopOuraSleepCard userId={userId} />}
      <DesktopOpticsCard onOpenOptics={onOpenOptics} />
    </div>
  );

  const intelCards = (
    <div className="grid grid-cols-1 gap-4">
      {userId && <DesktopCorrelationsSummary userId={userId} />}
    </div>
  );

  if (activeTab === 'training') {
    return renderTrainingTab(treningEl, runningEl, saunaEl);
  }
  if (activeTab === 'health') {
    return renderHealthTab(kartotekaEl, healthCards, habitsEl);
  }
  if (activeTab === 'intel') {
    return renderIntelTab(intelCards, userId, oura, matrixEl);
  }

  return renderTrainingTab(treningEl, runningEl, saunaEl);
}
