import { Pressable } from '../../ui/ControlPrimitives';
import ExerciseThumb from './ExerciseThumb';
import type { ExerciseMatch } from './useExerciseSearch';

interface ExercisePickerRowProps {
  item: ExerciseMatch;
  onSelect: (item: ExerciseMatch) => void;
}

export default function ExercisePickerRow({ item, onSelect }: ExercisePickerRowProps) {
  const muscles = item.tags.filter((t) => t !== 'plyo' && t !== 'wellness').slice(0, 3);
  const meta = [item.equipment, muscles.length ? muscles.join(' · ') : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      type="button"
      onClick={() => onSelect(item)}
      className="tren-picker-row flex w-full items-center gap-3 px-4 py-2.5 text-left ui-interactive"
      aria-label={item.name}
    >
      <ExerciseThumb name={item.name} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-semibold leading-snug text-text-primary">
          {item.name}
        </span>
        {meta ? (
          <span className="mt-0.5 block truncate text-xs leading-tight text-text-muted">
            {meta}
          </span>
        ) : null}
      </span>
    </Pressable>
  );
}
