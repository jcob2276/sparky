import { ArrowLeft } from 'lucide-react';
import { Pressable } from '../../../ui/ControlPrimitives';
import type { FoodBase } from '../hooks/useFoodEntryData';
import { calorieRange, deriveFoodTrust } from '../../../../lib/health/foodTrust';
import { useHaptics } from '../../../../hooks/useHaptics';
import {
  MacroCardsRow,
  MealTypeSegmentedPicker,
  PortionStepper,
  type MacroPreview,
} from './FoodEntrySharedComponents';

interface PortionScreenProps {
  selected: FoodBase;
  setSelected: (v: FoodBase | null) => void;
  grams: string;
  setGrams: (v: string) => void;
  mealType: string;
  setMealType: (v: string) => void;
  preview: MacroPreview | null;
  error: string | null;
  saving: boolean;
  savedFlash: boolean;
  save: () => void;
}

export default function PortionScreen({
  selected,
  setSelected,
  grams,
  setGrams,
  mealType,
  setMealType,
  preview,
  error,
  saving,
  savedFlash,
  save,
}: PortionScreenProps) {
  const haptics = useHaptics();
  const trust = deriveFoodTrust(selected);
  const range = calorieRange(preview?.calories ?? null, trust.uncertaintyPct);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Pressable
          variant="ghost"
          size="sm"
          onClick={() => setSelected(null)}
          className="flex items-center gap-1.5 px-0 py-0 text-text-muted hover:text-text-primary transition-colors active:scale-95"
        >
          <ArrowLeft size={16} />
          <span className="text-xs font-bold">Wróć</span>
        </Pressable>
      </div>

      <div>
        <p className="text-lg font-black text-text-primary leading-tight tracking-tight">{selected.name}</p>
        {selected.brand && (
          <p className="mt-0.5 text-xs font-medium text-text-muted">{selected.brand}</p>
        )}
        <p className={`mt-1 text-2xs font-bold uppercase tracking-wider ${trust.level === 'estimated' ? 'text-warning' : trust.level === 'incomplete' ? 'text-danger' : 'text-success'}`}>
          {trust.label}{range && range.min !== range.max ? ` · około ${range.min}–${range.max} kcal` : ''}
        </p>
      </div>

      <PortionStepper
        grams={grams}
        setGrams={setGrams}
        defaultGrams={selected.defaultGrams}
        defaultGramsLabel={selected.defaultGrams ? `1 porcja (${selected.defaultGrams}g)` : undefined}
      />

      <MealTypeSegmentedPicker mealType={mealType} setMealType={setMealType} />

      <MacroCardsRow preview={preview} />

      {error && <p className="text-xs text-danger text-center font-medium">{error}</p>}

      <Pressable
        type="button"
        variant="primary"
        onClick={() => {
          haptics.success();
          save();
        }}
        disabled={saving || savedFlash}
        loading={saving}
        className="w-full rounded-2xl py-3 text-sm font-black active:scale-[0.98] transition-all shadow-sm"
      >
        {savedFlash ? 'Zapisano!' : 'Dodaj do dziennika'}
      </Pressable>
    </div>
  );
}
