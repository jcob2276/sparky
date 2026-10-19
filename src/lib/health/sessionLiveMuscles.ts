import type { WorkoutExercise } from './workout';
import { normalizeMuscleTag } from './bodyMuscles';

/**
 * Live session fatigue for BodyMap: only **completed** (done) sets contribute,
 * so the anatomy figure updates in real time as the user checks sets.
 */
export function sessionLiveFatigue(exercises: WorkoutExercise[]): Record<string, number> {
  const fatigue: Record<string, number> = {};

  for (const ex of exercises) {
    if (!ex.name?.trim()) continue;
    const tags = (ex.tags ?? []).filter((t) => t !== 'wellness' && t !== 'plyo' && t !== 'inne');
    if (!tags.length) continue;

    const doneSets = (ex.sets ?? []).filter((s) => s.done === true);
    if (!doneSets.length) continue;

    let tonnage = 0;
    for (const s of doneSets) {
      const w = Number(s.kg) || 0;
      const r = Number(s.reps) || 0;
      tonnage += w * r;
    }

    // Base hit per completed set + tonnage scale (clamped per tag later).
    const hit = Math.min(1, doneSets.length * 0.22 + tonnage / 2500);
    for (const raw of tags) {
      const tag = normalizeMuscleTag(raw);
      if (!tag || tag === 'inne') continue;
      fatigue[tag] = (fatigue[tag] || 0) + hit;
    }
  }

  for (const k of Object.keys(fatigue)) {
    fatigue[k] = Math.min(1, Math.round(fatigue[k] * 100) / 100);
  }
  return fatigue;
}

export function sessionLiveHitCount(exercises: WorkoutExercise[]): number {
  return Object.keys(sessionLiveFatigue(exercises)).length;
}
