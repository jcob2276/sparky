import {
  aggregateHardSetsByWeek,
  computeAcwr,
  creditHardSetToTags,
  type HardSetsWeekBucket,
  type SessionLogLike,
  type SetLogLike,
} from '@vanguard/domain';
import { stimulusForExercise, tagsForExercise } from '../../data/exercises';
import { getTodayWarsaw, shiftDateStr } from '../date';

export type { HardSetsWeekBucket };

function mondayOfWeek(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return shiftDateStr(dateStr, diff);
}

function lastNWeekStarts(weeks: number, today = getTodayWarsaw()): string[] {
  const currentMonday = mondayOfWeek(today);
  const starts: string[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    starts.push(shiftDateStr(currentMonday, -7 * i));
  }
  return starts;
}

function creditForLog(log: SetLogLike): Record<string, number> {
  const name = log.exercise_name?.trim() ?? '';
  const tags = (log.muscle_tags?.length ? log.muscle_tags : tagsForExercise(name)) as string[];
  const stimulus = stimulusForExercise(name, tags);
  return creditHardSetToTags(tags, stimulus as Record<string, { direct?: number; indirect?: number }>);
}

export function buildHardSetsWeekly(
  sessions: SessionLogLike[],
  weeks = 4,
): HardSetsWeekBucket[] {
  const weekStarts = lastNWeekStarts(weeks);
  const nextMonday = shiftDateStr(weekStarts[weekStarts.length - 1], 7);
  return aggregateHardSetsByWeek(sessions, [...weekStarts, nextMonday], creditForLog);
}

export function topMuscleHardSets(
  buckets: HardSetsWeekBucket[],
  limit = 6,
): Array<{ tag: string; total: number; lastWeek: number }> {
  const totals = new Map<string, { total: number; lastWeek: number }>();
  const last = buckets[buckets.length - 1];

  for (const bucket of buckets) {
    for (const [tag, n] of Object.entries(bucket.byTag)) {
      const cur = totals.get(tag) ?? { total: 0, lastWeek: 0 };
      cur.total += n;
      totals.set(tag, cur);
    }
  }
  if (last) {
    for (const [tag, n] of Object.entries(last.byTag)) {
      const cur = totals.get(tag) ?? { total: 0, lastWeek: 0 };
      cur.lastWeek = n;
      totals.set(tag, cur);
    }
  }

  return [...totals.entries()]
    .map(([tag, v]) => ({ tag, ...v }))
    .sort((a, b) => b.lastWeek - a.lastWeek || b.total - a.total)
    .slice(0, limit);
}

export function buildAcwrFromStrain(
  strainRows: Array<{ date: string; strain_score?: number | null }>,
) {
  return computeAcwr(strainRows);
}
