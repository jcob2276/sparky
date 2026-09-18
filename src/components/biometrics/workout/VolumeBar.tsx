import { tagClass, stimulusForExercise } from '../../../data/exercises';
import { WorkoutExercise } from './workoutUtils';
import { Card } from '../../ui/Card';

interface VolumeBarProps {
  exercises: WorkoutExercise[];
}

export default function VolumeBar({ exercises }: VolumeBarProps) {
  const vol: Record<string, number> = {};
  const bwReps: Record<string, number> = {};

  exercises.forEach((ex) => {
    if ((ex.tags ?? []).includes('wellness')) return;
    let exKgVol = 0;
    let exBwReps = 0;

    (ex.sets ?? []).forEach((s) => {
      const kg = parseFloat(s.kg) || 0;
      const reps = parseInt(s.reps, 10) || 0;
      if (reps > 0) {
        if (kg > 0) {
          exKgVol += kg * reps;
        } else {
          exBwReps += reps;
        }
      }
    });

    const stimulus = stimulusForExercise(ex.name, ex.tags ?? []);
    Object.entries(stimulus).forEach(([tag, weight]) => {
      const factor = Number(weight.direct || 0) || Number(weight.indirect || 0);
      if (factor <= 0) return;
      if (exKgVol > 0) {
        vol[tag] = (vol[tag] || 0) + exKgVol * factor;
      }
      if (exBwReps > 0) {
        bwReps[tag] = (bwReps[tag] || 0) + Math.round(exBwReps * factor);
      }
    });
  });

  const allTags = Array.from(new Set([...Object.keys(vol), ...Object.keys(bwReps)]));
  allTags.sort((a, b) => (vol[b] || 0) - (vol[a] || 0));

  if (!allTags.length) return null;

  return (
    <Card variant="surface" className="border border-border-custom" padding="sm">
      <span className="text-2xs font-black uppercase tracking-[var(--ds-arbitrary-0-18em)] text-text-muted block mb-2">
        Objętość sesji wg partii
      </span>
      <div className="flex flex-wrap gap-2">
        {allTags.map((tag) => {
          const v = vol[tag] || 0;
          const bw = bwReps[tag] || 0;
          return (
            <div
              key={tag}
              className="flex items-center gap-1.5 bg-surface-solid/50 px-2 py-1 rounded-xl border border-border-custom/50"
            >
              <span className={`text-2xs font-black uppercase px-2 py-0.5 rounded-full border ${tagClass(tag)}`}>
                {tag}
              </span>
              <span className="text-xs font-bold text-text-secondary tabular-nums">
                {v > 0 ? `${Math.round(v).toLocaleString()} kg` : ''}
                {v > 0 && bw > 0 ? ' · ' : ''}
                {bw > 0 ? `${bw} powt. BW` : ''}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
