import { Copy, RotateCcw, Star } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';
import type { QuickChip } from '../../../lib/health/mealComposerQuick';

interface MealComposerQuickProps {
  chips: QuickChip[];
  saving: boolean;
  onChip: (chip: QuickChip) => void;
  onOpenCopyDay: () => void;
  yesterdayMealSuggestion?: {
    name: string;
    calories: number;
    protein: number;
    mealLabel: string;
  } | null;
  onRepeatYesterdayMeal?: () => void;
}

export default function MealComposerQuick({
  chips,
  saving,
  onChip,
  onOpenCopyDay,
  yesterdayMealSuggestion,
  onRepeatYesterdayMeal,
}: MealComposerQuickProps) {
  return (
    <div
      role="group"
      aria-label="Szybkie dodawanie"
      className="meal-chips -mx-4 flex items-center gap-1.5 overflow-x-auto px-4"
      data-no-swipe-nav="true"
    >
      {yesterdayMealSuggestion && onRepeatYesterdayMeal && (
        <Pressable
          onClick={onRepeatYesterdayMeal}
          disabled={saving}
          className="meal-chip meal-chip-accent"
          title={`Powtórz wczorajszy posiłek: ${yesterdayMealSuggestion.name}`}
        >
          <RotateCcw size={13} className="shrink-0" aria-hidden="true" />
          <span className="max-w-48 truncate">
            Powtórz {yesterdayMealSuggestion.mealLabel}: {yesterdayMealSuggestion.name} ({yesterdayMealSuggestion.calories} kcal)
          </span>
        </Pressable>
      )}

      <Pressable
        onClick={onOpenCopyDay}
        disabled={saving}
        className="meal-chip"
        title="Przeglądaj historię i skopiuj posiłki"
      >
        <Copy size={13} aria-hidden="true" />
        <span>Kopiuj z innego dnia</span>
      </Pressable>

      {chips.map((chip) => (
        <Pressable
          key={chip.id}
          disabled={saving}
          onClick={() => onChip(chip)}
          className="meal-chip"
          title={`${chip.name} · ${chip.detail}`}
        >
          {chip.kind === 'favorite' && <Star size={11} className="shrink-0 text-primary" aria-hidden="true" />}
          <span className="max-w-32 truncate font-bold text-text-primary">{chip.name}</span>
          <span className="shrink-0 text-2xs text-text-muted">{chip.detail}</span>
        </Pressable>
      ))}
    </div>
  );
}
