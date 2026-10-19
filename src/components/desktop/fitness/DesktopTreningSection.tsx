import { Suspense, lazy } from 'react';
import { Layers } from 'lucide-react';
import Skeleton from '../../ui/Skeleton';
import Button from '../../ui/Button';
import { Panel } from '../shell/Panel';
import Heatmap from './Heatmap';
import LeniePanelMini from '../health/LeniePanelMini';
import DesktopTrainingRecoveryStatus from './DesktopTrainingRecoveryStatus';
import DailyStrainCard from '../../biometrics/DailyStrainCard';
import type { useDesktopData } from '../shell/useDesktopData';

const MuscleHeatmap = lazy(() => import('../../biometrics/MuscleHeatmap'));

interface Props {
  sessions: ReturnType<typeof useDesktopData>['sessions'];
  strava: ReturnType<typeof useDesktopData>['strava'];
  onOpenMatrix?: () => void;
  lenieLogs?: ReturnType<typeof useDesktopData>['lenieLogs'];
  phoneUsage?: ReturnType<typeof useDesktopData>['phoneUsage'];
  oura: ReturnType<typeof useDesktopData>['oura'];
}

/** Trening: najpierw werdykt dnia (ta sama karta co w Dziś), potem to, co faktycznie zrobiłeś. */
export default function DesktopTreningSection({ sessions, strava, onOpenMatrix, lenieLogs, phoneUsage, oura }: Props) {
  return (
    <section id="trening" className="scroll-mt-28 space-y-5">
      <DailyStrainCard />
      <DesktopTrainingRecoveryStatus strava={strava} phoneUsage={phoneUsage} />
      <LeniePanelMini logs={lenieLogs} phoneUsage={phoneUsage} oura={oura} />
      <Panel
        title="Konsekwencja treningowa · 13 tygodni"
        action={
          onOpenMatrix ? (
            <Button variant="ghost" size="sm" onClick={onOpenMatrix} className="h-7 px-2 text-2xs font-semibold text-primary hover:text-primary/80">
              <Layers size={13} className="mr-1" />
              <span>Korelacje →</span>
            </Button>
          ) : undefined
        }
      >
        <Heatmap sessions={sessions} strava={strava} />
      </Panel>
      <Suspense fallback={<Skeleton variant="card" className="h-[var(--ds-h-450px)] rounded-[var(--radius-xl)]" />}>
        <MuscleHeatmap strava={strava} />
      </Suspense>
    </section>
  );
}
