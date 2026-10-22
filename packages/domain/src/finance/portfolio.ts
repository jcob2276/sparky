export type HoldingAssetClass = 'etf' | 'stock' | 'bond' | 'crypto' | 'other';

export const HOLDING_ASSET_LABELS: Record<HoldingAssetClass, string> = {
  etf: 'ETF',
  stock: 'Akcje',
  bond: 'Obligacje',
  crypto: 'Krypto',
  other: 'Inne',
};

export interface HoldingInput {
  id: string;
  ticker: string;
  name: string;
  assetClass: HoldingAssetClass;
  quantity: number;
  avgCostPln: number;
  targetWeightPct: number | null;
}

export interface HoldingQuote {
  pricePln: number;
  changePct: number | null;
  asOf: string | null;
}

export interface ValuedHolding extends HoldingInput {
  pricePln: number | null;
  hasQuote: boolean;
  valuePln: number;
  costPln: number;
  pnlPln: number;
  pnlPct: number | null;
  dayChangePct: number | null;
  dayChangePln: number;
  weightPct: number;
}

export interface PortfolioTotals {
  valuePln: number;
  costPln: number;
  pnlPln: number;
  pnlPct: number | null;
  dayChangePln: number;
  dayChangePct: number | null;
  unquotedCount: number;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Pozycja bez notowania jest wyceniana po koszcie, żeby majątek nie spadał do zera przy braku danych. */
export function valueHoldings(
  holdings: HoldingInput[],
  quotes: Record<string, HoldingQuote | undefined>,
): ValuedHolding[] {
  const rows = holdings.map((holding) => {
    const quote = quotes[holding.ticker.toUpperCase()] ?? quotes[holding.ticker];
    const hasQuote = quote != null && Number.isFinite(quote.pricePln) && quote.pricePln > 0;
    const pricePln = hasQuote ? quote.pricePln : null;
    const costPln = holding.quantity * holding.avgCostPln;
    const valuePln = pricePln != null ? holding.quantity * pricePln : costPln;
    const dayChangePct = hasQuote ? quote.changePct : null;
    const dayChangePln = dayChangePct != null ? valuePln - valuePln / (1 + dayChangePct / 100) : 0;
    return {
      ...holding,
      pricePln,
      hasQuote,
      valuePln: round2(valuePln),
      costPln: round2(costPln),
      pnlPln: round2(valuePln - costPln),
      pnlPct: costPln > 0 ? round2(((valuePln - costPln) / costPln) * 100) : null,
      dayChangePct,
      dayChangePln: round2(dayChangePln),
      weightPct: 0,
    };
  });
  const total = rows.reduce((sum, row) => sum + row.valuePln, 0);
  return rows.map((row) => ({ ...row, weightPct: total > 0 ? round2((row.valuePln / total) * 100) : 0 }));
}

export function computePortfolioTotals(rows: ValuedHolding[]): PortfolioTotals {
  const valuePln = round2(rows.reduce((sum, row) => sum + row.valuePln, 0));
  const costPln = round2(rows.reduce((sum, row) => sum + row.costPln, 0));
  const dayChangePln = round2(rows.reduce((sum, row) => sum + row.dayChangePln, 0));
  const previous = valuePln - dayChangePln;
  return {
    valuePln,
    costPln,
    pnlPln: round2(valuePln - costPln),
    pnlPct: costPln > 0 ? round2(((valuePln - costPln) / costPln) * 100) : null,
    dayChangePln,
    dayChangePct: previous > 0 ? round2((dayChangePln / previous) * 100) : null,
    unquotedCount: rows.filter((row) => !row.hasQuote).length,
  };
}

export interface RebalanceBuy {
  id: string;
  ticker: string;
  buyPln: number;
  units: number | null;
  weightAfterPct: number;
}

export interface RebalancePlan {
  buys: RebalanceBuy[];
  allocatedPln: number;
  leftoverPln: number;
}

/**
 * Dopłata bez sprzedaży (water-filling): kupujemy tylko pozycje poniżej celu, tak aby po dopłacie
 * stosunek wartość / waga docelowa był możliwie wyrównany. Pozycje bez celu są pomijane.
 */
export function computeRebalancePlan(
  rows: ValuedHolding[],
  amountPln: number,
  minOrderPln = 0,
): RebalancePlan {
  const targeted = rows.filter((row) => (row.targetWeightPct ?? 0) > 0);
  if (!targeted.length || !(amountPln > 0)) return { buys: [], allocatedPln: 0, leftoverPln: Math.max(0, amountPln || 0) };

  const sumTarget = targeted.reduce((sum, row) => sum + (row.targetWeightPct ?? 0), 0);
  const items = targeted
    .map((row) => ({ row, share: (row.targetWeightPct ?? 0) / sumTarget }))
    .sort((a, b) => a.row.valuePln / a.share - b.row.valuePln / b.share);

  // Szukamy poziomu L takiego, że suma max(0, L*share - value) = amount.
  let level = 0;
  let shareSum = 0;
  let valueSum = 0;
  for (let i = 0; i < items.length; i++) {
    shareSum += items[i].share;
    valueSum += items[i].row.valuePln;
    level = (amountPln + valueSum) / shareSum;
    const next = items[i + 1];
    if (!next || level <= next.row.valuePln / next.share) break;
  }

  let buys = items
    .map(({ row, share }) => ({ row, buy: Math.max(0, level * share - row.valuePln) }))
    .filter(({ buy }) => buy > 0);

  if (minOrderPln > 0) {
    buys = buys.filter(({ buy }) => buy >= minOrderPln);
  }

  const totalAfter = rows.reduce((sum, row) => sum + row.valuePln, 0) + amountPln;
  const result: RebalanceBuy[] = buys.map(({ row, buy }) => {
    const buyPln = Math.round(buy * 100) / 100;
    return {
      id: row.id,
      ticker: row.ticker,
      buyPln,
      units: row.pricePln ? Math.round((buyPln / row.pricePln) * 10000) / 10000 : null,
      weightAfterPct: round2(((row.valuePln + buyPln) / totalAfter) * 100),
    };
  });
  const allocatedPln = round2(result.reduce((sum, item) => sum + item.buyPln, 0));
  return { buys: result.sort((a, b) => b.buyPln - a.buyPln), allocatedPln, leftoverPln: round2(Math.max(0, amountPln - allocatedPln)) };
}

export interface TreemapItem {
  id: string;
  value: number;
}

export interface TreemapRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Squarified treemap w układzie 0–100 (procenty kontenera), bez zależności od DOM. */
export function layoutTreemap(items: TreemapItem[], width = 100, height = 100): TreemapRect[] {
  const positive = items.filter((item) => item.value > 0).sort((a, b) => b.value - a.value);
  const total = positive.reduce((sum, item) => sum + item.value, 0);
  if (!positive.length || total <= 0) return [];
  const scale = (width * height) / total;
  const areas = positive.map((item) => ({ id: item.id, area: item.value * scale }));
  const out: TreemapRect[] = [];
  let x = 0;
  let y = 0;
  let w = width;
  let h = height;
  let index = 0;

  const worst = (row: number[], side: number) => {
    const sum = row.reduce((a, b) => a + b, 0);
    const max = Math.max(...row);
    const min = Math.min(...row);
    return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min));
  };

  while (index < areas.length) {
    const side = Math.min(w, h);
    const row: typeof areas = [];
    while (index < areas.length) {
      const candidate = [...row, areas[index]];
      if (row.length && worst(candidate.map((c) => c.area), side) > worst(row.map((c) => c.area), side)) break;
      row.push(areas[index]);
      index++;
    }
    const rowArea = row.reduce((sum, item) => sum + item.area, 0);
    if (w >= h) {
      const rowW = rowArea / h;
      let cy = y;
      for (const item of row) {
        const itemH = item.area / rowW;
        out.push({ id: item.id, x, y: cy, w: rowW, h: itemH });
        cy += itemH;
      }
      x += rowW;
      w -= rowW;
    } else {
      const rowH = rowArea / w;
      let cx = x;
      for (const item of row) {
        const itemW = item.area / rowH;
        out.push({ id: item.id, x: cx, y, w: itemW, h: rowH });
        cx += itemW;
      }
      y += rowH;
      h -= rowH;
    }
  }
  return out;
}

export interface NetWorthGoalInput {
  netWorth: number;
  target: number;
  monthlySaving: number;
  annualReturnPct: number;
}

export interface NetWorthGoalResult {
  progressPct: number;
  remaining: number;
  monthsToGoal: number | null;
  reached: boolean;
}

const MAX_GOAL_MONTHS = 600;

export function computeNetWorthGoal(input: NetWorthGoalInput): NetWorthGoalResult {
  const { netWorth, target, monthlySaving, annualReturnPct } = input;
  const progressPct = target > 0 ? Math.max(0, Math.min(100, round2((netWorth / target) * 100))) : 0;
  const remaining = Math.max(0, round2(target - netWorth));
  if (netWorth >= target) return { progressPct: 100, remaining: 0, monthsToGoal: 0, reached: true };
  const monthlyRate = annualReturnPct / 100 / 12;
  let balance = netWorth;
  for (let month = 1; month <= MAX_GOAL_MONTHS; month++) {
    balance = balance * (1 + monthlyRate) + monthlySaving;
    if (balance >= target) return { progressPct, remaining, monthsToGoal: month, reached: false };
  }
  return { progressPct, remaining, monthsToGoal: null, reached: false };
}
