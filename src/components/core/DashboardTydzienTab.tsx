/**
 * @component DashboardTydzienTab
 * @role Zakładka TYDZIEŃ — Direction (review/KPI/sprint) + NutritionCard.
 * @usedBy Dashboard
 */
import { Suspense, memo } from 'react';
import { useSession } from '../../store/useStore';
import Spinner from '../ui/Spinner';
import { SlidersHorizontal } from 'lucide-react';
import HorizonHeader from './HorizonHeader';
import WeeklyPulseDiagnostic from './WeeklyPulseDiagnostic';
import { WeeklySpheresOverviewCard } from './WeeklySpheresOverviewCard';
import { WeeklyPulseHub } from './WeeklyPulseHub';

import Direction from '../lifestyle/Direction';

import { getTodayWarsaw } from '../../lib/date';
import { getWeekStartWarsaw, formatWeekRange } from '../../lib/growth/growth';

function ViewFallback() {
  return (
    <div className="flex min-h-[var(--ds-h-220px)] items-center justify-center rounded-lg border border-on-accent/[0.06] bg-on-accent/[0.02]">
      <Spinner size="md" />
    </div>
  );
}

interface Props {
  weeklyCalories: number;
  nutritionKey: number;
  onOpenActionCenter: () => void;
}

export const DashboardTydzienTab = memo(function DashboardTydzienTab({ weeklyCalories, nutritionKey, onOpenActionCenter }: Props) {
  const session = useSession();
  if (!session) return null;

  const today = getTodayWarsaw();
  const weekStart = getWeekStartWarsaw(today);
  const weekRange = formatWeekRange(weekStart);

  return (
    <div className="p-5 pb-8">
      <div className="mb-5 space-y-4">
        <HorizonHeader
          eyebrow="Reguluję"
          title="Tydzień"
          icon={SlidersHorizontal}
          badge={
            <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-primary">
              {weekRange}
            </span>
          }
        />
        <WeeklyPulseDiagnostic />
        <WeeklySpheresOverviewCard />
        <WeeklyPulseHub weeklyCalories={weeklyCalories} refreshSignal={nutritionKey} />
      </div>
      <Suspense fallback={<ViewFallback />}>
        <Direction onOpenActionCenter={onOpenActionCenter} />
      </Suspense>
    </div>
  );
});
