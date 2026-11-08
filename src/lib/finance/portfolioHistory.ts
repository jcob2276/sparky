import { shiftDateStr } from '@vanguard/domain';

/**
 * Wartość obecnych pozycji portfela w czasie: obecne ilości × historyczna cena zamknięcia w PLN.
 * To nie jest historia wartości konta (nie widzi zakupów, sprzedaży ani wpłat), tylko to, jak zachowywałby się
 * dzisiejszy portfel w przeszłości. Etykieta w UI musi to mówić.
 */

export interface PricePoint { ticker: string; date: string; pricePln: number }
export interface HoldingQty { ticker: string; quantity: number }
export interface SeriesPoint { date: string; value: number }

export type HistoryRange = '1M' | '3M' | '6M' | '1Y' | 'MAX';
export const HISTORY_RANGES: ReadonlyArray<{ key: HistoryRange; label: string; days: number | null }> = [
  { key: '1M', label: '1M', days: 30 },
  { key: '3M', label: '3M', days: 91 },
  { key: '6M', label: '6M', days: 182 },
  { key: '1Y', label: '1R', days: 365 },
  { key: 'MAX', label: 'Całość', days: null },
];

export interface PortfolioSeries {
  points: SeriesPoint[];
  /** Pozycje, dla których nie ma żadnej ceny historycznej (nie wchodzą do serii). */
  missing: string[];
}

/**
 * Seria dzienna od pierwszego dnia, w którym znamy ceny WSZYSTKICH wycenianych pozycji. W dni bez notowania
 * (weekend, święto) obowiązuje ostatnia znana cena, więc wartość nie skacze przez luki w kalendarzu giełdy.
 */
export function buildPortfolioSeries(prices: PricePoint[], holdings: HoldingQty[]): PortfolioSeries {
  const quantities = new Map<string, number>();
  for (const h of holdings) if (h.quantity > 0) quantities.set(h.ticker, (quantities.get(h.ticker) ?? 0) + h.quantity);

  const byTicker = new Map<string, Array<{ date: string; price: number }>>();
  for (const p of prices) {
    if (!quantities.has(p.ticker) || !Number.isFinite(p.pricePln)) continue;
    const list = byTicker.get(p.ticker) ?? [];
    list.push({ date: p.date, price: p.pricePln });
    byTicker.set(p.ticker, list);
  }
  for (const list of byTicker.values()) list.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const valued = [...quantities.keys()].filter((t) => (byTicker.get(t)?.length ?? 0) > 0);
  const missing = [...quantities.keys()].filter((t) => !valued.includes(t));
  if (!valued.length) return { points: [], missing };

  const start = valued.map((t) => byTicker.get(t)![0].date).reduce((a, b) => (a > b ? a : b));
  const dates = [...new Set(valued.flatMap((t) => byTicker.get(t)!.map((p) => p.date)))].filter((d) => d >= start).sort();

  const cursor = new Map<string, number>(valued.map((t) => [t, 0]));
  const points: SeriesPoint[] = [];
  for (const date of dates) {
    let total = 0;
    for (const ticker of valued) {
      const list = byTicker.get(ticker)!;
      let i = cursor.get(ticker)!;
      while (i + 1 < list.length && list[i + 1].date <= date) i += 1;
      cursor.set(ticker, i);
      total += quantities.get(ticker)! * list[i].price;
    }
    points.push({ date, value: Math.round(total * 100) / 100 });
  }
  return { points, missing };
}

/** Wycinek serii dla zakresu liczony od ostatniego punktu serii. */
export function sliceRange(points: SeriesPoint[], range: HistoryRange): SeriesPoint[] {
  const days = HISTORY_RANGES.find((r) => r.key === range)?.days ?? null;
  if (days === null || !points.length) return points;
  const from = shiftDateStr(points[points.length - 1].date, -days);
  return points.filter((p) => p.date >= from);
}

export interface RangeChange { change: number; pct: number | null }

export function summarizeRange(points: SeriesPoint[]): RangeChange | null {
  if (points.length < 2) return null;
  const first = points[0].value;
  const change = Math.round((points[points.length - 1].value - first) * 100) / 100;
  return { change, pct: first > 0 ? Math.round((change / first) * 10000) / 100 : null };
}
