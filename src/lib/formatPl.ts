/** Liczba z polskim przecinkiem dziesiętnym i bez zbędnych zer: 1.8 → „1,8”, 25 → „25”. */
export function formatDecimalPl(value: number, maxDigits = 1): string {
  return value.toLocaleString('pl-PL', { maximumFractionDigits: maxDigits });
}

/** Polska odmiana rzeczownika: 1 pozycja, 2 pozycje, 5 pozycji (12–14 to „pozycji”). */
export function pluralPl(count: number, one: string, few: string, many: string): string {
  const n = Math.abs(Math.trunc(count));
  if (n === 1) return one;
  const lastTwo = n % 100;
  const last = n % 10;
  return last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14) ? few : many;
}
