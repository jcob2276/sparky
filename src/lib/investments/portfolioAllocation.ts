import type { PortfolioPosition } from './jakubPortfolioStorage';

interface AllocationSlice { id: string; label: string; valuePln: number; weightPct: number }
export interface Allocation {
  total: number; slices: AllocationSlice[]; byMarket: AllocationSlice[]; top3Pct: number;
}
const MAX_SLICES = 7;

function withWeights(items: { id: string; label: string; valuePln: number }[], total: number): AllocationSlice[] {
  return items.filter(i => i.valuePln > 0).sort((a, b) => b.valuePln - a.valuePln)
    .map(i => ({ ...i, weightPct: total > 0 ? i.valuePln / total * 100 : 0 }));
}

/** Alokacja wg wartości bieżącej (PLN) razem z wolną gotówką; ogon ponad MAX_SLICES zwija się w "Pozostałe". */
export function buildAllocation(positions: PortfolioPosition[], freeCashPln: number): Allocation {
  const cash = Math.max(0, freeCashPln);
  const total = positions.reduce((s, p) => s + Math.max(0, p.currentValue), 0) + cash;
  const items = [...positions.map(p => ({ id: p.id, label: p.ticker, valuePln: Math.max(0, p.currentValue) })),
    ...(cash > 0 ? [{ id: 'cash', label: 'Gotówka', valuePln: cash }] : [])];
  const sorted = withWeights(items, total);
  const head = sorted.slice(0, MAX_SLICES - 1), tail = sorted.slice(MAX_SLICES - 1);
  const slices = tail.length > 1
    ? [...head, ...withWeights([{ id: 'rest', label: `Pozostałe (${tail.length})`, valuePln: tail.reduce((s, t) => s + t.valuePln, 0) }], total)]
    : sorted;
  const marketName = (p: PortfolioPosition) => p.market === 'GPW' ? 'GPW' : p.market === 'US' ? 'USA' : 'ETF Europa';
  const markets = new Map<string, number>();
  for (const p of positions) markets.set(marketName(p), (markets.get(marketName(p)) ?? 0) + Math.max(0, p.currentValue));
  if (cash > 0) markets.set('Gotówka', cash);
  const byMarket = withWeights([...markets].map(([label, valuePln]) => ({ id: label, label, valuePln })), total);
  return { total, slices, byMarket, top3Pct: sorted.filter(s => s.id !== 'cash').slice(0, 3).reduce((s, x) => s + x.weightPct, 0) };
}
