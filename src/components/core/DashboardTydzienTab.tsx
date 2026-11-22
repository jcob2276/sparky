/**
 * @component DashboardTydzienTab
 * @role Zakładka TYDZIEŃ — Direction (review/KPI/sprint) + NutritionCard.
 * @usedBy Dashboard
 */
import { Suspense, memo, useState } from 'react';
import { useSession } from '../../store/useStore';
import Skeleton from '../ui/Skeleton';
import Button from '../ui/Button';
import { SlidersHorizontal, Activity, Apple, Compass } from 'lucide-react';
import HorizonHeader from './HorizonHeader';
import WeeklyWinsMap from './WeeklyWinsMap';
import WeeklyComparePulse from './WeeklyComparePulse';
import WeeklySalesPulse from './WeeklySalesPulse';
import WeeklyPatternCard from './WeeklyPatternCard';
import WeeklyNutritionPulse from './WeeklyNutritionPulse';
import FoodIntegrityCard from './nutrition/FoodIntegrityCard';
import WeeklyBodyPulse from './WeeklyBodyPulse';
import WeeklyFatGoalCard from './WeeklyFatGoalCard';
import Direction from '../lifestyle/Direction';

import { getTodayWarsaw } from '../../lib/date';
import { getWeekStartWarsaw, formatWeekRange } from '../../lib/growth/growth';

function ViewFallback() {
  return (
    <Skeleton variant="block" className="min-h-[var(--ds-h-220px)]" />
  );
}

interface Props {
  weeklyCalories: number;
  nutritionKey: number;
  onOpenActionCenter: () => void;
}

type WeekSubTab = 'rhythm' | 'body' | 'direction';

export const DashboardTydzienTab = memo(function DashboardTydzienTab({ weeklyCalories, nutritionKey, onOpenActionCenter }: Props) {
  const session = useSession();
  const [subTab, setSubTab] = useState<WeekSubTab>('rhythm');

  if (!session) return null;

  const today = getTodayWarsaw();
  const weekStart = getWeekStartWarsaw(today);
  const weekRange = formatWeekRange(weekStart);

  return (
    <div className="min-h-full bg-background px-3.5 py-4 pb-36 sm:px-5">
      <div className="mx-auto max-w-xl space-y-4">
        
        {/* Nagłówek Tygodnia */}
        <HorizonHeader
          eyebrow="Reguluję"
          title="Tydzień"
          icon={SlidersHorizontal}
          badge={
            <span className="rounded-full border border-border px-3 py-0.5 text-2xs font-bold tracking-wide text-text-primary bg-surface-2">
              {weekRange}
            </span>
          }
        />

        {/* Hero: 7 Dni w rytmie (WeeklyWinsMap zawsze na górze jako kotwica) */}
        <WeeklyWinsMap />

        {/* Pigułkowy przełącznik sfer — usuwa zamęt i rozdziela 12 kloców na 3 czytelne widoki */}
        <div className="flex rounded-full bg-surface-2 p-1 border border-border" role="tablist" aria-label="Sekcje tygodnia">
          <Button
            variant="ghost"
            size="sm"
            role="tab"
            aria-selected={subTab === 'rhythm'}
            onClick={() => setSubTab('rhythm')}
            className={`flex-1 min-h-9 rounded-full text-xs font-bold transition-all ${
              subTab === 'rhythm'
                ? 'bg-surface text-text-primary shadow-xs'
                : 'text-text-muted hover:text-text-primary'
            }`}
            icon={<Activity size={14} />}
          >
            Trendy & Rytm
          </Button>

          <Button
            variant="ghost"
            size="sm"
            role="tab"
            aria-selected={subTab === 'body'}
            onClick={() => setSubTab('body')}
            className={`flex-1 min-h-9 rounded-full text-xs font-bold transition-all ${
              subTab === 'body'
                ? 'bg-surface text-text-primary shadow-xs'
                : 'text-text-muted hover:text-text-primary'
            }`}
            icon={<Apple size={14} />}
          >
            Ciało & Paliwo
          </Button>

          <Button
            variant="ghost"
            size="sm"
            role="tab"
            aria-selected={subTab === 'direction'}
            onClick={() => setSubTab('direction')}
            className={`flex-1 min-h-9 rounded-full text-xs font-bold transition-all ${
              subTab === 'direction'
                ? 'bg-surface text-text-primary shadow-xs'
                : 'text-text-muted hover:text-text-primary'
            }`}
            icon={<Compass size={14} />}
          >
            Kierunek & Cele
          </Button>
        </div>

        {/* Zawartość wybranej sfery */}
        <div className="space-y-4 pt-1">
          {subTab === 'rhythm' && (
            <div className="space-y-4 animate-fadeIn">
              <WeeklyComparePulse />
              <WeeklySalesPulse />
              <WeeklyPatternCard />
            </div>
          )}

          {subTab === 'body' && (
            <div className="space-y-4 animate-fadeIn">
              <WeeklyNutritionPulse weeklyCalories={weeklyCalories} refreshSignal={nutritionKey} />
              <FoodIntegrityCard />
              <WeeklyBodyPulse />
              <WeeklyFatGoalCard />
            </div>
          )}

          {subTab === 'direction' && (
            <div className="space-y-4 animate-fadeIn">
              <Suspense fallback={<ViewFallback />}>
                <Direction onOpenActionCenter={onOpenActionCenter} />
              </Suspense>
            </div>
          )}
        </div>

      </div>
    </div>
  );
});
