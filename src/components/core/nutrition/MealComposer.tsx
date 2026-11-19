import { useEffect, useEffectEvent, useMemo } from 'react';
import { useSession } from '../../../store/useStore';
import { computeDayNutrientCoverage } from '../../../lib/health/nutrientCoverage';
import { computeDayEnergyRange } from '../../../lib/health/nutritionAudit';
import { useMealComposer } from './hooks/useMealComposer';
import { useMealPhotoUrls } from './hooks/useMealPhotoUrls';
import { useWeekBalance } from './hooks/useWeekBalance';
import { pickMealPhotoNative } from '../../../lib/native/mealPhotoCapture';
import { isNativePlatform } from '../../../lib/native/platform';
import { notify } from '../../../lib/notify';
import MealComposerView from './MealComposerView';

function sumDayMacros(entries: Array<{ carbs: number | null; fat: number | null }>) {
  return {
    carbs: entries.some((e) => e.carbs != null) ? entries.reduce((sum, e) => sum + (e.carbs ?? 0), 0) : null,
    fat: entries.some((e) => e.fat != null) ? entries.reduce((sum, e) => sum + (e.fat ?? 0), 0) : null,
  };
}

export default function MealComposer({ onSaved, refreshSignal = 0, launchAction }: {
  onSaved?: () => void;
  refreshSignal?: number;
  launchAction?: 'aparat' | 'skaner';
}) {
  const session = useSession();
  const c = useMealComposer(onSaved, refreshSignal);
  const photoUrls = useMealPhotoUrls(session?.user.id, c.allTodayEntries);
  const nutrients = useMemo(() => computeDayNutrientCoverage(c.allTodayEntries), [c.allTodayEntries]);
  const energy = useMemo(() => computeDayEnergyRange(c.allTodayEntries), [c.allTodayEntries]);
  const macros = useMemo(() => sumDayMacros(c.allTodayEntries), [c.allTodayEntries]);
  const week = useWeekBalance(session?.user.id, c.logDate, c.totals.calories, c.totals.targetKcal);
  const openCapture = useEffectEvent(async (action: 'aparat' | 'skaner') => {
    if (action === 'skaner') {
      c.search.setScannerOpen(true);
      return;
    }
    if (!isNativePlatform()) return;
    try {
      const file = await pickMealPhotoNative('camera');
      if (file) await c.scanPhoto(file);
    } catch (error: unknown) {
      notify(error instanceof Error ? error.message : 'Nie udało się otworzyć aparatu', 'error');
    }
  });
  const signedIn = Boolean(session);
  useEffect(() => {
    if (!signedIn || !launchAction) return;
    const timer = window.setTimeout(() => { void openCapture(launchAction); }, 0);
    return () => window.clearTimeout(timer);
  }, [signedIn, launchAction]);
  if (!session) return null;
  return <MealComposerView c={c} photoUrls={photoUrls} nutrients={nutrients} energy={energy} macros={macros} week={week} onSaved={onSaved} />;
}
