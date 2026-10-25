const WINDOW = 5;
const MIN_WINDOW = 3;

const round1 = (value: number) => Math.round(value * 10) / 10;
const average = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;

/**
 * Trend z wartości od najnowszej: średnia z 5 ostatnich i zmiana względem 5 poprzednich.
 * Średnia wymaga min. 3 wartości, zmiana min. 3 wartości w poprzednim oknie; inaczej null.
 */
export function windowTrend(newestFirst: number[]): { recent: number | null; delta: number | null } {
  const recent = newestFirst.slice(0, WINDOW);
  const previous = newestFirst.slice(WINDOW, WINDOW * 2);
  const recentAvg = recent.length >= MIN_WINDOW ? round1(average(recent)) : null;
  const delta = recentAvg !== null && previous.length >= MIN_WINDOW ? round1(recentAvg - average(previous)) : null;
  return { recent: recentAvg, delta };
}
