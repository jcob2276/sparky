import { Pressable } from '../ui/ControlPrimitives';
import { TIMEZONE } from '../../lib/date';
import { Suspense } from 'react';
import { Play } from 'lucide-react';
import { useSession } from '../../store/useStore';
import OrientationFooter from './OrientationFooter';
import PowerList from '../lifestyle/PowerList';
import FoodQuickCapture from './nutrition/FoodQuickCapture';
import Spinner from '../ui/Spinner';
import { useDashboardContext } from './context/DashboardContext';
import HorizonHeader from './HorizonHeader';
import TodayStatusStrip from './TodayStatusStrip';

import DailyStrainCard from '../biometrics/DailyStrainCard';
import DailySnapshotCard from './DailySnapshotCard';
import TodayRunwayCard from './TodayRunwayCard';
import { UrgentObligationsBanner } from '../terminy/UrgentObligationsBanner';

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

export function DashboardDzisTab() {
  const session = useSession();
  const s = useDashboardContext();

  if (!session) return null;

  const weeklyReviewNudge = new Date().getDay() === 0 && !s.taskReviewDoneThisWeek && (
    <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <h4 className="text-sm font-black text-primary uppercase tracking-wider">Tygodniowy Przegląd Zadań</h4>
        <p className="text-xs text-text-secondary mt-0.5 break-words">Niedziela to czas na oczyszczenie skrzynki i audyt projektów.</p>
      </div>
      <Pressable onClick={() => s.setShowWeeklyReview(true)} className="shrink-0 px-3.5 py-2 bg-primary hover:bg-primary-hover text-on-accent rounded-xl text-xs font-black transition-colors btn-press shadow-sm">
        Rozpocznij
      </Pressable>
    </div>
  );

  return (
    <div className="min-h-full bg-background p-5 pb-8">
      <div className="mb-5 space-y-4">
        <HorizonHeader
          eyebrow="Sparky"
          title="Dzisiaj"
          description="Stan, najważniejszy ruch i najbliższa rzecz do zrobienia. Reszta systemu pracuje w tle."
          icon={Play}
        />
        <TodayStatusStrip />
        <UrgentObligationsBanner
          userId={session.user.id}
          onNavigateToTerminy={() => s.navigate('/terminy')}
        />
        {(() => {
          const m = new Date('2026-10-04T00:00:00');
          const d = Math.ceil((m.getTime() - new Date().getTime()) / 86400000);
          if (d < 0) return null;
          return (
            <div className="rounded-xl border border-border bg-surface-elevated p-4">
              <div className="text-xs font-black text-text-tertiary uppercase tracking-wider">Cel: Maraton w Koszycach (4.10)</div>
              <div className="text-base font-semibold text-text-primary mt-0.5">Zostało {d} dni ({Math.floor(d/7)} tyg. {d%7} dni)</div>
            </div>
          );
        })()}
        <OrientationFooter />
      </div>
      <div className="lg:grid lg:grid-cols-2 lg:gap-5 space-y-5 lg:space-y-0">
        {/* Lewa kolumna: Planowanie, zadania i szybki Posiłek */}
        <div className="space-y-5">
          {weeklyReviewNudge}
          <PowerList session={session} todayWin={s.todayWin} onUpdate={s.refresh} planDaySignal={s.planDaySignal} />
          <FoodQuickCapture
            refreshSignal={s.nutritionKey}
            onSaved={() => { s.refresh(); s.setNutritionKey(k => k + 1); }}
            onOpenFullModal={() => s.setShowQuickFoodEntry(true)}
          />
          <Suspense fallback={null}>
            <TodayRunwayCard />
          </Suspense>
          {s.todayWin && isAfter20() && (
            <Pressable
              onClick={() => s.setShowShutdown(true)}
              variant="tonal"
              size="lg"
              className="w-full !text-primary dark:!text-primary !border-primary/20 !bg-primary/5 hover:!bg-primary/10 text-xs font-black uppercase tracking-wider shadow-sm"
            >
              Domknij Dzień (Rytuał Wieczorny)
            </Pressable>
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
}

