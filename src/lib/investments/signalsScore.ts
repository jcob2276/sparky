export interface SignalMetrics {
  ticker: string;
  companyName: string;
  fundNetBuyers: number;
  holders: number;
  polBuys: number;
  polSells: number;
  politicianBuyers: number;
  politicians: number;
  insiderBuys: number;
  buyVolumeMid: number;
  lastTradeDate: string | null;
}

export interface SignalRow extends SignalMetrics {
  score: number;
  convergent: boolean;
  summary: string;
}

const WITH_INSIDERS = { funds: 0.4, polNet: 0.24, polBuyers: 0.16, insiders: 0.2 };
const WITHOUT_INSIDERS = { funds: 0.5, polNet: 0.3, polBuyers: 0.2, insiders: 0 };

function polishCount(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (abs === 1) return one;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return few;
  return many;
}

function percentile(value: number, sortedAsc: number[]): number {
  const n = sortedAsc.length;
  if (n <= 1) return 1;
  let first = 0;
  while (first < n && sortedAsc[first] < value) first += 1;
  let last = first;
  while (last < n && sortedAsc[last] === value) last += 1;
  const avgRank = (first + last - 1) / 2;
  return avgRank / (n - 1);
}

function evidenceSummary(row: SignalMetrics): string {
  const parts: string[] = [];
  if (row.fundNetBuyers > 0) {
    parts.push(
      `${row.fundNetBuyers} ${polishCount(row.fundNetBuyers, 'fundusz', 'fundusze', 'funduszy')} netto kupuje`,
    );
  } else if (row.fundNetBuyers < 0) {
    const abs = Math.abs(row.fundNetBuyers);
    parts.push(`${abs} ${polishCount(abs, 'fundusz', 'fundusze', 'funduszy')} netto sprzedaje`);
  }
  if (row.politicians > 0) {
    parts.push(`${row.politicians} ${polishCount(row.politicians, 'polityk', 'polityków', 'polityków')}`);
  }
  if (row.insiderBuys > 0) {
    parts.push(`${row.insiderBuys} ${polishCount(row.insiderBuys, 'insider', 'insiderów', 'insiderów')} kupuje`);
  }
  return parts.length > 0 ? parts.join(' · ') : '—';
}

export function rankDisclosureSignals(metrics: SignalMetrics[], hasInsiderSource: boolean): SignalRow[] {
  if (metrics.length === 0) return [];
  const weights = hasInsiderSource ? WITH_INSIDERS : WITHOUT_INSIDERS;
  const fundNets = metrics.map((m) => m.fundNetBuyers).sort((a, b) => a - b);
  const polNets = metrics.map((m) => m.polBuys - m.polSells).sort((a, b) => a - b);
  const buyers = metrics.map((m) => m.politicianBuyers).sort((a, b) => a - b);
  const insiders = metrics.map((m) => m.insiderBuys).sort((a, b) => a - b);

  return metrics
    .map((row) => {
      const weighted =
        weights.funds * percentile(row.fundNetBuyers, fundNets) +
        weights.polNet * percentile(row.polBuys - row.polSells, polNets) +
        weights.polBuyers * percentile(row.politicianBuyers, buyers) +
        weights.insiders * percentile(row.insiderBuys, insiders);
      const score = Math.round(Math.min(100, Math.max(0, weighted * 100)));
      return {
        ...row,
        score,
        convergent: row.fundNetBuyers > 0 && row.polBuys > 0,
        summary: evidenceSummary(row),
      };
    })
    .sort((a, b) => b.score - a.score || a.ticker.localeCompare(b.ticker));
}
