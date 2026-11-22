import { addDays } from './reviewCycle';
import type { ReviewDay } from './reviewCycle.types';

interface DayRows {
  wins: Array<{ date: string | null; day_note?: string | null; daily_win_tasks?: Array<{ title: string | null; done: boolean | null }> | null }>;
  scores: Array<{ date: string; day_score: number | null }>;
  sleep: Array<{ date: string; total_sleep_hours: number | null; bedtime_timestamp: string | null }>;
  phone: Array<{ date: string; total_minutes: number | null }>;
}

const TIME_PL = new Intl.DateTimeFormat('pl-PL', { timeZone: 'Europe/Warsaw', hour: '2-digit', minute: '2-digit', hour12: false });

/** Zaśnięcie jako HH:MM i minuty na osi wieczoru (po północy dalej rośnie, żeby 00:30 było „później” niż 23:30). */
export function bedtimeOf(timestamp: string | null): { label: string; minutes: number } | null {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;
  const label = TIME_PL.format(date);
  const [h, m] = label.split(':').map(Number);
  const minutes = (h < 12 ? h + 24 : h) * 60 + m;
  return { label, minutes };
}

const byDate = <T extends { date: string | null }>(rows: T[]) => new Map(rows.map((r) => [r.date ?? '', r]));

/** Siedem dni od `weekStart`, każdy z oceną, snem, zadaniami i telefonem (null, gdy brak danych). */
export function buildReviewDays(weekStart: string, rows: DayRows): ReviewDay[] {
  const wins = byDate(rows.wins);
  const scores = byDate(rows.scores);
  const sleep = byDate(rows.sleep);
  const phone = byDate(rows.phone);

  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const win = wins.get(date);
    const tasks = (win?.daily_win_tasks ?? []).filter((t) => t.title?.trim());
    const night = sleep.get(date);
    const bedtime = bedtimeOf(night?.bedtime_timestamp ?? null);
    const sleepHours = night?.total_sleep_hours ?? null;
    return {
      date,
      score: scores.get(date)?.day_score ?? null,
      sleepHours: sleepHours != null ? Math.round(sleepHours * 10) / 10 : null,
      bedtime: bedtime?.label ?? null,
      bedtimeMinutes: bedtime?.minutes ?? null,
      tasksDone: tasks.filter((t) => t.done).length,
      tasksTotal: tasks.length,
      phoneMinutes: phone.get(date)?.total_minutes ?? null,
      hasNote: Boolean(win?.day_note?.trim()),
    };
  });
}
