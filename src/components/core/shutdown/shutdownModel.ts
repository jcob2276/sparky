import type { TablesUpdate } from '../../../lib/database.types';

interface BuildShutdownRecordArgs {
  date: string;
  dayScore: number;
  moodScore: number;
  reflectionText: string;
  completedTasks: boolean[];
  activeTaskIndexes: number[];
}

export function buildShutdownRecord({
  date,
  dayScore,
  moodScore,
  reflectionText,
  completedTasks,
  activeTaskIndexes,
}: BuildShutdownRecordArgs) {
  const reflection = reflectionText.trim();
  const allDone =
    activeTaskIndexes.length > 0 &&
    activeTaskIndexes.every((index) => completedTasks[index]);
  const dailyWinPatch: TablesUpdate<'daily_wins'> = {
    day_note: reflection,
    mood_score: moodScore,
    done_1: completedTasks[0] ?? false,
    done_2: completedTasks[1] ?? false,
    done_3: completedTasks[2] ?? false,
    done_4: completedTasks[3] ?? false,
    done_5: completedTasks[4] ?? false,
    result: allDone ? 'Z' : 'P',
  };
  const reflectionPart = reflection ? ` | Refleksja: ${reflection}` : '';

  return {
    dailyWinPatch,
    streamContent:
      `Domknięcie dnia: Wynik ${dayScore}/10 (Samopoczucie: ${moodScore}/5)` +
      reflectionPart,
    streamMetadata: {
      kind: 'day_close',
      date,
      day_score: dayScore,
      mood: moodScore,
    },
  };
}
