import type { Tables } from '../database.types';

function setVolume(log: Tables<'exercise_logs'>): number {
  return (Number(log.weight) || 0) * (Number(log.reps) || 0);
}

/** Group sets by exercise name (handles supersets where set_number resets each round). */
export function groupExerciseLogs(logs: Tables<'exercise_logs'>[]): {
  name: string;
  sets: Tables<'exercise_logs'>[];
  volume: number;
}[] {
  const order: string[] = [];
  const byName = new Map<string, Tables<'exercise_logs'>[]>();

  for (const log of logs) {
    if (!byName.has(log.exercise_name)) {
      order.push(log.exercise_name);
      byName.set(log.exercise_name, []);
    }
    byName.get(log.exercise_name)!.push(log);
  }

  return order.map((name) => {
    const sets = byName.get(name)!;
    const volume = sets.reduce((sum, log) => sum + setVolume(log), 0);
    return { name, sets, volume };
  });
}

export function renderWorkoutSessions(
  daySessions: (Tables<'workout_sessions'> & { exercise_logs?: Tables<'exercise_logs'>[] })[]
): string {
  let md = '';
  daySessions.forEach((s) => {
    md += `#### 🏋️ Trening: ${s.workout_day}\n`;
    let totalSessionVolume = 0;

    const sortedLogs = [...(s.exercise_logs || [])].sort((a, b) => {
      const bySet = a.set_number - b.set_number;
      if (bySet !== 0) return bySet;
      return (a.created_at || '').localeCompare(b.created_at || '');
    });

    const exercises = groupExerciseLogs(sortedLogs);
    exercises.forEach(({ name, sets, volume }) => {
      totalSessionVolume += volume;
      const seriesLabel = sets.length === 1 ? '1 seria' : `${sets.length} serie`;
      md += `- **${name}** (${seriesLabel}, objętość: ${volume.toLocaleString()} kg):\n`;
      sets.forEach((l, idx) => {
        const effort = l.rir ?? l.rpe ?? '--';
        md += `  - Seria ${idx + 1}: ${l.weight}kg × ${l.reps} (RIR/RPE: ${effort})${
          l.is_pws_or_msp ? ' 🔥' : ''
        }${l.notes ? ` — _${l.notes}_` : ''}\n`;
      });
    });

    if (totalSessionVolume > 0) {
      md += `\n**Łączna objętość:** ${totalSessionVolume.toLocaleString()} kg`;
      if (exercises.length > 0) {
        md += ` · **${exercises.length}** ćwiczeń · **${sortedLogs.length}** serii`;
      }
      md += `\n`;
    }
    if (s.session_notes?.trim()) {
      md += `**Notatki:** ${s.session_notes.trim()}\n`;
    }
    md += `\n`;
  });
  return md;
}
