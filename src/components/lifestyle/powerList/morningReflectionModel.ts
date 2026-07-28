import type { TablesUpdate } from '../../../lib/database.types';

interface BuildMorningReflectionRecordArgs {
  date: string;
  note: string;
  dayScore: number;
  moodScore: number;
}

export function buildMorningReflectionRecord({
  date,
  note,
  dayScore,
  moodScore,
}: BuildMorningReflectionRecordArgs) {
  const dailyWinPatch: TablesUpdate<'daily_wins'> = {
    day_note: note.trim(),
    mood_score: moodScore,
  };

  return {
    date,
    dailyWinPatch,
    dayScore,
  };
}
