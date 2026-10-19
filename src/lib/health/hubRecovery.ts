/**
 * Hub recovery snapshot: muscle fatigue + this-week volume/reps from session logs.
 */
import { calculateMuscleFatigue, type WorkoutSessionInput } from './muscleRecovery';
import { isStrengthLog } from './workoutDisplay';

type HubRecoveryLog = {
  exercise_name: string | null;
  weight: number | null;
  reps: number | null;
  muscle_tags: string[] | null;
};

export type HubRecoverySessionRow = {
  date: string;
  exercise_logs: HubRecoveryLog[] | null;
};

export type HubWeekStats = {
  reps: number;
  volumeKg: number;
  sessions: number;
};

export type HubRecoverySnapshot = {
  fatigueByTag: Record<string, number>;
  week: HubWeekStats;
};

/** Groups flat exercise_logs into WorkoutSessionInput for calculateMuscleFatigue. */
export function sessionsToFatigueInput(rows: HubRecoverySessionRow[]): WorkoutSessionInput[] {
  return rows.map((row) => {
    const byName = new Map<string, { muscleTags: string[]; sets: Array<{ weightKg: number; reps: number }> }>();

    for (const log of row.exercise_logs || []) {
      if (!isStrengthLog(log.muscle_tags)) continue;
      const name = (log.exercise_name || 'Ćwiczenie').trim() || 'Ćwiczenie';
      const w = Number(log.weight) || 0;
      const r = Number(log.reps) || 0;
      if (w <= 0 || r <= 0) continue;

      let bucket = byName.get(name);
      if (!bucket) {
        bucket = { muscleTags: log.muscle_tags?.length ? [...log.muscle_tags] : [], sets: [] };
        byName.set(name, bucket);
      }
      bucket.sets.push({ weightKg: w, reps: r });
      if (!bucket.muscleTags.length && log.muscle_tags?.length) {
        bucket.muscleTags = [...log.muscle_tags];
      }
    }

    return {
      date: row.date,
      exercises: [...byName.entries()].map(([name, data]) => ({
        name,
        muscleTags: data.muscleTags,
        sets: data.sets,
      })),
    };
  });
}

export function computeWeekStats(
  rows: HubRecoverySessionRow[],
  weekStart: string,
  weekEndInclusive: string,
): HubWeekStats {
  let reps = 0;
  let volumeKg = 0;
  let sessions = 0;

  for (const row of rows) {
    const d = row.date.slice(0, 10);
    if (d < weekStart || d > weekEndInclusive) continue;

    let sessionHasWork = false;
    for (const log of row.exercise_logs || []) {
      if (!isStrengthLog(log.muscle_tags)) continue;
      const w = Number(log.weight) || 0;
      const r = Number(log.reps) || 0;
      if (r <= 0) continue;
      sessionHasWork = true;
      reps += r;
      if (w > 0) volumeKg += w * r;
    }
    if (sessionHasWork) sessions += 1;
  }

  return {
    reps: Math.round(reps),
    volumeKg: Math.round(volumeKg),
    sessions,
  };
}

export function buildHubRecoverySnapshot(
  rows: HubRecoverySessionRow[],
  weekStart: string,
  weekEndInclusive: string,
  nowMs: number = Date.now(),
): HubRecoverySnapshot {
  const fatigueByTag = calculateMuscleFatigue(sessionsToFatigueInput(rows), nowMs);
  const week = computeWeekStats(rows, weekStart, weekEndInclusive);
  return { fatigueByTag, week };
}
