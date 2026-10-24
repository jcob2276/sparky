import type { WinsDayCell } from './weeklyWinsMap';

interface WeekInsight {
  id: string;
  title: string;
  detail: string;
}

interface CategoryRate {
  category: string;
  label: string;
  done: number;
  planned: number;
}

export interface WeekInsights {
  scoredDays: number;
  averageScore: number | null;
  categories: CategoryRate[];
  insights: WeekInsight[];
}

const CATEGORY_LABEL: Record<string, string> = {
  cialo: 'Ciało',
  duch: 'Duch',
  konto: 'Konto',
  general: 'Inne',
};

/** Fewer samples than this say nothing about a habit; one day is an anecdote. */
const MIN_PLANNED_FOR_RATE = 3;
const MIN_DAYS_PER_SIDE = 2;
const MIN_SCORE_GAP = 1;

const WEEKDAY_FULL: Record<string, string> = {
  nd: 'niedziela', pn: 'poniedziałek', wt: 'wtorek', śr: 'środa', cz: 'czwartek', pt: 'piątek', sb: 'sobota',
};

export function categoryLabel(category: string | null): string {
  if (!category) return 'Inne';
  return CATEGORY_LABEL[category] ?? category.charAt(0).toUpperCase() + category.slice(1);
}

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function format1(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1).replace('.', ',').replace(/,0$/, '');
}

function dayName(day: WinsDayCell): string {
  return WEEKDAY_FULL[day.label] ?? day.label;
}

function categoryRates(days: WinsDayCell[]): CategoryRate[] {
  const byCategory = new Map<string, CategoryRate>();
  for (const day of days) {
    for (const task of day.tasks) {
      const key = task.category ?? 'general';
      const entry = byCategory.get(key) ?? { category: key, label: categoryLabel(key), done: 0, planned: 0 };
      entry.planned += 1;
      if (task.done) entry.done += 1;
      byCategory.set(key, entry);
    }
  }
  return [...byCategory.values()].sort((a, b) => b.planned - a.planned);
}

/**
 * A day counts as "done" for a category when every task of that category on that day was done;
 * compares the user's own rating on such days with the others. Needs enough days on each side.
 */
function categoryScoreGap(days: WinsDayCell[], category: string) {
  const withDone: number[] = [];
  const withoutDone: number[] = [];
  for (const day of days) {
    if (day.score == null) continue;
    const tasks = day.tasks.filter((t) => (t.category ?? 'general') === category);
    if (!tasks.length) continue;
    (tasks.every((t) => t.done) ? withDone : withoutDone).push(day.score);
  }
  if (withDone.length < MIN_DAYS_PER_SIDE || withoutDone.length < MIN_DAYS_PER_SIDE) return null;
  return { doneAvg: average(withDone), missedAvg: average(withoutDone), doneDays: withDone.length, missedDays: withoutDone.length };
}

/** Facts about the last 7 days from the user's own ratings, plans and one-line opinions. No advice beyond what the data shows. */
export function buildWeekInsights(days: WinsDayCell[], today: string): WeekInsights {
  const closed = days.filter((d) => d.date !== today || d.score != null);
  const scored = closed.filter((d): d is WinsDayCell & { score: number } => d.score != null);
  const categories = categoryRates(closed);
  const insights: WeekInsight[] = [];

  if (scored.length >= 2) {
    const best = scored.reduce((a, b) => (b.score > a.score ? b : a));
    const worst = scored.reduce((a, b) => (b.score < a.score ? b : a));
    insights.push({
      id: 'scores',
      title: `Średnia ocena dnia: ${format1(average(scored.map((d) => d.score)))}/10`,
      detail: best.score === worst.score
        ? `${scored.length} dni oceniłeś tak samo (${best.score}).`
        : `Najlepiej: ${dayName(best)} (${best.score}), najsłabiej: ${dayName(worst)} (${worst.score}).`,
    });
    if (worst.note && worst.score !== best.score) {
      insights.push({
        id: 'worst-note',
        title: `Najsłabszy dzień: ${dayName(worst)} (${worst.score}/10)`,
        detail: `Zapisałeś wtedy: „${worst.note}”.`,
      });
    }
  }

  const weakest = categories
    .filter((c) => c.planned >= MIN_PLANNED_FOR_RATE)
    .map((c) => ({ ...c, rate: c.done / c.planned }))
    .sort((a, b) => a.rate - b.rate)[0];
  if (weakest && weakest.rate < 1) {
    insights.push({
      id: 'weakest-category',
      title: `Najczęściej odpuszczasz: ${weakest.label}`,
      detail: `${weakest.done} z ${weakest.planned} zadań zrobionych w tym obszarze.`,
    });
  }

  const gaps = categories
    .map((c) => ({ c, gap: categoryScoreGap(closed, c.category) }))
    .filter((g): g is { c: CategoryRate; gap: NonNullable<ReturnType<typeof categoryScoreGap>> } => g.gap !== null)
    .map((g) => ({ ...g, diff: g.gap.doneAvg - g.gap.missedAvg }))
    .filter((g) => Math.abs(g.diff) >= MIN_SCORE_GAP)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  if (gaps[0]) {
    const { c, gap, diff } = gaps[0];
    insights.push({
      id: 'category-score-gap',
      title: diff > 0
        ? `Dni z zrobionym obszarem „${c.label}” oceniasz wyżej`
        : `Dni z zrobionym obszarem „${c.label}” oceniasz niżej`,
      detail: `Średnio ${format1(gap.doneAvg)} (${gap.doneDays} dni) wobec ${format1(gap.missedAvg)} (${gap.missedDays} dni bez). To mała próba — traktuj jak wskazówkę.`,
    });
  }

  return {
    scoredDays: scored.length,
    averageScore: scored.length ? average(scored.map((d) => d.score)) : null,
    categories,
    insights,
  };
}
