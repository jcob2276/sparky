/**
 * gpwInsidersStats.ts — czyste agregaty zawiadomień MAR art. 19 (GPW) liczone WYŁĄCZNIE
 * z rzeczywistych wierszy `vw_gpw_insider_public` od 1 stycznia (patrz yearFloor.ts).
 * Widok nie niesie kwot ani nazwisk, więc nie udajemy ich w UI.
 */

import { shiftDateStr } from '../date';

export interface GpwInsiderNotice {
  id: string;
  company: string;
  ticker: string;
  side: 'buy' | 'sell' | 'other';
  transactionDate: string;
  reportDate: string;
  title: string;
  sourceUrl?: string;
}

export interface GpwInsiderKpis {
  purchases: number;
  sales: number;
  total: number;
  mostActiveTicker: string | null;
  mostActiveCount: number;
  medianPerCompany: number;
  tempo30d: number;
  tempoAvgMonthly: number;
  latestReportDate: string | null;
}

export interface GpwInsiderCluster {
  id: string;
  ticker: string;
  companyName: string;
  tradesCount: number;
  dateFrom: string;
  dateTo: string;
  titles: string[];
}

export interface GpwInsiderDayCell {
  date: string;
  count: number;
}

const CLUSTER_GAP_DAYS = 14;

function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function computeGpwInsiderKpis(notices: GpwInsiderNotice[], today: string, floor: string): GpwInsiderKpis {
  const perTicker = new Map<string, number>();
  for (const n of notices) perTicker.set(n.ticker, (perTicker.get(n.ticker) ?? 0) + 1);
  const top = [...perTicker.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  const since30 = shiftDateStr(today, -30);
  const months = Math.max(1, dayDiff(floor, today) / 30.4);
  return {
    purchases: notices.filter((n) => n.side === 'buy').length,
    sales: notices.filter((n) => n.side === 'sell').length,
    total: notices.length,
    mostActiveTicker: top?.[0] ?? null,
    mostActiveCount: top?.[1] ?? 0,
    medianPerCompany: median([...perTicker.values()]),
    tempo30d: notices.filter((n) => n.transactionDate >= since30).length,
    tempoAvgMonthly: Math.round((notices.length / months) * 10) / 10,
    latestReportDate: notices.map((n) => n.reportDate).filter(Boolean).sort().at(-1) ?? null,
  };
}

/** Klaster = co najmniej 2 zawiadomienia o nabyciu w jednej spółce, kolejne w odstępie <= 14 dni. */
export function computeGpwInsiderClusters(notices: GpwInsiderNotice[], limit = 12): GpwInsiderCluster[] {
  const byTicker = new Map<string, GpwInsiderNotice[]>();
  for (const n of notices) {
    if (n.side !== 'buy' || !n.transactionDate) continue;
    byTicker.set(n.ticker, [...(byTicker.get(n.ticker) ?? []), n]);
  }
  const clusters: GpwInsiderCluster[] = [];
  for (const [ticker, rows] of byTicker) {
    const sorted = [...rows].sort((a, b) => a.transactionDate.localeCompare(b.transactionDate));
    let group: GpwInsiderNotice[] = [];
    const flush = () => {
      if (group.length >= 2) {
        clusters.push({
          id: `${ticker}-${group[0].transactionDate}`, ticker, companyName: group[0].company,
          tradesCount: group.length, dateFrom: group[0].transactionDate,
          dateTo: group[group.length - 1].transactionDate,
          titles: [...new Set(group.map((g) => g.title))].slice(0, 2),
        });
      }
      group = [];
    };
    for (const n of sorted) {
      if (group.length && dayDiff(group[group.length - 1].transactionDate, n.transactionDate) > CLUSTER_GAP_DAYS) flush();
      group.push(n);
    }
    flush();
  }
  return clusters
    .sort((a, b) => b.dateTo.localeCompare(a.dateTo) || b.tradesCount - a.tradesCount)
    .slice(0, limit);
}

/** Dzienne liczby zawiadomień od `floor` do `today` włącznie (puste dni = 0). */
export function computeGpwInsiderDailyCells(notices: GpwInsiderNotice[], floor: string, today: string): GpwInsiderDayCell[] {
  const counts = new Map<string, number>();
  for (const n of notices) if (n.transactionDate) counts.set(n.transactionDate, (counts.get(n.transactionDate) ?? 0) + 1);
  const days = Math.max(0, dayDiff(floor, today));
  return Array.from({ length: days + 1 }, (_, i) => {
    const date = shiftDateStr(floor, i);
    return { date, count: counts.get(date) ?? 0 };
  });
}
