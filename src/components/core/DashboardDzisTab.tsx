import { Pressable } from '../ui/ControlPrimitives';

import { Suspense, memo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '../../store/useStore';
import PowerList from '../lifestyle/PowerList';
import FoodQuickCapture from './nutrition/FoodQuickCapture';
import Spinner from '../ui/Spinner';
import { useDashboardContext } from './context/DashboardContext';
import { dashboardKeys } from '../../lib/queryKeys';
import DailyStrainCard from '../biometrics/DailyStrainCard';
import DailySnapshotCard from './DailySnapshotCard';
import TodayRunwayCard from './TodayRunwayCard';
import { UrgentObligationsBanner } from '../terminy/UrgentObligationsBanner';
import { ThreeSpheresGoalsCard } from './ThreeSpheresGoalsCard';
import VisionHeroCard from './VisionHeroCard';

function ViewFallback() {
  return (
    <div className="flex min-h-[var(--ds-h-220px)] items-center justify-center rounded-lg border border-on-accent/[0.06] bg-on-accent/[0.02]">
      <Spinner size="md" />
    </div>
  );
}

export const DashboardDzisTab = memo(function DashboardDzisTab() {
  const session = useSession();
  const s = useDashboardContext();
  const queryClient = useQueryClient();

  if (!session) return null;

  const weeklyReviewNudge = new Date().getDay() === 0 && !s.taskReviewDoneThisWeek && (
    <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 flex items-center justify-between gap-4 shadow-2xs">
      <div className="min-w-0">
        <h4 className="text-sm font-black text-primary uppercase tracking-wider">Tygodniowy Przegląd Zadań</h4>
        <p className="text-xs text-text-secondary mt-0.5 break-words">Niedziela to czas na oczyszczenie skrzynki i audyt projektów.</p>
      </div>
      <Pressable onClick={() => s.setShowWeeklyReview(true)} className="shrink-0 px-3.5 py-2 bg-primary hover:bg-primary-hover text-on-accent rounded-xl text-xs font-black ui-interactive active:scale-95 shadow-sm cursor-pointer">
        Rozpocznij
      </Pressable>
    </div>
  );

  return (
    <div className="min-h-full bg-background p-5 pb-32">
      <div className="mb-5 space-y-4">
        <VisionHeroCard />

        <ThreeSpheresGoalsCard />

        <UrgentObligationsBanner
          userId={session.user.id}
          onNavigateToTerminy={() => s.navigate('/terminy')}
        />
      </div>
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-2">
        {/* Na telefonie kolumny się „rozpuszczają” (contents) i kolejność daje order-*: Stan dnia (Strain) zaraz po Power List. */}
        {/* Lewa kolumna: Planowanie, zadania i szybki Posiłek */}
        <div className="contents lg:block lg:space-y-5">
          <div className="order-1 space-y-5 lg:order-none">
          {weeklyReviewNudge}
          <PowerList
            todayWin={s.todayWin}
            onUpdate={(data) => {
              if (data && 'id' in data) {
                queryClient.setQueryData(dashboardKeys.main(session.user.id), (old: unknown) => {
                  if (!old || typeof old !== 'object') return old;
                  return { ...(old as Record<string, unknown>), todayWin: data };
                });
              } else {
                void s.refresh();
              }
            }}
            planDaySignal={s.planDaySignal}
            onOpenShutdown={() => s.setShowShutdown(true)}
          />
          </div>
          <div id="meal-composer" className="order-3 lg:order-none">
            <FoodQuickCapture
              refreshSignal={s.nutritionKey}
              onSaved={() => { s.refresh(); s.setNutritionKey(k => k + 1); }}
            />
          </div>
          <div className="order-4 lg:order-none">
            <Suspense fallback={null}>
              <TodayRunwayCard />
            </Suspense>
          </div>
        </div>

        {/* Prawa kolumna: Telemetria, biometria i wykresy */}
        <div className="contents lg:block lg:space-y-5">
          <div className="order-2 lg:order-none">
            <Suspense fallback={<ViewFallback />}>
              <DailyStrainCard refreshSignal={s.nutritionKey + s.workoutKey} />
            </Suspense>
          </div>
          <div className="order-5 lg:order-none">
            <Suspense fallback={<ViewFallback />}>
              <DailySnapshotCard />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
});

