import {
  aggregateHardSetsByWeek,
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
