import { useMemo } from 'react';
import { useSession } from '../../../store/useStore';
import { computeDayNutrientCoverage } from '../../../lib/health/nutrientCoverage';
import { computeDayEnergyRange } from '../../../lib/health/nutritionAudit';
import { useMealComposer } from './hooks/useMealComposer';
import { useMealPhotoUrls } from './hooks/useMealPhotoUrls';
import { useWeekBalance } from './hooks/useWeekBalance';
import { useDayReview } from './hooks/useDayReview';
import MealComposerView from './MealComposerView';

function sumDayMacros(entries: Array<{ carbs: number | null; fat: number | null }>) {
  return {
    carbs: entries.some((e) => e.carbs != null) ? entries.reduce((sum, e) => sum + (e.carbs ?? 0), 0) : null,
    fat: entries.some((e) => e.fat != null) ? entries.reduce((sum, e) => sum + (e.fat ?? 0), 0) : null,
  };
}

export default function MealComposer({ onSaved, refreshSignal = 0 }: { onSaved?: () => void; refreshSignal?: number }) {
  const session = useSession();
  const c = useMealComposer(onSaved, refreshSignal);
  const photoUrls = useMealPhotoUrls(session?.user.id, c.allTodayEntries);
  const nutrients = useMemo(() => computeDayNutrientCoverage(c.allTodayEntries), [c.allTodayEntries]);
  const energy = useMemo(() => computeDayEnergyRange(c.allTodayEntries), [c.allTodayEntries]);
  const macros = useMemo(() => sumDayMacros(c.allTodayEntries), [c.allTodayEntries]);
  const dayReview = useDayReview(session?.user.id, c.logDate);
  const week = useWeekBalance(session?.user.id, c.logDate, c.totals.calories, c.totals.targetKcal);
  if (!session) return null;
  return <MealComposerView c={c} photoUrls={photoUrls} nutrients={nutrients} energy={energy} macros={macros} dayReview={dayReview} week={week} onSaved={onSaved} />;
}
