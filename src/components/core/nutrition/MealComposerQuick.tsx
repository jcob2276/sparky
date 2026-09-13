import { Copy, History, RotateCcw, Star } from 'lucide-react';
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
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-2xs font-black uppercase tracking-wider text-text-muted">
          <History size={11} /> Szybkie dodawanie
        </p>
      </div>
      <div
        className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        data-no-swipe-nav="true"
      >
        {yesterdayMealSuggestion && onRepeatYesterdayMeal && (
          <Pressable
            type="button"
            onClick={onRepeatYesterdayMeal}
            disabled={saving}
            className="shrink-0 flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3.5 py-1.5 text-xs font-black text-primary transition-all duration-[var(--motion-fast)] ease-[var(--ease-out,ease-out)] hover:bg-primary/20 active:scale-95 disabled:opacity-50 shadow-2xs"
            title={`Powtórz wczorajszy posiłek: ${yesterdayMealSuggestion.name}`}
          >
            <RotateCcw size={13} className="shrink-0" />
            <span className="truncate max-w-[14rem]">
              Powtórz {yesterdayMealSuggestion.mealLabel}: {yesterdayMealSuggestion.name} ({yesterdayMealSuggestion.calories} kcal)
            </span>
          </Pressable>
        )}

        <Pressable
          type="button"
          onClick={onOpenCopyDay}
          disabled={saving}
          className="shrink-0 flex items-center gap-1.5 rounded-full border border-border-custom bg-surface-solid/50 px-3.5 py-1.5 text-xs font-bold text-text-secondary transition-all duration-[var(--motion-fast)] ease-[var(--ease-out,ease-out)] hover:border-primary/40 hover:text-text-primary hover:bg-surface-solid/80 active:scale-95 disabled:opacity-50 shadow-2xs"
          title="Przeglądaj historię i skopiuj posiłki"
        >
          <Copy size={13} />
          <span>Kopiuj z innego dnia</span>
        </Pressable>

        {chips.map((chip) => (
          <Pressable
            key={chip.id}
            type="button"
            disabled={saving}
            onClick={() => onChip(chip)}
            className="shrink-0 rounded-full border border-border-custom bg-surface-solid/40 px-3 py-1.5 text-left transition-all duration-[var(--motion-fast)] ease-[var(--ease-out,ease-out)] hover:border-primary/35 active:scale-[0.95] disabled:opacity-50"
            title={chip.detail}
          >
            <span className="flex items-center gap-1">
              {chip.kind === 'favorite' && <Star size={10} className="text-primary" />}
              <span className="block max-w-[9rem] truncate text-xs font-bold text-text-primary">{chip.name}</span>
            </span>
            <span className="block text-2xs font-semibold text-text-muted">{chip.detail}</span>
          </Pressable>
        ))}
      </div>
    </div>
  );
}

