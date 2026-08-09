import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RotateCcw, Sparkles } from 'lucide-react';
import { mealMemoryToDraft, rankMealMemoriesForGap } from '../../../lib/health/nutritionTracker';
import { confirmMealCapture, fetchNutritionMealMemories } from '../../../lib/health/nutritionTrackerApi';
import { Pressable } from '../../ui/ControlPrimitives';

export default function NutritionRunway({
  userId,
  currentCalories,
  targetCalories,
  currentProtein,
  targetProtein,
  mealType,
  date,
  onSaved,
  refreshSignal,
}: {
  userId: string;
  currentCalories: number;
  targetCalories: number;
  currentProtein: number;
  targetProtein: number;
  mealType: string;
  date: string;
  onSaved?: () => void;
  refreshSignal?: number;
}) {
  const [saving, setSaving] = useState(false);
  const [repeatError, setRepeatError] = useState(false);
  const memories = useQuery({
    queryKey: ['nutrition-meal-memories', userId, refreshSignal],
    queryFn: () => fetchNutritionMealMemories(userId, 24),
  }).data ?? [];
  const remainingCalories = Math.max(0, Math.round(targetCalories - currentCalories));
  const remainingProtein = Math.max(0, Math.round((targetProtein - currentProtein) * 10) / 10);
  const suggestion = rankMealMemoriesForGap(memories, {
    remainingCalories,
    remainingProtein,
    mealType,
  })[0] ?? null;
  const projectedCalories = suggestion ? Math.round(currentCalories + suggestion.calories) : Math.round(currentCalories);
  const caloriesAfter = Math.round(targetCalories - projectedCalories);

  async function repeatMemory() {
    if (!suggestion || saving) return;
    const items = mealMemoryToDraft(suggestion.items);
    if (!items.length) return;
    setSaving(true);
    setRepeatError(false);
    try {
      await confirmMealCapture({
        userId,
        date,
        mealType,
        source: 'repeat',
        items,
        memoryName: suggestion.name,
      });
      onSaved?.();
    } catch {
      setRepeatError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border-custom/60 bg-surface-solid/35 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-2xs font-black uppercase tracking-wider text-primary">
            <Sparkles size={11} /> {suggestion ? 'Najlepsze domknięcie' : 'Do dzisiejszego celu'}
          </p>
          {suggestion ? (
            <>
              <p className="mt-1 truncate text-sm font-black text-text-primary">{suggestion.name}</p>
              <p className="mt-0.5 text-xs font-semibold text-text-secondary">
                {suggestion.calories} kcal · {suggestion.protein} g białka
              </p>
              <p className="mt-1 text-2xs text-text-muted">
                {suggestion.reason} · potwierdzone {suggestion.confirmedCount}×
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm font-black text-text-primary">
                {remainingCalories} kcal · {remainingProtein} g białka
              </p>
              <p className="mt-1 text-2xs text-text-muted">
                Pamięć nauczy się po pierwszym potwierdzonym posiłku.
              </p>
            </>
          )}
        </div>
        {suggestion && (
          <div className={`shrink-0 rounded-full px-2 py-1 text-2xs font-black ${caloriesAfter < 0 ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success'}`}>
            {caloriesAfter < 0 ? `${Math.abs(caloriesAfter)} ponad` : `${caloriesAfter} zostanie`}
          </div>
        )}
      </div>
      {suggestion && (
        <Pressable
          type="button"
          variant="ghost"
          size="sm"
          disabled={saving}
          onClick={() => void repeatMemory()}
          className="mt-2 flex items-center gap-1.5 text-2xs font-black text-primary hover:underline disabled:opacity-50"
        >
          <RotateCcw size={11} /> {saving ? 'Dodaję…' : 'Dodaj ponownie'}
        </Pressable>
      )}
      {repeatError && <p role="alert" className="mt-1 text-2xs text-danger">Nie udało się dodać posiłku.</p>}
    </div>
  );
}
