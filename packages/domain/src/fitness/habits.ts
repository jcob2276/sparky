export interface HabitConsistencyHabit {
  id: string;
  name: string;
  is_positive?: boolean | null;
}

export interface HabitConsistencyLog {
  habit_id: string;
  date: string;
  completed?: boolean | null;
}

export interface HabitConsistencyBreakdown {
  name: string;
  success: number;
  total: number;
  isPositive: boolean;
}

export function last7DayKeys(today: string): string[] {
  const base = new Date(`${today}T12:00:00Z`);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
}

export function computeHabitConsistency(
  habits: HabitConsistencyHabit[],
  habitLogs: HabitConsistencyLog[],
  today: string,
): {
  habitRate: number;
  successTotal: number;
  slotTotal: number;
  breakdown: HabitConsistencyBreakdown[];
  summaryLabel: string;
} {
  const windowDates = last7DayKeys(today);
  const daySet = new Set(windowDates);

  const completedByHabitDate = new Set<string>();
  for (const log of habitLogs) {
    if (!log.completed) continue;
    const d = log.date.slice(0, 10);
    if (!daySet.has(d)) continue;
    completedByHabitDate.add(`${log.habit_id}:${d}`);
  }

  if (!habits.length) {
    return {
      habitRate: 0,
      successTotal: 0,
      slotTotal: 0,
      breakdown: [],
      summaryLabel: 'brak zdefiniowanych nawyków',
    };
  }

  const breakdown = habits.map((habit) => {
    const isPositive = habit.is_positive !== false;
    let success = 0;
    for (const d of windowDates) {
      const hasCompleted = completedByHabitDate.has(`${habit.id}:${d}`);
      if (isPositive ? hasCompleted : !hasCompleted) success++;
    }
    return { name: habit.name, success, total: windowDates.length, isPositive };
  });

  const successTotal = breakdown.reduce((sum, row) => sum + row.success, 0);
  const slotTotal = habits.length * windowDates.length;
  const habitRate = slotTotal > 0 ? successTotal / slotTotal : 0;

  const summaryLabel = breakdown
    .map((row) =>
      row.isPositive
        ? `${row.name}: ${row.success}/${row.total}`
        : `${row.name}: ${row.success}/${row.total} (dni czyste)`,
    )
    .join(', ');

  return { habitRate, successTotal, slotTotal, breakdown, summaryLabel };
}
