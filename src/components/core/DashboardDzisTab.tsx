import { Pressable } from '../ui/ControlPrimitives';
import { TIMEZONE } from '../../lib/date';
import { Suspense, memo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Moon } from 'lucide-react';
import { useSession } from '../../store/useStore';
import PowerList from '../lifestyle/PowerList';
import FoodQuickCapture from './nutrition/FoodQuickCapture';
import Spinner from '../ui/Spinner';
import { useDashboardContext } from './context/DashboardContext';
import { dashboardKeys } from '../../lib/queryKeys';
import TodayStatusStrip from './TodayStatusStrip';
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

function isAfter20(): boolean {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, hour: 'numeric', hour12: false });
    return parseInt(formatter.format(new Date()), 10) >= 20;
  } catch {
    return new Date().getHours() >= 20;
  }
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
        <TodayStatusStrip />

        <UrgentObligationsBanner
          userId={session.user.id}
          onNavigateToTerminy={() => s.navigate('/terminy')}
        />
      </div>
      <div className="lg:grid lg:grid-cols-2 lg:gap-5 space-y-5 lg:space-y-0">
        {/* Lewa kolumna: Planowanie, zadania i szybki Posiłek */}
        <div className="space-y-5">
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
          />
          <div id="meal-composer">
            <FoodQuickCapture
              refreshSignal={s.nutritionKey}
              onSaved={() => { s.refresh(); s.setNutritionKey(k => k + 1); }}
            />
          </div>
          <Suspense fallback={null}>
            <TodayRunwayCard />
          </Suspense>
          {s.todayWin && isAfter20() && (
            <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-surface-solid to-primary/5 p-4 shadow-sm backdrop-blur-xs">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/25">
                    <Moon size={18} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black uppercase tracking-wider text-primary">Rytuał Wieczorny</h4>
                    <p className="text-xs text-text-secondary mt-0.5 truncate">Czas na podsumowanie i domknięcie pętli dnia.</p>
                  </div>
                </div>
                <Pressable
                  onClick={() => s.setShowShutdown(true)}
                  className="shrink-0 rounded-xl bg-primary px-3.5 py-2 text-xs font-black text-on-accent ui-interactive hover:bg-primary-hover active:scale-95 shadow-xs cursor-pointer"
                >
                  Domknij
                </Pressable>
              </div>
            </div>
          )}
        </div>

        {/* Prawa kolumna: Telemetria, biometria i wykresy */}
        <div className="space-y-5">
          <Suspense fallback={<ViewFallback />}>
            <DailyStrainCard refreshSignal={s.nutritionKey + s.workoutKey} />
          </Suspense>
          <Suspense fallback={<ViewFallback />}>
            <DailySnapshotCard />
          </Suspense>
        </div>
      </div>
    </div>
  );
});

