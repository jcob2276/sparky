import { normalizeBankText } from './bankCategories.ts';

export interface RecurringInput {
  counterparty: string | null;
  /** Kwota ze znakiem: obciążenie ujemne. Wpływy są pomijane. */
  amount: number;
  /** YYYY-MM-DD */
  date: string;
}

export interface RecurringPayment {
  key: string;
  name: string;
  cadence: 'weekly' | 'monthly';
  count: number;
  typicalAmount: number;
  lastDate: string;
  nextExpected: string;
  /** Przybliżony koszt miesięczny (tygodniowe ×4,33). */
  monthlyCost: number;
}

const DAY_MS = 86_400_000;
const MIN_OCCURRENCES = 3;
const MAX_AMOUNT_VARIATION = 0.3;
const MIN_REGULAR_SHARE = 0.6;

const toDay = (iso: string): number => Math.floor(Date.parse(`${iso}T00:00:00Z`) / DAY_MS);
const fromDay = (day: number): string => new Date(day * DAY_MS).toISOString().slice(0, 10);

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Nazwa sklepu bez numerów oddziałów i kodów (BIEDRONKA 309 -> BIEDRONKA), żeby ten sam sprzedawca się grupował. */
function merchantKey(counterparty: string | null): string {
  return normalizeBankText(counterparty).replace(/\b[A-Z]*\d[A-Z0-9.*]*\b/g, ' ').replace(/\s+/g, ' ').trim();
}

function cadenceOf(intervals: number[]): { cadence: 'weekly' | 'monthly'; interval: number } | null {
  const mid = median(intervals);
  const regularShare = (target: number, tolerance: number) =>
    intervals.filter((d) => Math.abs(d - target) <= tolerance).length / intervals.length;
  if (mid >= 26 && mid <= 35 && regularShare(mid, 5) >= MIN_REGULAR_SHARE) return { cadence: 'monthly', interval: mid };
  if (mid >= 6 && mid <= 8 && regularShare(mid, 1) >= MIN_REGULAR_SHARE) return { cadence: 'weekly', interval: mid };
  return null;
}

/**
 * Wydatki, które wracają regularnie (subskrypcje, abonamenty, stałe opłaty): co najmniej 3 obciążenia
 * w stałych odstępach i o zbliżonej kwocie. Zakupy w sklepie nie przechodzą, bo ich odstępy są nieregularne.
 */
export function detectRecurring(rows: readonly RecurringInput[]): RecurringPayment[] {
  const groups = new Map<string, { name: string; items: Array<{ day: number; amount: number }> }>();
  for (const row of rows) {
    if (row.amount >= 0 || !row.counterparty) continue;
    const key = merchantKey(row.counterparty);
    if (key.length < 3) continue;
    const group = groups.get(key) ?? { name: row.counterparty.replace(/\s+/g, ' ').trim(), items: [] };
    group.items.push({ day: toDay(row.date), amount: Math.abs(row.amount) });
    groups.set(key, group);
  }

  const result: RecurringPayment[] = [];
  for (const [key, { name, items }] of groups) {
    if (items.length < MIN_OCCURRENCES) continue;
    items.sort((a, b) => a.day - b.day);
    const intervals = items.slice(1).map((it, i) => it.day - items[i].day);
    const cadence = cadenceOf(intervals);
    if (!cadence) continue;
    const amounts = items.map((it) => it.amount);
    const typical = median(amounts);
    const spread = Math.max(...amounts.map((a) => Math.abs(a - typical))) / typical;
    if (typical <= 0 || spread > MAX_AMOUNT_VARIATION) continue;
    const last = items[items.length - 1].day;
    result.push({
      key,
      name,
      cadence: cadence.cadence,
      count: items.length,
      typicalAmount: Math.round(typical * 100) / 100,
      lastDate: fromDay(last),
      nextExpected: fromDay(last + Math.round(cadence.interval)),
      monthlyCost: Math.round((cadence.cadence === 'weekly' ? typical * 4.33 : typical) * 100) / 100,
    });
  }
  return result.sort((a, b) => b.monthlyCost - a.monthlyCost);
}
