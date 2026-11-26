import { DAILY_FUEL_QUOTE_LIST } from './dailyFuelQuoteList';

export interface DailyFuelQuote {
  text: string;
  author?: string;
  source?: string;
}

const DAILY_FUEL_QUOTES: DailyFuelQuote[] = DAILY_FUEL_QUOTE_LIST.map(([text, author]) => ({ text, author }));

/** Krok przez listę: liczba względnie pierwsza z długością, więc dni przeskakują między autorami, a cały cykl obejmuje każdy cytat dokładnie raz. */
function stride(length: number): number {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  let step = 37;
  while (gcd(step, length) !== 1) step += 1;
  return step;
}

export function getDailyFuelQuote(livedDays: number): DailyFuelQuote {
  const length = DAILY_FUEL_QUOTES.length;
  const index = (Math.abs(livedDays) * stride(length)) % length;
  return DAILY_FUEL_QUOTES[index];
}
