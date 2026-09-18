import GeneralView from '../general/GeneralView';
import MarathonPanel from '../fitness/MarathonPanel';
import SupplementsPanel from '../health/SupplementsPanel';
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
import MultiDomainMatrix from '../intel/MultiDomainMatrix';
import type { DesktopTabType } from './DesktopQuickActionsBar';
import type { useDesktopData } from './useDesktopData';
import type { useHabitsData } from '../health/useHabitsData';
import type { useDreamsData } from '../vision/useDreamsData';

interface Props {
  activeTab: DesktopTabType;
  userId?: string;
  theme: string;
  grid: string;
  tick: string;
  data: ReturnType<typeof useDesktopData>;
  habitsData: ReturnType<typeof useHabitsData>;
  dreamsData: ReturnType<typeof useDreamsData>;
  volData: { week: string; vol: number }[];
  refresh: () => void;
  onTabChange?: (tab: DesktopTabType) => void;
  onOpenSauna?: () => void;
  onOpenWorkout?: () => void;
  onOpenWeight?: () => void;
  onOpenOptics?: () => void;
}

function renderTrainingTab(
  treningEl: React.ReactNode,
  disciplinesGrid: React.ReactNode,
  recoveryBodyGrid: React.ReactNode,
) {
  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {treningEl}
      {disciplinesGrid}
      {recoveryBodyGrid}
    </div>
  );
}

function renderHealthTab(
  kartotekaEl: React.ReactNode,
  healthCards: React.ReactNode,
  userId: string | undefined,
) {
  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {kartotekaEl}
      {healthCards}
      {userId && <SupplementsPanel userId={userId} />}
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
  theme,
  grid,
  tick,
  data,
  habitsData,
  dreamsData,
  volData,
  refresh,
  onTabChange,
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
    lenieLogs,
    phoneUsage,
    marathon,
    strain,
    personalTargets,
    projects,
    moves,
    goals,
    sprintGoals,
  } = data;

  const handleOpenMatrix = () => {
    onTabChange?.('intel');
    setTimeout(() => {
      document.getElementById('multi-domain-matrix')?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  };

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
      onOpenMatrix={handleOpenMatrix}
      lenieLogs={lenieLogs}
      phoneUsage={phoneUsage}
      strain={strain}
      marathon={marathon}
    />
  );

  const _kierunekEl = (
    <DesktopKierunekSection
      userId={userId}
      theme={theme}
      grid={grid}
      refresh={refresh}
      habitsData={habitsData}
      dreamsData={dreamsData}
      projects={projects}
      moves={moves}
      goals={goals}
      sprintGoals={sprintGoals}
    />
  );

  const kartotekaEl = <DesktopKartotekaSection userId={userId} />;

  const disciplinesGrid = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <DesktopWorkoutProgressPanel sessions={sessions} strava={strava} onOpenWorkout={onOpenWorkout} />
      <MarathonPanel strava={strava} grid={grid} tick={tick} marathon={marathon} />
    </div>
  );

  const recoveryBodyGrid = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <DesktopSaunaSection sessions={sessions} strava={strava} onOpenSauna={onOpenSauna} />
      <DesktopBodyCompPanel body={body} heightCm={heightCm} onOpenWeight={onOpenWeight} />
    </div>
  );

  const healthCards = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {userId && <DesktopHealthspanSection userId={userId} />}
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
    return renderTrainingTab(treningEl, disciplinesGrid, recoveryBodyGrid);
  }
  if (activeTab === 'health') {
    return renderHealthTab(kartotekaEl, healthCards, userId);
  }
  if (activeTab === 'intel') {
    return renderIntelTab(intelCards, userId, oura, matrixEl);
  }

  return renderTrainingTab(treningEl, disciplinesGrid, recoveryBodyGrid);
}
