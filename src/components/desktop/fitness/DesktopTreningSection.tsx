import { Suspense, lazy } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Layers } from 'lucide-react';
import Skeleton from '../../ui/Skeleton';
import Button from '../../ui/Button';
import { Panel } from '../shell/Panel';
import Heatmap from './Heatmap';
import FitnessScorePanel from './FitnessScorePanel';
import LeniePanelMini from '../health/LeniePanelMini';
import DesktopTrainingRecoveryStatus from './DesktopTrainingRecoveryStatus';
import type { useDesktopData } from '../shell/useDesktopData';
import type { useHabitsData } from '../health/useHabitsData';

const MuscleHeatmap = lazy(() => import('../../biometrics/MuscleHeatmap'));

interface Props {
  sessions: ReturnType<typeof useDesktopData>['sessions'];
  strava: ReturnType<typeof useDesktopData>['strava'];
  oura: ReturnType<typeof useDesktopData>['oura'];
  nutrition: ReturnType<typeof useDesktopData>['nutrition'];
  habits: ReturnType<typeof useHabitsData>['habits'];
  habitLogs: ReturnType<typeof useHabitsData>['habitLogs'];
  volData: { week: string; vol: number }[];
  body: ReturnType<typeof useDesktopData>['body'];
  heightCm: ReturnType<typeof useDesktopData>['heightCm'];
  theme: string;
  grid: string;
  personalTargets: ReturnType<typeof useDesktopData>['personalTargets'];
  session: Session;
  onOpenMatrix?: () => void;
  lenieLogs?: ReturnType<typeof useDesktopData>['lenieLogs'];
  phoneUsage?: ReturnType<typeof useDesktopData>['phoneUsage'];
  strain?: ReturnType<typeof useDesktopData>['strain'];
  marathon?: ReturnType<typeof useDesktopData>['marathon'];
}

export default function DesktopTreningSection({
  sessions,
  strava,
  oura,
  nutrition,
  habits,
  habitLogs,
  volData,
  body,
  heightCm,
  theme,
  grid,
  personalTargets,
  session,
  onOpenMatrix,
  lenieLogs,
  phoneUsage,
  strain,
  marathon: _marathon,
}: Props) {
  return (
    <section id="trening" className="scroll-mt-28 space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border-custom" />
        <span className="pixel-label">Trening & Ciało</span>
        <div className="h-px flex-1 bg-border-custom" />
      </div>
      <div className="space-y-5">
        <DesktopTrainingRecoveryStatus
          oura={oura}
          strain={strain}
          strava={strava}
          phoneUsage={phoneUsage}
        />
        <LeniePanelMini logs={lenieLogs} phoneUsage={phoneUsage} oura={oura} />
        <Panel
          title="Konsekwencja treningowa — 13 tygodni"
          action={
            onOpenMatrix ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenMatrix}
                className="h-7 px-2 text-2xs font-semibold text-primary hover:text-primary/80"
              >
                <Layers size={13} className="mr-1" />
                <span>Otwórz Mapę Wielodomenową (Dieta + Sen + Incydenty) →</span>
              </Button>
            ) : undefined
          }
        >
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
            <MuscleHeatmap session={session} strava={strava} />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
