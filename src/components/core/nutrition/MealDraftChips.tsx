import { Pressable } from '../../ui/ControlPrimitives';
import type { PortionChip, PortionState } from '../../../lib/health/mealPortions';

export default function MealDraftChips({
  chips,
  portion,
  onSelectChip,
}: {
  chips: PortionChip[];
  portion: PortionState;
  onSelectChip: (state: PortionState) => void;
}) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((chip) => {
        const isSelected =
          portion.unit === chip.state.unit &&
          Math.abs(portion.quantity - chip.state.quantity) < 0.01;
        return (
          <Pressable
            key={chip.label}
            type="button"
            onClick={() => onSelectChip(chip.state)}
            className={`rounded-full border px-2 py-0.5 text-2xs font-bold ui-interactive duration-[var(--motion-fast)] ease-[var(--ease-out,ease-out)] active:scale-[0.95] ${
              isSelected
                ? 'border-primary/50 bg-primary/10 text-primary'
                : 'border-border-custom text-text-secondary hover:border-primary/40 hover:text-primary'
            }`}
          >
            {chip.label}
          </Pressable>
        );
      })}
    </div>
  );
}
