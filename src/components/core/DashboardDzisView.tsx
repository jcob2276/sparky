import { Suspense, type ReactNode } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import type { TodayLayout, TodaySectionId } from '../../lib/todayLayout';
import PowerList, { type PowerListProps } from '../lifestyle/PowerList';
import DailyStrainCard from '../biometrics/DailyStrainCard';
import { UrgentObligationsBanner } from '../terminy/UrgentObligationsBanner';
import { UpcomingObligationsStrip } from '../terminy/UpcomingObligationsStrip';
import Button from '../ui/Button';
import Sheet from '../ui/Sheet';
import Skeleton from '../ui/Skeleton';
import BodyMeasureBanner from './bodyMeasure/BodyMeasureBanner';
import DataStateNotice from './DataStateNotice';
import { DashboardGreeting } from './DashboardGreeting';
import DailySnapshotCard from './DailySnapshotCard';
import FoodQuickCapture from './nutrition/FoodQuickCapture';
import { ThreeSpheresGoalsCard } from './ThreeSpheresGoalsCard';
import TodayRunwayCard from './TodayRunwayCard';
import TodayVitalsHero from './TodayVitalsHero';
import WinsHistoryGrid from './WinsHistoryGrid';
import VisionHeroCard from './VisionHeroCard';
import { TodayLayoutEditor } from './TodayLayoutEditor';

export interface DashboardDzisViewProps {
  userId: string;
  layout: TodayLayout;
  layoutLoading: boolean;
  layoutError: boolean;
  saving: boolean;
  editing: boolean;
  onEdit: () => void;
  onCloseEditor: () => void;
  onSaveLayout: (value: TodayLayout) => Promise<unknown>;
  onRetryLayout: () => void;
  plan: PowerListProps;
  nutritionKey: number;
  workoutKey: number;
  onFoodSaved: () => void;
  onOpenTerminy: () => void;
  weeklyReviewDue: boolean;
  onOpenWeeklyReview: () => void;
}

function WeeklyReview({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[var(--radius-grouped)] border border-primary/20 bg-primary/10 p-4">
      <div className="min-w-0">
        <h4 className="text-sm font-semibold text-primary">Tygodniowy Przegląd Zadań</h4>
        <p className="mt-0.5 text-xs text-text-secondary">Niedziela to czas na oczyszczenie skrzynki i audyt projektów.</p>
      </div>
      <Button className="min-h-11 shrink-0" onClick={onOpen}>Rozpocznij</Button>
    </div>
  );
}

export function DashboardDzisView(props: DashboardDzisViewProps) {
  const sections: Record<TodaySectionId, ReactNode> = {
    vision: <VisionHeroCard />,
    goals: <ThreeSpheresGoalsCard />,
    plan: <div className="space-y-5">
      {props.weeklyReviewDue && <WeeklyReview onOpen={props.onOpenWeeklyReview} />}
      <PowerList {...props.plan} />
      <WinsHistoryGrid />
    </div>,
    recovery: <DailyStrainCard refreshSignal={props.nutritionKey + props.workoutKey} />,
    food: <FoodQuickCapture refreshSignal={props.nutritionKey} onSaved={props.onFoodSaved} />,
    agenda: <TodayRunwayCard />,
    snapshot: <DailySnapshotCard />,
  };
  const visible = props.layout.sections.filter(section => section.visible);
  return (
    <div className="min-h-full bg-background p-5 pb-32">
      <div className="mb-5 space-y-4">
        <DashboardGreeting />
        <TodayVitalsHero />
        <UrgentObligationsBanner userId={props.userId} onNavigateToTerminy={props.onOpenTerminy} />
        <UpcomingObligationsStrip userId={props.userId} onNavigateToTerminy={props.onOpenTerminy} />
        <BodyMeasureBanner userId={props.userId} />
        {props.layoutError && <div className="space-y-2">
          <DataStateNotice tone="warning" title="Nie udało się wczytać Twojego układu"
            detail="Pokazujemy ostatnio dostępny układ lub domyślny. Ponów odczyt przed edycją, aby nie nadpisać zapisanych ustawień." />
          <Button variant="outline" onClick={props.onRetryLayout}>Ponów odczyt układu</Button>
        </div>}
      </div>
      {props.layoutLoading ? <Skeleton variant="card" lines={5} /> : (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
          {visible.map(section => (
            <div key={section.id} data-today-section={section.id}
              id={section.id === 'food' ? 'meal-composer' : undefined}
              className={section.id === 'vision' || section.id === 'goals' ? 'lg:col-span-2' : ''}>
              <Suspense fallback={<Skeleton variant="card" lines={4} />}>{sections[section.id]}</Suspense>
            </div>
          ))}
          {visible.length === 0 && <p className="text-sm text-text-muted lg:col-span-2">
            Wszystkie sekcje są ukryte. Wybierz „Edytuj układ Dziś”, aby je przywrócić.
          </p>}
        </div>
      )}
      <div className="mt-5 flex justify-center">
        <Button variant="ghost" className="min-h-11" icon={<SlidersHorizontal size={16} />}
          disabled={props.layoutLoading || props.layoutError} onClick={props.onEdit}>Edytuj układ Dziś</Button>
      </div>
      <Sheet open={props.editing} onOpenChange={open => { if (!open && !props.saving) props.onCloseEditor(); }}
        title="Twój układ Dziś" side="bottom" compact>
        {props.editing && <TodayLayoutEditor layout={props.layout} saving={props.saving}
          onSave={props.onSaveLayout} onClose={props.onCloseEditor} />}
      </Sheet>
    </div>
  );
}
