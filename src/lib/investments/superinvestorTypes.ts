/**
 * superinvestorTypes.ts — Typy i formatowanie danych superinwestorów 13F.
 */

export interface SuperinvestorOverviewItem {
  id: string;
  slug: string;
  name: string;
  fundName: string;
  cik: string;
  description: string;
  category: string;
  tier: string;
  aumFormatted: string;
  aumRaw: number;
  positionsCount: number;
  filingDate: string;
  sparkline: number[];
  isPositiveTrend: boolean;
  curveEnabled: boolean;
  consensusEnabled: boolean;
}

export interface SuperinvestorsOverviewData {
  investors: SuperinvestorOverviewItem[];
  stats: {
    totalActive: number;
    curveCount: number;
    consensusCount: number;
    categoriesCount: number;
  };
}

export interface QuarterHistoryItem {
  quarterLabel: string;
  valueFormatted: string;
  rawValue: number;
  isLatest: boolean;
}

export interface HoldingChangeItem {
  ticker: string;
  companyName: string;
  weightPct: number;
  sharesNow: number | null;
  sharesDelta: number | null;
  sharesDeltaPct: number | null;
  valueUsd: number | null;
  valueFormatted: string;
  changeType: 'new' | 'increased' | 'decreased' | 'sold' | 'unchanged';
  sector: string;
}

export interface SuperinvestorDetailData {
  investor: SuperinvestorOverviewItem;
  basketValueFormatted: string;
  basketValueRaw: number;
  positionsCount: number;
  newCount: number;
  decreasedCount: number;
  increasedCount: number;
  soldCount: number;
  quarters: QuarterHistoryItem[];
  quarterGrowthPct: string;
  holdings: HoldingChangeItem[];
  sectors: { name: string; weightPct: number }[];
  latestFilingUrl: string | null;
  periodQuarter: string;
  recentActivity: { type: string; ticker: string; details: string; isNegative?: boolean }[];
}

export function formatUsdBillions(val: number): string {
  if (!Number.isFinite(val) || val <= 0) return '—';
  if (val >= 1_000_000_000) {
    return `${(val / 1_000_000_000).toFixed(1).replace('.', ',')} mld USD`;
  }
  if (val >= 1_000_000) {
    return `${(val / 1_000_000).toFixed(0).replace('.', ',')} mln USD`;
  }
  return `$${Math.round(val).toLocaleString('pl-PL')}`;
}

export function formatQuarterLabel(periodStr: string): string {
  const parts = periodStr.split('-');
  if (parts.length < 2) return periodStr;
  const year = parts[0].slice(2);
  const month = parseInt(parts[1], 10);
  let q = 'K1';
  if (month >= 4 && month <= 6) q = 'K2';
  else if (month >= 7 && month <= 9) q = 'K3';
  else if (month >= 10 && month <= 12) q = 'K4';
  return `${q} '${year}`;
}
