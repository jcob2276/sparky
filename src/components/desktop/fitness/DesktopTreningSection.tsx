import { Suspense, lazy } from 'react';
import Skeleton from '../../ui/Skeleton';
import type { useDesktopData } from '../shell/useDesktopData';

const MuscleHeatmap = lazy(() => import('../../biometrics/MuscleHeatmap'));

interface Props {
  strava: ReturnType<typeof useDesktopData>['strava'];
}

/**
 * Trening w dashboardzie: tylko to, czego nie ma gdzie indziej (mapa mięśni).
 * Werdykt dnia jest w Dziś, a historia sesji, wagi i biegów w Kronice.
 */
export default function DesktopTreningSection({ strava }: Props) {
  return (
    <section id="trening" className="scroll-mt-28 space-y-5">
      <Suspense fallback={<Skeleton variant="card" className="h-[var(--ds-h-450px)] rounded-[var(--radius-xl)]" />}>
        <MuscleHeatmap strava={strava} />
      </Suspense>
    </section>
  );
}
