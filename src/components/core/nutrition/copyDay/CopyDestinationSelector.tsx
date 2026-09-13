import { ArrowRightLeft } from 'lucide-react';
import { Pressable } from '../../../ui/ControlPrimitives';
import { useHaptics } from '../../../../hooks/useHaptics';
import { MEAL_TYPES, type MealTypeId } from '../../../../lib/health/foodLogging';

interface CopyDestinationSelectorProps {
  selectedDestination: MealTypeId | null;
  onSelectDestination: (dest: MealTypeId | null) => void;
  disabled?: boolean;
}

export default function CopyDestinationSelector({
  selectedDestination,
  onSelectDestination,
  disabled,
}: CopyDestinationSelectorProps) {
  const haptics = useHaptics();

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between px-0.5">
        <label className="text-2xs font-black uppercase tracking-widest text-text-muted">
          Kopiuj do
        </label>
        {selectedDestination && (
          <Pressable
            type="button"
            onClick={() => {
              haptics.light();
              onSelectDestination(null);
            }}
            className="text-2xs font-bold text-primary hover:underline"
          >
            Resetuj (zachowaj pory)
          </Pressable>
        )}
      </div>

      <div
        className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        data-no-swipe-nav="true"
      >
        <Pressable
          type="button"
          disabled={disabled}
          onClick={() => {
            haptics.selection();
            onSelectDestination(null);
          }}
          className={`shrink-0 flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all active:scale-95 ${
            selectedDestination === null
              ? 'bg-primary/15 text-primary border border-primary/30 ring-1 ring-primary/20'
              : 'border border-border-custom/70 bg-surface-solid/30 text-text-secondary hover:text-text-primary hover:bg-surface-solid/60'
          }`}
        >
          <ArrowRightLeft size={12} className="opacity-80" />
          <span>Zgodnie z porą</span>
        </Pressable>

        {MEAL_TYPES.map((m) => {
          const isSelected = selectedDestination === m.id;
          return (
            <Pressable
              key={m.id}
              type="button"
              disabled={disabled}
              onClick={() => {
                haptics.selection();
                onSelectDestination(m.id);
              }}
              className={`shrink-0 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                isSelected
                  ? 'bg-primary text-on-accent shadow-2xs ring-1 ring-primary/30 font-black'
                  : 'border border-border-custom/70 bg-surface-solid/30 text-text-secondary hover:text-text-primary hover:bg-surface-solid/60'
              }`}
            >
              <span>{m.label}</span>
            </Pressable>
          );
        })}
      </div>
    </div>
  );
}
