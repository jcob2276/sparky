import { Pressable } from '../../ui/ControlPrimitives';
import { MUSCLE_GROUPS } from './muscleGroups';


/** Poziomy pasek grup mięśniowych nad listą ćwiczeń. */
export default function ExercisePickerGroupChips({ group, onChange }: { group: string; onChange: (id: string) => void }) {
  return (
    <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5" role="group" aria-label="Grupa mięśniowa">
      {[{ id: '', label: 'Wszystkie' }, ...MUSCLE_GROUPS].map((g) => (
        <Pressable
          key={g.id || 'all'}
          type="button"
          aria-pressed={group === g.id}
          onClick={() => onChange(g.id)}
          className={`h-9 shrink-0 rounded-full border px-3.5 text-xs font-bold ${
            group === g.id ? 'border-primary bg-primary/10 text-primary' : 'border-border-custom bg-surface-1 text-text-secondary'
          }`}
        >
          {g.label}
        </Pressable>
      ))}
    </div>
  );
}
