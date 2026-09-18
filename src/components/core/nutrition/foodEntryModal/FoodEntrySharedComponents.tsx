import { useCallback } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Pressable, ControlInput } from '../../../ui/ControlPrimitives';
import { MEAL_TYPES } from '../../../../lib/health/foodLogging';
import { useHaptics } from '../../../../hooks/useHaptics';

export interface MacroPreview {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

export function MacroCardsRow({ preview }: { preview: MacroPreview | null }) {
  if (!preview) return null;
  return (
    <div className="grid grid-cols-4 gap-2">
      <div className="rounded-2xl border border-border-custom/40 bg-surface-solid/30 p-2.5 text-center">
        <p className="font-display text-base font-black text-text-primary leading-none">{preview.calories ?? '–'}</p>
        <p className="mt-1 text-3xs font-black uppercase tracking-wider text-text-muted">Kcal</p>
      </div>
      <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-2.5 text-center">
        <p className="font-display text-base font-black text-primary leading-none">{preview.protein ?? '–'}</p>
        <p className="mt-1 text-3xs font-black uppercase tracking-wider text-primary">Białko</p>
      </div>
      <div className="rounded-2xl border border-border-custom/40 bg-surface-solid/30 p-2.5 text-center">
        <p className="font-display text-base font-black text-text-primary leading-none">{preview.carbs ?? '–'}</p>
        <p className="mt-1 text-3xs font-black uppercase tracking-wider text-text-muted">Węgle</p>
      </div>
      <div className="rounded-2xl border border-border-custom/40 bg-surface-solid/30 p-2.5 text-center">
        <p className="font-display text-base font-black text-text-primary leading-none">{preview.fat ?? '–'}</p>
        <p className="mt-1 text-3xs font-black uppercase tracking-wider text-text-muted">Tłuszcz</p>
      </div>
    </div>
  );
}

export function MealTypeSegmentedPicker({
  mealType,
  setMealType,
}: {
  mealType: string;
  setMealType: (v: string) => void;
}) {
  const haptics = useHaptics();
  return (
    <div className="space-y-1.5">
      <label className="text-2xs font-black uppercase tracking-widest text-text-muted block">
        Pora posiłku
      </label>
      <div className="grid grid-cols-4 gap-1 p-1 bg-surface-solid/40 rounded-2xl border border-border-custom/50">
        {MEAL_TYPES.map((m) => (
          <Pressable
            key={m.id}
            type="button"
            onClick={() => {
              haptics.selection();
              setMealType(m.id);
            }}
            className={`rounded-xl py-1.5 text-center text-2xs font-black uppercase tracking-wider transition-all duration-150 active:scale-95 ${
              mealType === m.id
                ? 'bg-surface text-primary shadow-xs'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {m.label}
          </Pressable>
        ))}
      </div>
    </div>
  );
}

export function PortionStepper({
  grams,
  setGrams,
  defaultGrams,
  defaultGramsLabel,
}: {
  grams: string;
  setGrams: (v: string) => void;
  defaultGrams?: number | null;
  defaultGramsLabel?: string;
}) {
  const haptics = useHaptics();

  const adjustGrams = useCallback(
    (delta: number) => {
      haptics.selection();
      const current = parseInt(grams, 10) || 0;
      const next = Math.max(1, current + delta);
      setGrams(String(next));
    },
    [grams, setGrams, haptics]
  );

  return (
    <div className="space-y-2">
      <label className="text-2xs font-black uppercase tracking-widest text-text-muted block text-center">
        Waga porcji
      </label>

      {/* Hero Tactile Stepper */}
      <div className="flex items-center justify-center gap-3 py-1">
        <Pressable
          type="button"
          onClick={() => adjustGrams(-10)}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border-custom/80 bg-surface-solid/40 text-text-secondary hover:bg-surface-solid hover:text-text-primary active:scale-90 ui-interactive shadow-2xs"
          title="-10g"
        >
          <Minus size={18} />
        </Pressable>
        <div className="flex items-baseline justify-center gap-1 min-w-[130px] rounded-2xl border border-border-custom/80 bg-surface-solid/30 px-4 py-2 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/10 ui-interactive">
          <ControlInput
            type="number"
            inputMode="numeric"
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
            className="w-20 bg-transparent text-center font-display text-3xl font-black text-text-primary outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-sm font-bold text-text-muted">g</span>
        </div>
        <Pressable
          type="button"
          onClick={() => adjustGrams(10)}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border-custom/80 bg-surface-solid/40 text-text-secondary hover:bg-surface-solid hover:text-text-primary active:scale-90 ui-interactive shadow-2xs"
          title="+10g"
        >
          <Plus size={18} />
        </Pressable>
      </div>

      {/* Quick Delta and Value Chips */}
      <div
        className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        data-no-swipe-nav="true"
      >
        {defaultGrams && defaultGrams > 0 && (
          <Pressable
            type="button"
            onClick={() => {
              haptics.selection();
              setGrams(String(defaultGrams));
            }}
            className={`shrink-0 rounded-full px-3 py-1 text-2xs font-bold ui-interactive active:scale-95 ${
              grams === String(defaultGrams)
                ? 'bg-primary text-on-accent shadow-xs'
                : 'border border-primary/40 bg-primary/[0.06] text-primary hover:bg-primary/10'
            }`}
          >
            {defaultGramsLabel ?? `1 porcja (${defaultGrams}g)`}
          </Pressable>
        )}
        {[-25, 25, 50].map((delta) => (
          <Pressable
            key={delta}
            type="button"
            onClick={() => adjustGrams(delta)}
            className="shrink-0 rounded-full border border-border-custom/70 bg-surface-solid/40 px-3 py-1 text-2xs font-bold text-text-secondary hover:border-primary/40 hover:text-primary active:scale-95 ui-interactive"
          >
            {delta > 0 ? `+${delta}g` : `${delta}g`}
          </Pressable>
        ))}
        {[50, 100, 150, 200, 250].map((g) => (
          <Pressable
            key={g}
            type="button"
            onClick={() => {
              haptics.selection();
              setGrams(String(g));
            }}
            className={`shrink-0 rounded-full px-3 py-1 text-2xs font-bold ui-interactive active:scale-95 ${
              grams === String(g)
                ? 'bg-primary text-on-accent shadow-xs'
                : 'border border-border-custom/70 text-text-muted hover:border-primary/40 hover:text-primary'
            }`}
          >
            {g}g
          </Pressable>
        ))}
      </div>
    </div>
  );
}
