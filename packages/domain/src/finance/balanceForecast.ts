import type { RecurringPayment } from './bankRecurring.ts';

export interface ForecastPayment { date: string; name: string; amount: number }
export interface ForecastPoint { date: string; balance: number }
export interface BalanceForecast {
  points: ForecastPoint[];
  payments: ForecastPayment[];
  lowest: ForecastPoint;
  /** Pierwszy dzień, w którym saldo schodzi poniżej zera, jeśli się to zdarzy. */
  firstNegative: ForecastPoint | null;
}

const DAY_MS = 86_400_000;
const toDay = (iso: string) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / DAY_MS);
const fromDay = (day: number) => new Date(day * DAY_MS).toISOString().slice(0, 10);

/**
 * Saldo dzień po dniu, gdyby tylko wykryte stałe płatności zostały pobrane. Zaległe terminy przesuwamy
 * o ich cykl do przodu, bo bank nie zawsze księguje w dniu rocznicy. To prognoza stałych płatności,
 * nie przewidywanie zakupów w sklepie.
 */
export function forecastBalance(startBalance: number, today: string, horizonDays: number, recurring: readonly RecurringPayment[]): BalanceForecast {
  const start = toDay(today);
  const end = start + horizonDays;
  const payments: ForecastPayment[] = [];
  for (const item of recurring) {
    const step = item.cadence === 'weekly' ? 7 : 30;
    let day = toDay(item.nextExpected);
    while (day < start) day += step;
    for (; day <= end; day += step) payments.push({ date: fromDay(day), name: item.name, amount: item.lastAmount || item.typicalAmount });
  }
  payments.sort((a, b) => a.date.localeCompare(b.date));
  const points: ForecastPoint[] = [];
  let balance = startBalance;
  let cursor = 0;
  for (let day = start; day <= end; day++) {
    const iso = fromDay(day);
    while (cursor < payments.length && payments[cursor].date === iso) balance -= payments[cursor++].amount;
    points.push({ date: iso, balance: Math.round(balance * 100) / 100 });
  }
  const lowest = points.reduce((low, p) => (p.balance < low.balance ? p : low), points[0]);
  return { points, payments, lowest, firstNegative: points.find(p => p.balance < 0) ?? null };
}

export interface PriceHike { name: string; from: number; to: number; pct: number }

/** Stałe płatności, których ostatnia kwota jest wyraźnie wyższa niż typowa (domyślnie o ponad 5%). */
export function detectPriceHikes(recurring: readonly RecurringPayment[], threshold = 0.05): PriceHike[] {
  return recurring
    .filter(item => item.typicalAmount > 0 && item.lastAmount > item.typicalAmount * (1 + threshold))
    .map(item => ({ name: item.name, from: item.typicalAmount, to: item.lastAmount, pct: (item.lastAmount - item.typicalAmount) / item.typicalAmount }))
    .sort((a, b) => b.pct - a.pct);
}
