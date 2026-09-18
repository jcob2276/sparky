import type { Tables } from '../database.types';
import { toWarsawTime } from './exportStatsHelpers';

interface RenderJournalParams {
  dayJournal: Tables<'daily_wins'> | undefined;
  dayTelegramLogs: Tables<'vanguard_stream'>[];
  dayHabitLogs: Tables<'habit_logs'>[];
  habits: Tables<'habits'>[];
  includeJournal: boolean;
  includeHabits: boolean;
}

function cleanTranscript(raw: string): string {
  return raw
    .replace(/^Transkrypcja nagrania:\s*/i, '')
    .replace(/^Oto dokładna transkrypcja Twojego nagrania:\s*/i, '')
    .trim();
}

export function renderJournalAndHabits({
  dayJournal,
  dayTelegramLogs,
  dayHabitLogs,
  habits,
  includeJournal,
  includeHabits,
}: RenderJournalParams): string {
  if (!includeJournal && !includeHabits) return '';
  if (!dayJournal && dayTelegramLogs.length === 0 && !(includeHabits && dayHabitLogs?.length > 0)) {
    return '';
  }

  let md = `### 📓 Dzień, plan i nawyki\n\n`;

  if (includeJournal && dayJournal) {
    md += `#### Wynik i plan\n`;
    md += `**Wynik dnia:** ${dayJournal.result === 'Z' ? 'WYGRANA (Z)' : 'PORAŻKA (P)'}\n\n`;
    md += `**Plan dnia:**\n`;
    for (let i = 1; i <= 5; i++) {
      const task = dayJournal[`task_${i}` as keyof Tables<'daily_wins'>];
      const cat = dayJournal[`category_${i}` as keyof Tables<'daily_wins'>];
      const done = dayJournal[`done_${i}` as keyof Tables<'daily_wins'>];
      if (task) {
        md += `- [${done ? 'x' : ' '}] (${cat}) ${task}\n`;
      }
    }
    md += `\n`;

    if (dayJournal.mood_score) {
      const moods = ['Źle', 'Słabo', 'Ok', 'Dobrze', 'Świetnie'];
      md += `**Nastrój:** ${moods[dayJournal.mood_score - 1] || 'Nieokreślony'}\n`;
    }
    if (dayJournal.gratitude_entry) {
      md += `**Wdzięczność:** ${dayJournal.gratitude_entry}\n`;
    }
    if (dayJournal.journal_entry) {
      md += `**Refleksja:** ${dayJournal.journal_entry}\n`;
    }
    md += `\n`;
  }

  if (includeJournal && dayTelegramLogs.length > 0) {
    md += `#### 🎙️ Strumień Myśli & Logi z Telegrama\n`;
    dayTelegramLogs.forEach((log) => {
      const meta = log.metadata as Record<string, unknown> | null;
      const mode = meta?.mode ? ` [${meta.mode}]` : '';
      const cleaned = cleanTranscript(log.content || '');
      if (cleaned) {
        md += `- **${toWarsawTime(log.created_at ?? '')}**${mode}:\n`;
        const quoted = cleaned.split('\n').map((line) => `  > ${line}`).join('\n');
        md += `${quoted}\n\n`;
      }
    });
  }

  if (includeHabits && dayHabitLogs?.length > 0) {
    md += `#### Nawyki\n`;
    dayHabitLogs.forEach((log) => {
      const habit = (habits ?? []).find((h) => h.id === log.habit_id);
      if (habit) {
        const label = habit.is_positive ? 'Wykonano' : 'Wpadka';
        const stimulus = log.final_stimulus ? ` — bodziec: "${log.final_stimulus}"` : '';
        const ctx = log.context_note ? ` (${log.context_note})` : '';
        md += `- ${habit.icon} ${habit.name}: ${label}${stimulus}${ctx}\n`;
      }
    });
    md += `\n`;
  }

  return md;
}
